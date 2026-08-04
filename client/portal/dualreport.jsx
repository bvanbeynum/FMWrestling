import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/dualreport.css";

const parseEventDate = (dateInput) => {
	if (!dateInput) return null;
	if (dateInput instanceof Date) return dateInput;

	const str = String(dateInput).trim();
	const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
	if (isoMatch) {
		const year = parseInt(isoMatch[1], 10);
		const month = parseInt(isoMatch[2], 10) - 1;
		const day = parseInt(isoMatch[3], 10);
		const hours = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
		const minutes = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
		const seconds = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

		return new Date(year, month, day, hours, minutes, seconds);
	}

	return new Date(dateInput);
};

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

const getBarPath = (x, y, width, height, isUp, r = 4) => {
	if (height <= 0) return "";
	const radius = Math.min(r, height, width / 2);
	if (isUp) {
		return `M ${x},${y + height} L ${x},${y + radius} A ${radius},${radius} 0 0,1 ${x + radius},${y} L ${x + width - radius},${y} A ${radius},${radius} 0 0,1 ${x + width},${y + radius} L ${x + width},${y + height} Z`;
	} else {
		return `M ${x},${y} L ${x},${y + height - radius} A ${radius},${radius} 0 0,0 ${x + radius},${y + height} L ${x + width - radius},${y + height} A ${radius},${radius} 0 0,0 ${x + width},${y + height - radius} L ${x + width},${y} Z`;
	}
};

const extractOpponentName = (dualItem) => {
	if (!dualItem) return "";
	const nonFortMillWrestler = (dualItem.matches || [])
		.flatMap(matchItem => matchItem.wrestlers || [])
		.find(wrestlerItem => wrestlerItem.team && !/fort mill/i.test(wrestlerItem.team.trim()));
	if (nonFortMillWrestler) return nonFortMillWrestler.team.trim();
	if (dualItem.opponent) return dualItem.opponent;
	if (dualItem.name && dualItem.name.includes(" vs ")) {
		const candidate = dualItem.name.split(" vs ")[1]?.trim();
		if (candidate && !/fort mill/i.test(candidate)) return candidate;
	}
	return "";
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
				(wrestler) => wrestler.team.toLowerCase() === "fort mill"
			);
			const visitorWrestler = (matchItem.wrestlers || []).find(
				(wrestler) => wrestler.team.toLowerCase() !== "fort mill"
			);
			if (homeWrestler && homeWrestler.isWinner) {
				fortMillMatchesWon++;
			} else if (visitorWrestler && visitorWrestler.isWinner) {
				opponentMatchesWon++;
			}
		});

		const opponentName = extractOpponentName(dualItem);

		return {
			id: dualItem.id || dualItem._id,
			opponent: opponentName,
			teamScore: scoreResult.teamScore,
			opponentScore: scoreResult.opponentScore,
			fortMillMatchesWon,
			opponentMatchesWon,
			dateObject: parseEventDate(dualItem.date)
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

	// 4. Generate path for rounded bars (moved to global file scope)

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
					{completedDualsData.map((dual, dualIndex) => (
						<line
							key={`grid-v-${dualIndex}`}
							x1={getXCoordinate(dualIndex)}
							y1={45}
							x2={getXCoordinate(dualIndex)}
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
								onClick={() => {
									if (d.id) {
										window.location.href = `/portal/dual.html?id=${d.id}`;
									}
								}}
							/>
						);
					})}
				</svg>
			</div>

			{/* Tooltip */}
			{hoveredIndex !== null && (() => {
				const dual = completedDualsData[hoveredIndex];
				const rawDate = dual.dateObject;
				const formattedDate = `${String(rawDate.getMonth() + 1).padStart(2, "0")}/${String(rawDate.getDate()).padStart(2, "0")}/${rawDate.getFullYear()}`;
				const fmWinner = dual.teamScore > dual.opponentScore;
				const oppWinner = dual.opponentScore > dual.teamScore;
				
				return (
					<div className="season-chart-tooltip">
						<div className="season-chart-tooltip-title">
							{dual.opponent} ({formattedDate})
						</div>
						<div className="season-chart-tooltip-content">
							<div className="season-chart-tooltip-col">
								<span className={`season-chart-tooltip-team-name ${fmWinner ? "winner-fm" : ""}`}>
									FORT MILL
								</span>
								<br />
								Matches: {dual.fortMillMatchesWon}
								<br />
								Points: {dual.teamScore}
							</div>
							<div className="season-chart-tooltip-col opponent-col">
								<span className={`season-chart-tooltip-team-name ${oppWinner ? "winner-opp" : ""}`}>
									OPPONENT
								</span>
								<br />
								Matches: {dual.opponentMatchesWon}
								<br />
								Points: {dual.opponentScore}
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

					const rawDate = parseEventDate(dualItem.date);
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
								onClick={() => {
									const targetId = dualItem.id || dualItem._id;
									if (targetId) {
										window.location.href = `/portal/dual.html?id=${targetId}`;
									}
								}}
								style={{ cursor: "pointer" }}
							>
								<div>{formattedDate}</div>
								<div className="opponent-name-cell">{extractOpponentName(dualItem)}</div>
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
	const completedDuals = dualsList.filter((dualItem) => {
		return dualItem.matches && dualItem.matches.length > 0;
	});

	const statsMap = {};
	WEIGHT_CLASSES.forEach((weightClass) => {
		statsMap[weightClass] = {
			weightClass: weightClass,
			wins: 0,
			losses: 0,
			points: 0,
			totalMatches: 0,
			wrestlers: {} // wrestlerName -> { name, wins, losses, points }
		};
	});

	completedDuals.forEach((dualItem) => {
		(dualItem.matches || []).forEach((matchItem) => {
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

			const fortMillWrestler = (matchItem.wrestlers || []).find((wrestlerItem) => {
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
					statsMap[weightClass].losses += 1;
					statsMap[weightClass].wrestlers[wrestlerName].losses += 1;
				}
			}
		});
	});

	return WEIGHT_CLASSES.map((weightClass) => {
		const weightClassData = statsMap[weightClass];
		const wrestlerList = Object.values(weightClassData.wrestlers).map((wrestlerItem) => {
			const totalMatches = wrestlerItem.wins + wrestlerItem.losses;
			return {
				...wrestlerItem,
				winPercentage: totalMatches > 0 ? (wrestlerItem.wins / totalMatches) * 100 : 0
			};
		}).sort((a, b) => b.points - a.points); // Sorted by points contributed!

		const winPercentage = weightClassData.totalMatches > 0 ? (weightClassData.wins / weightClassData.totalMatches) * 100 : 0;
		const averagePoints = weightClassData.totalMatches > 0 ? weightClassData.points / weightClassData.totalMatches : 0;

		let status = "Work in Progress";
		if (winPercentage > 75) {
			status = "Powerhouse";
		} else if (winPercentage >= 50) {
			status = "Stable";
		}

		return {
			weightClass: weightClass,
			wins: weightClassData.wins,
			losses: weightClassData.losses,
			points: weightClassData.points,
			totalMatches: weightClassData.totalMatches,
			winPercentage: winPercentage,
			averagePoints: averagePoints,
			status: status,
			wrestlers: wrestlerList
		};
	});
};

const WeightClassChart = ({ data }) => {
	const [hoveredIndex, setHoveredIndex] = useState(null);
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	const chartWidth = isMobile ? 480 : 800;
	const chartHeight = isMobile ? 320 : 300;
	const paddingLeft = isMobile ? 45 : 60;
	const paddingRight = isMobile ? 45 : 60;
	const paddingTop = isMobile ? 30 : 40;
	const paddingBottom = isMobile ? 40 : 40;

	const availableWidth = chartWidth - paddingLeft - paddingRight;
	const heightRange = chartHeight - paddingTop - paddingBottom;
	const zeroY = chartHeight - paddingBottom;

	const getXCoordinate = (index) => paddingLeft + (index + 0.5) * (availableWidth / data.length);
	const getWinPercentageY = (pct) => zeroY - (pct / 100) * heightRange;
	const getPointsY = (pts) => zeroY - (pts / 6) * heightRange;

	const gridlinesY = [
		paddingTop,
		paddingTop + heightRange * 0.25,
		paddingTop + heightRange * 0.5,
		paddingTop + heightRange * 0.75,
		zeroY
	];

	const pointsPath = data.map((d, i) => {
		return `${i === 0 ? "M" : "L"} ${getXCoordinate(i)} ${getPointsY(d.averagePoints)}`;
	}).join(" ");

	const axisFontSize = isMobile ? "13px" : "12px";
	const labelFontSize = isMobile ? "11px" : "10px";

	return (
		<div className="season-chart-wrapper">
			<div className="season-chart-legend">
				<div className="legend-item">
					<span className="legend-color-box" style={{ backgroundColor: "#10b981" }}></span>
					<span className="legend-label">POWERHOUSE (&gt;75%)</span>
				</div>
				<div className="legend-item">
					<span className="legend-color-box" style={{ backgroundColor: "#f59e0b" }}></span>
					<span className="legend-label">STABLE (50-75%)</span>
				</div>
				<div className="legend-item">
					<span className="legend-color-box" style={{ backgroundColor: "#ef4444" }}></span>
					<span className="legend-label">WIP (&lt;50%)</span>
				</div>
				<div className="legend-item" style={{ marginLeft: "12px" }}>
					<span style={{ display: "inline-block", width: "20px", height: "0", borderTop: "2.5px solid var(--primary)", marginRight: "8px", verticalAlign: "middle" }}></span>
					<span className="legend-label">AVG PTS / MATCH</span>
				</div>
			</div>

			<div className="season-chart-scroll-container" style={{ overflowX: "hidden" }}>
				<svg
					width="100%"
					viewBox={`0 0 ${chartWidth} ${chartHeight}`}
					style={{
						display: "block",
						width: "100%",
						height: `${chartHeight}px`
					}}
				>
					{gridlinesY.map((yVal, idx) => (
						<line
							key={`wc-grid-h-${idx}`}
							x1={paddingLeft}
							y1={yVal}
							x2={chartWidth - paddingRight}
							y2={yVal}
							stroke="var(--outline)"
							strokeWidth={0.5}
							strokeDasharray="3,3"
						/>
					))}

					{data.map((d, i) => (
						<line
							key={`wc-grid-v-${i}`}
							x1={getXCoordinate(i)}
							y1={paddingTop}
							x2={getXCoordinate(i)}
							y2={zeroY}
							stroke="var(--outline)"
							strokeWidth={0.5}
							strokeDasharray="3,3"
						/>
					))}

					<line
						x1={paddingLeft}
						y1={paddingTop}
						x2={paddingLeft}
						y2={zeroY}
						stroke="var(--outline)"
						strokeWidth={1.5}
					/>
					<line
						x1={chartWidth - paddingRight}
						y1={paddingTop}
						x2={chartWidth - paddingRight}
						y2={zeroY}
						stroke="var(--outline)"
						strokeWidth={1.5}
					/>

					<line
						x1={paddingLeft}
						y1={zeroY}
						x2={chartWidth - paddingRight}
						y2={zeroY}
						stroke="var(--outline)"
						strokeWidth={1.5}
					/>

					<text
						x={paddingLeft - 22}
						y={20}
						fontFamily="var(--font-body)"
						fontSize={axisFontSize}
						fontWeight="700"
						fill="var(--on-surface-variant)"
						textAnchor="middle"
					>
						WIN %
					</text>
					<text
						x={chartWidth - paddingRight + 22}
						y={20}
						fontFamily="var(--font-body)"
						fontSize={axisFontSize}
						fontWeight="700"
						fill="var(--on-surface-variant)"
						textAnchor="middle"
					>
						AVG PTS
					</text>

					<text x={paddingLeft - 10} y={gridlinesY[0] + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize={axisFontSize} fill="var(--on-surface-variant)">100%</text>
					<text x={paddingLeft - 10} y={gridlinesY[1] + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize={axisFontSize} fill="var(--on-surface-variant)">75%</text>
					<text x={paddingLeft - 10} y={gridlinesY[2] + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize={axisFontSize} fill="var(--on-surface-variant)">50%</text>
					<text x={paddingLeft - 10} y={gridlinesY[3] + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize={axisFontSize} fill="var(--on-surface-variant)">25%</text>
					<text x={paddingLeft - 10} y={gridlinesY[4] + 4} textAnchor="end" fontFamily="var(--font-headers)" fontSize={axisFontSize} fill="var(--on-surface-variant)">0%</text>

					<text x={chartWidth - paddingRight + 10} y={gridlinesY[0] + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize={axisFontSize} fill="var(--on-surface-variant)">6.0</text>
					<text x={chartWidth - paddingRight + 10} y={gridlinesY[1] + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize={axisFontSize} fill="var(--on-surface-variant)">4.5</text>
					<text x={chartWidth - paddingRight + 10} y={gridlinesY[2] + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize={axisFontSize} fill="var(--on-surface-variant)">3.0</text>
					<text x={chartWidth - paddingRight + 10} y={gridlinesY[3] + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">1.5</text>
					<text x={chartWidth - paddingRight + 10} y={gridlinesY[4] + 4} textAnchor="start" fontFamily="var(--font-headers)" fontSize="12px" fill="var(--on-surface-variant)">0.0</text>

					{data.map((d, i) => {
						const step = availableWidth / data.length;
						const barW = step * 0.55;
						const x = getXCoordinate(i) - barW / 2;

						const barHeight = (d.winPercentage / 100) * heightRange;
						const barY = zeroY - barHeight;
						const barPath = getBarPath(x, barY, barW, barHeight, true);

						let barColor = "#ef4444";
						if (d.status === "Powerhouse") {
							barColor = "#10b981";
						} else if (d.status === "Stable") {
							barColor = "#f59e0b";
						}

						const isHovered = hoveredIndex === i;

						return (
							<g key={`wc-bar-${i}`}>
								{barHeight > 0 && (
									<path
										d={barPath}
										fill={barColor}
										fillOpacity={isHovered ? 0.8 : 1}
										style={{ transition: "fill-opacity 0.2s" }}
									/>
								)}
							</g>
						);
					})}

					{data.map((d, i) => {
						const x = getXCoordinate(i);
						return (
							<text
								key={`wc-x-lbl-${i}`}
								x={x}
								y={zeroY + 20}
								textAnchor="middle"
								fontFamily="var(--font-body)"
								fontSize={labelFontSize}
								fontWeight="700"
								fill="var(--on-surface-variant)"
							>
								{d.weightClass}
							</text>
						);
					})}

					{data.length > 1 && (
						<path
							d={pointsPath}
							fill="none"
							stroke="var(--primary)"
							strokeWidth={2.5}
							style={{ pointerEvents: "none" }}
						/>
					)}

					{data.map((d, i) => {
						const x = getXCoordinate(i);
						const ptsY = getPointsY(d.averagePoints);
						const isHovered = hoveredIndex === i;

						return (
							<circle
								key={`wc-marker-${i}`}
								cx={x}
								cy={ptsY}
								r={isHovered ? 6 : 4}
								fill="var(--primary)"
								stroke="#ffffff"
								strokeWidth={1.5}
								style={{ pointerEvents: "none", transition: "all 0.15s ease" }}
							/>
						);
					})}

					{data.map((d, i) => {
						const step = availableWidth / data.length;
						const x = getXCoordinate(i) - step / 2;
						return (
							<rect
								key={`wc-hover-${i}`}
								x={x}
								y={paddingTop}
								width={step}
								height={heightRange}
								fill="transparent"
								style={{ cursor: "pointer" }}
								onMouseEnter={() => setHoveredIndex(i)}
								onMouseLeave={() => setHoveredIndex(null)}
							/>
						);
					})}
				</svg>
			</div>

			{hoveredIndex !== null && (() => {
				const d = data[hoveredIndex];
				return (
					<div className="season-chart-tooltip">
						<div className="season-chart-tooltip-title">
							{d.weightClass} LBS
						</div>
						<div className="season-chart-tooltip-content">
							<div className="season-chart-tooltip-col">
								Status: <span className={`status-text-${d.status === "Powerhouse" ? "powerhouse" : d.status === "Stable" ? "stable" : "wip"}`}>
									{d.status}
								</span>
								<br />
								Matches: {d.totalMatches}
								<br />
								Wins: {d.wins} | Losses: {d.losses}
							</div>
							<div className="season-chart-tooltip-col opponent-col">
								Win Rate: <strong>{d.winPercentage.toFixed(1)}%</strong>
								<br />
								Average Points: <strong>{d.averagePoints.toFixed(1)}</strong>
							</div>
						</div>
					</div>
				);
			})()}
		</div>
	);
};

const WeightClassListCards = ({ data }) => {
	return (
		<div className="weight-comparison-grid">
			{data.map((item) => {
				return (
					<div key={item.weightClass} className="weight-comparison-card">
						<h4 className="weight-comparison-card-title">
							<span>{item.weightClass} LBS</span>
							<span className={`weight-status-badge ${item.status === "Powerhouse" ? "powerhouse" : item.status === "Stable" ? "stable" : "wip"}`}>
								{item.status}
							</span>
						</h4>
						
						<div className="weight-class-summary-row">
							<div className="weight-class-summary-item">
								<span className="weight-class-summary-lbl">Win %</span>
								<span className="weight-class-summary-val">{item.winPercentage.toFixed(1)}%</span>
							</div>
							<div className="weight-class-summary-item" style={{ alignItems: "flex-end" }}>
								<span className="weight-class-summary-lbl">Avg Pts</span>
								<span className="weight-class-summary-val">{item.averagePoints.toFixed(1)}</span>
							</div>
						</div>

						<div className="weight-comparison-card-body">
							{item.wrestlers.length === 0 ? (
								<div className="no-wrestlers-placeholder">No active records</div>
							) : (
								item.wrestlers.map((wrestlerItem) => {
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
											className={`wrestler-comparison-row ${colorClass}`}
										>
											<div className="wrestler-identity">
												<span className="wrestler-name-label">{wrestlerItem.name}</span>
												<span className="wrestler-record-label">
													Record: {wrestlerItem.wins}-{wrestlerItem.losses} ({wrestlerItem.points} pts)
												</span>
											</div>
											<div className="wrestler-metrics-summary">
												<div className="wrestler-metric-item">
													<span className="wrestler-metric-val">
														{wrestlerItem.winPercentage.toFixed(1)}%
													</span>
													<span className="wrestler-metric-lbl">Win %</span>
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

	const powerhouseClasses = aggregatedData.filter((item) => item.status === "Powerhouse");
	const wipClasses = aggregatedData.filter((item) => item.status === "Work in Progress");

	const powerhouseMatches = powerhouseClasses.reduce((sum, item) => sum + item.totalMatches, 0);
	const powerhousePoints = powerhouseClasses.reduce((sum, item) => sum + item.points, 0);
	const powerhouseAvg = powerhouseMatches > 0 ? powerhousePoints / powerhouseMatches : 0;

	const wipMatches = wipClasses.reduce((sum, item) => sum + item.totalMatches, 0);
	const wipPoints = wipClasses.reduce((sum, item) => sum + item.points, 0);
	const wipAvg = wipMatches > 0 ? wipPoints / wipMatches : 0;

	const totalPointsAll = aggregatedData.reduce((sum, item) => sum + item.points, 0);
	const totalMatchesAll = aggregatedData.reduce((sum, item) => sum + item.totalMatches, 0);
	const overallAveragePoints = totalMatchesAll > 0 ? totalPointsAll / totalMatchesAll : 0;

	let topWeightClass = null;
	let maxAverage = -1;
	aggregatedData.forEach((item) => {
		if (item.totalMatches > 0 && item.averagePoints > maxAverage) {
			maxAverage = item.averagePoints;
			topWeightClass = item;
		}
	});
	const averageSubtext = topWeightClass ? `${topWeightClass.averagePoints.toFixed(1)} ${topWeightClass.weightClass}` : "N/A";

	return (
		<div className="weight-class-overview-container">
			<div className="report-kpis-grid">
				<div className="report-kpi-card weight-class-kpi-card powerhouse">
					<span className="kpi-label">Powerhouse</span>
					<span className="kpi-value-text Russo">{powerhouseClasses.length}</span>
					<span className="kpi-sub-text" style={{ color: "#137333" }}>{powerhouseAvg.toFixed(1)} Avg Points / Match</span>
				</div>

				<div className="report-kpi-card weight-class-kpi-card wip">
					<span className="kpi-label">Work in Progress</span>
					<span className="kpi-value-text Russo">{wipClasses.length}</span>
					<span className="kpi-sub-text" style={{ color: "#c5221f" }}>{wipAvg.toFixed(1)} Avg Points / Match</span>
				</div>

				<div className="report-kpi-card weight-class-kpi-card average">
					<span className="kpi-label">Average</span>
					<span className="kpi-value-text Russo">{overallAveragePoints.toFixed(1)}</span>
					<span className="kpi-sub-text">{averageSubtext} Top weight class</span>
				</div>
			</div>

			<div className="report-charts-row-single">
				<div className="report-chart-card full-width">
					<h3 className="chart-card-title">Weight Class Performance</h3>
					<WeightClassChart data={aggregatedData} />
				</div>
			</div>

			<div className="weight-matrix-section">
				<h3 className="matrix-section-title">Weight Class Depth</h3>
				<WeightClassListCards data={aggregatedData} />
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
									<h3 className="matrix-section-title">Duals</h3>
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
					</div>
					</>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<DualReport />);
