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
	}

};
