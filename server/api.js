import client from "superagent";
import jwt from "jsonwebtoken";
import config from "./config.js";
import { google } from "googleapis";
import nodemailer from "nodemailer";

export default {

	setRequestVars: (protocol, host) => {
		return {
			serverPath: `${ protocol }://${ host }`,
			logUrl: `${ protocol }://beynum.com/sys/api/addlog`
		};
	},

	authInternal: (forwardedIP) => {
		return !forwardedIP || /10\.21\.0/g.test(forwardedIP) || /91\.193\.232/g.test(forwardedIP); // Is the request being forwared through a proxy, or is the proxy IP internal
	},

	authAPI: async (serverPath, referer, cookie) => {
		const output = {};
		
		const re = new RegExp(serverPath.substring(serverPath.lastIndexOf("/") + 1)); // Build the regex based on the shorter path to the server
		output.isValid = re.test(referer); // The referer is the full URL, so it should include the server path
		
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
				output.error = error.message
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
				output.error = error.message
				return output;
			}
		}
		
		output.status = 200;
		return output;
	},

	requestAccess: async (ipAddress, domain, userName, userEmail, userAgent, serverPath) => {
		const output = {},
			token = (Math.random() + 1).toString(36).substring(2,12),
			encryptedToken = jwt.sign({ token: token }, config.jwt),
			userRequest = {
				name: userName,
				email: userEmail,
				device: {
						token: token,
						ip: ipAddress,
						domain: domain,
						browser: userAgent
					}
				},
			email = {
					from: "\"The Wrestling Mill\" <thebeynumco@gmail.com>",
					to: config.email.user,
					subject: "Wrestling Mill Access Requested",
					html: `Access requested from:<br>${userName} (${userEmail})<br><br>Details<br>Domain: ${ domain }<br>IP: ${ ipAddress }<br>Browser:<br>${ JSON.stringify(userAgent).replace(/,/g, "<br>") }<br><br><a href="http://${ domain }">http://${ domain }</a>`
				};
			
		try {
			await client.post(`${ serverPath }/data/devicerequest`).send({ devicerequest: userRequest }).then();
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		try {
			const oauth = new google.auth.OAuth2(config.email.clientId, config.email.clientSecret, config.email.redirectURL);
			oauth.setCredentials({ refresh_token: config.email.refreshToken });
			const gmailToken = oauth.getAccessToken();
			
			const service = nodemailer.createTransport({
				service: "gmail",
				auth: {
					type: "OAuth2",
					user: config.email.user,
					clientId: config.email.clientId,
					clientSecret: config.email.clientSecret,
					refreshToken: config.email.refreshToken,
					accessToken: gmailToken
				}
			});

			const sendMailAsync = (email) => new Promise(resolve => service.sendMail(email, (error) => resolve(error)));
			const error = await sendMailAsync(email);
			service.close();
			
			if (error) {
				output.error = error.message;
			}
		}
		catch { }

		output.status = 200;
		output.cookie = encryptedToken;
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
				console.log(error);
				output.status = 563;
				output.error = error.message;
				return output;
			}
		}
	},

	scheduleLoad: async (serverPath, startDate, endDate) => {
		const output = {};
		let dateFilter = "";

		if (startDate && endDate) {
			dateFilter = `?startdate=${ startDate }&enddate=${ endDate }`;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/event${ dateFilter }`);

			output.data = { events: clientResponse.body.events };
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/floevent${ dateFilter }`);
			output.data.floEvents = clientResponse.body.floEvents;
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/trackevent${ dateFilter }`);
			output.data.trackEvents = clientResponse.body.trackEvents;
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		output.status = 200;		
		return output;
	},

	scheduleSave: async (body, serverPath) => {
		const output = {};

		if (!body) {
			output.status = 562;
			output.error = "Missing action";
			return output;
		}
		else if (body.save) {
			let saveId = null;

			try {
				const clientResponse = await client.post(`${ serverPath }/data/event`).send({ event: body.save }).then();
				saveId = clientResponse.body.id;
			}
			catch (error) {
				output.status = 561;
				output.error = error.message;
				return output;
			}

			try {
				const clientResponse = await client.get(`${ serverPath }/data/event?id=${ saveId }`).then();
				
				output.status = 200;
				output.data = { event: clientResponse.body.events[0] };
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
				await client.delete(`${ serverPath }/data/event?id=${ body.delete }`);

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
		else if (body.addFavorite) {
			let floEvent = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/floevent?id=${ body.addFavorite.floEventId }`).then();

				floEvent = clientResponse.body.floEvents[0];
				floEvent.isFavorite = true;
			}
			catch (error) {
				output.status = 561;
				output.error = error.message;
				return output;
			}

			try {
				await client.post(`${ serverPath }/data/floevent`).send({ floevent: floEvent }).then();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}
			
			output.status = 200;
			output.data = { floEvent: floEvent };
			return output;
		}
		else if (body.removeFavorite) {
			let floEvent = null;

			try {
				const clientResponse = await client.get(`${ serverPath }/data/floevent?id=${ body.removeFavorite.floEventId }`).then();

				floEvent = clientResponse.body.floEvents[0];
				floEvent.isFavorite = false;
			}
			catch (error) {
				output.status = 561;
				output.error = error.message;
				return output;
			}

			try {
				await client.post(`${ serverPath }/data/floevent`).send({ floevent: floEvent }).then();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}
			
			output.status = 200;
			output.data = { floEvent: floEvent };
			return output;
		}

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
				console.log(error);
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

	userSessionSave: async (user, session, serverPath) => {
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

			if (session.selectedDivision) {
				saveUser.session.selectedDivision = session.selectedDivision;
			}

			if (session.selectedOpponentId) {
				saveUser.session.selectedOpponentId = session.selectedOpponentId;
			}

			if (session.compare) {

				if (saveUser.session.compare && saveUser.session.compare.some(userSession => userSession.opponentId == session.compare.opponentId && userSession.division == session.compare.division)) {
					saveUser.session.compare = saveUser.session.compare.map(userSession =>
						userSession.opponentId == session.compare.opponentId && userSession.division == session.compare.division ? session.compare
							: userSession
						);
				}
				else {
					saveUser.session.compare = (saveUser.session.compare || []).concat(session.compare);
				}
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
		
		output.status = 200;
		output.data.status = "ok";
		return output;
	},

	teamWrestlersLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/team`);
			const teams = clientResponse.body.teams;

			output.data.team = teams.find(team => team.isMyTeam);
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	teamCompareLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		let floTeamIds = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/team`);
			const teams = clientResponse.body.teams;

			output.data.team = teams.find(team => team.isMyTeam);

			floTeamIds = (output.data.team.floTeams || []).map(floTeam => floTeam.id);
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/scmatteam`);
			output.data.team.scmatTeams = clientResponse.body.scmatTeams.filter(scmatTeam => output.data.team.scmatTeams.some(linkedTeams => linkedTeams.id == scmatTeam.id));
			output.data.scmatTeams = clientResponse.body.scmatTeams.filter(scmatTeam => !output.data.team.scmatTeams.some(linkedTeams => linkedTeams.id == scmatTeam.id))
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		if (floTeamIds.length > 0) {
			try {
				const clientResponse = await client.get(`${ serverPath }/data/externalteam?ids=${ JSON.stringify(floTeamIds) }`);
				output.data.team.floTeams = clientResponse.body.externalTeams;
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}
		}

		output.status = 200;
		return output;
	},

	teamGetOpponentWrestlers: async (opponentId, serverPath) => {
		const output = { data: {} };

		let scmatTeam = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/scmatteam?id=${ opponentId }`);
			scmatTeam = clientResponse.body.scmatTeams[0];
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		let floWrestlerIds = [];
		let floTeams = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/externalteam?name=${ scmatTeam.name }`);
			floTeams = clientResponse.body.externalTeams;
			floWrestlerIds = floTeams.flatMap(team => team.wrestlers.map(wrestler => wrestler.id));
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		let externalWrestlers = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/externalwrestler${ floTeams && floTeams.length > 0 ? "?externalteamid=" + floTeams[0].id : "" }`);
			externalWrestlers = clientResponse.body.externalWrestlers.filter(wrestler => floWrestlerIds.includes(wrestler.id));
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		try {
			output.data.wrestlers = externalWrestlers.map(wrestler => {
				const lastTeamEvent = wrestler.events
					.filter(event => event.team == scmatTeam.name)
					.sort((eventA, eventB) => +(new Date(eventB.date)) - +(new Date(eventA.date)))
					.map(event => ({ 
						division: event.matches ? 
							/^(hs|high school)$/i.test(event.matches[0].division) ? "Varsity"
							: event.matches[0].division
						: null, 
						weightClass: event.matches ? event.matches[0].weightClass : null 
					}))
					.find(() => true);
				
				const weightClasses = [...new Set(wrestler.events.filter(event => event.team == scmatTeam.name).flatMap(event => event.matches.map(match => match.weightClass)))]
					.map(weightClass => {
						const lastMatch = wrestler.events.flatMap(event => event.matches.map(match => ({ 
								weightClass: match.weightClass, 
								division: /^(hs|high school)$/i.test(match.division) ? "Varsity"
									: match.division.trim(), 
								date: new Date(event.date), 
								event: event.name 
							})))
							.filter(match => match.weightClass == weightClass)
							.sort((matchA, matchB) => +matchB.date - +matchA.date)
							.find(() => true);
						
						return {
							weightClass: weightClass,
							division: lastMatch.division,
							lastDate: lastMatch.date,
							lastEvent: lastMatch.event
						};
					});

				return {
					id: wrestler.id,
					name: wrestler.name,
					division: lastTeamEvent ? lastTeamEvent.division : null,
					weightClass: lastTeamEvent ? lastTeamEvent.weightClass : null,
					weightClasses: weightClasses
				};
			});
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	teamGetSCMatCompare: async (teamId, opponentId, serverPath) => {
		const output = { data: {} };

		let scmatTeams = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/scmatteam`);
			scmatTeams = clientResponse.body.scmatTeams;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			output.data.team = scmatTeams.find(scmatTeam => scmatTeam.id == teamId);
			output.data.opponent = scmatTeams.find(scmatTeam => scmatTeam.id == opponentId);

			const rankings = scmatTeams.flatMap(team =>
				team.wrestlers.flatMap(wrestler => 
					wrestler.rankings.flatMap(ranking => ({
						date: +(new Date(ranking.date)),
						weightClass: ranking.weightClass
						}))
					)
				);
			
			output.data.weightClasses = [...new Set(rankings.map(ranking => ranking.date))]
				.map(rankDate => ({
					date: new Date(rankDate),
					weightClasses: [...new Set(
						rankings
						.filter(ranking => ranking.date == rankDate)
						.map(ranking => ranking.weightClass)
						)]
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

	teamWrestlersSave: async (savePacket, serverPath) => {
		const output = { data: {} };

		if (savePacket.saveWrestlers) {
			let team = null
			try {
				const clientResponse = await client.get(`${ serverPath }/data/team?id=${ savePacket.teamId }`).then();
				team = clientResponse.body.teams[0];
			}
			catch (error) {
				output.status = 571;
				output.error = error.message;
				return output;
			}
			
			try {
				team.wrestlers = savePacket.saveWrestlers;
			}
			catch (error) {
				output.status = 572;
				output.error = error.message;
				return output;
			}

			try {
				await client.post(`${ serverPath }/data/team`).send({ team: team }).then();
			}
			catch (error) {
				output.status = 573;
				output.error = error.message;
				return output;
			}
			
			output.status = 200;
			output.data = { team: team };
			return output;
		}
	},

	externalWrestlerDetails: async (wrestlerId, homeTeam, serverPath) => {
		const output = { data: {} };

		let wrestler = null;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/externalwrestler?id=${ wrestlerId }`);
			wrestler = clientResponse.body.externalWrestlers[0];
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		try {
			
			const lastEvent = wrestler.events
				.map(event => ({ 
					division: event.matches ? 
						/^(hs|high school)$/i.test(event.matches[0].division) ? "Varsity"
						: event.matches[0].division
					: null, 
					date: new Date(event.date),
					weightClass: event.matches ? event.matches[0].weightClass : null 
				}))
				.sort((eventA, eventB) => 
					!isNaN(eventA.weightClass) && isNaN(eventB.weightClass) ? -1
					: isNaN(eventA.weightClass) && !isNaN(eventB.weightClass) ? 1
					: +eventB.date - +eventA.date
				)
				.find(() => true);
		
			const weightClasses = [...new Set(wrestler.events.flatMap(event => event.matches.map(match => match.weightClass)))]
				.map(weightClass => {
					const lastMatch = wrestler.events.flatMap(event => event.matches.map(match => ({ 
							weightClass: match.weightClass, 
							division: /^(hs|high school)$/i.test(match.division) ? "Varsity"
								: match.division.trim(), 
							date: new Date(event.date), 
							event: event.name 
						})))
						.filter(match => match.weightClass == weightClass)
						.sort((matchA, matchB) => +matchB.date - +matchA.date)
						.find(() => true);
					
					return {
						weightClass: weightClass,
						division: lastMatch.division,
						lastDate: lastMatch.date,
						lastEvent: lastMatch.event
					};
				});

			wrestler = {
				...wrestler,
				name: wrestler.name ? wrestler.name : wrestler.firstName + " " + wrestler.lastName,
				division: lastEvent ? lastEvent.division : null,
				weightClass: lastEvent ? lastEvent.weightClass : null,
				weightClasses: weightClasses,
				events: wrestler.events.map(event => ({
					...event,
					division: event.matches[0]?.division || "",
					weightClass: event.matches[0]?.weightClass || "",
					matches: event.matches.map(({ division, weightClass, ...match}) => match)
				}))
			};

			output.data.wrestler = wrestler;
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		if (homeTeam) {
			try {
				const clientResponse = await client.get(`${ serverPath }/data/externalwrestlerchainget?wrestlerid=${ output.data.wrestler.sqlId }&team=${ homeTeam }`);
				output.data.wrestler.tree = clientResponse.body.wrestler?.tree;
			}
			catch (error) {
				output.error = error.message;
			}
		}

		output.status = 200;
		return output;
	},

	externalWrestlersBulk: async (serverPath) => {
		const output = { data: {} };

		try {
			const clientResponse = await client.get(`${ serverPath }/data/externalwrestler`);
			output.data.externalWrestlers = clientResponse.body.externalWrestlers;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	externalWrestlersBulkSave : async (externalWrestlers, serverPath) => {
		const output = { 
			data: {
				externalWrestlers: [],
				externalTeams: []
			}
		};

		for (let wrestlerIndex = 0; wrestlerIndex < externalWrestlers.length; wrestlerIndex++) {
			// Save each wrestler
			try {
				const clientResponse = await client.post(`${ serverPath }/data/externalwrestler`).send({ externalwrestler: externalWrestlers[wrestlerIndex] }).then();
				output.data.externalWrestlers.push({ index: wrestlerIndex, id: clientResponse.body.id });
				externalWrestlers[wrestlerIndex].id = clientResponse.body.id;
			}
			catch (error) {
				output.data.externalWrestlers.push({ index: wrestlerIndex, error: error.message });
			}
		}

		if (output.data.externalWrestlers.some(response => response.error )) {
			output.status = 561;
			return output;
		}

		let teams = null;
		try {
			// Build the distinct list of teams
			teams = [...new Set( externalWrestlers.flatMap(wrestler => wrestler.events.map(event => event.team)) )];
		}
		catch (error) {
			output.status = 565;
			output.error = error.message;
			return output;
		}

		let events = null;
		try {
			// Get a flat list of events
			const allEvents = externalWrestlers.flatMap(wrestler => wrestler.events);
			
			events = [...new Set(allEvents.map(event => event.sqlId))]
				.map(eventId => allEvents.filter(event => event.sqlId == eventId)
					.map(event => ({
						sqlId: event.sqlId,
						name: event.name,
						date: event.date,
						team: event.team,
					})) // Build an array of teams for the event to lookup the event by team
					.reduce((output, event) =>
						output.teams.includes(event.team) ? output
							: {...event, teams: output.teams.concat(event.team) }
					, { teams: [] })
				);
		}
		catch (error) {
			output.status = 567;
			output.error = error.message;
			return output;
		}

		// Loop through all the teams that had a wrestler added
		for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
			let team = null;
			try {
				// Get the team from the database
				const clientResponse = await client.get(`${ serverPath }/data/externalteam?exactname=${ teams[teamIndex] }`);
				
				if (clientResponse.body.externalTeams.length == 1) {
					team = clientResponse.body.externalTeams[0];
				}
				else {
					// if the team doesn't exist, we'll create it
					team = {
						name: teams[teamIndex],
						events: [],
						wrestlers: []
					};
				}
			}
			catch (error) {
				output.status = 563;
				output.data.externalTeams.push({ index: teamIndex, error: error.message });
			}

			try {
				// Get all the wrestlers that have this team, and are not already in the list for the team
				team.wrestlers = team.wrestlers.concat(externalWrestlers
					.filter(wrestler => 
						wrestler.events.some(event => event.team == team.name) &&
						!team.wrestlers.some(teamWrestler => teamWrestler.sqlId == wrestler.sqlId)
					)
					.map(wrestler => ({ id: wrestler.id, sqlId: wrestler.sqlId, name: wrestler.name }))
				);
			}
			catch (error) {
				output.status = 564;
				output.data.externalTeams.push({ index: teamIndex, error: error.message });
			}
			
			try {
				// Add the events to the team
				team.events = team.events.concat(events
					.filter(event => 
						event.teams.includes(team.name) &&
						!team.events.some(teamEvent => event.sqlId == teamEvent.sqlId)
					)
					.map(event => ({ sqlId: event.sqlId, name: event.name, date: event.date }))
				);
			}
			catch (error) {
				output.status = 566;
				output.data.externalTeams.push({ index: teamIndex, error: error.message });
			}

			// Save the team
			try {
				const clientResponse = await client.post(`${ serverPath }/data/externalteam`).send({ externalteam: team }).then();
				output.data.externalTeams.push({ index: teamIndex, id: clientResponse.body.id });
			}
			catch (error) {
				output.status = 568;
				output.data.externalTeams.push({ index: teamIndex, error: error.message });
			}
		}

		output.status = output.status ? output.status : 200;
		return output;
	},

	floEventLoad: async (floId, serverPath) => {
		const output = { data: {} };

		try {
			const clientResponse = await client.get(`${ serverPath }/data/floevent?id=${ floId }`);
			output.data.floEvent = clientResponse.body.floEvents[0]
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	floEventFavorites: async (serverPath) => {
		const output = { data: {} };

		try {
			const clientResponse = await client.get(`${ serverPath }/data/floevent`);
			output.data.floEvents = clientResponse.body.floEvents.filter(event => event.isFavorite);
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	floEventSave: async (floEvent, serverPath) => {
		const output = {};

		if (floEvent.sqlId) {
			const updates = [];

			try {
				const clientResponse = await client.get(`${ serverPath }/data/floevent?sqlid=${ floEvent.sqlId }`);
				
				if (clientResponse.body.floEvents && clientResponse.body.floEvents.length === 1) {
					const prevEvent = clientResponse.body.floEvents[0];
					floEvent.id = prevEvent.id;

					if (floEvent.divisions) {
						const prevMatches = prevEvent.divisions ? prevEvent
							.divisions.flatMap(division => 
								division.weightClasses.flatMap(weight => 
									weight.pools.flatMap(pool =>
										pool.matches.map(match =>
											({...match, division: division.name, weightClass: weight.name })
										))))
							: [];
						
						
						// Loop through each layer of the event to build updates and generate complete time
						floEvent.divisions = floEvent.divisions.map(updateDivision => ({
							...updateDivision,
							weightClasses: updateDivision.weightClasses.map(updateWeight => ({
								...updateWeight,
								pools: updateWeight.pools.map(updatePool => ({
									...updatePool,
									matches: updatePool.matches.map(match => {

										const prevMatch = prevMatches.find(prev => prev.guid == match.guid),
											matchNumber = match.matchNumber ? ` ${ match.matchNumber}` : "",
											topWrestler = match.topWrestler ? `${ match.topWrestler.name } (${ match.topWrestler.team })` : "",
											bottomWrestler = match.bottomWrestler ? `${ match.bottomWrestler.name } (${ match.bottomWrestler.team })` : "";
		
										if (!prevMatch && match.topWrestler && match.bottomWrestler) {
											// New Match
											updates.push({ 
												division: updateDivision.name,
												weightClass: updateWeight.name,
												round: match.round,
												teams: [
													...(match.topWrestler ? [match.topWrestler.team] : []),
													...(match.bottomWrestler ? [match.bottomWrestler.team] : [])
												],
												updateType: "New Match",
												message: `Match${ matchNumber}: ${ topWrestler } vs ${ bottomWrestler }`
											});
										}
		
										if (match.topWrestler && (!prevMatch || !prevMatch.topWrestler)) {
											// Top wrestler assigned
											updates.push({
												division: updateDivision.name,
												weightClass: updateWeight.name,
												round: match.round,
												teams: [
													...(match.topWrestler ? [match.topWrestler.team] : [])
												],
												updateType: "Wrestler Assignment",
												message: `${ topWrestler } assigned to match${ matchNumber } ${ match.round || "" }`
											});
										}
		
										if (match.bottomWrestler && (!prevMatch || !prevMatch.bottomWrestler)) {
											// Bottom wrestler assigned
											updates.push({
												division: updateDivision.name,
												weightClass: updateWeight.name,
												round: match.round,
												teams: [
													...(match.bottomWrestler ? [match.bottomWrestler.team] : [])
												],
												updateType: "Wrestler Assignment",
												message: `${ bottomWrestler } assigned to match${ matchNumber } ${ match.round || "" }`
											});
										}
		
										if (match.mat && match.topWrestler && match.bottomWrestler && (!prevMatch || !prevMatch.mat)) {
											// Mat assigned
											updates.push({
												division: updateDivision.name,
												weightClass: updateWeight.name,
												round: match.round,
												teams: [
													...(match.topWrestler ? [match.topWrestler.team] : []),
													...(match.bottomWrestler ? [match.bottomWrestler.team] : [])
												],
												updateType: "Mat Assignment",
												message: `${ match.mat }: match${ matchNumber } - ${ topWrestler } vs ${ bottomWrestler }`
											});
										}
		
										if (match.winType && match.topWrestler && match.bottomWrestler && (!prevMatch || !prevMatch.winType)) {
											// Match Completed
											const winner = match.topWrestler.isWinner ? topWrestler : bottomWrestler,
												loser = match.topWrestler.isWinner ? bottomWrestler : topWrestler;
		
											updates.push({ 
												division: updateDivision.name,
												weightClass: updateWeight.name,
												round: match.round,
												teams: [
													...(match.topWrestler ? [match.topWrestler.team] : []),
													...(match.bottomWrestler ? [match.bottomWrestler.team] : [])
												],
												updateType: "Match Completed",
												message: `${ winner } beat ${ loser } by ${ match.winType }`
											});
										}
	
										return {
											...match,
											completeTime: match.winType && match.topWrestler && match.bottomWrestler && (!prevMatch || !prevMatch.winType) ? new Date()
												: prevMatch && prevMatch.completeTime ? prevMatch.completeTime
												: null
										};
									})
								}))
							}))
						}));
						
						if (updates.length > 0 && updates.length < 200) {
							// Don't log too many updates
							floEvent.updates = (prevEvent.updates || [])
								.slice(0, 100)
								.concat({ dateTime: new Date(), updates: updates });
						}
					}
				}
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}
		}
		
		try {
			const clientResponse = await client.post(`${ serverPath }/data/floevent`).send({ floevent: floEvent }).then();

			output.status = 200;
			output.data = { id: clientResponse.body.id };
			return output;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

	},

	trackEventSave: async (trackEvent, serverPath) => {
		const output = {};

		if (trackEvent.sqlId) {
			try {
				const clientResponse = await client.get(`${ serverPath }/data/trackevent?sqlid=${ trackEvent.sqlId }`);
				
				if (clientResponse.body.trackEvents && clientResponse.body.trackEvents.length === 1) {
					trackEvent.id = clientResponse.body.trackEvents[0].id;
				}
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}
		}
		
		try {
			const clientResponse = await client.post(`${ serverPath }/data/trackevent`).send({ trackevent: trackEvent }).then();

			output.status = 200;
			output.data = { id: clientResponse.body.id };
			return output;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
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

	floMatchGetBulk: async (serverPath) => {
		const output = { data: {} };

		try {
			const clientResponse = await client.get(`${ serverPath }/data/flomatch`);
			output.data.floMatches = clientResponse.body.floMatches;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	floMatchSaveBulk: async (matchesSave, serverPath) => {
		const output = { data: { floMatches: [] } };

		for (let matchIndex = 0; matchIndex < matchesSave.length; matchIndex++) {

			try {
				const clientResponse = await client.post(`${ serverPath }/data/flomatch`).send({ flomatch: matchesSave[matchIndex] }).then();
				output.data.floMatches.push({ index: matchIndex, id: clientResponse.body.id });
			}
			catch (error) {
				output.status = 562
				output.data.floMatches.push({ index: matchIndex, error: error.message });
			}

		}

		output.status = output.status || 200;
		return output;
	}

};
