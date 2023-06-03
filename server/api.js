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

			const tokenData = jwt.verify(cookie, config.jwt);

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
			output.posts = clientResponse.body.posts.filter(post => !post.expires || post.expires > new Date());
			return output;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}
	},

	postSave: async (post, serverPath) => {
		const output = {};

		try {
			const clientResponse = await client.post(`${ serverPath }/data/post`).send({ post: post }).then();
			output.data = { id: clientResponse.body.id };
			
			output.status = 200;
			return output;
		}
		catch (error) {
			output.status = 561;
			output.error = error.message;
			return output;
		}
	}

};
