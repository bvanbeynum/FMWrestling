import express from "express";
import client from "superagent";
import api from "./api.js";
import browser from "express-useragent";

const router = express.Router();

const authAPI = async (request, response, next) => {
	const results = await api.authAPI(request.serverPath, request.headers["referer"], request.cookies.wm);

	if (api.authInternal(request.headers["x-forwarded-for"]) || results.isValid) {
		if (results.loggedInUser) {
			request.user = results.loggedInUser;
		}

		next();
	}
	else {
		response.status(401).send("Unauthorized");
	} 
};

// ***************** Home ********************

router.get("/api/homeload", authAPI, (request, response) => {
	const output = { loggedInUser: request.user };

	response.status(200).json(output);
});

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

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/postsave", authAPI, async (request, response) => {
	const results = await api.postSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6477f531f18254fde707c125", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/scheduleload", authAPI, async (request, response) => {
	const results = await api.scheduleLoad(request.serverPath, request.query.startdate, request.query.enddate);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480db2b4d7f52ba05e8180d", message: `${ results.status }: ${results.error}` }}).then();
	}
	
	const output = { loggedInUser: request.user, ...results.data };

	response.status(results.status).json(results.error ? { error: results.error } : output);
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

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
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

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/rolesave", authAPI, async (request, response) => {
	const results = await api.roleSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648aa47a4d7f52ba05eb7d67", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

// ***************** Users ********************

router.get("/api/usersload", authAPI, async (request, response) => {
	const results = await api.usersLoad(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a3276626539d4ed275e8e3", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/userssave", authAPI, async (request, response) => {
	const results = await api.usersSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a32ad326539d4ed275ea1c", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

// ***************** Teams ********************

router.get("/api/teamsload", authAPI, async (request, response) => {
	const results = await api.teamsLoad(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7458c26539d4ed2775dd7", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data } );
});

router.post("/api/teamssave", authAPI, async (request, response) => {
	const results = await api.teamsSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a9608826539d4ed2781abe", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/teamviewload", authAPI, async (request, response) => {
	const results = await api.teamViewLoad(request.query.id, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650a118a7c6bf8ee965454ad", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data } );
});

router.post("/api/teamswrestlersave", authAPI, async (request, response) => {
	const results = await api.teamsWrestlerSave(request.query.teamid, request.body.wrestler, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650c8f44547ce0273641269c", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

// ***************** External Teams ********************

router.get("/api/externalteamsget", authAPI, async (request, response) => {
	const results = await api.externalTeamsGet(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64cab8c726539d4ed283b773", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/externalteamssave", authAPI, async (request, response) => {
	const results = await api.externalTeamsSave(request.body, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64d7dd6c26539d4ed28830ae", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/externalteamssearch", authAPI, async (request, response) => {
	const results = await api.externalTeamsSearch(request.query.filter, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64d9140326539d4ed28899aa", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/externalwrestlersbulk", authAPI, async (request, response) => {
	const results = await api.externalWrestlersBulk(request.query.filter, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650e12ac547ce02736559930", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/floeventload", authAPI, async (request, response) => {
	const results = await api.floEventLoad(request.query.id, request.serverPath, request.query.lastLoad);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64f90a99834ebe5ef64faa77", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.get("/api/floeventfavorites", authAPI, async (request, response) => {
	const results = await api.floEventFavorites(request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64f79111bd62e8c8b53ccd20", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/floeventsave", authAPI, async (request, response) => {
	const results = await api.floEventSave(request.body.floEvent, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed25e226539d4ed2916e6e", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/trackeventsave", authAPI, async (request, response) => {
	const results = await api.trackEventSave(request.body.trackEvent, request.serverPath);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64efa04c26539d4ed297e773", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

export default router;
