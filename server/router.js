import express from "express";
import client from "superagent";
import data from "./data.js";
import api from "./api.js";
import browser from "express-useragent";

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
		client.post(request.logURL).send({ log: { logTime: new Date(), logTypeId: "6422440638baa8f160a2df09", message: `${ results.status}: ${ results.error }` }}).then();
	}

	if (results.status === 200) {
		request.user = results.user || request.user;
		next();
	}
	else {
		response.redirect("/noaccess.html");
	}
});

const authInternal = (request, response, next) => {
	if (api.authInternal(request.headers["x-forwarded-for"])) {
		next();
	}
	else {
		response.status(401).send("Unauthorized");
	}
};

const authAPI = (request, response, next) => {
	if (api.authAPI(request.serverPath), request.headers["referer"]) {
		next();
	}
	else {
		response.status(401).send("Unauthorized");
	}
};

// ************************* API

router.post("/api/requestaccess", [authAPI, browser.express()], async (request, response) => {
	let ipAddress = (request.headers["x-forwarded-for"] || "").split(",").pop().trim() || 
		request.connection.remoteAddress || 
		request.socket.remoteAddress || 
		request.connection.socket.remoteAddress;
	ipAddress = ipAddress.match(/[^:][\d.]+$/g).join("");

	const domain = request.headers.host;

	const results = await api.requestAccess(ipAddress, domain, request.body.name, request.body.email, request.useragent, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "642202d038baa8f160a2c6bb", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/api/announcementsave", authAPI, async (request, response) => {
	const result = await api.announcementSave(request.body.annoucement, request.serverPath);

	if (result.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6477f531f18254fde707c125", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(result.status).json(result.error ? { error: result.error } : result.data);
});

// ************************* Data

router.get("/data/user", authInternal, async (request, response) => {
	const results = await data.userGet(request.query.id, request.query.devicetoken);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223ce638baa8f160a2dc45", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/user", authInternal, async (request, response) => {
	const results = await data.userSave(request.body.user);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223d1d38baa8f160a2dc48", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.delete("/data/user", authInternal, async (request, response) => {
	const results = await data.userDelete(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223d3f38baa8f160a2dc4a", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/devicerequest", authInternal, async (request, response) => {
	const results = await data.deviceRequestGet(request.query.id);

	if (results.error) {
		client.post(results.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e5d38baa8f160a2dcd4", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/devicerequest", authInternal, async (request, response) => {
	const results = await data.deviceRequestSave(request.body.devicerequest);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e7238baa8f160a2dcd7", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.delete("/data/devicerequest", authInternal, async (request, response) => {
	const results = await data.deviceRequestDelete(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e8838baa8f160a2dcd9", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/scorecall", authInternal, async (request, response) => {
	const results = await data.scoreCallGet(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641effd497f3b068a56265d9", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/scorecall", authInternal, async (request, response) => {
	const results = await data.scoreCallSave(request.body.scorecall);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f007897f3b068a5626649", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.delete("/data/scorecall", authInternal, async (request, response) => {
	const results = await data.scoreCallDelete(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f008897f3b068a562664b", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/wrestler", authInternal, async (request, response) => {
	const results = await data.wrestlerGet(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00fb97f3b068a5626653", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/wrestler", authInternal, async (request, response) => {
	const results = await data.wrestlerSave(request.body.wrestler);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00ec97f3b068a5626651", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.delete("/data/wrestler", authInternal, async (request, response) => {
	const results = await data.userDelete(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00df97f3b068a562664e", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/dual", authInternal, async (request, response) => {
	const results = await data.dualGet(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f016097f3b068a56266c6", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/dual", authInternal, async (request, response) => {
	const results = await data.dualSave(request.body.dual);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f014f97f3b068a5626658", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.delete("/data/dual", authInternal, async (request, response) => {
	const results = await data.dualDelete(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f014097f3b068a5626656", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

export default router;
