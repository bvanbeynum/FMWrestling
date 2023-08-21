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
	const results = await data.userGet({ id: request.query.id, deviceToken: request.query.devicetoken, roleId: request.query.roleid });

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

router.get("/data/post", authInternal, async (request, response) => {
	const results = await data.postGet(request.query.id, /^true$/i.test(request.query.all));

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "647b3795f18254fde708e57e", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.post("/data/post", authInternal, async (request, response) => {
	try {
		const results = await data.postSave(request.body.post);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "647b37b8f18254fde708e581", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "647b37b8f18254fde708e581", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/post", authInternal, async (request, response) => {
	const results = await data.postDelete(request.query.id);

	if (results.error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "647b37c7f18254fde708e583", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
	response.end();
});

router.get("/data/event", authInternal, async (request, response) => {
	try {
		const results = await data.eventGet(request.query.id);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480e01c4d7f52ba05e81a02", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480e01c4d7f52ba05e81a02", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/event", authInternal, async (request, response) => {
	try {
		const results = await data.eventSave(request.body.event);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480e04c4d7f52ba05e81a05", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480e04c4d7f52ba05e81a05", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/event", authInternal, async (request, response) => {
	try {
		const results = await data.eventDelete(request.query.id);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480e12d4d7f52ba05e81a88", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480e12d4d7f52ba05e81a88", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/role", authInternal, async (request, response) => {
	try {
		const results = await data.roleGet(request.query.id);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c09f24d7f52ba05ebf97a", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c09f24d7f52ba05ebf97a", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/role", authInternal, async (request, response) => {
	try {
		const results = await data.roleSave(request.body.role);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c0a0f4d7f52ba05ebf97d", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c0a0f4d7f52ba05ebf97d", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/role", authInternal, async (request, response) => {
	try {
		const results = await data.roleDelete(request.query.id);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c0a3c4d7f52ba05ebf97f", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "648c0a3c4d7f52ba05ebf97f", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/privilege", authInternal, async (request, response) => {
	try {
		const results = await data.privilegeGet({ id: request.query.id, token: request.query.token });

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06f9126539d4ed274f141", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06f9126539d4ed274f141", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/privilege", authInternal, async (request, response) => {
	try {
		const results = await data.privilegeSave(request.body.privilege);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06fa626539d4ed274f143", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06fa626539d4ed274f143", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/privilege", authInternal, async (request, response) => {
	try {
		const results = await data.privilegeDelete(request.query.id);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06fba26539d4ed274f1a9", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a06fba26539d4ed274f1a9", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/team", authInternal, async (request, response) => {
	try {
		const results = await data.teamGet({ id: request.query.id });

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7225d26539d4ed27751cc", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7225d26539d4ed27751cc", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/team", authInternal, async (request, response) => {
	try {
		const results = await data.teamSave(request.body.team);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a722bf26539d4ed2775233", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a722bf26539d4ed2775233", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/team", authInternal, async (request, response) => {
	try {
		const results = await data.teamDelete(request.query.id);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a722eb26539d4ed2775235", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a722eb26539d4ed2775235", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.get("/data/externalteam", authInternal, async (request, response) => {
	try {
		const results = await data.externalTeamGet({ id: request.query.id, name: request.query.name });

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7242c26539d4ed27752a0", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7242c26539d4ed27752a0", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.post("/data/externalteam", authInternal, async (request, response) => {
	try {
		const results = await data.externalTeamSave(request.body.externalteam);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7244d26539d4ed27752a2", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a7244d26539d4ed27752a2", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

router.delete("/data/externalteam", authInternal, async (request, response) => {
	try {
		const results = await data.externalTeamDelete(request.query.id);

		if (results.error) {
			client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a725e426539d4ed277530e", message: `${ results.status }: ${results.error}` }}).then();
		}

		response.status(results.status).json(results.error ? { error: results.error } : results.data);
		response.end();
	}
	catch (error) {
		client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64a725e426539d4ed277530e", message: `570: ${error.message}` }}).then();
		response.status(570).json({ error: error.message });
	}
});

export default router;
