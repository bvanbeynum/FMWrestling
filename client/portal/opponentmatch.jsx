import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/opponentreport.css";

const standardWeightClasses = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"];

const testMatchDivision = (rawDivision) => {
	if (!rawDivision) return false;
	const cleanDiv = rawDivision.trim();
	
	return /(varsity|hs|high school)/i.test(cleanDiv) && !/jv|junior|ms|middle|girls/i.test(cleanDiv);
};

const OpponentMatch = () => {
	const todayDate = new Date();
	const currentYear = todayDate.getFullYear();
	const currentMonth = todayDate.getMonth();
	const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;

	const availableSeasons = [
		{ name: `${seasonStartYear.toString().slice(-2)}-${(seasonStartYear + 1).toString().slice(-2)}`, startYear: seasonStartYear },
		{ name: `${(seasonStartYear - 1).toString().slice(-2)}-${seasonStartYear.toString().slice(-2)}`, startYear: seasonStartYear - 1 }
	];

	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSelectLoading, setIsSelectLoading] = useState(false);
	const [loggedInUser, setLoggedInUser] = useState(null);

	const [opponentGroups, setOpponentGroups] = useState([]);
	const [allSchools, setAllSchools] = useState([]);
	const [selectedOpponentId, setSelectedOpponentId] = useState("");
	const [selectedOpponent, setSelectedOpponent] = useState(null);
	const [selectedSeason, setSelectedSeason] = useState(availableSeasons[0].name);
	const [loadCount, setLoadCount] = useState(0);
	
	const [opponentWrestlers, setOpponentWrestlers] = useState([]);
	const [opponentWrestlerEvents, setOpponentWrestlerEvents] = useState([]);
	const [fortMillWrestlers, setFortMillWrestlers] = useState([]);
	const [fortMillWrestlerEvents, setFortMillWrestlerEvents] = useState([]);
	const [aiInsight, setAIInsights] = useState(null);

	const [weightClassCards, setWeightClassCards] = useState([])

	useEffect(() => {
		fetch("/api/opponentreportload")
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				}
				throw new Error(apiResponse.statusText);
			})
			.then(responseData => {
				const schoolsList = responseData.schools || [];
				setAllSchools(schoolsList);

				const sortedGroups = [...new Set(schoolsList.map(school => (school.classification || "N/A") + "|" + (school.region || "N/A")))].map(schoolGroup => ({
						name: `${ schoolGroup.split("|")[0] } - ${ schoolGroup.split("|")[1] }`,
						classification: schoolGroup.split("|")[0],
						region: schoolGroup.split("|")[1],
						schools: schoolsList.filter(school => (school.classification || "N/A") + "|" + (school.region || "N/A") == schoolGroup)
							.sort((schoolA, schoolB) => schoolA.name > schoolB.name ? 1 : -1)
					}))
					.sort((groupA, groupB) => 
						(/\d/.test(groupB.classification?.[0]) - /\d/.test(groupA.classification?.[0])) ||
						(/\d/.test(groupA.classification?.[0]) ? 
							groupB.classification[0].localeCompare(groupA.classification[0])
							: (groupA.classification).localeCompare(groupB.classification)
						) ||
						(groupA.region || "").localeCompare(groupB.region || "", undefined, { numeric: true })
						)

				setOpponentGroups(sortedGroups);
				setLoggedInUser(responseData.loggedInUser);
				setIsLoading(false);
				setPageActive(true);
			})
			.catch(fetchError => {
				console.warn("Failed to load initial opponent data:", fetchError);
				setIsLoading(false);
			});
	}, []);

	const selectOpponent = (schoolId, season) => {
		const school = allSchools.find(school => school.id === schoolId);
		setSelectedOpponent(school);
		setSelectedOpponentId(schoolId);
		setSelectedSeason(season);

		if (school) {
			setIsSelectLoading(true);
			fetch(`/api/opponentmatchselect?opponent=${schoolId}&season=${season}`)
				.then(apiResponse => {
					if (apiResponse.ok) {
						return apiResponse.json();
					}
					throw new Error(apiResponse.statusText);
				})
				.then(responseData => {
					const opponents = responseData.opponents;
					const opponentEvents = responseData.opponentEvents.map(event => ({...event, date: new Date(event.date) }));
					const fortMill = responseData.fortMill;
					const fortMillEvents = responseData.fortMillEvents.map(event => ({...event, date: new Date(event.date) }));

					// Weight Classes tab calculations
					const weightClassDataMap = {};
					standardWeightClasses.forEach(weightClassLabel => {
						weightClassDataMap[weightClassLabel] = {
							weightClass: weightClassLabel,
							wins: 0,
							losses: 0,
							opponentMap: {},
							fortMillMap: {}
						};
					});

					let calculatedStartYear = new Date().getFullYear();
					if (season && /^\d{2}-\d{2}$/.test(season)) {
						calculatedStartYear = 2000 + parseInt(season.split("-")[0], 10);
					} else {
						calculatedStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
					}

					const seasonStartDate = new Date(calculatedStartYear, 10, 1, 0, 0, 0); // Nov 1st
					const seasonEndDate = new Date(calculatedStartYear + 1, 2, 1, 23, 59, 59); // Mar 1st
					
					// Filter wrestler events strictly within season date bounds (11/1 to 3/1)
					const opponentInSeasonEvents = opponentEvents.filter(eventItem => eventItem.date && eventItem.date >= seasonStartDate && eventItem.date <= seasonEndDate);

					// Filter qualified wrestlers who wrestled at least one event/match in season using divisionConvert
					const opponentsQualified = opponents.filter(wrestlerItem => {
						return opponentInSeasonEvents.some(eventItem => {
							if (eventItem.wrestlerId !== wrestlerItem.id) return false;

							return (eventItem.matches || []).some(matchItem => {
								const matchDivision = matchItem.divisionConvert || matchItem.division;
								return matchDivision && testMatchDivision(matchDivision);
							});
						});
					});

					opponentInSeasonEvents.forEach(eventItem => {
						const wrestlerItem = opponentsQualified.find(wrestler => wrestler.id === eventItem.wrestlerId);
						if (!wrestlerItem) return;

						(eventItem.matches || []).forEach(matchItem => {
							const rawWeight = (matchItem.weightClass || eventItem.weightClass || wrestlerItem.lastWeightClass || "").toString().replace("lbs", "").trim();
							if (!standardWeightClasses.includes(rawWeight)) return;

							const weightClassEntry = weightClassDataMap[rawWeight];
							if (!weightClassEntry.opponentMap[wrestlerItem.id]) {
								weightClassEntry.opponentMap[wrestlerItem.id] = {
									id: wrestlerItem.id,
									name: wrestlerItem.name,
									rating: wrestlerItem.rating || 0,
									grade: wrestlerItem.grade,
									wins: 0,
									losses: 0
								};
							}
							
							const wrestlerStats = weightClassEntry.opponentMap[wrestlerItem.id];
							if (matchItem.isWinner) {
								wrestlerStats.wins += 1;
							} else {
								wrestlerStats.losses += 1;
							}
						});
					});

					// Filter wrestler events strictly within season date bounds (11/1 to 3/1)
					const fortMillInSeasonEvents = fortMillEvents.filter(eventItem => eventItem.date && eventItem.date >= seasonStartDate && eventItem.date <= seasonEndDate);

					// Filter qualified wrestlers who wrestled at least one event/match in season using divisionConvert
					const fortMillQualified = fortMill.filter(wrestlerItem => {
						return fortMillInSeasonEvents.some(eventItem => {
							if (eventItem.wrestlerId !== wrestlerItem.id) return false;

							return (eventItem.matches || []).some(matchItem => {
								const matchDivision = matchItem.divisionConvert || matchItem.division;
								return matchDivision && testMatchDivision(matchDivision);
							});
						});
					});

					fortMillInSeasonEvents.forEach(eventItem => {
						const wrestlerItem = fortMillQualified.find(wrestler => wrestler.id === eventItem.wrestlerId);
						if (!wrestlerItem) return;

						(eventItem.matches || []).forEach(matchItem => {
							const rawWeight = (matchItem.weightClass || eventItem.weightClass || wrestlerItem.lastWeightClass || "").toString().replace("lbs", "").trim();
							if (!standardWeightClasses.includes(rawWeight)) return;

							const weightClassEntry = weightClassDataMap[rawWeight];
							if (!weightClassEntry.fortMillMap[wrestlerItem.id]) {
								weightClassEntry.fortMillMap[wrestlerItem.id] = {
									id: wrestlerItem.id,
									name: wrestlerItem.name,
									rating: wrestlerItem.rating || 0,
									grade: wrestlerItem.grade,
									wins: 0,
									losses: 0
								};
							}
							
							const wrestlerStats = weightClassEntry.fortMillMap[wrestlerItem.id];
							if (matchItem.isWinner) {
								wrestlerStats.wins += 1;
							} else {
								wrestlerStats.losses += 1;
							}
						});
					});

					const weightClasses = standardWeightClasses.map(weightClassLabel => {
						const classData = weightClassDataMap[weightClassLabel];
						const opponentsInClass = Object.values(classData.opponentMap);
						const fortMillInClass = Object.values(classData.fortMillMap);
						const opponentCount = opponentsInClass.length;
						const fortMillCount = fortMillInClass.length;

						return {
							weightClass: weightClassLabel,
							opponentsCount: opponentCount,
							fortMillCount: fortMillCount,
							opponents: opponentsInClass.sort((firstWrestler, secondWrestler) => secondWrestler.rating - firstWrestler.rating),
							fortMill: fortMillInClass.sort((firstWrestler, secondWrestler) => secondWrestler.rating - firstWrestler.rating)
						};
					});

					setAIInsights(responseData.insights);
					setOpponentWrestlers(opponents);
					setOpponentWrestlerEvents(opponentEvents);
					setFortMillWrestlers(fortMill);
					setFortMillWrestlerEvents(fortMillEvents);
					setWeightClassCards(weightClasses)
					setIsSelectLoading(false);
				})
				.catch(fetchError => {
					console.warn("Failed to load opponent report details:", fetchError);
					setIsSelectLoading(false);
				});
		}
	};

	const pollIntervalRef = useRef(null);

	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, []);

	const pollInsightStatus = (jobId) => {
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
		}

		pollIntervalRef.current = setInterval(() => {
			fetch(`/api/opponentmatchgenerate/${jobId}`)
				.then(apiResponse => {
					if (apiResponse.ok) {
						return apiResponse.json();
					}
					throw new Error(apiResponse.statusText);
				})
				.then(jobData => {
					if (jobData.status === "processing") {
						setLoadCount(loadCount => loadCount + 1);
						return;
					}

					clearInterval(pollIntervalRef.current);
					pollIntervalRef.current = null;
					setIsSelectLoading(false);

					if (jobData.status === "completed") {
						setAIInsights(jobData.insights);
					} 
					else {
						console.warn("Failed to generate insights:", jobData.error || "Job failed");
					}
				})
				.catch(pollError => {
					clearInterval(pollIntervalRef.current);
					pollIntervalRef.current = null;
					console.warn("Error polling insight status:", pollError);
					setIsSelectLoading(false);
				});
		}, 2000);
	};

	const generateInsights = () => {
		setIsSelectLoading(true);

		const uploadPacket = weightClassCards.map(weightClass => ({
			weightClass: weightClass.weightClass,
			fortMill: weightClass.fortMill.map(({grade, ...wrestler}) => ({...wrestler})).slice(0, 4),
			opponents: weightClass.opponents.map(({grade, ...wrestler}) => ({...wrestler})).slice(0, 4)
		}))

		fetch(`/api/opponentmatchgenerate?schoolid=${ selectedOpponentId }&season=${ selectedSeason }`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ weightClasses: uploadPacket })
		})
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				}
				throw new Error(apiResponse.statusText);
			})
			.then(responseData => {
				if (responseData.jobId) {
					pollInsightStatus(responseData.jobId);
				} else {
					console.log(responseData.insights);
					setIsSelectLoading(false);
				}
			})
			.catch(fetchError => {
				console.warn("Failed to generate insights:", fetchError);
				setIsSelectLoading(false);
			});
	};

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUser} />
			
			<div className="report-content-wrapper">
				{isLoading ? (
					<div className="pageLoading">
						<img src="/media/wrestlingloading.gif" alt="Loading..." />
					</div>
				) : !loggedInUser || !loggedInUser.privileges || (!loggedInUser.privileges.some(privilege => privilege.token === "teamManage" || privilege.name === "teamManage") && !loggedInUser.privileges.includes("teamManage")) ? (
					<div className="noAccess">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
						<a>Unauthorized Access</a>
					</div>
				) : (
					<div>
						<div className={`opponentreport container ${pageActive ? "active" : ""}`}>
							<header>
								<h1>Opponent Match</h1>
							</header>

							{/* Filters Row */}
							<div className="filters-header-row">
								<div className="filter-item-group">
									<span className="filter-item-label">Opponent:</span>
									<select
										value={selectedOpponentId}
										onChange={event => selectOpponent(event.target.value, selectedSeason)}
										className="season-dropdown-select"
										aria-label="Filter Opponent"
									>
										<option value="">-- Select School --</option>
										{opponentGroups.map((groupItem, groupIndex) => (
											<optgroup key={`group-${groupIndex}`} label={groupItem.name}>
												{groupItem.schools.map((schoolItem, schoolIndex) => (
													<option key={`school-${schoolIndex}`} value={schoolItem.id}>{schoolItem.name}</option>
												))}
											</optgroup>
										))}
									</select>
								</div>
								
								<div className="filter-item-group">
									<span className="filter-item-label">Season:</span>
									<select
										value={selectedSeason}
										onChange={changeEvent => { selectOpponent(selectedOpponentId, changeEvent.target.value); }}
										className="season-dropdown-select"
										aria-label="Filter Season"
									>
										{availableSeasons.map(seasonItem => (
											<option key={seasonItem.name} value={seasonItem.name}>Season {seasonItem.name}</option>
										))}
									</select>
								</div>
							</div>
							
							{
							weightClassCards && weightClassCards.length > 0 && (
							<div className="match-actions">
								{
								isSelectLoading && selectedOpponentId ?
								<div className="insightLoading">
									<div>Loading</div>
									<div>{ "•".repeat(loadCount) }</div>
								</div>
								
								: aiInsight ? <button type="button" onClick={ () => generateInsights() }>🤖 Re-Generate Insights</button>
								
								: <button type="button" onClick={ () => generateInsights() }>🤖 Generate Insights</button>
								}
							</div>
							)}

							{!selectedOpponentId ? (
								<div className="no-leaderboard-data select-prompt-card">
									Please select an opponent school from the dropdown to view the report.
								</div>
							) : isSelectLoading ? (
								<div className="select-loading-container">
									<img src="/media/wrestlingloading.gif" alt="Loading Opponent Data..." />
								</div>
							) : aiInsight ? (
								<>
								
								{/* KPIs */}
								<div className="report-kpis-grid">
									<div className="report-kpi-card weight-class-kpi-card average">
										<span className="kpi-label">Fort Mill</span>
										<span className="kpi-value-text Russo">{aiInsight.summary.fortMillTotalPoints} points</span>
										<span className="kpi-sub-text">{aiInsight.summary.fortMillExpectedWins} wins</span>
									</div>

									<div className="report-kpi-card weight-class-kpi-card wip">
										<span className="kpi-label">{ selectedOpponent.name }</span>
										<span className="kpi-value-text Russo">{aiInsight.summary.opponentTotalPoints} points</span>
										<span className="kpi-sub-text">{aiInsight.summary.opponentExpectedWins} wins</span>
									</div>
								</div>

								<div className="weight-matrix-section">
									<div className="matrix-section-header-row">
										<h3 className="matrix-section-title">Key Adjustments</h3>
									</div>
									
									<div className="weight-class-cards-grid">
									{
									aiInsight.keyAdjustments.map((adjustment, adjustmentIndex) => (
										<div key={`wc-card-${adjustmentIndex}`} className="weight-class-card">
											<div className="wc-card-header">
												<span className="wc-title">
													{ adjustment.weightClassesInvolved.join(" & ") }
												</span>
											</div>

											<div className="wc-card-subsummary">
												{ adjustment.wrestlersInvolved.join(", ") }
											</div>
											
											<div className="wc-wrestler-row">
												<span className="coachingNotes">
													{adjustment.rationale}
												</span>
											</div>
										</div>
									))}
									</div>
								</div>

								<div className="weight-matrix-section">
									<div className="matrix-section-header-row">
										<h3 className="matrix-section-title">Match Predictions</h3>
									</div>

									<div className="weight-class-cards-grid">
									{
									aiInsight.lineup.map(weightClass => (
										<div key={`wc-card-${weightClass.weightClass}`} className="weight-class-card">
											<div className="wc-card-header">
												<span className="wc-title">
													{weightClass.weightClass} lbs
												</span>
												
												<div className="status-badge-container">
													{
													weightClass.isSwingMatch && (
													<span className="status-badge wip">
														Swing Match
													</span>
													)}
												</div>
											</div>

											<div className="wc-wrestler-row matchGrid">
												<div className="wrestlerMatchGrid">
													<div className="wrestlerName">{weightClass.fortMillWrestler?.name}</div>
													<div className={`matchScore ${ weightClass.netPoints > 0 ? "win" : weightClass.netPoints < 0 ? "lose" : "" }`}>
														{weightClass.netPoints}
													</div>
													<div className="wrestlerName">{weightClass.projectedOpponent?.name}</div>
													<div className="wrestlerStats">
														{ Math.round(weightClass.fortMillWrestler?.rating) }
													</div>
													<div className="matchOutcome">{weightClass.projectedOutcome}</div>
													<div className="wrestlerStats">
														{ Math.round(weightClass.projectedOpponent?.rating) }
													</div>
												</div>
											</div>

											<div className="wc-wrestler-row">
												<span className="coachingNotes">
													<strong>Note:</strong>&nbsp;{weightClass.coachingNote}
												</span>
											</div>
										</div>
									))
									}
									</div>
								</div>
								</>
							)
							: (
								<div className="no-leaderboard-data select-prompt-card">
									No insights have yet been generated.
								</div>
							) }
							
						</div>
		
					</div>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<OpponentMatch />);
export default OpponentMatch;
