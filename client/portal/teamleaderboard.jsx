import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/dualreport.css";
import {
	getSeasonOptions,
	processLeaderboardData,
	formatLeaderboardMetric,
	getMetricDisplayName,
	getTopLeaderboardRecords,
	PRINT_DIVISION_GROUPS,
	buildDivisionPrintDatasets
} from "../../server/leaderboardData.js";

// ============================================================================
// PRESENTATION JSX COMPONENT
// ============================================================================

const TeamLeaderboard = () => {
	const seasonOptions = getSeasonOptions(new Date());
	
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [wrestlers, setWrestlers] = useState([]);
	const [seasonName, setSeasonName] = useState("");
	const [selectedSeason, setSelectedSeason] = useState(seasonOptions[1].name);
	const [selectedDivisionSetting, setSelectedDivisionSetting] = useState("Varsity");
	const [viewModeSetting, setViewModeSetting] = useState("overall");
	const [sortMetricKey, setSortMetricKey] = useState("careerWins");
	const [sortDirectionDescending, setSortDirectionDescending] = useState(true);

	const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
	const [selectedPrintDivisions, setSelectedPrintDivisions] = useState({
		varsity: true,
		jv: false,
		ms: false
	});
	const [includeFullRosterTables, setIncludeFullRosterTables] = useState(true);
	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
	const [pdfErrorMessage, setPdfErrorMessage] = useState("");

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

	const wrestlerRecords = processLeaderboardData(wrestlers, selectedDivisionSetting, seasonName);

	const usePerMatchSort = viewModeSetting === "per_match" && sortMetricKey !== "careerWins" && sortMetricKey !== "wins";

	const sortedWrestlerRecords = [...wrestlerRecords].sort((firstRecord, secondRecord) => {
		const firstValue = usePerMatchSort 
			? (firstRecord.totalMatches > 0 ? firstRecord[sortMetricKey] / firstRecord.totalMatches : 0)
			: (firstRecord[sortMetricKey] || 0);
		const secondValue = usePerMatchSort
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

	const getDefaultPrintDivisions = () => {
		if (selectedDivisionSetting === "Varsity") {
			return { varsity: true, jv: false, ms: false };
		}
		if (selectedDivisionSetting === "JV" || selectedDivisionSetting === "Girls") {
			return { varsity: false, jv: true, ms: false };
		}
		if (selectedDivisionSetting === "Middle School") {
			return { varsity: false, jv: false, ms: true };
		}
		return { varsity: true, jv: true, ms: true };
	};

	const openPrintModal = () => {
		setSelectedPrintDivisions(getDefaultPrintDivisions());
		setIncludeFullRosterTables(true);
		setPdfErrorMessage("");
		setIsPrintModalOpen(true);
	};

	const activeSeasonForPdf = seasonName || selectedSeason;
	const allDivisionPrintDatasets = buildDivisionPrintDatasets(
		wrestlers,
		activeSeasonForPdf,
		PRINT_DIVISION_GROUPS.map((group) => ({ key: group.key, includeTable: includeFullRosterTables }))
	);
	const datasetByDivisionKey = {};
	allDivisionPrintDatasets.forEach((dataset) => {
		datasetByDivisionKey[dataset.key] = dataset;
	});

	const selectedPrintKeys = PRINT_DIVISION_GROUPS
		.filter((group) => selectedPrintDivisions[group.key])
		.map((group) => group.key);

	const estimatedPdfPages = selectedPrintKeys.reduce((totalPages, divKey) => {
		const dataset = datasetByDivisionKey[divKey];
		if (!dataset) return totalPages;
		if (!includeFullRosterTables) return totalPages + 1;
		const tablePages = dataset.records.length > 40 ? Math.ceil(dataset.records.length / 35) : 1;
		return totalPages + 1 + tablePages;
	}, 0);

	const handleLeaderboardPdfAction = async (actionMode) => {
		if (selectedPrintKeys.length === 0) {
			setPdfErrorMessage("Please select at least one division.");
			return;
		}
		if (estimatedPdfPages === 0) {
			setPdfErrorMessage("No wrestler match records found for the selected division(s) this season.");
			return;
		}

		const previewWindow = actionMode === "preview" ? window.open("", "_blank") : null;
		setIsGeneratingPdf(true);
		setPdfErrorMessage("");

		try {
			const queryParams = new URLSearchParams({
				season: activeSeasonForPdf,
				divisions: selectedPrintKeys.join(","),
				tables: includeFullRosterTables ? selectedPrintKeys.join(",") : "none",
				download: actionMode === "download" ? "1" : "0"
			});

			const apiResponse = await fetch(`/api/teamleaderboardpdf?${queryParams.toString()}`);
			if (!apiResponse.ok) {
				const errorPayload = await apiResponse.json().catch(() => ({}));
				throw new Error(errorPayload.error || apiResponse.statusText || `PDF request failed (${apiResponse.status})`);
			}

			const pdfBlob = await apiResponse.blob();
			const pdfFilename = apiResponse.headers.get("X-PDF-Filename") || `FM-Wrestling-Leaderboard-${activeSeasonForPdf}.pdf`;
			const blobUrl = URL.createObjectURL(pdfBlob);

			if (actionMode === "preview") {
				if (previewWindow) {
					previewWindow.location.href = blobUrl;
				} else {
					const fallbackLink = document.createElement("a");
					fallbackLink.href = blobUrl;
					fallbackLink.target = "_blank";
					document.body.appendChild(fallbackLink);
					fallbackLink.click();
					fallbackLink.remove();
				}
				setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
			} else {
				const downloadLink = document.createElement("a");
				downloadLink.href = blobUrl;
				downloadLink.download = pdfFilename;
				document.body.appendChild(downloadLink);
				downloadLink.click();
				downloadLink.remove();
				setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
			}
		} catch (pdfError) {
			if (previewWindow && !previewWindow.closed) {
				previewWindow.close();
			}
			setPdfErrorMessage(pdfError.message || "Failed to generate leaderboard PDF.");
		} finally {
			setIsGeneratingPdf(false);
		}
	};

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

									<button
										type="button"
										className="leaderboard-print-btn"
										onClick={openPrintModal}
									>
										🖨️ Print / Wall PDF
									</button>
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
													? `${formatLeaderboardMetric(leaderRecord, sortMetricKey, viewModeSetting)} ${usePerMatchSort ? `${activeMetricLabel} / Match` : activeMetricLabel}` 
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
												<th className="record-group-header" colSpan={2}>Record</th>
												<th className="matches-header" onClick={() => handleColumnHeaderClick("totalMatches")}>
													Matches {sortMetricKey === "totalMatches" ? (sortDirectionDescending ? "↓" : "↑") : ""}
												</th>

												<th className="win-type-group-header" colSpan={6}>Win Type</th>

												<th className="scoring-group-header" colSpan={4}>Scoring</th>
											</tr>
											<tr className="sub-header-row">
												<th></th>
												<th></th>
												<th onClick={() => handleColumnHeaderClick("careerWins")} className={sortMetricKey === "careerWins" ? "active-sort" : ""}>
													Career {sortMetricKey === "careerWins" ? (sortDirectionDescending ? "↓" : "↑") : ""}
												</th>
												<th onClick={() => handleColumnHeaderClick("wins")} className={sortMetricKey === "wins" ? "active-sort" : ""}>
													Season {sortMetricKey === "wins" ? (sortDirectionDescending ? "↓" : "↑") : ""}
												</th>
												<th></th>

												<th onClick={() => handleColumnHeaderClick("points")} className={sortMetricKey === "points" ? "active-sort" : ""}>
													Pts {sortMetricKey === "points" ? (sortDirectionDescending ? "↓" : "↑") : ""}
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
													<td colSpan={15} className="no-leaderboard-data">No wrestler performance records found for this season.</td>
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
															<td className={`metric-cell ${sortMetricKey === "careerWins" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "careerWins", viewModeSetting)}</td>
															<td className={`metric-cell ${sortMetricKey === "wins" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "wins", viewModeSetting)}</td>
															<td className="metric-cell matches-cell">{wrestlerItem.totalMatches}</td>

															<td className={`metric-cell ${sortMetricKey === "points" ? "highlight-col" : ""}`}>{formatLeaderboardMetric(wrestlerItem, "points", viewModeSetting)}</td>
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
										<option value="careerWins">Career Record</option>
										<option value="wins">Season Record</option>
										<option value="points">Points</option>
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
														<span className="mobile-section-title">Record:</span>
														<div className="mobile-inline-stats">
															<span className={`stat-inline-item ${sortMetricKey === "careerWins" ? "highlight" : ""}`}>
																<strong className="stat-label">Career:</strong> {formatLeaderboardMetric(wrestlerItem, "careerWins", viewModeSetting)}
															</span>
															<span className={`stat-inline-item ${sortMetricKey === "wins" ? "highlight" : ""}`}>
																<strong className="stat-label">Season:</strong> {formatLeaderboardMetric(wrestlerItem, "wins", viewModeSetting)}
															</span>
														</div>
													</div>

													<div className="mobile-metric-section">
														<span className="mobile-section-title">Win Type:</span>
														<div className="mobile-inline-stats">
															<span className={`stat-inline-item ${sortMetricKey === "points" ? "highlight" : ""}`}>
																<strong className="stat-label">Pts:</strong> {formatLeaderboardMetric(wrestlerItem, "points", viewModeSetting)}
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
					</div>
				)}
			</div>

			{isPrintModalOpen && (
				<div className="modal-overlay" onClick={() => !isGeneratingPdf && setIsPrintModalOpen(false)}>
					<div className="modal-card" onClick={(clickEvent) => clickEvent.stopPropagation()}>
						<header className="modal-header">
							<h3 className="modal-title">Print Wall Leaderboard PDF</h3>
							<button
								type="button"
								className="modal-close"
								onClick={() => setIsPrintModalOpen(false)}
								disabled={isGeneratingPdf}
								aria-label="Close"
							>
								&times;
							</button>
						</header>

						<div className="modal-body">
							<p className="modal-subtitle">
								Generates US Letter Landscape wall sheets for the <strong>{activeSeasonForPdf}</strong> season:
								a 12-Stat Top 4 Leaders Board{includeFullRosterTables ? " + Full Roster Reference Table" : ""} for each selected division.
							</p>

							<div className="form-group">
								<div className="pdf-preset-row">
									<label className="form-label" style={{ marginBottom: 0 }}>Select Divisions</label>
									<div className="pdf-preset-actions">
										<button
											type="button"
											className="btn-secondary btn-sm"
											onClick={() => setSelectedPrintDivisions(getDefaultPrintDivisions())}
										>
											Current Only
										</button>
										<button
											type="button"
											className="btn-secondary btn-sm"
											onClick={() => setSelectedPrintDivisions({ varsity: true, jv: true, ms: true })}
										>
											Select All
										</button>
									</div>
								</div>

								<div className="modal-section-box pdf-divisions-list">
									{PRINT_DIVISION_GROUPS.map((group) => {
										const isChecked = Boolean(selectedPrintDivisions[group.key]);
										const dataset = datasetByDivisionKey[group.key];
										const wrestlerCount = dataset ? dataset.records.length : 0;

										return (
											<label
												key={group.key}
												className={`pdf-division-option ${isChecked ? "checked" : ""}`}
											>
												<span className="checkbox-label">
													<input
														type="checkbox"
														checked={isChecked}
														onChange={() => {
															setSelectedPrintDivisions((prev) => ({
																...prev,
																[group.key]: !prev[group.key]
															}));
															setPdfErrorMessage("");
														}}
													/>
													<span>{group.label}</span>
												</span>
												<span className={`pdf-division-option-count ${wrestlerCount === 0 ? "empty" : ""}`}>
													{wrestlerCount > 0 ? `${wrestlerCount} active wrestlers` : "0 wrestlers (no data)"}
												</span>
											</label>
										);
									})}
								</div>
							</div>

							<div className="form-group">
								<label className="form-label">Sheet Options</label>
								<div className="modal-section-box">
									<label className="checkbox-label pdf-table-toggle-label">
										<input
											type="checkbox"
											checked={includeFullRosterTables}
											onChange={(changeEvent) => setIncludeFullRosterTables(changeEvent.target.checked)}
										/>
										<span>
											<strong>Include Full Roster Table(s)</strong> (adds Page 2 per division with Top-3 highlights)
										</span>
									</label>
								</div>
							</div>

							<div className={`pdf-page-summary ${estimatedPdfPages > 5 ? "over-cap" : ""}`}>
								<span>
									{estimatedPdfPages > 5
										? "Over 5 pages — uncheck a division or Full Roster Table to trim."
										: "Formatted for B&W or color wall printing"}
								</span>
								<span className="pdf-page-badge">
									Estimated: {estimatedPdfPages} {estimatedPdfPages === 1 ? "page" : "pages"}
								</span>
							</div>

							{pdfErrorMessage && (
								<div className="pdf-error-banner">{pdfErrorMessage}</div>
							)}
						</div>

						<footer className="modal-footer">
							<button
								type="button"
								className="btn-secondary"
								onClick={() => setIsPrintModalOpen(false)}
								disabled={isGeneratingPdf}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn-secondary"
								disabled={isGeneratingPdf || estimatedPdfPages === 0}
								onClick={() => handleLeaderboardPdfAction("download")}
							>
								{isGeneratingPdf ? "Generating..." : "⬇️ Download PDF"}
							</button>
							<button
								type="button"
								className="btn-primary"
								disabled={isGeneratingPdf || estimatedPdfPages === 0}
								onClick={() => handleLeaderboardPdfAction("preview")}
							>
								{isGeneratingPdf ? "Generating..." : "🖨️ Preview / Print PDF"}
							</button>
						</footer>
					</div>
				</div>
			)}
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamLeaderboard />);
