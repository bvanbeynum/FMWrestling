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
		return !forwardedIP || /10\.21\.0/g.test(forwardedIP); // Is the request being forwared through a proxy, or is the proxy IP internal
	},

	authAPI: (serverPath, referer) => {
		const re = new RegExp(serverPath); // Build the regex based on the shorter path to the server
		return re.test(referer); // The referer is the full URL, so it should include the server path
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

			client.post(`${ serverPath }/data/user`).send({ user: output.user }).then();
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

			if (error) {
				output.status = 561;
				output.error = error.message;
				return output;
			}
	
			service.close();

			output.status = 200;
			output.cookie = encryptedToken;
			return output;
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}
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

	scheduleLoad: async (serverPath) => {
		const output = {};

		try {
			const clientResponse = await client.get(`${ serverPath }/data/event`);

			output.status = 200;
			output.data = { events: clientResponse.body.events };
			return output;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}
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
				console.log(error);
				output.status = 563;
				output.error = error.message;
				return output;
			}
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
			try {
				await client.delete(`${ serverPath }/data/role?id=${ body.delete }`);

				output.status = 200;
				output.data = { status: "ok" };
				return output;
			}
			catch (error) {
				console.log(error);
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
				console.log(error);
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

	}

};
