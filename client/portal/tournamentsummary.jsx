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

const TournamentSummary = () => {
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [event, setEvent] = useState(null);
	const [selectedDivision, setSelectedDivision] = useState("");
	const [activeView, setActiveView] = useState("overview");
	const [selectedTeam, setSelectedTeam] = useState("");
	const [selectedWeightClass, setSelectedWeightClass] = useState("");

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
						matches: (data.event?.matches || []).map(match => ({
							...match,
							winner: (match.wrestlers || []).find(wrestler => wrestler.isWinner === true),
							loser: (match.wrestlers || []).find(wrestler => wrestler.isWinner === false)
						}))
					};

					setEvent(eventUpdated);
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);

					// Determine available divisions and set default selected
					const matches = eventUpdated?.matches || [];
					const uniqueDivs = Array.from(new Set(matches.map(m => m.division || "Varsity"))).filter(Boolean);
					setSelectedDivision(uniqueDivs.includes("Varsity") ? "Varsity" : (uniqueDivs[0] || "Varsity"));
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

	// Helper to resolve numerical placement rank of a wrestler in the weight class matches
	const getWrestlerPlacementRank = (wrestlerSqlId, matchesList) => {
		for (let index = matchesList.length - 1; index >= 0; index--) {
			const match = matchesList[index];
			if (!match.roundName) continue;
			const roundNameLower = match.roundName.toLowerCase().trim();

			// 1st / 2nd Place
			if (roundNameLower === "finals" || 
				roundNameLower === "championship" || 
				roundNameLower === "final" || 
				roundNameLower.includes("1st place") || 
				roundNameLower.includes("1st-place")) {
				if (match.winner?.wrestlerSqlId === wrestlerSqlId) return 1;
				if (match.loser?.wrestlerSqlId === wrestlerSqlId) return 2;
			}

			// 3rd / 4th Place
			if (roundNameLower.includes("3rd place") || 
				roundNameLower.includes("3rd-place") || 
				roundNameLower === "consi-final" || 
				roundNameLower === "consolation final" || 
				roundNameLower.includes("consi-final")) {
				if (match.winner?.wrestlerSqlId === wrestlerSqlId) return 3;
				if (match.loser?.wrestlerSqlId === wrestlerSqlId) return 4;
			}

			// 5th / 6th Place
			if (roundNameLower.includes("5th place") || 
				roundNameLower.includes("5th-place")) {
				if (match.winner?.wrestlerSqlId === wrestlerSqlId) return 5;
				if (match.loser?.wrestlerSqlId === wrestlerSqlId) return 6;
			}

			// 7th / 8th Place
			if (roundNameLower.includes("7th place") || 
				roundNameLower.includes("7th-place")) {
				if (match.winner?.wrestlerSqlId === wrestlerSqlId) return 7;
				if (match.loser?.wrestlerSqlId === wrestlerSqlId) return 8;
			}
		}
		return 999; // Unplaced / N/A
	};

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
								onChange={(changeEvent) => setSelectedDivision(changeEvent.target.value)}
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
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TournamentSummary />);
export default TournamentSummary;
