import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/opponentreport.css";

const standardWeightClasses = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"];

const testMatchDivision = (rawDivision, targetDivision) => {
	if (!rawDivision) return false;
	const cleanDiv = rawDivision.trim();
	
	if (targetDivision === "Varsity") {
		return /(varsity|hs|high school)/i.test(cleanDiv) && !/jv|junior|ms|middle|girls/i.test(cleanDiv);
	} else if (targetDivision === "JV") {
		return /(jv|junior varsity)/i.test(cleanDiv);
	} else if (targetDivision === "Girls") {
		return /(girls|women)/i.test(cleanDiv);
	} else if (targetDivision === "Middle School") {
		return /(ms|middle school|junior high)/i.test(cleanDiv);
	}
	return cleanDiv.toLowerCase() === targetDivision.toLowerCase();
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
	const [isGenerating, setIsGenerating] = useState(false);
	const [loggedInUser, setLoggedInUser] = useState(null);

	const [opponentGroups, setOpponentGroups] = useState([]);
	const [allSchools, setAllSchools] = useState([]);
	const [selectedOpponentId, setSelectedOpponentId] = useState("");
	const [selectedOpponent, setSelectedOpponent] = useState(null);

	const [selectedSeason, setSelectedSeason] = useState(availableSeasons[0].name);
	const [selectedDivision, setSelectedDivision] = useState("Varsity");

	const [opponentWrestlers, setOpponentWrestlers] = useState([]);
	const [opponentWrestlerEvents, setOpponentWrestlerEvents] = useState([]);
	const [fortMillWrestlers, setFortMillWrestlers] = useState([]);
	const [fortMillWrestlerEvents, setFortMillWrestlerEvents] = useState([]);

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
								return matchDivision && testMatchDivision(matchDivision, selectedDivision);
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
								return matchDivision && testMatchDivision(matchDivision, selectedDivision);
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

					setOpponentWrestlers(opponents);
					setOpponentWrestlerEvents(opponentEvents);
					setFortMillWrestlers(fortMill);
					setFortMillWrestlerEvents(fortMillEvents);
					setWeightClassCards(weightClasses)
					setIsSelectLoading(false);
					setIsLoading(false);
					setPageActive(true);
				})
				.catch(fetchError => {
					console.warn("Failed to load opponent report details:", fetchError);
					setIsSelectLoading(false);
					setIsLoading(false);
				});
		}
	};

	const generateInsights = () => {
		setIsGenerating(true);

		const uploadPacket = weightClassCards.map(weightClass => ({
			weightClass: weightClass.weightClass,
			fortMill: weightClass.fortMill.map(({grade, ...wrestler}) => ({...wrestler})),
			opponents: weightClass.opponents.map(({grade, ...wrestler}) => ({...wrestler}))
		}))

		fetch("/api/opponentmatchgenerate", {
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
				console.log(responseData.insights)
				setIsGenerating(false);
			})
			.catch(fetchError => {
				console.warn("Failed to generate insights:", fetchError);
				setIsGenerating(false);
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
								<h1>
									Opponent Overview
								</h1>
								{selectedOpponent && <h1 className="subTitle">{selectedOpponent.name}</h1>}
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

								<div className="filter-item-group">
									<span className="filter-item-label">Division:</span>
									<select
										value={selectedDivision}
										onChange={changeEvent => setSelectedDivision(changeEvent.target.value)}
										className="season-dropdown-select"
										aria-label="Filter Division"
									>
										<option value="Varsity">Varsity</option>
										<option value="JV">JV</option>
										<option value="Girls">Girls</option>
										<option value="Middle School">Middle School</option>
									</select>
								</div>
							</div>
							
							{
							weightClassCards && weightClassCards.length > 0 && (
							<div className="match-actions">
								<button type="button" disabled={isGenerating} onClick={ () => generateInsights() }>🤖 AI Insight</button>
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
							) : (
								
								<div className="weight-matrix-section">
									<div className="weight-class-cards-grid">
									{
									weightClassCards.map(cardItem => (
												<div key={`wc-card-${cardItem.weightClass}`} className="weight-class-card">
													<div className="wc-card-header">
														<span className="wc-title">
															{cardItem.weightClass} lbs
														</span>
													</div>

													<div className="wc-teams">
														<div className="wc-wrestlers-list">
															{cardItem.fortMill.length === 0 ? (
																<span className="wc-no-wrestlers">No wrestlers recorded</span>
															) : (
																cardItem.fortMill.map((wrestlerItem, wrestlerIndex) => {
																	return (
																		<div
																			key={`wc-wrestler-${wrestlerIndex}`}
																			onClick={() => window.open(`/portal/wrestlerreport.html?id=${wrestlerItem.id}`, "_blank")}
																			className="wc-wrestler-row"
																		>
																			<div className="wc-wrestler-info">
																				<span className="wc-wrestler-record">
																					{ wrestlerItem.grade }
																				</span>
																				<span className="wc-wrestler-name">
																					{wrestlerItem.name}
																				</span>
																				<span className="wc-wrestler-record">
																					Record: {wrestlerItem.wins}-{wrestlerItem.losses}
																				</span>
																			</div>
																			<span className="wc-wrestler-rating">
																				{wrestlerItem.rating ? Math.round(wrestlerItem.rating) : "N/A"}
																			</span>
																		</div>
																	);
																})
															)}
														</div>
														
														<div className="wc-wrestlers-list">
															{cardItem.opponents.length === 0 ? (
																<span className="wc-no-wrestlers">No wrestlers recorded</span>
															) : (
																cardItem.opponents.map((wrestlerItem, wrestlerIndex) => {
																	return (
																		<div
																			key={`wc-wrestler-${wrestlerIndex}`}
																			onClick={() => window.open(`/portal/wrestlerreport.html?id=${wrestlerItem.id}`, "_blank")}
																			className="wc-wrestler-row"
																		>
																			<div className="wc-wrestler-info">
																				<span className="wc-wrestler-record">
																					{ wrestlerItem.grade }
																				</span>
																				<span className="wc-wrestler-name">
																					{wrestlerItem.name}
																				</span>
																				<span className="wc-wrestler-record">
																					Record: {wrestlerItem.wins}-{wrestlerItem.losses}
																				</span>
																			</div>
																			<span className="wc-wrestler-rating">
																				{wrestlerItem.rating ? Math.round(wrestlerItem.rating) : "N/A"}
																			</span>
																		</div>
																	);
																})
															)}
														</div>
													</div>
												</div>
											))
									}
									</div>
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
