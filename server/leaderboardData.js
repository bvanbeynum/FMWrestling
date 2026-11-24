// ============================================================================
// SHARED PURE LEADERBOARD DATA & RANKING LOGIC
// Used by both server PDF/Email generation and client React UI.
// ============================================================================

export const PRINT_DIVISION_GROUPS = [
	{ key: "varsity", label: "Varsity", matchDivisions: ["Varsity", "HS"] },
	{ key: "jv", label: "JV & Girls", matchDivisions: ["JV", "Girls"] },
	{ key: "ms", label: "Middle School", matchDivisions: ["Middle School", "MS"] }
];

export const PRIORITY_STAT_CATEGORIES = [
	{ key: "points", label: "Dual Points", shortLabel: "Dual Pts", type: "count" },
	{ key: "careerWins", label: "Career Record", shortLabel: "Career", type: "record", lossesKey: "careerLosses" },
	{ key: "wins", label: "Season Record", shortLabel: "Season", type: "record", lossesKey: "losses" },
	{ key: "pins", label: "Pins", shortLabel: "Pins", type: "count" },
	{ key: "techfalls", label: "Tech Falls", shortLabel: "TF", type: "count" },
	{ key: "majorDecisions", label: "Major Decisions", shortLabel: "MD", type: "count" },
	{ key: "decisions", label: "Decisions", shortLabel: "Dec", type: "count" },
	{ key: "forfeits", label: "Forfeits", shortLabel: "Forf", type: "count" },
	{ key: "takedowns", label: "Takedowns", shortLabel: "TD", type: "count" },
	{ key: "nearfalls", label: "Nearfalls", shortLabel: "NF", type: "count" },
	{ key: "reversals", label: "Reversals", shortLabel: "Rev", type: "count" },
	{ key: "escapes", label: "Escapes", shortLabel: "Esc", type: "count" }
];

export const shouldExcludeCareerRecord = (divisionOrKey) => {
	const normalized = String(divisionOrKey || "").trim().toLowerCase();
	return normalized === "jv" || normalized === "middle school" || normalized === "ms";
};

export const getStatCategoriesForDivision = (divisionOrKey) => {
	if (shouldExcludeCareerRecord(divisionOrKey)) {
		return PRIORITY_STAT_CATEGORIES.filter((cat) => cat.key !== "careerWins");
	}
	return PRIORITY_STAT_CATEGORIES;
};

export const parseEventDate = (dateInput) => {
	if (!dateInput) return null;
	if (dateInput instanceof Date) return dateInput;

	const dateString = dateInput.toString().trim();
	const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
	if (isoMatch) {
		const yearValue = parseInt(isoMatch[1], 10);
		const monthValue = parseInt(isoMatch[2], 10) - 1;
		const dayValue = parseInt(isoMatch[3], 10);
		const hoursValue = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
		const minutesValue = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
		const secondsValue = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

		return new Date(yearValue, monthValue, dayValue, hoursValue, minutesValue, secondsValue);
	}

	return new Date(dateInput);
};

export const getSeasonOptions = (dateObject = new Date()) => {
	const currentYear = dateObject.getFullYear();
	const currentMonth = dateObject.getMonth();
	const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;

	const formatSeason = (yearValue) => {
		const yearShortText = yearValue.toString().slice(-2);
		const nextYearShortText = (yearValue + 1).toString().slice(-2);
		return {
			name: `${yearShortText}-${nextYearShortText}`
		};
	};

	return [
		formatSeason(startYear + 1),
		formatSeason(startYear),
		formatSeason(startYear - 1)
	];
};

export const getSeasonStartYear = (seasonNameValue) => {
	if (seasonNameValue && /^\d{2}-\d{2}$/.test(seasonNameValue)) {
		const startYearShortValue = parseInt(seasonNameValue.split("-")[0], 10);
		return 2000 + startYearShortValue;
	}
	const currentTodayDate = new Date();
	return currentTodayDate.getMonth() >= 8 ? currentTodayDate.getFullYear() : currentTodayDate.getFullYear() - 1;
};

export const computeDivisionConvert = (division, eventName = "") => {
	const divText = String(division || "");
	const eventText = String(eventName || "");
	return (
		/^jv/i.test(divText) ? "JV" :
		/girl/i.test(divText) ? "Girls" :
		/women/i.test(divText) ? "Girls" :
		/woman/i.test(divText) ? "Girls" :
		/ms/i.test(divText) ? "Middle School" :
		/middle/i.test(divText) ? "Middle School" :
		/10U/i.test(divText) ? "Middle School" :
		/8U/i.test(divText) ? "Middle School" :
		/12U/i.test(divText) ? "Middle School" :
		/14U/i.test(divText) ? "Middle School" :
		/7[ &]*8/i.test(divText) ? "Middle School" :
		/9[ &]*10/i.test(divText) ? "JV" :
		/11[ &]*12/i.test(divText) ? "Middle School" :
		/jv/i.test(eventText) ? "JV" :
		/^hs/i.test(divText) ? "Varsity" :
		/high/i.test(divText) ? "Varsity" :
		/state tournament/i.test(divText) ? "Varsity" :
		/varsity/i.test(divText) ? "Varsity" :
		/hs/i.test(divText) ? "Varsity" :
		/\da/i.test(divText) ? "Varsity" :
		"Other"
	);
};

const RECOGNIZED_DIVISIONS = new Set(["Varsity", "JV", "Girls", "Middle School"]);

export const resolveEventDivision = (eventItem) => {
	if (!eventItem) return "Other";
	const eventMatches = Array.isArray(eventItem.matches) ? eventItem.matches : [];

	for (const matchItem of eventMatches) {
		const converted = String(matchItem?.divisionConvert || "").trim();
		if (RECOGNIZED_DIVISIONS.has(converted)) {
			return converted;
		}
	}

	const eventLevelConverted = String(eventItem.divisionConvert || "").trim();
	if (RECOGNIZED_DIVISIONS.has(eventLevelConverted)) {
		return eventLevelConverted;
	}

	for (const matchItem of eventMatches) {
		if (matchItem && matchItem.division) {
			const normalized = computeDivisionConvert(matchItem.division, eventItem.name);
			if (RECOGNIZED_DIVISIONS.has(normalized)) {
				return normalized;
			}
		}
	}

	if (eventItem.division || eventItem.name) {
		const normalizedEvent = computeDivisionConvert(eventItem.division, eventItem.name);
		if (RECOGNIZED_DIVISIONS.has(normalizedEvent)) {
			return normalizedEvent;
		}
	}

	return "Other";
};

const matchesDivision = (eventDivision, divisionFilter) => {
	if (!divisionFilter || divisionFilter === "All Divisions") {
		return true;
	}
	const normalizedEventDiv = String(eventDivision || "").trim().toLowerCase();
	if (Array.isArray(divisionFilter)) {
		return divisionFilter.some(
			targetDiv => String(targetDiv || "").trim().toLowerCase() === normalizedEventDiv
		);
	}
	return normalizedEventDiv === String(divisionFilter).trim().toLowerCase();
};

export const isDualEvent = (eventItem) => {
	if (!eventItem) return false;
	return String(eventItem.eventSystem || "").trim().toLowerCase() === "wrestlingportal";
};

export const isFortMillEvent = (eventItem) => {
	if (!eventItem) return false;
	const searchTeamText = String(eventItem.searchTeam || eventItem.team || "").trim().toLowerCase();
	return searchTeamText.includes("fort mill");
};

export const processLeaderboardData = (seasonWrestlers, divisionFilter, seasonNameValue) => {
	const startYearNumber = getSeasonStartYear(seasonNameValue);
	const inSeasonStartDate = new Date(startYearNumber, 10, 1, 0, 0, 0);
	const inSeasonEndDate = new Date(startYearNumber + 1, 2, 1, 23, 59, 59);

	const processedLeaderboardRecords = [];

	(seasonWrestlers || []).forEach((wrestlerItem) => {
		const wrestlerNameKey = (wrestlerItem.name || "").trim();
		if (!wrestlerNameKey) return;

		const wrestlerRecord = {
			id: wrestlerItem.id || wrestlerItem.sqlId,
			name: wrestlerNameKey,
			totalMatches: 0,
			dualMatches: 0,
			wins: 0,
			losses: 0,
			careerWins: 0,
			careerLosses: 0,
			points: 0,
			pins: 0,
			techfalls: 0,
			majorDecisions: 0,
			decisions: 0,
			forfeits: 0,
			takedowns: 0,
			nearfalls: 0,
			reversals: 0,
			escapes: 0,
			wrestledDivisions: new Set()
		};

		(wrestlerItem.events || []).forEach((eventItem) => {
			if (!isFortMillEvent(eventItem)) return;
			const rawEventDate = parseEventDate(eventItem.date);
			if (!rawEventDate || isNaN(rawEventDate.getTime())) return;

			const eventDivision = resolveEventDivision(eventItem);
			if (!matchesDivision(eventDivision, divisionFilter)) {
				return;
			}

			const eventMonth = rawEventDate.getMonth();
			const isCareerInSeasonWindow = eventMonth >= 10 || eventMonth < 2;

			if (isCareerInSeasonWindow) {
				(eventItem.matches || []).forEach((matchItem) => {
					if (matchItem.isWinner) {
						wrestlerRecord.careerWins += 1;
					} else if (!/for/i.test(matchItem.winType)) {
						wrestlerRecord.careerLosses += 1;
					}
				});
			}

			if (rawEventDate < inSeasonStartDate || rawEventDate > inSeasonEndDate) {
				return;
			}

			const eventIsDual = isDualEvent(eventItem);
			wrestlerRecord.wrestledDivisions.add(eventDivision);

			(eventItem.matches || []).forEach((matchItem) => {
				wrestlerRecord.totalMatches += 1;
				if (eventIsDual) {
					wrestlerRecord.dualMatches += 1;
				}

				if (matchItem.isWinner) {
					wrestlerRecord.wins += 1;

					const winTypeNormalized = (matchItem.winType || "").toUpperCase();
					let matchPointsValue = 3;

					if (winTypeNormalized === "DEC") {
						matchPointsValue = 3;
						wrestlerRecord.decisions += 1;
					} else if (winTypeNormalized === "MD") {
						matchPointsValue = 4;
						wrestlerRecord.majorDecisions += 1;
					} else if (winTypeNormalized === "TF") {
						matchPointsValue = 5;
						wrestlerRecord.techfalls += 1;
					} else if (["F", "FALL", "PIN"].includes(winTypeNormalized)) {
						matchPointsValue = 6;
						wrestlerRecord.pins += 1;
					} else if (["FF", "FOR", "FORFEIT", "DQ", "DEF", "DEFAULT"].includes(winTypeNormalized)) {
						matchPointsValue = 6;
						wrestlerRecord.forfeits += 1;
					} else {
						matchPointsValue = 3;
						wrestlerRecord.decisions += 1;
					}

					if (eventIsDual) {
						wrestlerRecord.points += matchPointsValue;
					}
				} else if (!/for/i.test(matchItem.winType)) {
					wrestlerRecord.losses += 1;
				}

				const takedownCount = Number(matchItem.takedowns || matchItem.takedown || matchItem.scores?.takedowns || 0);
				const nearfallCount = Number(matchItem.nearfalls || matchItem.nearfall || matchItem.scores?.nearfalls || 0);
				const reversalCount = Number(matchItem.reversals || matchItem.reversal || matchItem.reverses || matchItem.reverse || matchItem.scores?.reversals || 0);
				const escapeCount = Number(matchItem.escapes || matchItem.escape || matchItem.scores?.escapes || 0);

				wrestlerRecord.takedowns += takedownCount;
				wrestlerRecord.nearfalls += nearfallCount;
				wrestlerRecord.reversals += reversalCount;
				wrestlerRecord.escapes += escapeCount;
			});
		});

		if (wrestlerRecord.totalMatches > 0) {
			processedLeaderboardRecords.push(wrestlerRecord);
		}
	});

	if (!divisionFilter || divisionFilter === "All Divisions") {
		return processedLeaderboardRecords;
	}

	return processedLeaderboardRecords.filter((recordItem) =>
		Array.from(recordItem.wrestledDivisions).some((div) => matchesDivision(div, divisionFilter))
	);
};

export const getMetricPerMatchDenominator = (wrestlerRecord, metricKey) => {
	if (!wrestlerRecord) return 0;
	if (metricKey === "points") {
		return wrestlerRecord.dualMatches || 0;
	}
	return wrestlerRecord.totalMatches || 0;
};

export const formatLeaderboardMetric = (wrestlerRecord, metricKey, viewModeSetting) => {
	if (metricKey === "careerWins") {
		return `${wrestlerRecord.careerWins || 0}W ${wrestlerRecord.careerLosses || 0}L`;
	}
	if (metricKey === "wins") {
		return `${wrestlerRecord.wins || 0}W ${wrestlerRecord.losses || 0}L`;
	}
	const rawValue = wrestlerRecord[metricKey] || 0;
	if (viewModeSetting === "per_match") {
		const denominator = getMetricPerMatchDenominator(wrestlerRecord, metricKey);
		if (!denominator || denominator === 0) {
			return "0.00";
		}
		return (rawValue / denominator).toFixed(2);
	}
	return rawValue;
};

export const getMetricDisplayName = (targetMetricKey) => {
	const metricLabels = {
		points: "Dual Points",
		careerWins: "Career Record",
		wins: "Season Record",
		pins: "Pins",
		techfalls: "Tech Falls",
		majorDecisions: "Major Decisions",
		decisions: "Decisions",
		forfeits: "Forfeits",
		takedowns: "Takedowns",
		nearfalls: "Nearfalls",
		reversals: "Reversals",
		escapes: "Escapes",
		totalMatches: "Matches"
	};
	return metricLabels[targetMetricKey] || "Dual Points";
};

export const getTopLeaderboardRecords = (wrestlerRecords, metricKey, viewModeSetting, count = 3) => {
	if (wrestlerRecords.length === 0) return [];
	const usePerMatchCalculation = viewModeSetting === "per_match" && metricKey !== "careerWins" && metricKey !== "wins";
	return [...wrestlerRecords].sort((firstEntry, secondEntry) => {
		const firstDenom = getMetricPerMatchDenominator(firstEntry, metricKey);
		const secondDenom = getMetricPerMatchDenominator(secondEntry, metricKey);
		const valueOne = usePerMatchCalculation
			? (firstDenom > 0 ? firstEntry[metricKey] / firstDenom : 0)
			: (firstEntry[metricKey] || 0);
		const valueTwo = usePerMatchCalculation
			? (secondDenom > 0 ? secondEntry[metricKey] / secondDenom : 0)
			: (secondEntry[metricKey] || 0);
		if (valueOne !== valueTwo) {
			return valueTwo - valueOne;
		}
		return secondEntry.points - firstEntry.points;
	}).slice(0, count);
};

export const formatStatPrintValue = (record, statCategory) => {
	if (!record || !statCategory) return "0";
	if (statCategory.type === "record") {
		const winsVal = Number(record[statCategory.key] || 0);
		const lossesVal = Number(record[statCategory.lossesKey] || 0);
		return `${winsVal}-${lossesVal}`;
	}
	return String(Number(record[statCategory.key] || 0));
};

export const sortLeaderboardByPoints = (records) => {
	return [...(records || [])].sort((firstRecord, secondRecord) => {
		if ((secondRecord.points || 0) !== (firstRecord.points || 0)) {
			return (secondRecord.points || 0) - (firstRecord.points || 0);
		}
		if ((secondRecord.wins || 0) !== (firstRecord.wins || 0)) {
			return (secondRecord.wins || 0) - (firstRecord.wins || 0);
		}
		if ((secondRecord.pins || 0) !== (firstRecord.pins || 0)) {
			return (secondRecord.pins || 0) - (firstRecord.pins || 0);
		}
		return (firstRecord.name || "").localeCompare(secondRecord.name || "");
	});
};

const compareByStatCategory = (firstRecord, secondRecord, statCategory) => {
	const firstVal = Number(firstRecord[statCategory.key] || 0);
	const secondVal = Number(secondRecord[statCategory.key] || 0);
	if (secondVal !== firstVal) {
		return secondVal - firstVal;
	}
	if (statCategory.lossesKey) {
		const firstLosses = Number(firstRecord[statCategory.lossesKey] || 0);
		const secondLosses = Number(secondRecord[statCategory.lossesKey] || 0);
		if (firstLosses !== secondLosses) {
			return firstLosses - secondLosses;
		}
	}
	if ((secondRecord.points || 0) !== (firstRecord.points || 0)) {
		return (secondRecord.points || 0) - (firstRecord.points || 0);
	}
	return (firstRecord.name || "").localeCompare(secondRecord.name || "");
};

export const getTopStatLeaders = (records, statCategory, limit = 4) => {
	const statKey = statCategory.key;
	const nonZeroRecords = (records || []).filter((record) => Number(record[statKey] || 0) > 0);

	if (nonZeroRecords.length === 0) {
		return {
			statCategory,
			entries: [],
			additionalTiedAtCutoff: 0,
			cutoffValue: null,
			cutoffDisplay: ""
		};
	}

	const sortedRecords = [...nonZeroRecords].sort((firstRecord, secondRecord) =>
		compareByStatCategory(firstRecord, secondRecord, statCategory)
	);

	const valueCounts = {};
	sortedRecords.forEach((record) => {
		const val = Number(record[statKey] || 0);
		valueCounts[val] = (valueCounts[val] || 0) + 1;
	});

	let previousRank = 1;
	const rankedRecords = sortedRecords.map((record, index) => {
		const val = Number(record[statKey] || 0);
		const prevVal = index > 0 ? Number(sortedRecords[index - 1][statKey] || 0) : null;
		const rank = index > 0 && val === prevVal ? previousRank : index + 1;
		previousRank = rank;
		const isTied = valueCounts[val] > 1;
		return {
			rank,
			isTied,
			rankLabel: isTied ? `T${rank}` : `#${rank}`,
			name: record.name,
			value: val,
			displayValue: formatStatPrintValue(record, statCategory),
			record
		};
	});

	const entries = rankedRecords.slice(0, limit);
	let additionalTiedAtCutoff = 0;
	let cutoffValue = null;
	let cutoffDisplay = "";

	if (rankedRecords.length > limit && entries.length === limit) {
		cutoffValue = entries[limit - 1].value;
		cutoffDisplay = statCategory.type === "record" ? `${cutoffValue}W` : String(cutoffValue);
		for (let i = limit; i < rankedRecords.length; i++) {
			if (rankedRecords[i].value === cutoffValue) {
				additionalTiedAtCutoff += 1;
			} else {
				break;
			}
		}
	}

	return {
		statCategory,
		entries,
		additionalTiedAtCutoff,
		cutoffValue,
		cutoffDisplay
	};
};

export const computeCategoryRankMap = (records, statCategories = PRIORITY_STAT_CATEGORIES) => {
	const rankMap = {};
	(statCategories || PRIORITY_STAT_CATEGORIES).forEach((statCategory) => {
		const statKey = statCategory.key;
		rankMap[statKey] = {};

		const nonZeroRecords = (records || [])
			.filter((record) => Number(record[statKey] || 0) > 0)
			.sort((firstRecord, secondRecord) => compareByStatCategory(firstRecord, secondRecord, statCategory));

		let previousRank = 1;
		nonZeroRecords.forEach((record, index) => {
			const val = Number(record[statKey] || 0);
			const prevVal = index > 0 ? Number(nonZeroRecords[index - 1][statKey] || 0) : null;
			const rank = index > 0 && val === prevVal ? previousRank : index + 1;
			previousRank = rank;
			if (rank <= 3) {
				rankMap[statKey][record.name] = rank;
			}
		});
	});
	return rankMap;
};

export const buildDivisionPrintDatasets = (wrestlers, seasonName, divisionConfigs) => {
	const configsToUse = Array.isArray(divisionConfigs) && divisionConfigs.length > 0
		? divisionConfigs
		: PRINT_DIVISION_GROUPS.map((group) => ({ key: group.key, includeTable: true }));

	const datasets = [];
	configsToUse.forEach((configItem) => {
		const groupDef = PRINT_DIVISION_GROUPS.find((group) => group.key === configItem.key);
		if (!groupDef) return;

		const records = processLeaderboardData(wrestlers, groupDef.matchDivisions, seasonName);
		if (records.length === 0) return;

		const includeCareerRecord = !shouldExcludeCareerRecord(groupDef.key);
		const statCategories = getStatCategoriesForDivision(groupDef.key);
		const sortedRecords = sortLeaderboardByPoints(records);
		const leaderCards = statCategories.map((statCategory) =>
			getTopStatLeaders(sortedRecords, statCategory, 4)
		);
		const categoryRankMap = computeCategoryRankMap(sortedRecords, statCategories);

		const totals = sortedRecords.reduce(
			(acc, rec) => ({
				wrestlerCount: acc.wrestlerCount + 1,
				totalWins: acc.totalWins + (rec.wins || 0),
				totalPins: acc.totalPins + (rec.pins || 0),
				totalTakedowns: acc.totalTakedowns + (rec.takedowns || 0),
				totalPoints: acc.totalPoints + (rec.points || 0)
			}),
			{ wrestlerCount: 0, totalWins: 0, totalPins: 0, totalTakedowns: 0, totalPoints: 0 }
		);

		datasets.push({
			key: groupDef.key,
			label: groupDef.label,
			includeCareerRecord,
			includeTable: configItem.includeTable !== false,
			records: sortedRecords,
			leaderCards,
			categoryRankMap,
			totals
		});
	});

	return datasets;
};
