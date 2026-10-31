import express from "express";
import client from "superagent";
import crypto from "crypto";
import { google } from "googleapis";
import config from "./config.js";
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
	const eventMatches = eventRecord.matches || [];
	for (let matchIndex = 0; matchIndex < eventMatches.length; matchIndex++) {
		const matchItem = eventMatches[matchIndex];
		const matchWrestlers = matchItem.wrestlers || [];
		for (let wrestlerIndex = 0; wrestlerIndex < matchWrestlers.length; wrestlerIndex++) {
			const wrestlerItem = matchWrestlers[wrestlerIndex];
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
	const eventMatches = eventRecord.matches || [];
	if (eventMatches.length > 0 && eventMatches[0].divisionConvert) {
		return eventMatches[0].divisionConvert;
	}
	if (eventMatches.length > 0 && eventMatches[0].division) {
		return eventMatches[0].division;
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

export const extractEmailBody = (payload) => {
	if (!payload) return "";

	const findPart = (part, mimeType) => {
		if (part.mimeType === mimeType && part.body && part.body.data) {
			return part.body.data;
		}
		if (part.parts && part.parts.length > 0) {
			for (const subPart of part.parts) {
				const result = findPart(subPart, mimeType);
				if (result) return result;
			}
		}
		return null;
	};

	// 1. Try text/plain recursively
	let bodyData = findPart(payload, "text/plain");

	// 2. Try text/html recursively if text/plain is missing
	if (!bodyData) {
		bodyData = findPart(payload, "text/html");
	}

	// 3. Fallback to direct payload body data if singlepart
	if (!bodyData && payload.body && payload.body.data) {
		bodyData = payload.body.data;
	}

	if (bodyData) {
		try {
			return Buffer.from(bodyData, "base64url").toString("utf-8");
		} catch {
			return Buffer.from(bodyData, "base64").toString("utf-8");
		}
	}

	return "";
};

export const extractEmailAttachments = (payload) => {
	if (!payload) return [];
	const attachments = [];

	const traverse = (part) => {
		if (!part) return;
		const filename = part.filename;
		const attachmentId = part.body ? part.body.attachmentId : null;

		if (filename && filename.trim().length > 0 && (attachmentId || (part.body && part.body.data))) {
			attachments.push({
				attachmentId: attachmentId || null,
				partId: part.partId || null,
				filename: filename.trim(),
				mimeType: part.mimeType || "application/octet-stream",
				size: part.body ? part.body.size || 0 : 0
			});
		}

		if (part.parts && part.parts.length > 0) {
			for (const subPart of part.parts) {
				traverse(subPart);
			}
		}
	};

	traverse(payload);
	return attachments;
};

export const getGoogleOAuthClient = async (serverPath) => {
	const configResponse = await client.get(`${serverPath}/data/serverconfig?key=googleAuth`);
	const serverConfigs = configResponse.body && configResponse.body.serverConfigs;
	if (!serverConfigs || serverConfigs.length === 0 || !serverConfigs[0].value || !serverConfigs[0].value.refreshToken) {
		return { error: "Google account not connected", status: 401 };
	}

	const googleAuthValue = serverConfigs[0].value;
	const cipherAlgorithm = "aes-256-cbc";
	const secretKeyText = config.sessionSecret || config.jwt || "fortmill_wrestling_session_secret_key_123456789";
	const derivedKey = crypto.createHash("sha256").update(secretKeyText).digest();
	const tokenSegments = googleAuthValue.refreshToken.split(":");
	const initializationVector = Buffer.from(tokenSegments.shift(), "hex");
	const encryptedPayload = Buffer.from(tokenSegments.join(":"), "hex");
	const decipherInstance = crypto.createDecipheriv(cipherAlgorithm, derivedKey, initializationVector);
	let decryptedData = decipherInstance.update(encryptedPayload);
	decryptedData = Buffer.concat([decryptedData, decipherInstance.final()]);
	const decryptedRefreshToken = decryptedData.toString();

	const authClient = new google.auth.OAuth2(
		config.google.client_id,
		config.google.client_secret,
		config.google.redirect_uris[0]
	);
	authClient.setCredentials({ refresh_token: decryptedRefreshToken });

	return { authClient, googleEmail: googleAuthValue.googleEmail || "" };
};

export const calculatePercentile = (values, percentileTarget) => {
	if (!values || values.length === 0) return 0;
	const sortedValues = [...values].sort((firstValue, secondValue) => firstValue - secondValue);
	if (sortedValues.length === 1) return sortedValues[0];
	const exactPosition = percentileTarget * (sortedValues.length - 1);
	const lowerIndex = Math.floor(exactPosition);
	const upperIndex = Math.ceil(exactPosition);
	if (lowerIndex === upperIndex) return sortedValues[lowerIndex];
	const interpolationWeight = exactPosition - lowerIndex;
	return sortedValues[lowerIndex] + interpolationWeight * (sortedValues[upperIndex] - sortedValues[lowerIndex]);
};

export const buildHtmlTable = (rows, columns, theadClass = "") => {
	const headerCells = columns.map(column => `<th>${column.label}</th>`).join("");
	const bodyRows = (rows || []).map(rowItem => {
		const rowCells = columns.map(column => {
			const cellValue = rowItem[column.key] !== undefined && rowItem[column.key] !== null ? rowItem[column.key] : "";
			return `<td>${cellValue}</td>`;
		}).join("");
		return `<tr>${rowCells}</tr>`;
	}).join("\n");

	return `<table border="1" class="dataframe table">\n  <thead${theadClass ? ` class="${theadClass}"` : ""}>\n    <tr style="text-align: right;">\n      ${headerCells}\n    </tr>\n  </thead>\n  <tbody>\n    ${bodyRows}\n  </tbody>\n</table>`;
};

export const computeFortMillWeeklyHighlights = (fortMillMatches, ratingHistoryByWrestler, includeRankColumn) => {
	const divisionOrderValue = (divisionName) => {
		if (divisionName === "Varsity" || divisionName === "HS") return 1;
		if (divisionName === "JV") return 2;
		if (divisionName === "Girls") return 3;
		if (divisionName === "Middle School" || divisionName === "MS") return 4;
		return 5;
	};

	// 1. Ironman
	const ironmanByDivisionAndWrestler = {};
	for (const matchEntry of fortMillMatches) {
		const groupKey = `${matchEntry.division}|${matchEntry.wrestlerName}`;
		if (!ironmanByDivisionAndWrestler[groupKey]) {
			ironmanByDivisionAndWrestler[groupKey] = {
				division: matchEntry.division,
				wrestlerName: matchEntry.wrestlerName,
				matchIdentifiers: new Set()
			};
		}
		ironmanByDivisionAndWrestler[groupKey].matchIdentifiers.add(matchEntry.matchKey);
	}

	const ironmanGroupsByDivision = {};
	for (const groupItem of Object.values(ironmanByDivisionAndWrestler)) {
		const matchCount = groupItem.matchIdentifiers.size;
		if (matchCount <= 0) continue;
		if (!ironmanGroupsByDivision[groupItem.division]) {
			ironmanGroupsByDivision[groupItem.division] = [];
		}
		ironmanGroupsByDivision[groupItem.division].push({
			division: groupItem.division,
			wrestlerName: groupItem.wrestlerName,
			matches: matchCount
		});
	}

	const ironmanRows = [];
	const sortedIronmanDivisions = Object.keys(ironmanGroupsByDivision).sort((firstDivision, secondDivision) => secondDivision.localeCompare(firstDivision));
	for (const divisionName of sortedIronmanDivisions) {
		const divisionEntries = ironmanGroupsByDivision[divisionName].sort((firstEntry, secondEntry) => {
			if (secondEntry.matches !== firstEntry.matches) return secondEntry.matches - firstEntry.matches;
			return firstEntry.wrestlerName.localeCompare(secondEntry.wrestlerName);
		});

		let currentRank = 1;
		for (let entryIndex = 0; entryIndex < divisionEntries.length; entryIndex++) {
			if (entryIndex > 0 && divisionEntries[entryIndex].matches < divisionEntries[entryIndex - 1].matches) {
				currentRank = entryIndex + 1;
			}
			if (currentRank <= 5) {
				const rowRecord = {
					division: divisionEntries[entryIndex].division,
					wrestler: divisionEntries[entryIndex].wrestlerName,
					matches: divisionEntries[entryIndex].matches
				};
				if (includeRankColumn) {
					rowRecord.rank = currentRank;
				}
				ironmanRows.push(rowRecord);
			}
		}
	}

	// 2. Bonus Points
	const bonusByDivisionAndWrestler = {};
	for (const matchEntry of fortMillMatches) {
		if (!matchEntry.isWinner) continue;
		const normalizedWinType = (matchEntry.winType || "").toLowerCase().trim();
		let matchBonusPoints = 0;
		if (normalizedWinType === "f" || normalizedWinType.includes("fall") || normalizedWinType.includes("for") || normalizedWinType === "ff") {
			matchBonusPoints = 2;
		} else if (normalizedWinType.includes("tf") || normalizedWinType.includes("md") || normalizedWinType.startsWith("maj")) {
			matchBonusPoints = 1.5;
		}
		if (matchBonusPoints <= 0) continue;

		const groupKey = `${matchEntry.division}|${matchEntry.wrestlerName}`;
		if (!bonusByDivisionAndWrestler[groupKey]) {
			bonusByDivisionAndWrestler[groupKey] = {
				division: matchEntry.division,
				wrestlerName: matchEntry.wrestlerName,
				bonusPoints: 0
			};
		}
		bonusByDivisionAndWrestler[groupKey].bonusPoints += matchBonusPoints;
	}

	const bonusGroupsByDivision = {};
	for (const groupItem of Object.values(bonusByDivisionAndWrestler)) {
		if (!bonusGroupsByDivision[groupItem.division]) {
			bonusGroupsByDivision[groupItem.division] = [];
		}
		bonusGroupsByDivision[groupItem.division].push(groupItem);
	}

	const bonusRows = [];
	const sortedBonusDivisions = Object.keys(bonusGroupsByDivision).sort((firstDivision, secondDivision) => secondDivision.localeCompare(firstDivision));
	for (const divisionName of sortedBonusDivisions) {
		const divisionEntries = bonusGroupsByDivision[divisionName].sort((firstEntry, secondEntry) => {
			if (secondEntry.bonusPoints !== firstEntry.bonusPoints) return secondEntry.bonusPoints - firstEntry.bonusPoints;
			return firstEntry.wrestlerName.localeCompare(secondEntry.wrestlerName);
		});

		let currentRank = 1;
		for (let entryIndex = 0; entryIndex < divisionEntries.length; entryIndex++) {
			if (entryIndex > 0 && divisionEntries[entryIndex].bonusPoints < divisionEntries[entryIndex - 1].bonusPoints) {
				currentRank = entryIndex + 1;
			}
			if (currentRank <= 5) {
				const rowRecord = {
					division: divisionEntries[entryIndex].division,
					wrestler: divisionEntries[entryIndex].wrestlerName,
					bonusPoints: divisionEntries[entryIndex].bonusPoints
				};
				if (includeRankColumn) {
					rowRecord.rank = currentRank;
				}
				bonusRows.push(rowRecord);
			}
		}
	}

	// 3. Forged in Fire
	const opponentMatchesByWrestler = {};
	for (const matchEntry of fortMillMatches) {
		const normalizedWinType = (matchEntry.winType || "").toLowerCase();
		if (normalizedWinType.includes("for") || normalizedWinType === "ff") continue;
		if (matchEntry.opponentRating === null || matchEntry.opponentRating === undefined) continue;

		const wrestlerKey = String(matchEntry.wrestlerSqlId || matchEntry.wrestlerId || matchEntry.wrestlerName);
		if (!opponentMatchesByWrestler[wrestlerKey]) {
			opponentMatchesByWrestler[wrestlerKey] = [];
		}
		opponentMatchesByWrestler[wrestlerKey].push(matchEntry);
	}

	const forgedCandidatesByDivisionAndWrestler = {};
	for (const wrestlerMatches of Object.values(opponentMatchesByWrestler)) {
		const opponentRatings = wrestlerMatches.map(matchItem => matchItem.opponentRating);
		const maxOpponentRating = Math.max(...opponentRatings);
		const thresholdPercentile = calculatePercentile(opponentRatings, 0.8);

		const sortedByOpponentRating = [...wrestlerMatches].sort((firstMatch, secondMatch) => secondMatch.opponentRating - firstMatch.opponentRating);

		let currentOpponentRank = 1;
		for (let matchIndex = 0; matchIndex < sortedByOpponentRating.length; matchIndex++) {
			if (matchIndex > 0 && sortedByOpponentRating[matchIndex].opponentRating < sortedByOpponentRating[matchIndex - 1].opponentRating) {
				currentOpponentRank = matchIndex + 1;
			}
			if (currentOpponentRank <= 2) {
				const currentMatch = sortedByOpponentRating[matchIndex];
				const overRatedFlag = currentMatch.opponentRating > thresholdPercentile ? 1 : 0;
				const groupKey = `${currentMatch.division}|${currentMatch.wrestlerName}`;
				if (!forgedCandidatesByDivisionAndWrestler[groupKey]) {
					forgedCandidatesByDivisionAndWrestler[groupKey] = {
						division: currentMatch.division,
						wrestlerName: currentMatch.wrestlerName,
						overRatedSum: 0,
						maxRating: maxOpponentRating,
						opponentEntries: []
					};
				}
				forgedCandidatesByDivisionAndWrestler[groupKey].overRatedSum += overRatedFlag;
				if (maxOpponentRating > forgedCandidatesByDivisionAndWrestler[groupKey].maxRating) {
					forgedCandidatesByDivisionAndWrestler[groupKey].maxRating = maxOpponentRating;
				}
				forgedCandidatesByDivisionAndWrestler[groupKey].opponentEntries.push({
					opponentRating: currentMatch.opponentRating,
					summaryLine: `* ${currentMatch.isWinner ? "Beat" : "Lost to"}  ${currentMatch.opponentName} (${currentMatch.opponentTeam})`
				});
			}
		}
	}

	const forgedGroupsByDivision = {};
	for (const candidateItem of Object.values(forgedCandidatesByDivisionAndWrestler)) {
		if (!forgedGroupsByDivision[candidateItem.division]) {
			forgedGroupsByDivision[candidateItem.division] = [];
		}
		candidateItem.opponentEntries.sort((firstOpponent, secondOpponent) => secondOpponent.opponentRating - firstOpponent.opponentRating);
		forgedGroupsByDivision[candidateItem.division].push({
			division: candidateItem.division,
			wrestlerName: candidateItem.wrestlerName,
			overRatedSum: candidateItem.overRatedSum,
			maxRating: candidateItem.maxRating,
			opponents: candidateItem.opponentEntries.map(opponentItem => opponentItem.summaryLine).join("\n")
		});
	}

	const forgedFireRows = [];
	const sortedForgedDivisions = Object.keys(forgedGroupsByDivision).sort((firstDivision, secondDivision) => {
		if (includeRankColumn) return secondDivision.localeCompare(firstDivision);
		return divisionOrderValue(firstDivision) - divisionOrderValue(secondDivision);
	});

	for (const divisionName of sortedForgedDivisions) {
		const divisionEntries = forgedGroupsByDivision[divisionName].sort((firstEntry, secondEntry) => {
			if (secondEntry.overRatedSum !== firstEntry.overRatedSum) return secondEntry.overRatedSum - firstEntry.overRatedSum;
			if (secondEntry.maxRating !== firstEntry.maxRating) return secondEntry.maxRating - firstEntry.maxRating;
			return firstEntry.wrestlerName.localeCompare(secondEntry.wrestlerName);
		});

		let currentRank = 1;
		for (let entryIndex = 0; entryIndex < divisionEntries.length; entryIndex++) {
			if (entryIndex > 0 && (
				divisionEntries[entryIndex].overRatedSum < divisionEntries[entryIndex - 1].overRatedSum ||
				divisionEntries[entryIndex].maxRating < divisionEntries[entryIndex - 1].maxRating
			)) {
				currentRank = entryIndex + 1;
			}
			if (currentRank <= 5) {
				const rowRecord = {
					division: divisionEntries[entryIndex].division,
					wrestler: divisionEntries[entryIndex].wrestlerName,
					opponents: divisionEntries[entryIndex].opponents
				};
				if (includeRankColumn) {
					rowRecord.rank = currentRank;
				}
				forgedFireRows.push(rowRecord);
			}
		}
	}

	// 4. Grinder
	const consiByDivisionAndWrestler = {};
	for (const matchEntry of fortMillMatches) {
		const normalizedRound = (matchEntry.roundName || "").toLowerCase().trim();
		const isConsolationMatch = normalizedRound.startsWith("3rd place") || normalizedRound.includes("th place") || normalizedRound.startsWith("cons");
		if (!isConsolationMatch) continue;

		const groupKey = `${matchEntry.division}|${matchEntry.wrestlerName}`;
		if (!consiByDivisionAndWrestler[groupKey]) {
			consiByDivisionAndWrestler[groupKey] = {
				division: matchEntry.division,
				wrestlerName: matchEntry.wrestlerName,
				consiMatches: 0
			};
		}
		consiByDivisionAndWrestler[groupKey].consiMatches += 1;
	}

	const grinderGroupsByDivision = {};
	for (const groupItem of Object.values(consiByDivisionAndWrestler)) {
		if (groupItem.consiMatches <= 1) continue;
		if (!grinderGroupsByDivision[groupItem.division]) {
			grinderGroupsByDivision[groupItem.division] = [];
		}
		grinderGroupsByDivision[groupItem.division].push(groupItem);
	}

	const grinderRows = [];
	const sortedGrinderDivisions = Object.keys(grinderGroupsByDivision).sort((firstDivision, secondDivision) => {
		if (includeRankColumn) return secondDivision.localeCompare(firstDivision);
		return divisionOrderValue(firstDivision) - divisionOrderValue(secondDivision);
	});

	for (const divisionName of sortedGrinderDivisions) {
		const divisionEntries = grinderGroupsByDivision[divisionName].sort((firstEntry, secondEntry) => {
			if (secondEntry.consiMatches !== firstEntry.consiMatches) return secondEntry.consiMatches - firstEntry.consiMatches;
			return firstEntry.wrestlerName.localeCompare(secondEntry.wrestlerName);
		});

		let currentRank = 1;
		for (let entryIndex = 0; entryIndex < divisionEntries.length; entryIndex++) {
			if (entryIndex > 0 && divisionEntries[entryIndex].consiMatches < divisionEntries[entryIndex - 1].consiMatches) {
				currentRank = entryIndex + 1;
			}
			if (currentRank <= 10) {
				const rowRecord = {
					division: divisionEntries[entryIndex].division,
					wrestler: divisionEntries[entryIndex].wrestlerName,
					consiMatches: divisionEntries[entryIndex].consiMatches
				};
				if (includeRankColumn) {
					rowRecord.rank = currentRank;
				}
				grinderRows.push(rowRecord);
			}
		}
	}

	// 5. Breakout Wrestler
	const breakoutByDivisionAndWrestler = {};
	for (const matchEntry of fortMillMatches) {
		const normalizedWinType = (matchEntry.winType || "").toLowerCase();
		if (!includeRankColumn && (normalizedWinType.includes("for") || normalizedWinType === "ff")) {
			continue;
		}
		if (matchEntry.rating === null || matchEntry.rating === undefined) continue;

		const wrestlerLookupKey = String(matchEntry.wrestlerSqlId || matchEntry.wrestlerId || "");
		const ratingHistoryEntries = ratingHistoryByWrestler[wrestlerLookupKey] || [];
		if (ratingHistoryEntries.length === 0) continue;

		const eventTime = new Date(matchEntry.eventDate).getTime();
		let currentPeriodTime = matchEntry.periodEndDate ? new Date(matchEntry.periodEndDate).getTime() : eventTime;

		const previousRatingEntry = ratingHistoryEntries.find(historyItem => new Date(historyItem.periodEndDate).getTime() < currentPeriodTime);
		if (!previousRatingEntry || previousRatingEntry.rating === undefined || previousRatingEntry.rating === null) continue;

		const ratingImprovement = matchEntry.rating - previousRatingEntry.rating;
		if (ratingImprovement <= 10) continue;

		const groupKey = `${matchEntry.division}|${matchEntry.wrestlerName}|${matchEntry.rating}|${previousRatingEntry.rating}`;
		if (!breakoutByDivisionAndWrestler[groupKey]) {
			breakoutByDivisionAndWrestler[groupKey] = {
				division: matchEntry.division,
				wrestlerName: matchEntry.wrestlerName,
				improvement: ratingImprovement,
				keyWinEntries: []
			};
		}
		if (matchEntry.isWinner && matchEntry.opponentName) {
			breakoutByDivisionAndWrestler[groupKey].keyWinEntries.push({
				matchKey: matchEntry.matchKey,
				winLine: `- Defeated ${matchEntry.opponentName} (${matchEntry.opponentTeam})`
			});
		}
	}

	const breakoutGroupsByDivision = {};
	for (const groupItem of Object.values(breakoutByDivisionAndWrestler)) {
		if (!breakoutGroupsByDivision[groupItem.division]) {
			breakoutGroupsByDivision[groupItem.division] = [];
		}
		const uniqueWinLines = [];
		const seenMatchKeys = new Set();
		for (const winEntry of groupItem.keyWinEntries) {
			if (!seenMatchKeys.has(winEntry.matchKey)) {
				seenMatchKeys.add(winEntry.matchKey);
				uniqueWinLines.push(winEntry.winLine);
			}
		}
		breakoutGroupsByDivision[groupItem.division].push({
			division: groupItem.division,
			wrestlerName: groupItem.wrestlerName,
			improvement: groupItem.improvement,
			keyWins: uniqueWinLines.join("\n")
		});
	}

	const breakoutRows = [];
	const sortedBreakoutDivisions = Object.keys(breakoutGroupsByDivision).sort((firstDivision, secondDivision) => secondDivision.localeCompare(firstDivision));
	for (const divisionName of sortedBreakoutDivisions) {
		const divisionEntries = breakoutGroupsByDivision[divisionName].sort((firstEntry, secondEntry) => {
			if (secondEntry.improvement !== firstEntry.improvement) return secondEntry.improvement - firstEntry.improvement;
			return firstEntry.wrestlerName.localeCompare(secondEntry.wrestlerName);
		});

		let currentRank = 1;
		for (let entryIndex = 0; entryIndex < divisionEntries.length; entryIndex++) {
			if (entryIndex > 0 && divisionEntries[entryIndex].improvement < divisionEntries[entryIndex - 1].improvement) {
				currentRank = entryIndex + 1;
			}
			if (currentRank <= 5) {
				const rowRecord = {
					division: divisionEntries[entryIndex].division,
					wrestler: divisionEntries[entryIndex].wrestlerName,
					keyWins: divisionEntries[entryIndex].keyWins
				};
				if (includeRankColumn) {
					rowRecord.rank = currentRank;
				}
				breakoutRows.push(rowRecord);
			}
		}
	}

	return {
		ironman: ironmanRows,
		bonus: bonusRows,
		forgedFire: forgedFireRows,
		grinder: grinderRows,
		breakout: breakoutRows
	};
};



