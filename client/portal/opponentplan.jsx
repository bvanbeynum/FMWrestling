import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/opponentplan.css";

const standardWeightClasses = [
	"106", "113", "120", "126", "132", "138", "144",
	"150", "157", "165", "175", "190", "215", "285"
];

const evaluateBoutOutcome = (homeCandidate, opponentCandidate) => {
	if (!homeCandidate && !opponentCandidate) {
		return { projectedPoints: 0, projectedOutcome: "OPEN 0" };
	}
	if (homeCandidate && !opponentCandidate) {
		return { projectedPoints: 6, projectedOutcome: "FORFEIT +6" };
	}
	if (!homeCandidate && opponentCandidate) {
		return { projectedPoints: -6, projectedOutcome: "FORFEIT -6" };
	}

	const effectiveHomeRating = homeCandidate.effectiveRating !== undefined
		? homeCandidate.effectiveRating
		: (homeCandidate.rating || 0);
	const effectiveOpponentRating = opponentCandidate.effectiveRating !== undefined
		? opponentCandidate.effectiveRating
		: (opponentCandidate.rating || 0);
	const effectiveRatingDiff = effectiveHomeRating - effectiveOpponentRating;

	if (effectiveRatingDiff > 250) {
		return { projectedPoints: 6, projectedOutcome: "PIN +6" };
	}
	if (effectiveRatingDiff > 175) {
		return { projectedPoints: 5, projectedOutcome: "TF +5" };
	}
	if (effectiveRatingDiff > 100) {
		return { projectedPoints: 4, projectedOutcome: "MAJ +4" };
	}
	if (effectiveRatingDiff >= 0) {
		return { projectedPoints: 3, projectedOutcome: "DEC +3" };
	}
	if (effectiveRatingDiff >= -100) {
		return { projectedPoints: -3, projectedOutcome: "DEC -3" };
	}
	if (effectiveRatingDiff >= -175) {
		return { projectedPoints: -4, projectedOutcome: "MAJ -4" };
	}
	if (effectiveRatingDiff >= -250) {
		return { projectedPoints: -5, projectedOutcome: "TF -5" };
	}
	return { projectedPoints: -6, projectedOutcome: "PIN -6" };
};

const OpponentPlan = () => {
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isOpponentLoading, setIsOpponentLoading] = useState(false);
	const [isOptimizing, setIsOptimizing] = useState(false);
	const [pollingStepCount, setPollingStepCount] = useState(1);
	const [loggedInUser, setLoggedInUser] = useState(null);

	const [schools, setSchools] = useState([]);
	const [opponentGroups, setOpponentGroups] = useState([]);
	const [selectedOpponentId, setSelectedOpponentId] = useState("");
	const [selectedOpponent, setSelectedOpponent] = useState(null);

	const [initializationMode, setInitializationMode] = useState("");
	const [pastEvents, setPastEvents] = useState([]);
	const [selectedPastEventKey, setSelectedPastEventKey] = useState("");
	const [savedLineups, setSavedLineups] = useState([]);
	const [selectedSavedLineupId, setSelectedSavedLineupId] = useState("");

	const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
	const [savePlanName, setSavePlanName] = useState("");
	const [isSavingPlan, setIsSavingPlan] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const [weightClassMatchups, setWeightClassMatchups] = useState([]);

	const pollIntervalRef = useRef(null);

	useEffect(() => {
		fetch("/api/opponentplanload")
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				}
				throw new Error(apiResponse.statusText);
			})
			.then(responseData => {
				const loadedSchools = responseData.schools || [];
				setSchools(loadedSchools);

				const uniqueGroupKeys = [
					...new Set(
						loadedSchools.map(school => (school.classification || "N/A") + "|" + (school.region || "N/A"))
					)
				];

				const sortedGroups = uniqueGroupKeys
					.map(schoolGroupKey => ({
						name: `${schoolGroupKey.split("|")[0]} - ${schoolGroupKey.split("|")[1]}`,
						classification: schoolGroupKey.split("|")[0],
						region: schoolGroupKey.split("|")[1],
						schools: loadedSchools
							.filter(school => (school.classification || "N/A") + "|" + (school.region || "N/A") === schoolGroupKey)
							.sort((firstSchool, secondSchool) => (firstSchool.name > secondSchool.name ? 1 : -1))
					}))
					.sort((firstGroup, secondGroup) =>
						(/\d/.test(secondGroup.classification?.[0]) - /\d/.test(firstGroup.classification?.[0])) ||
						(/\d/.test(firstGroup.classification?.[0])
							? secondGroup.classification[0].localeCompare(firstGroup.classification[0])
							: firstGroup.classification.localeCompare(secondGroup.classification)
						) ||
						(firstGroup.region || "").localeCompare(secondGroup.region || "", undefined, { numeric: true })
					);

				setOpponentGroups(sortedGroups);
				setLoggedInUser(responseData.loggedInUser);
				setIsLoading(false);
				setPageActive(true);
			})
			.catch(fetchError => {
				console.warn("Failed to load opponent plan schools:", fetchError);
				setErrorMessage("Failed to load opponent schools.");
				setIsLoading(false);
			});

		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, []);

	const triggerOptimization = (matchupsToOptimize, modeLabel, opponentIdToUse) => {
		if (!matchupsToOptimize || matchupsToOptimize.length === 0) {
			return;
		}

		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}

		setIsOptimizing(true);
		setPollingStepCount(1);
		setIsSavePromptOpen(false);
		setErrorMessage("");

		const requestWeightClasses = matchupsToOptimize.map(matchup => ({
			weightClass: matchup.weightClass,
			lockedHomeWrestlerId: matchup.isHomeLocked ? (matchup.homeWrestler ? matchup.homeWrestler.id : null) : null,
			isHomeLocked: Boolean(matchup.isHomeLocked),
			lockedOpponentWrestlerId: matchup.isOpponentLocked ? (matchup.opponentWrestler ? matchup.opponentWrestler.id : null) : null,
			isOpponentLocked: Boolean(matchup.isOpponentLocked),
			homeCandidates: matchup.homeOptions.slice(0, 6),
			opponentCandidates: matchup.opponentOptions.slice(0, 6)
		}));

		fetch("/api/opponentplanoptimize", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				schoolId: opponentIdToUse || selectedOpponentId,
				mode: modeLabel || "ai",
				weightClasses: requestWeightClasses
			})
		})
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				}
				throw new Error(apiResponse.statusText);
			})
			.then(startData => {
				if (!startData.jobId) {
					setIsOptimizing(false);
					setErrorMessage("Optimization job failed to start.");
					return;
				}

				const activeJobId = startData.jobId;
				pollIntervalRef.current = setInterval(() => {
					fetch(`/api/opponentplanoptimize?jobid=${encodeURIComponent(activeJobId)}`)
						.then(pollResponse => {
							if (pollResponse.ok) {
								return pollResponse.json();
							}
							throw new Error(pollResponse.statusText);
						})
						.then(jobStatusData => {
							if (jobStatusData.status === "processing") {
								setPollingStepCount(previousCount => previousCount + 1);
								return;
							}

							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
							setIsOptimizing(false);

							if (jobStatusData.status === "completed" && jobStatusData.optimization) {
								const optimizedLineup = jobStatusData.optimization.lineup || [];

								setWeightClassMatchups(previousMatchups =>
									previousMatchups.map(currentMatchup => {
										const optimizedSlot = optimizedLineup.find(
											slotItem => String(slotItem.weightClass) === String(currentMatchup.weightClass)
										);

										const nextHomeWrestler = currentMatchup.isHomeLocked
											? currentMatchup.homeWrestler
											: (optimizedSlot && optimizedSlot.homeWrestlerId
												? currentMatchup.homeOptions.find(option => String(option.id) === String(optimizedSlot.homeWrestlerId)) || null
												: null);

										const nextOpponentWrestler = currentMatchup.isOpponentLocked
											? currentMatchup.opponentWrestler
											: (optimizedSlot && optimizedSlot.opponentWrestlerId
												? currentMatchup.opponentOptions.find(option => String(option.id) === String(optimizedSlot.opponentWrestlerId)) || null
												: null);

										const boutOutcome = evaluateBoutOutcome(nextHomeWrestler, nextOpponentWrestler);

										return {
											...currentMatchup,
											homeWrestler: nextHomeWrestler,
											opponentWrestler: nextOpponentWrestler,
											isHomeVacated: false,
											isOpponentVacated: false,
											isHomeBump: Boolean(nextHomeWrestler && nextHomeWrestler.isBump),
											isOpponentBump: Boolean(nextOpponentWrestler && nextOpponentWrestler.isBump),
											projectedPoints: boutOutcome.projectedPoints,
											projectedOutcome: boutOutcome.projectedOutcome,
											coachingNote: optimizedSlot && optimizedSlot.coachingNote ? optimizedSlot.coachingNote : ""
										};
									})
								);
							} else {
								setErrorMessage(jobStatusData.error || "Failed to optimize lineup.");
							}
						})
						.catch(pollError => {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
							setIsOptimizing(false);
							console.warn("Polling error:", pollError);
							setErrorMessage("Error checking optimization status.");
						});
				}, 2000);
			})
			.catch(requestError => {
				setIsOptimizing(false);
				console.warn("Optimization request failed:", requestError);
				setErrorMessage("Failed to start lineup optimization.");
			});
	};

	const homeProjectedScore = weightClassMatchups.reduce(
		(runningTotal, matchup) => runningTotal + (matchup.projectedPoints > 0 ? matchup.projectedPoints : 0),
		0
	);
	const opponentProjectedScore = weightClassMatchups.reduce(
		(runningTotal, matchup) => runningTotal + (matchup.projectedPoints < 0 ? Math.abs(matchup.projectedPoints) : 0),
		0
	);
	const homeProjectedWins = weightClassMatchups.reduce(
		(runningTotal, matchup) => runningTotal + (matchup.projectedPoints > 0 ? 1 : 0),
		0
	);
	const opponentProjectedWins = weightClassMatchups.reduce(
		(runningTotal, matchup) => runningTotal + (matchup.projectedPoints < 0 ? 1 : 0),
		0
	);

	const homeActualScore = weightClassMatchups.reduce(
		(runningTotal, matchup) => runningTotal + (Number(matchup.homeScore) || 0),
		0
	);
	const opponentActualScore = weightClassMatchups.reduce(
		(runningTotal, matchup) => runningTotal + (Number(matchup.opponentScore) || 0),
		0
	);
	const homeActualWins = weightClassMatchups.reduce(
		(runningTotal, matchup) => runningTotal + ((Number(matchup.homeScore) || 0) > 0 ? 1 : 0),
		0
	);
	const opponentActualWins = weightClassMatchups.reduce(
		(runningTotal, matchup) => runningTotal + ((Number(matchup.opponentScore) || 0) > 0 ? 1 : 0),
		0
	);

	const isBusy = isOpponentLoading || isOptimizing || isSavingPlan;

	const hasAuthorizedAccess = Boolean(
		loggedInUser &&
		loggedInUser.privileges &&
		(
			loggedInUser.privileges.some(privilege => privilege.token === "teamManage" || privilege.name === "teamManage") ||
			loggedInUser.privileges.includes("teamManage")
		)
	);

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUser} />

			<div className="report-content-wrapper">
				{isLoading ? (
					<div className="pageLoading">
						<img src="/media/wrestlingloading.gif" alt="Loading..." />
					</div>
				) : !hasAuthorizedAccess ? (
					<div className="noAccess">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z" />
						</svg>
						<a>Unauthorized Access</a>
					</div>
				) : (
					<div>
						<div className={`opponentreport container ${pageActive ? "active" : ""}`}>
							<header>
								<h1>Opponent Plan</h1>
							</header>

							{/* Filters Row (matching opponentmatch.jsx) */}
							<div className="filters-header-row">
								<div className="filter-item-group">
									<span className="filter-item-label">Opponent:</span>
									<select
										value={selectedOpponentId}
										disabled={isBusy}
										onChange={changeEvent => {
											const chosenOpponentId = changeEvent.target.value;
											const matchedSchool = schools.find(school => String(school.id) === String(chosenOpponentId)) || null;

											setSelectedOpponentId(chosenOpponentId);
											setSelectedOpponent(matchedSchool);
											setInitializationMode("");
											setSelectedPastEventKey("");
											setSelectedSavedLineupId("");
											setSavePlanName("");
											setIsSavePromptOpen(false);
											setErrorMessage("");

											if (!matchedSchool) {
												setWeightClassMatchups([]);
												setPastEvents([]);
												setSavedLineups([]);
												return;
											}

											setIsOpponentLoading(true);
											fetch(`/api/opponentplanselect?opponent=${encodeURIComponent(chosenOpponentId)}`)
												.then(apiResponse => {
													if (apiResponse.ok) {
														return apiResponse.json();
													}
													throw new Error(apiResponse.statusText);
												})
												.then(responseData => {
													const currentSeasonBoundary = responseData.currentSeasonStartDate
														? new Date(responseData.currentSeasonStartDate)
														: new Date(new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1, 8, 1);

													const fetchedOpponentWrestlers = responseData.opponentWrestlers || [];
													const fetchedOpponentEvents = (responseData.opponentEvents || []).map(eventRecord => ({
														...eventRecord,
														parsedDate: new Date(eventRecord.date)
													}));
													const fetchedHomeWrestlers = responseData.homeWrestlers || [];
													const fetchedHomeEvents = (responseData.homeEvents || []).map(eventRecord => ({
														...eventRecord,
														parsedDate: new Date(eventRecord.date)
													}));

													const profilesBySide = {
														home: [],
														opponent: []
													};

													[
														{ sideKey: "home", rosterWrestlers: fetchedHomeWrestlers, rosterEvents: fetchedHomeEvents },
														{ sideKey: "opponent", rosterWrestlers: fetchedOpponentWrestlers, rosterEvents: fetchedOpponentEvents }
													].forEach(sideGroup => {
														sideGroup.rosterWrestlers.forEach(wrestler => {
															if (/(redshirt|college)/i.test(wrestler.grade || "")) {
																return;
															}

															const currentSeasonCounts = {};
															const previousSeasonCounts = {};

															sideGroup.rosterEvents.forEach(eventRecord => {
																if (String(eventRecord.wrestlerId) !== String(wrestler.id)) {
																	return;
																}
																const isCurrentSeasonEvent = eventRecord.parsedDate >= currentSeasonBoundary;

																(eventRecord.matches || []).forEach(matchRecord => {
																	const rawDivision = (matchRecord.divisionConvert || matchRecord.division || eventRecord.divisionConvert || eventRecord.division || "").trim();
																	const isVarsityDivision = /(varsity|hs|high school)/i.test(rawDivision) && !/jv|junior|ms|middle|girls/i.test(rawDivision);
																	if (!isVarsityDivision) {
																		return;
																	}

																	const cleanWeight = (matchRecord.weightClass || eventRecord.weightClass || wrestler.lastWeightClass || "")
																		.toString()
																		.replace("lbs", "")
																		.trim();
																	if (!standardWeightClasses.includes(cleanWeight)) {
																		return;
																	}

																	const targetCounts = isCurrentSeasonEvent ? currentSeasonCounts : previousSeasonCounts;
																	if (!targetCounts[cleanWeight]) {
																		targetCounts[cleanWeight] = { wins: 0, losses: 0 };
																	}
																	if (matchRecord.isWinner) {
																		targetCounts[cleanWeight].wins += 1;
																	} else {
																		targetCounts[cleanWeight].losses += 1;
																	}
																});
															});

															const currentWeightsWrestled = Object.keys(currentSeasonCounts);
															const previousWeightsWrestled = Object.keys(previousSeasonCounts);

															if (currentWeightsWrestled.length === 0 && previousWeightsWrestled.length === 0) {
																return;
															}

															let baseWeightClass = null;
															let isProjectedFromPreviousSeason = false;
															let certifiedWeights = [];
															let totalSeasonMatches = 0;
															const weightMatchVolumes = {};

															if (currentWeightsWrestled.length > 0) {
																let highestMatchVolume = -1;
																currentWeightsWrestled.forEach(weightLabel => {
																	const volumeAtWeight = currentSeasonCounts[weightLabel].wins + currentSeasonCounts[weightLabel].losses;
																	weightMatchVolumes[weightLabel] = volumeAtWeight;
																	totalSeasonMatches += volumeAtWeight;
																	if (
																		volumeAtWeight > highestMatchVolume ||
																		(volumeAtWeight === highestMatchVolume &&
																			standardWeightClasses.indexOf(weightLabel) < standardWeightClasses.indexOf(baseWeightClass))
																	) {
																		highestMatchVolume = volumeAtWeight;
																		baseWeightClass = weightLabel;
																	}
																});
																certifiedWeights = [...currentWeightsWrestled];
															} else {
																isProjectedFromPreviousSeason = true;
																let previousBaseWeight = null;
																let highestPreviousVolume = -1;

																previousWeightsWrestled.forEach(weightLabel => {
																	const volumeAtWeight = previousSeasonCounts[weightLabel].wins + previousSeasonCounts[weightLabel].losses;
																	totalSeasonMatches += volumeAtWeight;
																	if (
																		volumeAtWeight > highestPreviousVolume ||
																		(volumeAtWeight === highestPreviousVolume &&
																			standardWeightClasses.indexOf(weightLabel) < standardWeightClasses.indexOf(previousBaseWeight))
																	) {
																		highestPreviousVolume = volumeAtWeight;
																		previousBaseWeight = weightLabel;
																	}
																});

																const previousWeightIndex = standardWeightClasses.indexOf(previousBaseWeight);
																if (previousWeightIndex >= 0 && previousWeightIndex <= 10) {
																	baseWeightClass = standardWeightClasses[previousWeightIndex + 1];
																} else {
																	baseWeightClass = previousBaseWeight;
																}

																weightMatchVolumes[baseWeightClass] = highestPreviousVolume;
																if (previousBaseWeight && previousBaseWeight !== baseWeightClass) {
																	weightMatchVolumes[previousBaseWeight] = highestPreviousVolume;
																	certifiedWeights = [baseWeightClass, previousBaseWeight];
																} else {
																	certifiedWeights = [baseWeightClass];
																}
															}

															profilesBySide[sideGroup.sideKey].push({
																id: wrestler.id,
																name: wrestler.name,
																grade: wrestler.grade,
																rating: Number(wrestler.rating) || 0,
																deviation: Number(wrestler.deviation) || 0,
																baseWeightClass: baseWeightClass,
																isProjectedFromPreviousSeason: isProjectedFromPreviousSeason,
																certifiedWeights: certifiedWeights,
																currentSeasonWeights: currentWeightsWrestled,
																weightMatchVolumes: weightMatchVolumes,
																totalSeasonMatches: totalSeasonMatches
															});
														});
													});

													const homeProfiles = profilesBySide.home;
													const opponentProfiles = profilesBySide.opponent;

													const initialMatchups = standardWeightClasses.map((weightClassLabel, weightIndex) => {
														const lowerWeightClassLabel = weightIndex > 0 ? standardWeightClasses[weightIndex - 1] : null;
														const candidatesBySide = {
															home: [],
															opponent: []
														};

														[
															{ sideKey: "home", rosterProfiles: homeProfiles },
															{ sideKey: "opponent", rosterProfiles: opponentProfiles }
														].forEach(sideEntry => {
															sideEntry.rosterProfiles.forEach(profile => {
																const isAtWeight = profile.certifiedWeights.includes(weightClassLabel) || profile.baseWeightClass === weightClassLabel;
																const isBumpEligible = Boolean(
																	lowerWeightClassLabel &&
																	(profile.baseWeightClass === lowerWeightClassLabel || profile.certifiedWeights.includes(lowerWeightClassLabel))
																);

																if (!isAtWeight && !isBumpEligible) {
																	return;
																}

																const isBump = Boolean(
																	!profile.currentSeasonWeights.includes(weightClassLabel) &&
																	profile.baseWeightClass !== weightClassLabel &&
																	lowerWeightClassLabel &&
																	(profile.baseWeightClass === lowerWeightClassLabel || profile.certifiedWeights.includes(lowerWeightClassLabel))
																);

																const referenceBaseWeight = isBump ? lowerWeightClassLabel : weightClassLabel;
																const weightIncreaseRatio = isBump
																	? (Number(weightClassLabel) - Number(referenceBaseWeight)) / Number(referenceBaseWeight)
																	: 0;
																const effectiveRating = isBump
																	? Math.round(profile.rating * (1 - weightIncreaseRatio))
																	: Math.round(profile.rating);

																candidatesBySide[sideEntry.sideKey].push({
																	id: profile.id,
																	name: profile.name,
																	grade: profile.grade,
																	baseWeightClass: profile.baseWeightClass,
																	isProjectedFromPreviousSeason: profile.isProjectedFromPreviousSeason,
																	isBump: isBump,
																	rating: Math.round(profile.rating),
																	deviation: Math.round(profile.deviation),
																	effectiveRating: effectiveRating,
																	matchesAtWeight: profile.weightMatchVolumes[weightClassLabel] || 0,
																	totalSeasonMatches: profile.totalSeasonMatches
																});
															});

															candidatesBySide[sideEntry.sideKey].sort(
																(firstCandidate, secondCandidate) => secondCandidate.effectiveRating - firstCandidate.effectiveRating
															);
														});

														return {
															weightClass: weightClassLabel,
															homeOptions: candidatesBySide.home,
															opponentOptions: candidatesBySide.opponent,
															homeWrestler: null,
															opponentWrestler: null,
															isHomeLocked: false,
															isOpponentLocked: false,
															isHomeVacated: false,
															isOpponentVacated: false,
															isHomeBump: false,
															isOpponentBump: false,
															homeScore: 0,
															opponentScore: 0,
															projectedPoints: 0,
															projectedOutcome: "OPEN 0",
															coachingNote: ""
														};
													});

													const activeOpponentIds = opponentProfiles.map(profile => String(profile.id));
													const eventEntries = [];

													fetchedOpponentEvents.forEach(eventRecord => {
														if (!activeOpponentIds.includes(String(eventRecord.wrestlerId))) {
															return;
														}

														const varsityMatchesWithWeight = (eventRecord.matches || []).filter(matchRecord => {
															const rawDivision = (matchRecord.divisionConvert || matchRecord.division || eventRecord.divisionConvert || eventRecord.division || "").trim();
															const isVarsity = /(varsity|hs|high school)/i.test(rawDivision) && !/jv|junior|ms|middle|girls/i.test(rawDivision);
															const cleanWeight = (matchRecord.weightClass || eventRecord.weightClass || "").toString().replace("lbs", "").trim();
															return isVarsity && standardWeightClasses.includes(cleanWeight);
														});

														if (varsityMatchesWithWeight.length === 0) {
															return;
														}

														const matchedWeightClass = (varsityMatchesWithWeight[0].weightClass || eventRecord.weightClass || "")
															.toString()
															.replace("lbs", "")
															.trim();
														const dateKey = eventRecord.parsedDate.toISOString().slice(0, 10);
														const lookupKey = `${dateKey}|${eventRecord.name}`;

														eventEntries.push({
															lookupKey: lookupKey,
															name: eventRecord.name,
															date: eventRecord.parsedDate,
															isPreviousSeason: eventRecord.parsedDate < currentSeasonBoundary,
															wrestlerId: eventRecord.wrestlerId,
															weightClass: matchedWeightClass
														});
													});

													const uniqueEventKeys = [...new Set(eventEntries.map(entry => entry.lookupKey))];
													const aggregatedPastEvents = uniqueEventKeys
														.map(eventKey => {
															const matchingEntries = eventEntries.filter(entry => entry.lookupKey === eventKey);
															const firstEntry = matchingEntries[0];
															return {
																key: eventKey,
																name: firstEntry.name,
																date: firstEntry.date,
																isPreviousSeason: firstEntry.isPreviousSeason,
																wrestlers: matchingEntries.map(entry => ({
																	id: entry.wrestlerId,
																	weightClass: entry.weightClass
																}))
															};
														})
														.sort((firstEvent, secondEvent) => +secondEvent.date - +firstEvent.date);

													setPastEvents(aggregatedPastEvents);
													setSavedLineups(responseData.savedLineups || []);
													setWeightClassMatchups(initialMatchups);
													setIsOpponentLoading(false);
												})
												.catch(fetchError => {
													console.warn("Failed to load opponent plan details:", fetchError);
													setErrorMessage("Failed to load opponent roster and event data.");
													setIsOpponentLoading(false);
												});
										}}
										className="season-dropdown-select"
										aria-label="Filter Opponent"
									>
										<option value="">-- Select School --</option>
										{opponentGroups.map((groupItem, groupIndex) => (
											<optgroup key={`group-${groupIndex}`} label={groupItem.name}>
												{groupItem.schools.map((schoolItem, schoolIndex) => (
													<option key={`school-${schoolIndex}`} value={schoolItem.id}>
														{schoolItem.name}
													</option>
												))}
											</optgroup>
										))}
									</select>
								</div>

								{selectedOpponentId && (
									<>
										<div className="filter-item-group">
											<span className="filter-item-label">Previous Event:</span>
											<select
												value={selectedPastEventKey}
												disabled={isBusy}
												className="season-dropdown-select"
												aria-label="Select Previous Event Lineup"
												onChange={changeEvent => {
													const chosenEventKey = changeEvent.target.value;
													setSelectedPastEventKey(chosenEventKey);
													setSelectedSavedLineupId("");

													if (!chosenEventKey) {
														setInitializationMode("");
														return;
													}

													setInitializationMode("event");

													const chosenEvent = pastEvents.find(eventItem => eventItem.key === chosenEventKey);
													if (!chosenEvent) {
														return;
													}

													const usedOpponentIds = [];
													const eventLockedMatchups = weightClassMatchups.map(matchup => {
														const eventEntry = chosenEvent.wrestlers.find(
															wrestlerEntry =>
																String(wrestlerEntry.weightClass) === String(matchup.weightClass) &&
																!usedOpponentIds.includes(String(wrestlerEntry.id))
														);

														let matchedOpponentCandidate = null;
														if (eventEntry) {
															matchedOpponentCandidate = matchup.opponentOptions.find(
																option => String(option.id) === String(eventEntry.id)
															) || null;
															if (matchedOpponentCandidate) {
																usedOpponentIds.push(String(matchedOpponentCandidate.id));
															}
														}

														const boutOutcome = evaluateBoutOutcome(null, matchedOpponentCandidate);

														return {
															...matchup,
															homeWrestler: null,
															isHomeLocked: false,
															isHomeVacated: false,
															isHomeBump: false,
															opponentWrestler: matchedOpponentCandidate,
															isOpponentLocked: true,
															isOpponentVacated: false,
															isOpponentBump: Boolean(matchedOpponentCandidate && matchedOpponentCandidate.isBump),
															projectedPoints: boutOutcome.projectedPoints,
															projectedOutcome: boutOutcome.projectedOutcome,
															coachingNote: ""
														};
													});

													setWeightClassMatchups(eventLockedMatchups);
													triggerOptimization(eventLockedMatchups, "event", selectedOpponentId);
												}}
											>
												<option value="">-- Select Event --</option>
												{pastEvents.map((eventItem, eventIndex) => (
													<option key={`past-event-${eventIndex}`} value={eventItem.key}>
														{`${eventItem.name} (${eventItem.date.toLocaleDateString()})${eventItem.isPreviousSeason ? " [Last Season]" : ""}`}
													</option>
												))}
											</select>
										</div>

										<div className="filter-item-group">
											<span className="filter-item-label">Saved Lineup:</span>
											<select
												value={selectedSavedLineupId}
												disabled={isBusy}
												className="season-dropdown-select"
												aria-label="Select Saved Lineup"
												onChange={changeEvent => {
													const chosenPlanId = changeEvent.target.value;
													setSelectedSavedLineupId(chosenPlanId);
													setSelectedPastEventKey("");

													if (!chosenPlanId) {
														setSavePlanName("");
														setInitializationMode("");
														return;
													}

													setInitializationMode("saved");

													const chosenPlan = savedLineups.find(planItem => String(planItem.id) === String(chosenPlanId));
													if (!chosenPlan) {
														return;
													}

													setSavePlanName(chosenPlan.name || "");

													const restoredMatchups = weightClassMatchups.map(matchup => {
														const savedSlot = (chosenPlan.slots || []).find(
															slotItem => String(slotItem.weightClass) === String(matchup.weightClass)
														);

														if (!savedSlot) {
															return matchup;
														}

														const restoredHomeWrestler = savedSlot.homeWrestlerId
															? matchup.homeOptions.find(option => String(option.id) === String(savedSlot.homeWrestlerId)) || null
															: null;
														const restoredOpponentWrestler = savedSlot.opponentWrestlerId
															? matchup.opponentOptions.find(option => String(option.id) === String(savedSlot.opponentWrestlerId)) || null
															: null;

														const isHomeStillValid = Boolean(savedSlot.homeWrestlerId ? restoredHomeWrestler : true);
														const isOpponentStillValid = Boolean(savedSlot.opponentWrestlerId ? restoredOpponentWrestler : true);

														const boutOutcome = evaluateBoutOutcome(restoredHomeWrestler, restoredOpponentWrestler);

														return {
															...matchup,
															homeWrestler: restoredHomeWrestler,
															isHomeLocked: Boolean(savedSlot.isHomeLocked && isHomeStillValid),
															isHomeVacated: false,
															isHomeBump: Boolean(restoredHomeWrestler && restoredHomeWrestler.isBump),
															homeScore: Number(savedSlot.homeScore) || 0,
															opponentWrestler: restoredOpponentWrestler,
															isOpponentLocked: Boolean(savedSlot.isOpponentLocked && isOpponentStillValid),
															isOpponentVacated: false,
															isOpponentBump: Boolean(restoredOpponentWrestler && restoredOpponentWrestler.isBump),
															opponentScore: Number(savedSlot.opponentScore) || 0,
															projectedPoints: boutOutcome.projectedPoints,
															projectedOutcome: boutOutcome.projectedOutcome,
															coachingNote: savedSlot.coachingNote || ""
														};
													});

													setWeightClassMatchups(restoredMatchups);
												}}
											>
												<option value="">-- Select Saved --</option>
												{savedLineups.map(planItem => (
													<option key={planItem.id} value={planItem.id}>
														{planItem.name}
													</option>
												))}
											</select>
										</div>
									</>
								)}
							</div>

							{/* Match Actions Row (matching opponentmatch.jsx) */}
							{weightClassMatchups && weightClassMatchups.length > 0 && (
								<div className="match-actions">
									{isBusy && selectedOpponentId ? (
										<div className="insightLoading">
											<div>Loading</div>
											<div>{"•".repeat(pollingStepCount)}</div>
										</div>
									) : (
										<button
											type="button"
											onClick={() => {
												setInitializationMode("ai");
												setSelectedPastEventKey("");
												setSelectedSavedLineupId("");

												const unlockedMatchups = weightClassMatchups.map(matchup => ({
													...matchup,
													homeWrestler: null,
													opponentWrestler: null,
													isHomeLocked: false,
													isOpponentLocked: false,
													isHomeVacated: false,
													isOpponentVacated: false,
													isHomeBump: false,
													isOpponentBump: false,
													projectedPoints: 0,
													projectedOutcome: "OPEN 0",
													coachingNote: ""
												}));
												setWeightClassMatchups(unlockedMatchups);
												triggerOptimization(unlockedMatchups, "ai", selectedOpponentId);
											}}
										>
											🤖 Generate AI Lineup
										</button>
									)}
								</div>
							)}

							{errorMessage && (
								<div className="opponentplan-error-box">
									{errorMessage}
								</div>
							)}

							{!selectedOpponentId ? (
								<div className="no-leaderboard-data select-prompt-card">
									Please select an opponent school from the dropdown to view the game plan.
								</div>
							) : isOpponentLoading || isOptimizing ? (
								<div className="select-loading-container">
									<img src="/media/wrestlingloading.gif" alt="Loading Opponent Data..." />
								</div>
							) : !initializationMode ? (
								<div className="no-leaderboard-data select-prompt-card">
									Select a Previous Event, choose a Saved Lineup, or click Generate AI Lineup above to view the game plan.
								</div>
							) : (
								<>
									{/* Sticky Scoreboard Header (Constrained width on desktop, matching opponentmatch.jsx KPI cards) */}
									<div className="opponentplan-sticky-wrapper">
										<div className="opponentplan-sticky-inner">
											<div className="report-kpis-grid opponentplan-kpis-grid">
												<div className="report-kpi-card weight-class-kpi-card average">
													<span className="kpi-label">Fort Mill</span>
													<div className="opponentplan-kpi-scores-row">
														<div className="opponentplan-kpi-metric">
															<span className="kpi-value-text Russo">{homeProjectedScore} pts</span>
															<span className="kpi-sub-text">Predicted ({homeProjectedWins} wins)</span>
														</div>
														<div className="opponentplan-kpi-metric">
															<span className="kpi-value-text Russo user-score">{homeActualScore} pts</span>
															<span className="kpi-sub-text">User Score ({homeActualWins} wins)</span>
														</div>
													</div>
												</div>

												<div className="report-kpi-card weight-class-kpi-card wip">
													<span className="kpi-label">{selectedOpponent.name}</span>
													<div className="opponentplan-kpi-scores-row">
														<div className="opponentplan-kpi-metric">
															<span className="kpi-value-text Russo">{opponentProjectedScore} pts</span>
															<span className="kpi-sub-text">Predicted ({opponentProjectedWins} wins)</span>
														</div>
														<div className="opponentplan-kpi-metric">
															<span className="kpi-value-text Russo user-score">{opponentActualScore} pts</span>
															<span className="kpi-sub-text">User Score ({opponentActualWins} wins)</span>
														</div>
													</div>
												</div>
											</div>

											<div className="opponentplan-sticky-actions">
												<button
													type="button"
													className="secondary-action"
													disabled={isBusy}
													onClick={() => setIsSavePromptOpen(previousOpen => !previousOpen)}
												>
													Save
												</button>
												<button
													type="button"
													disabled={isBusy}
													onClick={() => triggerOptimization(weightClassMatchups, initializationMode || "ai", selectedOpponentId)}
												>
													Rebuild Lineup
												</button>
											</div>

											{isSavePromptOpen && (
												<div className="opponentplan-save-bar">
													<input
														type="text"
														className="opponentplan-save-input"
														placeholder="Enter game plan name..."
														value={savePlanName}
														disabled={isBusy}
														onChange={changeEvent => setSavePlanName(changeEvent.target.value)}
													/>
													<div className="opponentplan-sticky-actions">
														<button
															type="button"
															disabled={!savePlanName.trim() || isBusy}
															onClick={() => {
																setIsSavingPlan(true);
																setErrorMessage("");

																const slotsPayload = weightClassMatchups.map(matchup => ({
																	weightClass: matchup.weightClass,
																	homeWrestlerId: matchup.homeWrestler ? matchup.homeWrestler.id : null,
																	isHomeLocked: Boolean(matchup.isHomeLocked),
																	homeScore: Number(matchup.homeScore) || 0,
																	opponentWrestlerId: matchup.opponentWrestler ? matchup.opponentWrestler.id : null,
																	isOpponentLocked: Boolean(matchup.isOpponentLocked),
																	opponentScore: Number(matchup.opponentScore) || 0,
																	coachingNote: matchup.coachingNote || ""
																}));

																fetch("/api/opponentplansave", {
																	method: "POST",
																	headers: { "Content-Type": "application/json" },
																	body: JSON.stringify({
																		schoolId: selectedOpponentId,
																		saveId: selectedSavedLineupId || null,
																		saveName: savePlanName.trim(),
																		isDelete: false,
																		slots: slotsPayload
																	})
																})
																	.then(apiResponse => {
																		if (apiResponse.ok) {
																			return apiResponse.json();
																		}
																		throw new Error(apiResponse.statusText);
																	})
																	.then(saveData => {
																		const updatedSavedLineups = saveData.savedLineups || [];
																		setSavedLineups(updatedSavedLineups);
																		const matchingSaved = updatedSavedLineups.find(
																			planItem => planItem.name === savePlanName.trim()
																		);
																		if (matchingSaved) {
																			setSelectedSavedLineupId(matchingSaved.id);
																		}
																		setIsSavingPlan(false);
																		setIsSavePromptOpen(false);
																	})
																	.catch(saveError => {
																		console.warn("Failed to save game plan:", saveError);
																		setErrorMessage("Failed to save game plan.");
																		setIsSavingPlan(false);
																	});
															}}
														>
															{selectedSavedLineupId ? "Update" : "Save Plan"}
														</button>

														{selectedSavedLineupId && (
															<button
																type="button"
																className="secondary-action"
																disabled={isBusy}
																onClick={() => {
																	setIsSavingPlan(true);
																	fetch("/api/opponentplansave", {
																		method: "POST",
																		headers: { "Content-Type": "application/json" },
																		body: JSON.stringify({
																			schoolId: selectedOpponentId,
																			saveId: selectedSavedLineupId,
																			saveName: savePlanName,
																			isDelete: true,
																			slots: []
																		})
																	})
																		.then(apiResponse => {
																			if (apiResponse.ok) {
																				return apiResponse.json();
																			}
																			throw new Error(apiResponse.statusText);
																		})
																		.then(deleteData => {
																			setSavedLineups(deleteData.savedLineups || []);
																			setSelectedSavedLineupId("");
																			setSavePlanName("");
																			setIsSavingPlan(false);
																			setIsSavePromptOpen(false);
																		})
																		.catch(deleteError => {
																			console.warn("Failed to delete plan:", deleteError);
																			setErrorMessage("Failed to delete saved plan.");
																			setIsSavingPlan(false);
																		});
																}}
															>
																Delete
															</button>
														)}
													</div>
												</div>
											)}
										</div>
									</div>

									{/* 14-Weight-Class Tactical Cards (styled matching opponentmatch.jsx) */}
									<div className="weight-matrix-section">
										<div className="matrix-section-header-row">
											<h3 className="matrix-section-title">Match Predictions</h3>
										</div>

										<div className="weight-class-cards-grid">
											{weightClassMatchups.map(matchup => {
												const statusBadgeTone = matchup.projectedPoints > 0
													? "powerhouse"
													: matchup.projectedPoints < 0
														? "wip"
														: "stable";

												return (
													<div key={`wc-card-${matchup.weightClass}`} className="weight-class-card">
														<div className="wc-card-header">
															<span className="wc-title">
																{matchup.weightClass} lbs
															</span>

															<div className="status-badge-container">
																<span className={`status-badge ${statusBadgeTone}`}>
																	{matchup.projectedOutcome}
																</span>
															</div>
														</div>

														{/* Home Wrestler Row (Top) */}
														<div
															className={`wc-wrestler-row ${matchup.isHomeLocked ? "locked" : ""} ${matchup.isHomeVacated ? "vacated" : ""}`}
														>
															<div className="opponentplan-row-controls">
																<button
																	type="button"
																	className={`opponentplan-lock-btn ${matchup.isHomeLocked ? "locked" : ""}`}
																	aria-label={`Toggle Fort Mill lock at ${matchup.weightClass}`}
																	disabled={isBusy}
																	onClick={() => {
																		setWeightClassMatchups(previousMatchups =>
																			previousMatchups.map(item =>
																				item.weightClass === matchup.weightClass
																					? { ...item, isHomeLocked: !item.isHomeLocked }
																					: item
																			)
																		);
																	}}
																>
																	{matchup.isHomeLocked ? "🔒" : "🔓"}
																</button>

																<select
																	className="opponentplan-wrestler-dropdown"
																	aria-label={`Select Fort Mill wrestler at ${matchup.weightClass}`}
																	disabled={isBusy}
																	value={matchup.homeWrestler ? matchup.homeWrestler.id : ""}
																	onChange={changeEvent => {
																		const selectedWrestlerId = changeEvent.target.value;

																		setWeightClassMatchups(previousMatchups =>
																			previousMatchups.map(currentMatchup => {
																				if (currentMatchup.weightClass === matchup.weightClass) {
																					const chosenCandidate = selectedWrestlerId
																						? currentMatchup.homeOptions.find(option => String(option.id) === String(selectedWrestlerId)) || null
																						: null;
																					const updatedOutcome = evaluateBoutOutcome(chosenCandidate, currentMatchup.opponentWrestler);

																					return {
																						...currentMatchup,
																						homeWrestler: chosenCandidate,
																						isHomeLocked: true,
																						isHomeVacated: false,
																						isHomeBump: Boolean(chosenCandidate && chosenCandidate.isBump),
																						projectedPoints: updatedOutcome.projectedPoints,
																						projectedOutcome: updatedOutcome.projectedOutcome
																					};
																				}

																				if (
																					selectedWrestlerId &&
																					currentMatchup.homeWrestler &&
																					String(currentMatchup.homeWrestler.id) === String(selectedWrestlerId)
																				) {
																					const vacatedOutcome = evaluateBoutOutcome(null, currentMatchup.opponentWrestler);
																					return {
																						...currentMatchup,
																						homeWrestler: null,
																						isHomeLocked: false,
																						isHomeVacated: true,
																						isHomeBump: false,
																						projectedPoints: vacatedOutcome.projectedPoints,
																						projectedOutcome: vacatedOutcome.projectedOutcome
																					};
																				}

																				return currentMatchup;
																			})
																		);
																	}}
																>
																	<option value="">
																		{matchup.isHomeVacated ? "Open — Needs Rebuild" : "Open / Forfeit"}
																	</option>
																	{matchup.homeOptions.map(candidate => (
																		<option key={candidate.id} value={candidate.id}>
																			{`${candidate.name} (${candidate.effectiveRating})${candidate.isBump ? ` [Bump from ${candidate.baseWeightClass}]` : ""}`}
																		</option>
																	))}
																</select>

																<div className="opponentplan-score-box">
																	<span className="opponentplan-score-label">Score</span>
																	<select
																		className={`opponentplan-score-dropdown ${matchup.homeScore > 0 ? "win" : ""}`}
																		aria-label={`Fort Mill user score at ${matchup.weightClass}`}
																		disabled={isBusy}
																		value={matchup.homeScore}
																		onChange={changeEvent => {
																			const chosenScore = Number(changeEvent.target.value) || 0;
																			setWeightClassMatchups(previousMatchups =>
																				previousMatchups.map(item =>
																					item.weightClass === matchup.weightClass
																						? {
																							...item,
																							homeScore: chosenScore,
																							opponentScore: chosenScore > 0 ? 0 : item.opponentScore
																						}
																						: item
																				)
																			);
																		}}
																	>
																		<option value="0">0</option>
																		<option value="3">3</option>
																		<option value="4">4</option>
																		<option value="5">5</option>
																		<option value="6">6</option>
																	</select>
																</div>
															</div>

															<div className="opponentplan-row-submeta">
																<span className="opponentplan-team-tag">Fort Mill</span>
																{matchup.homeWrestler ? (
																	<span>
																		{`${matchup.homeWrestler.rating} ± ${matchup.homeWrestler.deviation}`}
																		{matchup.isHomeBump ? ` • Eff: ${matchup.homeWrestler.effectiveRating}` : ""}
																	</span>
																) : (
																	<span>Open Slot</span>
																)}
																{matchup.isHomeBump && (
																	<span className="status-badge stable">BUMP</span>
																)}
																{matchup.isHomeVacated && (
																	<span className="status-badge wip">Needs Rebuild</span>
																)}
															</div>
														</div>

														{/* Opponent Wrestler Row (Bottom) */}
														<div
															className={`wc-wrestler-row ${matchup.isOpponentLocked ? "locked" : ""} ${matchup.isOpponentVacated ? "vacated" : ""}`}
														>
															<div className="opponentplan-row-controls">
																<button
																	type="button"
																	className={`opponentplan-lock-btn ${matchup.isOpponentLocked ? "locked" : ""}`}
																	aria-label={`Toggle Opponent lock at ${matchup.weightClass}`}
																	disabled={isBusy}
																	onClick={() => {
																		setWeightClassMatchups(previousMatchups =>
																			previousMatchups.map(item =>
																				item.weightClass === matchup.weightClass
																					? { ...item, isOpponentLocked: !item.isOpponentLocked }
																					: item
																			)
																		);
																	}}
																>
																	{matchup.isOpponentLocked ? "🔒" : "🔓"}
																</button>

																<select
																	className="opponentplan-wrestler-dropdown"
																	aria-label={`Select Opponent wrestler at ${matchup.weightClass}`}
																	disabled={isBusy}
																	value={matchup.opponentWrestler ? matchup.opponentWrestler.id : ""}
																	onChange={changeEvent => {
																		const selectedWrestlerId = changeEvent.target.value;

																		setWeightClassMatchups(previousMatchups =>
																			previousMatchups.map(currentMatchup => {
																				if (currentMatchup.weightClass === matchup.weightClass) {
																					const chosenCandidate = selectedWrestlerId
																						? currentMatchup.opponentOptions.find(option => String(option.id) === String(selectedWrestlerId)) || null
																						: null;
																					const updatedOutcome = evaluateBoutOutcome(currentMatchup.homeWrestler, chosenCandidate);

																					return {
																						...currentMatchup,
																						opponentWrestler: chosenCandidate,
																						isOpponentLocked: true,
																						isOpponentVacated: false,
																						isOpponentBump: Boolean(chosenCandidate && chosenCandidate.isBump),
																						projectedPoints: updatedOutcome.projectedPoints,
																						projectedOutcome: updatedOutcome.projectedOutcome
																					};
																				}

																				if (
																					selectedWrestlerId &&
																					currentMatchup.opponentWrestler &&
																					String(currentMatchup.opponentWrestler.id) === String(selectedWrestlerId)
																				) {
																					const vacatedOutcome = evaluateBoutOutcome(currentMatchup.homeWrestler, null);
																					return {
																						...currentMatchup,
																						opponentWrestler: null,
																						isOpponentLocked: false,
																						isOpponentVacated: true,
																						isOpponentBump: false,
																						projectedPoints: vacatedOutcome.projectedPoints,
																						projectedOutcome: vacatedOutcome.projectedOutcome
																					};
																				}

																				return currentMatchup;
																			})
																		);
																	}}
																>
																	<option value="">
																		{matchup.isOpponentVacated ? "Open — Needs Rebuild" : "Open / Forfeit"}
																	</option>
																	{matchup.opponentOptions.map(candidate => (
																		<option key={candidate.id} value={candidate.id}>
																			{`${candidate.name} (${candidate.effectiveRating})${candidate.isBump ? ` [Bump from ${candidate.baseWeightClass}]` : ""}`}
																		</option>
																	))}
																</select>

																<div className="opponentplan-score-box">
																	<span className="opponentplan-score-label">Score</span>
																	<select
																		className={`opponentplan-score-dropdown ${matchup.opponentScore > 0 ? "win" : ""}`}
																		aria-label={`Opponent user score at ${matchup.weightClass}`}
																		disabled={isBusy}
																		value={matchup.opponentScore}
																		onChange={changeEvent => {
																			const chosenScore = Number(changeEvent.target.value) || 0;
																			setWeightClassMatchups(previousMatchups =>
																				previousMatchups.map(item =>
																					item.weightClass === matchup.weightClass
																						? {
																							...item,
																							opponentScore: chosenScore,
																							homeScore: chosenScore > 0 ? 0 : item.homeScore
																						}
																						: item
																				)
																			);
																		}}
																	>
																		<option value="0">0</option>
																		<option value="3">3</option>
																		<option value="4">4</option>
																		<option value="5">5</option>
																		<option value="6">6</option>
																	</select>
																</div>
															</div>

															<div className="opponentplan-row-submeta">
																<span className="opponentplan-team-tag opponent">{selectedOpponent?.name || "Opponent"}</span>
																{matchup.opponentWrestler ? (
																	<span>
																		{`${matchup.opponentWrestler.rating} ± ${matchup.opponentWrestler.deviation}`}
																		{matchup.isOpponentBump ? ` • Eff: ${matchup.opponentWrestler.effectiveRating}` : ""}
																	</span>
																) : (
																	<span>Open Slot</span>
																)}
																{matchup.isOpponentBump && (
																	<span className="status-badge stable">BUMP</span>
																)}
																{matchup.isOpponentVacated && (
																	<span className="status-badge wip">Needs Rebuild</span>
																)}
															</div>
														</div>

														{matchup.coachingNote && (
															<div className="wc-wrestler-row">
																<span className="coachingNotes">
																	<strong>Note:</strong>&nbsp;{matchup.coachingNote}
																</span>
															</div>
														)}
													</div>
												);
											})}
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<OpponentPlan />);
export default OpponentPlan;
