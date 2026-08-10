import express from "express";
import client from "superagent";
import data from "./data.js";
import api from "./api.js";

const router = express.Router();

const authInternal = (request, response, next) => {
	if (api.authInternal(request.headers["x-forwarded-for"])) {
		next();
	}
	else {
		response.status(401).send("Unauthorized");
	}
};

// ************************* Data

router.get("/data/user", authInternal, async (request, response) => {
	const results = await data.userGet({ id: request.query.id, deviceToken: request.query.devicetoken, roleId: request.query.roleid, email: request.query.email });

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223ce638baa8f160a2dc45", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/user", authInternal, async (request, response) => {
	const results = await data.userSave(request.body.user);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223d1d38baa8f160a2dc48", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.delete("/data/user", authInternal, async (request, response) => {
	const results = await data.userDelete(request.query.id);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223d3f38baa8f160a2dc4a", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/devicerequest", authInternal, async (request, response) => {
	const results = await data.deviceRequestGet(request.query.id);

	if (results.error) {
		// client.post(result.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e5d38baa8f160a2dcd4", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/devicerequest", authInternal, async (request, response) => {
	const results = await data.deviceRequestSave(request.body.devicerequest);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e7238baa8f160a2dcd7", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.delete("/data/devicerequest", authInternal, async (request, response) => {
	const results = await data.deviceRequestDelete(request.query.id);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e8838baa8f160a2dcd9", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/wrestler", authInternal, async (request, response) => {
	const sqlIdList = request.query.sqlids ? JSON.parse(request.query.sqlids) : null;
		const filter = { 
			id: request.query.id,
			ids: request.query.ids ? JSON.parse(request.query.ids) : null,
			name: request.query.name, 
			teams: request.query.teams ? JSON.parse(request.query.teams) : null,
			teamName: request.query.teamname, 
			teamPartial: request.query.teampartial,
			state: request.query.state,
			lastWeightClass: request.query.lastweightclass,
			wrestledSince: request.query.wrestledsince,
			sqlId: request.query.sqlid,
			sqlIds: sqlIdList,
			select: request.query.select ? request.query.select.split(",") : null,
			ratingSort: request.query.ratingsort === "true",
			createdSince: request.query.createdsince
		};

	const results = await data.wrestlerGet(filter);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00fb97f3b068a5626653", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/wrestler", authInternal, async (request, response) => {
	const results = await data.wrestlerSave(request.body.wrestler);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00ec97f3b068a5626651", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/wrestler/bulk", authInternal, async (request, response) => {
	try {
		const results = await data.wrestlerBulkSave(request.body.wrestlers);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00ec97f3b068a5626651", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/wrestler", authInternal, async (request, response) => {
	const results = await data.wrestlerDelete(request.query.id);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00df97f3b068a562664e", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/school", authInternal, async (request, response) => {
		const filter = { 
			id: request.query.id, 
			name: request.query.name,
			names: request.query.names ? JSON.parse(request.query.names) : null,
			select: request.query.select ? request.query.select.split(",") : null
		};

	const results = await data.schoolGet(filter);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00fb97f3b068a5626653", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/school", authInternal, async (request, response) => {
	const results = await data.schoolSave(request.body.school);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00ec97f3b068a5626651", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.delete("/data/school", authInternal, async (request, response) => {
	const results = await data.schoolDelete(request.query.id);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00df97f3b068a562664e", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/role", authInternal, async (request, response) => {
	try {
		const results = await data.roleGet(request.query.id);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c09f24d7f52ba05ebf97a", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c09f24d7f52ba05ebf97a", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/role", authInternal, async (request, response) => {
	try {
		const results = await data.roleSave(request.body.role);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c0a0f4d7f52ba05ebf97d", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c0a0f4d7f52ba05ebf97d", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/role", authInternal, async (request, response) => {
	try {
		const results = await data.roleDelete(request.query.id);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c0a3c4d7f52ba05ebf97f", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c0a3c4d7f52ba05ebf97f", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/privilege", authInternal, async (request, response) => {
	try {
		const results = await data.privilegeGet({ id: request.query.id, token: request.query.token });

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06f9126539d4ed274f141", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06f9126539d4ed274f141", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/privilege", authInternal, async (request, response) => {
	try {
		const results = await data.privilegeSave(request.body.privilege);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06fa626539d4ed274f143", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06fa626539d4ed274f143", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/privilege", authInternal, async (request, response) => {
	try {
		const results = await data.privilegeDelete(request.query.id);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06fba26539d4ed274f1a9", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06fba26539d4ed274f1a9", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/team", authInternal, async (request, response) => {
	try {
		const results = await data.teamGet({ id: request.query.id });

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7225d26539d4ed27751cc", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7225d26539d4ed27751cc", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/team", authInternal, async (request, response) => {
	try {
		const results = await data.teamSave(request.body.team);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a722bf26539d4ed2775233", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a722bf26539d4ed2775233", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/team", authInternal, async (request, response) => {
	try {
		const results = await data.teamDelete(request.query.id);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a722eb26539d4ed2775235", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a722eb26539d4ed2775235", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/externalwrestler", authInternal, async (request, response) => {
	try {
		const idsList = request.query.ids ? JSON.parse(request.query.ids) : null;
		const sqlIdList = request.query.sqlids ? JSON.parse(request.query.sqlids) : null;
		const filter = { 
			id: request.query.id, 
			ids: idsList, 
			name: request.query.name, 
			max: request.query.max, 
			teamName: request.query.teamname, 
			teamPartial: request.query.teampartial,
			sqlId: request.query.sqlid,
			sqlIds: sqlIdList,
			select: request.query.select ? request.query.select.split(",") : null
		};

		const results = await data.externalWrestlerGet(filter);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650e124d547ce02736559461", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650e124d547ce02736559461", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/externalwrestler", authInternal, async (request, response) => {
	try {
		const results = await data.externalWrestlerSave(request.body.externalwrestler);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650e1264547ce0273655956a", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650e1264547ce0273655956a", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/externalwrestler", authInternal, async (request, response) => {
	try {
		const results = await data.externalWrestlerDelete(request.query.id);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650e1278547ce02736559672", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "650e1278547ce02736559672", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/event", authInternal, async (request, response) => {
	try {
		const sqlIdList = request.query.sqlids ? JSON.parse(request.query.sqlids) : null;
		
		const filter = { 
			id: request.query.id, 
			sqlId: request.query.sqlid,
			startDate: request.query.startdate, 
			endDate: request.query.enddate,
			eventSystem: request.query.eventsystem,
			eventType: request.query.eventtype, 
			sqlIds: sqlIdList,
			select: request.query.select ? request.query.select.split(",") : null,
			state: request.query.state,
			team: request.query.team,
			modifiedSince: request.query.modifiedsince
		};
		
		const results = await data.eventGet(filter);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed207826539d4ed2915e5a", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed207826539d4ed2915e5a", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/event", authInternal, async (request, response) => {
	try {
		const results = await data.eventSave(request.body.event);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed20be26539d4ed2915eed", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed20be26539d4ed2915eed", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/event/bulk", authInternal, async (request, response) => {
	try {
		const eventsList = request.body.events || request.body.event || request.body.records || (Array.isArray(request.body) ? request.body : null);
		const results = await data.eventBulkSave(eventsList);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed20be26539d4ed2915eed", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/event", authInternal, async (request, response) => {
	try {
		const results = await data.eventDelete(request.query.id, request.query.sqlid);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed20df26539d4ed2916038", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed20df26539d4ed2916038", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/scmatteam", authInternal, async (request, response) => {
	try {
		const idsList = request.query.ids ? JSON.parse(request.query.ids) : null;

		const results = await data.scmatTeamGet({ id: request.query.id, ids: idsList, name: request.query.name, exactName: request.query.exactname });

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c7fecf4fc75b630d12a4", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c7fecf4fc75b630d12a4", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/scmatteam", authInternal, async (request, response) => {
	try {
		const results = await data.scmatTeamSave(request.body.scmatteam);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c821cf4fc75b630d14e9", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c821cf4fc75b630d14e9", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/scmatteam", authInternal, async (request, response) => {
	try {
		const results = await data.scmatTeamDelete(request.query.id);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c83bcf4fc75b630d16ea", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c83bcf4fc75b630d16ea", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/dual", authInternal, async (request, response) => {
	try {
		const results = await data.dualGet({ 
			id: request.query.id,
			startDate: request.query.startdate,
			endDate: request.query.enddate,
			select: request.query.select ? request.query.select.split(",") : null
		});

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c83bcf4fc75b630d16ea", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c83bcf4fc75b630d16ea", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/dual", authInternal, async (request, response) => {
	try {
		const results = await data.dualSave(request.body.dual);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c821cf4fc75b630d14e9", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c821cf4fc75b630d14e9", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/dual", authInternal, async (request, response) => {
	try {
		const results = await data.dualDelete(request.query.id);

		if (results.error) {
			// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c83bcf4fc75b630d16ea", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516c83bcf4fc75b630d16ea", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/teamevent", authInternal, async (request, response) => {
	try {
		const results = await data.teamEventGet({
			id: request.query.id,
			startDate: request.query.startdate,
			endDate: request.query.enddate,
			division: request.query.division,
			eventId: request.query.eventid
		});

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/teamevent", authInternal, async (request, response) => {
	try {
		const results = await data.teamEventSave(request.body.teamEvent);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/teamevent", authInternal, async (request, response) => {
	try {
		const results = await data.teamEventDelete(request.query.id);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/parentemail", authInternal, async (request, response) => {
	try {
		const results = await data.parentEmailGet({
			id: request.query.id,
			status: request.query.status,
			searchQuery: request.query.searchquery
		});

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/parentemail", authInternal, async (request, response) => {
	try {
		const results = await data.parentEmailSave(request.body.parentEmail || request.body.parentemail || request.body.saveRecord);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/parentemail/bulk", authInternal, async (request, response) => {
	try {
		const results = await data.parentEmailBulkSave(request.body.records);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/parentemail/status", authInternal, async (request, response) => {
	try {
		const results = await data.parentEmailBulkStatus(request.body.ids, request.body.status);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/parentemail", authInternal, async (request, response) => {
	try {
		const results = await data.parentEmailDelete(request.query.id);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/serverconfig", authInternal, async (request, response) => {
	try {
		const results = await data.serverConfigGet({
			id: request.query.id,
			key: request.query.key
		});

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/serverconfig", authInternal, async (request, response) => {
	try {
		const results = await data.serverConfigSave(request.body.serverConfig || request.body.saveRecord || request.body);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/serverconfig", authInternal, async (request, response) => {
	try {
		const results = await data.serverConfigDelete(request.query.id || request.query.key);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/wrestlerevent", authInternal, async (request, response) => {
	try {
		const results = await data.wrestlerEventGet({
			id: request.query.id,
			ids: request.query.ids ? JSON.parse(request.query.ids) : null,
			wrestlerId: request.query.wrestlerid,
			wrestlerSqlId: request.query.wrestlersqlid ? parseInt(request.query.wrestlersqlid) : null,
			sqlId: request.query.sqlid ? parseInt(request.query.sqlid) : null,
			team: request.query.team,
			startDate: request.query.startdate,
			endDate: request.query.enddate
		});

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/wrestlerevent", authInternal, async (request, response) => {
	try {
		const results = await data.wrestlerEventSave(request.body.wrestlerEvent);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/wrestlerevent", authInternal, async (request, response) => {
	try {
		const results = await data.wrestlerEventDelete(request.query.id);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/wrestlerevent/bulk", authInternal, async (request, response) => {
	try {
		const results = await data.wrestlerEventBulkSave(request.body.wrestlerevents);

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/wrestlerduplicates", authInternal, async (request, response) => {
	try {
		const results = await data.wrestlerDuplicates(request.body.wrestlerids);
		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/duplicate", authInternal, async (request, response) => {
	try {
		const results = await data.duplicateGet({ id: request.query.id, status: request.query.status });
		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/duplicate", authInternal, async (request, response) => {
	try {
		const results = await data.duplicateSave(request.body.duplicate);
		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/duplicate", authInternal, async (request, response) => {
	try {
		const results = await data.duplicateDelete(request.query.id);
		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		response.status(570).json({ error: error.message });
	}
});

export default router;
