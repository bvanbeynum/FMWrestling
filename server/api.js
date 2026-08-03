import client from "superagent";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "./config.js";
import { google } from "googleapis";
import fs, { stat } from "fs";
import path from "path";
import { getDualWrestlers, isGeminiQuotaError, isGeminiOverloadedError, extractOpponentTeam, extractEventDivision } from "./middleware.js";


export default {

	setRequestVars: (protocol, host) => {
		return {
			serverPath: config.apiUrl,
			logUrl: `${ protocol }://beynum.com/sys/api/addlog`
		};
	},

	authInternal: (forwardedIP) => {
		return !forwardedIP || /10\.(21|17)/g.test(forwardedIP) || /136\.57\.220\.105/g.test(forwardedIP); // Is the request being forwared through a proxy, or is the proxy IP internal
	},

	authAPI: async (serverPath, referer, cookie) => {
		const output = {};
		
		const pathRegex = new RegExp(serverPath.substring(serverPath.lastIndexOf("/") + 1)); // Build the regex based on the shorter path to the server
		output.isValid = pathRegex.test(referer); // The referer is the full URL, so it should include the server path
		
		if (output.isValid && cookie) {
			
			try {
				let tokenData = jwt.verify(cookie, config.jwt);
				let clientResponse = await client.get(`${ serverPath }/data/user?devicetoken=${ tokenData.token }`);
				const user = clientResponse.body.users[0];

				output.loggedInUser = {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					privileges: user.privileges,
					session: user.session,
					roles: user.roles
				};

				clientResponse = await client.get(`${ serverPath }/data/role`);

				// Add role privileges to any dev privileges added directly to the user
				output.loggedInUser.privileges = [...new Set(
						(output.loggedInUser.privileges || [])
							.map(privilege => privilege.token)
							.concat(clientResponse.body.roles
								.filter(role => output.loggedInUser.roles.some(userRole => userRole.id == role.id))
								.flatMap(role => role.privileges.map(privilege => privilege.token))
							)
					)];
			}
			catch { }

		}
		return output;
	},

	authPortal: async (cookie, urlPath, serverPath) => {
		const output = {};

		if (/^\/portal/.test(urlPath)) {
			if (!cookie) {
				output.status = 560;
				return output;
			}

			let tokenData;
			try {
				tokenData = jwt.verify(cookie, config.jwt);
			}
			catch (error) {
				output.status = 564;
				output.error = `Error decoding token: ${ cookie }`;
				return output;
			}

			if (!tokenData.token) {
				output.status = 561;
				output.error = "Invalid token";
				return output;
			}
			
			let clientResponse = null;
			try {
				clientResponse = await client.get(`${ serverPath }/data/user?devicetoken=${ tokenData.token }`);
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			if (!clientResponse.body.users || clientResponse.body.users.length !== 1) {
				// Check if there is a pending deviceRequest token to accept
				try {
					const deviceRequestsResponse = await client.get(`${ serverPath }/data/devicerequest`);
					const deviceRequests = (deviceRequestsResponse.body && deviceRequestsResponse.body.deviceRequests) || [];
					const matchingDeviceRequest = deviceRequests.find(deviceRequest => deviceRequest.device && deviceRequest.device.token === tokenData.token);

					if (matchingDeviceRequest) {
						const userByEmailResponse = await client.get(`${ serverPath }/data/user?email=${ encodeURIComponent(matchingDeviceRequest.email) }`);
						const usersByEmail = (userByEmailResponse.body && userByEmailResponse.body.users) || [];

						if (usersByEmail.length > 0) {
							const targetUser = usersByEmail[0];
							const updatedDevices = (targetUser.devices || []).concat({
								...matchingDeviceRequest.device,
								created: matchingDeviceRequest.created || new Date(),
								lastAccess: new Date()
							});
							targetUser.devices = updatedDevices;

							await client.post(`${ serverPath }/data/user`).send({ user: targetUser });
							await client.delete(`${ serverPath }/data/devicerequest?id=${ matchingDeviceRequest.id }`);

							clientResponse = { body: { users: [targetUser] } };
						}
					}
				}
				catch (approvalError) {
					console.warn("Error approving device request token in authPortal:", approvalError.message);
				}
			}

			if (!clientResponse.body.users || clientResponse.body.users.length !== 1) {
				output.status = 563;
				output.error = `User not found with token ${ tokenData.token }`;
				return output;
			}

			output.user = {
				...clientResponse.body.users[0],
				devices: clientResponse.body.users[0].devices.map(device => ({
					...device,
					lastAccess: tokenData.token === device.token ? new Date() : device.lastAccess
				}))
			};

			try {
				await client.post(`${ serverPath }/data/user`).send({ user: output.user }).then();
			}
			catch (error) {
				output.status = 565;
				output.error = error.message;
				return output;
			}

			try {
				clientResponse = await client.get(`${ serverPath }/data/role`);
				const roles = clientResponse.body.roles;

				// Add role privileges to any dev privileges added directly to the user
				output.user.privileges = [...new Set(
					(output.user.privileges || [])
						.map(privilege => privilege.token)
						.concat(roles
							.filter(role => output.user.roles.some(userRole => userRole.id == role.id))
							.flatMap(role => role.privileges.map(privilege => privilege.token))
						)
				)];
				
			}
			catch (error) {
				output.status = 566;
				output.error = error.message;
				return output;
			}
		}
		
		output.status = 200;
		return output;
	},

	requestAccess: async (ipAddress, domainHost, userName, userEmail, userAgent, serverPath) => {
		const output = {},
			deviceToken = (Math.random() + 1).toString(36).substring(2,12),
			encryptedToken = jwt.sign({ token: deviceToken }, config.jwt),
			userRequest = {
				name: userName,
				email: userEmail,
				device: {
					token: deviceToken,
					ip: ipAddress,
					domain: domainHost,
					browser: userAgent
				}
			};
			
		try {
			await client.post(`${ serverPath }/data/devicerequest`).send({ devicerequest: userRequest }).then();
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		let isEmailSent = false;
		try {
			const userLookupResponse = await client.get(`${ serverPath }/data/user?email=${ encodeURIComponent(userEmail) }`);
			const matchingUsers = (userLookupResponse.body && userLookupResponse.body.users) || [];

			if (matchingUsers.length > 0) {
				const approvalLinkUrl = `https://${ domainHost }/portal/index.html?token=${ encryptedToken }`;
				
				try {
					const configResponse = await client.get(`${ serverPath }/data/serverconfig?key=googleAuth`);
					const serverConfigs = configResponse.body && configResponse.body.serverConfigs;

					if (serverConfigs && serverConfigs.length > 0 && serverConfigs[0].value && serverConfigs[0].value.refreshToken) {
						const googleAuthVal = serverConfigs[0].value;
						const algorithm = 'aes-256-cbc';
						const keySecret = config.sessionSecret || config.jwt || "fortmill_wrestling_session_secret_key_123456789";
						const key = crypto.createHash('sha256').update(keySecret).digest();
						const refreshTokenParts = googleAuthVal.refreshToken.split(':');
						const iv = Buffer.from(refreshTokenParts.shift(), 'hex');
						const encryptedBuffer = Buffer.from(refreshTokenParts.join(':'), 'hex');
						const decipher = crypto.createDecipheriv(algorithm, key, iv);
						let decryptedBuffer = decipher.update(encryptedBuffer);
						decryptedBuffer = Buffer.concat([decryptedBuffer, decipher.final()]);
						const decryptedRefreshToken = decryptedBuffer.toString();

						const oAuth2Client = new google.auth.OAuth2(
							config.google.client_id,
							config.google.client_secret,
							config.google.redirect_uris[0]
						);
						oAuth2Client.setCredentials({ refresh_token: decryptedRefreshToken });

						const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

						const emailBodyHtml = `
							<div style="font-family: sans-serif; padding: 20px;">
								<h2>Access Approval Requested</h2>
								<p>A request to access <strong>The Wrestling Mill</strong> portal was made for <strong>${ userEmail }</strong> (${ userName }).</p>
								<p>If you requested this access, click the button below to approve and log in:</p>
								<p style="margin: 25px 0;">
									<a href="${ approvalLinkUrl }" style="background-color: #76b900; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">Approve Access & Log In</a>
								</p>
								<p style="color: #666; font-size: 12px;">Or copy and paste this link into your browser: <br/><a href="${ approvalLinkUrl }">${ approvalLinkUrl }</a></p>
							</div>
						`;

						const boundary = `----=_Part_${ Math.random().toString().slice(2) }`;
						const emailLines = [
							`To: ${ userEmail }`,
							`Subject: Attempted Login - Access Approval Requested`,
							'MIME-Version: 1.0',
							`Content-Type: multipart/mixed; boundary="${ boundary }"`,
							'',
							`--${ boundary }`,
							'Content-Type: text/html; charset="UTF-8"',
							'Content-Transfer-Encoding: 7bit',
							'',
							emailBodyHtml,
							'',
							`--${ boundary }--`
						];

						const rawEmail = emailLines.join('\r\n');
						const base64EncodedEmail = Buffer.from(rawEmail).toString('base64url');

						await gmail.users.messages.send({
							userId: 'me',
							requestBody: {
								raw: base64EncodedEmail
							}
						});

						isEmailSent = true;
					}
				}
				catch (sendEmailError) {
					console.warn("Error sending approval email via googleapis in requestAccess:", sendEmailError.message);
				}
			}
		}
		catch (lookupError) {
			console.warn("Error looking up user by email in requestAccess:", lookupError.message);
		}

		output.status = 200;
		output.cookie = encryptedToken;
		output.data = { emailSent: isEmailSent };
		return output;
	},

	postLoad: async (serverPath) => {
		const output = {};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/post`);

			output.status = 200;
			output.data = { posts: clientResponse.body.posts.filter(post => !post.expires || new Date(post.expires) > new Date()) };
			return output;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}
	},

	postSave: async (body, serverPath) => {
		const output = {};

		if (!body) {
			output.status = 562;
			output.error = "Missing action";
			return output;
		}
		else if (body.save) {
			let saveId = null;

			try {
				const clientResponse = await client.post(`${ serverPath }/data/post`).send({ post: body.save }).then();
				saveId = clientResponse.body.id;
			}
			catch (error) {
				output.status = 561;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/post?id=${ saveId }`).then();
				
				output.status = 200;
				output.data = { post: clientResponse.body.posts[0] };
				return output;
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}
		}
		else if (body.delete) {
			try {
				await client.delete(`${ serverPath }/data/post?id=${ body.delete }`);

				output.status = 200;
				output.data = { status: "ok" };
				return output;
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}
		}
	},

	scheduleLoad: async (serverPath, startDate, endDate, state) => {
		const output = { data: {} };
		let eventParams = [];

		if (startDate && endDate) {
			eventParams.push(`startdate=${ startDate }`);
			eventParams.push(`enddate=${ endDate }`);
		}
		if (state) {
			eventParams.push(`state=${ state }`);
		}

		const eventSelect = "sqlId,eventSystem,systemId,eventType,name,date,endDate,location,state,hasMatches";

		eventParams.push(`select=${ eventSelect }`);

		const eventUrl = `${ serverPath }/data/event?${ eventParams.join("&") }`;
		const teamEventUrl = `${ serverPath }/data/teamevent?${ startDate && endDate ? `startdate=${startDate}&enddate=${endDate}` : "" }`;

		try {
			// 1. Fetch general events
			const clientResponse = await client.get(eventUrl);
			output.data.events = clientResponse.body.events;

			// 2. Fetch team events
			const teamEventResponse = await client.get(teamEventUrl);
			output.data.teamEvents = teamEventResponse.body.teamEvents || [];

			// 5. Fetch schools / opponent options directly
			try {
				const schoolResponse = await client.get(`${ serverPath }/data/school`);
				output.data.schools = (schoolResponse.body.schools || [])
					.map(school => ({
						id: school.id || school._id,
						name: school.name,
						classification: school.classification,
						region: school.region
					}));
			} catch (schoolError) {
				console.error("Error preloading schools in scheduleLoad:", schoolError.message);
				output.data.schools = [];
			}
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}
		
		output.status = 200;		
		return output;
	},

	requestsLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/devicerequest`);
			output.data.deviceRequests = clientResponse.body.deviceRequests;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/user`);
			output.data.users = clientResponse.body.users;
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
		}
		
		output.status = 200;
		return output;
	},

	requestsSave: async (body, serverPath) => {
		const output = {};

		if (!body) {
			output.status = 561;
			output.error = "Missing action";
			return output;
		}
		else if (body.save) {
			if (!body.save.request || !body.save.request.created || !body.save.request.device || !body.save.request.device.ip || !body.save.request.device.token) { 
				output.status = 562;
				output.error = "Invalid save request";
				return output;
			}
			if (!body.save.userId && !body.save.user) {
				output.status = 562;
				output.error = "Invalid user to save";
				return output;
			}
			if (body.save.user && (!body.save.user.firstName || !body.save.user.lastName || !body.save.user.email)) {
				output.status = 562;
				output.error = "Invalid user information for new user";
				return output;
			}

			let user;

			if (body.save.userId) {
				// Get user from DB
				try {
					const clientResponse = await client.get(`${ serverPath }/data/user?id=${ body.save.userId }`).then();
					
					if (!clientResponse.body.users.length === 1) {
						output.status = 563;
						output.error = "Invalid user ID";
						return output;
					}

					user = clientResponse.body.users[0];
				}
				catch (error) {
					output.status = 564;
					output.error = error.message;
					return output;
				}
			}
			else {
				// Build new user
				user = {
					firstName: body.save.user.firstName,
					lastName: body.save.user.lastName,
					email: body.save.user.email,
					devices: [],
					roles: []
				}
			}

			// Add the request to the devices
			user.devices.push({
				...body.save.request.device,
				created: body.save.request.created,
				lastAccess: null
			});

			let userId;
			try {
				const clientResponse = await client.post(`${ serverPath }/data/user`).send({ user: user }).then();
				userId = clientResponse.body.id;
			}
			catch (error) {
				output.status = 565;
				output.error = error.message;
				return output;
			}

			try {
				await client.delete(`${ serverPath }/data/devicerequest?id=${ body.save.request.id }`);
			}
			catch (error) {
				output.status = 566;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { userId: userId };
			return output;
		}
		else if (body.delete) {
			try {
				await client.delete(`${ serverPath }/data/devicerequest?id=${ body.delete }`);

				output.status = 200;
				output.data = { status: "ok" };
				return output;
			}
			catch (error) {
				output.status = 567;
				output.error = error.message;
				return output;
			}
		}
	},

	roleLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		let roles = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/role`);
			roles = clientResponse.body.roles;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/user`);
			output.data.users = clientResponse.body.users.map(user => ({
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				roles: user.roles
			}));
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/privilege`);
			output.data.privileges = clientResponse.body.privileges;
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		try {
			output.data.roles = roles.map(role => ({
				...role,
				users: output.data.users
					.filter(user => user.roles && user.roles.some(userRole => userRole.id === role.id))
					.map(user => ({
						id: user.id,
						firstName: user.firstName,
						lastName: user.lastName
					}))
			}));
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	roleSave: async (body, serverPath) => {
		const output = {};

		if (!body) {
			output.status = 562;
			output.error = "Missing action";
			return output;
		}
		else if (body.saveRole) {
			let saveId = null;

			try {
				const clientResponse = await client.post(`${ serverPath }/data/role`).send({ role: body.saveRole }).then();
				saveId = clientResponse.body.id;
			}
			catch (error) {
				output.status = 561;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/role?id=${ saveId }`).then();
				
				output.status = 200;
				output.data = { role: {...clientResponse.body.roles[0], users: [] } };
				return output;
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}
		}
		else if (body.delete) {
			// Delete role from existing users
			let users = null;
			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?roleid=${ body.delete }`).then();
				users = clientResponse.body.users.map(user => ({
					...user,
					roles: user.roles.filter(role => role.id !== body.delete)
				}));
			}
			catch (error) {
				output.status = 584;
				output.error = error.message;
				return output;
			}

			try {
				users.forEach(async user => await client.post(`${ serverPath }/data/user`).send({ user: user }).then());
			}
			catch (error) {
				output.status = 585;
				output.error = error.message;
				return output;
			}

			try {
				await client.delete(`${ serverPath }/data/role?id=${ body.delete }`);

				output.status = 200;
				output.data = { status: "ok" };
				return output;
			}
			catch (error) {
				output.status = 564;
				output.error = error.message;
				return output;
			}
		}
		else if (body.saveMember) {
			if (!body.saveMember.roleId || !body.saveMember.memberId) {
				output.status = 565;
				output.error = "Missing required parameters to save";
				return output;
			}

			let role = null,
				user = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/role?id=${ body.saveMember.roleId }`).then();
				role = clientResponse.body.roles[0];
			}
			catch (error) {
				output.status = 566;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?id=${ body.saveMember.memberId }`).then();
				user = clientResponse.body.users[0];
			}
			catch (error) {
				output.status = 567;
				output.error = error.message;
				return output;
			}
			
			user.roles = user.roles && user.roles.some(userRole => userRole.id === role.id) ? user.roles
				: (user.roles || []).concat({ id: role.id, name: role.name })

			try {
				await client.post(`${ serverPath }/data/user`).send({ user: user }).then();
			}
			catch (error) {
				output.status = 568;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?roleid=${ role.id }`).then();
				role.users = clientResponse.body.users.map(user => ({ id: user.id, firstName: user.firstName, lastName: user.lastName }));
			}
			catch (error) {
				output.status = 569;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { role: role };
			return output;
		}
		else if (body.deleteMember) {
			if (!body.deleteMember.roleId || !body.deleteMember.memberId) {
				output.status = 570;
				output.error = "Missing required parameters to save";
				return output;
			}

			let user = null,
				role = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?id=${ body.deleteMember.memberId }`).then();
				user = clientResponse.body.users[0];
			}
			catch (error) {
				output.status = 571;
				output.error = error.message;
				return output;
			}

			user.roles = user.roles ? user.roles.filter(role => role.id !== body.deleteMember.roleId) : [];
			
			try {
				await client.post(`${ serverPath }/data/user`).send({ user: user }).then();
			}
			catch (error) {
				output.status = 572;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/role?id=${ body.deleteMember.roleId }`).then();
				role = clientResponse.body.roles[0];
			}
			catch (error) {
				output.status = 573;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?roleid=${ role.id }`).then();
				role.users = clientResponse.body.users.map(user => ({ id: user.id, firstName: user.firstName, lastName: user.lastName }));
			}
			catch (error) {
				output.status = 574;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { role: role };
			return output;
		}
		else if (body.savePrivilege) {
			if (!body.savePrivilege.roleId || !body.savePrivilege.privilegeId) {
				output.status = 575;
				output.error = "Missing required parameters to save";
				return output;
			}

			let role = null,
				privilege = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/role?id=${ body.savePrivilege.roleId }`).then();
				role = clientResponse.body.roles[0];
			}
			catch (error) {
				output.status = 576;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/privilege?id=${ body.savePrivilege.privilegeId }`).then();
				privilege = clientResponse.body.privileges[0];
			}
			catch (error) {
				output.status = 577;
				output.error = error.message;
				return output;
			}

			role.privileges = role.privileges && role.privileges.some(rolePrivilege => rolePrivilege.id === privilege.id) ? role.privileges
				: (role.privileges || []).concat(privilege);
			
			try {
				await client.post(`${ serverPath }/data/role`).send({ role: role }).then();
			}
			catch (error) {
				output.status = 578;
				output.error = error.message;
				return output;
			}
	
			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?roleid=${ role.id }`).then();
				role.users = clientResponse.body.users.map(user => ({ id: user.id, firstName: user.firstName, lastName: user.lastName }));
			}
			catch (error) {
				output.status = 579;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { role: role };
			return output;
		}
		else if (body.deletePrivilege) {
			if (!body.deletePrivilege.roleId || !body.deletePrivilege.privilegeId) {
				output.status = 580;
				output.error = "Missing required parameters to save";
				return output;
			}

			let role = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/role?id=${ body.deletePrivilege.roleId }`).then();
				role = clientResponse.body.roles[0];
			}
			catch (error) {
				output.status = 581;
				output.error = error.message;
				return output;
			}

			role.privileges = role.privileges ? role.privileges.filter(privilege => privilege.id !== body.deletePrivilege.privilegeId) : [];
			
			try {
				await client.post(`${ serverPath }/data/role`).send({ role: role }).then();
			}
			catch (error) {
				output.status = 582;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?roleid=${ role.id }`).then();
				role.users = clientResponse.body.users.map(user => ({ id: user.id, firstName: user.firstName, lastName: user.lastName }));
			}
			catch (error) {
				output.status = 583;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { role: role };
			return output;
		}
	},

	usersLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/user`);
			output.data.users = clientResponse.body.users;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/role`);
			output.data.roles = clientResponse.body.roles.map(role => ({
				id: role.id,
				name: role.name
			}));
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	usersSave: async (body, serverPath) => {
		const output = {};

		if (!body) {
			output.status = 560;
			output.error = "Missing action";
			return output;
		}
		else if (body.saveUser) {
			let saveId = null;

			try {
				const clientResponse = await client.post(`${ serverPath }/data/user`).send({ user: body.saveUser }).then();
				saveId = clientResponse.body.id;
			}
			catch (error) {
				output.status = 561;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?id=${ saveId }`).then();
				
				output.status = 200;
				output.data = { user: {...clientResponse.body.users[0] } };
				return output;
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}
		}
		else if (body.deleteUser) {
			try {
				await client.delete(`${ serverPath }/data/user?id=${ body.deleteUser }`);

				output.status = 200;
				output.data = { status: "ok" };
				return output;
			}
			catch (error) {
				output.status = 564;
				output.error = error.message;
				return output;
			}
		}
		else if (body.deleteDevice) {
			if (!body.deleteDevice.userId || !body.deleteDevice.token) {
				output.status = 572;
				output.error = "Missing required parameters to save";
				return output;
			}

			let user = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?id=${ body.deleteDevice.userId }`).then();
				user = clientResponse.body.users[0];
			}
			catch (error) {
				output.status = 573;
				output.error = error.message;
				return output;
			}

			user.devices = user.devices ? user.devices.filter(userDevice => userDevice.token !== body.deleteDevice.token) : [];
			
			try {
				await client.post(`${ serverPath }/data/user`).send({ user: user }).then();
			}
			catch (error) {
				output.status = 574;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { user: user };
			return output;
		}
		else if (body.saveRole) {
			if (!body.saveRole.userId || !body.saveRole.roleId) {
				output.status = 565;
				output.error = "Missing required parameters to save";
				return output;
			}

			let user = null,
				role = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?id=${ body.saveRole.userId }`).then();
				user = clientResponse.body.users[0];
			}
			catch (error) {
				output.status = 566;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/role?id=${ body.saveRole.roleId }`).then();
				role = clientResponse.body.roles[0];
			}
			catch (error) {
				output.status = 567;
				output.error = error.message;
				return output;
			}

			user.roles = user.roles && user.roles.some(userRole => userRole.id === role.id) ? user.roles // If already exists
				: (user.roles || []).concat({ id: role.id, name: role.name });
			
			try {
				await client.post(`${ serverPath }/data/user`).send({ user: user }).then();
			}
			catch (error) {
				output.status = 568;
				output.error = error.message;
				return output;
			}
	
			output.status = 200;
			output.data = { user: user };
			return output;
		}
		else if (body.deleteRole) {
			if (!body.deleteRole.userId || !body.deleteRole.roleId) {
				output.status = 569;
				output.error = "Missing required parameters to save";
				return output;
			}

			let user = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/user?id=${ body.deleteRole.userId }`).then();
				user = clientResponse.body.users[0];
			}
			catch (error) {
				output.status = 570;
				output.error = error.message;
				return output;
			}

			user.roles = user.roles ? user.roles.filter(userRole => userRole.id !== body.deleteRole.roleId) : [];
			
			try {
				await client.post(`${ serverPath }/data/user`).send({ user: user }).then();
			}
			catch (error) {
				output.status = 571;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { user: user };
			return output;
		}

	},



	scmatTeamBulkSave: async (teamsSave, serverPath) => {
		const output = { data: { teams: [] } };

		for (let teamIndex = 0; teamIndex < teamsSave.length; teamIndex++) {

			let team = null;
			try {
				const clientResponse = await client.get(`${ serverPath }/data/scmatteam?exactname=${ teamsSave[teamIndex].name }`)

				if (clientResponse.body.scmatTeams.length > 0) {
					team = {
						...teamsSave[teamIndex],
						id: clientResponse.body.scmatTeams[0].id
					};
				}
				else {
					team = teamsSave[teamIndex];
				}
			}
			catch (error) {
				output.status = 561;
				output.data.teams.push({ index: teamIndex, error: error.message });
				continue;
			}

			try {
				const clientResponse = await client.post(`${ serverPath }/data/scmatteam`).send({ scmatteam: team }).then();
				output.data.teams.push({ index: teamIndex, id: clientResponse.body.id });
			}
			catch (error) {
				output.status = 562
				output.data.teams.push({ index: teamIndex, error: error.message });
			}

		}

		output.status = output.status || 200;
		return output;
	},

	eventsBulkSave: async (events, serverPath) => {
		const output = {};

		try {
			const clientResponse = await client
				.post(`${ serverPath }/data/event/bulk`)
				.send({ events })
				.then();
			
			output.status = clientResponse.status;
			output.data = clientResponse.body;
		}
		catch (error) {
			output.status = error.status || 500;
			output.error = error.message;
		}

		return output;
	},

	scmatTeamSearch: async (name, serverPath) => {
		const output = { data: {} };

		try {
			const clientResponse = await client.get(`${ serverPath }/data/scmatteam?name=${ name }`);
			output.data.scmatTeams = clientResponse.body.scmatTeams;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/team`);
			const linkedTeamIds = clientResponse.body.teams.flatMap(team => (team.scmatTeams || []).map(scmatTeam => scmatTeam.id));

			output.data.scmatTeams = output.data.scmatTeams
				.filter(scmatTeam => !linkedTeamIds.includes(scmatTeam.id))
				.map(scmatTeam => ({
					id: scmatTeam.id,
					name: scmatTeam.name,
					lastUpdate: (scmatTeam.rankings || [])
						.map(rank => new Date(rank.date))
						.sort((dateA, dateB) => +dateB - +dateA)
						.find(() => true),
					lastRanking: (scmatTeam.rankings || [])
						.sort((rankA, rankB) => +(new Date(rankB.date)) - +(new Date(rankA.date)))
						.map(rank => rank.ranking)
						.find(() => true),
					wrestlerCount: (scmatTeam.wrestlers || []).length
				}));
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	wrestlerSearchRanking: async (state, weightClass, serverPath) => {
		const output = { data: {} };

		try {
			const clientResponse = await client.get(`${ serverPath }/data/school`);
			output.data.schools = clientResponse.body.schools
				.map(school => ({
					id: school.id,
					name: school.name,
					classification: school.classification,
					region: school.region
				}));
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		const seasonStart = new Date() > new Date(new Date().getFullYear(), 11, 1) ?
				new Date(new Date().getFullYear(), 8, 1)
				: new Date(new Date().getFullYear() - 1, 8, 1);

		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?ratingsort=true&wrestledsince=${ seasonStart.toLocaleDateString() }&${ state ? `state=${ state }&` : "" }${ weightClass ? `lastweightclass=${ encodeURIComponent(weightClass) }` : "" }`);
			output.data.wrestlerRankings = clientResponse.body.wrestlers.map(wrestler => ({
				id: wrestler.id,
				name: wrestler.name,
				rating: wrestler.rating,
				deviation: wrestler.deviation,
				team: wrestler.schoolName || wrestler.lastTeam,
				weightClass: wrestler.lastWeightClass
			}));
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	wrestlerSearch: async (search, searchType, serverPath) => {
		const output = { data: {} }

		let query = "";
		if (searchType == "wrestler") {
			query = `name=${ search }`;
		}
		else if (searchType == "team") {
			query = `teampartial=${ search }`;
		}
		else {
			output.status = 562;
			output.error = "Missing search type";
			return output;
		}

		let wrestlers = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?${ query }`);
			wrestlers = clientResponse.body.wrestlers;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			output.data.wrestlers = wrestlers.map(wrestler => ({
				id: wrestler.id,
				name: wrestler.name,
				rating: wrestler.rating,
				deviation: wrestler.deviation,
				team: wrestler.lastTeam,
				division: wrestler.schoolDivision,
				weightClass: wrestler.lastWeightClass,
				lastEvent: wrestler.lastEvent,
				teams: Array.isArray(wrestler.searchTeams) ? wrestler.searchTeams : []
			}));
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	wrestlerDetails: async (wrestlerId, serverPath) => {
		const output = { data: {} };

		let wrestler = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?id=${ wrestlerId }`);
			wrestler = clientResponse.body.wrestlers[0];
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		let wrestlerEvents = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestlerevent?wrestlerid=${ wrestlerId }`);
			wrestlerEvents = clientResponse.body.wrestlerEvents;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			
			wrestler = {
				...wrestler,
				name: wrestler.name ? wrestler.name : wrestler.firstName + " " + wrestler.lastName,
				isFortMill: /fort mill/i.test(wrestler.schoolName),
				schoolName: wrestler.schoolName,
				division: wrestler.schoolDivision,
				weightClass: wrestler.weightClass,
				rating: wrestler.rating,
				deviation: wrestler.deviation,
				events: wrestlerEvents.map(event => ({
					...event,
					division: event.matches[0] ?
						/(hs|high school|high)/i.test(event.matches[0].division) ? "Varsity"
						: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
						: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
						: (event.matches[0].division || "").trim()
						: "",
					weightClass: event.matches[0]?.weightClass || "",
					matches: event.matches
				}))
			};
		
			let winningPaths = [];
			let losingPaths = [];
			try {
				if (wrestler.sqlId) {
					const pathResponse = await client.get(`${ serverPath }/memgraph/wrestlerfortmillpaths?sqlid=${ wrestler.sqlId }`);
					if (pathResponse.body) {
						const candidateWinning = pathResponse.body.candidateWinningPaths || pathResponse.body.winningPaths || [];
						const candidateLosing = pathResponse.body.candidateLosingPaths || pathResponse.body.losingPaths || [];

						const filterStrictUniquePaths = (candidatePaths = []) => {
							const uniquePaths = [];
							const usedNodeIds = new Set();

							for (const path of candidatePaths) {
								const pathNodeIds = (path.wrestlers || []).slice(1).map(w => w.id);
								const isDuplicate = pathNodeIds.some(id => usedNodeIds.has(id));

								if (!isDuplicate) {
									pathNodeIds.forEach(id => usedNodeIds.add(id));
									uniquePaths.push(path);
									if (uniquePaths.length === 5) break;
								}
							}

							return uniquePaths;
						};

						winningPaths = filterStrictUniquePaths(candidateWinning);
						losingPaths = filterStrictUniquePaths(candidateLosing);
					}
				}
			}
			catch { }

			wrestler = {
				...wrestler,
				winningPaths,
				losingPaths
			};

			output.data.wrestler = wrestler;
			output.status = 200;
			return output;
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}
	},

	wrestlerOpponentsGraph: async (wrestlerId, timeframeMonths, serverPath) => {
		const output = { data: {} };

		try {
			const clientResponse = await client.get(`${ serverPath }/memgraph/wrestlergraph?sqlid=${ wrestlerId }&months=${ timeframeMonths || "" }`);
			output.data = clientResponse.body;
			output.status = 200;
		}
		catch (error) {
			output.status = 500;
			output.error = error.message;
		}

		return output;
	},

	opponentLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=fort mill`);
			
			output.data.team = clientResponse.body.wrestlers
				.map(wrestler => ({
					id: wrestler.id,
					name: wrestler.name,
					lastEvent: wrestler.lastEvent,
					division: /(hs|high school|hs girls)/i.test(wrestler.schoolDivision) ? "Varsity"
						: /(jv|junior varsity)/i.test(wrestler.schoolDivision) ? "JV"
						: /(ms|middle school)/i.test(wrestler.schoolDivision) ? "MS"
						: (wrestler.schoolDivision || "").trim(),
					weightClass: (wrestler.schoolWeightClass || wrestler.lastWeightClass).replace("lbs", "").trim(),
					rating: wrestler.rating,
					deviation: wrestler.deviation
				}))
				.filter(wrestler => wrestler.lastEvent && new Date(wrestler.lastEvent.date) >= new Date(new Date().getFullYear() - 1, 8, 1));
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/school`);
			output.data.schools = clientResponse.body.schools
				.filter(school => !/^fort mill$/gi.test(school.name))
				.map(school => ({
					id: school.id,
					name: school.name,
					classification: school.classification,
					region: school.region
				}));
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	opponentSelect: async (opponentId, serverPath) => {
		const output = { data: {} };

		let opponentName = "";
		try {
			const clientResponse = await client.get(`${ serverPath }/data/school?id=${ opponentId }`);
			const opponentSchool = clientResponse.body.schools[0];
			opponentName = opponentSchool.name;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		let wrestlers = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=${ opponentName }`);
			wrestlers = clientResponse.body.wrestlers;
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		let wrestlerEvents = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestlerevent?team=${ encodeURIComponent(opponentName) }`);
			wrestlerEvents = clientResponse.body.wrestlerEvents || [];
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		try {
			const seasonStart = new Date() > new Date(new Date().getFullYear(), 11, 1) ?
				new Date(new Date().getFullYear(), 8, 1)
				: new Date(new Date().getFullYear() - 1, 8, 1);
			
			const outputWrestlers = wrestlers
				.filter(wrestler => wrestlerEvents.some(event => (event.wrestlerId == wrestler.id || (wrestler.sqlId && event.wrestlerSqlId == wrestler.sqlId)) && /^sc$/gi.test(event.locationState))) // Wrestler has wrestled in SC
				.map(wrestler => ({
					id: wrestler.id,
					name: wrestler.name,
					lastEvent: wrestler.lastEvent,
					division: /(hs|high school|hs girls)/i.test(wrestler.schoolDivision) ? "Varsity"
						: /(jv|junior varsity)/i.test(wrestler.schoolDivision) ? "JV"
						: /(ms|middle school)/i.test(wrestler.schoolDivision) ? "MS"
						: (wrestler.schoolDivision || "").trim(),
					weightClass: (wrestler.schoolWeightClass || wrestler.lastWeightClass).replace("lbs", "").trim(),
					rating: wrestler.rating,
					deviation: wrestler.deviation
				}))
				.filter(wrestler => 
					wrestler.lastEvent // Has a last event
					&& new Date(wrestler.lastEvent.date) >= seasonStart // Last event within the last school year
				);
			
			const allEvents = wrestlerEvents
				.filter(event => 
					new Date(event.date) >= seasonStart // Event within the last school year
					&& event.matches && event.matches.some(match => match.weightClass && !isNaN(match.weightClass.replace("lbs", "").trim())) // Has a numeric weight class
					&& outputWrestlers.some(wrestler => wrestler.id == event.wrestlerId) // Has a wrestler from the filtered wrestlers
				)
				.map(event => ({
					lookupKey: `${ new Date(event.date).toLocaleDateString() }|${ event.name }`,
					name: event.name,
					date: new Date(event.date),
					wrestlerId: event.wrestlerId,
					wrestlerWeightClass: event.matches && event.matches.length > 0 && event.matches[0].weightClass ? event.matches[0].weightClass.replace("lbs", "").trim() : null
				})),
				teamEvents = [...new Set(allEvents.map(event => event.lookupKey))].map(eventKey => 
					allEvents.filter(event => event.lookupKey == eventKey)
						.map(event => ({
							key: eventKey,
							name: event.name,
							date: event.date,
							wrestlers: allEvents
								.filter(event => event.lookupKey == eventKey)
								.map(event => ({
									id: event.wrestlerId,
									weightClass: event.wrestlerWeightClass
								}))
						}))
						.find(() => true)
				)
				.sort((eventA, eventB) => +eventB.date - +eventA.date);
			
			output.data.wrestlers = outputWrestlers;
			output.data.events = teamEvents;
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;		
	},

	opponentSaveLineup: async (user, saveId, saveName, opponentId, startingWeightClass, lineup, serverPath) => {
		const output = { data: {} };
		
		let saveUser = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/user?id=${ user.id }`);
			saveUser = clientResponse.body.users[0];
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			if (!saveUser.session) {
				saveUser.session = {}
			}
			if (!saveUser.session.matchSave) {
				saveUser.session.matchSave = [];
			}
			
			if (!lineup && saveUser.session.matchSave.some(match => match["_id"] == saveId)) {
				// Delete the match
				saveUser.session.matchSave = saveUser.session.matchSave.filter(match => match["_id"] != saveId);
			}
			else if (saveUser.session.matchSave.some(match => match["_id"] == saveId)) {
				// Opponent exists, replace it
				saveUser.session.matchSave = saveUser.session.matchSave.map(match => {
					if (match["_id"] == saveId) {
						return {
							_id: saveId,
							name: saveName,
							opponentId: opponentId,
							startingWeightClass: startingWeightClass,
							lineup: lineup.map(lineupMatch => ({
								weightClass: lineupMatch.weightClass,
								isStaticTeam: lineupMatch.isStaticTeam,
								teamWrestlerId: lineupMatch.teamWrestlerId,
								teamScore: lineupMatch.teamScore,
								isStaticOpponent: lineupMatch.isStaticOpponent,
								opponentWrestlerId: lineupMatch.opponentWrestlerId,
								opponentScore: lineupMatch.opponentScore
							}))
						};
					}

					return match;
				});
			}
			else {
				// Opponent doesn't exist, add it
				saveUser.session.matchSave.push({
					name: saveName,
					opponentId: opponentId,
					startingWeightClass: startingWeightClass,
					lineup: lineup.map(lineupMatch => ({
						weightClass: lineupMatch.weightClass,
						isStaticTeam: lineupMatch.isStaticTeam,
						teamWrestlerId: lineupMatch.teamWrestlerId,
						teamScore: lineupMatch.teamScore,
						isStaticOpponent: lineupMatch.isStaticOpponent,
						opponentWrestlerId: lineupMatch.opponentWrestlerId,
						opponentScore: lineupMatch.opponentScore
					}))
				});
			}
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		try {
			await client.post(`${ serverPath }/data/user`).send({ user: saveUser }).then();
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}
		
		try {
			const clientResponse = await client.get(`${ serverPath }/data/user?id=${ user.id }`);
			const returnUser = clientResponse.body.users[0];

			output.status = 200;
			output.data.savedMatches = returnUser.session.matchSave;
			return output;
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}
		
	},

	opponentEventLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/school`);
			output.data.schools = clientResponse.body.schools
				.map(school => ({
					id: school.id,
					name: school.name,
					classification: school.classification,
					region: school.region
				}));
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	opponentEventSelect: async (opponentId, serverPath) => {
		const output = { data: {} };

		let opponentName = "";
		try {
			const clientResponse = await client.get(`${ serverPath }/data/school?id=${ opponentId }`);
			const opponentSchool = clientResponse.body.schools[0];
			opponentName = opponentSchool.name;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		let wrestlers = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=${ opponentName }`);
			wrestlers = clientResponse.body.wrestlers;
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		let wrestlerEvents = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestlerevent?team=${ encodeURIComponent(opponentName) }`);
			wrestlerEvents = clientResponse.body.wrestlerEvents || [];
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		try {
			
			const allEvents = wrestlerEvents
				.map(event => ({
					lookupKey: `${ new Date(event.date).toLocaleDateString() }|${ event.name }`,
					...event
				})),
				teamEvents = [...new Set(allEvents.map(event => event.lookupKey))].map(eventKey => 
					allEvents.filter(event => event.lookupKey == eventKey)
						.map(event => ({
							key: eventKey,
							name: event.name,
							date: event.date,
							wrestlers: allEvents
								.filter(event => 
									event.lookupKey == eventKey
									&& wrestlers.some(wrestler => wrestler.id == event.wrestlerId)
								)
								.map(event => {
									const wrestler = wrestlers.find(wrestler => wrestler.id == event.wrestlerId);
									return {
										id: event.wrestlerId,
										sqlId: wrestler.sqlId,
										name: wrestler.name,
										rating: wrestler.rating,
										deviation: wrestler.deviation,
										division: wrestler.schoolDivision,
										weightClass: wrestler.schoolWeightClass || wrestler.lastWeightClass,
										matches: event.matches
									}
								})
						}))
						.find(() => true)
				)
				.sort((eventA, eventB) => +eventB.date - +eventA.date);
			
			output.data.events = teamEvents;
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;		
	},

	dualLoad: async (targetId, serverPath) => {
		const output = { data: { dual: null, fortMillWrestlers: [], opponentWrestlers: [] } };

		let eventRecord = null;
		try {
			const eventResponse = await client.get(`${ serverPath }/data/event?id=${ targetId }`);
			eventRecord = eventResponse.body.events[0];

			if (!eventRecord) {
				output.status = 565;
				output.error = "Event not found";
				return output;
			}

			output.data.dual = eventRecord;
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		const opponentTeamName = extractOpponentTeam(eventRecord);
		let opponentSchool = null;
		if (opponentTeamName) {
			try {
				const schoolResponse = await client.get(`${ serverPath }/data/school`);
				const schools = schoolResponse.body.schools || [];
				opponentSchool = schools.find(school => 
					school.lookupNames && school.lookupNames.includes(opponentTeamName.trim())
				);
			} catch (schoolError) {
				console.error(`Error searching school: ${schoolError.message}`);
			}
		}

		const wrestlersData = await getDualWrestlers(opponentSchool, serverPath);
		output.data.fortMillWrestlers = wrestlersData.fortMillWrestlers;
		output.data.opponentWrestlers = wrestlersData.opponentWrestlers;

		output.status = 200;
		return output;
	},

	dualUpload: async (imageBuffer, mimetype, serverPath, updateProgress = () => {}) => {
		const output = { data: {} };

		const extension = mimetype.split('/')[1];
		const fileName = `${Date.now()}.${extension}`;
		const filePath = path.join(process.cwd(), 'client', 'media', 'temp', fileName);

		updateProgress("SAVING_IMAGE", "Saving uploaded scoresheet image...", 0);
		try {
			fs.writeFileSync(filePath, imageBuffer);
		} catch (error) {
			output.status = 561;
			output.error = `Error saving file: ${error.message}`;
			return output;
		}

		try {
			const imageBytes = imageBuffer.toString("base64");

			const prompt = `
This image contains the visitor name at the top, as well as a table with a row for each wrestler with the wrestler score shorthand, and the match results.
Extract:
* The opponent name at the top of the sheet.
* An array of matches:
	* The weight class (e.g. 106, 113, etc.)
	* If the result was a pin / fall (usually indicated with F)
	* An array of the two wrestlers in the match:
		* Wrestler name
		* Team (either "Fort Mill" or the extracted visitor opponent name)
		* isWinner (true if this wrestler won the match, false otherwise - sometimes can be indicated with a circle)
		* An array of wrestler's scores/actions (e.g. N4, T3, E1. Single characters or digits should be ignored)
		* Match Results (team points for the match, either 0, 3, 4, 5, or 6)
Return the data as a JSON object with:
{
  "opponent": "Opponent Name",
  "matches": [{
    "weightClass": "106",
    "isFall": true,
    "wrestlers": [{
      "name": "Wrestler Name",
      "team": "Fort Mill",
      "isWinner": true,
      "scores": ["T2", "N3"],
	  "matchResults": 3
    }, {
      "name": "Wrestler Name 2",
      "team": "Opponent Name",
      "isWinner": false,
      "scores": [],
	  "matchResults": 0
    }]
  }]
}
Do not return any other text or markup.
`;

			const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${config.geminiAPIKey}`;
			const headers = { "Content-Type": "application/json" };
			const data = {
				"contents": [
					{
						"parts": [
							{ "text": prompt },
							{ "inline_data": { "mime_type": mimetype, "data": imageBytes } }
						]
					}
				]
			};

			updateProgress("GEMINI_EXTRACT", "AI Step 1 of 3: Analyzing scoresheet image with Gemini Vision...", 1);
			const response = await client.post(url).set(headers).send(data);
			const jsonResponse = response.body;

			let text = jsonResponse["candidates"][0]["content"]["parts"][0]["text"];
			text = text.replace("```json", "").replace("```", "");
			const statsData = JSON.parse(text);
			output.data.gemini = statsData;

			output.data.stats = {
				opponent: statsData.opponent,
				matches: (statsData.matches || []).map((match, matchIndex) => {
					const scores = match.wrestlers.map(wrestler => wrestler.matchResults || 0);

					return {
						matchSqlId: null,
						weightClass: match.weightClass,
						winType: match.isFall ? "F"
							: (match.wrestlers || []).map(wrestler => wrestler.name?.toLowerCase()).includes("forf") ? "FF"
							: scores.includes(3) ? "Dec"
							: scores.includes(4) ? "MD"
							: scores.includes(5) ? "TF"
							: null,
						sort: matchIndex + 1,
						wrestlers: (match.wrestlers || []).map(wrestler => {

							const scoreCounts = (wrestler.scores || []).reduce((acc, score) => {
								const prefix = score.substring(0, 1).toLowerCase();
								if (prefix === "t" || prefix === "e" || prefix === "n" || prefix === "r") {
									acc[prefix] += 1;
								}
								return acc;
							}, { t: 0, e: 0, n: 0, r: 0 });

							return {
								name: wrestler.name,
								team: wrestler.team,
								isWinner: !!wrestler.isWinner,
								takedowns: scoreCounts.t,
								escapes: scoreCounts.e,
								nearfalls: scoreCounts.n,
								reversals: scoreCounts.r
							};
						})
					}
				})
			};

			output.data.fileName = fileName;
			output.status = 200;
		} catch (error) {
			console.log(JSON.stringify(error, null, 2))
			if (isGeminiQuotaError(error)) {
				output.status = 429;
				output.error = "AI quota for the day has been exceeded";
				return output;
			}
			if (isGeminiOverloadedError(error)) {
				output.status = 503;
				output.error = "AI service is temporarily overloaded. Please try again later.";
				return output;
			}
			output.status = 562;
			output.error = `Error analyzing image: ${error.message}`;
			return output;
		}

		updateProgress("LOOKUP_SCHOOL", "Searching school database for opponent...", 1);
		let schools = [],
			opponentSchool = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/school`);
			schools = clientResponse.body.schools;
			// First try to find the opponent school through basic string matching, ignoring case, whitespace, and non-alphanumeric characters
			opponentSchool = schools.find(school => school.name.toLowerCase().replace(/\s/g, "").replace(/[^a-z]/gi, "") == output.data.stats.opponent.toLowerCase().replace(/\s/g, "").replace(/[^a-z]/gi, ""));
		}
		catch (error) {
			output.status = 564;
			output.error = `Error loading school database: ${error.message}`;
			return output;
		}

		// If the opponent school isn't found through basic string matching, use the Gemini API to find the closest match based on the list of schools
		if (!opponentSchool) {
			try {
				updateProgress("LOOKUP_SCHOOL", "AI Step 2 of 3: Matching opponent school with Gemini...", 2);
				const prompt = `The opponent name "${ output.data.stats.opponent }" was not found in the database. 
					Based on the following list of schools, which school is the most likely match? 
					If there is no good match, return null. ${ schools.map(school => school.name).join(", ") }`;

				const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${config.geminiAPIKey}`;
				const headers = { "Content-Type": "application/json" };
				const data = {
					"contents": [
						{
							"parts": [
								{ "text": prompt }
							]
						}
					]
				};

				const response = await client.post(url).set(headers).send(data);
				const jsonResponse = response.body;

				let text = jsonResponse["candidates"][0]["content"]["parts"][0]["text"];
				text = text.replace(/["']/g, "").trim();

				opponentSchool = schools.find(school => school.name.toLowerCase() == text.toLowerCase());
			} catch (error) {
				if (isGeminiQuotaError(error)) {
					output.status = 429;
					output.error = "AI quota for the day has been exceeded";
					return output;
				}
				if (isGeminiOverloadedError(error)) {
					output.status = 503;
					output.error = "AI service is temporarily overloaded. Please try again later.";
					return output;
				}
				output.status = 565;
				output.error = `Error finding opponent school: ${error.message}`;
				return output;
			}
		}

		if (opponentSchool) {
			// Load the found school
			output.data.stats.opponent = opponentSchool.name;
			output.data.stats.opponentId = opponentSchool.id;

			updateProgress("LOAD_ROSTERS", "Loading wrestler team rosters for Fort Mill and opponent...", 2);
			let wrestlers = [];
			try {
				const wrestlersData = await getDualWrestlers(opponentSchool, serverPath);
				wrestlers = wrestlersData.fortMillWrestlers.concat(wrestlersData.opponentWrestlers);
			}
			catch (error) {
				output.status = 566;
				output.error = `Error loading wrestler team rosters: ${error.message}`;
				return output;
			}

			const ocrWrestlerNames = [];
			(output.data.stats.matches || []).forEach(match => {
				(match.wrestlers || []).forEach(wrestler => {
					if (wrestler.name && wrestler.name !== "Forfeit" && wrestler.name !== "FF") {
						ocrWrestlerNames.push(wrestler.name);
					}
				});
			});

			// Use the list of wrestlers to find potential matches for the wrestlers in the stats based on name matching
			const prompt = `Based on the following list of wrestlers, which wrestler is the most likely match for each wrestler in the stats data?
If there is no good match for a wrestler, return null for that wrestler. 
Wrestlers: ${ ocrWrestlerNames.join(", ") }
Wrestler Lookup Names: ${ wrestlers.map(wrestler => `${wrestler.name} (${ wrestler.id})`).join(", ") }
Return the matches as an array, [{ lookup: String, matchId: String }] where the lookup is the wrestler name from the wrestlers, and the matchId is the ID of the matched wrestler from the wrestler lookup names. If there is no good match, matchId should be null.`;

			try {
				updateProgress("GEMINI_MATCH_ROSTERS", "AI Step 3 of 3: Aligning wrestler names with database records...", 3);
				const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${config.geminiAPIKey}`;
				const headers = { "Content-Type": "application/json" };
				const data = {
					"contents": [
						{
							"parts": [
								{ "text": prompt }
							]
						}
					]
				};

				const response = await client.post(url).set(headers).send(data);
				const jsonResponse = response.body;

				let text = jsonResponse["candidates"][0]["content"]["parts"][0]["text"];
				text = text.replace("```json", "").replace("```", "");
				const wrestlerMatches = JSON.parse(text);
				
				output.data.stats.matches = output.data.stats.matches.map(match => {
					return {
						...match,
						wrestlers: (match.wrestlers || []).map(wrestler => {
							const nameMatch = wrestlerMatches.find(match => match.lookup.toLowerCase() === wrestler.name.toLowerCase());
							const dbWrestler = wrestlers.find(wrestler => nameMatch && wrestler.id == nameMatch.matchId);
							return {
								...wrestler,
								wrestlerId: dbWrestler ? dbWrestler.id : null,
								wrestlerSqlId: dbWrestler ? dbWrestler.wrestlerSqlId : null,
								name: dbWrestler ? dbWrestler.name : wrestler.name,
								rating: dbWrestler ? dbWrestler.rating : null,
								deviation: dbWrestler ? dbWrestler.deviation : null
							};
						})
					};
				});
			} catch (error) {
				if (isGeminiQuotaError(error)) {
					output.status = 429;
					output.error = "AI quota for the day has been exceeded";
					return output;
				}
				if (isGeminiOverloadedError(error)) {
					output.status = 503;
					output.error = "AI service is temporarily overloaded. Please try again later.";
					return output;
				}
				output.status = 568;
				output.error = `Error matching wrestlers: ${error.message}`;
				return output;
			}
		}

		updateProgress("FINALIZE_DATA", "Finalizing & loading whiteboard...", 3);
		return output;
	},
	
	dualSave: async (eventRecord, serverPath) => {
		const output = {};

		try {
			if (eventRecord && Array.isArray(eventRecord.matches)) {
				const wrestlerIds = eventRecord.matches
					.filter(match => match.wrestlers && match.wrestlers.length > 0)
					.flatMap(match => match.wrestlers.filter(wrestler => wrestler.wrestlerId).map(wrestler => wrestler.wrestlerId))

				if (wrestlerIds.length > 0) {
					const uniqueWrestlerIds = [...new Set(wrestlerIds)];
					const wrestlerResponse = await client.get(`${ serverPath }/data/wrestler?ids=${ JSON.stringify(uniqueWrestlerIds) }`);
					const dbWrestlers = (wrestlerResponse.body && wrestlerResponse.body.wrestlers) || [];

					const sqlIdMap = new Map();
					for (const dbWrestler of dbWrestlers) {
						const fetchedSqlId = dbWrestler.sqlId !== undefined ? dbWrestler.sqlId : dbWrestler.wrestlerSqlId;
						if (dbWrestler.id && fetchedSqlId !== undefined) {
							sqlIdMap.set(String(dbWrestler.id), fetchedSqlId);
						}
						if (dbWrestler._id && fetchedSqlId !== undefined) {
							sqlIdMap.set(String(dbWrestler._id), fetchedSqlId);
						}
					}

					for (const match of eventRecord.matches) {
						if (Array.isArray(match.wrestlers)) {
							for (const wrestler of match.wrestlers) {
								const wrestlerId = wrestler.wrestlerId || wrestler.id;
								if (wrestlerId && sqlIdMap.has(String(wrestlerId))) {
									const sqlId = sqlIdMap.get(String(wrestlerId));
									if (sqlId !== undefined && sqlId !== null) {
										wrestler.wrestlerSqlId = sqlId;
									}
								}
							}
						}
					}
				}
			}

			const clientResponse = await client.post(`${ serverPath }/data/event`).send({ event: eventRecord }).then();
			
			output.status = 200;
			output.data = { dualId: clientResponse.body.id };
			return output;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

	},

	dualDelete: async (targetId, serverPath) => {
		const output = {};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/event?id=${ targetId }`);
			const eventRecord = (clientResponse.body.events && clientResponse.body.events.length > 0) ? clientResponse.body.events[0] : null;
			
			if (eventRecord && eventRecord.imagePath) {
				const imageFilePath = path.join(process.cwd(), 'client', 'media', 'temp', eventRecord.imagePath);
				if (fs.existsSync(imageFilePath)) {
					await fs.promises.unlink(imageFilePath);
				}
			}
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			await client.delete(`${ serverPath }/data/event?id=${ targetId }`).then();
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		let teamEvent = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/teamevent?eventid=${ targetId }`).then();
			teamEvent = clientResponse.body.teamEvents[0];
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		if (teamEvent) {
			try {
				await client.delete(`${ serverPath }/data/teamevent?id=${ teamEvent.id }`).then();
			}
			catch (error) {
				output.status = 564;
				output.error = error.message;
				return output;
			}
		}

		output.status = 200;
		output.data = { status: "ok" }
		return output;
	},

	duplicatesLoad: async () => {
		const output = { data: {} };

		output.status = 200;
		return output;
	},

	duplicatesSearch: async (daysPast, serverPath) => {
		const output = { data: {} };

		let schools = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/school`);
			schools = clientResponse.body.schools;
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		let newWrestlers = [];
		try {
			const lastDays = new Date();
			lastDays.setDate(lastDays.getDate() - daysPast);
			console.log(`Loading wrestlers created since ${ lastDays.toISOString() } for duplicate check`);
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?createdsince=${ lastDays.toISOString() }`);
			newWrestlers = clientResponse.body.wrestlers;
			console.log(`Loaded ${ newWrestlers.length } new wrestlers for duplicate check`);
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		// Only look for duplicates for the schools
		let lookupWrestlers = newWrestlers;
		try {
			const schoolLookup = schools.flatMap(school => school.lookupNames.map(name => name.toLowerCase()));
			lookupWrestlers = newWrestlers.filter(wrestler => wrestler.events.some(event => schoolLookup.includes(event.searchTeam)));
			console.log(`Filtered to ${ lookupWrestlers.length } wrestlers with events matching school lookup names for duplicate check`);
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output; 
		}

		try {
			const wrestlersWithDuplicates = [];
			const batchSize = 5;
			
			console.log(`Starting duplicate check for ${lookupWrestlers.length} wrestlers in batches of ${batchSize}.`);
			for (let batchIndex = 0; batchIndex < lookupWrestlers.length; batchIndex += batchSize) {
				const batch = lookupWrestlers.slice(batchIndex, batchIndex + batchSize);
				
				const duplicateChecks = batch.map(wrestler => {
					const teams = wrestler.events.flatMap(event => event.searchTeam);
					return client.get(`${serverPath}/data/wrestler?initialsearch=${encodeURIComponent(wrestler.name)}&teams=${encodeURIComponent(JSON.stringify(teams))}`);
				});
				
				console.log(`Checking batch ${batchIndex / batchSize + 1}: Wrestlers ${batchIndex + 1} to ${Math.min(batchIndex + batchSize, lookupWrestlers.length)}`);
				const duplicateResponses = await Promise.all(duplicateChecks);
				console.log(`Duplicate check responses: ${ duplicateResponses.map((res, index) => `Wrestler: ${batch[index].name}, Duplicates Found: ${res.body.wrestlers.length - 1}`).join("; ") }`);
				
				const batchWithDuplicates = batch.map((wrestler, index) => {
						const potentialDuplicates = duplicateResponses[index]?.body?.wrestlers;
						return {
							id: wrestler.id,
							name: wrestler.name,
							teams: [...new Set(wrestler.events.flatMap(event => event.team))],
							events: wrestler.events.map(event => ({ name: event.name, team: event.team, date: event.date })),
							duplicates: potentialDuplicates?.filter(duplicate => duplicate.id !== wrestler.id)
									.map(duplicate => ({
										id: duplicate.id,
										name: duplicate.name,
										events: duplicate.events.map(event => ({ name: event.name, team: event.team, date: event.date })),
										teams: [...new Set(duplicate.events.flatMap(event => event.team))]
									})),
						}; 
					})
					.filter(wrestler => wrestler.duplicates && wrestler.duplicates.length > 0);
				wrestlersWithDuplicates.push(...batchWithDuplicates);
			}
			output.data.wrestlers = wrestlersWithDuplicates;
		}
		catch(error) {
			console.error("Error during batched duplicate check:", error);
			output.status = 564;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;		
	},

	duplicatesMerge: async (duplicateSets, serverPath) => {
		const output = { data: {} };

		const allIds = [... new Set(duplicateSets.flatMap(set => set))];
		console.log(`Merging ${ duplicateSets.length } sets of duplicates with a total of ${ allIds.length } wrestler records: ${ allIds.join(", ") }`);

		let wrestlersToMerge = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?ids=${ JSON.stringify(allIds) }`);
			wrestlersToMerge = clientResponse.body.wrestlers;
			console.log(`Loaded ${ wrestlersToMerge.length } wrestlers to merge from server`);
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			output.data.mergeResults = [];
			for (const set of duplicateSets) {
				const wrestlersInSet = wrestlersToMerge.filter(wrestler => set.includes(wrestler.id));
				output.data.mergeSet = wrestlersInSet;
				output.data.mergeResults.push(wrestlersInSet);
			}
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	eventDetailsLoad: async (serverPath, eventId) => {
		const output = { data: {} };
		try {
			const eventResponse = await client.get(`${ serverPath }/data/event?id=${ eventId }`);
			if (eventResponse.body.events && eventResponse.body.events.length > 0) {
				const event = eventResponse.body.events[0];
				
				// 4. Extract team names
				const teamNames = [...new Set(event.matches.flatMap(match => match.wrestlers.map(wrestler => wrestler.team)))]

				// 5. Query schools matching team names
				let familiarTeams = [];
				if (teamNames.length > 0) {
					try {
						const schoolResponse = await client.get(`${ serverPath }/data/school?names=${JSON.stringify(teamNames)}`);
						const schools = schoolResponse.body.schools || [];

						const schoolNamesSet = new Set();
						schools.forEach(school => {
							if (school.name) schoolNamesSet.add(school.name.toLowerCase().trim());
							if (school.lookupNames) {
								school.lookupNames.forEach(name => {
									if (name) schoolNamesSet.add(name.toLowerCase().trim());
								});
							}
						});

						familiarTeams = teamNames.filter(teamName => schoolNamesSet.has(teamName.toLowerCase().trim()));
					} catch (error) {
						console.error("API error fetching schools in eventDetailsLoad:", error);
					}
				}
				event.familiarTeams = familiarTeams;

				output.data.event = event;
				output.status = 200;
			} else {
				output.status = 404;
				output.error = "Event not found";
			}
		} catch (error) {
			output.status = 500;
			output.error = error.message;
		}
		return output;
	},

	scheduleSave: async (teamEvent, opponentName, serverPath) => {
		const output = {};

		// Extract unshifted date string YYYY-MM-DD
		let dateString = "";
		if (teamEvent.date) {
			const str = String(teamEvent.date).trim();
			const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
			if (match) {
				dateString = `${match[1]}-${match[2]}-${match[3]}`;
			} else {
				const dObj = new Date(teamEvent.date);
				const year = dObj.getUTCFullYear();
				const month = String(dObj.getUTCMonth() + 1).padStart(2, '0');
				const day = String(dObj.getUTCDate()).padStart(2, '0');
				dateString = `${year}-${month}-${day}`;
			}
		}

		let hours = "00";
		let minutes = "00";
		if (teamEvent.startTime) {
			const [time, modifier] = teamEvent.startTime.split(' ');
			let [h, m] = time.split(':');
			let hNum = parseInt(h, 10);
			if (modifier === 'PM' && hNum < 12) hNum += 12;
			if (modifier === 'AM' && hNum === 12) hNum = 0;
			hours = String(hNum).padStart(2, '0');
			minutes = String(m || "00").padStart(2, '0');
		}

		const combinedDateTime = dateString ? `${dateString}T${hours}:${minutes}:00.000Z` : null;
		if (combinedDateTime) {
			teamEvent.date = combinedDateTime;
		}

		// Orchestrate Dual creation if this is a new Dual teamEvent
		if (teamEvent.eventType === "Dual" && !teamEvent.id && !teamEvent.eventId) {
			try {
				const eventRecord = {
					sqlId: null,
					eventSystem: "WrestlingPortal",
					eventType: "Dual",
					name: teamEvent.name || "Fort Mill vs " + (opponentName || ""),
					date: combinedDateTime,
					location: teamEvent.location || null,
					state: "SC",
					matches: [],
					imagePath: null
				};
				const saveEventResponse = await client.post(`${ serverPath }/data/event`).send({ event: eventRecord });
				const newEventId = saveEventResponse.body?.id;

				if (!newEventId) {
					throw new Error("Failed to create event record");
				}

				teamEvent.eventId = newEventId;
			} catch (error) {
				output.status = 562;
				output.error = `Error orchestrating dual creation: ${error.message}`;
				return output;
			}
		}

		// Save the teamEvent record
		try {
			const saveResponse = await client.post(`${ serverPath }/data/teamevent`).send({ teamEvent: teamEvent });
			output.status = saveResponse.status;
			output.data = saveResponse.body;
		} catch (error) {
			output.status = 562;
			output.error = error.message;
		}
		return output;
	},

	teamEventDelete: async (recordId, serverPath) => {
		const output = {};
		try {
			const deleteResponse = await client.delete(`${ serverPath }/data/teamevent?id=${ recordId }`);
			output.status = deleteResponse.status;
			output.data = deleteResponse.body;
		} catch (error) {
			output.status = 562;
			output.error = error.message;
		}
		return output;
	},

	dualReportLoad: async (season, serverPath) => {
		const output = { data: { duals: [], seasonName: "", hasPreviousSeasonData: false } };
		try {
			let startYear;
			if (season && /^\d{2}-\d{2}$/.test(season)) {
				const startYearShort = parseInt(season.split("-")[0], 10);
				startYear = 2000 + startYearShort;
			} else {
				const today = new Date();
				const year = today.getFullYear();
				startYear = today.getMonth() >= 8 ? year : year - 1;
			}
			const endYear = startYear + 1;
			
			const startDate = `${startYear}-09-01`;
			const endDate = `${endYear}-08-31`;
			
			const seasonEventsResponse = await client.get(`${ serverPath }/data/event?eventType=Dual&startdate=${startDate}&enddate=${endDate}`);
			output.data.duals = seasonEventsResponse.body.events || [];
			
			const shortStart = startYear.toString().slice(-2);
			const shortEnd = endYear.toString().slice(-2);
			output.data.seasonName = `${shortStart}-${shortEnd}`;

			const prevSeasonStart = `${startYear - 1}-09-01`;
			const prevSeasonEnd = `${startYear}-08-31`;
			const prevSeasonResponse = await client.get(`${ serverPath }/data/event?eventType=Dual&startdate=${prevSeasonStart}&enddate=${prevSeasonEnd}`);
			const prevSeasonEvents = prevSeasonResponse.body.events || [];
			output.data.hasPreviousSeasonData = prevSeasonEvents.length > 0;
			
			output.status = 200;
		} catch (error) {
			output.status = 500;
			output.error = error.message;
		}
		return output;
	},

	parentEmailLoad: async (serverPath, statusFilter) => {
		const output = { data: { parentEmails: [] } };

		try {
			try {
				const existingCheckResponse = await client.get(`${serverPath}/data/parentemail`);
				if (!existingCheckResponse.body || !existingCheckResponse.body.parentEmails || existingCheckResponse.body.parentEmails.length === 0) {
					const csvFilePath = path.resolve(process.cwd(), "working", "Team Email.csv");
					if (fs.existsSync(csvFilePath)) {
						const csvTextContent = fs.readFileSync(csvFilePath, "utf8");

						const resultRows = [];
						let currentRowFields = [];
						let currentField = "";
						let isInsideQuotes = false;

						for (let characterIndex = 0; characterIndex < csvTextContent.length; characterIndex++) {
							const currentCharacter = csvTextContent[characterIndex];
							const nextCharacter = csvTextContent[characterIndex + 1];

							if (currentCharacter === '"') {
								if (isInsideQuotes && nextCharacter === '"') {
									currentField += '"';
									characterIndex++;
								} else {
									isInsideQuotes = !isInsideQuotes;
								}
							} else if (currentCharacter === ',' && !isInsideQuotes) {
								currentRowFields.push(currentField.trim());
								currentField = "";
							} else if ((currentCharacter === '\r' || currentCharacter === '\n') && !isInsideQuotes) {
								if (currentCharacter === '\r' && nextCharacter === '\n') {
									characterIndex++;
								}
								currentRowFields.push(currentField.trim());
								if (currentRowFields.some(fieldValue => fieldValue.length > 0)) {
									resultRows.push(currentRowFields);
								}
								currentRowFields = [];
								currentField = "";
							} else {
								currentField += currentCharacter;
							}
						}

						if (currentField.length > 0 || currentRowFields.length > 0) {
							currentRowFields.push(currentField.trim());
							if (currentRowFields.some(fieldValue => fieldValue.length > 0)) {
								resultRows.push(currentRowFields);
							}
						}

						if (resultRows.length > 1) {
							const headerRow = resultRows[0].map(headerName => headerName.trim().toLowerCase());
							const getColumnIndex = (columnName) => headerRow.findIndex(headerName => headerName.includes(columnName.toLowerCase()));

							const emailIndex = getColumnIndex("emails");
							const nameIndex = getColumnIndex("name");
							const wrestlersIndex = getColumnIndex("wrestlers");
							const coachIndex = getColumnIndex("coach");
							const varsityIndex = getColumnIndex("varsity");
							const jvIndex = getColumnIndex("jv");
							const middleIndex = getColumnIndex("middle");
							const gradeIndex = getColumnIndex("grade");

							const recordsToInsert = [];

							for (let rowIndex = 1; rowIndex < resultRows.length; rowIndex++) {
								const currentRow = resultRows[rowIndex];
								if (!currentRow || currentRow.length === 0) continue;

								const rawEmail = emailIndex !== -1 && currentRow[emailIndex] ? currentRow[emailIndex].trim() : "";
								const rawName = nameIndex !== -1 && currentRow[nameIndex] ? currentRow[nameIndex].trim() : "";

								if (!rawEmail && !rawName) continue;

								const isCoach = coachIndex !== -1 && (currentRow[coachIndex] || "").trim().toUpperCase() === "Y";

								const rawWrestlers = wrestlersIndex !== -1 ? (currentRow[wrestlersIndex] || "").trim() : "";
								const rawGrades = gradeIndex !== -1 ? (currentRow[gradeIndex] || "").trim() : "";

								const wrestlerNames = rawWrestlers ? rawWrestlers.split(/;|,/).map(wrestlerName => wrestlerName.trim()).filter(Boolean) : [];
								const gradeValues = rawGrades ? rawGrades.split(/;|,/).map(grade => grade.trim()).filter(Boolean) : [];

								const isVarsity = varsityIndex !== -1 && (currentRow[varsityIndex] || "").trim().toUpperCase() === "Y";
								const isJv = jvIndex !== -1 && (currentRow[jvIndex] || "").trim().toUpperCase() === "Y";
								const isMiddle = middleIndex !== -1 && (currentRow[middleIndex] || "").trim().toUpperCase() === "Y";

								const wrestlers = wrestlerNames.map((wrestlerName, wrestlerIndex) => {
									const assignedGrade = gradeValues[wrestlerIndex] || gradeValues[0] || "";
									return {
										name: wrestlerName,
										grade: assignedGrade,
										isVarsity: isVarsity,
										isJV: isJv,
										isMiddle: isMiddle
									};
								});

								recordsToInsert.push({
									email: rawEmail,
									name: rawName,
									isCoach: isCoach,
									status: "active",
									wrestlers: wrestlers
								});
							}

							if (recordsToInsert.length > 0) {
								await client.post(`${serverPath}/data/parentemail/bulk`).send({ records: recordsToInsert });
							}
						}
					}
				}
			}
			catch (seedError) {
				console.warn("Error seeding parent emails:", seedError.message);
			}

			let requestUrl = `${serverPath}/data/parentemail`;
			if (statusFilter && statusFilter !== "all") {
				requestUrl += `?status=${encodeURIComponent(statusFilter)}`;
			}

			const clientResponse = await client.get(requestUrl);
			output.data.parentEmails = clientResponse.body.parentEmails || [];
			output.status = 200;
		}
		catch (error) {
			output.status = 500;
			output.error = error.message;
		}

		return output;
	},

	parentEmailSave: async (saveRecord, serverPath) => {
		const output = {};

		try {
			const clientResponse = await client.post(`${serverPath}/data/parentemail`).send({ parentEmail: saveRecord });
			output.status = 200;
			output.data = clientResponse.body;
		}
		catch (error) {
			output.status = 500;
			output.error = error.message;
		}

		return output;
	},

	parentEmailBulkUpload: async (records, serverPath) => {
		const output = {};

		try {
			const clientResponse = await client.post(`${serverPath}/data/parentemail/bulk`).send({ records: records });
			output.status = 200;
			output.data = clientResponse.body;
		}
		catch (error) {
			output.status = 500;
			output.error = error.message;
		}

		return output;
	},

	parentEmailBulkStatus: async (recordIds, targetStatus, serverPath) => {
		const output = {};

		try {
			const clientResponse = await client.post(`${serverPath}/data/parentemail/status`).send({ ids: recordIds, status: targetStatus });
			output.status = 200;
			output.data = clientResponse.body;
		}
		catch (error) {
			output.status = 500;
			output.error = error.message;
		}

		return output;
	},

	parentEmailDelete: async (recordId, serverPath) => {
		const output = {};

		try {
			const clientResponse = await client.delete(`${serverPath}/data/parentemail?id=${recordId}`);
			output.status = 200;
			output.data = clientResponse.body;
		}
		catch (error) {
			output.status = 500;
			output.error = error.message;
		}

		return output;
	},

	authGoogle: async (request, response) => {
		const googleAuthorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
		const scopes = [
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/gmail.modify"
		];

		const rawHost = request.get("x-forwarded-host") || request.get("host") || "";
		const host = rawHost.split(":")[0];
		let protocol = request.get("x-forwarded-proto") || request.protocol || "https";
		if (host.includes("beynum.com")) {
			protocol = "https";
		}
		const constructedUri = `${protocol}://${rawHost}/api/aiemailgoogleauthcallback`;

		let redirectUri = constructedUri;
		if (config.google && config.google.redirect_uris && config.google.redirect_uris.length > 0) {
			const matched = config.google.redirect_uris.find(uri => uri === constructedUri);
			if (matched) {
				redirectUri = matched;
			} else {
				const matchedHost = config.google.redirect_uris.find(uri => uri.includes(host));
				redirectUri = matchedHost || config.google.redirect_uris[0];
			}
		}

		const query = {
			client_id: config.google.client_id,
			redirect_uri: redirectUri,
			response_type: "code",
			scope: scopes.join(" "),
			access_type: "offline",
			prompt: "consent",
			state: request.query.state || "vtp"
		};

		const queryString = new URLSearchParams(query).toString();
		const authorizationUrl = `${googleAuthorizationUrl}?${queryString}`;
		response.redirect(authorizationUrl);
	},

	authGoogleCallback: async (request, response) => {
		if (request.query.error) {
			return response.send(`
				<html>
					<body>
						<script>
							if (window.opener) {
								window.opener.postMessage({ error: "${request.query.error}" }, '*');
							}
							window.close();
						</script>
						<p>Authentication error: ${request.query.error}</p>
					</body>
				</html>
			`);
		}

		try {
			const authorizationCode = request.query.code;
			const rawHost = request.get("x-forwarded-host") || request.get("host") || "";
			const host = rawHost.split(":")[0];
			let protocol = request.get("x-forwarded-proto") || request.protocol || "https";
			if (host.includes("beynum.com")) {
				protocol = "https";
			}
			const constructedUri = `${protocol}://${rawHost}/api/aiemailgoogleauthcallback`;

			let redirectUri = constructedUri;
			if (config.google && config.google.redirect_uris && config.google.redirect_uris.length > 0) {
				const matched = config.google.redirect_uris.find(uri => uri === constructedUri);
				if (matched) {
					redirectUri = matched;
				} else {
					const matchedHost = config.google.redirect_uris.find(uri => uri.includes(host));
					redirectUri = matchedHost || config.google.redirect_uris[0];
				}
			}

			const tokenResponse = await client
				.post(config.google.token_uri)
				.send({
					code: authorizationCode,
					client_id: config.google.client_id,
					client_secret: config.google.client_secret,
					redirect_uri: redirectUri,
					grant_type: "authorization_code",
				});

			const accessToken = tokenResponse.body.access_token;
			const refreshToken = tokenResponse.body.refresh_token;
			const expiresIn = tokenResponse.body.expires_in;
			const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);

			const userProfileResponse = await client
				.get("https://www.googleapis.com/oauth2/v2/userinfo")
				.set("Authorization", `Bearer ${accessToken}`);

			const algorithm = 'aes-256-cbc';
			const keyString = config.sessionSecret || config.jwt || "fortmill_wrestling_session_secret_key_123456789";
			const key = crypto.createHash('sha256').update(keyString).digest();
			const iv = crypto.randomBytes(16);
			const cipher = crypto.createCipheriv(algorithm, key, iv);
			let encrypted = cipher.update(refreshToken || "");
			encrypted = Buffer.concat([encrypted, cipher.final()]);
			const encryptedRefreshToken = iv.toString('hex') + ':' + encrypted.toString('hex');

			const saveConfigRecord = {
				key: "googleAuth",
				value: {
					googleEmail: userProfileResponse.body?.email || "",
					googleName: userProfileResponse.body?.name || "",
					refreshToken: encryptedRefreshToken,
					refreshExpireDate: expirationDate,
					connectedAt: new Date()
				}
			};

			const serverPath = `${request.protocol}://${request.get("host")}`;
			await client.post(`${serverPath}/data/serverconfig`).send({ serverConfig: saveConfigRecord });

			const outputPayload = {
				success: true,
				googleEmail: userProfileResponse.body?.email,
				googleName: userProfileResponse.body?.name
			};

			response.send(`
				<html>
					<body>
						<script>
							if (window.opener) {
								window.opener.postMessage(${JSON.stringify(outputPayload)}, '*');
							}
							window.close();
						</script>
						<p>Authenticated successfully. You can close this window.</p>
					</body>
				</html>
			`);
		} catch (error) {
			response.send(`
				<html>
					<body>
						<script>
							if (window.opener) {
								window.opener.postMessage({ error: "${error.message}" }, '*');
							}
							window.close();
						</script>
						<p>An error occurred: ${error.message}</p>
					</body>
				</html>
			`);
		}
	},

	aiEmailGetStatus: async (serverPath) => {
		try {
			const configResponse = await client.get(`${serverPath}/data/serverconfig?key=googleAuth`);
			const serverConfigs = configResponse.body && configResponse.body.serverConfigs;
			if (serverConfigs && serverConfigs.length > 0 && serverConfigs[0].value && serverConfigs[0].value.refreshToken) {
				const configVal = serverConfigs[0].value;
				return {
					connected: true,
					googleEmail: configVal.googleEmail || "",
					googleName: configVal.googleName || "",
					connectedAt: configVal.connectedAt
				};
			}
			return { connected: false };
		} catch (error) {
			return { connected: false, error: error.message };
		}
	},

	aiEmailLoadInbox: async (serverPath) => {
		try {
			const configResponse = await client.get(`${serverPath}/data/serverconfig?key=googleAuth`);
			const serverConfigs = configResponse.body && configResponse.body.serverConfigs;
			if (!serverConfigs || serverConfigs.length === 0 || !serverConfigs[0].value || !serverConfigs[0].value.refreshToken) {
				return { error: "Google account not connected", status: 401 };
			}

			const googleAuthVal = serverConfigs[0].value;
			const algorithm = 'aes-256-cbc';
			const keyString = config.sessionSecret || config.jwt || "fortmill_wrestling_session_secret_key_123456789";
			const key = crypto.createHash('sha256').update(keyString).digest();
			const textParts = googleAuthVal.refreshToken.split(':');
			const iv = Buffer.from(textParts.shift(), 'hex');
			const encryptedBuffer = Buffer.from(textParts.join(':'), 'hex');
			const decipher = crypto.createDecipheriv(algorithm, key, iv);
			let decrypted = decipher.update(encryptedBuffer);
			decrypted = Buffer.concat([decrypted, decipher.final()]);
			const decryptedRefreshToken = decrypted.toString();

			const oAuth2Client = new google.auth.OAuth2(
				config.google.client_id,
				config.google.client_secret,
				config.google.redirect_uris[0]
			);
			oAuth2Client.setCredentials({ refresh_token: decryptedRefreshToken });

			const Gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
			const listResponse = await Gmail.users.messages.list({
				userId: 'me',
				q: 'label:INBOX'
			});

			if (!listResponse.data.messages || listResponse.data.messages.length === 0) {
				return { messages: [] };
			}

			const messages = [];
			for (const msgItem of listResponse.data.messages) {
				const emailResponse = await Gmail.users.messages.get({
					userId: 'me',
					id: msgItem.id,
					format: 'full'
				});

				const headers = emailResponse.data.payload?.headers || [];
				const subjectHeader = headers.find(header => header.name.toLowerCase() === 'subject');
				const fromHeader = headers.find(header => header.name.toLowerCase() === 'from');
				const dateHeader = headers.find(header => header.name.toLowerCase() === 'date');

				let body = '';
				if (emailResponse.data.payload.parts) {
					const part = emailResponse.data.payload.parts.find(part => part.mimeType === 'text/plain');
					if (part && part.body && part.body.data) {
						body = Buffer.from(part.body.data, 'base64').toString('utf-8');
					}
				} else if (emailResponse.data.payload.body && emailResponse.data.payload.body.data) {
					body = Buffer.from(emailResponse.data.payload.body.data, 'base64').toString('utf-8');
				}

				if (!body) {
					body = emailResponse.data.snippet || '';
				}

				messages.push({
					id: msgItem.id,
					threadId: msgItem.threadId,
					subject: subjectHeader ? subjectHeader.value : '(No Subject)',
					from: fromHeader ? fromHeader.value : 'Unknown Sender',
					date: dateHeader ? dateHeader.value : '',
					snippet: emailResponse.data.snippet || '',
					body: body
				});
			}

			return { messages: messages };
		} catch (error) {
			return { error: error.message, status: 500 };
		}
	},

	aiEmailGenerateResponse: async (emailSubject, emailBody, emailSender) => {
		const API_KEY = config.geminiAPIKey;
		if (!API_KEY) {
			return { error: "GEMINI_API_KEY not configured", status: 500 };
		}

		const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

		const prompt = `
You are a helpful team parent coordinator for the Fort Mill High School Wrestling Team. 
Your task is to review the following email received in our team inbox and draft a friendly, professional, clear, and informative response to be sent out to team parents or back to the sender.

Original Email Details:
From: ${emailSender || "Parent / Coach"}
Subject: ${emailSubject || "Team Update"}
Body:
---
${emailBody || "(No body text)"}
---

Instructions for response:
- Tone: Friendly, supportive, athletic, clear, and encouraging.
- Format: Plain text with clean formatting ready for email body. Start with a warm greeting like "Hi Team Parents,".
- Use clear bullet points if dates, times, gear, or locations are involved.
- Add relevant emojis to make it approachable.
- Do NOT include any un-filled placeholders like [Your Name] or [Insert Date].
- Keep the response clear, accurate, and directly aligned with the original message content.
`;

		const requestBody = { "contents": [{ "parts": [{ "text": prompt }] }] };

		try {
			const response = await client.post(url)
				.send(requestBody)
				.set('Content-Type', 'application/json');

			if (response.status === 200 && response.body.candidates && response.body.candidates[0].content.parts[0].text) {
				return { text: response.body.candidates[0].content.parts[0].text };
			} else {
				return { error: `Gemini API returned status ${response.status}`, status: 580 };
			}
		} catch (error) {
			return { error: error.message, status: 580 };
		}
	},

	aiEmailSendAndArchive: async (serverPath, messageId, recipientEmails, subject, bodyHtml) => {
		try {
			if (!messageId || !recipientEmails || recipientEmails.length === 0) {
				return { error: "Missing message ID or recipient emails", status: 400 };
			}

			const configResponse = await client.get(`${serverPath}/data/serverconfig?key=googleAuth`);
			const serverConfigs = configResponse.body && configResponse.body.serverConfigs;
			if (!serverConfigs || serverConfigs.length === 0 || !serverConfigs[0].value || !serverConfigs[0].value.refreshToken) {
				return { error: "Google account not connected", status: 401 };
			}

			const googleAuthVal = serverConfigs[0].value;
			const algorithm = 'aes-256-cbc';
			const keyString = config.sessionSecret || config.jwt || "fortmill_wrestling_session_secret_key_123456789";
			const key = crypto.createHash('sha256').update(keyString).digest();
			const textParts = googleAuthVal.refreshToken.split(':');
			const iv = Buffer.from(textParts.shift(), 'hex');
			const encryptedBuffer = Buffer.from(textParts.join(':'), 'hex');
			const decipher = crypto.createDecipheriv(algorithm, key, iv);
			let decrypted = decipher.update(encryptedBuffer);
			decrypted = Buffer.concat([decrypted, decipher.final()]);
			const decryptedRefreshToken = decrypted.toString();

			const oAuth2Client = new google.auth.OAuth2(
				config.google.client_id,
				config.google.client_secret,
				config.google.redirect_uris[0]
			);
			oAuth2Client.setCredentials({ refresh_token: decryptedRefreshToken });

			const Gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

			const boundary = `----=_Part_${Math.random().toString().slice(2)}`;
			const emailLines = [
				`Subject: ${subject || "Fort Mill Wrestling Update"}`,
				`Bcc: ${recipientEmails.join(',')}`,
				'MIME-Version: 1.0',
				`Content-Type: multipart/mixed; boundary="${boundary}"`,
				'',
				`--${boundary}`,
				'Content-Type: text/html; charset="UTF-8"',
				'Content-Transfer-Encoding: 7bit',
				'',
				bodyHtml,
				'',
				`--${boundary}--`
			];

			const rawEmail = emailLines.join('\r\n');
			const base64EncodedEmail = Buffer.from(rawEmail).toString('base64url');

			await Gmail.users.messages.send({
				userId: 'me',
				requestBody: {
					raw: base64EncodedEmail
				}
			});

			await Gmail.users.messages.modify({
				userId: 'me',
				id: messageId,
				requestBody: {
					removeLabelIds: ['INBOX']
				}
			});

			return { success: true, message: "Email sent and archived successfully" };
		} catch (error) {
			return { error: error.message, status: 500 };
		}
	},

	wrestlerEventBulkSave: async (wrestlerEvents, serverPath) => {
		const output = {
			data: {
				wrestlerEvents: []
			}
		};

		if (!wrestlerEvents || !Array.isArray(wrestlerEvents) || wrestlerEvents.length === 0) {
			output.status = 400;
			output.error = "Missing or empty wrestlerEvents array for bulk save";
			return output;
		}

		for (let wrestlerIndex = 0; wrestlerIndex < wrestlerEvents.length; wrestlerIndex++) {
			try {
				const clientResponse = await client.post(`${ serverPath }/data/wrestlerevent`).send({ wrestlerEvent: wrestlerEvents[wrestlerIndex] }).then();
				output.data.wrestlerEvents.push({ index: wrestlerIndex, id: clientResponse.body.id });
			}
			catch (error) {
				output.status = 560;
				output.data.wrestlerEvents.push({ index: wrestlerIndex, error: error.message });
			}
		}

		output.status = output.status || 200;
		return output;
	}

};
