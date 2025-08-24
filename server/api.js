import client from "superagent";
import jwt from "jsonwebtoken";
import config from "./config.js";
import { google } from "googleapis";
import nodemailer from "nodemailer";

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

		// try {
		// 	const oauth = new google.auth.OAuth2(config.email.clientId, config.email.clientSecret, config.email.redirectURL);
		// 	oauth.setCredentials({ refresh_token: config.email.refreshToken });
		// 	const gmailToken = oauth.getAccessToken();
			
		// 	const service = nodemailer.createTransport({
		// 		service: "gmail",
		// 		auth: {
		// 			type: "OAuth2",
		// 			user: config.email.user,
		// 			clientId: config.email.clientId,
		// 			clientSecret: config.email.clientSecret,
		// 			refreshToken: config.email.refreshToken,
		// 			accessToken: gmailToken
		// 		}
		// 	});

		// 	const sendMailAsync = (email) => new Promise(resolve => service.sendMail(email, (error) => resolve(error)));
		// 	const error = await sendMailAsync(email);
		// 	service.close();
			
		// 	if (error) {
		// 		output.error = error.message;
		// 	}
		// }
		// catch { }

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
				output.status = 563;
				output.error = error.message;
				return output;
			}
		}
	},

	scheduleLoad: async (serverPath, startDate, endDate) => {
		const output = { data: {} };
		let dateFilter = "";

		if (startDate && endDate) {
			dateFilter = `?startdate=${ startDate }&enddate=${ endDate }`;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/event${ dateFilter }`);
			output.data.events = clientResponse.body.events;
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

			if (session.opponents) {
				saveUser.session.opponents = session.opponents;
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

	myTeamLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		let wrestlers = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=fort mill`);
			wrestlers = clientResponse.body.wrestlers;
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		try {
			output.data.wrestlers = wrestlers.map(wrestler => {
				const lastTeamDivision = wrestler.events
					.filter(event => /^fort mill$/gi.test(event.team))
					.flatMap(event => event.matches.map(match => ({ date: new Date(event.date), division: match.division })))
					.filter(match => /(hs|high school|hs girls|jv|junior varsity|ms|middle school)/i.test(match.division))
					.sort((matchA, matchB) => +matchB.date - +matchA.date)
					.map(match => /(hs|high school|hs girls)/i.test(match.division) ? "Varsity"
							: /(jv|junior varsity)/i.test(match.division) ? "JV"
							: /(ms|middle school)/i.test(match.division) ? "MS"
							: (match.division || "").trim()
					)
					.find(() => true);
				
				const lastTeamWeight = wrestler.events
					.filter(event => event.matches.some(match => match.weightClass && !isNaN(match.weightClass)))
					.sort((eventA, eventB) => +(new Date(eventB.date)) - +(new Date(eventA.date)))
					.map(event => event.matches[0].weightClass)
					.find(() => true);

				const lastEvent = wrestler.events.map(event => ({
						event: event.name,
						date: new Date(event.date),
						division: event.matches ? 
							/(hs|high school|hs girls)/i.test(event.matches[0].division) ? "Varsity"
							: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
							: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
							: (event.matches[0].division || "").trim()
						: null, 
						weightClass: event.matches ? event.matches[0].weightClass : null
					}))
					.sort((eventA, eventB) => +eventB.date - +eventA.date)
					.find(() => true);
				
				const weightClasses = [...new Set(wrestler.events.filter(event => /^fort mill$/gi.test(event.team)).flatMap(event => event.matches.map(match => match.weightClass)))]
					.map(weightClass => {
						const lastMatch = wrestler.events.flatMap(event => event.matches.map(match => ({ 
								weightClass: match.weightClass, 
								division: /(hs|high school|hs girls)/i.test(event.matches[0].division) ? "Varsity"
									: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
									: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
									: (event.matches[0].division || "").trim(), 
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
					division: lastTeamDivision,
					weightClass: lastTeamWeight,
					weightClasses: weightClasses,
					rating: wrestler.rating,
					deviation: wrestler.deviation,
					lastEvent: lastEvent,
					wins: wrestler.events
						.filter(event => +Date.now() - (new Date(event.date)) < 1000 * 60 * 60 * 24 * 365)
						.reduce((sum, event) => sum + event.matches.filter(match => match.isWinner).length, 0),
					losses: wrestler.events
						.filter(event => +Date.now() - (new Date(event.date)) < 1000 * 60 * 60 * 24 * 365)
						.reduce((sum, event) => sum + event.matches.filter(match => !match.isWinner).length, 0)
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

	myTeamSaveWrestler: async (user, session, serverPath) => {
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

			saveUser.session.team = session.team;
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

		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=fort mill`);
			
			output.data.team = { 
				wrestlers: clientResponse.body.wrestlers.map(wrestler => {

				const lastTeamEvent = wrestler.events
					.filter(event => /^fort mill$/gi.test(event.team))
					.map(event => ({
						event: event.name,
						date: new Date(event.date),
						division: event.matches ? 
							/(hs|high school|hs girls)/i.test(event.matches[0].division) ? "Varsity"
							: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
							: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
							: (event.matches[0].division || "").trim()
						: (match.division || "").trim(), 
						weightClass: event.matches ? event.matches[0].weightClass : null
					}))
					.sort((eventA, eventB) => +eventB.date - +eventA.date)
					.find(() => true);
				
				return {
					id: wrestler.id,
					name: wrestler.name,
					lastEvent: lastTeamEvent,
					division: lastTeamEvent.division,
					weightClass: lastTeamEvent.weightClass,
					rating: wrestler.rating,
					deviation: wrestler.deviation
				}
				})
			};
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/scmatteam`);
			output.data.team.scmatTeams = clientResponse.body.scmatTeams.filter(scmatTeam => /^fort mill$/gi.test(scmatTeam.name));
			output.data.scmatTeams = clientResponse.body.scmatTeams.filter(scmatTeam => !/^fort mill$/gi.test(scmatTeam.name))
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
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

		let wrestlers = [];
		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=${ scmatTeam.name }`);
			wrestlers = clientResponse.body.wrestlers;
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		try {
			output.data.wrestlers = wrestlers.map(wrestler => {
				const lastTeamDivision = wrestler.events
					.filter(event => event.team == scmatTeam.name)
					.flatMap(event => event.matches.map(match => ({ date: new Date(event.date), division: match.division })))
					.filter(match => /(hs|high school|hs girls|jv|junior varsity|ms|middle school)/i.test(match.division))
					.sort((matchA, matchB) => +matchB.date - +matchA.date)
					.map(match => /(hs|high school|hs girls)/i.test(match.division) ? "Varsity"
							: /(jv|junior varsity)/i.test(match.division) ? "JV"
							: /(ms|middle school)/i.test(match.division) ? "MS"
							: (match.division || "").trim()
					)
					.find(() => true);
				
				const lastTeamWeight = wrestler.events
					.filter(event => event.matches.some(match => match.weightClass && !isNaN(match.weightClass)))
					.sort((eventA, eventB) => +(new Date(eventB.date)) - +(new Date(eventA.date)))
					.map(event => event.matches[0].weightClass)
					.find(() => true);

				const lastEvent = wrestler.events.map(event => ({
						event: event.name,
						date: new Date(event.date),
						division: event.matches ? 
							/(hs|high school|hs girls)/i.test(event.matches[0].division) ? "Varsity"
							: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
							: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
							: (event.matches[0].division || "").trim()
						: null, 
						weightClass: event.matches ? event.matches[0].weightClass : null
					}))
					.sort((eventA, eventB) => +eventB.date - +eventA.date)
					.find(() => true);
				
				const weightClasses = [...new Set(wrestler.events.filter(event => event.team == scmatTeam.name).flatMap(event => event.matches.map(match => match.weightClass)))]
					.map(weightClass => {
						const lastMatch = wrestler.events.flatMap(event => event.matches.map(match => ({ 
								weightClass: match.weightClass, 
								division: /(hs|high school|hs girls)/i.test(event.matches[0].division) ? "Varsity"
									: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
									: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
									: (event.matches[0].division || "").trim(), 
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
					division: lastTeamDivision,
					weightClass: lastTeamWeight,
					weightClasses: weightClasses,
					rating: wrestler.rating,
					deviation: wrestler.deviation,
					lastEvent: lastEvent,
					wins: wrestler.events
						.filter(event => +Date.now() - (new Date(event.date)) < 1000 * 60 * 60 * 24 * 365)
						.reduce((sum, event) => sum + event.matches.filter(match => match.isWinner).length, 0),
					losses: wrestler.events
						.filter(event => +Date.now() - (new Date(event.date)) < 1000 * 60 * 60 * 24 * 365)
						.reduce((sum, event) => sum + event.matches.filter(match => !match.isWinner).length, 0)
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

		let opponentIdXref = [];
		try {
			const opponentSqlIds = [...new Set(wrestler.events.flatMap(event => event.matches.map(match => match.vsSqlId )))];
			const clientResponse = await client.get(`${ serverPath }/data/externalwrestler?sqlids=${ JSON.stringify(opponentSqlIds) }&select=sqlId`);
			opponentIdXref = clientResponse.body.externalWrestlers;
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}
		
		try {
			
			wrestler = {
				...wrestler,
				name: wrestler.name ? wrestler.name : wrestler.firstName + " " + wrestler.lastName,
				events: wrestler.events.map(event => ({
					...event,
					division: event.matches[0] ?
						/(hs|high school|high)/i.test(event.matches[0].division) ? "Varsity"
						: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
						: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
						: (event.matches[0].division || "").trim()
						: "",
					weightClass: event.matches[0]?.weightClass || "",
					matches: event.matches.map(({ division, weightClass, ...match}) => ({
						...match,
						vsId: opponentIdXref.filter(xref => xref.sqlId == match.vsSqlId).map(xref => xref.id).find(() => true)
					}))
				}))
			};
		
			const lastEvent = wrestler.events
				.map(event => ({ 
					division: event.division, 
					date: new Date(event.date),
					weightClass: event.weightClass
				}))
				.sort((eventA, eventB) => 
					!isNaN(eventA.weightClass) && isNaN(eventB.weightClass) ? -1
					: isNaN(eventA.weightClass) && !isNaN(eventB.weightClass) ? 1
					: +eventB.date - +eventA.date
				)
				.find(() => true);
			
			wrestler = {
				...wrestler,
				division: lastEvent?.division,
				weightClass: lastEvent?.weightClass
			};

			output.data.wrestler = wrestler;
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},
	
	externalWrestlersBulk: async (serverPath) => {
		const output = { data: {} };

		try {
			const clientResponse = await client.get(`${ serverPath }/data/externalwrestler?select=sqlId`);
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

	externalWrestlerLineageSave: async (sqlId, lineage, serverPath) => {
		const output = {};

		let wrestler;
		try {
			const clientResponse = await client.get(`${ serverPath }/data/externalwrestler?sqlid=${ sqlId }`).then();
			wrestler = clientResponse.body.externalWrestlers[0];
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

		if (wrestler) {
			wrestler.lineage = lineage;
				
			try {
				const clientResponse = await client.post(`${ serverPath }/data/externalwrestler`).send({ externalwrestler: wrestler }).then();
				output.id = clientResponse.body.id;
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}
		}
		else {
			console.log(`${ (new Date()).toLocaleDateString() } ${ (new Date()).toLocaleTimeString() }: no wrestler: ${ sqlId }`);
		}

		output.status = 200;
		return output;
	},

	externalWrestlersBulkSave: async (externalWrestlers, serverPath) => {
		const output = { 
			data: {
				externalWrestlers: [],
				externalTeams: []
			}
		};

		for (let wrestlerIndex = 0; wrestlerIndex < externalWrestlers.length; wrestlerIndex++) {
			// Save each wrestler
			try {
				if (!externalWrestlers[wrestlerIndex].events) {
					externalWrestlers[wrestlerIndex].events = [];
				}

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

		output.status = output.status ? output.status : 200;
		return output;
	},

	externalWrestlersBulkDelete: async (wrestlerIds, serverPath) => {
		const output = {};

		try {
			for (let wrestlerIndex = 0; wrestlerIndex < wrestlerIds.length; wrestlerIndex++) {
				// Get the wrestler ID
				const clientResponse = await client.get(`${ serverPath }/data/externalwrestler?sqlid=${ wrestlerIds[wrestlerIndex] }`);
				const wrestler = clientResponse.body.externalWrestlers[0]

				// Delete each wrestler
				await client.delete(`${ serverPath }/data/externalwrestler?id=${ wrestler.id }`);
			}
			
			output.status = 200;
			output.data = { status: "ok" };
			return output;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}

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

	wrestlerSearchLoad: async (serverPath) => {
		const output = { data: {} }

		try {
			const clientResponse = await client.get(`${ serverPath }/data/scmatteam`);
			output.data.scmatTeams = clientResponse.body.scmatTeams;
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
			output.data.wrestlers = wrestlers.map(wrestler => {
				const lastEvent = (wrestler.events || [])
					.map(event => ({...event, date: new Date(event.date)}))
					.sort((eventA, eventB) => +eventB.date - +eventA.date)
					.map(event => ({ 
						name: event.name, 
						date: event.date,
						team: event.team,
						division: (event.matches || []).map(match => match.division).find(() => true),
						weightClass: (event.matches || []).map(match => match.weightClass).find(() => true)
					}))
					.find(() => true);

				return {
					id: wrestler.id,
					name: wrestler.name,
					rating: wrestler.rating,
					deviation: wrestler.deviation,
					team: lastEvent ? lastEvent.team : null,
					division: lastEvent ? lastEvent.division : null,
					weightClass: lastEvent ? lastEvent.weightClass : null,
					lastEvent: lastEvent ? { name: lastEvent.name, date: lastEvent.date } : null,
					teams: [].concat(wrestler.events)
						.sort((eventA, eventB) => +(new Date(eventB.date)) - +(new Date(eventA.date)))
						.reduce((output, event) => output.includes(event.team) ? output : output.concat([event.team]), [])
				};
			});
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

		let opponentIdXref = [];
		try {
			const opponentSqlIds = [...new Set(wrestler.events.flatMap(event => event.matches.map(match => match.vsSqlId )))];
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?sqlids=${ JSON.stringify(opponentSqlIds) }&select=sqlId`);
			opponentIdXref = clientResponse.body.wrestlers;
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}
		
		try {
			
			wrestler = {
				...wrestler,
				name: wrestler.name ? wrestler.name : wrestler.firstName + " " + wrestler.lastName,
				rating: wrestler.rating,
				deviation: wrestler.deviation,
				events: wrestler.events.map(event => ({
					...event,
					division: event.matches[0] ?
						/(hs|high school|high)/i.test(event.matches[0].division) ? "Varsity"
						: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
						: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
						: (event.matches[0].division || "").trim()
						: "",
					weightClass: event.matches[0]?.weightClass || "",
					matches: event.matches.map(({ division, weightClass, ...match}) => ({
						...match,
						vsId: opponentIdXref.filter(xref => xref.sqlId == match.vsSqlId).map(xref => xref.id).find(() => true)
					}))
				}))
			};
		
			const lastEvent = wrestler.events
				.map(event => ({ 
					division: event.division, 
					date: new Date(event.date),
					weightClass: event.weightClass
				}))
				.sort((eventA, eventB) => 
					!isNaN(eventA.weightClass) && isNaN(eventB.weightClass) ? -1
					: isNaN(eventA.weightClass) && !isNaN(eventB.weightClass) ? 1
					: +eventB.date - +eventA.date
				)
				.find(() => true);
			
			wrestler = {
				...wrestler,
				division: lastEvent?.division,
				weightClass: lastEvent?.weightClass
			};

			output.data.wrestler = wrestler;
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	opponentLoad: async (serverPath) => {
		const output = {
			data: {}
		};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=fort mill`);
			
			output.data.team = clientResponse.body.wrestlers
				.map(wrestler => {
					const lastTeamEvent = wrestler.events
						.filter(event => /^fort mill$/gi.test(event.team))
						.map(event => ({
							event: event.name,
							date: new Date(event.date),
							division: event.matches ? 
								/(hs|high school|hs girls)/i.test(event.matches[0].division) ? "Varsity"
								: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
								: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
								: (event.matches[0].division || "").trim()
							: (match.division || "").trim(), 
							weightClass: event.matches ? event.matches[0].weightClass : null
						}))
						.sort((eventA, eventB) => +eventB.date - +eventA.date)
						.find(() => true);
					
					return {
						id: wrestler.id,
						name: wrestler.name,
						lastEvent: lastTeamEvent,
						division: lastTeamEvent.division,
						weightClass: lastTeamEvent.weightClass,
						rating: wrestler.rating,
						deviation: wrestler.deviation
					}
				})
				.filter(wrestler => wrestler.lastEvent.date >= new Date(new Date().getFullYear() - 1, 8, 1));
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		try {
			const clientResponse = await client.get(`${ serverPath }/data/scmatteam`);
			output.data.opponents = clientResponse.body.scmatTeams
				.filter(scmatTeam => !/^fort mill$/gi.test(scmatTeam.name))
				.map(scmatTeam => scmatTeam.name); 
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;
	},

	opponentSelect: async (opponentName, serverPath) => {
		const output = { data: {} };

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

		try {
			output.data.wrestlers = wrestlers
				.map(wrestler => {
					const lastTeamEvent = wrestler.events
						.filter(event => event.matches.some(match => match.weightClass && !isNaN(match.weightClass)))
						.sort((eventA, eventB) => +(new Date(eventB.date)) - +(new Date(eventA.date)))
						.map(event => ({
							name: event.name,
							date: new Date(event.date),
							state: event.locationState,
							division: event.matches ? 
									/(hs|high school|hs girls)/i.test(event.matches[0].division) ? "Varsity"
									: /(jv|junior varsity)/i.test(event.matches[0].division) ? "JV"
									: /(ms|middle school)/i.test(event.matches[0].division) ? "MS"
									: (event.matches[0].division || "").trim()
								: null, 
							weightClass: event.matches ? event.matches[0].weightClass : null
						}))
						.find(() => true);

					return {
						id: wrestler.id,
						name: wrestler.name,
						rating: wrestler.rating,
						deviation: wrestler.deviation,
						division: lastTeamEvent?.division,
						weightClass: lastTeamEvent?.weightClass,
						lastEvent: lastTeamEvent
					};
				})
				.filter(wrestler => wrestler.lastEvent && wrestler.lastEvent.date >= new Date(new Date().getFullYear() - 1, 8, 1));
		}
		catch (error) {
			output.status = 564;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		return output;		
	}
	
};
