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

const SeasonChart = ({ dualsList }) => {
	const completedDuals = dualsList.filter(
		(dualItem) => dualItem.matches && dualItem.matches.length > 0
	);

	const [hoveredIndex, setHoveredIndex] = useState(null);

	if (completedDuals.length === 0) {
		return <div className="no-chart-data">No completed dual meets recorded for this season.</div>;
	}

	// 1. Calculate scores and matches won
	const completedDualsData = completedDuals.map((dualItem) => {
		const scoreResult = calculateDualScore(dualItem);
		let fortMillMatchesWon = 0;
		let opponentMatchesWon = 0;

		(dualItem.matches || []).forEach((matchItem) => {
			const homeWrestler = (matchItem.wrestlers || []).find(
				(w) => w.team.toLowerCase() === "fort mill"
			);
			const visitorWrestler = (matchItem.wrestlers || []).find(
				(w) => w.team.toLowerCase() !== "fort mill"
			);
			if (homeWrestler && homeWrestler.isWinner) {
				fortMillMatchesWon++;
			} else if (visitorWrestler && visitorWrestler.isWinner) {
				opponentMatchesWon++;
			}
		});

		return {
			opponent: dualItem.opponent,
			teamScore: scoreResult.teamScore,
			opponentScore: scoreResult.opponentScore,
			fortMillMatchesWon,
			opponentMatchesWon,
			dateObject: new Date(dualItem.dualDate)
		};
	}).sort((first, second) => second.dateObject - first.dateObject); // Most recent to oldest

	// 2. Determine max values for scaling
	const maxMatches = 14;
	const maxPoints = Math.max(60, ...completedDualsData.map((d) => Math.max(d.teamScore, d.opponentScore)));

	// 3. Layout dimensions
	const maxVisible = 10;
	const N = completedDualsData.length;
	const colWidth = 30;
	const paddingLeft = 60;
	const paddingRight = 60;
	const chartHeight = 350;

	const chartWidth = N > maxVisible ? paddingLeft + paddingRight + (N * colWidth) : 900;
	const isScrollable = N > maxVisible;

	const zeroY = 175;
	const heightRange = 130; // 175 - 45 (top padding) = 130; 305 (bottom padding) - 175 = 130

	// Helpers for y-coordinates
	const getMatchesYUp = (m) => zeroY - (m / maxMatches) * heightRange;
	const getMatchesYDown = (m) => zeroY + (m / maxMatches) * heightRange;
	const getPointsYUp = (p) => zeroY - (p / maxPoints) * heightRange;
	const getPointsYDown = (p) => zeroY + (p / maxPoints) * heightRange;

	const getXCoordinate = (index) => {
		const availableWidth = chartWidth - paddingLeft - paddingRight;
		const step = availableWidth / N;
		return paddingLeft + (index + 0.5) * step;
	};

	// 4. Generate path for rounded bars
	const getBarPath = (x, y, width, height, isUp, r = 4) => {
		if (height <= 0) return "";
		const radius = Math.min(r, height, width / 2);
		if (isUp) {
			return `M ${x},${y + height} L ${x},${y + radius} A ${radius},${radius} 0 0,1 ${x + radius},${y} L ${x + width - radius},${y} A ${radius},${radius} 0 0,1 ${x + width},${y + radius} L ${x + width},${y + height} Z`;
		} else {
			return `M ${x},${y} L ${x},${y + height - radius} A ${radius},${radius} 0 0,0 ${x + radius},${y + height} L ${x + width - radius},${y + height} A ${radius},${radius} 0 0,0 ${x + width},${y + height - radius} L ${x + width},${y} Z`;
		}
	};

	// 5. Generate team abbreviation helper
	const getTeamAbbreviation = (teamName) => {
		if (!teamName) return "";
		const cleanName = teamName.trim();
		const words = cleanName.split(/\s+/);
		if (words.length >= 2) {
			return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
		}
		return cleanName.slice(0, 2).toUpperCase();
	};

	// 6. Generate lines path data
	const teamPointsPath = completedDualsData.map((d, i) => {
		return `${i === 0 ? "M" : "L"} ${getXCoordinate(i)} ${getPointsYUp(d.teamScore)}`;
	}).join(" ");

	const opponentPointsPath = completedDualsData.map((d, i) => {
		return `${i === 0 ? "M" : "L"} ${getXCoordinate(i)} ${getPointsYDown(d.opponentScore)}`;
	}).join(" ");

	// 7. Gridline y-coordinates
	const gridlinesY = [45, 110, 240, 305]; // 175 is baseline

	return (
		<div className="season-chart-wrapper">
			{/* Legend */}
			<div className="season-chart-legend">
				<div className="legend-item">
					<span className="legend-color-box fort-mill"></span>
					<span className="legend-label">FORT MILL</span>
				</div>
				<div className="legend-item">
					<span className="legend-color-box opponent"></span>
					<span className="legend-label">OPPONENT</span>
				</div>
			</div>

			{/* Scrollable Container */}
			<div className="season-chart-scroll-container">
				<svg
					width={isScrollable ? chartWidth : "100%"}
					height={chartHeight}
					viewBox={`0 0 ${chartWidth} ${chartHeight}`}
					style={{
						display: "block",
						width: isScrollable ? `${chartWidth}px` : "100%",
						height: `${chartHeight}px`,
						minWidth: isScrollable ? `${chartWidth}px` : "100%"
					}}
				>
					{/* Horizontal Gridlines */}
					{gridlinesY.map((yVal, idx) => (
						<line
							key={`grid-h-${idx}`}
							x1={paddingLeft}
							y1={yVal}
							x2={chartWidth - paddingRight}
							y2={yVal}
							stroke="var(--outline)"
							strokeWidth={0.5}
							strokeDasharray="3,3"
						/>
					))}

					{/* Vertical Gridlines & X-axis columns */}
					{completedDualsData.map((d, i) => (
						<line
							key={`grid-v-${i}`}
							x1={getXCoordinate(i)}
							y1={45}
							x2={getXCoordinate(i)}
							y2={305}
							stroke="var(--outline)"
							strokeWidth={0.5}
							strokeDasharray="3,3"
						/>
					))}

					{/* Vertical Axis Lines */}
					<line
						x1={paddingLeft}
						y1={45}
						x2={paddingLeft}
						y2={305}
						stroke="var(--outline)"
						strokeWidth={1.5}
					/>
					<line
						x1={chartWidth - paddingRight}
						y1={45}
						x2={chartWidth - paddingRight}
						y2={305}
						stroke="var(--outline)"
						strokeWidth={1.5}
					/>

					{/* Baseline */}
					<line
						x1={paddingLeft}
						y1={zeroY}
						x2={chartWidth - paddingRight}
						y2={zeroY}
						stroke="var(--outline-variant)"
						strokeWidth={1.5}
					/>

					{/* Y-axis Titles */}
					<text
						x={paddingLeft - 35}
						y={35}
						fontFamily="var(--font-body)"
						fontSize="11px"
						fontWeight="700"
						fill="var(--on-surface-variant)"
						textAnchor="middle"
					>
						WINS
					</text>
					<text
						x={chartWidth - paddingRight + 35}
						y={35}
						fontFamily="var(--font-body)"
						fontSize="11px"
						fontWeight="700"
						fill="var(--on-surface-variant)"
						textAnchor="middle"
					>
						PTS
					</text>

					{/* Left Axis Labels (Matches Won) */}
					<text x={paddingLeft - 10} y={45 + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">14</text>
					<text x={paddingLeft - 10} y={110 + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">7</text>
					<text x={paddingLeft - 10} y={175 + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">0</text>
					<text x={paddingLeft - 10} y={240 + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">7</text>
					<text x={paddingLeft - 10} y={305 + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">14</text>

					{/* Right Axis Labels (Points) */}
					<text x={chartWidth - paddingRight + 10} y={45 + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">{maxPoints}</text>
					<text x={chartWidth - paddingRight + 10} y={110 + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">{maxPoints / 2}</text>
					<text x={chartWidth - paddingRight + 10} y={175 + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">0</text>
					<text x={chartWidth - paddingRight + 10} y={240 + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">{maxPoints / 2}</text>
					<text x={chartWidth - paddingRight + 10} y={305 + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">{maxPoints}</text>

					{/* Bars (Matches Won) */}
					{completedDualsData.map((d, i) => {
						const barW = 15;
						const x = getXCoordinate(i) - barW / 2;

						const fmHeight = ((d.fortMillMatchesWon / maxMatches) * heightRange);
						const fmY = zeroY - fmHeight;
						const fmPath = getBarPath(x, fmY, barW, fmHeight, true);

						const oppHeight = ((d.opponentMatchesWon / maxMatches) * heightRange);
						const oppY = zeroY;
						const oppPath = getBarPath(x, oppY, barW, oppHeight, false);

						const isHovered = hoveredIndex === i;

						return (
							<g key={`bars-${i}`}>
								{fmHeight > 0 && (
									<path
										d={fmPath}
										fill="var(--primary)"
										fillOpacity={isHovered ? 0.8 : 1}
										style={{ transition: "fill-opacity 0.2s" }}
									/>
								)}
								{oppHeight > 0 && (
									<path
										d={oppPath}
										fill="var(--secondary-accent)"
										fillOpacity={isHovered ? 0.8 : 1}
										style={{ transition: "fill-opacity 0.2s" }}
									/>
								)}
							</g>
						);
					})}

					{/* X-axis Labels (Team Abbreviations) */}
					{completedDualsData.map((d, i) => {
						const x = getXCoordinate(i);
						const abbrev = getTeamAbbreviation(d.opponent);
						return (
							<g key={`x-abbrev-${i}`}>
								<rect
									x={x - 12}
									y={zeroY - 10}
									width={25}
									height={20}
									fill="#ffffff"
									stroke="var(--outline)"
									strokeWidth={1}
									rx={2}
								/>
								<text
									x={x}
									y={zeroY + 4}
									textAnchor="middle"
									fontFamily="var(--font-body)"
									fontSize="10px"
									fontWeight="700"
									fill="var(--on-surface-variant)"
								>
									{abbrev}
								</text>
							</g>
						);
					})}

					{/* Lines (Points Scored) */}
					{completedDualsData.length > 1 && (
						<>
							<path
								d={teamPointsPath}
								fill="none"
								stroke="#1565c0"
								strokeWidth={2.5}
								style={{ pointerEvents: "none" }}
							/>
							<path
								d={opponentPointsPath}
								fill="none"
								stroke="#c77000"
								strokeWidth={2.5}
								style={{ pointerEvents: "none" }}
							/>
						</>
					)}

					{/* Line markers (Circles) */}
					{completedDualsData.map((d, i) => {
						const x = getXCoordinate(i);
						const teamY = getPointsYUp(d.teamScore);
						const oppY = getPointsYDown(d.opponentScore);
						const isHovered = hoveredIndex === i;

						return (
							<g key={`markers-${i}`} style={{ pointerEvents: "none" }}>
								<circle
									cx={x}
									cy={teamY}
									r={isHovered ? 6 : 4}
									fill="#1565c0"
									stroke="#ffffff"
									strokeWidth={1.5}
									style={{ transition: "all 0.15s ease" }}
								/>
								<circle
									cx={x}
									cy={oppY}
									r={isHovered ? 6 : 4}
									fill="#c77000"
									stroke="#ffffff"
									strokeWidth={1.5}
									style={{ transition: "all 0.15s ease" }}
								/>
							</g>
						);
					})}

					{/* Invisible hover overlay zones */}
					{completedDualsData.map((d, i) => {
						const stepWidth = (chartWidth - paddingLeft - paddingRight) / N;
						const x = getXCoordinate(i) - stepWidth / 2;
						return (
							<rect
								key={`hover-zone-${i}`}
								x={x}
								y={45}
								width={stepWidth}
								height={260}
								fill="transparent"
								style={{ cursor: "pointer" }}
								onMouseEnter={() => setHoveredIndex(i)}
								onMouseLeave={() => setHoveredIndex(null)}
							/>
						);
					})}
				</svg>
			</div>

			{/* Tooltip */}
			{hoveredIndex !== null && (() => {
				const d = completedDualsData[hoveredIndex];
				const rawDate = d.dateObject;
				const formattedDate = `${String(rawDate.getMonth() + 1).padStart(2, "0")}/${String(rawDate.getDate()).padStart(2, "0")}/${rawDate.getFullYear()}`;
				const fmWinner = d.teamScore > d.opponentScore;
				const oppWinner = d.opponentScore > d.teamScore;
				
				return (
					<div className="season-chart-tooltip">
						<div className="season-chart-tooltip-title">
							{d.opponent} ({formattedDate})
						</div>
						<div className="season-chart-tooltip-content">
							<div className="season-chart-tooltip-col">
								<span className={`season-chart-tooltip-team-name ${fmWinner ? "winner-fm" : ""}`}>
									FORT MILL
								</span>
								<br />
								Matches: {d.fortMillMatchesWon}
								<br />
								Points: {d.teamScore}
							</div>
							<div className="season-chart-tooltip-col opponent-col">
								<span className={`season-chart-tooltip-team-name ${oppWinner ? "winner-opp" : ""}`}>
									OPPONENT
								</span>
								<br />
								Matches: {d.opponentMatchesWon}
								<br />
								Points: {d.opponentScore}
							</div>
						</div>
					</div>
				);
			})()}
		</div>
	);
};

const MatchDetailMatrix = ({ dualsList }) => {
	const sortedDuals = [...dualsList].sort((firstDual, secondDual) => new Date(secondDual.dualDate) - new Date(firstDual.dualDate));
	const completedDuals = sortedDuals.filter(dualItem => dualItem.matches && dualItem.matches.length > 0);
	const mostRecentCompletedId = completedDuals.length > 0 ? (completedDuals[0].id || completedDuals[0]._id) : null;

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
					const formattedDate = `${String(rawDate.getMonth() + 1).padStart(2, "0")}/${String(rawDate.getDate()).padStart(2, "0")}/${rawDate.getFullYear().toString().substring(2,4)}`;

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


const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"];

const processWeightClassData = (dualsList) => {
	const completedDuals = dualsList.filter(function (dualItem) {
		return dualItem.matches && dualItem.matches.length > 0;
	});

	const statsMap = {};
	WEIGHT_CLASSES.forEach(function (weightClass) {
		statsMap[weightClass] = {
			weightClass: weightClass,
			wins: 0,
			points: 0,
			totalMatches: 0,
			wrestlers: {} // wrestlerName -> { name, wins, losses, points }
		};
	});

	completedDuals.forEach(function (dualItem) {
		(dualItem.matches || []).forEach(function (matchItem) {
			const weightClass = matchItem.weightClass;
			if (!statsMap[weightClass]) {
				return;
			}

			const winType = (matchItem.winType || "").toUpperCase();
			let matchPoints = 3; // fallback default
			if (winType === "DEC") {
				matchPoints = 3;
			} else if (winType === "MD") {
				matchPoints = 4;
			} else if (winType === "TF") {
				matchPoints = 5;
			} else if (["F", "FF", "FOR", "DQ", "DEF"].includes(winType)) {
				matchPoints = 6;
			}

			const fortMillWrestler = (matchItem.wrestlers || []).find(function (wrestlerItem) {
				return wrestlerItem.team.toLowerCase() === "fort mill";
			});

			if (fortMillWrestler) {
				const wrestlerName = fortMillWrestler.name || "Unknown Wrestler";
				if (!statsMap[weightClass].wrestlers[wrestlerName]) {
					statsMap[weightClass].wrestlers[wrestlerName] = {
						name: wrestlerName,
						wins: 0,
						losses: 0,
						points: 0
					};
				}

				statsMap[weightClass].totalMatches += 1;
				if (fortMillWrestler.isWinner) {
					statsMap[weightClass].wins += 1;
					statsMap[weightClass].points += matchPoints;
					statsMap[weightClass].wrestlers[wrestlerName].wins += 1;
					statsMap[weightClass].wrestlers[wrestlerName].points += matchPoints;
				} else {
					statsMap[weightClass].wrestlers[wrestlerName].losses += 1;
				}
			}
		});
	});

	return WEIGHT_CLASSES.map(function (weightClass) {
		const weightClassData = statsMap[weightClass];
		const wrestlerList = Object.values(weightClassData.wrestlers).map(function (wrestlerItem) {
			const totalMatches = wrestlerItem.wins + wrestlerItem.losses;
			return {
				...wrestlerItem,
				winPercentage: totalMatches > 0 ? (wrestlerItem.wins / totalMatches) * 100 : 0,
				percentageOfPoints: weightClassData.points > 0 ? (wrestlerItem.points / weightClassData.points) * 100 : 0
			};
		});

		// Determine leading wrestler based on wins, then win %, then points
		let sortedWrestlersList = wrestlerList;
		let leaderName = null;
		if (wrestlerList.length > 0) {
			sortedWrestlersList = [...wrestlerList].sort(function (firstWrestler, secondWrestler) {
				if (secondWrestler.wins !== firstWrestler.wins) {
					return secondWrestler.wins - firstWrestler.wins;
				}
				if (secondWrestler.winPercentage !== firstWrestler.winPercentage) {
					return secondWrestler.winPercentage - firstWrestler.winPercentage;
				}
				return secondWrestler.points - firstWrestler.points;
			});
			leaderName = sortedWrestlersList[0].name;
		}

		return {
			weightClass: weightClass,
			wins: weightClassData.wins,
			points: weightClassData.points,
			totalMatches: weightClassData.totalMatches,
			wrestlers: sortedWrestlersList,
			leaderName: leaderName
		};
	});
};

const WinsPointsComboChart = ({ data }) => {
	const [hoveredIndex, setHoveredIndex] = useState(null);

	const maxWinsValue = Math.max(...data.map(function (dataPoint) { return dataPoint.wins; }), 5);
	const maxPointsValue = Math.max(...data.map(function (dataPoint) { return dataPoint.points; }), 30);

	const chartTotalWidth = 600;
	const chartTotalHeight = 300;
	const paddingConfig = { top: 30, right: 50, bottom: 40, left: 50 };
	const chartContentWidth = chartTotalWidth - paddingConfig.left - paddingConfig.right;
	const chartContentHeight = chartTotalHeight - paddingConfig.top - paddingConfig.bottom;

	const getXCoordinate = (indexValue) => paddingConfig.left + (indexValue + 0.5) * (chartContentWidth / data.length);
	const getYLeftCoordinate = (winsValue) => paddingConfig.top + chartContentHeight - (winsValue / maxWinsValue) * chartContentHeight;
	const getYRightCoordinate = (pointsValue) => paddingConfig.top + chartContentHeight - (pointsValue / maxPointsValue) * chartContentHeight;

	const pointsPathData = data.map(function (dataPoint, indexValue) {
		return `${indexValue === 0 ? 'M' : 'L'} ${getXCoordinate(indexValue)} ${getYRightCoordinate(dataPoint.points)}`;
	}).join(' ');

	const tickLinesCount = 5;
	const leftAxisTicks = Array.from({ length: tickLinesCount + 1 }, (unusedValue, indexValue) => Math.round((maxWinsValue / tickLinesCount) * indexValue));
	const rightAxisTicks = Array.from({ length: tickLinesCount + 1 }, (unusedValue, indexValue) => Math.round((maxPointsValue / tickLinesCount) * indexValue));

	return (
		<div className="diverging-chart-wrapper" style={{ position: "relative" }}>
			<svg viewBox={`0 0 ${chartTotalWidth} ${chartTotalHeight}`}>
				{/* Gridlines */}
				{leftAxisTicks.map((unusedValue, indexValue) => {
					const yCoordinate = paddingConfig.top + chartContentHeight - (indexValue / tickLinesCount) * chartContentHeight;
					return <line key={indexValue} x1={paddingConfig.left} y1={yCoordinate} x2={chartTotalWidth - paddingConfig.right} y2={yCoordinate} stroke="var(--outline)" strokeWidth={0.5} strokeDasharray="3,3" />;
				})}

				{/* Axis Lines */}
				<line x1={paddingConfig.left} y1={paddingConfig.top} x2={paddingConfig.left} y2={paddingConfig.top + chartContentHeight} stroke="var(--outline)" strokeWidth={1.5} />
				<line x1={chartTotalWidth - paddingConfig.right} y1={paddingConfig.top} x2={chartTotalWidth - paddingConfig.right} y2={paddingConfig.top + chartContentHeight} stroke="var(--outline)" strokeWidth={1.5} />
				<line x1={paddingConfig.left} y1={paddingConfig.top + chartContentHeight} x2={chartTotalWidth - paddingConfig.right} y2={paddingConfig.top + chartContentHeight} stroke="var(--outline)" strokeWidth={1.5} />

				{/* Axis Titles */}
				<text x={20} y={paddingConfig.top - 12} fontFamily="var(--font-body)" fontSize="16px" fontWeight="700" fill="#3246e5" textAnchor="middle">WINS</text>
				<text x={chartTotalWidth - 15} y={paddingConfig.top - 12} fontFamily="var(--font-body)" fontSize="16px" fontWeight="700" fill="#fd8b00" textAnchor="middle">PTS</text>

				{/* Left Axis Labels (Wins) */}
				{leftAxisTicks.map((tickValue, indexValue) => {
					const yCoordinate = paddingConfig.top + chartContentHeight - (indexValue / tickLinesCount) * chartContentHeight;
					return <text key={indexValue} x={paddingConfig.left - 10} y={yCoordinate + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize="15px" fill="var(--on-surface-variant)">{tickValue}</text>;
				})}

				{/* Right Axis Labels (Points) */}
				{rightAxisTicks.map((tickValue, indexValue) => {
					const yCoordinate = paddingConfig.top + chartContentHeight - (indexValue / tickLinesCount) * chartContentHeight;
					return <text key={indexValue} x={chartTotalWidth - paddingConfig.right + 10} y={yCoordinate + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize="15px" fill="var(--on-surface-variant)">{tickValue}</text>;
				})}

				{/* X Axis Labels */}
				{data.map((dataPoint, indexValue) => (
					<text key={dataPoint.weightClass} x={getXCoordinate(indexValue)} y={paddingConfig.top + chartContentHeight + 20} textAnchor="middle" fontFamily="var(--font-headers)" fontSize="15px" fill="var(--on-surface-variant)">{dataPoint.weightClass}</text>
				))}

				{/* Bar Chart (Wins) */}
				{data.map((dataPoint, indexValue) => {
					const barElementWidth = 16;
					const barElementHeight = (dataPoint.wins / maxWinsValue) * chartContentHeight;
					const xCoordinate = getXCoordinate(indexValue) - barElementWidth / 2;
					const yCoordinate = paddingConfig.top + chartContentHeight - barElementHeight;

					return (
						<rect
							key={dataPoint.weightClass}
							x={xCoordinate}
							y={yCoordinate}
							width={barElementWidth}
							height={barElementHeight}
							fill="#3246e5"
							rx={2}
							style={{ cursor: "pointer", transition: "fill-opacity 0.2s" }}
							fillOpacity={hoveredIndex === indexValue ? 0.8 : 1}
							onMouseEnter={() => setHoveredIndex(indexValue)}
							onTouchStart={() => setHoveredIndex(indexValue)}
							onMouseLeave={() => setHoveredIndex(null)}
						/>
					);
				})}

				{/* Line Chart (Points) */}
				<path d={pointsPathData} fill="none" stroke="#fd8b00" strokeWidth={2.5} style={{ pointerEvents: "none" }} />
				{data.map((dataPoint, indexValue) => (
					<circle
						key={dataPoint.weightClass}
						cx={getXCoordinate(indexValue)}
						cy={getYRightCoordinate(dataPoint.points)}
						r={hoveredIndex === indexValue ? 7 : 5}
						fill="#fd8b00"
						stroke="#ffffff"
						strokeWidth={1.5}
						style={{ cursor: "pointer", transition: "all 0.15s ease" }}
						onMouseEnter={() => setHoveredIndex(indexValue)}
						onTouchStart={() => setHoveredIndex(indexValue)}
						onMouseLeave={() => setHoveredIndex(null)}
					/>
				))}
			</svg>

			{hoveredIndex !== null && (
				<div
					className="combo-chart-tooltip"
					style={{
						position: "absolute",
						top: `calc(${(getYRightCoordinate(data[hoveredIndex].points) / chartTotalHeight) * 100}% - 10px)`,
						left: `${(getXCoordinate(hoveredIndex) / chartTotalWidth) * 100}%`
					}}
				>
					<div>Weight: {data[hoveredIndex].weightClass}</div>
					<div>Wins: {data[hoveredIndex].wins}</div>
					<div>Points Contributed: {data[hoveredIndex].points}</div>
				</div>
			)}
		</div>
	);
};

const PointsHorizontalBarChart = ({ data }) => {
	const sortedData = [...data].sort((firstPoint, secondPoint) => +firstPoint.weightClass - +secondPoint.weightClass);
	const maxPointsValue = Math.max(...sortedData.map(function (dataPoint) { return dataPoint.points; }), 10);

	const chartTotalWidth = 500;
	const barRowHeight = 15;
	const barRowSpacing = 12;
	const paddingConfig = { top: 10, right: 40, bottom: 20, left: 45 };

	const chartContentHeight = sortedData.length * (barRowHeight + barRowSpacing);
	const chartTotalHeight = chartContentHeight + paddingConfig.top + paddingConfig.bottom;
	const chartContentWidth = chartTotalWidth - paddingConfig.left - paddingConfig.right;

	const getBarWidth = (pointsValue) => (pointsValue / maxPointsValue) * chartContentWidth;

	return (
		<div className="points-horizontal-chart-wrapper">
			<svg viewBox={`0 0 ${chartTotalWidth} ${chartTotalHeight}`}>
				<line x1={paddingConfig.left} y1={paddingConfig.top} x2={paddingConfig.left} y2={paddingConfig.top + chartContentHeight} stroke="var(--outline)" strokeWidth={1.5} />

				{sortedData.map((dataPoint, indexValue) => {
					const yCoordinate = paddingConfig.top + indexValue * (barRowHeight + barRowSpacing);
					const barWidthValue = getBarWidth(dataPoint.points);

					return (
						<g key={dataPoint.weightClass} className="chart-row">
							<text
								x={paddingConfig.left - 8}
								y={yCoordinate + barRowHeight / 2 + 5}
								textAnchor="end"
								fontFamily="var(--font-headers)"
								fontSize="15px"
								fill="var(--on-surface-variant)"
							>
								{dataPoint.weightClass}
							</text>

							<rect
								x={paddingConfig.left}
								y={yCoordinate}
								width={Math.max(barWidthValue, 2)}
								height={barRowHeight}
								fill="#fd8b00"
								rx={2}
							/>

							<text
								x={paddingConfig.left + barWidthValue + 8}
								y={yCoordinate + barRowHeight / 2 + 5}
								textAnchor="start"
								fontFamily="var(--font-body)"
								fontSize="15px"
								fontWeight="700"
								fill="var(--on-surface)"
							>
								{dataPoint.points}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
};

const IntraClassComparisonCards = ({ data }) => {
	return (
		<div className="weight-comparison-grid">
			{data.map(function (weightClassData) {
				return (
					<div key={weightClassData.weightClass} className="weight-comparison-card">
						<h4 className="weight-comparison-card-title">
							<span>{weightClassData.weightClass} LBS</span>
							{weightClassData.leaderName && (
								<span style={{ fontSize: "11px", fontWeight: "normal", textTransform: "none", color: "var(--on-surface-variant)" }}>
									{weightClassData.wrestlers.length} Athlete(s)
								</span>
							)}
						</h4>
						<div className="weight-comparison-card-body">
							{weightClassData.wrestlers.length === 0 ? (
								<div className="no-wrestlers-placeholder">No active records</div>
							) : (
								weightClassData.wrestlers.map(function (wrestlerItem) {
									const isLeader = wrestlerItem.name === weightClassData.leaderName;
									const winPercentage = wrestlerItem.winPercentage;
									const totalMatches = wrestlerItem.wins + wrestlerItem.losses;
									let colorClass = "";
									if (totalMatches > 0) {
										if (winPercentage > 75) {
											colorClass = "win-pct-high";
										} else if (winPercentage >= 50) {
											colorClass = "win-pct-mid";
										} else {
											colorClass = "win-pct-low";
										}
									}
									return (
										<div
											key={wrestlerItem.name}
											className={`wrestler-comparison-row ${isLeader ? 'is-leader-row' : ''} ${colorClass}`}
										>
											<div className="wrestler-identity">
												<span className="wrestler-name-label">{wrestlerItem.name}</span>
												<span className="wrestler-record-label">
													Record: {wrestlerItem.wins}-{wrestlerItem.losses}
												</span>
												{isLeader && (
													<span className="wrestler-leader-badge">★ LEADER</span>
												)}
											</div>
											<div className="wrestler-metrics-summary">
												<div className="wrestler-metric-item">
													<span className="wrestler-metric-val">
														{wrestlerItem.winPercentage.toFixed(1)}%
													</span>
													<span className="wrestler-metric-lbl">Win %</span>
												</div>
												<div className="wrestler-metric-item">
													<span className="wrestler-metric-val">
														{wrestlerItem.points}
													</span>
													<span className="wrestler-metric-lbl">Pts For</span>
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
};

const WeightClassOverview = ({ dualsList }) => {
	const aggregatedData = processWeightClassData(dualsList);

	return (
		<div className="weight-class-overview-container">
			<div className="report-charts-row">
				<div className="report-chart-card">
					<h3 className="chart-card-title">Wins & Points Combo</h3>
					<WinsPointsComboChart data={aggregatedData} />
				</div>
				<div className="report-chart-card">
					<h3 className="chart-card-title">Scoring Power by Weight</h3>
					<PointsHorizontalBarChart data={aggregatedData} />
				</div>
			</div>

			<div className="weight-matrix-section">
				<h3 className="matrix-section-title">Intra-Class Comparison</h3>
				<IntraClassComparisonCards data={aggregatedData} />
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
	const [activeView, setActiveView] = useState("overview");

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

			<div style={{ minWidth: 0 }}>
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
						<header>
							<h1>Team Season Overview</h1>
						</header>

						<div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
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
						</div>

						{activeView === "overview" ? (
							<>
								{/* KPIs Cards Section */}
								<div className="report-kpis-grid">
									<div className="report-kpi-card">
										<span className="kpi-label">RECORD</span>
										<span className="kpi-value-text Russo">{totalWinsCount}-{totalLossesCount}</span>
										<span className="kpi-sub-text">{winPercentageRatio.toFixed(1)}% Win Percentage</span>
									</div>

									<div className="report-kpi-card">
										<span className="kpi-label">POINTS</span>
										<span className="kpi-value-text Russo">{totalPointsForSum} / {totalPointsAgainstSum}</span>
										<span className="kpi-sub-text">
											{netPointsDifferenceVal >= 0 ? "+" : ""}{netPointsDifferenceVal} Point Difference
										</span>
									</div>

									<div className="report-kpi-card">
										<span className="kpi-label">SEASON</span>
										<span className="kpi-value-text Russo">{completedDuals.length} / {duals.length - completedDuals.length}</span>
										<span className="kpi-sub-text">
											{nextUpcomingDual ? `Next: ${nextUpcomingDual.opponent}` : "Season Complete"}
										</span>
									</div>
								</div>

								{/* Charts Row */}
								<div className="report-charts-row-single">
									<div className="report-chart-card full-width">
										<h3 className="chart-card-title">Season Performance Overview</h3>
										<SeasonChart dualsList={duals} />
									</div>
								</div>

								{/* Match detail table matrix section */}
								<div className="report-matrix-section">
									<h3 className="matrix-section-title">Match Detail Matrix</h3>
									<MatchDetailMatrix dualsList={duals} />
								</div>
							</>
						) : activeView === "weight_classes" ? (
							<WeightClassOverview dualsList={duals} />
						) : null}

					</div>

					{/* Sticky Bottom Navigation Bar */}
					<div className="bottomNav">
						<div 
							className={`navItem ${activeView === "overview" ? "active" : ""}`}
							onClick={() => setActiveView("overview")}
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
							className={`navItem ${activeView === "weight_classes" ? "active" : ""}`}
							onClick={() => setActiveView("weight_classes")}
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M12 3v18M12 7l-8-2M12 7l8-2M4 5v4a4 4 0 0 0 8 0V5M20 5v4a4 4 0 0 1-8 0V5M4 19h16" />
							</svg>
							<span>Weight Classes</span>
						</div>
						<div 
							className="navItem"
							onClick={() => { window.location = "/portal/wrestlersearch.html"; }}
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
							<span>Wrestlers</span>
						</div>
						<div 
							className="navItem"
							onClick={() => { window.location = "/portal/schedule.html"; }}
						>
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
