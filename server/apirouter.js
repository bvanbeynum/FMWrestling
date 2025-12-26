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
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "642202d038baa8f160a2c6bb", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.cookie("wm", results.cookie, { maxAge: 999999999999 });
	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/api/postload", authAPI, async (request, response) => {
	const results = await api.postLoad(request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "647b4c2ef18254fde708ec96", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/postsave", authAPI, async (request, response) => {
	const results = await api.postSave(request.body, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6477f531f18254fde707c125", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/scheduleload", authAPI, async (request, response) => {
	const results = await api.scheduleLoad(request.serverPath, request.query.startdate, request.query.enddate);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480db2b4d7f52ba05e8180d", message: `${ results.status }: ${results.error}` }}).then();
	}
	
	const output = { loggedInUser: request.user, ...results.data };

	response.status(results.status).json(results.error ? { error: results.error } : output);
});

router.get("/api/requestsload", authAPI, async (request, response) => {
	const results = await api.requestsLoad(request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64836fdc4d7f52ba05e8fd63", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/requestssave", authAPI, async (request, response) => {
	const results = await api.requestsSave(request.body, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64836ff14d7f52ba05e8fd66", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

// ***************** Roles ********************

router.get("/api/roleload", authAPI, async (request, response) => {
	const results = await api.roleLoad(request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648aa4534d7f52ba05eb7d64", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/rolesave", authAPI, async (request, response) => {
	const results = await api.roleSave(request.body, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648aa47a4d7f52ba05eb7d67", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

// ***************** Users ********************

router.get("/api/usersload", authAPI, async (request, response) => {
	const results = await api.usersLoad(request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a3276626539d4ed275e8e3", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/userssave", authAPI, async (request, response) => {
	const results = await api.usersSave(request.body, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a32ad326539d4ed275ea1c", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/usersessionsave", authAPI, async (request, response) => {
	const results = await api.userSessionSave(request.user, request.body.session, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651b68f7cf4fc75b63591ee7", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

// ***************** Teams ********************

router.get("/api/myteamload", authAPI, async (request, response) => {
	const results = await api.myTeamLoad(request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651b16e3cf4fc75b63536bb4", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data } );
});

router.post("/api/myteamsavewrestler", authAPI, async (request, response) => {
	const results = await api.myTeamSaveWrestler(request.user, request.body.session, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651b68f7cf4fc75b63591ee7", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

router.get("/api/teamwrestlersload", authAPI, async (request, response) => {
	const results = await api.teamWrestlersLoad(request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651b16e3cf4fc75b63536bb4", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data } );
});

router.get("/api/teamcompareload", authAPI, async (request, response) => {
	const results = await api.teamCompareLoad(request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651b61fccf4fc75b6358a2d4", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data } );
});

router.get("/api/teamgetopponentwrestlers", authAPI, async (request, response) => {
	const results = await api.teamGetOpponentWrestlers(request.query.opponentid, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651c9156cf4fc75b636c2b14", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

router.get("/api/teamgetscmatcompare", authAPI, async (request, response) => {
	const results = await api.teamGetSCMatCompare(request.query.teamid, request.query.opponentid, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651dfc87cf4fc75b638397c1", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

router.post("/api/teamwrestlerssave", authAPI, async (request, response) => {
	const results = await api.teamWrestlersSave(request.body.savepacket, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651b18a6cf4fc75b63538bc1", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/externalwrestlerdetails", authAPI, async (request, response) => {
	const results = await api.externalWrestlerDetails(request.query.id, request.query.hometeam, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "65450955cf4fc75b636f85bd", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

// ***************** External Teams ********************

router.get("/api/externalwrestlersbulk", authAPI, async (request, response) => {
	const results = await api.externalWrestlersBulk(request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650e12ac547ce02736559930", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/externalwrestlerlineagesave", authAPI, async (request, response) => {
	const results = await api.externalWrestlerLineageSave(request.body.sqlid, request.body.lineage, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650f23c7547ce0273661ab8d", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.data } : results.data);
});

router.post("/api/externalwrestlersbulksave", authAPI, async (request, response) => {
	const results = await api.externalWrestlersBulkSave(request.body.externalwrestlers, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650f23c7547ce0273661ab8d", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.data } : results.data);
});

router.post("/api/externalwrestlersbulkdelete", authAPI, async (request, response) => {
	const results = await api.externalWrestlersBulkDelete(request.body.wrestlerids, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6595c5b1f8173963fdc6b261", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.data } : results.data);
});

router.post("/api/floeventsave", authAPI, async (request, response) => {
	const results = await api.floEventSave(request.body.floEvent, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed25e226539d4ed2916e6e", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/trackeventsave", authAPI, async (request, response) => {
	const results = await api.trackEventSave(request.body.trackEvent, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64efa04c26539d4ed297e773", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/scmatteambulksave", authAPI, async (request, response) => {
	const results = await api.scmatTeamBulkSave(request.body.teamssave, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516f5c0cf4fc75b63100c9d", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/scmatteamsearch", authAPI, async (request, response) => {
	const results = await api.scmatTeamSearch(request.query.name, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651977a5cf4fc75b63376404", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

// ***************** Wrestler ********************

router.get("/api/wrestlersearchload", authAPI, async (request, response) => {
	const results = await api.wrestlerSearchRanking("SC", null, null, null, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "65723e6ccf4fc75b63a0e3dd", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.get("/api/wrestlersearch", authAPI, async (request, response) => {
	const results = await api.wrestlerSearch(request.query.search, request.query.searchtype, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "65724918cf4fc75b63a15acd", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/wrestlerdetails", authAPI, async (request, response) => {
	const results = await api.wrestlerDetails(request.query.id, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "65450955cf4fc75b636f85bd", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.get("/api/wrestlersearchranking", authAPI, async (request, response) => {
	const results = await api.wrestlerSearchRanking(request.query.state, request.query.team, request.query.weightclass, request.query.classification, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "65724f4ccf4fc75b63a1c0f3", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

// ***************** Opponent ********************

router.get("/api/opponentload", authAPI, async (request, response) => {
	const results = await api.opponentLoad(request.serverPath);

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.get("/api/opponentselect", authAPI, async (request, response) => {
	const results = await api.opponentSelect(request.query.opponent, request.serverPath);

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

router.post("/api/opponentsavelineup", authAPI, async (request, response) => {
	const results = await api.opponentSaveLineup(request.user, request.body.saveid, request.body.savename, request.body.opponentid, request.body.startingweightclass, request.body.lineup, request.serverPath);

	if (results.error) {
		console.log(`Error ${results.status}: ${ results.error }`);
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "651b68f7cf4fc75b63591ee7", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

// ***************** Opponent Event ********************

router.get("/api/opponenteventload", authAPI, async (request, response) => {
	const results = await api.opponentEventLoad(request.serverPath);

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.get("/api/opponenteventselect", authAPI, async (request, response) => {
	const results = await api.opponentEventSelect(request.query.opponent, request.serverPath);

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

export default router;
