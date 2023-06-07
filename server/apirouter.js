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

export default router;
