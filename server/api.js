import client from "superagent";
import jwt from "jsonwebtoken";
import config from "./config.js";
import { google } from "googleapis";
import nodemailer from "nodemailer";

export default {

	serverInitialize: (request, response, next) => {
		request.serverPath = `${ request.protocol }://${ request.headers.host }`;
		request.logUrl = `${ request.protocol }://beynum.com/sys/api/addlog`;
		next();
	},

	authInternal: (request, response, next) => {
		if (request.headers["x-forwarded-for"] && !/10\.21\.0/g.test(request.headers["x-forwarded-for"])) {
			response.status(401).send("Unauthorized");
		}
		else {
			next();
		}
	},

	authAPI: (request, response, next) => {
		const re = new RegExp(request.serverPath);

		if (re.test(request.headers["referer"])) {
			next();
		}
		else {
			response.redirect("/noaccess.html");
		}
	},

	authPortal: async (request, response, next) => {
		if (/^\/portal/.test(request.path)) {
			if (!request.cookies.wm) {
				response.redirect("/noaccess.html");
				return;
			}

			const tokenData = jwt.verify(request.cookies.wm, config.jwt);

			if (!tokenData.token) {
				client.post(request.logURL).send({ log: { logTime: new Date(), logTypeId: "6422440638baa8f160a2df09", message: `560: Invalid token` }}).then();
				response.redirect("/noaccess.html");
				return;
			}

			let clientResponse = null;
			try {
				clientResponse = await client.get(`${ request.serverPath }/data/user?devicetoken=${ tokenData.token }`);
			}
			catch (error) {
				client.post(request.logURL).send({ log: { logTime: new Date(), logTypeId: "6422440638baa8f160a2df09", message: `561: ${error.message}` }}).then();
				response.redirect("/noaccess.html");
				return;
			}

			if (!clientResponse.body.users || clientResponse.body.users.length !== 1) {
				client.post(request.logURL).send({ log: { logTime: new Date(), logTypeId: "6422440638baa8f160a2df09", message: `562: User not found: ${ tokenData.token }` }}).then();
				response.redirect("/noaccess.html");
				return;
			}

			request.user = {
				...clientResponse.body.users[0],
				devices: clientResponse.body.users[0].devices.map(device => ({
					...device,
					lastAccess: tokenData.token === device.token ? new Date() : device.lastAccess
				}))
			};

			client.post(`${ request.serverPath }/data/user`).send({ user: request.user }).then();

			next();
		}
		else {
			next();
		}
	},

	requestAccess: async (request, response) => {
		let ipAddress = (request.headers["x-forwarded-for"] || "").split(",").pop().trim() || 
			request.connection.remoteAddress || 
			request.socket.remoteAddress || 
			request.connection.socket.remoteAddress;
		ipAddress = ipAddress.match(/[^:][\d.]+$/g).join("");

		const agent = request.headers["user-agent"],
			domain = request.headers.host,
			token = (Math.random() + 1).toString(36).substring(2,12),
			encryptedToken = jwt.sign({ token: token }, config.jwt),
			userRequest = {
				name: request.body.name,
				email: request.body.email,
				device: {
						token: token,
						ip: ipAddress,
						browser: request.useragent
					}
				},
			email = {
					from: "\"The Wrestling Mill\" <thebeynumco@gmail.com>",
					to: config.email.user,
					subject: "Wrestling Mill Access Requested",
					html: `Access requested from:<br>${request.body.name} (${request.body.email})<br><br>Details<br>Domain: ${ domain }<br>IP: ${ ipAddress }<br>Browser:<br>${ JSON.stringify(request.useragent).replace(/,/g, "<br>") }<br><br><a href="http://${ domain }">http://${ domain }</a>`
				};
			
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

		try {
			await client.post(`${ request.serverPath }/data/devicerequest`).send({ devicerequest: userRequest }).then();
			
			service.sendMail(email, (error, mailResponse) => {
				if (error) {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "642202d038baa8f160a2c6bb", message: `561: ${error.message}` }}).then();
					response.statusMessage = error.message;
					response.status(561).json({ error: error.message });
					return;
				}
				else {
					service.close();

					response.cookie("wm", encryptedToken, { maxAge: 999999999999 });
					response.status(200).json({ status: "ok" });
				}
			});

		}
		catch (error) {
			client.post(request.logURL).send({ log: { logTime: new Date(), logTypeId: "642202d038baa8f160a2c6bb", message: `560: ${error.message}` }}).then();
			response.statusMessage = error.message;
			response.status(560).json({ error: error.message });
			return;
		}
		
	},

};
