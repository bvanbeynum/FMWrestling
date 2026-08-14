import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/dualreport.css";

// ============================================================================
// TOP-OF-PAGE PURE LOGIC & DATA PROCESSING FUNCTIONS
// ============================================================================

const parseEventDate = (dateInput) => {
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

const getSeasonOptions = (dateObject) => {
	const currentYear = dateObject.getFullYear();
	const currentMonth = dateObject.getMonth();
	let startYear;
	if (currentMonth >= 8) {
		startYear = currentYear;
	} else {
		startYear = currentYear - 1;
	}

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
		formatSeason(startYear - 1),
		formatSeason(startYear - 2)
	];
};

const getSeasonStartYear = (seasonNameValue) => {
	if (seasonNameValue && /^\d{2}-\d{2}$/.test(seasonNameValue)) {
		const startYearShortValue = parseInt(seasonNameValue.split("-")[0], 10);
		return 2000 + startYearShortValue;
	}
	const currentTodayDate = new Date();
	return currentTodayDate.getMonth() >= 8 ? currentTodayDate.getFullYear() : currentTodayDate.getFullYear() - 1;
};

const processLeaderboardData = (seasonWrestlers, selectedDivisionSetting, seasonNameValue) => {
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
			wins: 0,
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
			const rawEventDate = parseEventDate(eventItem.date);
			if (!rawEventDate) return;

			if (rawEventDate < inSeasonStartDate || rawEventDate > inSeasonEndDate) {
				return;
			}

			(eventItem.matches || []).forEach((matchItem) => {
				const matchDivisionValue = matchItem.divisionConvert || eventItem.divisionConvert || matchItem.division || "Varsity";
				wrestlerRecord.wrestledDivisions.add(matchDivisionValue);
				wrestlerRecord.totalMatches += 1;

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

					wrestlerRecord.points += matchPointsValue;
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

	if (selectedDivisionSetting === "All Divisions") {
		return processedLeaderboardRecords;
	}

	return processedLeaderboardRecords.filter(recordItem => recordItem.wrestledDivisions.has(selectedDivisionSetting));
};

const formatLeaderboardMetric = (wrestlerRecord, metricKey, viewModeSetting) => {
	const rawValue = wrestlerRecord[metricKey] || 0;
	if (viewModeSetting === "per_match") {
		if (!wrestlerRecord.totalMatches || wrestlerRecord.totalMatches === 0) {
			return "0.00";
		}
		return (rawValue / wrestlerRecord.totalMatches).toFixed(2);
	}
	return rawValue;
};

const getMetricDisplayName = (targetMetricKey) => {
	const metricLabels = {
		points: "Points",
		wins: "Wins",
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
	return metricLabels[targetMetricKey] || "Points";
};

const getTopLeaderboardRecords = (wrestlerRecords, metricKey, viewModeSetting, count = 3) => {
	if (wrestlerRecords.length === 0) return [];
	return [...wrestlerRecords].sort((firstEntry, secondEntry) => {
		const valueOne = viewModeSetting === "per_match"
			? (firstEntry.totalMatches > 0 ? firstEntry[metricKey] / firstEntry.totalMatches : 0)
			: (firstEntry[metricKey] || 0);
		const valueTwo = viewModeSetting === "per_match"
			? (secondEntry.totalMatches > 0 ? secondEntry[metricKey] / secondEntry.totalMatches : 0)
			: (secondEntry[metricKey] || 0);
		if (valueOne !== valueTwo) {
			return valueTwo - valueOne;
		}
		return secondEntry.points - firstEntry.points;
	}).slice(0, count);
};

// ============================================================================
// PRESENTATION JSX COMPONENTS
// ============================================================================

const WrestlerLeaderboard = ({ seasonWrestlers, seasonName }) => {
	const [selectedDivisionSetting, setSelectedDivisionSetting] = useState("Varsity");
	const [viewModeSetting, setViewModeSetting] = useState("overall");
	const [sortMetricKey, setSortMetricKey] = useState("points");
	const [sortDirectionDescending, setSortDirectionDescending] = useState(true);

	const wrestlerRecords = processLeaderboardData(seasonWrestlers, selectedDivisionSetting, seasonName);

	const sortedWrestlerRecords = [...wrestlerRecords].sort((firstRecord, secondRecord) => {
		const firstValue = viewModeSetting === "per_match" 
			? (firstRecord.totalMatches > 0 ? firstRecord[sortMetricKey] / firstRecord.totalMatches : 0)
			: (firstRecord[sortMetricKey] || 0);
		const secondValue = viewModeSetting === "per_match"
			? (secondRecord.totalMatches > 0 ? secondRecord[sortMetricKey] / secondRecord.totalMatches : 0)
			: (secondRecord[sortMetricKey] || 0);

		if (firstValue !== secondValue) {
			return sortDirectionDescending ? secondValue - firstValue : firstValue - secondValue;
		}
		return secondRecord.points - firstRecord.points;
	});

	const handleColumnHeaderClick = (targetMetricKey) => {
		if (sortMetricKey === targetMetricKey) {
			setSortDirectionDescending(!sortDirectionDescending);
		} else {
			setSortMetricKey(targetMetricKey);
			setSortDirectionDescending(true);
		}
	};

	const topThreeLeaders = getTopLeaderboardRecords(wrestlerRecords, sortMetricKey, viewModeSetting, 3);
	const activeMetricLabel = getMetricDisplayName(sortMetricKey);

	return (
		<div className="leaderboard-section-container">
			<div className="leaderboard-header-row">
				<div className="leaderboard-controls-group">
					<div className="division-selector-wrapper">
						<label htmlFor="division-select-dropdown" className="control-label" style={{ margin: 0 }}>Division:</label>
						<select
							id="division-select-dropdown"
							value={selectedDivisionSetting}
							onChange={(changeEvent) => setSelectedDivisionSetting(changeEvent.target.value)}
							className="season-dropdown-select division-dropdown-select"
						>
							<option value="Varsity">Varsity</option>
							<option value="JV">JV</option>
							<option value="Middle School">Middle School</option>
							<option value="Girls">Girls</option>
							<option value="All Divisions">All Divisions</option>
						</select>
					</div>

					<div className="leaderboard-toggle-group">
						<button
							className={`leaderboard-toggle-btn ${viewModeSetting === "overall" ? "active" : ""}`}
							onClick={() => setViewModeSetting("overall")}
						>
							Overall Numbers
						</button>
						<button
							className={`leaderboard-toggle-btn ${viewModeSetting === "per_match" ? "active" : ""}`}
							onClick={() => setViewModeSetting("per_match")}
						>
							Per Match
						</button>
					</div>
				</div>
			</div>

			<div className="report-kpis-grid leaderboard-leaders-grid">
				{[0, 1, 2].map((rankIndexPosition) => {
					const leaderRecord = topThreeLeaders[rankIndexPosition];
					const ordinalLabel = rankIndexPosition === 0 ? "#1" : rankIndexPosition === 1 ? "#2" : "#3";
					const rankClass = `rank-${rankIndexPosition + 1}`;

					return (
						<div key={`top-leader-${rankIndexPosition}`} className={`report-kpi-card leaderboard-kpi-card ${rankClass}`}>
							<span className="kpi-label">{ordinalLabel} {activeMetricLabel.toUpperCase()} LEADER</span>
							<span className="kpi-value-text Russo">{leaderRecord ? leaderRecord.name : "-"}</span>
							<span className="kpi-sub-text">
								{leaderRecord 
									? `${formatLeaderboardMetric(leaderRecord, sortMetricKey, viewModeSetting)} ${viewModeSetting === "per_match" ? `${activeMetricLabel} / Match` : activeMetricLabel}` 
									: "No data"}
							</span>
						</div>
					);
				})}
			</div>

			<div className="leaderboard-table-wrapper">
				<div className="leaderboard-table-scroll">
					<table className="leaderboard-table">
						<thead>
							<tr>
								<th className="rank-header">#</th>
								<th className="wrestler-header">Wrestler</th>
								<th className="matches-header" onClick={() => handleColumnHeaderClick("totalMatches")}>
									Matches {sortMetricKey === "totalMatches" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>

								<th className="win-type-group-header" colSpan={7}>Win Type</th>

								<th className="scoring-group-header" colSpan={4}>Scoring</th>
							</tr>
							<tr className="sub-header-row">
								<th></th>
								<th></th>
								<th></th>

								<th onClick={() => handleColumnHeaderClick("points")} className={sortMetricKey === "points" ? "active-sort" : ""}>
									Pts {sortMetricKey === "points" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("wins")} className={sortMetricKey === "wins" ? "active-sort" : ""}>
									Wins {sortMetricKey === "wins" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("pins")} className={sortMetricKey === "pins" ? "active-sort" : ""}>
									Pins {sortMetricKey === "pins" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("techfalls")} className={sortMetricKey === "techfalls" ? "active-sort" : ""}>
									TF {sortMetricKey === "techfalls" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("majorDecisions")} className={sortMetricKey === "majorDecisions" ? "active-sort" : ""}>
									MD {sortMetricKey === "majorDecisions" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("decisions")} className={sortMetricKey === "decisions" ? "active-sort" : ""}>
									Dec {sortMetricKey === "decisions" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("forfeits")} className={sortMetricKey === "forfeits" ? "active-sort" : ""}>
									Forf {sortMetricKey === "forfeits" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>

								<th onClick={() => handleColumnHeaderClick("takedowns")} className={sortMetricKey === "takedowns" ? "active-sort" : ""}>
									TD {sortMetricKey === "takedowns" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("nearfalls")} className={sortMetricKey === "nearfalls" ? "active-sort" : ""}>
									NF {sortMetricKey === "nearfalls" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("reversals")} className={sortMetricKey === "reversals" ? "active-sort" : ""}>
									Rev {sortMetricKey === "reversals" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
								<th onClick={() => handleColumnHeaderClick("escapes")} className={sortMetricKey === "escapes" ? "active-sort" : ""}>
									Esc {sortMetricKey === "escapes" ? (sortDirectionDescending ? "↓" : "↑") : ""}
								</th>
							</tr>
						</thead>
						<tbody>
							{sortedWrestlerRecords.length === 0 ? (
								<tr>
									<td colSpan={14} className="no-leaderboard-data">No wrestler performance records found for this season.</td>
								</tr>
							) : (
								sortedWrestlerRecords.map((wrestlerItem, indexValue) => {
									const rankPosition = indexValue + 1;
									const rankBadgeClass = rankPosition === 1 ? "gold" : rankPosition === 2 ? "silver" : rankPosition === 3 ? "bronze" : "";

									return (
										<tr key={wrestlerItem.name} className="leaderboard-row">
											<td className="rank-cell">
												<span className={`rank-badge ${rankBadgeClass}`}>{rankPosition}</span>
											</td>
											<td className="wrestler-name-cell">
												{wrestlerItem.id ? (
													<a
														href={`/portal/wrestlerreport.html?id=${wrestlerItem.id}`}
														target="_blank"
														rel="noopener noreferrer"
														className="wrestler-link"
													>
														{wrestlerItem.name}
													</a>
												) : (
													<span>{wrestlerItem.name}</span>
												)}
											</td>
											<td className="metric-cell matches-cell">{wrestlerItem.totalMatches}</td>

											<td className={`metric-cell ${sortMetricKey === "points" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "points", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "wins" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "wins", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "pins" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "pins", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "techfalls" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "techfalls", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "majorDecisions" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "majorDecisions", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "decisions" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "decisions", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "forfeits" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "forfeits", viewModeSetting)}</td>

											<td className={`metric-cell ${sortMetricKey === "takedowns" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "takedowns", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "nearfalls" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "nearfalls", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "reversals" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "reversals", viewModeSetting)}</td>
											<td className={`metric-cell ${sortMetricKey === "escapes" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "escapes", viewModeSetting)}</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="leaderboard-mobile-cards-container">
				<div className="mobile-sort-selector-wrapper">
					<label htmlFor="mobile-sort-select-dropdown" className="control-label" style={{ margin: 0 }}>Sort By:</label>
					<select
						id="mobile-sort-select-dropdown"
						value={sortMetricKey}
						onChange={(changeEvent) => handleColumnHeaderClick(changeEvent.target.value)}
						className="season-dropdown-select division-dropdown-select"
					>
						<option value="points">Points</option>
						<option value="wins">Wins</option>
						<option value="pins">Pins</option>
						<option value="techfalls">Tech Falls</option>
						<option value="majorDecisions">Major Decisions</option>
						<option value="decisions">Decisions</option>
						<option value="forfeits">Forfeits</option>
						<option value="takedowns">Takedowns</option>
						<option value="nearfalls">Nearfalls</option>
						<option value="reversals">Reversals</option>
						<option value="escapes">Escapes</option>
						<option value="totalMatches">Matches</option>
					</select>
				</div>

				{sortedWrestlerRecords.length === 0 ? (
					<div className="no-leaderboard-data">No wrestler performance records found for this season.</div>
				) : (
					sortedWrestlerRecords.map((wrestlerItem, indexValue) => {
						const rankPosition = indexValue + 1;
						const rankBadgeClass = rankPosition === 1 ? "gold" : rankPosition === 2 ? "silver" : rankPosition === 3 ? "bronze" : "";

						return (
							<div key={wrestlerItem.name} className="leaderboard-mobile-card">
								<div className="mobile-card-header">
									<div className="mobile-card-identity">
										<span className={`rank-badge ${rankBadgeClass}`}>{rankPosition}</span>
										{wrestlerItem.id ? (
											<a
												href={`/portal/wrestlerreport.html?id=${wrestlerItem.id}`}
												target="_blank"
												rel="noopener noreferrer"
												className="wrestler-link mobile-wrestler-name"
											>
												{wrestlerItem.name}
											</a>
										) : (
											<span className="mobile-wrestler-name">{wrestlerItem.name}</span>
										)}
									</div>
									<div className="mobile-matches-badge">
										{wrestlerItem.totalMatches} Matches
									</div>
								</div>

								<div className="mobile-card-metrics-summary">
									<div className="mobile-metric-section">
										<span className="mobile-section-title">Win Type:</span>
										<div className="mobile-inline-stats">
											<span className={`stat-inline-item ${sortMetricKey === "points" ? "highlight" : ""}`}>
												<strong className="stat-label">Pts:</strong> {formatLeaderboardMetric(wrestlerItem, "points", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "wins" ? "highlight" : ""}`}>
												<strong className="stat-label">Wins:</strong> {formatLeaderboardMetric(wrestlerItem, "wins", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "pins" ? "highlight" : ""}`}>
												<strong className="stat-label">Pins:</strong> {formatLeaderboardMetric(wrestlerItem, "pins", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "techfalls" ? "highlight" : ""}`}>
												<strong className="stat-label">TF:</strong> {formatLeaderboardMetric(wrestlerItem, "techfalls", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "majorDecisions" ? "highlight" : ""}`}>
												<strong className="stat-label">MD:</strong> {formatLeaderboardMetric(wrestlerItem, "majorDecisions", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "decisions" ? "highlight" : ""}`}>
												<strong className="stat-label">Dec:</strong> {formatLeaderboardMetric(wrestlerItem, "decisions", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "forfeits" ? "highlight" : ""}`}>
												<strong className="stat-label">Forf:</strong> {formatLeaderboardMetric(wrestlerItem, "forfeits", viewModeSetting)}
											</span>
										</div>
									</div>

									<div className="mobile-metric-section">
										<span className="mobile-section-title">Scoring:</span>
										<div className="mobile-inline-stats">
											<span className={`stat-inline-item ${sortMetricKey === "takedowns" ? "highlight" : ""}`}>
												<strong className="stat-label">TD:</strong> {formatLeaderboardMetric(wrestlerItem, "takedowns", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "nearfalls" ? "highlight" : ""}`}>
												<strong className="stat-label">NF:</strong> {formatLeaderboardMetric(wrestlerItem, "nearfalls", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "reversals" ? "highlight" : ""}`}>
												<strong className="stat-label">Rev:</strong> {formatLeaderboardMetric(wrestlerItem, "reversals", viewModeSetting)}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "escapes" ? "highlight" : ""}`}>
												<strong className="stat-label">Esc:</strong> {formatLeaderboardMetric(wrestlerItem, "escapes", viewModeSetting)}
											</span>
										</div>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};

const TeamLeaderboard = () => {
	const seasonOptions = getSeasonOptions(new Date());
	
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [wrestlers, setWrestlers] = useState([]);
	const [seasonName, setSeasonName] = useState("");
	const [selectedSeason, setSelectedSeason] = useState(seasonOptions[1].name);

	useEffect(() => {
		setIsLoading(true);
		
		const fetchUrl = `/api/teamleaderboardload?season=${selectedSeason}`;
		
		fetch(fetchUrl)
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				} else {
					throw Error(apiResponse.statusText);
				}
			})
			.then(payload => {
				const fetchedWrestlers = payload.wrestlers || [];
				setLoggedInUser(payload.loggedInUser);
				setWrestlers(fetchedWrestlers);
				setSeasonName(payload.seasonName || selectedSeason);
				setPageActive(true);
				setIsLoading(false);
			})
			.catch(fetchError => {
				console.warn("Error loading leaderboard details:", fetchError);
				setIsLoading(false);
			});
	}, [selectedSeason]);

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUser} />

			<div style={{ minWidth: 0 }}>
				{isLoading ? (
					<div className="pageLoading">
						<img src="/media/wrestlingloading.gif" alt="Loading..." />
					</div>
				) : !loggedInUser || !loggedInUser.privileges || (!loggedInUser.privileges.some(privilegeItem => privilegeItem.token === "scheduleView" || privilegeItem.token === "teamManage" || privilegeItem.token === "myteam" || privilegeItem.name === "scheduleView" || privilegeItem.name === "teamManage" || privilegeItem.name === "myteam") && !loggedInUser.privileges.includes("scheduleView") && !loggedInUser.privileges.includes("teamManage") && !loggedInUser.privileges.includes("myteam")) ? (
					<div className="noAccess">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
						<a>Unauthorized Access</a>
					</div>
				) : (
					<div className={`dualreport container ${pageActive ? "active" : ""}`}>
						<header>
							<h1>Team Leaderboard</h1>
						</header>

						<div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
							<div className="season-selector-wrapper">
								<select 
									value={selectedSeason} 
									onChange={changeEvent => setSelectedSeason(changeEvent.target.value)}
									aria-label="Filter Season"
									className="season-dropdown-select"
								>
									{seasonOptions.map(optionItem => (
										<option key={optionItem.name} value={optionItem.name}>{optionItem.name}</option>
									))}
								</select>
							</div>
						</div>

						<WrestlerLeaderboard seasonWrestlers={wrestlers} seasonName={seasonName} />
					</div>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamLeaderboard />);
