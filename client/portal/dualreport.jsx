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

const DonutChartSvg = ({ data, size = 220, innerRadius = 68, centerContent }) => {
	const [hoveredIndex, setHoveredIndex] = useState(null);
	const total = data.reduce((sum, d) => sum + d.value, 0);

	if (total === 0) {
		return <div className="no-chart-data">No data recorded for this season.</div>;
	}

	const cx = size / 2;
	const cy = size / 2;
	const R = (size / 2) - 10;
	const r = innerRadius;

	let cumulativeAngle = -Math.PI / 2;

	const slices = data.map((d, index) => {
		const angle = total > 0 ? (d.value / total) * 2 * Math.PI : 0;
		const startAngle = cumulativeAngle;
		const endAngle = cumulativeAngle + angle;
		cumulativeAngle = endAngle;

		const percentage = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
		const isFullCircle = angle >= 2 * Math.PI - 0.0001;

		let pathData = "";
		if (isFullCircle) {
			pathData = `M ${cx - R} ${cy} A ${R} ${R} 0 1 0 ${cx + R} ${cy} A ${R} ${R} 0 1 0 ${cx - R} ${cy} M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
		} else if (angle > 0) {
			const xOut1 = cx + R * Math.cos(startAngle);
			const yOut1 = cy + R * Math.sin(startAngle);
			const xOut2 = cx + R * Math.cos(endAngle);
			const yOut2 = cy + R * Math.sin(endAngle);

			const xIn1 = cx + r * Math.cos(startAngle);
			const yIn1 = cy + r * Math.sin(startAngle);
			const xIn2 = cx + r * Math.cos(endAngle);
			const yIn2 = cy + r * Math.sin(endAngle);

			const largeArcFlag = angle > Math.PI ? 1 : 0;

			pathData = `M ${xOut1} ${yOut1} A ${R} ${R} 0 ${largeArcFlag} 1 ${xOut2} ${yOut2} L ${xIn2} ${yIn2} A ${r} ${r} 0 ${largeArcFlag} 0 ${xIn1} ${yIn1} Z`;
		}

		return {
			...d,
			index,
			percentage,
			isFullCircle,
			pathData
		};
	});

	return (
		<div className="donut-chart-container">
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				{slices.map((slice) => {
					if (slice.value === 0) return null;
					const isHovered = hoveredIndex === slice.index;
					const categoryClass = slice.key || slice.label.toLowerCase().replace(/\s+/g, "-");

					return (
						<path
							key={slice.label}
							d={slice.pathData}
							fill={slice.color}
							fillRule={slice.isFullCircle ? "evenodd" : "nonzero"}
							className={`donut-slice ${categoryClass} ${isHovered ? "hovered" : ""}`}
							onMouseEnter={() => setHoveredIndex(slice.index)}
							onMouseLeave={() => setHoveredIndex(null)}
						/>
					);
				})}
			</svg>
			{centerContent && (
				<div className="donut-center-content">
					{centerContent}
				</div>
			)}
			{hoveredIndex !== null && slices[hoveredIndex] && (
				<div className="pie-chart-tooltip-wrapper">
					<div className="pie-chart-tooltip-text">
						{slices[hoveredIndex].label}: <strong>{slices[hoveredIndex].value}</strong> ({slices[hoveredIndex].percentage}%)
					</div>
				</div>
			)}
		</div>
	);
};

const DualsPieChart = ({ dualsList }) => {
	const completedDuals = dualsList.filter(
		(dualItem) => dualItem.matches && dualItem.matches.length > 0
	);

	let winsCount = 0;
	let lossesCount = 0;

	completedDuals.forEach((dualItem) => {
		const scoreResult = calculateDualScore(dualItem);
		if (scoreResult.teamScore > scoreResult.opponentScore) {
			winsCount += 1;
		} else if (scoreResult.teamScore < scoreResult.opponentScore) {
			lossesCount += 1;
		}
	});

	const remainingCount = Math.max(0, dualsList.length - completedDuals.length);
	const totalDuals = winsCount + lossesCount + remainingCount;

	const chartData = [
		{ key: "wins", label: "Wins", value: winsCount, color: "#10b981" },
		{ key: "losses", label: "Losses", value: lossesCount, color: "#ef4444" },
		{ key: "remaining", label: "Remaining", value: remainingCount, color: "#3b82f6" }
	];

	const completedMeets = winsCount + lossesCount;
	const winPercentageStr = completedMeets > 0 ? ((winsCount / completedMeets) * 100).toFixed(1) + "%" : "0.0%";

	const centerIndicator = (
		<div className="donut-center-indicator">
			<span className="donut-center-label">WIN RATE</span>
			<span className="donut-center-value">{winPercentageStr}</span>
			<span className="donut-center-sublabel">WIN %</span>
		</div>
	);

	return (
		<div className="pie-chart-wrapper">
			<DonutChartSvg data={chartData} size={220} centerContent={centerIndicator} />
			<div className="pie-chart-legend">
				{chartData.map((item) => {
					const pct = totalDuals > 0 ? ((item.value / totalDuals) * 100).toFixed(1) : "0.0";
					return (
						<div key={item.label} className="pie-legend-item">
							<div className="pie-legend-left">
								<span className={`pie-legend-color ${item.key}`} />
								<span className="pie-legend-label">{item.label}</span>
							</div>
							<span className="pie-legend-value">{item.value} ({pct}%)</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};

const PointsPieChart = ({ dualsList }) => {
	const completedDuals = dualsList.filter(
		(dualItem) => dualItem.matches && dualItem.matches.length > 0
	);

	let pointsForSum = 0;
	let pointsAgainstSum = 0;

	completedDuals.forEach((dualItem) => {
		const scoreResult = calculateDualScore(dualItem);
		pointsForSum += scoreResult.teamScore;
		pointsAgainstSum += scoreResult.opponentScore;
	});

	const totalPoints = pointsForSum + pointsAgainstSum;
	const completedDualsCount = completedDuals.length;

	const pointsForPerDual = completedDualsCount > 0 ? (pointsForSum / completedDualsCount).toFixed(1) : "0.0";
	const pointsAgainstPerDual = completedDualsCount > 0 ? (pointsAgainstSum / completedDualsCount).toFixed(1) : "0.0";

	const chartData = [
		{ key: "points-for", label: "Points For", value: pointsForSum, color: "#10b981" },
		{ key: "points-against", label: "Points Against", value: pointsAgainstSum, color: "#ef4444" }
	];

	const centerIndicator = (
		<div className="donut-center-points-indicator">
			<span className="donut-center-title">PER MATCH</span>
			<div className="donut-center-points-row">
				<div className="donut-point-col">
					<span className="donut-point-val points-for">{pointsForPerDual}</span>
					<span className="donut-point-lbl">FOR</span>
				</div>
				<div className="donut-point-divider" />
				<div className="donut-point-col">
					<span className="donut-point-val points-against">{pointsAgainstPerDual}</span>
					<span className="donut-point-lbl">AGAINST</span>
				</div>
			</div>
		</div>
	);

	return (
		<div className="pie-chart-wrapper">
			<DonutChartSvg data={chartData} size={220} centerContent={centerIndicator} />
			<div className="pie-chart-legend">
				{chartData.map((item) => {
					const pct = totalPoints > 0 ? ((item.value / totalPoints) * 100).toFixed(1) : "0.0";
					return (
						<div key={item.label} className="pie-legend-item">
							<div className="pie-legend-left">
								<span className={`pie-legend-color ${item.key}`} />
								<span className="pie-legend-label">{item.label}</span>
							</div>
							<span className="pie-legend-value">{item.value} ({pct}%)</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};


const MatchDetailMatrix = ({ dualsList }) => {
	const sortedDuals = [...dualsList].sort((firstDual, secondDual) => new Date(secondDual.date) - new Date(firstDual.date));
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
				const wrestlerId = fortMillWrestler.wrestlerId || fortMillWrestler.id || fortMillWrestler.sqlId || fortMillWrestler._id;
				if (!statsMap[weightClass].wrestlers[wrestlerName]) {
					statsMap[weightClass].wrestlers[wrestlerName] = {
						id: wrestlerId,
						name: wrestlerName,
						wins: 0,
						losses: 0,
						points: 0
					};
				} else if (!statsMap[weightClass].wrestlers[wrestlerName].id && wrestlerId) {
					statsMap[weightClass].wrestlers[wrestlerName].id = wrestlerId;
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
									const wrestlerId = wrestlerItem.id || wrestlerItem.wrestlerId || wrestlerItem.sqlId || wrestlerItem._id;
									return (
										<div
											key={wrestlerItem.name}
											className={`wrestler-comparison-row ${colorClass}`}
											onClick={() => {
												if (wrestlerId) {
													window.open(`/portal/wrestlerreport.html?id=${wrestlerId}`, "_blank");
												}
											}}
											style={{ cursor: wrestlerId ? "pointer" : "default" }}
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

const getSeasonStartYear = (seasonNameValue) => {
	if (seasonNameValue && /^\d{2}-\d{2}$/.test(seasonNameValue)) {
		const startYearShortValue = parseInt(seasonNameValue.split("-")[0], 10);
		return 2000 + startYearShortValue;
	}
	const currentTodayDate = new Date();
	return currentTodayDate.getMonth() >= 8 ? currentTodayDate.getFullYear() : currentTodayDate.getFullYear() - 1;
};

const processLeaderboardData = (eventsData, selectedDivisionSetting, seasonNameValue) => {
	const wrestlerRecordsByName = {};
	const startYearNumber = getSeasonStartYear(seasonNameValue);
	const inSeasonStartDate = new Date(startYearNumber, 10, 1, 0, 0, 0);
	const inSeasonEndDate = new Date(startYearNumber + 1, 2, 1, 23, 59, 59);

	(eventsData || []).forEach((eventItem) => {
		const rawEventDate = parseEventDate(eventItem.date);
		if (!rawEventDate) return;

		if (rawEventDate < inSeasonStartDate || rawEventDate > inSeasonEndDate) {
			return;
		}

		(eventItem.matches || []).forEach((matchItem) => {
			const matchDivisionValue = matchItem.divisionConvert || eventItem.divisionConvert || matchItem.division;
			if (selectedDivisionSetting !== "All Divisions" && matchDivisionValue !== selectedDivisionSetting) {
				return;
			}

			const fortMillWrestler = (matchItem.wrestlers || []).find((wrestlerItem) => {
				return wrestlerItem.team && wrestlerItem.team.toLowerCase() === "fort mill";
			});

			if (!fortMillWrestler || !fortMillWrestler.name) {
				return;
			}

			const wrestlerNameKey = fortMillWrestler.name.trim();
			const wrestlerIdentifier = fortMillWrestler.wrestlerId || fortMillWrestler.id || fortMillWrestler.sqlId || fortMillWrestler._id;

			if (!wrestlerRecordsByName[wrestlerNameKey]) {
				wrestlerRecordsByName[wrestlerNameKey] = {
					id: wrestlerIdentifier,
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
					escapes: 0
				};
			} else if (!wrestlerRecordsByName[wrestlerNameKey].id && wrestlerIdentifier) {
				wrestlerRecordsByName[wrestlerNameKey].id = wrestlerIdentifier;
			}

			const currentRecord = wrestlerRecordsByName[wrestlerNameKey];
			currentRecord.totalMatches += 1;

			if (fortMillWrestler.isWinner) {
				currentRecord.wins += 1;

				const winTypeNormalized = (matchItem.winType || "").toUpperCase();
				let matchPointsValue = 3;

				if (winTypeNormalized === "DEC") {
					matchPointsValue = 3;
					currentRecord.decisions += 1;
				} else if (winTypeNormalized === "MD") {
					matchPointsValue = 4;
					currentRecord.majorDecisions += 1;
				} else if (winTypeNormalized === "TF") {
					matchPointsValue = 5;
					currentRecord.techfalls += 1;
				} else if (["F", "FALL", "PIN"].includes(winTypeNormalized)) {
					matchPointsValue = 6;
					currentRecord.pins += 1;
				} else if (["FF", "FOR", "FORFEIT", "DQ", "DEF", "DEFAULT"].includes(winTypeNormalized)) {
					matchPointsValue = 6;
					currentRecord.forfeits += 1;
				} else {
					matchPointsValue = 3;
					currentRecord.decisions += 1;
				}

				currentRecord.points += matchPointsValue;
			}

			const takedownCount = Number(fortMillWrestler.takedowns || fortMillWrestler.takedown || fortMillWrestler.scores?.takedowns || 0);
			const nearfallCount = Number(fortMillWrestler.nearfalls || fortMillWrestler.nearfall || fortMillWrestler.scores?.nearfalls || 0);
			const reversalCount = Number(fortMillWrestler.reversals || fortMillWrestler.reversal || fortMillWrestler.scores?.reversals || 0);
			const escapeCount = Number(fortMillWrestler.escapes || fortMillWrestler.escape || fortMillWrestler.scores?.escapes || 0);

			currentRecord.takedowns += takedownCount;
			currentRecord.nearfalls += nearfallCount;
			currentRecord.reversals += reversalCount;
			currentRecord.escapes += escapeCount;
		});
	});

	return Object.values(wrestlerRecordsByName);
};

const WrestlerLeaderboard = ({ eventsData, seasonName }) => {
	const [selectedDivisionSetting, setSelectedDivisionSetting] = useState("Varsity");
	const [viewModeSetting, setViewModeSetting] = useState("overall");
	const [sortMetricKey, setSortMetricKey] = useState("points");
	const [sortDirectionDescending, setSortDirectionDescending] = useState(true);

	const wrestlerRecords = processLeaderboardData(eventsData, selectedDivisionSetting, seasonName);

	const formatMetricValue = (wrestlerRecord, metricKey) => {
		const rawValue = wrestlerRecord[metricKey] || 0;
		if (viewModeSetting === "per_match") {
			if (!wrestlerRecord.totalMatches || wrestlerRecord.totalMatches === 0) {
				return "0.00";
			}
			return (rawValue / wrestlerRecord.totalMatches).toFixed(2);
		}
		return rawValue;
	};

	const sortWrestlers = (firstRecord, secondRecord) => {
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
	};

	const sortedWrestlerRecords = [...wrestlerRecords].sort(sortWrestlers);

	const handleColumnHeaderClick = (targetMetricKey) => {
		if (sortMetricKey === targetMetricKey) {
			setSortDirectionDescending(!sortDirectionDescending);
		} else {
			setSortMetricKey(targetMetricKey);
			setSortDirectionDescending(true);
		}
	};

	const getMetricDisplayName = (targetMetricKey) => {
		const metricDisplayNames = {
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
		return metricDisplayNames[targetMetricKey] || "Points";
	};

	const getTopThreeLeaders = (metricKey) => {
		if (wrestlerRecords.length === 0) return [];
		return [...wrestlerRecords].sort((firstEntry, secondEntry) => {
			const valOne = viewModeSetting === "per_match"
				? (firstEntry.totalMatches > 0 ? firstEntry[metricKey] / firstEntry.totalMatches : 0)
				: (firstEntry[metricKey] || 0);
			const valTwo = viewModeSetting === "per_match"
				? (secondEntry.totalMatches > 0 ? secondEntry[metricKey] / secondEntry.totalMatches : 0)
				: (secondEntry[metricKey] || 0);
			if (valOne !== valTwo) {
				return valTwo - valOne;
			}
			return secondEntry.points - firstEntry.points;
		}).slice(0, 3);
	};

	const topThreeLeaders = getTopThreeLeaders(sortMetricKey);
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
									? `${formatMetricValue(leaderRecord, sortMetricKey)} ${viewModeSetting === "per_match" ? `${activeMetricLabel} / Match` : activeMetricLabel}` 
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

											<td className={`metric-cell ${sortMetricKey === "points" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "points")}</td>
											<td className={`metric-cell ${sortMetricKey === "wins" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "wins")}</td>
											<td className={`metric-cell ${sortMetricKey === "pins" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "pins")}</td>
											<td className={`metric-cell ${sortMetricKey === "techfalls" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "techfalls")}</td>
											<td className={`metric-cell ${sortMetricKey === "majorDecisions" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "majorDecisions")}</td>
											<td className={`metric-cell ${sortMetricKey === "decisions" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "decisions")}</td>
											<td className={`metric-cell ${sortMetricKey === "forfeits" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "forfeits")}</td>

											<td className={`metric-cell ${sortMetricKey === "takedowns" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "takedowns")}</td>
											<td className={`metric-cell ${sortMetricKey === "nearfalls" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "nearfalls")}</td>
											<td className={`metric-cell ${sortMetricKey === "reversals" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "reversals")}</td>
											<td className={`metric-cell ${sortMetricKey === "escapes" ? "highlight-col" : ""}`}>{formatMetricValue(wrestlerItem, "escapes")}</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Card-Based View for Mobile Devices */}
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
												<strong className="stat-label">Pts:</strong> {formatMetricValue(wrestlerItem, "points")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "wins" ? "highlight" : ""}`}>
												<strong className="stat-label">Wins:</strong> {formatMetricValue(wrestlerItem, "wins")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "pins" ? "highlight" : ""}`}>
												<strong className="stat-label">Pins:</strong> {formatMetricValue(wrestlerItem, "pins")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "techfalls" ? "highlight" : ""}`}>
												<strong className="stat-label">TF:</strong> {formatMetricValue(wrestlerItem, "techfalls")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "majorDecisions" ? "highlight" : ""}`}>
												<strong className="stat-label">MD:</strong> {formatMetricValue(wrestlerItem, "majorDecisions")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "decisions" ? "highlight" : ""}`}>
												<strong className="stat-label">Dec:</strong> {formatMetricValue(wrestlerItem, "decisions")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "forfeits" ? "highlight" : ""}`}>
												<strong className="stat-label">Forf:</strong> {formatMetricValue(wrestlerItem, "forfeits")}
											</span>
										</div>
									</div>

									<div className="mobile-metric-section">
										<span className="mobile-section-title">Scoring:</span>
										<div className="mobile-inline-stats">
											<span className={`stat-inline-item ${sortMetricKey === "takedowns" ? "highlight" : ""}`}>
												<strong className="stat-label">TD:</strong> {formatMetricValue(wrestlerItem, "takedowns")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "nearfalls" ? "highlight" : ""}`}>
												<strong className="stat-label">NF:</strong> {formatMetricValue(wrestlerItem, "nearfalls")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "reversals" ? "highlight" : ""}`}>
												<strong className="stat-label">Rev:</strong> {formatMetricValue(wrestlerItem, "reversals")}
											</span>
											<span className={`stat-inline-item ${sortMetricKey === "escapes" ? "highlight" : ""}`}>
												<strong className="stat-label">Esc:</strong> {formatMetricValue(wrestlerItem, "escapes")}
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

const DualReport = () => {
	const seasonOptions = getSeasonOptions(new Date());
	
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [events, setEvents] = useState([]);
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
				const fetchedEvents = responseData.events || [];
				const filteredDuals = fetchedEvents.filter(eventItem => eventItem.eventType === "Dual");

				setLoggedInUser(responseData.loggedInUser);
				setEvents(fetchedEvents);
				setDuals(filteredDuals);
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
		return !isCompleted && new Date(dualItem.date) >= todayDate;
	}).sort((firstDual, secondDual) => new Date(firstDual.date) - new Date(secondDual.date));
	
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
										<option key={option.name} value={option.name}>{option.name}</option>
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
								<div className="report-charts-row">
									<div className="report-chart-card">
										<h3 className="chart-card-title">Dual Meets Overview</h3>
										<DualsPieChart dualsList={duals} />
									</div>
									<div className="report-chart-card">
										<h3 className="chart-card-title">Points Overview</h3>
										<PointsPieChart dualsList={duals} />
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
						) : activeView === "leaderboard" ? (
							<WrestlerLeaderboard eventsData={events} seasonName={seasonName} />
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
							className={`navItem ${activeView === "leaderboard" ? "active" : ""}`}
							onClick={() => setActiveView("leaderboard")}
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M6 9H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3M18 9h3a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-3M4 22h16M10 14.66V17M14 14.66V17M18 2h-4v7a2 2 0 0 1-4 0V2H6v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V2z" />
							</svg>
							<span>Leaderboard</span>
						</div>
					</div>
					</>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<DualReport />);
