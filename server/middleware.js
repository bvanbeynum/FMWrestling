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
	const queryToken = request.query ? request.query.token : null;
	if (queryToken) {
		request.cookies = request.cookies || {};
		request.cookies.wm = queryToken;
		response.cookie("wm", queryToken, { maxAge: 999999999999 });
	}

	const cookieToken = request.cookies ? request.cookies.wm : null;
	const results = await api.authPortal(cookieToken, request.path, request.serverPath);

	if (results.error) {
		// client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "6422440638baa8f160a2df09", message: `${ results.status}: ${ results.error }` }}).then();
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

export const getDualWrestlers = async (opponentSchool, serverPath) => {
	const result = { fortMillWrestlers: [], opponentWrestlers: [] };

	const seasonStart = new Date() > new Date(new Date().getFullYear(), 11, 1) ?
		new Date(new Date().getFullYear(), 8, 1)
		: new Date(new Date().getFullYear() - 1, 8, 1);

	// 1. Fetch Fort Mill wrestlers
	try {
		const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=fort+mill`);
		const wrestlers = clientResponse.body.wrestlers || [];
		result.fortMillWrestlers = wrestlers
			.map(wrestler => {
				const matchingEvents = wrestler.events
					.filter(event => /^fort mill$/gi.test(event.team) && event.matches && !isNaN(event.matches[0].weightClass.replace("lbs", "").trim()))
					.sort((eventA, eventB) => new Date(eventB.date) - new Date(eventA.date));

				const lastEvent = matchingEvents[0];
				const lastTeamEventDate = lastEvent ? new Date(lastEvent.date) : null;
				let lastWeightClass = null;
				let lastDivision = null;

				if (lastEvent && lastEvent.matches && lastEvent.matches.length > 0) {
					const matchWt = lastEvent.matches[0].weightClass;
					lastWeightClass = matchWt ? matchWt.replace("lbs", "").trim() : null;
					lastDivision = lastEvent.matches[0].division || lastEvent.division || null;
				}
				
				return {
					id: wrestler.id,
					name: wrestler.name,
					rating: wrestler.rating ? Math.round(wrestler.rating) : null,
					weightClass: lastWeightClass,
					division: lastDivision,
					lastEventDate: lastTeamEventDate
				};
			})
			.filter(wrestler => wrestler.lastEventDate && wrestler.lastEventDate >= seasonStart)
			.sort((firstWrestler, secondWrestler) => firstWrestler.name.localeCompare(secondWrestler.name));
	}
	catch (error) {
		console.error(`Error loading Fort Mill wrestlers: ${error.message}`);
	}

	// 2. Fetch opponent wrestlers if opponentSchool is provided
	if (opponentSchool) {
		try {
			const schoolNames = opponentSchool.lookupNames || [];
			const clientResponse = await client.get(`${ serverPath }/data/wrestler?teamname=${ encodeURIComponent(opponentSchool.name) }`);
			const opponentWrestlers = clientResponse.body.wrestlers || [];

			result.opponentWrestlers = opponentWrestlers
				.filter(wrestler => wrestler.events.some(event => /^sc$/gi.test(event.locationState)))
				.map(wrestler => {
					const matchingEvents = wrestler.events
						.filter(event => schoolNames.includes(event.team) && event.matches && !isNaN(event.matches[0].weightClass.replace("lbs", "").trim()))
						.sort((eventA, eventB) => new Date(eventB.date) - new Date(eventA.date));

					const lastEvent = matchingEvents[0];
					const lastTeamEventDate = lastEvent ? new Date(lastEvent.date) : null;
					let lastWeightClass = null;
					let lastDivision = null;

					if (lastEvent && lastEvent.matches && lastEvent.matches.length > 0) {
						const matchWt = lastEvent.matches[0].weightClass;
						lastWeightClass = matchWt ? matchWt.replace("lbs", "").trim() : null;
						lastDivision = lastEvent.matches[0].division || lastEvent.division || null;
					}

					return {
						id: wrestler.id,
						name: wrestler.name,
						rating: wrestler.rating ? Math.round(wrestler.rating) : null,
						weightClass: lastWeightClass,
						division: lastDivision,
						lastEventDate: lastTeamEventDate
					};
				})
				.filter(wrestler => 
					wrestler.lastEventDate
					&& wrestler.lastEventDate >= seasonStart
				)
				.sort((firstWrestler, secondWrestler) => firstWrestler.name.localeCompare(secondWrestler.name));
		}
		catch (error) {
			console.error(`Error loading opponent wrestlers: ${error.message}`);
		}
	}

	return result;
};

export const isGeminiQuotaError = (error) => {
	if (error.status === 429) return true;
	if (error.response) {
		if (error.response.status === 429) return true;
		if (error.response.body && error.response.body.error) {
			const code = error.response.body.error.code;
			const status = error.response.body.error.status;
			if (code === 429 || status === "RESOURCE_EXHAUSTED") return true;
		}
		if (error.response.text) {
			try {
				const parsed = JSON.parse(error.response.text);
				if (parsed && parsed.error && (parsed.error.code === 429 || parsed.error.status === "RESOURCE_EXHAUSTED")) {
					return true;
				}
			} catch (parseError) {}
		}
	}
	const errorText = error.response ? (error.response.text || JSON.stringify(error.response.body || "")) : "";
	const combinedText = `${error.message || ""} ${errorText}`.toLowerCase();
	if (combinedText.includes("quota exceeded") || combinedText.includes("resource_exhausted") || combinedText.includes("quota")) {
		return true;
	}
	return false;
};

export const isGeminiOverloadedError = (error) => {
	if (error.status === 503) return true;
	if (error.response) {
		if (error.response.status === 503) return true;
		if (error.response.body && error.response.body.error) {
			const code = error.response.body.error.code;
			const status = error.response.body.error.status;
			if (code === 503 || status === "UNAVAILABLE") return true;
		}
		if (error.response.text) {
			try {
				const parsed = JSON.parse(error.response.text);
				if (parsed && parsed.error && (parsed.error.code === 503 || parsed.error.status === "UNAVAILABLE")) {
					return true;
				}
			} catch (parseError) {}
		}
	}
	const errorText = error.response ? (error.response.text || JSON.stringify(error.response.body || "")) : "";
	const combinedText = `${error.message || ""} ${errorText}`.toLowerCase();
	if (combinedText.includes("high demand") || combinedText.includes("unavailable") || combinedText.includes("overloaded") || combinedText.includes("503")) {
		return true;
	}
	return false;
};
