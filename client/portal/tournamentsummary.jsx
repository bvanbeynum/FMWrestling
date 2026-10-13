import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/tournamentsummary.css";

const isPlacementRound = (roundName) => {
	if (!roundName) return false;
	const name = roundName.toLowerCase().trim();
	if (name.includes("place")) return true;
	if (name.includes("quarter") || name.includes("semi")) return false;
	return name === "finals" || name === "championship" || name.includes("consi-final") || name.includes("consolation final") || name === "final";
};

const getHeatMapColor = (val, min, max) => {
	if (max === min) return "hsl(120, 75%, 90%)";
	const pct = Math.min(Math.max((val - min) / (max - min), 0), 1);
	const hue = pct * 120;
	return `hsl(${hue}, 75%, 90%)`;
};

const getWinner = (matchItem) => {
	if (!matchItem) return null;
	if (matchItem.winner) return matchItem.winner;
	return (matchItem.wrestlers || []).find(wrestlerItem => wrestlerItem.isWinner) || null;
};

const getLoser = (matchItem) => {
	if (!matchItem) return null;
	if (matchItem.loser) return matchItem.loser;
	return (matchItem.wrestlers || []).find(wrestlerItem => !wrestlerItem.isWinner) || null;
};

const getWrestlerPlacementRank = (wrestlerSqlId, tournamentMatches) => {
	if (!tournamentMatches || !wrestlerSqlId) return 999;
	for (let reverseIndex = tournamentMatches.length - 1; reverseIndex >= 0; reverseIndex--) {
		const currentMatch = tournamentMatches[reverseIndex];
		if (!currentMatch.roundName) continue;
		const roundNameNormalized = currentMatch.roundName.toLowerCase().trim();

		// 1st / 2nd Place
		if (roundNameNormalized === "finals" || 
			roundNameNormalized === "championship" || 
			roundNameNormalized === "final" || 
			roundNameNormalized.includes("1st place") || 
			roundNameNormalized.includes("1st-place")) {
			if (currentMatch.winner?.wrestlerSqlId === wrestlerSqlId) return 1;
			if (currentMatch.loser?.wrestlerSqlId === wrestlerSqlId) return 2;
		}

		// 3rd / 4th Place
		if (roundNameNormalized.includes("3rd place") || 
			roundNameNormalized.includes("3rd-place") || 
			roundNameNormalized === "consi-final" || 
			roundNameNormalized === "consolation final" || 
			roundNameNormalized.includes("consi-final")) {
			if (currentMatch.winner?.wrestlerSqlId === wrestlerSqlId) return 3;
			if (currentMatch.loser?.wrestlerSqlId === wrestlerSqlId) return 4;
		}

		// 5th / 6th Place
		if (roundNameNormalized.includes("5th place") || 
			roundNameNormalized.includes("5th-place")) {
			if (currentMatch.winner?.wrestlerSqlId === wrestlerSqlId) return 5;
			if (currentMatch.loser?.wrestlerSqlId === wrestlerSqlId) return 6;
		}

		// 7th / 8th Place
		if (roundNameNormalized.includes("7th place") || 
			roundNameNormalized.includes("7th-place")) {
			if (currentMatch.winner?.wrestlerSqlId === wrestlerSqlId) return 7;
			if (currentMatch.loser?.wrestlerSqlId === wrestlerSqlId) return 8;
		}
	}
	return 999;
};

const calculateWinProbability = (firstWrestler, secondWrestler) => {
	if (!firstWrestler || !secondWrestler) return 0.5;
	const firstRating = firstWrestler.rating || 1500.0;
	const secondRating = secondWrestler.rating || 1500.0;
	const firstDeviation = firstWrestler.deviation || 300.0;
	const secondDeviation = secondWrestler.deviation || 300.0;

	const scalingFactorConstant = Math.log(10) / 400.0;
	const combinedDeviation = Math.sqrt(
		Math.pow(firstDeviation, 2) + Math.pow(secondDeviation, 2)
	);
	const deviationImpactFactor = 1.0 / Math.sqrt(
		1.0 + (3.0 * Math.pow(scalingFactorConstant, 2) * Math.pow(combinedDeviation, 2)) / Math.pow(Math.PI, 2)
	);
	const ratingDifference = firstRating - secondRating;
	const winProbability = 1.0 / (1.0 + Math.pow(10, (-deviationImpactFactor * ratingDifference) / 400.0));
	return winProbability;
};

const getDifficultyClassification = (winProbability) => {
	if (winProbability >= 0.75) {
		return { label: "Easy", colorClass: "easy" };
	}
	if (winProbability >= 0.55) {
		return { label: "Favorable", colorClass: "favorable" };
	}
	if (winProbability >= 0.35) {
		return { label: "Tough", colorClass: "tough" };
	}
	return { label: "Elite", colorClass: "elite" };
};

const TournamentSummary = () => {
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [event, setEvent] = useState(null);
	const [selectedDivision, setSelectedDivision] = useState("");
	const [activeView, setActiveView] = useState("overview");
	const [selectedTeam, setSelectedTeam] = useState("");
	const [selectedWeightClass, setSelectedWeightClass] = useState("");
	const [selectedBracketWeightClass, setSelectedBracketWeightClass] = useState("");
	const [selectedBracketWrestlerSqlId, setSelectedBracketWrestlerSqlId] = useState(null);
	const [highlightedWrestlerSqlId, setHighlightedWrestlerSqlId] = useState(null);

	// Auto-select a default team and weight class when division or event changes (declared before early returns)
	useEffect(() => {
		if (!event) return;
		const matchesList = event.matches || [];
		const divisionMatches = matchesList.filter(match => (match.division || "Varsity") === selectedDivision);

		// Resolve unique weight classes for this division
		const weightClassesSet = new Set();
		divisionMatches.forEach(match => {
			if (match.weightClass) {
				weightClassesSet.add(match.weightClass);
			}
		});
		const divisionWeightClasses = Array.from(weightClassesSet).sort();

		if (divisionWeightClasses.length > 0) {
			if (!selectedWeightClass || !divisionWeightClasses.includes(selectedWeightClass)) {
				setSelectedWeightClass(divisionWeightClasses[0]);
			}
		} else {
			setSelectedWeightClass("");
		}

		// Resolve unique teams for this division
		const teamsSet = new Set();
		divisionMatches.forEach(matchItem => {
			const winnerWrestler = getWinner(matchItem);
			const loserWrestler = getLoser(matchItem);
			if (winnerWrestler?.team) teamsSet.add(winnerWrestler.team);
			if (loserWrestler?.team) teamsSet.add(loserWrestler.team);
		});
		const divisionTeams = Array.from(teamsSet).sort();

		if (divisionTeams.length > 0) {
			if (!selectedTeam || !divisionTeams.includes(selectedTeam)) {
				const familiarTeamsSet = new Set((event.familiarTeams || []).map(teamName => teamName.toLowerCase().trim()));
				const familiarTeam = divisionTeams.find(teamName => familiarTeamsSet.has(teamName.toLowerCase().trim()));
				setSelectedTeam(familiarTeam || divisionTeams[0]);
			}
		} else {
			setSelectedTeam("");
		}
	}, [selectedDivision, event]);

	// Read event ID / SQL ID from query parameters
	const queryParams = new URLSearchParams(window.location.search);
	const eventId = queryParams.get("id");
	const eventSqlId = queryParams.get("sqlid");
	const fetchParameters = (eventId && eventId !== "null") ? `id=${eventId}` : ((eventSqlId && eventSqlId !== "null") ? `sqlid=${eventSqlId}` : "");

	useEffect(() => {
		if (fetchParameters) {
			fetch(`/api/eventdetailsload?${fetchParameters}`)
				.then(response => {
					if (response.ok) {
						return response.json();
					} else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					
					const eventUpdated = {
						...data.event,
						matches: (data.event?.matches || []).map(currentMatch => {
							const winnerWrestler = getWinner(currentMatch);
							const loserWrestler = getLoser(currentMatch);
							const winnerSeed = (winnerWrestler?.seed !== undefined && winnerWrestler?.seed !== null && String(winnerWrestler.seed).trim() !== "" && !isNaN(Number(winnerWrestler.seed))) ? Number(winnerWrestler.seed) : null;
							const loserSeed = (loserWrestler?.seed !== undefined && loserWrestler?.seed !== null && String(loserWrestler.seed).trim() !== "" && !isNaN(Number(loserWrestler.seed))) ? Number(loserWrestler.seed) : null;

							let isSeedAccurate = null;
							if (winnerSeed !== null && loserSeed !== null) {
								isSeedAccurate = winnerSeed < loserSeed;
							} else if (winnerSeed !== null && loserSeed === null) {
								isSeedAccurate = true;
							} else if (winnerSeed === null && loserSeed !== null) {
								isSeedAccurate = false;
							}

							const winnerRating = winnerWrestler?.rating || 1500.0;
							const loserRating = loserWrestler?.rating || 1500.0;
							const winnerDeviation = winnerWrestler?.deviation || 300.0;
							const loserDeviation = loserWrestler?.deviation || 300.0;
							const isRatingAccurate = winnerRating > loserRating;
							const isRatingExpected = (winnerRating + winnerDeviation) > (loserRating - loserDeviation);

							return {
								...currentMatch,
								winner: winnerWrestler,
								loser: loserWrestler,
								wrestlers: currentMatch.wrestlers || [winnerWrestler, loserWrestler].filter(Boolean),
								isSeedAccurate: isSeedAccurate,
								isRatingAccurate: isRatingAccurate,
								isRatingExpected: isRatingExpected
							};
						})
					};

					const divisions = [...new Set((eventUpdated.matches || []).map(currentMatch => currentMatch.division || "Varsity"))]
						.map(divisionName => {
							const divisionMatches = (eventUpdated.matches || []).filter(currentMatch => (currentMatch.division || "Varsity") === divisionName);
							const uniqueWeightClassNames = [...new Set(divisionMatches.map(currentMatch => currentMatch.weightClass))].filter(Boolean);

							return {
								name: divisionName,
								matches: divisionMatches,
								weightClasses: uniqueWeightClassNames.map(weightClassName => {
									const weightClassMatches = divisionMatches.filter(currentMatch => currentMatch.weightClass === weightClassName);
									const uniqueWrestlerIds = [...new Set(weightClassMatches.flatMap(currentMatch => (currentMatch.wrestlers || []).map(currentWrestler => currentWrestler.wrestlerSqlId)))].filter(Boolean);
									const weightClassWrestlers = uniqueWrestlerIds.map(wrestlerSqlId => {
										return weightClassMatches.flatMap(currentMatch => currentMatch.wrestlers || []).find(currentWrestler => currentWrestler.wrestlerSqlId === wrestlerSqlId);
									}).filter(Boolean);

									return {
										name: weightClassName,
										matches: weightClassMatches,
										wrestlers: weightClassWrestlers,
										seedRanking: [...weightClassWrestlers].sort((firstWrestler, secondWrestler) => (firstWrestler.seed || 999) - (secondWrestler.seed || 999)),
										ratingRanking: [...weightClassWrestlers].sort((firstWrestler, secondWrestler) => (secondWrestler.rating || 0) - (firstWrestler.rating || 0)),
										place: weightClassWrestlers.map(currentWrestler => ({
											...currentWrestler,
											place: getWrestlerPlacementRank(currentWrestler.wrestlerSqlId, weightClassMatches)
										})).filter(currentWrestler => currentWrestler.place !== 999).sort((firstWrestler, secondWrestler) => firstWrestler.place - secondWrestler.place)
									};
								})
							};
						});

					eventUpdated.divisions = divisions;

					setEvent(eventUpdated);
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);

					// Determine available divisions and set default selected
					const matches = eventUpdated?.matches || [];
					const uniqueDivisions = Array.from(new Set(matches.map(currentMatch => currentMatch.division || "Varsity"))).filter(Boolean);
					setSelectedDivision(uniqueDivisions.includes("Varsity") ? "Varsity" : (uniqueDivisions[0] || "Varsity"));
				})
				.catch(error => {
					console.warn(error);
					setIsLoading(false);
				});
		} else {
			setIsLoading(false);
		}
	}, [fetchParameters]);

	if (isLoading) {
		return (
			<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", width: "100vw", backgroundColor: "#ffffff" }}>
				<img src="/media/wrestlingloading.gif" alt="Loading..." />
			</div>
		);
	}

	if (!loggedInUser || !loggedInUser.privileges || (!loggedInUser.privileges.includes("scheduleView") && !loggedInUser.privileges.includes("scheduleManage"))) {
		return (
			<div className="page">
				<Nav loggedInUser={loggedInUser} />
				<div className="noAccess">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
						<path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/>
					</svg>
					<a>Unauthorized</a>
				</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="page">
				<Nav loggedInUser={loggedInUser} />
				<div className="container">
					<div className="emptyState">
						<h3>No event details could be found.</h3>
						<a href="/portal/allschedule.html">Return to Schedule</a>
					</div>
				</div>
			</div>
		);
	}

	const matches = [...(event.matches || [])].sort((firstMatch, secondMatch) => (firstMatch.sort || 0) - (secondMatch.sort || 0));

	// Get all unique divisions in matches list
	const uniqueDivisions = Array.from(new Set(matches.map(m => m.division || "Varsity"))).filter(Boolean);

	// Filter matches based on selected division
	const filteredMatches = matches.filter(m => (m.division || "Varsity") === selectedDivision);

	// Calculate counts for KPI summary
	const uniqueWtClasses = Array.from(new Set(filteredMatches.map(m => m.weightClass))).filter(Boolean);
	const wtClassesCount = uniqueWtClasses.length;

	const teamsSet = new Set();
	filteredMatches.forEach(matchItem => {
		const winnerWrestler = getWinner(matchItem);
		const loserWrestler = getLoser(matchItem);
		if (winnerWrestler?.team) teamsSet.add(winnerWrestler.team);
		if (loserWrestler?.team) teamsSet.add(loserWrestler.team);
	});
	const teamsCount = teamsSet.size;

	const wrestlersSet = new Set();
	filteredMatches.forEach(matchItem => {
		const winnerWrestler = getWinner(matchItem);
		const loserWrestler = getLoser(matchItem);
		if (winnerWrestler?.wrestlerSqlId) wrestlersSet.add(winnerWrestler.wrestlerSqlId);
		if (loserWrestler?.wrestlerSqlId) wrestlersSet.add(loserWrestler.wrestlerSqlId);
	});
	const wrestlersCount = wrestlersSet.size;

	// Calculate ratings for Intensity Curve
	const ratings = [];
	filteredMatches.forEach(matchItem => {
		const winnerWrestler = getWinner(matchItem);
		const loserWrestler = getLoser(matchItem);
		if (winnerWrestler && typeof winnerWrestler.rating === "number" && winnerWrestler.rating > 0) ratings.push(winnerWrestler.rating);
		if (loserWrestler && typeof loserWrestler.rating === "number" && loserWrestler.rating > 0) ratings.push(loserWrestler.rating);
	});

	const minGlicko = ratings.length > 0 ? Math.min(...ratings) : 800;
	const maxGlicko = ratings.length > 0 ? Math.max(...ratings) : 2100;
	const avgGlicko = ratings.length > 0 ? ratings.reduce((sum, ratingVal) => sum + ratingVal, 0) / ratings.length : 1450;

	// Generate SVG normal distribution curve (separate open line and closed area paths)
	const range = maxGlicko - minGlicko || 1;
	const stdDev = range / 6 || 100;
	const points = [];
	for (let pointIndex = 0; pointIndex <= 50; pointIndex++) {
		const xVal = pointIndex * 6; // 0 to 300
		const rating = minGlicko + (pointIndex / 50) * range;
		const exponent = -Math.pow(rating - avgGlicko, 2) / (2 * Math.pow(stdDev, 2));
		const yVal = Math.exp(exponent);
		const yPos = 110 - yVal * 80; // peak height 80, baseline 110
		points.push(`${xVal},${yPos}`);
	}
	const lineD = `M ${points.join(" L ")}`;
	const areaD = `M 0,110 L ${points.join(" L ")} L 300,110 Z`;
	const avgPct = (avgGlicko - minGlicko) / range;
	const peakX = avgPct * 300;
	const peakY = 110 - 80;

	// Calculate top 10% threshold of ratings for the overall event
	const allEventRatings = [];
	matches.forEach(matchItem => {
		const winnerWrestler = getWinner(matchItem);
		const loserWrestler = getLoser(matchItem);
		if (winnerWrestler && typeof winnerWrestler.rating === "number" && winnerWrestler.rating > 0) allEventRatings.push(winnerWrestler.rating);
		if (loserWrestler && typeof loserWrestler.rating === "number" && loserWrestler.rating > 0) allEventRatings.push(loserWrestler.rating);
	});
	allEventRatings.sort((firstRating, secondRating) => secondRating - firstRating);
	const top10Index = Math.floor(allEventRatings.length * 0.1);
	const top10PercentThreshold = allEventRatings.length > 0 ? allEventRatings[top10Index] : 0;

	// Calculate Insights
	// 1. Upsets: Winner rating < Loser rating - Loser deviation, sorted by Glicko difference descending, limited to top 5 (excludes forfeits/NC)
	const upsets = filteredMatches.filter(matchItem => {
		const winnerWrestler = getWinner(matchItem);
		const loserWrestler = getLoser(matchItem);
		return (
			winnerWrestler?.rating && 
			loserWrestler?.rating && 
			winnerWrestler.rating < loserWrestler.rating - (loserWrestler.deviation || 0) &&
			!(matchItem.winType && (matchItem.winType.toLowerCase().includes("for") || matchItem.winType.toLowerCase() === "nc"))
		);
	});
	upsets.sort((firstMatchItem, secondMatchItem) => {
		const firstWinner = getWinner(firstMatchItem);
		const firstLoser = getLoser(firstMatchItem);
		const secondWinner = getWinner(secondMatchItem);
		const secondLoser = getLoser(secondMatchItem);
		return (secondLoser.rating - secondWinner.rating) - (firstLoser.rating - firstWinner.rating);
	});
	const topUpsets = upsets.slice(0, 5);

	// 2. Key Matches: Both wrestlers in top 10% rating for event, sorted by rating sum descending, limited to top 5 (excludes forfeits/NC)
	const keyMatches = filteredMatches.filter(matchItem => {
		const winnerWrestler = getWinner(matchItem);
		const loserWrestler = getLoser(matchItem);
		return (
			winnerWrestler?.rating && 
			loserWrestler?.rating && 
			winnerWrestler.rating >= top10PercentThreshold && 
			loserWrestler.rating >= top10PercentThreshold &&
			!upsets.includes(matchItem) &&
			!(matchItem.winType && (matchItem.winType.toLowerCase().includes("for") || matchItem.winType.toLowerCase() === "nc"))
		);
	});
	keyMatches.sort((firstMatchItem, secondMatchItem) => {
		const firstWinner = getWinner(firstMatchItem);
		const firstLoser = getLoser(firstMatchItem);
		const secondWinner = getWinner(secondMatchItem);
		const secondLoser = getLoser(secondMatchItem);
		return (secondWinner.rating + secondLoser.rating) - (firstWinner.rating + firstLoser.rating);
	});
	const topKeyMatches = keyMatches.slice(0, 5);

	// Calculate Team Statistics for the heat map
	const teamStatsMap = {};
	filteredMatches.forEach(matchItem => {
		const winnerWrestler = getWinner(matchItem);
		const loserWrestler = getLoser(matchItem);
		const wTeam = winnerWrestler?.team;
		const lTeam = loserWrestler?.team;
		const wId = winnerWrestler?.wrestlerSqlId;
		const lId = loserWrestler?.wrestlerSqlId;

		if (wTeam) {
			if (!teamStatsMap[wTeam]) {
				teamStatsMap[wTeam] = {
					team: wTeam,
					wrestlers: new Set(),
					wins: 0,
					losses: 0,
					placers: new Set()
				};
			}
			if (wId) teamStatsMap[wTeam].wrestlers.add(wId);
			teamStatsMap[wTeam].wins += 1;

			if (isPlacementRound(matchItem.roundName)) {
				if (wId) teamStatsMap[wTeam].placers.add(wId);
			}
		}

		if (lTeam) {
			if (!teamStatsMap[lTeam]) {
				teamStatsMap[lTeam] = {
					team: lTeam,
					wrestlers: new Set(),
					wins: 0,
					losses: 0,
					placers: new Set()
				};
			}
			if (lId) teamStatsMap[lTeam].wrestlers.add(lId);
			teamStatsMap[lTeam].losses += 1;

			if (isPlacementRound(matchItem.roundName)) {
				if (lId) teamStatsMap[lTeam].placers.add(lId);
			}
		}
	});

	const familiarTeamsSet = new Set((event.familiarTeams || []).map(t => t.toLowerCase().trim()));

	const teamsList = Object.values(teamStatsMap).map(stats => {
		const wrestlerCount = stats.wrestlers.size;
		const totalMatches = stats.wins + stats.losses;
		const winPct = totalMatches > 0 ? (stats.wins / totalMatches) : 0;
		const placerCount = stats.placers.size;
		const placerPct = wrestlerCount > 0 ? (placerCount / wrestlerCount) : 0;
		const isFamiliar = familiarTeamsSet.has(stats.team.toLowerCase().trim());

		return {
			team: stats.team,
			wrestlerCount,
			wins: stats.wins,
			losses: stats.losses,
			totalMatches,
			winPct,
			placerCount,
			placerPct,
			isFamiliar
		};
	});

	// Sort by wrestlerCount descending, then by winPct descending, then by team name alphabetically
	teamsList.sort((a, b) => {
		if (b.wrestlerCount !== a.wrestlerCount) {
			return b.wrestlerCount - a.wrestlerCount;
		}
		if (b.winPct !== a.winPct) {
			return b.winPct - a.winPct;
		}
		return a.team.localeCompare(b.team);
	});

	// Calculate Min & Max for Heatmaps
	const wCountArr = teamsList.map(t => t.wrestlerCount);
	const minWrestlers = wCountArr.length > 0 ? Math.min(...wCountArr) : 0;
	const maxWrestlers = wCountArr.length > 0 ? Math.max(...wCountArr) : 0;

	const winPctArr = teamsList.map(t => t.winPct);
	const minWinPct = winPctArr.length > 0 ? Math.min(...winPctArr) : 0;
	const maxWinPct = winPctArr.length > 0 ? Math.max(...winPctArr) : 0;

	const placerPctArr = teamsList.map(t => t.placerPct);
	const minPlacerPct = placerPctArr.length > 0 ? Math.min(...placerPctArr) : 0;
	const maxPlacerPct = placerPctArr.length > 0 ? Math.max(...placerPctArr) : 0;

	// Derivate unique teams for the division dropdown
	const uniqueTeamsSet = new Set();
	filteredMatches.forEach(match => {
		if (match.winner?.team) {
			uniqueTeamsSet.add(match.winner.team);
		}
		if (match.loser?.team) {
			uniqueTeamsSet.add(match.loser.team);
		}
	});
	const uniqueTeams = Array.from(uniqueTeamsSet).sort();

	// Filter division matches by selected team
	const teamMatches = filteredMatches.filter(match => match.winner?.team === selectedTeam || match.loser?.team === selectedTeam);

	// Calculate wrestler count for selected team
	const teamWrestlersSet = new Set();
	teamMatches.forEach(match => {
		if (match.winner?.team === selectedTeam && match.winner.wrestlerSqlId) {
			teamWrestlersSet.add(match.winner.wrestlerSqlId);
		}
		if (match.loser?.team === selectedTeam && match.loser.wrestlerSqlId) {
			teamWrestlersSet.add(match.loser.wrestlerSqlId);
		}
	});
	const teamWrestlersCount = teamWrestlersSet.size;

	// Calculate wins and win rate for selected team
	const teamWinsCount = teamMatches.filter(match => match.winner?.team === selectedTeam).length;
	const totalTeamMatchesCount = teamMatches.length;
	const teamWinPct = totalTeamMatchesCount > 0 ? (teamWinsCount / totalTeamMatchesCount) * 100 : 0;

	// Calculate placers and placer percentage for selected team
	const teamPlacersSet = new Set();
	teamMatches.forEach(match => {
		if (isPlacementRound(match.roundName)) {
			if (match.winner?.team === selectedTeam && match.winner.wrestlerSqlId) {
				teamPlacersSet.add(match.winner.wrestlerSqlId);
			}
			if (match.loser?.team === selectedTeam && match.loser.wrestlerSqlId) {
				teamPlacersSet.add(match.loser.wrestlerSqlId);
			}
		}
	});
	const teamPlacersCount = teamPlacersSet.size;
	const teamPlacerPct = teamWrestlersCount > 0 ? (teamPlacersCount / teamWrestlersCount) * 100 : 0;

	// Calculate upset count for selected team
	const teamUpsetsCount = teamMatches.filter(match => 
		match.winner?.team === selectedTeam &&
		match.winner?.rating && 
		match.loser?.rating && 
		match.winner.rating < match.loser.rating - (match.loser.deviation || 0) &&
		!(match.winType && (match.winType.toLowerCase().includes("for") || match.winType.toLowerCase() === "nc"))
	).length;

	// Group and compile individual statistics for wrestlers of the selected team
	const wrestlerStatsMap = {};
	teamMatches.forEach(match => {
		const winnerId = match.winner?.wrestlerSqlId;
		const loserId = match.loser?.wrestlerSqlId;

		if (winnerId && match.winner?.team === selectedTeam) {
			if (!wrestlerStatsMap[winnerId]) {
				wrestlerStatsMap[winnerId] = {
					wrestlerSqlId: winnerId,
					name: match.winner.name,
					rating: match.winner.rating,
					deviation: match.winner.deviation,
					weightClass: match.weightClass,
					wins: 0,
					losses: 0,
					upsets: 0
				};
			}
			wrestlerStatsMap[winnerId].wins += 1;

			const isUpsetMatch = match.winner.rating && match.loser.rating && 
				match.winner.rating < match.loser.rating - (match.loser.deviation || 0) &&
				!(match.winType && (match.winType.toLowerCase().includes("for") || match.winType.toLowerCase() === "nc"));
			if (isUpsetMatch) {
				wrestlerStatsMap[winnerId].upsets += 1;
			}
		}

		if (loserId && match.loser?.team === selectedTeam) {
			if (!wrestlerStatsMap[loserId]) {
				wrestlerStatsMap[loserId] = {
					wrestlerSqlId: loserId,
					name: match.loser.name,
					rating: match.loser.rating,
					deviation: match.loser.deviation,
					weightClass: match.weightClass,
					wins: 0,
					losses: 0,
					upsets: 0
				};
			}
			wrestlerStatsMap[loserId].losses += 1;
		}
	});

	const wrestlersList = Object.values(wrestlerStatsMap);
	wrestlersList.sort((firstWrestler, secondWrestler) => (secondWrestler.rating || 0) - (firstWrestler.rating || 0));

	const wrestlerWinsArr = wrestlersList.map(wrestler => wrestler.wins);
	const minWrestlerWins = wrestlerWinsArr.length > 0 ? Math.min(...wrestlerWinsArr) : 0;
	const maxWrestlerWins = wrestlerWinsArr.length > 0 ? Math.max(...wrestlerWinsArr) : 0;

	const wrestlerUpsetsArr = wrestlersList.map(wrestler => wrestler.upsets);
	const minWrestlerUpsets = wrestlerUpsetsArr.length > 0 ? Math.min(...wrestlerUpsetsArr) : 0;
	const maxWrestlerUpsets = wrestlerUpsetsArr.length > 0 ? Math.max(...wrestlerUpsetsArr) : 0;

	// Resolve unique weight classes for the selected division
	const uniqueWeightClassesSet = new Set();
	filteredMatches.forEach(match => {
		if (match.weightClass) {
			uniqueWeightClassesSet.add(match.weightClass);
		}
	});
	const uniqueWeightClasses = Array.from(uniqueWeightClassesSet).sort();

	// Filter matches by weight class
	const weightClassMatches = filteredMatches.filter(match => match.weightClass === selectedWeightClass);

	// Calculate wrestler count for selected weight class
	const weightClassWrestlersSet = new Set();
	weightClassMatches.forEach(match => {
		if (match.winner?.wrestlerSqlId) {
			weightClassWrestlersSet.add(match.winner.wrestlerSqlId);
		}
		if (match.loser?.wrestlerSqlId) {
			weightClassWrestlersSet.add(match.loser.wrestlerSqlId);
		}
	});
	const weightClassWrestlersCount = weightClassWrestlersSet.size;

	// Calculate rounds count for selected weight class
	const weightClassRoundsSet = new Set();
	weightClassMatches.forEach(match => {
		if (match.roundName) {
			weightClassRoundsSet.add(match.roundName);
		}
	});
	const weightClassRoundsCount = weightClassRoundsSet.size;

	// Calculate upsets count for selected weight class
	const weightClassUpsetsCount = weightClassMatches.filter(match => 
		match.winner?.rating && 
		match.loser?.rating && 
		match.winner.rating < match.loser.rating - (match.loser.deviation || 0) &&
		!(match.winType && (match.winType.toLowerCase().includes("for") || match.winType.toLowerCase() === "nc"))
	).length;

	// Resolve winner (1st place or most wins) for the weight class
	let bracketWinnerName = "N/A";
	const championshipMatch = weightClassMatches.find(match => {
		if (!match.roundName) return false;
		const roundNameLower = match.roundName.toLowerCase().trim();
		return roundNameLower === "finals" || 
			roundNameLower === "championship" || 
			roundNameLower === "final" || 
			roundNameLower.includes("1st place") || 
			roundNameLower.includes("1st-place");
	});

	if (championshipMatch?.winner?.name) {
		bracketWinnerName = championshipMatch.winner.name;
	} else {
		const winsMap = {};
		weightClassMatches.forEach(match => {
			if (match.winner?.name) {
				winsMap[match.winner.name] = (winsMap[match.winner.name] || 0) + 1;
			}
		});
		let maxWins = 0;
		let wrestlerWithMostWins = "";
		Object.entries(winsMap).forEach(([wrestlerName, winsCount]) => {
			if (winsCount > maxWins) {
				maxWins = winsCount;
				wrestlerWithMostWins = wrestlerName;
			}
		});
		if (wrestlerWithMostWins) {
			bracketWinnerName = wrestlerWithMostWins;
		}
	}

	// Group and compile stats for wrestlers in this weight class
	const weightClassWrestlerStatsMap = {};
	weightClassMatches.forEach(match => {
		const winnerId = match.winner?.wrestlerSqlId;
		const loserId = match.loser?.wrestlerSqlId;

		if (winnerId) {
			if (!weightClassWrestlerStatsMap[winnerId]) {
				weightClassWrestlerStatsMap[winnerId] = {
					wrestlerSqlId: winnerId,
					name: match.winner.name,
					team: match.winner.team,
					rating: match.winner.rating,
					deviation: match.winner.deviation,
					seed: match.winner.seed,
					wins: 0,
					losses: 0,
					lastRound: "N/A"
				};
			}
			weightClassWrestlerStatsMap[winnerId].wins += 1;
			weightClassWrestlerStatsMap[winnerId].lastRound = match.roundName || "N/A";
			if (match.winner.seed !== undefined && match.winner.seed !== null) {
				weightClassWrestlerStatsMap[winnerId].seed = match.winner.seed;
			}
		}

		if (loserId) {
			if (!weightClassWrestlerStatsMap[loserId]) {
				weightClassWrestlerStatsMap[loserId] = {
					wrestlerSqlId: loserId,
					name: match.loser.name,
					team: match.loser.team,
					rating: match.loser.rating,
					deviation: match.loser.deviation,
					seed: match.loser.seed,
					wins: 0,
					losses: 0,
					lastRound: "N/A"
				};
			}
			weightClassWrestlerStatsMap[loserId].losses += 1;
			weightClassWrestlerStatsMap[loserId].lastRound = match.roundName || "N/A";
			if (match.loser.seed !== undefined && match.loser.seed !== null) {
				weightClassWrestlerStatsMap[loserId].seed = match.loser.seed;
			}
		}
	});

	const weightClassWrestlersList = Object.values(weightClassWrestlerStatsMap);

	// Sort wrestlers by place (rank) ascending, then by wins descending, then by rating descending
	weightClassWrestlersList.sort((firstWrestler, secondWrestler) => {
		const firstRank = getWrestlerPlacementRank(firstWrestler.wrestlerSqlId, weightClassMatches);
		const secondRank = getWrestlerPlacementRank(secondWrestler.wrestlerSqlId, weightClassMatches);

		if (firstRank !== secondRank) {
			return firstRank - secondRank;
		}

		if (secondWrestler.wins !== firstWrestler.wins) {
			return secondWrestler.wins - firstWrestler.wins;
		}

		return (secondWrestler.rating || 0) - (firstWrestler.rating || 0);
	});

	const weightClassWinsArr = weightClassWrestlersList.map(wrestler => wrestler.wins);
	const minWeightClassWins = weightClassWinsArr.length > 0 ? Math.min(...weightClassWinsArr) : 0;
	const maxWeightClassWins = weightClassWinsArr.length > 0 ? Math.max(...weightClassWinsArr) : 0;

	// Check if any wrestler has seed information available
	const hasAnySeeds = weightClassWrestlersList.some(wrestler => 
		wrestler.seed !== undefined && 
		wrestler.seed !== null && 
		wrestler.seed !== "" && 
		String(wrestler.seed).trim() !== ""
	);

	// Group matches by round name in descending order
	const sortedMatchesDescending = [...weightClassMatches].sort((firstMatch, secondMatch) => (secondMatch.sort || 0) - (firstMatch.sort || 0));
	const matchesByRound = [];
	const roundIndexMap = {};

	sortedMatchesDescending.forEach(match => {
		const roundName = match.roundName || "N/A";
		if (roundIndexMap[roundName] === undefined) {
			roundIndexMap[roundName] = matchesByRound.length;
			matchesByRound.push({
				roundName: roundName,
				matches: []
			});
		}
		matchesByRound[roundIndexMap[roundName]].matches.push(match);
	});

	// Detect whether tournament has any seeded wrestlers
	const hasValidSeed = (seedValue) => seedValue !== undefined && seedValue !== null && String(seedValue).trim() !== "" && !isNaN(Number(seedValue)) && Number(seedValue) > 0;
	const tournamentHasSeeding = matches.some(matchItem => {
		const winnerSeed = matchItem.winner?.seed;
		const loserSeed = matchItem.loser?.seed;
		return hasValidSeed(winnerSeed) || hasValidSeed(loserSeed);
	});

	// Build weight class data for the Bracket view (filtered to weight classes with seeding)
	const bracketWeightClasses = uniqueWeightClasses.map(weightClassName => {
		const weightClassMatches = filteredMatches.filter(matchItem => matchItem.weightClass === weightClassName);

		// Extract all unique wrestlers in this weight class
		const wrestlersById = {};
		weightClassMatches.forEach(matchItem => {
			const winnerWrestler = matchItem.winner;
			const loserWrestler = matchItem.loser;

			if (winnerWrestler?.wrestlerSqlId) {
				const winnerId = winnerWrestler.wrestlerSqlId;
				const seedNumber = hasValidSeed(winnerWrestler.seed) ? Number(winnerWrestler.seed) : null;
				if (!wrestlersById[winnerId]) {
					wrestlersById[winnerId] = {
						wrestlerSqlId: winnerId,
						name: winnerWrestler.name,
						team: winnerWrestler.team,
						rating: winnerWrestler.rating || 1500.0,
						deviation: winnerWrestler.deviation || 300.0,
						seed: seedNumber
					};
				} else if (wrestlersById[winnerId].seed === null && seedNumber !== null) {
					wrestlersById[winnerId].seed = seedNumber;
				}
			}

			if (loserWrestler?.wrestlerSqlId) {
				const loserId = loserWrestler.wrestlerSqlId;
				const seedNumber = hasValidSeed(loserWrestler.seed) ? Number(loserWrestler.seed) : null;
				if (!wrestlersById[loserId]) {
					wrestlersById[loserId] = {
						wrestlerSqlId: loserId,
						name: loserWrestler.name,
						team: loserWrestler.team,
						rating: loserWrestler.rating || 1500.0,
						deviation: loserWrestler.deviation || 300.0,
						seed: seedNumber
					};
				} else if (wrestlersById[loserId].seed === null && seedNumber !== null) {
					wrestlersById[loserId].seed = seedNumber;
				}
			}
		});

		const weightClassWrestlers = Object.values(wrestlersById);

		// Check if weight class has at least one seeded wrestler
		const hasWeightClassSeeding = weightClassWrestlers.some(wrestlerItem => wrestlerItem.seed !== null);

		// Resolve placement rank for each wrestler
		weightClassWrestlers.forEach(wrestlerItem => {
			wrestlerItem.placementRank = getWrestlerPlacementRank(wrestlerItem.wrestlerSqlId, weightClassMatches);
		});

		// Sort by rating descending to assign rating rank
		const ratingSortedWrestlers = [...weightClassWrestlers].sort((firstWrestler, secondWrestler) => (secondWrestler.rating || 0) - (firstWrestler.rating || 0));
		ratingSortedWrestlers.forEach((wrestlerItem, sortedIndex) => {
			wrestlerItem.ratingRank = sortedIndex + 1;
		});

		// Match Accuracy in this weight class
		const matchesWithSeedPrediction = weightClassMatches.filter(matchItem => matchItem.isSeedAccurate !== null);
		const accurateSeedMatches = matchesWithSeedPrediction.filter(matchItem => matchItem.isSeedAccurate === true);
		const seedAccuracyPercentage = matchesWithSeedPrediction.length > 0 ? (accurateSeedMatches.length / matchesWithSeedPrediction.length) * 100 : null;

		const accurateRatingMatches = weightClassMatches.filter(matchItem => matchItem.isRatingAccurate === true);
		const ratingAccuracyPercentage = weightClassMatches.length > 0 ? (accurateRatingMatches.length / weightClassMatches.length) * 100 : null;

		// Placement Accuracy in this weight class
		const placedWrestlers = weightClassWrestlers.filter(wrestlerItem => wrestlerItem.placementRank !== 999);
		const placementSpotsCount = placedWrestlers.length;

		// Top K seeds (where K = placementSpotsCount)
		const seededWrestlers = weightClassWrestlers.filter(wrestlerItem => wrestlerItem.seed !== null).sort((firstWrestler, secondWrestler) => firstWrestler.seed - secondWrestler.seed);
		const topSeeds = seededWrestlers.slice(0, placementSpotsCount);
		const topSeedsPlacedCount = topSeeds.filter(wrestlerItem => wrestlerItem.placementRank !== 999).length;

		// Top K ratings
		const topRatings = ratingSortedWrestlers.slice(0, placementSpotsCount);
		const topRatingsPlacedCount = topRatings.filter(wrestlerItem => wrestlerItem.placementRank !== 999).length;

		const topSeedPlacementPercentage = topSeeds.length > 0 ? (topSeedsPlacedCount / topSeeds.length) * 100 : null;
		const topRatingPlacementPercentage = topRatings.length > 0 ? (topRatingsPlacedCount / topRatings.length) * 100 : null;

		return {
			weightClass: weightClassName,
			division: selectedDivision,
			matches: weightClassMatches,
			wrestlers: weightClassWrestlers,
			hasWeightClassSeeding: hasWeightClassSeeding,
			// Match stats
			totalMatchesCount: weightClassMatches.length,
			matchesWithSeedPredictionCount: matchesWithSeedPrediction.length,
			accurateSeedMatchesCount: accurateSeedMatches.length,
			seedAccuracyPercentage: seedAccuracyPercentage,
			accurateRatingMatchesCount: accurateRatingMatches.length,
			ratingAccuracyPercentage: ratingAccuracyPercentage,
			// Placement stats
			placementSpotsCount: placementSpotsCount,
			topSeedsCount: topSeeds.length,
			topSeedsPlacedCount: topSeedsPlacedCount,
			topSeedPlacementPercentage: topSeedPlacementPercentage,
			topRatingsCount: topRatings.length,
			topRatingsPlacedCount: topRatingsPlacedCount,
			topRatingPlacementPercentage: topRatingPlacementPercentage
		};
	}).filter(weightClassItem => weightClassItem.hasWeightClassSeeding);

	// Aggregate KPIs across all seeded weight classes in this division
	let totalSeedPredictableMatches = 0;
	let totalAccurateSeedMatches = 0;
	let totalDivisionMatches = 0;
	let totalAccurateRatingMatches = 0;

	let totalDivisionPlacementSpots = 0;
	let totalDivisionTopSeeds = 0;
	let totalDivisionTopSeedsPlaced = 0;
	let totalDivisionTopRatings = 0;
	let totalDivisionTopRatingsPlaced = 0;

	bracketWeightClasses.forEach(weightClassItem => {
		totalSeedPredictableMatches += weightClassItem.matchesWithSeedPredictionCount;
		totalAccurateSeedMatches += weightClassItem.accurateSeedMatchesCount;
		totalDivisionMatches += weightClassItem.totalMatchesCount;
		totalAccurateRatingMatches += weightClassItem.accurateRatingMatchesCount;

		totalDivisionPlacementSpots += weightClassItem.placementSpotsCount;
		totalDivisionTopSeeds += weightClassItem.topSeedsCount;
		totalDivisionTopSeedsPlaced += weightClassItem.topSeedsPlacedCount;
		totalDivisionTopRatings += weightClassItem.topRatingsCount;
		totalDivisionTopRatingsPlaced += weightClassItem.topRatingsPlacedCount;
	});

	const overallSeedAccuracyPercentage = totalSeedPredictableMatches > 0 ? (totalAccurateSeedMatches / totalSeedPredictableMatches) * 100 : null;
	const overallRatingAccuracyPercentage = totalDivisionMatches > 0 ? (totalAccurateRatingMatches / totalDivisionMatches) * 100 : null;

	const overallTopSeedPlacementPercentage = totalDivisionTopSeeds > 0 ? (totalDivisionTopSeedsPlaced / totalDivisionTopSeeds) * 100 : null;
	const overallTopRatingPlacementPercentage = totalDivisionTopRatings > 0 ? (totalDivisionTopRatingsPlaced / totalDivisionTopRatings) * 100 : null;

	// Active weight class for Bracket details view
	const activeBracketWeightClass = bracketWeightClasses.find(item => item.weightClass === selectedBracketWeightClass);

	// Active wrestler for Wrestler details view
	const activeBracketWrestler = activeBracketWeightClass?.wrestlers.find(wrestlerItem => wrestlerItem.wrestlerSqlId === selectedBracketWrestlerSqlId);

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUser} />

			<div className={`container ${pageActive ? "active" : ""}`}>
				{/* Header */}
				<header className="header">
					<h1 className="title">{event.name}</h1>
					<div className="divisionContainer" style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
						{uniqueDivisions.length > 1 && (
							<select
								className="divisionDropdown"
								value={selectedDivision}
								onChange={(changeEvent) => {
									setSelectedDivision(changeEvent.target.value);
									setSelectedBracketWeightClass("");
									setSelectedBracketWrestlerSqlId(null);
									setHighlightedWrestlerSqlId(null);
								}}
							>
								{uniqueDivisions.map((division, index) => (
									<option key={index} value={division}>{division}</option>
								))}
							</select>
						)}
						{activeView === "teams" && uniqueTeams.length > 0 && (
							<select
								className="divisionDropdown"
								value={selectedTeam}
								onChange={(changeEvent) => setSelectedTeam(changeEvent.target.value)}
							>
								{uniqueTeams.map((teamName, index) => (
									<option key={index} value={teamName}>{teamName}</option>
								))}
							</select>
						)}
						{activeView === "weight_classes" && uniqueWeightClasses.length > 0 && (
							<select
								className="divisionDropdown"
								value={selectedWeightClass}
								onChange={(changeEvent) => setSelectedWeightClass(changeEvent.target.value)}
							>
								{uniqueWeightClasses.map((weightClassName, index) => (
									<option key={index} value={weightClassName}>{weightClassName}</option>
								))}
							</select>
						)}
					</div>
				</header>

				{/* Overview View */}
				{activeView === "overview" && (
					<>
						{/* KPI summary cards */}
						<section className="kpis">
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<polygon points="12 2 22 8.5 2 8.5" />
										<rect x="3" y="14" width="7" height="7" />
										<circle cx="17.5" cy="17.5" r="3.5" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{uniqueDivisions.length}</span>
									<span className="kpiLbl">DIVISIONS</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M12 3v18M12 7l-8-2M12 7l8-2M4 5v4a4 4 0 0 0 8 0V5M20 5v4a4 4 0 0 1-8 0V5M4 19h16" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{wtClassesCount}</span>
									<span className="kpiLbl">WT CLASSES</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
										<circle cx="9" cy="7" r="4" />
										<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
										<path d="M16 3.13a4 4 0 0 1 0 7.75" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{teamsCount}</span>
									<span className="kpiLbl">TEAMS</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
										<circle cx="12" cy="7" r="4" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{wrestlersCount}</span>
									<span className="kpiLbl">WRESTLERS</span>
								</div>
							</div>
						</section>

						{/* Tournament Intensity Card */}
						<section className="intensitySection">
							<div className="intensityCard">
								<h3 className="intensityTitle">Tournament Intensity</h3>
								<div className="intensityStats">
									<span className="intensityVal">{avgGlicko.toFixed(0)}</span>
									<span className="intensityLbl">AVG GLICKO</span>
								</div>
								<div className="curveContainer">
									<svg viewBox="0 0 300 120" className="curveSvg">
										<defs>
											<linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="#fd8b00" stopOpacity="0.4" />
												<stop offset="100%" stopColor="#fd8b00" stopOpacity="0.0" />
											</linearGradient>
										</defs>
										{/* Shaded Area under Curve (closed path) */}
										<path d={areaD} fill="url(#curveGradient)" />
										{/* Curve Path (open path without bottom baseline stroke) */}
										<path d={lineD} fill="none" stroke="#fd8b00" strokeWidth="1" />
										{/* Average Marker dashed line */}
										<line
											x1={peakX}
											y1="110"
											x2={peakX}
											y2={peakY}
											stroke="#3c5c93"
											strokeWidth="1.5"
											strokeDasharray="3 3"
										/>
										{/* Axis labels */}
										<text x="5" y="118" fontSize="8" fill="#757687" textAnchor="start">
											{minGlicko.toFixed(0)} (Min)
										</text>
										<text x={peakX} y="118" fontSize="8" fill="#3c5c93" textAnchor="middle">
											{avgGlicko.toFixed(0)} (Avg)
										</text>
										<text x="295" y="118" fontSize="8" fill="#757687" textAnchor="end">
											{maxGlicko.toFixed(0)} (Max)
										</text>
									</svg>
								</div>
							</div>
						</section>

						{/* Insights section */}
						<section className="insightsSection">
							<h2 className="sectionTitle">Insights</h2>
							{topUpsets.length === 0 && topKeyMatches.length === 0 ? (
								<div className="emptyState">No insights found for this division.</div>
							) : (
								<div className="insightsList">
									{topUpsets.map((matchItem, matchIndex) => {
										const winnerWrestler = getWinner(matchItem);
										const loserWrestler = getLoser(matchItem);
										return (
											<div className="insightCard upset" key={`upset-${matchIndex}`}>
												<div className="insightHeader">
													<span className="insightTag upset">MAJOR UPSET</span>
												</div>
												<div className="insightMatchup">
													<div className="wrestler win">
														<span className="wrestlerName">W: {winnerWrestler?.name || "Unknown"}</span>
														<span className="wrestlerGlicko">Glicko: {winnerWrestler?.rating?.toFixed(0)}</span>
													</div>
													<span className="vs">{matchItem.winType}</span>
													<div className="wrestler">
														<span className="wrestlerName">{loserWrestler?.name || "Unknown"}</span>
														<span className="wrestlerGlicko">Glicko: {loserWrestler?.rating?.toFixed(0)}</span>
													</div>
												</div>
												<div className="matchMeta">
													{matchItem.division || "Varsity"} • {isNaN(matchItem.weightClass) ? matchItem.weightClass : `${matchItem.weightClass} lbs`} • {matchItem.roundName || "N/A"}
												</div>
											</div>
										);
									})}
									{topKeyMatches.map((matchItem, matchIndex) => {
										const winnerWrestler = getWinner(matchItem);
										const loserWrestler = getLoser(matchItem);
										return (
											<div className="insightCard keyMatchup" key={`key-${matchIndex}`}>
												<div className="insightHeader">
													<span className="insightTag matchup">KEY MATCHUP</span>
												</div>
												<div className="insightMatchup">
													<div className="wrestler win">
														<span className="wrestlerName">W: {winnerWrestler?.name || "Unknown"}</span>
														<span className="wrestlerGlicko">Glicko: {winnerWrestler?.rating?.toFixed(0)}</span>
													</div>
													<span className="vs">{matchItem.winType}</span>
													<div className="wrestler">
														<span className="wrestlerName">{loserWrestler?.name || "Unknown"}</span>
														<span className="wrestlerGlicko">Glicko: {loserWrestler?.rating?.toFixed(0)}</span>
													</div>
												</div>
												<div className="matchMeta">
													{matchItem.division || "Varsity"} • {isNaN(matchItem.weightClass) ? matchItem.weightClass : `${matchItem.weightClass} lbs`} • {matchItem.roundName || "N/A"}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</section>

						{/* Familiar Faces section */}
						<section className="facesSection">
							<h2 className="sectionTitle">Familiar Faces</h2>
							{teamsList.length === 0 ? (
								<div className="emptyState">No school teams found in this division.</div>
							) : (
								<div className="teamsTableContainer">
									<table className="teamsTable">
										<thead>
											<tr>
												<th>Team</th>
												<th style={{ textAlign: "center" }}>Wrestlers</th>
												<th style={{ textAlign: "center" }}>Wins (Win %)</th>
												<th style={{ textAlign: "center" }}>Placers (%)</th>
											</tr>
										</thead>
										<tbody>
											{teamsList.map((team, index) => (
												<tr key={index} className={team.isFamiliar ? "familiarRow" : ""}>
													<td
														className="teamNameCell"
														style={{ cursor: "pointer" }}
														onClick={() => {
															setSelectedTeam(team.team);
															setActiveView("teams");
														}}
													>
														{team.team}
													</td>
													<td className="heatmapCell" style={{ backgroundColor: getHeatMapColor(team.wrestlerCount, minWrestlers, maxWrestlers) }}>
														<span className="heatmapCellInner">
															{team.wrestlerCount}
														</span>
													</td>
													<td className="heatmapCell" style={{ backgroundColor: getHeatMapColor(team.winPct, minWinPct, maxWinPct) }}>
														<span className="heatmapCellInner">
															{team.wins} ({Math.round(team.winPct * 100)}%)
														</span>
													</td>
													<td className="heatmapCell" style={{ backgroundColor: getHeatMapColor(team.placerPct, minPlacerPct, maxPlacerPct) }}>
														<span className="heatmapCellInner">
															{team.placerCount} ({Math.round(team.placerPct * 100)}%)
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</section>
					</>
				)}

				{/* Teams View */}
				{activeView === "teams" && (
					<>
						{/* KPI summary cards */}
						<section className="kpis">
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
										<circle cx="9" cy="7" r="4" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{teamWrestlersCount}</span>
									<span className="kpiLbl">WRESTLERS</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<circle cx="12" cy="8" r="7" />
										<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{teamWinsCount}</span>
									<span className="kpiLbl">WINS ({Math.round(teamWinPct)}%)</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{teamPlacersCount}</span>
									<span className="kpiLbl">PLACERS ({Math.round(teamPlacerPct)}%)</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{teamUpsetsCount}</span>
									<span className="kpiLbl">UPSETS</span>
								</div>
							</div>
						</section>

						{/* Wrestlers Heatmap Table */}
						<section className="facesSection">
							<h2 className="sectionTitle">{selectedTeam} Wrestler Standings</h2>
							{wrestlersList.length === 0 ? (
								<div className="emptyState">No wrestlers found for this team.</div>
							) : (
								<div className="teamsTableContainer">
									<table className="teamsTable">
										<thead>
											<tr>
												<th>Wrestler</th>
												<th style={{ textAlign: "center" }}>Rating / Dev</th>
												<th style={{ textAlign: "center" }}>Wins</th>
												<th style={{ textAlign: "center" }}>Upsets</th>
											</tr>
										</thead>
										<tbody>
											{wrestlersList.map((wrestler, index) => (
												<tr key={index}>
													<td
														className="teamNameCell"
														style={{ cursor: "pointer" }}
														onClick={() => {
															if (wrestler.weightClass) {
																setSelectedWeightClass(wrestler.weightClass);
																setActiveView("weight_classes");
															}
														}}
													>
														<div>{wrestler.name}</div>
														{wrestler.weightClass && (
															<div style={{ fontSize: "10.5px", color: "#718096", fontWeight: "normal", marginTop: "2.5px" }}>
																{isNaN(wrestler.weightClass) ? wrestler.weightClass : `${wrestler.weightClass} lbs`}
															</div>
														)}
													</td>
													<td style={{ textAlign: "center", color: "#4a5568" }}>
														<div style={{ fontWeight: 600 }}>{wrestler.rating ? Math.round(wrestler.rating) : "N/A"}</div>
														{wrestler.deviation !== undefined && (
															<div style={{ fontSize: "10px", color: "#718096" }}>
																±{Math.round(wrestler.deviation)}
															</div>
														)}
													</td>
													<td className="heatmapCell" style={{ backgroundColor: getHeatMapColor(wrestler.wins, minWrestlerWins, maxWrestlerWins) }}>
														<span className="heatmapCellInner">
															{wrestler.wins}
														</span>
													</td>
													<td className="heatmapCell" style={{ backgroundColor: getHeatMapColor(wrestler.upsets, minWrestlerUpsets, maxWrestlerUpsets) }}>
														<span className="heatmapCellInner">
															{wrestler.upsets}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</section>
					</>
				)}

				{/* Weight Classes View */}
				{activeView === "weight_classes" && (
					<>
						{/* Weight Class KPIs */}
						<section className="kpis">
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
										<circle cx="9" cy="7" r="4" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{weightClassWrestlersCount}</span>
									<span className="kpiLbl">WRESTLERS</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
										<line x1="4" y1="22" x2="4" y2="15" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{weightClassRoundsCount}</span>
									<span className="kpiLbl">ROUNDS</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal">{weightClassUpsetsCount}</span>
									<span className="kpiLbl">UPSETS</span>
								</div>
							</div>
							<div className="kpiCard">
								<div className="kpiIcon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									</svg>
								</div>
								<div className="kpiBody">
									<span className="kpiVal" style={{ fontSize: bracketWinnerName.length > 12 ? "12px" : "15px", whiteSpace: "nowrap" }}>
										{bracketWinnerName}
									</span>
									<span className="kpiLbl">WINNER</span>
								</div>
							</div>
						</section>

						{/* Standings Heatmap Table */}
						<section className="facesSection">
							<h2 className="sectionTitle">{selectedWeightClass} Standings</h2>
							{weightClassWrestlersList.length === 0 ? (
								<div className="emptyState">No wrestlers found in this weight class.</div>
							) : (
								<div className="teamsTableContainer">
									<table className="teamsTable">
										<thead>
											<tr>
												{hasAnySeeds && <th style={{ textAlign: "center", width: "40px" }}>Seed</th>}
												<th>Wrestler</th>
												<th style={{ textAlign: "center" }}>Rating / Dev</th>
												<th style={{ textAlign: "center" }}>Wins</th>
												<th>Last Round</th>
											</tr>
										</thead>
										<tbody>
											{weightClassWrestlersList.map((wrestler, index) => {
												const rank = getWrestlerPlacementRank(wrestler.wrestlerSqlId, weightClassMatches);
												const placementOrdinals = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
												const rankDisplay = rank === 999 ? "—" : placementOrdinals[rank] || `${rank}th`;
												const seedDisplay = wrestler.seed !== undefined && wrestler.seed !== null ? wrestler.seed : "—";

												return (
													<tr key={index}>
														{hasAnySeeds && (
															<td style={{ textAlign: "center", fontWeight: "bold", color: "#718096" }}>
																{seedDisplay}
															</td>
														)}
														<td className="teamNameCell">
															<div>
																{wrestler.name}
																{rankDisplay !== "—" && (
																	<span className="familiarBadge" style={{ backgroundColor: "#e6fffa", color: "#319795", borderColor: "#b2f5ea" }}>
																		{rankDisplay} Place
																	</span>
																)}
															</div>
															<div>({wrestler.team})</div>
														</td>
														<td style={{ textAlign: "center", color: "#4a5568" }}>
															<div style={{ fontWeight: 600 }}>{wrestler.rating ? Math.round(wrestler.rating) : "N/A"}</div>
															{wrestler.deviation !== undefined && (
																<div style={{ fontSize: "10px", color: "#718096" }}>
																	±{Math.round(wrestler.deviation)}
																</div>
															)}
														</td>
														<td className="heatmapCell" style={{ backgroundColor: getHeatMapColor(wrestler.wins, minWeightClassWins, maxWeightClassWins) }}>
															<span className="heatmapCellInner">
																{wrestler.wins}
															</span>
														</td>
														<td style={{ color: "#4a5568", fontSize: "11px", fontWeight: "500" }}>
															{wrestler.lastRound}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</section>

						{/* Matches list by round */}
						<section className="facesSection" style={{ marginTop: "24px" }}>
							<h2 className="sectionTitle">Matches</h2>
							{matchesByRound.length === 0 ? (
								<div className="emptyState">No matches found.</div>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
									{matchesByRound.map((roundGroup, roundIndex) => (
										<div key={roundIndex} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
											{/* Round separator header */}
											<div style={{
												fontFamily: "var(--font-headers)",
												fontSize: "12px",
												color: "var(--primary)",
												borderBottom: "1.5px solid var(--outline)",
												paddingBottom: "4px",
												marginTop: "8px",
												textTransform: "uppercase",
												letterSpacing: "0.05em"
											}}>
												{roundGroup.roundName}
											</div>
											{/* Matches in this round */}
											<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
												{roundGroup.matches.map((matchItem, matchIndex) => {
													return (
														<div 
															key={matchIndex} 
															className="insightCard" 
															style={{ 
																padding: "10px 12px", 
																borderLeft: "4px solid var(--primary-variant)",
																gap: "4px"
															}}
														>
															<div className="insightMatchup">
																{(() => {
																	const winnerWrestler = getWinner(matchItem);
																	const loserWrestler = getLoser(matchItem);
																	const isUpsetMatch = winnerWrestler?.rating && loserWrestler?.rating && 
																		winnerWrestler.rating < loserWrestler.rating - (loserWrestler.deviation || 0) &&
																		!(matchItem.winType && (matchItem.winType.toLowerCase().includes("for") || matchItem.winType.toLowerCase() === "nc"));
																	return (
																		<>
																			<div className="wrestler win" style={{ display: "flex", flexDirection: "column" }}>
																				<span className="wrestlerName" style={{ fontWeight: "bold", color: "var(--primary)" }}>
																					W: {winnerWrestler?.name || "Unknown"}
																				</span>
																				<span style={{ fontSize: "10px", color: "#718096", marginTop: "1px" }}>
																					{winnerWrestler?.team || "Unknown"} • {winnerWrestler?.rating ? `Rating: ${Math.round(winnerWrestler.rating)}` : "No Rating"}
																				</span>
																			</div>
																			<span className="vs" style={{ fontSize: "11px", backgroundColor: "#edf2f7", borderRadius: "4px", padding: "4px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
																				<span style={{ fontWeight: "600" }}>{matchItem.winType || "VS"}</span>
																				{isUpsetMatch && (
																					<span style={{ fontSize: "8px", fontWeight: "800", backgroundColor: "var(--secondary)", color: "#ffffff", padding: "1px 4px", borderRadius: "2px", letterSpacing: "0.03em" }}>
																						UPSET
																					</span>
																				)}
																			</span>
																			<div className="wrestler" style={{ display: "flex", flexDirection: "column" }}>
																				<span className="wrestlerName" style={{ color: "#4a5568" }}>
																					{loserWrestler?.name || "Unknown"}
																				</span>
																				<span style={{ fontSize: "10px", color: "#718096", marginTop: "1px" }}>
																					{loserWrestler?.team || "Unknown"} • {loserWrestler?.rating ? `Rating: ${Math.round(loserWrestler.rating)}` : "No Rating"}
																				</span>
																			</div>
																		</>
																	);
																})()}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									))}
								</div>
							)}
						</section>
					</>
				)}

				{/* Bracket View */}
				{activeView === "bracket" && (
					<>
						{/* View 3: Wrestler Details */}
						{activeBracketWrestler ? (
							(() => {
								const wrestlerMatches = activeBracketWeightClass.matches.filter(matchItem => matchItem.winner?.wrestlerSqlId === activeBracketWrestler.wrestlerSqlId || matchItem.loser?.wrestlerSqlId === activeBracketWrestler.wrestlerSqlId);
								const sortedWrestlerMatches = [...wrestlerMatches].sort((firstMatch, secondMatch) => (firstMatch.sort || 0) - (secondMatch.sort || 0));

								const opponentRatings = sortedWrestlerMatches.map(matchItem => {
									const isWinner = matchItem.winner?.wrestlerSqlId === activeBracketWrestler.wrestlerSqlId;
									const opponent = isWinner ? matchItem.loser : matchItem.winner;
									return opponent?.rating || 1500.0;
								});
								const averageOpponentRating = opponentRatings.length > 0 ? (opponentRatings.reduce((sum, ratingValue) => sum + ratingValue, 0) / opponentRatings.length) : 1500.0;

								const matchWinProbabilities = sortedWrestlerMatches.map(matchItem => {
									const isWinner = matchItem.winner?.wrestlerSqlId === activeBracketWrestler.wrestlerSqlId;
									const opponent = isWinner ? matchItem.loser : matchItem.winner;
									return calculateWinProbability(activeBracketWrestler, opponent);
								});
								const averageWinProbability = matchWinProbabilities.length > 0 ? (matchWinProbabilities.reduce((sum, probabilityValue) => sum + probabilityValue, 0) / matchWinProbabilities.length) : 0.5;
								const pathDifficulty = getDifficultyClassification(averageWinProbability);

								const placementOrdinals = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
								const finishDisplay = activeBracketWrestler.placementRank === 999 ? "Unplaced / DNP" : `${placementOrdinals[activeBracketWrestler.placementRank] || `${activeBracketWrestler.placementRank}th`} Place`;

								return (
									<section>
										<button
											type="button"
											className="backButton"
											onClick={() => setSelectedBracketWrestlerSqlId(null)}
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
												<polyline points="15 18 9 12 15 6" />
											</svg>
											<span>Back to {selectedDivision} {selectedBracketWeightClass}</span>
										</button>

										{/* Wrestler Summary Card */}
										<div className="summaryHeaderCard">
											<div className="summaryHeaderTop">
												<div>
													<div className="summaryWrestlerName">{activeBracketWrestler.name}</div>
													<div className="summaryWrestlerTeam">{activeBracketWrestler.team} • {selectedDivision} {selectedBracketWeightClass} lbs</div>
												</div>
												<span className="wrestlerCardPlaceBadge placer" style={{ fontSize: "11px" }}>
													{finishDisplay}
												</span>
											</div>

											<div className="summaryStatsGrid">
												<div className="summaryStatItem">
													<span className="summaryStatLabel">Bracket Seed</span>
													<span className="summaryStatValue">
														{activeBracketWrestler.seed !== null ? `#${activeBracketWrestler.seed}` : "Unseeded"}
													</span>
												</div>
												<div className="summaryStatItem">
													<span className="summaryStatLabel">Rating Rank</span>
													<span className="summaryStatValue">
														#{activeBracketWrestler.ratingRank} ({Math.round(activeBracketWrestler.rating)} ± {Math.round(activeBracketWrestler.deviation)})
													</span>
												</div>
												<div className="summaryStatItem">
													<span className="summaryStatLabel">Avg Opponent Rating</span>
													<span className="summaryStatValue">
														{Math.round(averageOpponentRating)}
													</span>
												</div>
												<div className="summaryStatItem">
													<span className="summaryStatLabel">Path Difficulty</span>
													<div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
														<span className={`difficultyBadge ${pathDifficulty.colorClass}`}>
															{pathDifficulty.label}
														</span>
														<span style={{ fontSize: "11px", color: "#718096" }}>
															({Math.round(averageWinProbability * 100)}% Win Prob)
														</span>
													</div>
												</div>
											</div>
										</div>

										{/* Match Cards */}
										<h2 className="sectionTitle">Match Path ({sortedWrestlerMatches.length} Matches)</h2>
										{sortedWrestlerMatches.length === 0 ? (
											<div className="emptyState">No tournament matches recorded for this wrestler.</div>
										) : (
											<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
												{sortedWrestlerMatches.map((matchItem, matchIndex) => {
													const isWinner = matchItem.winner?.wrestlerSqlId === activeBracketWrestler.wrestlerSqlId;
													const opponent = isWinner ? matchItem.loser : matchItem.winner;
													const opponentSeedDisplay = opponent?.seed ? `Seed #${opponent.seed}` : "Unseeded";
													const opponentData = activeBracketWeightClass.wrestlers.find(wrestlerItem => wrestlerItem.wrestlerSqlId === opponent?.wrestlerSqlId);
													const opponentRatingRankDisplay = opponentData ? `#${opponentData.ratingRank} Rating in Weight Class` : "Opponent";
													const matchWinProbability = calculateWinProbability(activeBracketWrestler, opponent);
													const matchDifficulty = getDifficultyClassification(matchWinProbability);

													return (
														<div key={matchIndex} className={`matchDetailCard ${isWinner ? "win" : "loss"}`}>
															<div className="matchDetailHeader">
																<span className="matchRoundName">{matchItem.roundName || "Match"}</span>
																<span className={`matchOutcomeBadge ${isWinner ? "win" : "loss"}`}>
																	{isWinner ? "WIN" : "LOSS"}{matchItem.winType ? ` • ${matchItem.winType}` : ""}
																</span>
															</div>

															<div className="matchOpponentRow">
																<div className="matchOpponentName">
																	vs {opponent?.name || "Unknown"}
																</div>
																<div className="matchOpponentMeta">
																	{opponent?.team || "Unknown"} • {opponentSeedDisplay} • {opponentRatingRankDisplay} ({Math.round(opponent?.rating || 1500)} ± {Math.round(opponent?.deviation || 300)})
																</div>
															</div>

															<div className="matchFooterRow">
																<span className="matchWinProbability">
																	Win Prob: {Math.round(matchWinProbability * 100)}%
																</span>
																<span className={`difficultyBadge ${matchDifficulty.colorClass}`}>
																	{matchDifficulty.label}
																</span>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</section>
								);
							})()
						) : activeBracketWeightClass ? (
							/* View 2: Division / Weight Class Details */
							(() => {
								const placementOrdinals = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
								const totalWrestlersCount = activeBracketWeightClass.wrestlers.length;

								// Slopegraph Layout dimensions: uniform vertical spacing across all 3 axes
								const seededWrestlersInWeightClass = activeBracketWeightClass.wrestlers.filter(wrestlerItem => wrestlerItem.seed !== null);
								const maxSeedValue = seededWrestlersInWeightClass.length > 0 ? Math.max(...seededWrestlersInWeightClass.map(wrestlerItem => wrestlerItem.seed)) : 0;
								const placedWrestlersInWeightClass = activeBracketWeightClass.wrestlers.filter(wrestlerItem => wrestlerItem.placementRank !== 999);
								const maxPlacementRankLevel = placedWrestlersInWeightClass.length > 0 ? Math.max(...placedWrestlersInWeightClass.map(wrestlerItem => wrestlerItem.placementRank)) : 8;
								const maxRankNumber = Math.max(maxPlacementRankLevel, maxSeedValue, totalWrestlersCount);

								const hasUnseededWrestlers = activeBracketWeightClass.wrestlers.some(wrestlerItem => wrestlerItem.seed === null);
								const totalLevelSpots = hasUnseededWrestlers ? maxRankNumber + 1 : maxRankNumber;

								const levelSpacing = 26;
								const marginTop = 50;
								const marginBottom = 25;
								const svgHeight = marginTop + (totalLevelSpots * levelSpacing) + marginBottom;
								const svgWidth = 360;

								const seedAxisPosition = 65;
								const placementAxisPosition = 180;
								const ratingAxisPosition = 295;

								const getVerticalCoordinateForRank = (rankNumber) => marginTop + ((rankNumber - 1) * levelSpacing);
								const unseededVerticalCoordinate = marginTop + (maxRankNumber * levelSpacing);

								const getSlopegraphLineColor = (wrestlerItem) => {
									if (wrestlerItem.placementRank === 999) {
										return "#cbd5e0";
									}
									const seedVerticalPosition = wrestlerItem.seed !== null ? getVerticalCoordinateForRank(wrestlerItem.seed) : unseededVerticalCoordinate;
									const placementVerticalPosition = getVerticalCoordinateForRank(wrestlerItem.placementRank);

									if (placementVerticalPosition > seedVerticalPosition) {
										return "#e53e3e"; // Slopes downward to placement: red
									}
									if (placementVerticalPosition < seedVerticalPosition) {
										return "#38a169"; // Slopes upward to placement: green
									}
									return "#38a169"; // Horizontal (aligned with seed): green
								};

								const highlightedWrestler = activeBracketWeightClass.wrestlers.find(wrestlerItem => wrestlerItem.wrestlerSqlId === highlightedWrestlerSqlId);

								// Sort wrestlers for standings list: placed first by place ascending, then unplaced by rating rank ascending
								const sortedStandingsWrestlers = [...activeBracketWeightClass.wrestlers].sort((firstWrestler, secondWrestler) => {
									if (firstWrestler.placementRank !== secondWrestler.placementRank) {
										return firstWrestler.placementRank - secondWrestler.placementRank;
									}
									return firstWrestler.ratingRank - secondWrestler.ratingRank;
								});

								return (
									<section>
										<button
											type="button"
											className="backButton"
											onClick={() => {
												setSelectedBracketWeightClass("");
												setSelectedBracketWrestlerSqlId(null);
												setHighlightedWrestlerSqlId(null);
											}}
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
												<polyline points="15 18 9 12 15 6" />
											</svg>
											<span>Back to Overview</span>
										</button>

										<h2 className="sectionTitle">{selectedDivision} {selectedBracketWeightClass} lbs Bracket Analysis</h2>

										{/* Weight Class KPIs */}
										<div className="kpis">
											<div className="kpiCard">
												<div className="kpiIcon">
													<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
													</svg>
												</div>
												<div className="kpiBody">
													<span className="kpiVal">
														{activeBracketWeightClass.ratingAccuracyPercentage !== null ? `${Math.round(activeBracketWeightClass.ratingAccuracyPercentage)}%` : "N/A"}
													</span>
													<span className="kpiLbl">RATING MATCH ACCURACY</span>
													<span style={{ fontSize: "10px", color: "#718096", marginTop: "2px" }}>
														Seed: {activeBracketWeightClass.seedAccuracyPercentage !== null ? `${Math.round(activeBracketWeightClass.seedAccuracyPercentage)}%` : "N/A"}
													</span>
												</div>
											</div>
											<div className="kpiCard">
												<div className="kpiIcon">
													<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<circle cx="12" cy="8" r="7" />
														<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
													</svg>
												</div>
												<div className="kpiBody">
													<span className="kpiVal">
														{activeBracketWeightClass.topRatingPlacementPercentage !== null ? `${Math.round(activeBracketWeightClass.topRatingPlacementPercentage)}%` : "N/A"}
													</span>
													<span className="kpiLbl">TOP RATING PLACEMENT</span>
													<span style={{ fontSize: "10px", color: "#718096", marginTop: "2px" }}>
														Top Seed: {activeBracketWeightClass.topSeedPlacementPercentage !== null ? `${Math.round(activeBracketWeightClass.topSeedPlacementPercentage)}%` : "N/A"}
													</span>
												</div>
											</div>
										</div>

										{/* Slopegraph */}
										<div className="slopegraphContainer">
											<div className="slopegraphHeader">
												<h3 className="slopegraphTitle">Predictor Alignment (Slopegraph)</h3>
											</div>

											{/* Interactive Slopegraph Banner */}
											<div className="slopegraphBanner">
												{highlightedWrestler ? (
													<>
														<span>
															<strong>{highlightedWrestler.name}</strong> ({highlightedWrestler.team}) • Seed: #{highlightedWrestler.seed || "US"} → Place: {highlightedWrestler.placementRank === 999 ? "DNP" : placementOrdinals[highlightedWrestler.placementRank] || highlightedWrestler.placementRank} → Rating: #{highlightedWrestler.ratingRank}
														</span>
														<button
															type="button"
															style={{
																border: "none",
																background: "var(--primary)",
																color: "#ffffff",
																borderRadius: "3px",
																padding: "2px 8px",
																fontSize: "10px",
																fontWeight: "bold",
																cursor: "pointer",
																marginLeft: "6px"
															}}
															onClick={() => setSelectedBracketWrestlerSqlId(highlightedWrestler.wrestlerSqlId)}
														>
															View Path
														</button>
													</>
												) : (
													<span>Tap or hover a line to trace Seed → Placement → Rating</span>
												)}
											</div>

											<svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="slopegraphSvg">
												{/* Axis Lines */}
												<line x1={seedAxisPosition} y1={marginTop - 10} x2={seedAxisPosition} y2={marginTop + ((totalLevelSpots - 1) * levelSpacing) + 10} stroke="#e2e8f0" strokeWidth="2" />
												<line x1={placementAxisPosition} y1={marginTop - 10} x2={placementAxisPosition} y2={marginTop + ((maxPlacementRankLevel - 1) * levelSpacing) + 10} stroke="#cbd5e0" strokeWidth="2" strokeDasharray="3 3" />
												<line x1={ratingAxisPosition} y1={marginTop - 10} x2={ratingAxisPosition} y2={marginTop + ((totalWrestlersCount - 1) * levelSpacing) + 10} stroke="#e2e8f0" strokeWidth="2" />

												{/* Axis Headers */}
												<text x={seedAxisPosition} y={marginTop - 22} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--primary)">SEED RANK</text>
												<text x={placementAxisPosition} y={marginTop - 22} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2d3748">PLACEMENT</text>
												<text x={ratingAxisPosition} y={marginTop - 22} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--secondary-variant)">RATING RANK</text>

												{/* Left Axis Tick Marks and Labels for each number spot */}
												{Array.from({ length: maxRankNumber }, (_, indexNumber) => indexNumber + 1).map(spotNumber => {
													const verticalCoordinate = getVerticalCoordinateForRank(spotNumber);
													return (
														<g key={`left-tick-${spotNumber}`}>
															<line
																x1={seedAxisPosition - 5}
																y1={verticalCoordinate}
																x2={seedAxisPosition}
																y2={verticalCoordinate}
																stroke="#cbd5e0"
																strokeWidth="1.5"
															/>
															<text
																x={seedAxisPosition - 8}
																y={verticalCoordinate + 3.5}
																textAnchor="end"
																fontSize="9.5"
																fontWeight="600"
																fill="#718096"
															>
																{spotNumber}
															</text>
														</g>
													);
												})}
												{hasUnseededWrestlers && (
													<g key="left-tick-unseeded">
														<line
															x1={seedAxisPosition - 5}
															y1={unseededVerticalCoordinate}
															x2={seedAxisPosition}
															y2={unseededVerticalCoordinate}
															stroke="#cbd5e0"
															strokeWidth="1.5"
														/>
														<text
															x={seedAxisPosition - 8}
															y={unseededVerticalCoordinate + 3.5}
															textAnchor="end"
															fontSize="9"
															fontWeight="600"
															fill="#a0aec0"
														>
															US
														</text>
													</g>
												)}

												{/* Placement Axis Guide Dots for available placement ranks */}
												{Array.from({ length: maxPlacementRankLevel }, (_, indexNumber) => indexNumber + 1).map(placementSpotNumber => {
													const verticalCoordinate = getVerticalCoordinateForRank(placementSpotNumber);
													return (
														<circle
															key={`placement-spot-${placementSpotNumber}`}
															cx={placementAxisPosition}
															cy={verticalCoordinate}
															r="2"
															fill="#e2e8f0"
														/>
													);
												})}

												{/* Right Axis Tick Marks and Labels for each rating rank */}
												{Array.from({ length: totalWrestlersCount }, (_, indexNumber) => indexNumber + 1).map(ratingSpotNumber => {
													const verticalCoordinate = getVerticalCoordinateForRank(ratingSpotNumber);
													return (
														<g key={`rating-tick-${ratingSpotNumber}`}>
															<line
																x1={ratingAxisPosition}
																y1={verticalCoordinate}
																x2={ratingAxisPosition + 5}
																y2={verticalCoordinate}
																stroke="#cbd5e0"
																strokeWidth="1.5"
															/>
															<text
																x={ratingAxisPosition + 8}
																y={verticalCoordinate + 3.5}
																textAnchor="start"
																fontSize="9.5"
																fontWeight="600"
																fill="#718096"
															>
																{ratingSpotNumber}
															</text>
														</g>
													);
												})}

												{/* Wrestler Lines: Placers vs Non-Placers */}
												{activeBracketWeightClass.wrestlers.map(wrestlerItem => {
													const isPlacer = wrestlerItem.placementRank !== 999;
													const seedVerticalCoordinate = wrestlerItem.seed !== null ? getVerticalCoordinateForRank(wrestlerItem.seed) : unseededVerticalCoordinate;
													const ratingVerticalCoordinate = getVerticalCoordinateForRank(wrestlerItem.ratingRank);
													const isHighlighted = highlightedWrestlerSqlId === wrestlerItem.wrestlerSqlId;

													if (isPlacer) {
														const placementVerticalCoordinate = getVerticalCoordinateForRank(wrestlerItem.placementRank);
														const pointsAttribute = `${seedAxisPosition},${seedVerticalCoordinate} ${placementAxisPosition},${placementVerticalCoordinate} ${ratingAxisPosition},${ratingVerticalCoordinate}`;
														const lineColor = getSlopegraphLineColor(wrestlerItem);
														const strokeWidth = isHighlighted ? 3.5 : 2.2;
														const strokeOpacity = highlightedWrestlerSqlId !== null ? (isHighlighted ? 1 : 0.12) : 0.85;

														return (
															<g
																key={wrestlerItem.wrestlerSqlId}
																style={{ cursor: "pointer" }}
																onClick={() => setHighlightedWrestlerSqlId(isHighlighted ? null : wrestlerItem.wrestlerSqlId)}
																onMouseEnter={() => setHighlightedWrestlerSqlId(wrestlerItem.wrestlerSqlId)}
															>
																{/* Transparent thicker path for touch / click */}
																<polyline
																	points={pointsAttribute}
																	fill="none"
																	stroke="transparent"
																	strokeWidth="14"
																/>
																{/* Solid polyline connecting seed -> placement -> rating */}
																<polyline
																	points={pointsAttribute}
																	fill="none"
																	stroke={lineColor}
																	strokeWidth={strokeWidth}
																	strokeOpacity={strokeOpacity}
																	className="slopegraphPolyline"
																/>
																{/* Dots on Seed, Placement, and Rating */}
																<circle cx={seedAxisPosition} cy={seedVerticalCoordinate} r={isHighlighted ? 4.5 : 2.5} fill={lineColor} opacity={strokeOpacity} />
																<circle cx={placementAxisPosition} cy={placementVerticalCoordinate} r={isHighlighted ? 6 : 4} fill={lineColor} opacity={strokeOpacity} />
																<circle cx={ratingAxisPosition} cy={ratingVerticalCoordinate} r={isHighlighted ? 4.5 : 2.5} fill={lineColor} opacity={strokeOpacity} />
															</g>
														);
													}

													// Non-placers: subtle gray line directly from Seed to Rating Rank (no dot on Placement axis)
													const lineColor = isHighlighted ? "#718096" : "#cbd5e0";
													const strokeWidth = isHighlighted ? 2.5 : 1.2;
													const strokeOpacity = highlightedWrestlerSqlId !== null ? (isHighlighted ? 0.95 : 0.08) : 0.35;
													const strokeDasharray = isHighlighted ? "none" : "3 2";

													return (
														<g
															key={wrestlerItem.wrestlerSqlId}
															style={{ cursor: "pointer" }}
															onClick={() => setHighlightedWrestlerSqlId(isHighlighted ? null : wrestlerItem.wrestlerSqlId)}
															onMouseEnter={() => setHighlightedWrestlerSqlId(wrestlerItem.wrestlerSqlId)}
														>
															{/* Transparent thicker line for touch / click */}
															<line
																x1={seedAxisPosition}
																y1={seedVerticalCoordinate}
																x2={ratingAxisPosition}
																y2={ratingVerticalCoordinate}
																stroke="transparent"
																strokeWidth="14"
															/>
															{/* Subtle line directly connecting seed to rating rank */}
															<line
																x1={seedAxisPosition}
																y1={seedVerticalCoordinate}
																x2={ratingAxisPosition}
																y2={ratingVerticalCoordinate}
																stroke={lineColor}
																strokeWidth={strokeWidth}
																strokeOpacity={strokeOpacity}
																strokeDasharray={strokeDasharray}
																className="slopegraphPolyline"
															/>
															{/* Dots on Seed and Rating only (NO dot on placement axis) */}
															<circle cx={seedAxisPosition} cy={seedVerticalCoordinate} r={isHighlighted ? 4 : 2} fill={lineColor} opacity={strokeOpacity} />
															<circle cx={ratingAxisPosition} cy={ratingVerticalCoordinate} r={isHighlighted ? 4 : 2} fill={lineColor} opacity={strokeOpacity} />
														</g>
													);
												})}
											</svg>
										</div>

										{/* Wrestlers Standings List under Slopegraph */}
										<h2 className="sectionTitle">Wrestlers Standings ({sortedStandingsWrestlers.length})</h2>
										<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
											{sortedStandingsWrestlers.map(wrestlerItem => {
												const isHighlighted = highlightedWrestlerSqlId === wrestlerItem.wrestlerSqlId;
												const placementBadgeClass = wrestlerItem.placementRank === 1 ? "gold"
													: wrestlerItem.placementRank === 2 ? "silver"
													: wrestlerItem.placementRank === 3 ? "bronze"
													: wrestlerItem.placementRank <= 8 ? "placer"
													: "unplaced";
												const isPlacedWrestler = wrestlerItem.placementRank !== 999;
												const placementText = isPlacedWrestler ? `${placementOrdinals[wrestlerItem.placementRank] || `${wrestlerItem.placementRank}th`} Place` : "DNP";

												// Alignment calculation (only applicable to placed wrestlers)
												const seedDelta = (isPlacedWrestler && wrestlerItem.seed !== null) ? Math.abs(wrestlerItem.seed - wrestlerItem.placementRank) : 999;
												const ratingDelta = isPlacedWrestler ? Math.abs(wrestlerItem.ratingRank - wrestlerItem.placementRank) : 999;
												const alignmentLabel = ratingDelta < seedDelta ? "Rating closer" : seedDelta < ratingDelta ? "Seed closer" : "Aligned";
												const alignmentClass = ratingDelta < seedDelta ? "ratingAdvantage" : seedDelta < ratingDelta ? "seedAdvantage" : "neutral";

												return (
													<div
														key={wrestlerItem.wrestlerSqlId}
														className={`wrestlerCardItem ${isHighlighted ? "highlighted" : ""}`}
														onClick={() => setSelectedBracketWrestlerSqlId(wrestlerItem.wrestlerSqlId)}
														onMouseEnter={() => setHighlightedWrestlerSqlId(wrestlerItem.wrestlerSqlId)}
													>
														<div className="wrestlerCardTopRow">
															<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
																<span className={`wrestlerCardPlaceBadge ${placementBadgeClass}`}>
																	{placementText}
																</span>
																<span style={{ fontWeight: 700, color: "#1a202c", fontSize: "13.5px" }}>
																	{wrestlerItem.name}
																</span>
																<span style={{ color: "#718096", fontSize: "11px" }}>
																	({wrestlerItem.team})
																</span>
															</div>
															<span className="bracketChevron">
																<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
																	<polyline points="9 18 15 12 9 6" />
																</svg>
															</span>
														</div>

														<div className="wrestlerCardBottomRow">
															<span>
																Seed: <strong>{wrestlerItem.seed !== null ? `#${wrestlerItem.seed}` : "US"}</strong> • Rating: <strong>#{wrestlerItem.ratingRank}</strong> ({Math.round(wrestlerItem.rating)} ± {Math.round(wrestlerItem.deviation)})
															</span>
															{isPlacedWrestler && (
																<span className={`bracketComparisonBadge ${alignmentClass}`}>
																	{alignmentLabel}
																</span>
															)}
														</div>
													</div>
												);
											})}
										</div>
									</section>
								);
							})()
						) : (
							/* View 1: Bracket Overview */
							<section>
								{/* KPI Cards */}
								<div className="kpis">
									<div className="kpiCard">
										<div className="kpiIcon">
											<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
											</svg>
										</div>
										<div className="kpiBody">
											<span className="kpiVal">
												{overallRatingAccuracyPercentage !== null ? `${Math.round(overallRatingAccuracyPercentage)}%` : "N/A"}
											</span>
											<span className="kpiLbl">RATING MATCH ACCURACY</span>
											<span style={{ fontSize: "10.5px", color: "#718096", marginTop: "2px" }}>
												Seed Accuracy: {overallSeedAccuracyPercentage !== null ? `${Math.round(overallSeedAccuracyPercentage)}%` : "N/A"}
											</span>
											{overallRatingAccuracyPercentage !== null && overallSeedAccuracyPercentage !== null && (
												<span className={`bracketComparisonBadge ${overallRatingAccuracyPercentage > overallSeedAccuracyPercentage ? "ratingAdvantage" : overallSeedAccuracyPercentage > overallRatingAccuracyPercentage ? "seedAdvantage" : "neutral"}`} style={{ marginTop: "4px" }}>
													{overallRatingAccuracyPercentage > overallSeedAccuracyPercentage ? `Rating +${Math.round(overallRatingAccuracyPercentage - overallSeedAccuracyPercentage)}%` : overallSeedAccuracyPercentage > overallRatingAccuracyPercentage ? `Seed +${Math.round(overallSeedAccuracyPercentage - overallRatingAccuracyPercentage)}%` : "Tied"}
												</span>
											)}
										</div>
									</div>

									<div className="kpiCard">
										<div className="kpiIcon">
											<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<circle cx="12" cy="8" r="7" />
												<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
											</svg>
										</div>
										<div className="kpiBody">
											<span className="kpiVal">
												{overallTopRatingPlacementPercentage !== null ? `${Math.round(overallTopRatingPlacementPercentage)}%` : "N/A"}
											</span>
											<span className="kpiLbl">TOP RATING PLACEMENT</span>
											<span style={{ fontSize: "10.5px", color: "#718096", marginTop: "2px" }}>
												Top Seed: {overallTopSeedPlacementPercentage !== null ? `${Math.round(overallTopSeedPlacementPercentage)}%` : "N/A"}
											</span>
											{overallTopRatingPlacementPercentage !== null && overallTopSeedPlacementPercentage !== null && (
												<span className={`bracketComparisonBadge ${overallTopRatingPlacementPercentage > overallTopSeedPlacementPercentage ? "ratingAdvantage" : overallTopSeedPlacementPercentage > overallTopRatingPlacementPercentage ? "seedAdvantage" : "neutral"}`} style={{ marginTop: "4px" }}>
													{overallTopRatingPlacementPercentage > overallTopSeedPlacementPercentage ? `Rating +${Math.round(overallTopRatingPlacementPercentage - overallTopSeedPlacementPercentage)}%` : overallTopSeedPlacementPercentage > overallTopRatingPlacementPercentage ? `Seed +${Math.round(overallTopSeedPlacementPercentage - overallTopRatingPlacementPercentage)}%` : "Tied"}
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Division & Weight Class List (Mobile-Optimized Cards) */}
								<h2 className="sectionTitle">Division Weight Classes ({bracketWeightClasses.length})</h2>
								{bracketWeightClasses.length === 0 ? (
									<div className="emptyState">No seeded weight classes found in this division.</div>
								) : (
									<div className="bracketCardsList">
										{bracketWeightClasses.map(weightClassItem => {
											const ratingBetterMatch = weightClassItem.ratingAccuracyPercentage !== null && weightClassItem.seedAccuracyPercentage !== null && weightClassItem.ratingAccuracyPercentage > weightClassItem.seedAccuracyPercentage;
											const seedBetterMatch = weightClassItem.seedAccuracyPercentage !== null && weightClassItem.ratingAccuracyPercentage !== null && weightClassItem.seedAccuracyPercentage > weightClassItem.ratingAccuracyPercentage;

											return (
												<div
													key={weightClassItem.weightClass}
													className="bracketOverviewCard"
													onClick={() => {
														setSelectedBracketWeightClass(weightClassItem.weightClass);
														setSelectedBracketWrestlerSqlId(null);
														setHighlightedWrestlerSqlId(null);
													}}
												>
													<div className="bracketCardHeader">
														<div className="bracketWeightClassName">
															{weightClassItem.division} • {isNaN(weightClassItem.weightClass) ? weightClassItem.weightClass : `${weightClassItem.weightClass} lbs`}
														</div>
														<span className="bracketChevron">
															<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
																<polyline points="9 18 15 12 9 6" />
															</svg>
														</span>
													</div>

													<div className="bracketMetricsGrid">
														<div className="bracketMetricBlock">
															<span className="bracketMetricLabel">Match Accuracy</span>
															<span className="bracketMetricValue">
																Seed: {weightClassItem.seedAccuracyPercentage !== null ? `${Math.round(weightClassItem.seedAccuracyPercentage)}%` : "N/A"} ({weightClassItem.accurateSeedMatchesCount}/{weightClassItem.matchesWithSeedPredictionCount})
															</span>
															<span className="bracketMetricValue" style={{ color: "var(--primary)" }}>
																Rating: {weightClassItem.ratingAccuracyPercentage !== null ? `${Math.round(weightClassItem.ratingAccuracyPercentage)}%` : "N/A"} ({weightClassItem.accurateRatingMatchesCount}/{weightClassItem.totalMatchesCount})
															</span>
														</div>

														<div className="bracketMetricBlock">
															<span className="bracketMetricLabel">Placement Accuracy</span>
															<span className="bracketMetricValue">
																Top Seeds: {weightClassItem.topSeedsPlacedCount}/{weightClassItem.topSeedsCount} ({weightClassItem.topSeedPlacementPercentage !== null ? `${Math.round(weightClassItem.topSeedPlacementPercentage)}%` : "N/A"})
															</span>
															<span className="bracketMetricValue" style={{ color: "var(--primary)" }}>
																Top Ratings: {weightClassItem.topRatingsPlacedCount}/{weightClassItem.topRatingsCount} ({weightClassItem.topRatingPlacementPercentage !== null ? `${Math.round(weightClassItem.topRatingPlacementPercentage)}%` : "N/A"})
															</span>
														</div>
													</div>

													<div>
														<span className={`bracketComparisonBadge ${ratingBetterMatch ? "ratingAdvantage" : seedBetterMatch ? "seedAdvantage" : "neutral"}`}>
															{ratingBetterMatch ? `Rating +${Math.round(weightClassItem.ratingAccuracyPercentage - weightClassItem.seedAccuracyPercentage)}% Match Accuracy`
																: seedBetterMatch ? `Seed +${Math.round(weightClassItem.seedAccuracyPercentage - weightClassItem.ratingAccuracyPercentage)}% Match Accuracy`
																: "Predictors Aligned"}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</section>
						)}
					</>
				)}
			</div>

			{/* Sticky Bottom Navigation Bar */}
			<div className="bottomNav">
				<div className={`navItem ${activeView === "overview" ? "active" : ""}`} onClick={() => setActiveView("overview")}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<line x1="9" y1="3" x2="9" y2="21" />
						<line x1="15" y1="3" x2="15" y2="21" />
						<line x1="3" y1="9" x2="21" y2="9" />
						<line x1="3" y1="15" x2="21" y2="15" />
					</svg>
					<span>Overview</span>
				</div>
				<div className={`navItem ${activeView === "teams" ? "active" : ""}`} onClick={() => setActiveView("teams")}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
					<span>Teams</span>
				</div>
				<div className={`navItem ${activeView === "weight_classes" ? "active" : ""}`} onClick={() => setActiveView("weight_classes")}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M12 3v18M12 7l-8-2M12 7l8-2M4 5v4a4 4 0 0 0 8 0V5M20 5v4a4 4 0 0 1-8 0V5M4 19h16" />
					</svg>
					<span>Weight Classes</span>
				</div>
				{tournamentHasSeeding && (
					<div className={`navItem ${activeView === "bracket" ? "active" : ""}`} onClick={() => setActiveView("bracket")}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M3 5h5v4h6v3" />
							<path d="M3 19h5v-4h6v-3" />
							<path d="M14 12h7" />
							<circle cx="3" cy="5" r="1" />
							<circle cx="3" cy="19" r="1" />
							<circle cx="21" cy="12" r="1" />
						</svg>
						<span>Bracket</span>
					</div>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TournamentSummary />);
export default TournamentSummary;
