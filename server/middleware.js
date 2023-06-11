import express from "express";
import client from "superagent";
import api from "./api.js";

const router = express.Router();

// ************************* Middleware

router.use((request, response, next) => {
	const vars = api.setRequestVars(request.protocol, request.headers.host);
	Object.assign(request, vars);

	next();
});

router.use(async (request, response, next) => {
	const results = await api.authPortal(request.cookies.wm, request.path, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6422440638baa8f160a2df09", message: `${ results.status}: ${ results.error }` }}).then();
	}

	if (results.status === 200) {
		request.user = results.user || request.user;
		next();
	}
	else {
		response.redirect("/noaccess.html");
	}
});

export default router;
