import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/tournamentsummary.css";

const TournamentSummary = () => {
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [event, setEvent] = useState(null);
	const [hoveredNode, setHoveredNode] = useState(null);

	// Read event ID from query parameters
	const queryParams = new URLSearchParams(window.location.search);
	const eventId = queryParams.get("id");

	useEffect(() => {
		if (eventId) {
			fetch(`/api/eventdetailsload?id=${eventId}`)
				.then(response => {
					if (response.ok) {
						return response.json();
					} else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setEvent(data.event);
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
					setIsLoading(false);
				});
		} else {
			setIsLoading(false);
		}
	}, [eventId]);

	if (isLoading) {
		return (
			<div className="page">
				<div className="pageLoading">
					<img src="/media/wrestlingloading.gif" alt="Loading..." />
				</div>
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
				<div className="ts-container">
					<div className="ts-empty-state">
						<h3>No event details could be found.</h3>
						<a href="/portal/schedule.html">Return to Schedule</a>
					</div>
				</div>
			</div>
		);
	}

	// 1. Process stats & filter lists
	const stats = event.summaryStats || { totalMatches: 0, averageGlicko: 0, upsetPercentage: 0, bonusPointPercentage: 0 };
	const matches = event.matches || [];

	// 2. Component B: Scatter Plot data (Upset Radar)
	const upsets = matches.filter(m => m.isUpset && m.winner && m.loser && typeof m.winner.rating === 'number' && typeof m.loser.rating === 'number');
	
	const scatterWidth = 500;
	const scatterHeight = 320;
	const scatterMargin = { top: 25, right: 25, bottom: 45, left: 55 };

	const opponentRatings = upsets.map(m => m.loser.rating);
	const differentials = upsets.map(m => m.loser.rating - m.winner.rating);
	const minX = opponentRatings.length > 0 ? Math.min(...opponentRatings) - 30 : 1000;
	const maxX = opponentRatings.length > 0 ? Math.max(...opponentRatings) + 30 : 2000;
	const minY = differentials.length > 0 ? Math.min(...differentials) - 30 : -200;
	const maxY = differentials.length > 0 ? Math.max(...differentials) + 30 : 500;

	// 3. Component C: Box & Whisker Data grouping
	const ratingsByWeight = {};
	matches.forEach(m => {
		const wc = m.weightClass;
		if (wc) {
			if (!ratingsByWeight[wc]) ratingsByWeight[wc] = [];
			if (m.winner && typeof m.winner.rating === 'number' && m.winner.rating > 0) {
				ratingsByWeight[wc].push(m.winner.rating);
			}
			if (m.loser && typeof m.loser.rating === 'number' && m.loser.rating > 0) {
				ratingsByWeight[wc].push(m.loser.rating);
			}
		}
	});

	const sortedWeightClasses = Object.keys(ratingsByWeight).sort((a, b) => {
		const numA = parseInt(a.replace(/\D/g, "")) || 0;
		const numB = parseInt(b.replace(/\D/g, "")) || 0;
		return numA - numB;
	});

	// Global rating ranges for Box & Whisker scaling consistency
	const allWrestlerRatings = Object.values(ratingsByWeight).flat();
	const globalMinRating = allWrestlerRatings.length > 0 ? Math.min(...allWrestlerRatings) - 50 : 1000;
	const globalMaxRating = allWrestlerRatings.length > 0 ? Math.max(...allWrestlerRatings) + 50 : 2000;

	// Helper inline percentile computation (to keep logic single-component and avoid single-use functions)
	const boxPlotRows = sortedWeightClasses.map(wc => {
		const sorted = [...ratingsByWeight[wc]].sort((a, b) => a - b);
		const minVal = sorted[0] || 0;
		const maxVal = sorted[sorted.length - 1] || 0;
		
		const getPercentile = (arr, p) => {
			if (arr.length === 0) return 0;
			const index = (arr.length - 1) * p;
			const lower = Math.floor(index);
			const upper = Math.ceil(index);
			const weight = index - lower;
			return arr[lower] * (1 - weight) + arr[upper] * weight;
		};

		return {
			wc,
			min: minVal,
			q1: getPercentile(sorted, 0.25),
			median: getPercentile(sorted, 0.50),
			q3: getPercentile(sorted, 0.75),
			max: maxVal,
			count: sorted.length
		};
	}).filter(row => row.count > 0);

	// 4. Component D: Team Weight Class Matrix Win Tally
	const teamWins = {};
	const matrixWeightClassesSet = new Set();
	matches.forEach(m => {
		const team = m.winner?.team;
		const wc = m.weightClass;
		if (team && team.trim().length > 0 && wc) {
			matrixWeightClassesSet.add(wc);
			if (!teamWins[team]) {
				teamWins[team] = {};
			}
			if (!teamWins[team][wc]) {
				teamWins[team][wc] = 0;
			}
			teamWins[team][wc]++;
		}
	});

	const matrixWeightClasses = Array.from(matrixWeightClassesSet).sort((a, b) => {
		const numA = parseInt(a.replace(/\D/g, "")) || 0;
		const numB = parseInt(b.replace(/\D/g, "")) || 0;
		return numA - numB;
	});

	const sortedTeams = Object.keys(teamWins).sort((teamA, teamB) => {
		const sumA = Object.values(teamWins[teamA]).reduce((sum, val) => sum + val, 0);
		const sumB = Object.values(teamWins[teamB]).reduce((sum, val) => sum + val, 0);
		return sumB - sumA; // sort descending by total wins
	});

	let maxWinsInCell = 1;
	Object.values(teamWins).forEach(wcs => {
		Object.values(wcs).forEach(val => {
			if (val > maxWinsInCell) {
				maxWinsInCell = val;
			}
		});
	});

	// Date strings
	const eventDateStr = event.date ? new Date(event.date).toLocaleDateString() : "";
	const eventEndDateStr = event.endDate ? new Date(event.endDate).toLocaleDateString() : "";
	const dateRangeDisplay = eventDateStr === eventEndDateStr || !eventEndDateStr ? eventDateStr : `${eventDateStr} - ${eventEndDateStr}`;

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUser} />

			<div className={`ts-container ${pageActive ? "active" : ""}`}>
				{/* Back link */}
				<a className="ts-back-link" href="/portal/schedule.html">
					&larr; Back to Schedule
				</a>

				{/* Header */}
				<header className="ts-header">
					<h1 className="ts-title">{event.name}</h1>
					<p className="ts-subtitle">
						📍 {event.location || "Location TBD"} &bull; 📅 {dateRangeDisplay}
					</p>
				</header>

				{/* Section A: Executive KPI Summary Cards */}
				<section className="ts-kpis">
					<div className="ts-card">
						<span className="ts-card-label">Total Matches</span>
						<span className="ts-card-value">{stats.totalMatches}</span>
					</div>
					<div className="ts-card">
						<span className="ts-card-label">Average Glicko</span>
						<span className="ts-card-value">
							{stats.averageGlicko ? stats.averageGlicko.toFixed(1) : "N/A"}
						</span>
					</div>
					<div className="ts-card highlight">
						<span className="ts-card-label">Upset Percentage</span>
						<span className="ts-card-value">
							{stats.upsetPercentage ? `${stats.upsetPercentage.toFixed(1)}%` : "0.0%"}
						</span>
					</div>
					<div className="ts-card highlight">
						<span className="ts-card-label">Bonus Point %</span>
						<span className="ts-card-value">
							{stats.bonusPointPercentage ? `${stats.bonusPointPercentage.toFixed(1)}%` : "0.0%"}
						</span>
					</div>
				</section>

				{/* Sections Layout Grid */}
				<div className="ts-sections-grid">
					{/* Section B: The Upset Radar (Scatter Plot) */}
					<section className="ts-section">
						<h2 className="ts-section-title">The Upset Radar</h2>
						{upsets.length === 0 ? (
							<div className="ts-empty-state">
								No upset matches recorded for this event.
							</div>
						) : (
							<div className="ts-scatter-container">
								<svg
									viewBox={`0 0 ${scatterWidth} ${scatterHeight}`}
									className="ts-scatter-svg"
								>
									{/* Horizontal axes grid lines */}
									{[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
										const yVal = minY + ratio * (maxY - minY);
										const scaledY = scatterHeight - scatterMargin.bottom - ratio * (scatterHeight - scatterMargin.top - scatterMargin.bottom);
										return (
											<g key={`grid-y-${idx}`}>
												<line
													x1={scatterMargin.left}
													y1={scaledY}
													x2={scatterWidth - scatterMargin.right}
													y2={scaledY}
													stroke="lightgray"
													strokeDasharray="3 3"
												/>
												<text
													x={scatterMargin.left - 10}
													y={scaledY + 4}
													textAnchor="end"
													fontSize="12"
													fill="#444655"
												>
													{yVal.toFixed(0)}
												</text>
											</g>
										);
									})}

									{/* Vertical axes grid lines */}
									{[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
										const xVal = minX + ratio * (maxX - minX);
										const scaledX = scatterMargin.left + ratio * (scatterWidth - scatterMargin.left - scatterMargin.right);
										return (
											<g key={`grid-x-${idx}`}>
												<line
													x1={scaledX}
													y1={scatterMargin.top}
													x2={scaledX}
													y2={scatterHeight - scatterMargin.bottom}
													stroke="lightgray"
													strokeDasharray="3 3"
												/>
												<text
													x={scaledX}
													y={scatterHeight - scatterMargin.bottom + 16}
													textAnchor="middle"
													fontSize="12"
													fill="#444655"
												>
													{xVal.toFixed(0)}
												</text>
											</g>
										);
									})}

									{/* Axes Lines */}
									<line
										x1={scatterMargin.left}
										y1={scatterHeight - scatterMargin.bottom}
										x2={scatterWidth - scatterMargin.right}
										y2={scatterHeight - scatterMargin.bottom}
										stroke="black"
										strokeWidth="1"
									/>
									<line
										x1={scatterMargin.left}
										y1={scatterMargin.top}
										x2={scatterMargin.left}
										y2={scatterHeight - scatterMargin.bottom}
										stroke="black"
										strokeWidth="1"
									/>

									{/* Y Axis Title */}
									<text
										x="12"
										y={scatterHeight / 2}
										transform={`rotate(-90 12 ${scatterHeight / 2})`}
										textAnchor="middle"
										fontSize="14"
										fill="#191c1d"
									>
										Upset Differential
									</text>

									{/* X Axis Title */}
									<text
										x={scatterWidth / 2 + 20}
										y={scatterHeight - 8}
										textAnchor="middle"
										fontSize="14"
										fill="#191c1d"
									>
										Opponent Pre-Event Rating
									</text>

									{/* Scatter nodes */}
									{upsets.map((match, idx) => {
										const diff = match.loser.rating - match.winner.rating;
										const scaleXVal = scatterMargin.left + ((match.loser.rating - minX) / (maxX - minX)) * (scatterWidth - scatterMargin.left - scatterMargin.right);
										const scaleYVal = (scatterHeight - scatterMargin.bottom) - ((diff - minY) / (maxY - minY)) * (scatterHeight - scatterMargin.top - scatterMargin.bottom);
										const nodeRadius = Math.max(4, Math.min(18, (match.winner.deviation || 50) / 10));

										return (
											<circle
												key={idx}
												cx={scaleXVal}
												cy={scaleYVal}
												r={nodeRadius}
												fill="#3246e5"
												fillOpacity="0.6"
												stroke="#3246e5"
												strokeWidth="1"
												style={{ cursor: "pointer" }}
												onMouseEnter={(e) => {
													const rect = e.target.getBoundingClientRect();
													const parentRect = e.target.parentNode.parentNode.getBoundingClientRect();
													setHoveredNode({
														match,
														diff,
														x: rect.left - parentRect.left + nodeRadius,
														y: rect.top - parentRect.top - 65
													});
												}}
												onMouseLeave={() => setHoveredNode(null)}
											>
												<title>
													{`Winner: ${match.winner.name} (${match.winner.team || "N/A"}) Glicko: ${match.winner.rating.toFixed(0)}
Loser: ${match.loser.name} (${match.loser.team || "N/A"}) Glicko: ${match.loser.rating.toFixed(0)}
Win Type: ${match.winType || "N/A"} (Diff: ${diff.toFixed(0)})`}
												</title>
											</circle>
										);
									})}
								</svg>

								{/* Tooltip Overlay */}
								{hoveredNode && (
									<div
										className="ts-tooltip"
										style={{
											left: `${hoveredNode.x}px`,
											top: `${hoveredNode.y}px`,
											transform: "translateX(-50%)"
										}}
									>
										<p>
										🏆 Winner: {hoveredNode.match.winner.name}{" "}
										{hoveredNode.match.winner.team ? `(${hoveredNode.match.winner.team})` : ""}{" "}
										[{hoveredNode.match.winner.rating.toFixed(0)}]
										</p>
										<p>
										👤 Opponent: {hoveredNode.match.loser.name}{" "}
										{hoveredNode.match.loser.team ? `(${hoveredNode.match.loser.team})` : ""}{" "}
										[{hoveredNode.match.loser.rating.toFixed(0)}]
										</p>
										<p>
										⚡ Result: {hoveredNode.match.winType}
										</p>
									</div>
								)}
							</div>
						)}
					</section>

					{/* Section C: Weight Class Heatmap (Box and Whisker) */}
					<section className="ts-section">
						<h2 className="ts-section-title">Weight Spread Heatmap</h2>
						{boxPlotRows.length === 0 ? (
							<div className="ts-empty-state">
								No rated match details to build spread heatmap.
							</div>
						) : (
							<div className="ts-boxplot-list">
								{boxPlotRows.map((row, idx) => {
									const scaleBoxX = (val) => ((val - globalMinRating) / (globalMaxRating - globalMinRating)) * 240;
									const minPct = scaleBoxX(row.min);
									const maxPct = scaleBoxX(row.max);
									const q1Pct = scaleBoxX(row.q1);
									const medianPct = scaleBoxX(row.median);
									const q3Pct = scaleBoxX(row.q3);

									return (
										<div className="ts-boxplot-row" key={idx}>
											<span>{row.wc} lbs</span>
											<svg
												width="240"
												height="35"
												viewBox="0 0 240 35"
												className="ts-boxplot-chart"
											>
												{/* Whisker Line */}
												<line
													x1={minPct}
													y1="18"
													x2={maxPct}
													y2="18"
													stroke="#757687"
													strokeWidth="1"
												/>
												{/* Left Whisker Tik */}
												<line
													x1={minPct}
													y1="11"
													x2={minPct}
													y2="25"
													stroke="#757687"
													strokeWidth="1"
												/>
												{/* Right Whisker Tik */}
												<line
													x1={maxPct}
													y1="11"
													x2={maxPct}
													y2="25"
													stroke="#757687"
													strokeWidth="1"
												/>
												{/* Box */}
												<rect
													x={q1Pct}
													y="14"
													width={Math.max(2, q3Pct - q1Pct)}
													height="8"
													fill="#dfe0ff"
													stroke="#3246e5"
													strokeWidth="1"
													rx="2"
												/>
												{/* Median Line */}
												<line
													x1={medianPct}
													y1="12"
													x2={medianPct}
													y2="24"
													stroke="#fd8b00"
													strokeWidth="1.5"
												/>
												{/* Median Text Overlay */}
												<text
													x={medianPct}
													y="10"
													textAnchor="middle"
													fontSize="10"
												>
													{row.median.toFixed(0)}
												</text>
											</svg>
										</div>
									);
								})}
							</div>
						)}
					</section>

					{/* Section D: Team vs. Weight Class Wins Matrix */}
					<section className="ts-section ts-section-full">
						<h2 className="ts-section-title">Team vs. Weight Class Wins</h2>
						{sortedTeams.length === 0 ? (
							<div className="ts-empty-state">
								No team data available for this tournament.
							</div>
						) : (
							<div className="ts-matrix-scroll-wrapper">
								<table className="ts-matrix-table">
									<thead>
										<tr>
											<th className="ts-matrix-team-cell">Team Name</th>
											{matrixWeightClasses.map((wc, idx) => (
												<th key={idx}>{wc}</th>
											))}
										</tr>
									</thead>
									<tbody>
										{sortedTeams.map((team, tIdx) => (
											<tr key={tIdx}>
												<td className="ts-matrix-team-cell">{team}</td>
												{matrixWeightClasses.map((wc, wIdx) => {
													const wins = teamWins[team][wc] || 0;
													if (wins > 0) {
														const ratio = wins / maxWinsInCell;
														const opacity = 0.2 + 0.8 * ratio;
														return (
															<td
																key={wIdx}
																className="ts-matrix-value-cell"
																style={{
																	backgroundColor: `rgba(50, 70, 229, ${opacity})`
																}}
															>
																{wins}
															</td>
														);
													} else {
														return (
															<td
																key={wIdx}
																className="ts-matrix-value-cell empty"
															>
																-
															</td>
														);
													}
												})}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TournamentSummary />);
export default TournamentSummary;
