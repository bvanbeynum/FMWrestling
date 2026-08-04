import express from "express";
import client from "superagent";
import crypto from "crypto";
import api from "./api.js";
import browser from "express-useragent";

const router = express.Router();
const jobs = {};

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
	const results = await api.scheduleLoad(request.serverPath, request.query.startdate, request.query.enddate, request.query.state);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6480db2b4d7f52ba05e8180d", message: `${ results.status }: ${results.error}` }}).then();
	}
	
	const output = { loggedInUser: request.user, ...results.data };

	response.status(results.status).json(results.error ? { error: results.error } : output);
});

router.get("/api/eventdetailsload", authAPI, async (request, response) => {
	if (!request.query.id) {
		return response.status(400).json({ error: "Missing event ID" });
	}
	const results = await api.eventDetailsLoad(request.serverPath, request.query.id);
	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
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

router.post("/api/scmatteambulksave", authAPI, async (request, response) => {
	const results = await api.scmatTeamBulkSave(request.body.teamssave, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6516f5c0cf4fc75b63100c9d", message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/eventsbulksave", authAPI, async (request, response) => {
	const results = await api.eventsBulkSave(request.body.events, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64ed20be26539d4ed2915eed", message: `${ results.status }: ${results.error}` }}).then();
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
	const results = await api.wrestlerSearchRanking("SC", null, request.serverPath);

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

router.get("/api/wrestlergraph", authAPI, async (request, response) => {
	const results = await api.wrestlerOpponentsGraph(request.query.id, request.query.months, request.serverPath);

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.get("/api/wrestlersearchranking", authAPI, async (request, response) => {
	const results = await api.wrestlerSearchRanking(request.query.state, request.query.weightclass, request.serverPath);

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

// ***************** Duals ********************

router.get("/api/dualreportload", authAPI, async (request, response) => {
	const results = await api.dualReportLoad(request.query.season, request.serverPath);
	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.get("/api/dualload", authAPI, async (request, response) => {
	const results = await api.dualLoad(request.query.id, request.serverPath);

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.post("/api/dualupload", authAPI, async (request, response) => {
	if (request.busboy) {
		const jobId = crypto.randomUUID();
		jobs[jobId] = { 
			status: "processing",
			currentStage: "RECEIVING_FILE",
			stageMessage: "Uploading scoresheet file...",
			completedStages: [],
			geminiStep: 0,
			totalGeminiSteps: 3
		};

		const updateProgress = (stageKey, message, geminiStep) => {
			if (jobs[jobId] && jobs[jobId].status === "processing") {
				if (jobs[jobId].currentStage && !jobs[jobId].completedStages.includes(jobs[jobId].currentStage)) {
					jobs[jobId].completedStages.push(jobs[jobId].currentStage);
				}
				jobs[jobId].currentStage = stageKey;
				if (message) jobs[jobId].stageMessage = message;
				if (typeof geminiStep === "number") jobs[jobId].geminiStep = geminiStep;
			}
		};

		request.busboy.on("file", (fieldname, file, { filename, encoding, mimeType }) => {
			const chunks = [];

			file.on("data", (chunk) => {
				chunks.push(chunk);
			});

			file.on("error", (err) => {
				jobs[jobId] = { status: "error", error: "File stream error: " + err.message };
			});

			file.on("end", async () => {
				const imageBuffer = Buffer.concat(chunks);

				let detectedMimeType = mimeType;
				if (filename) {
					const lowerName = filename.toLowerCase();
					if (lowerName.endsWith(".heic")) {
						detectedMimeType = "image/heic";
					} else if (lowerName.endsWith(".heif")) {
						detectedMimeType = "image/heif";
					} else if (lowerName.endsWith(".png")) {
						detectedMimeType = "image/png";
					} else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
						detectedMimeType = "image/jpeg";
					} else if (lowerName.endsWith(".webp")) {
						detectedMimeType = "image/webp";
					}
				}

				api.dualUpload(imageBuffer, detectedMimeType, request.serverPath, updateProgress)
					.then(results => {
						if (results.error) {
							jobs[jobId] = { status: "error", statusCode: results.status, error: results.error };
						} else {
							jobs[jobId] = { status: "completed", data: results.data };
						}
					})
					.catch(error => {
						jobs[jobId] = { status: "error", error: error.message };
					});
			});
		});

		request.busboy.on("error", (err) => {
			jobs[jobId] = { status: "error", error: "Busboy error: " + err.message };
		});

		request.busboy.on("finish", () => {
			response.status(202).json({ jobId });
		});
		
		request.pipe(request.busboy);
	} else {
		response.status(400).json({ error: "File upload error" });
	}
});

router.get("/api/dualupload/:jobId", authAPI, (request, response) => {
	const jobId = request.params.jobId;
	const job = jobs[jobId];

	if (job) {
		if (job.status === "completed") {
			const jobData = jobs[jobId].data;
			delete jobs[jobId];
			response.status(200).json({ status: "completed", ...jobData });
		} else {
			response.status(200).json(job);
		}
	} else {
		response.status(404).json({ status: "not_found" });
	}
});

router.post("/api/dualsave", authAPI, async (request, response) => {
	const results = await api.dualSave(request.body.dual, request.serverPath);

	if (results.error) {
		console.log(`Error ${results.status}: ${ results.error }`);
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

router.post("/api/dualdelete", authAPI, async (request, response) => {
	const results = await api.dualDelete(request.body.id, request.serverPath);

	if (results.error) {
		console.log(`Error ${results.status}: ${ results.error }`);
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

router.get("/api/duplicatesload", authAPI, async (request, response) => {
	const results = await api.duplicatesLoad();

	response.status(results.status).json(results.error ? { error: results.error } : { loggedInUser: request.user, ...results.data });
});

router.get("/api/duplicatessearch", authAPI, async (request, response) => {
	const results = await api.duplicatesSearch(request.query.dayspast, request.serverPath);

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

router.post("/api/duplicatesmerge", authAPI, async (request, response) => {
	const results = await api.duplicatesMerge(request.body.duplicatesets, request.serverPath);

	if (results.error) {
		console.log(`Error ${results.status}: ${ results.error }`);
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data );
});

router.post("/api/schedulesave", authAPI, async (request, response) => {
	if (!request.user || !request.user.privileges || !request.user.privileges.includes("scheduleManage")) {
		return response.status(401).json({ error: "Unauthorized" });
	}

	const results = await api.scheduleSave(request.body.teamEvent, request.body.opponent, request.serverPath);
	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

router.post("/api/teameventdelete", authAPI, async (request, response) => {
	if (!request.user || !request.user.privileges || !request.user.privileges.includes("scheduleManage")) {
		return response.status(401).json({ error: "Unauthorized" });
	}

	const results = await api.teamEventDelete(request.body.id, request.serverPath);
	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

// ***************** Parent Email ********************

router.get("/api/parentemailload", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const resultsObject = await api.parentEmailLoad(requestObject.serverPath, requestObject.query.status);
	responseObject.status(resultsObject.status).json(resultsObject.error ? { error: resultsObject.error } : { loggedInUser: requestObject.user, ...resultsObject.data });
});

router.post("/api/parentemailsave", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const resultsObject = await api.parentEmailSave(requestObject.body.saveRecord, requestObject.serverPath);
	responseObject.status(resultsObject.status).json(resultsObject.error ? { error: resultsObject.error } : resultsObject.data);
});

router.post("/api/parentemailbulkupload", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const resultsObject = await api.parentEmailBulkUpload(requestObject.body.records, requestObject.serverPath);
	responseObject.status(resultsObject.status).json(resultsObject.error ? { error: resultsObject.error } : resultsObject.data);
});

router.post("/api/parentemailbulkstatus", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const resultsObject = await api.parentEmailBulkStatus(requestObject.body.ids, requestObject.body.status, requestObject.serverPath);
	responseObject.status(resultsObject.status).json(resultsObject.error ? { error: resultsObject.error } : resultsObject.data);
});

router.post("/api/parentemaildelete", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const resultsObject = await api.parentEmailDelete(requestObject.body.id, requestObject.serverPath);
	responseObject.status(resultsObject.status).json(resultsObject.error ? { error: resultsObject.error } : resultsObject.data);
});

// ***************** AI Email & Google OAuth ********************

router.get("/api/aiemailgoogleauth", async (requestObject, responseObject) => {
	await api.authGoogle(requestObject, responseObject);
});

router.get("/api/aiemailgoogleauthcallback", async (requestObject, responseObject) => {
	await api.authGoogleCallback(requestObject, responseObject);
});

router.get("/api/aiemailstatus", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const resultsObject = await api.aiEmailGetStatus(requestObject.serverPath);
	responseObject.status(resultsObject.status || 200).json(resultsObject);
});

router.get("/api/aiemailinbox", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const resultsObject = await api.aiEmailLoadInbox(requestObject.serverPath);
	responseObject.status(resultsObject.status || 200).json(resultsObject.error ? { error: resultsObject.error } : resultsObject);
});

router.post("/api/aiemailgenerate", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const { subject, body, from } = requestObject.body;
	const resultsObject = await api.aiEmailGenerateResponse(subject, body, from);
	responseObject.status(resultsObject.status || 200).json(resultsObject.error ? { error: resultsObject.error } : resultsObject);
});

router.post("/api/aiemailsend", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const { messageId, recipients, subject, body } = requestObject.body;
	const resultsObject = await api.aiEmailSendAndArchive(requestObject.serverPath, messageId, recipients, subject, body);
	responseObject.status(resultsObject.status || 200).json(resultsObject.error ? { error: resultsObject.error } : resultsObject);
});

router.post("/api/aiemailarchive", authAPI, async (requestObject, responseObject) => {
	if (!requestObject.user || !requestObject.user.privileges || (!requestObject.user.privileges.includes("parentManage") && !requestObject.user.privileges.includes("parentmanage"))) {
		return responseObject.status(401).json({ error: "Unauthorized access" });
	}

	const { messageId } = requestObject.body;
	const resultsObject = await api.aiEmailArchiveMessage(requestObject.serverPath, messageId);
	responseObject.status(resultsObject.status || 200).json(resultsObject.error ? { error: resultsObject.error } : resultsObject);
});


router.post("/api/wrestlereventsbulksave", authAPI, async (request, response) => {
	const results = await api.wrestlerEventBulkSave(request.body.wrestlerEvents, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), message: `${ results.status }: ${results.error}` }}).then();
	}

	response.status(results.status).json(results.error ? { error: results.error } : results.data);
});

export default router;
