import express from "express";
import client from "superagent";
import api from "./api.js";
import browser from "express-useragent";

const router = express.Router();

const authAPI = (request, response, next) => {
	if (api.authAPI(request.serverPath, request.headers["referer"])) {
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

	response.cookie("wm", results.cookie, { maxAge: 999999999999 });
	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/api/postload", authAPI, async (request, response) => {
	const results = await api.postLoad(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "647b4c2ef18254fde708ec96", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/postsave", authAPI, async (request, response) => {
	const results = await api.postSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6477f531f18254fde707c125", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/scheduleload", authAPI, async (request, response) => {
	const results = await api.scheduleLoad(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480db2b4d7f52ba05e8180d", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/schedulesave", authAPI, async (request, response) => {
	const results = await api.scheduleSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480dd414d7f52ba05e8187b", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/requestsload", authAPI, async (request, response) => {
	const results = await api.requestsLoad(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64836fdc4d7f52ba05e8fd63", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/requestssave", authAPI, async (request, response) => {
	const results = await api.requestsSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64836ff14d7f52ba05e8fd66", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

// ***************** Roles ********************

router.get("/api/roleload", authAPI, async (request, response) => {
	const results = await api.roleLoad(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648aa4534d7f52ba05eb7d64", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/rolesave", authAPI, async (request, response) => {
	const results = await api.roleSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648aa47a4d7f52ba05eb7d67", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

// ***************** Users ********************

router.get("/api/usersload", authAPI, async (request, response) => {
	const results = await api.usersLoad(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a3276626539d4ed275e8e3", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/userssave", authAPI, async (request, response) => {
	const results = await api.usersSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a32ad326539d4ed275ea1c", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

// ***************** Teams ********************

router.get("/api/teamsload", authAPI, async (request, response) => {
	const results = await api.teamsLoad(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7458c26539d4ed2775dd7", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

export default router;
