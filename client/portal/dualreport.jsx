import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/dualreport.css";

const getSeasonOptions = (dateObject) => {
	const currentYear = dateObject.getFullYear();
	const currentMonth = dateObject.getMonth(); // 0-indexed, so 8 is September
	let startYear;
	if (currentMonth >= 8) { // Sept - Dec
		startYear = currentYear;
	} else { // Jan - Aug
		startYear = currentYear - 1;
	}
	
	const formatSeason = (yearValue) => {
		const yearShortString = yearValue.toString().slice(-2);
		const nextYearShortString = (yearValue + 1).toString().slice(-2);
		return {
			name: `${yearShortString}-${nextYearShortString}`
		};
	};

	// Return options for current, previous, and upcoming seasons
	return [
		formatSeason(startYear + 1),
		formatSeason(startYear),
		formatSeason(startYear - 1),
		formatSeason(startYear - 2)
	];
};

const calculateDualScore = (dualItem) => {
	let teamScore = 0;
	let opponentScore = 0;

	(dualItem.matches || []).forEach(matchItem => {
		const winType = (matchItem.winType || "").toUpperCase();
		let matchPoints = 0;
		if (winType === "DEC") matchPoints = 3;
		else if (winType === "MD") matchPoints = 4;
		else if (winType === "TF") matchPoints = 5;
		else if (["F", "FF", "FOR", "DQ", "DEF"].includes(winType)) matchPoints = 6;
		else matchPoints = 3; // fallback default to decision points

		const homeWrestler = (matchItem.wrestlers || []).find(wrestlerItem => wrestlerItem.team.toLowerCase() === "fort mill");
		const visitorWrestler = (matchItem.wrestlers || []).find(wrestlerItem => wrestlerItem.team.toLowerCase() !== "fort mill");

		if (homeWrestler && homeWrestler.isWinner) {
			teamScore += matchPoints;
		} else if (visitorWrestler && visitorWrestler.isWinner) {
			opponentScore += matchPoints;
		}
	});

	return { teamScore, opponentScore };
};

const DivergingBarChart = ({ dualsList }) => {
	const completedDuals = dualsList.filter(dualItem => dualItem.matches && dualItem.matches.length > 0);
	
	if (completedDuals.length === 0) {
		return <div className="no-chart-data">No completed dual meets recorded for this season.</div>;
	}

	const dualScoresList = completedDuals.map(dualItem => {
		const scoreResult = calculateDualScore(dualItem);
		return {
			opponent: dualItem.opponent,
			teamScore: scoreResult.teamScore,
			opponentScore: scoreResult.opponentScore,
			dateObject: new Date(dualItem.dualDate)
		};
	}).sort((firstScore, secondScore) => firstScore.dateObject - secondScore.dateObject);

	let maxPointsValue = 1;
	dualScoresList.forEach(scoreItem => {
		if (scoreItem.teamScore > maxPointsValue) maxPointsValue = scoreItem.teamScore;
		if (scoreItem.opponentScore > maxPointsValue) maxPointsValue = scoreItem.opponentScore;
	});

	const chartWidth = 600;
	const rowHeight = 52;
	const chartHeight = dualScoresList.length * rowHeight + 40;
	const centerXCoordinate = chartWidth / 2;
	const widthScalingFactor = (centerXCoordinate - 80) / maxPointsValue;

	return (
		<div className="diverging-chart-wrapper">
			<svg viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
				<line x1={centerXCoordinate} y1={25} x2={centerXCoordinate} y2={chartHeight - 15} stroke="var(--outline)" strokeWidth={1.5} strokeDasharray="3,3" />
				
				<text x={centerXCoordinate - 15} y={18} textAnchor="end" fontFamily="var(--font-headers)" fontSize="12px" fontWeight="700" fill="var(--secondary)">POINTS AGAINST</text>
				<text x={centerXCoordinate + 15} y={18} textAnchor="start" fontFamily="var(--font-headers)" fontSize="12px" fontWeight="700" fill="var(--primary)">POINTS FOR</text>

				{dualScoresList.map((scoreItem, indexVal) => {
					const yCoordinate = 45 + indexVal * rowHeight;
					return (
						<g key={indexVal} className="chart-row">
							<text 
								x={centerXCoordinate} 
								y={yCoordinate - 6} 
								textAnchor="middle" 
								fontFamily="var(--font-body)" 
								fontSize="13px" 
								fontWeight="600" 
								fill="var(--on-surface)"
							>
								{scoreItem.opponent}
							</text>

							<rect 
								x={centerXCoordinate - scoreItem.opponentScore * widthScalingFactor} 
								y={yCoordinate + 2} 
								width={scoreItem.opponentScore * widthScalingFactor} 
								height={20} 
								fill="var(--secondary)" 
								rx={2} 
							/>
							<text 
								x={centerXCoordinate - scoreItem.opponentScore * widthScalingFactor - 12} 
								y={yCoordinate + 17} 
								textAnchor="end" 
								fontFamily="var(--font-headers)" 
								fontSize="13px" 
								fontWeight="700"
								fill="var(--secondary)"
							>
								{scoreItem.opponentScore}
							</text>

							<rect 
								x={centerXCoordinate} 
								y={yCoordinate + 2} 
								width={scoreItem.teamScore * widthScalingFactor} 
								height={20} 
								fill="var(--primary)" 
								rx={2} 
							/>
							<text 
								x={centerXCoordinate + scoreItem.teamScore * widthScalingFactor + 12} 
								y={yCoordinate + 17} 
								textAnchor="start" 
								fontFamily="var(--font-headers)" 
								fontSize="13px" 
								fontWeight="700"
								fill="var(--primary)"
							>
								{scoreItem.teamScore}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
};

const ScatterPlot = ({ dualsList }) => {
	const completedDuals = dualsList.filter(dualItem => dualItem.matches && dualItem.matches.length > 0);
	const [hoveredIndex, setHoveredIndex] = useState(null);

	if (completedDuals.length === 0) {
		return <div className="no-chart-data">No completed dual meets recorded for this season.</div>;
	}

	const plotDataPoints = completedDuals.map(dualItem => {
		const scoreResult = calculateDualScore(dualItem);
		return {
			opponent: dualItem.opponent,
			teamScore: scoreResult.teamScore,
			opponentScore: scoreResult.opponentScore
		};
	});

	let maxPointsBoundary = 20;
	plotDataPoints.forEach(pointItem => {
		if (pointItem.teamScore > maxPointsBoundary) maxPointsBoundary = pointItem.teamScore;
		if (pointItem.opponentScore > maxPointsBoundary) maxPointsBoundary = pointItem.opponentScore;
	});
	maxPointsBoundary = Math.ceil(maxPointsBoundary / 10) * 10;

	const canvasWidth = 500;
	const canvasHeight = 380;
	const paddingConfig = { top: 30, right: 30, bottom: 50, left: 60 };

	const chartPlotWidth = canvasWidth - paddingConfig.left - paddingConfig.right;
	const chartPlotHeight = canvasHeight - paddingConfig.top - paddingConfig.bottom;

	const convertToXCoordinate = (value) => paddingConfig.left + (value / maxPointsBoundary) * chartPlotWidth;
	const convertToYCoordinate = (value) => paddingConfig.top + (1 - value / maxPointsBoundary) * chartPlotHeight;

	return (
		<div className="scatter-plot-wrapper" style={{ position: "relative" }}>
			<svg viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
				{[...Array(6)].map((_, indexVal) => {
					const gridValue = (maxPointsBoundary / 5) * indexVal;
					const xCoordinate = convertToXCoordinate(gridValue);
					const yCoordinate = convertToYCoordinate(gridValue);
					return (
						<g key={indexVal}>
							<line x1={paddingConfig.left} y1={yCoordinate} x2={canvasWidth - paddingConfig.right} y2={yCoordinate} stroke="var(--outline)" strokeWidth={0.5} strokeDasharray="2,2" />
							<line x1={xCoordinate} y1={paddingConfig.top} x2={xCoordinate} y2={canvasHeight - paddingConfig.bottom} stroke="var(--outline)" strokeWidth={0.5} strokeDasharray="2,2" />

							<text x={paddingConfig.left - 8} y={yCoordinate + 4} textAnchor="end" fontFamily="var(--font-body)" fontSize="11px" fill="var(--on-surface-variant)">{gridValue}</text>
							<text x={xCoordinate} y={canvasHeight - paddingConfig.bottom + 16} textAnchor="middle" fontFamily="var(--font-body)" fontSize="11px" fill="var(--on-surface-variant)">{gridValue}</text>
						</g>
					);
				})}

				<text 
					x={18} 
					y={paddingConfig.top + chartPlotHeight / 2} 
					transform={`rotate(-90, 18, ${paddingConfig.top + chartPlotHeight / 2})`}
					textAnchor="middle" 
					fontFamily="var(--font-headers)" 
					fontSize="12px" 
					fontWeight="700"
					fill="var(--on-surface-variant)"
				>
					POINTS FOR (FORT MILL)
				</text>

				<text 
					x={paddingConfig.left + chartPlotWidth / 2} 
					y={canvasHeight - 12} 
					textAnchor="middle" 
					fontFamily="var(--font-headers)" 
					fontSize="12px" 
					fontWeight="700"
					fill="var(--on-surface-variant)"
				>
					OPPONENT POINTS AGAINST
				</text>

				<line 
					x1={convertToXCoordinate(0)} 
					y1={convertToYCoordinate(0)} 
					x2={convertToXCoordinate(maxPointsBoundary)} 
					y2={convertToYCoordinate(maxPointsBoundary)} 
					stroke="var(--outline-variant)" 
					strokeWidth={1.5} 
					strokeDasharray="4,4" 
				/>

				<line x1={paddingConfig.left} y1={canvasHeight - paddingConfig.bottom} x2={canvasWidth - paddingConfig.right} y2={canvasHeight - paddingConfig.bottom} stroke="var(--on-surface)" strokeWidth={1.5} />
				<line x1={paddingConfig.left} y1={paddingConfig.top} x2={paddingConfig.left} y2={canvasHeight - paddingConfig.bottom} stroke="var(--on-surface)" strokeWidth={1.5} />

				{plotDataPoints.map((pointItem, indexVal) => {
					const cxValue = convertToXCoordinate(pointItem.opponentScore);
					const cyValue = convertToYCoordinate(pointItem.teamScore);
					const isPointHovered = hoveredIndex === indexVal;

					return (
						<circle 
							key={indexVal} 
							cx={cxValue} 
							cy={cyValue} 
							r={isPointHovered ? 11 : 7} 
							fill="var(--primary)" 
							stroke="var(--on-primary)" 
							strokeWidth={isPointHovered ? 2.5 : 1.5}
							style={{ cursor: "pointer", transition: "all 0.15s ease" }}
							onMouseEnter={() => setHoveredIndex(indexVal)}
							onMouseLeave={() => setHoveredIndex(null)}
							onTouchStart={() => setHoveredIndex(indexVal)}
						/>
					);
				})}
			</svg>

			{hoveredIndex !== null && (
				<div 
					className="scatter-plot-tooltip"
					style={{
						position: "absolute",
						top: `${convertToYCoordinate(plotDataPoints[hoveredIndex].teamScore) - 48}px`,
						left: `${convertToXCoordinate(plotDataPoints[hoveredIndex].opponentScore) + 12}px`,
						backgroundColor: "var(--inverse-surface)",
						color: "var(--inverse-on-surface)",
						padding: "6px 10px",
						borderRadius: "var(--rounded-sm)",
						fontSize: "11px",
						fontFamily: "var(--font-body)",
						boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
						zIndex: 5,
						pointerEvents: "none"
					}}
				>
					<strong>{plotDataPoints[hoveredIndex].opponent}</strong>
					<br />
					Fort Mill: {plotDataPoints[hoveredIndex].teamScore}
					<br />
					Opponent: {plotDataPoints[hoveredIndex].opponentScore}
				</div>
			)}
		</div>
	);
};

const MatchDetailMatrix = ({ dualsList }) => {
	const sortedDuals = [...dualsList].sort((firstDual, secondDual) => new Date(firstDual.dualDate) - new Date(secondDual.dualDate));
	const completedDuals = sortedDuals.filter(dualItem => dualItem.matches && dualItem.matches.length > 0);
	const mostRecentCompletedId = completedDuals.length > 0 ? (completedDuals[completedDuals.length - 1].id || completedDuals[completedDuals.length - 1]._id) : null;

	return (
		<div className="matrix-table-container">
			<div className="matrix-table-header">
				<div>DATE</div>
				<div>OPPONENT</div>
				<div>RESULT</div>
				<div style={{ textAlign: "right" }}>SCORE</div>
				<div style={{ textAlign: "right" }}>DIFF</div>
			</div>
			<div className="matrix-table-body">
				{sortedDuals.map((dualItem, indexVal) => {
					const isCompleted = dualItem.matches && dualItem.matches.length > 0;
					const scoreResult = isCompleted ? calculateDualScore(dualItem) : null;
					
					let resultValueText = "-";
					if (isCompleted) {
						if (scoreResult.teamScore > scoreResult.opponentScore) resultValueText = "W";
						else if (scoreResult.teamScore < scoreResult.opponentScore) resultValueText = "L";
						else resultValueText = "T";
					}

					const rawDate = new Date(dualItem.dualDate);
					const formattedDate = `${String(rawDate.getMonth() + 1).padStart(2, "0")}/${String(rawDate.getDate()).padStart(2, "0")}/${rawDate.getFullYear()}`;

					const scoreDisplay = isCompleted ? `${scoreResult.teamScore}-${scoreResult.opponentScore}` : "-";
					
					let diffDisplay = "-";
					if (isCompleted) {
						const difference = scoreResult.teamScore - scoreResult.opponentScore;
						diffDisplay = (difference >= 0 ? "+" : "") + difference;
					}

					const isMostRecentCompleted = mostRecentCompletedId && (dualItem.id === mostRecentCompletedId || dualItem._id === mostRecentCompletedId);

					return (
						<div 
							key={dualItem.id || indexVal} 
							className={`matrix-table-row ${isMostRecentCompleted ? "active-state-dual" : ""}`}
						>
							<div>{formattedDate}</div>
							<div className="opponent-name-cell">{dualItem.opponent}</div>
							<div className={`result-badge-cell ${resultValueText.toLowerCase()}`}>{resultValueText}</div>
							<div className="score-cell-val" style={{ textAlign: "right" }}>{scoreDisplay}</div>
							<div className={`score-cell-val ${isCompleted ? (scoreResult.teamScore >= scoreResult.opponentScore ? "positive-val" : "negative-val") : ""}`} style={{ textAlign: "right" }}>
								{diffDisplay}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

const DualReport = () => {
	const seasonOptions = getSeasonOptions(new Date());
	
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [duals, setDuals] = useState([]);
	const [seasonName, setSeasonName] = useState("");
	const [hasPreviousSeasonData, setHasPreviousSeasonData] = useState(false);
	const [selectedSeason, setSelectedSeason] = useState(seasonOptions[1].name);

	useEffect(() => {
		setIsLoading(true);
		
		const fetchUrl = `/api/dualreportload?season=${selectedSeason}`;
		
		fetch(fetchUrl)
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				} else {
					throw Error(apiResponse.statusText);
				}
			})
			.then(responseData => {
				setLoggedInUser(responseData.loggedInUser);
				setDuals(responseData.duals || []);
				setSeasonName(responseData.seasonName || selectedSeason);
				setHasPreviousSeasonData(responseData.hasPreviousSeasonData || false);
				setPageActive(true);
				setIsLoading(false);
			})
			.catch(fetchError => {
				console.warn("Error loading dual report details:", fetchError);
				setIsLoading(false);
			});
	}, [selectedSeason]);

	// Calculate season KPIs
	const completedDuals = duals.filter(dualItem => dualItem.matches && dualItem.matches.length > 0);
	let totalWinsCount = 0;
	let totalLossesCount = 0;
	let totalPointsForSum = 0;
	let totalPointsAgainstSum = 0;

	completedDuals.forEach(dualItem => {
		const scoreResult = calculateDualScore(dualItem);
		totalPointsForSum += scoreResult.teamScore;
		totalPointsAgainstSum += scoreResult.opponentScore;

		if (scoreResult.teamScore > scoreResult.opponentScore) {
			totalWinsCount += 1;
		} else if (scoreResult.teamScore < scoreResult.opponentScore) {
			totalLossesCount += 1;
		}
	});

	const totalMeetsCount = totalWinsCount + totalLossesCount;
	const winPercentageRatio = totalMeetsCount > 0 ? (totalWinsCount / totalMeetsCount) * 100 : 0;
	const netPointsDifferenceVal = totalPointsForSum - totalPointsAgainstSum;

	// Calculate next dual meet (date in the future relative to today, or just not completed yet)
	const todayDate = new Date();
	const upcomingDualsList = duals.filter(dualItem => {
		const isCompleted = dualItem.matches && dualItem.matches.length > 0;
		return !isCompleted && new Date(dualItem.dualDate) >= todayDate;
	}).sort((firstDual, secondDual) => new Date(firstDual.dualDate) - new Date(secondDual.dualDate));
	
	const nextUpcomingDual = upcomingDualsList.length > 0 ? upcomingDualsList[0] : null;

	// Resolve baseline marker
	const seasonStartYearShort = seasonName ? parseInt(seasonName.split("-")[0], 10) : 25;
	const startYearFullValue = 2000 + seasonStartYearShort;
	
	let baselinePercentage = 84;
	if (startYearFullValue === 2025) {
		baselinePercentage = 86;
	} else if (startYearFullValue === 2026) {
		baselinePercentage = 84;
	}

	const variancePercentage = winPercentageRatio - baselinePercentage;
	const formattedVariance = (variancePercentage >= 0 ? "+" : "") + variancePercentage.toFixed(1) + "%";

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUser} />

			<div>
				{isLoading ? (
					<div className="pageLoading">
						<img src="/media/wrestlingloading.gif" alt="Loading..." />
					</div>
				) : !loggedInUser || !loggedInUser.privileges || (!loggedInUser.privileges.some(p => p.token === "scheduleView" || p.token === "teamManage" || p.token === "myteam" || p.name === "scheduleView" || p.name === "teamManage" || p.name === "myteam") && !loggedInUser.privileges.includes("scheduleView") && !loggedInUser.privileges.includes("teamManage") && !loggedInUser.privileges.includes("myteam")) ? (
					<div className="noAccess">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
						<a>Unauthorized Access</a>
					</div>
				) : (
					<>
					<div className={`dualreport container ${pageActive ? "active" : ""}`}>
						<header className="report-header">
							<h1 className="report-title">Team Season Overview</h1>
							<div className="season-selector-wrapper">
								<select 
									value={selectedSeason} 
									onChange={event => setSelectedSeason(event.target.value)}
									aria-label="Filter Season"
									className="season-dropdown-select"
								>
									{seasonOptions.map(option => (
										<option key={option.name} value={option.name}>Season {option.name}</option>
									))}
								</select>
							</div>
						</header>

						{/* KPIs Cards Section */}
						<div className="report-kpis-grid">
							<div className="report-kpi-card">
								<span className="kpi-label">DUAL RECORD</span>
								<span className="kpi-value-text Russo">{totalWinsCount} - {totalLossesCount}</span>
							</div>

							<div className="report-kpi-card">
								<span className="kpi-label">WIN PERCENTAGE</span>
								<span className="kpi-value-text Russo">{winPercentageRatio.toFixed(1)}%</span>
								{hasPreviousSeasonData && (
									<span className={`kpi-comparison-variance ${variancePercentage >= 0 ? "positive-val" : "negative-val"}`}>
										{formattedVariance} vs {startYearFullValue - 1} baseline
									</span>
								)}
							</div>

							<div className="report-kpi-card">
								<span className="kpi-label">POINTS FOR / AGAINST</span>
								<span className="kpi-value-text Russo">{totalPointsForSum} / {totalPointsAgainstSum}</span>
							</div>

							<div className="report-kpi-card">
								<span className="kpi-label">NEXT DUAL</span>
								<span className="kpi-value-text Russo" style={{ fontSize: nextUpcomingDual ? "20px" : "28px", textAlign: "center" }}>
									{nextUpcomingDual ? nextUpcomingDual.opponent : "None Scheduled"}
								</span>
								<span className="kpi-comparison-variance" style={{ color: "var(--on-surface-variant)" }}>
									{nextUpcomingDual ? new Date(nextUpcomingDual.dualDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No upcoming meets"}
								</span>
							</div>
						</div>

						{/* Charts Row */}
						<div className="report-charts-row">
							<div className="report-chart-card">
								<h3 className="chart-card-title">Points Differential</h3>
								<DivergingBarChart dualsList={duals} />
								<div className="chart-net-indicator-wrapper">
									<span className="net-label">NET OVERALL POINTS</span>
									<span className={`net-value-count Russo ${netPointsDifferenceVal >= 0 ? "positive-val" : "negative-val"}`}>
										{netPointsDifferenceVal > 0 ? "+" : ""}{netPointsDifferenceVal}
									</span>
								</div>
							</div>

							<div className="report-chart-card">
								<h3 className="chart-card-title">Matchup Scoring Trends</h3>
								<ScatterPlot dualsList={duals} />
							</div>
						</div>

						{/* Match detail table matrix section */}
						<div className="report-matrix-section">
							<h3 className="matrix-section-title">Match Detail Matrix</h3>
							<MatchDetailMatrix dualsList={duals} />
						</div>

					</div>

					{/* Sticky Bottom Navigation Bar */}
					<div className="bottomNav">
						<div className="navItem active">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
								<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
								<line x1="9" y1="3" x2="9" y2="21" />
								<line x1="15" y1="3" x2="15" y2="21" />
								<line x1="3" y1="9" x2="21" y2="9" />
								<line x1="3" y1="15" x2="21" y2="15" />
							</svg>
							<span>Overview</span>
						</div>
						<div className="navItem">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M12 3v18M12 7l-8-2M12 7l8-2M4 5v4a4 4 0 0 0 8 0V5M20 5v4a4 4 0 0 1-8 0V5M4 19h16" />
							</svg>
							<span>Weight Classes</span>
						</div>
						<div className="navItem">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
							<span>Wrestlers</span>
						</div>
						<div className="navItem">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
								<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
								<path d="M4 22h16" />
								<path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
								<path d="M12 2a5 5 0 0 0-5 5v4c0 1.25.78 2.3 1.87 2.7L12 16l3.13-2.3c1.09-.4 1.87-1.45 1.87-2.7V7a5 5 0 0 0-5-5z" />
							</svg>
							<span>Dual</span>
						</div>
					</div>
					</>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<DualReport />);
