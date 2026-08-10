import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/opponentreport.css";

const standardWeightClasses = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"];

const parseDateValue = (dateInput) => {
	if (!dateInput) return null;
	if (dateInput instanceof Date) return dateInput;
	return new Date(dateInput);
};

const matchesDivision = (rawDivision, targetDivision) => {
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

const OpponentReport = () => {
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
	const [selectedDivision, setSelectedDivision] = useState("Varsity");
	const [activeTab, setActiveTab] = useState("overview");

	const [loadedWrestlers, setLoadedWrestlers] = useState([]);
	const [loadedWrestlerEvents, setLoadedWrestlerEvents] = useState([]);
	const [expandedWrestlers, setExpandedWrestlers] = useState({});

	const toggleExpandWrestler = (wrestlerKey, event) => {
		if (event) event.stopPropagation();
		setExpandedWrestlers(prev => ({
			...prev,
			[wrestlerKey]: !prev[wrestlerKey]
		}));
	};

	const fetchOpponentData = (targetSchoolId, targetSeason) => {
		setIsSelectLoading(true);
		fetch(`/api/opponentreportselect?opponent=${targetSchoolId}&season=${targetSeason}`)
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				}
				throw new Error(apiResponse.statusText);
			})
			.then(responseData => {
				setLoadedWrestlers(responseData.wrestlers || []);
				setLoadedWrestlerEvents(responseData.wrestlerEvents || []);
				setActiveTab("overview");
				setIsSelectLoading(false);
				setIsLoading(false);
				setPageActive(true);
			})
			.catch(fetchError => {
				console.warn("Failed to load opponent report details:", fetchError);
				setIsSelectLoading(false);
				setIsLoading(false);
			});
	};

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

				const sortedGroups = [...new Set(schoolsList.sort((schoolA, schoolB) => 
					schoolA.classification !== schoolB.classification ?
						(schoolA.classification > schoolB.classification ? -1 : 1)
					: schoolA.region !== schoolB.region ?
						(schoolA.region > schoolB.region ? 1 : -1)
					: (schoolA.name > schoolB.name ? 1 : -1)
				).map(school => `${school.classification || "NA"} - ${school.region || "NA"}`))]
				.map(groupName => ({
					name: groupName,
					schools: schoolsList.filter(school => `${school.classification || "NA"} - ${school.region || "NA"}` === groupName)
				}));

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

	let calculatedStartYear = new Date().getFullYear();
	if (selectedSeason && /^\d{2}-\d{2}$/.test(selectedSeason)) {
		calculatedStartYear = 2000 + parseInt(selectedSeason.split("-")[0], 10);
	} else {
		calculatedStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
	}

	const seasonStartDate = new Date(calculatedStartYear, 10, 1, 0, 0, 0); // Nov 1st
	const seasonEndDate = new Date(calculatedStartYear + 1, 2, 1, 23, 59, 59); // Mar 1st

	// Filter wrestler events strictly within season date bounds (11/1 to 3/1)
	const inSeasonWrestlerEvents = loadedWrestlerEvents.filter(eventItem => {
		const eventDate = parseDateValue(eventItem.date);
		return eventDate && eventDate >= seasonStartDate && eventDate <= seasonEndDate;
	});

	// Filter qualified wrestlers who wrestled at least one event/match in season using divisionConvert
	const qualifiedWrestlers = loadedWrestlers.filter(wrestlerItem => {
		return inSeasonWrestlerEvents.some(eventItem => {
			if (eventItem.wrestlerId !== wrestlerItem.id) return false;

			const eventDivision = eventItem.divisionConvert || eventItem.division;
			if (eventDivision && matchesDivision(eventDivision, selectedDivision)) return true;

			return (eventItem.matches || []).some(matchItem => {
				const matchDivision = matchItem.divisionConvert || eventItem.divisionConvert || matchItem.division;
				return matchDivision && matchesDivision(matchDivision, selectedDivision);
			});
		});
	});

	// Events grouped for the opponent team in the season for selected division
	const eventsMap = {};
	inSeasonWrestlerEvents.forEach(eventItem => {
		const isMatchingDivision = (eventItem.matches || []).some(matchItem => {
			const matchDivision = matchItem.divisionConvert || eventItem.divisionConvert || matchItem.division;
			return matchesDivision(matchDivision, selectedDivision);
		}) || matchesDivision(eventItem.divisionConvert || eventItem.division, selectedDivision);

		if (!isMatchingDivision) return;

		const eventKey = `${new Date(eventItem.date).toLocaleDateString()}|${eventItem.name}`;
		if (!eventsMap[eventKey]) {
			eventsMap[eventKey] = {
				key: eventKey,
				name: eventItem.name,
				date: parseDateValue(eventItem.date),
				eventId: eventItem.id,
				wrestlerIds: new Set(),
				isFortMillPresent: eventItem.isFortMillPresent || false
			};
		}

		if (eventItem.wrestlerId) {
			eventsMap[eventKey].wrestlerIds.add(eventItem.wrestlerId);
		}
		if (eventItem.isFortMillPresent) {
			eventsMap[eventKey].isFortMillPresent = true;
		}
	});

	const seasonEventsList = Object.values(eventsMap).sort((firstEvent, secondEvent) => secondEvent.date - firstEvent.date);

	// KPI calculations for Overview tab
	const totalEventsCount = seasonEventsList.length;
	const lastEventItem = seasonEventsList.length > 0 ? seasonEventsList[0] : null;
	const totalWrestlersCount = qualifiedWrestlers.length;

	// Top 10 Wrestlers by Rating
	const topWrestlersList = [...qualifiedWrestlers]
		.sort((firstWrestler, secondWrestler) => (secondWrestler.rating || 0) - (firstWrestler.rating || 0))
		.slice(0, 10)
		.map(wrestlerItem => {
			const wrestlerEventsList = inSeasonWrestlerEvents.filter(eventItem => eventItem.wrestlerId === wrestlerItem.id);
			
			const wrestledFortMill = wrestlerEventsList.some(eventItem => 
				(eventItem.matches || []).some(matchItem => matchItem.isVsFortMill || (matchItem.vsTeam && /fort mill/i.test(matchItem.vsTeam)))
			);

			let wrestlerLastEvent = null;
			if (wrestlerEventsList.length > 0) {
				const sortedEvents = wrestlerEventsList.sort((eventA, eventB) => parseDateValue(eventB.date) - parseDateValue(eventA.date));
				wrestlerLastEvent = sortedEvents[0];
			} else if (wrestlerItem.lastEvent) {
				wrestlerLastEvent = wrestlerItem.lastEvent;
			}

			return {
				...wrestlerItem,
				wrestledFortMill,
				lastEvent: wrestlerLastEvent
			};
		});

	// Weight Classes tab calculations
	const weightClassDataMap = {};
	standardWeightClasses.forEach(weightClassLabel => {
		weightClassDataMap[weightClassLabel] = {
			weightClass: weightClassLabel,
			wrestlerMap: {}
		};
	});

	inSeasonWrestlerEvents.forEach(eventItem => {
		const wrestlerItem = qualifiedWrestlers.find(wrestler => wrestler.id === eventItem.wrestlerId);
		if (!wrestlerItem) return;

		(eventItem.matches || []).forEach(matchItem => {
			const matchDivision = matchItem.divisionConvert || eventItem.divisionConvert || matchItem.division;
			if (!matchesDivision(matchDivision, selectedDivision)) return;

			const rawWeight = (matchItem.weightClass || eventItem.weightClass || wrestlerItem.lastWeightClass || "").toString().replace("lbs", "").trim();
			if (!standardWeightClasses.includes(rawWeight)) return;

			const weightClassEntry = weightClassDataMap[rawWeight];
			if (!weightClassEntry.wrestlerMap[wrestlerItem.id]) {
				weightClassEntry.wrestlerMap[wrestlerItem.id] = {
					id: wrestlerItem.id,
					name: wrestlerItem.name,
					rating: wrestlerItem.rating || 0,
					wins: 0,
					losses: 0,
					eventsMap: {}
				};
			}

			const wrestlerStats = weightClassEntry.wrestlerMap[wrestlerItem.id];
			if (matchItem.isWinner) {
				wrestlerStats.wins += 1;
			} else {
				wrestlerStats.losses += 1;
			}

			if (eventItem.name) {
				const eventName = eventItem.name.trim();
				if (eventName && !wrestlerStats.eventsMap[eventName]) {
					wrestlerStats.eventsMap[eventName] = parseDateValue(eventItem.date);
				}
			}
		});
	});

	const weightClassCardsList = standardWeightClasses.map(weightClassLabel => {
		const classData = weightClassDataMap[weightClassLabel];
		const wrestlersInClass = Object.values(classData.wrestlerMap).map(wrestlerStats => {
			const sortedEvents = Object.entries(wrestlerStats.eventsMap || {})
				.sort((eventA, eventB) => (eventA[1] && eventB[1] ? eventB[1] - eventA[1] : 0))
				.map(entry => entry[0]);
			return {
				...wrestlerStats,
				events: sortedEvents
			};
		});
		const wrestlerCount = wrestlersInClass.length;

		let statusLabel = "Stable";
		if (wrestlerCount >= 4) {
			statusLabel = "Volatile";
		} else if (wrestlerCount >= 2) {
			statusLabel = "Variable";
		} else {
			statusLabel = "Stable";
		}

		return {
			weightClass: weightClassLabel,
			wrestlerCount: wrestlerCount,
			statusLabel: statusLabel,
			wrestlers: wrestlersInClass.sort((firstWrestler, secondWrestler) => secondWrestler.rating - firstWrestler.rating)
		};
	});

	// Most Volatile & Most Stable KPIs
	let mostVolatileClass = null;
	let maxWrestlerCount = -1;

	let mostStableClass = null;
	let minWrestlerCount = 999;

	weightClassCardsList.forEach(cardItem => {
		if (cardItem.wrestlerCount > maxWrestlerCount) {
			maxWrestlerCount = cardItem.wrestlerCount;
			mostVolatileClass = cardItem;
		}
		if (cardItem.wrestlerCount > 0 && cardItem.wrestlerCount < minWrestlerCount) {
			minWrestlerCount = cardItem.wrestlerCount;
			mostStableClass = cardItem;
		}
	});

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
						<div className={`dualreport container ${pageActive ? "active" : ""}`}>
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
										onChange={changeEvent => {
											const newOpponentId = changeEvent.target.value;
											setSelectedOpponentId(newOpponentId);
											const chosenSchool = allSchools.find(school => school.id === newOpponentId);
											setSelectedOpponent(chosenSchool || null);
											if (newOpponentId) {
												fetchOpponentData(newOpponentId, selectedSeason);
											}
										}}
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
										onChange={changeEvent => {
											const newSeason = changeEvent.target.value;
											setSelectedSeason(newSeason);
											if (selectedOpponentId) {
												fetchOpponentData(selectedOpponentId, newSeason);
											}
										}}
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

							{!selectedOpponentId ? (
								<div className="no-leaderboard-data select-prompt-card">
									Please select an opponent school from the dropdown to view the report.
								</div>
							) : isSelectLoading ? (
								<div className="select-loading-container">
									<img src="/media/wrestlingloading.gif" alt="Loading Opponent Data..." />
								</div>
							) : activeTab === "overview" ? (
								<>
									{/* Overview KPIs */}
									<div className="report-kpis-grid">
										<div className="report-kpi-card">
											<span className="kpi-label"># OF EVENTS</span>
											<span className="kpi-value-text Russo">{totalEventsCount}</span>
											<span className="kpi-sub-text">{selectedSeason} Season</span>
										</div>

										<div className="report-kpi-card">
											<span className="kpi-label">LAST EVENT</span>
											<span className="kpi-value-text Russo kpi-text-ellipsis">
												{lastEventItem ? lastEventItem.name : "N/A"}
											</span>
											<span className="kpi-sub-text">
												{lastEventItem && lastEventItem.date ? parseDateValue(lastEventItem.date).toLocaleDateString() : "No events"}
											</span>
										</div>

										<div className="report-kpi-card">
											<span className="kpi-label"># OF WRESTLERS</span>
											<span className="kpi-value-text Russo">{totalWrestlersCount}</span>
											<span className="kpi-sub-text">{selectedDivision} Division</span>
										</div>
									</div>

									{/* Top 10 Wrestlers Section */}
									<div className="report-matrix-section matrix-section-spacing">
										<h3 className="matrix-section-title">Top 10 Wrestlers (Rating)</h3>
										
										{/* Desktop Table View */}
										<div className="leaderboard-table-wrapper desktop-view-container">
											<table className="leaderboard-table">
												<thead>
													<tr>
														<th>#</th>
														<th>Wrestler Name</th>
														<th>Rating</th>
														<th>Wrestled Fort Mill</th>
														<th>Last Event</th>
													</tr>
												</thead>
												<tbody>
													{topWrestlersList.length === 0 ? (
														<tr>
															<td colSpan="5" className="no-leaderboard-data">No qualified wrestlers found for this division & season.</td>
														</tr>
													) : (
														topWrestlersList.map((wrestlerItem, rankIndex) => (
															<tr key={`top-wrestler-${wrestlerItem.id || rankIndex}`}>
																<td>{rankIndex + 1}</td>
																<td className="wrestler-name-cell">
																	<a
																		href={`/portal/wrestlerreport.html?id=${wrestlerItem.id}`}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="wrestler-link"
																	>
																		{wrestlerItem.name}
																	</a>
																</td>
																<td className="metric-cell">{wrestlerItem.rating ? Math.round(wrestlerItem.rating) : "N/A"}</td>
																<td>
																	{wrestlerItem.wrestledFortMill ? (
																		<span className="fort-mill-badge">vs Fort Mill</span>
																	) : (
																		<span className="fort-mill-badge none">No</span>
																	)}
																</td>
																<td>
																	{wrestlerItem.lastEvent ? (
																		<span>
																			{wrestlerItem.lastEvent.name || "Event"}{" "}
																			{wrestlerItem.lastEvent.date ? `(${parseDateValue(wrestlerItem.lastEvent.date).toLocaleDateString()})` : ""}
																		</span>
																	) : "N/A"}
																</td>
															</tr>
														))
													)}
												</tbody>
											</table>
										</div>

										{/* Mobile List View */}
										<div className="mobile-view-container">
											{topWrestlersList.map((wrestlerItem, rankIndex) => (
												<div key={`mobile-wrestler-${wrestlerItem.id || rankIndex}`} className="opponent-mobile-card">
													<div className="opponent-mobile-card-header">
														<div className="mobile-identity-group">
															<span className="rank-badge gold">{rankIndex + 1}</span>
															<a
																href={`/portal/wrestlerreport.html?id=${wrestlerItem.id}`}
																target="_blank"
																rel="noopener noreferrer"
																className="wrestler-link bold-wrestler-link"
															>
																{wrestlerItem.name}
															</a>
														</div>
														<span className="mobile-rating-badge">
															Rating: {wrestlerItem.rating ? Math.round(wrestlerItem.rating) : "N/A"}
														</span>
													</div>
													<div className="mobile-card-footer">
														<span>Last: {wrestlerItem.lastEvent?.name || "N/A"}</span>
														{wrestlerItem.wrestledFortMill ? (
															<span className="fort-mill-badge">vs Fort Mill</span>
														) : (
															<span className="fort-mill-badge none">No FM Match</span>
														)}
													</div>
												</div>
											))}
										</div>
									</div>

									{/* Events Section */}
									<div className="report-matrix-section">
										<h3 className="matrix-section-title">Season Events</h3>

										{/* Desktop Table View */}
										<div className="leaderboard-table-wrapper desktop-view-container">
											<table className="leaderboard-table">
												<thead>
													<tr>
														<th>Date</th>
														<th>Event Name</th>
														<th># Wrestlers</th>
														<th>Fort Mill Attended</th>
													</tr>
												</thead>
												<tbody>
													{seasonEventsList.length === 0 ? (
														<tr>
															<td colSpan="4" className="no-leaderboard-data">No season events recorded.</td>
														</tr>
													) : (
														seasonEventsList.map((eventItem, eventIndex) => (
															<tr key={`event-${eventIndex}`}>
																<td>{parseDateValue(eventItem.date).toLocaleDateString()}</td>
																<td className="wrestler-name-cell">
																	<a
																		href={`/portal/tournamentsummary.html?id=${eventItem.eventId}`}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="wrestler-link"
																	>
																		{eventItem.name}
																	</a>
																</td>
																<td>{eventItem.wrestlerIds.size}</td>
																<td>
																	{eventItem.isFortMillPresent ? (
																		<span className="fort-mill-badge">Fort Mill Present</span>
																	) : (
																		<span className="fort-mill-badge none">No</span>
																	)}
																</td>
															</tr>
														))
													)}
												</tbody>
											</table>
										</div>

										{/* Mobile List View */}
										<div className="mobile-view-container">
											{seasonEventsList.map((eventItem, eventIndex) => (
												<div key={`mobile-event-${eventIndex}`} className="opponent-mobile-card">
													<div className="opponent-mobile-card-header">
														<a
															href={`/portal/tournamentsummary.html?id=${eventItem.eventId}`}
															target="_blank"
															rel="noopener noreferrer"
															className="wrestler-link bold-wrestler-link"
														>
															{eventItem.name}
														</a>
														<span className="mobile-subtext">
															{parseDateValue(eventItem.date).toLocaleDateString()}
														</span>
													</div>
													<div className="mobile-card-footer">
														<span>Wrestlers: {eventItem.wrestlerIds.size}</span>
														{eventItem.isFortMillPresent ? (
															<span className="fort-mill-badge">Fort Mill Present</span>
														) : (
															<span className="fort-mill-badge none">No FM</span>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								</>
							) : activeTab === "weight_classes" ? (
								<>
									{/* Weight Classes KPIs */}
									<div className="report-kpis-grid">
										<div className="report-kpi-card weight-class-kpi-card wip">
											<span className="kpi-label">MOST VOLATILE</span>
											<span className="kpi-value-text Russo">
												{mostVolatileClass && mostVolatileClass.wrestlerCount > 0 ? `${mostVolatileClass.weightClass} lbs` : "N/A"}
											</span>
											<span className="kpi-sub-text volatile-color">
												{mostVolatileClass ? `${mostVolatileClass.wrestlerCount} Wrestlers` : "No data"}
											</span>
										</div>

										<div className="report-kpi-card weight-class-kpi-card powerhouse">
											<span className="kpi-label">MOST STABLE</span>
											<span className="kpi-value-text Russo">
												{mostStableClass && mostStableClass.wrestlerCount > 0 ? `${mostStableClass.weightClass} lbs` : "N/A"}
											</span>
											<span className="kpi-sub-text stable-color">
												{mostStableClass ? `${mostStableClass.wrestlerCount} Wrestlers` : "No data"}
											</span>
										</div>
									</div>

									{/* Weight Class Cards Grid */}
									<div className="weight-matrix-section">
										<h3 className="matrix-section-title">Weight Class Cards</h3>
										
										<div className="weight-class-cards-grid">
											{weightClassCardsList.map(cardItem => (
												<div key={`wc-card-${cardItem.weightClass}`} className="weight-class-card">
													<div className="wc-card-header">
														<span className="wc-title">
															{cardItem.weightClass} lbs
														</span>
														<span className={`status-badge ${cardItem.statusLabel.toLowerCase()}`}>
															{cardItem.statusLabel} ({cardItem.wrestlerCount})
														</span>
													</div>

													<div className="wc-wrestlers-list">
														{cardItem.wrestlers.length === 0 ? (
															<span className="wc-no-wrestlers">No wrestlers recorded</span>
														) : (
															cardItem.wrestlers.map((wrestlerItem, wrestlerIndex) => {
																const wrestlerKey = `${cardItem.weightClass}-${wrestlerItem.id}`;
																const isExpanded = !!expandedWrestlers[wrestlerKey];
																const allEvents = wrestlerItem.events || [];
																const visibleEvents = isExpanded ? allEvents : allEvents.slice(0, 3);
																const hiddenCount = allEvents.length - 3;

																return (
																	<div
																		key={`wc-wrestler-${wrestlerIndex}`}
																		onClick={() => window.open(`/portal/wrestlerreport.html?id=${wrestlerItem.id}`, "_blank")}
																		className="wc-wrestler-row"
																	>
																		<div className="wc-wrestler-info">
																			<span className="wc-wrestler-name">
																				{wrestlerItem.name}
																			</span>
																			<span className="wc-wrestler-record">
																				Record: {wrestlerItem.wins}-{wrestlerItem.losses}
																			</span>
																			{allEvents.length > 0 && (
																				<div className="wc-wrestler-events-container">
																					<span className="wc-events-label">Events:</span>
																					{visibleEvents.map((eventName, eventIdx) => (
																						<span key={`ev-${eventIdx}`} className="wc-event-chip" title={eventName}>
																							{eventName}
																						</span>
																					))}
																					{!isExpanded && hiddenCount > 0 && (
																						<span
																							className="wc-event-chip more-badge"
																							onClick={(e) => toggleExpandWrestler(wrestlerKey, e)}
																						>
																							+{hiddenCount} more
																						</span>
																					)}
																					{isExpanded && hiddenCount > 0 && (
																						<span
																							className="wc-event-chip more-badge"
																							onClick={(e) => toggleExpandWrestler(wrestlerKey, e)}
																						>
																							show less
																						</span>
																					)}
																				</div>
																			)}
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
											))}
										</div>
									</div>
								</>
							) : null}

						</div>

						{/* Sticky Bottom Navigation Bar */}
						<div className="bottomNav">
							<div 
								className={`navItem ${activeTab === "overview" ? "active" : ""}`}
								onClick={() => setActiveTab("overview")}
							>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
									<line x1="9" y1="3" x2="9" y2="21" />
									<line x1="15" y1="3" x2="15" y2="21" />
									<line x1="3" y1="9" x2="21" y2="9" />
									<line x1="3" y1="15" x2="21" y2="15" />
								</svg>
								<span>Overview</span>
							</div>

							<div 
								className={`navItem ${activeTab === "weight_classes" ? "active" : ""}`}
								onClick={() => setActiveTab("weight_classes")}
							>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M12 3v18M12 7l-8-2M12 7l8-2M4 5v4a4 4 0 0 0 8 0V5M20 5v4a4 4 0 0 1-8 0V5M4 19h16" />
								</svg>
								<span>Weight Classes</span>
							</div>
						</div>
						
					</div>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<OpponentReport />);
