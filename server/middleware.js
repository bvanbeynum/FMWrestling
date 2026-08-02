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

export const extractOpponentTeam = (eventRecord) => {
	if (!eventRecord) return "";
	const matchesList = eventRecord.matches || [];
	for (let matchIndex = 0; matchIndex < matchesList.length; matchIndex++) {
		const matchItem = matchesList[matchIndex];
		const wrestlersList = matchItem.wrestlers || [];
		for (let wrestlerIndex = 0; wrestlerIndex < wrestlersList.length; wrestlerIndex++) {
			const wrestlerItem = wrestlersList[wrestlerIndex];
			if (wrestlerItem && wrestlerItem.team && !/fort mill/i.test(wrestlerItem.team.trim())) {
				return wrestlerItem.team.trim();
			}
		}
	}
	if (eventRecord.name && eventRecord.name.includes(" vs ")) {
		const nameParts = eventRecord.name.split(" vs ");
		const candidateOpponent = nameParts[1] ? nameParts[1].trim() : "";
		if (candidateOpponent && !/fort mill/i.test(candidateOpponent)) {
			return candidateOpponent;
		}
	}
	return "";
};

export const extractEventDivision = (eventRecord) => {
	if (!eventRecord) return "Varsity";
	const matchesList = eventRecord.matches || [];
	if (matchesList.length > 0 && matchesList[0].division) {
		return matchesList[0].division;
	}
	return "Varsity";
};

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
			.map(wrestler => ({
				id: wrestler.id,
				name: wrestler.name,
				rating: wrestler.rating,
				weightClass: wrestler.schoolWeightClass || wrestler.lastWeightClass,
				division: wrestler.schoolDivision,
				lastEventDate: wrestler.lastEvent ? new Date(wrestler.lastEvent.date) : null
			}))
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
				.filter(wrestler => wrestler.states && wrestler.states.includes("SC"))
				.map(wrestler => ({
					id: wrestler.id,
					name: wrestler.name,
					rating: wrestler.rating,
					weightClass: wrestler.schoolWeightClass || wrestler.lastWeightClass,
					division: wrestler.schoolDivision,
					lastEventDate: wrestler.lastEvent ? new Date(wrestler.lastEvent.date) : null
				}))
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
