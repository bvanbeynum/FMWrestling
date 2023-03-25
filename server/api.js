import client from "superagent";
import jwt from "jsonwebtoken";
import config from "./config.js";

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
	}

};
