import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/dualreport.css";

// ============================================================================
// TOP-OF-PAGE PURE LOGIC & DATA PROCESSING FUNCTIONS
// ============================================================================

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"];

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
		else matchPoints = 3;

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

const generateBarSvgPath = (coordinateX, coordinateY, widthValue, heightValue, isUpwards, cornerRadius = 4) => {
	if (heightValue <= 0) return "";
	const radiusValue = Math.min(cornerRadius, heightValue, widthValue / 2);
	if (isUpwards) {
		return `M ${coordinateX},${coordinateY + heightValue} L ${coordinateX},${coordinateY + radiusValue} A ${radiusValue},${radiusValue} 0 0,1 ${coordinateX + radiusValue},${coordinateY} L ${coordinateX + widthValue - radiusValue},${coordinateY} A ${radiusValue},${radiusValue} 0 0,1 ${coordinateX + widthValue},${coordinateY + radiusValue} L ${coordinateX + widthValue},${coordinateY + heightValue} Z`;
	} else {
		return `M ${coordinateX},${coordinateY} L ${coordinateX},${coordinateY + heightValue - radiusValue} A ${radiusValue},${radiusValue} 0 0,0 ${coordinateX + radiusValue},${coordinateY + heightValue} L ${coordinateX + widthValue - radiusValue},${coordinateY + heightValue} A ${radiusValue},${radiusValue} 0 0,0 ${coordinateX + widthValue},${coordinateY + heightValue - radiusValue} L ${coordinateX + widthValue},${coordinateY} Z`;
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

const parseWeightClassNumeric = (rawWeightClass) => {
	if (!rawWeightClass) return null;
	const digitMatch = rawWeightClass.toString().match(/\d+/);
	if (!digitMatch) return null;
	const numericDigits = digitMatch[0];
	if (numericDigits.length < 3) return null;
	return numericDigits;
};

const processWeightClassData = (dualEvents) => {
	const completedDuals = dualEvents.filter(dualItem => dualItem.matches && dualItem.matches.length > 0);

	const statsByWeightClass = {};
	WEIGHT_CLASSES.forEach(weightClass => {
		statsByWeightClass[weightClass] = {
			weightClass: weightClass,
			wins: 0,
			losses: 0,
			points: 0,
			totalMatches: 0,
			wrestlerRecords: {}
		};
	});

	completedDuals.forEach(dualItem => {
		(dualItem.matches || []).forEach(matchItem => {
			const parsedWeightClass = parseWeightClassNumeric(matchItem.weightClass);
			if (!parsedWeightClass || !statsByWeightClass[parsedWeightClass]) {
				return;
			}

			const winType = (matchItem.winType || "").toUpperCase();
			let matchPoints = 3;
			if (winType === "DEC") matchPoints = 3;
			else if (winType === "MD") matchPoints = 4;
			else if (winType === "TF") matchPoints = 5;
			else if (["F", "FF", "FOR", "DQ", "DEF"].includes(winType)) matchPoints = 6;

			const fortMillWrestler = (matchItem.wrestlers || []).find(wrestlerItem => wrestlerItem.team.toLowerCase() === "fort mill");

			if (fortMillWrestler) {
				const wrestlerName = fortMillWrestler.name || "Unknown Wrestler";
				const wrestlerId = fortMillWrestler.wrestlerId || fortMillWrestler.id || fortMillWrestler.sqlId || fortMillWrestler._id;
				if (!statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName]) {
					statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName] = {
						id: wrestlerId,
						name: wrestlerName,
						wins: 0,
						losses: 0,
						points: 0
					};
				} else if (!statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName].id && wrestlerId) {
					statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName].id = wrestlerId;
				}

				statsByWeightClass[parsedWeightClass].totalMatches += 1;
				if (fortMillWrestler.isWinner) {
					statsByWeightClass[parsedWeightClass].wins += 1;
					statsByWeightClass[parsedWeightClass].points += matchPoints;
					statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName].wins += 1;
					statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName].points += matchPoints;
				} else {
					statsByWeightClass[parsedWeightClass].losses += 1;
					statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName].losses += 1;
				}
			}
		});
	});

	return WEIGHT_CLASSES.map(weightClass => {
		const weightClassData = statsByWeightClass[weightClass];
		const wrestlerItems = Object.values(weightClassData.wrestlerRecords).map(wrestlerItem => {
			const totalMatches = wrestlerItem.wins + wrestlerItem.losses;
			return {
				...wrestlerItem,
				winPercentage: totalMatches > 0 ? (wrestlerItem.wins / totalMatches) * 100 : 0
			};
		}).sort((firstWrestler, secondWrestler) => secondWrestler.points - firstWrestler.points);

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
			wrestlers: wrestlerItems
		};
	});
};

const calculateSeasonKpiMetrics = (dualEvents) => {
	const completedDuals = dualEvents.filter(dualItem => dualItem.matches && dualItem.matches.length > 0);
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

	const todayDate = new Date();
	const upcomingDuals = dualEvents.filter(dualItem => {
		const isCompleted = dualItem.matches && dualItem.matches.length > 0;
		return !isCompleted && new Date(dualItem.date) >= todayDate;
	}).sort((firstDual, secondDual) => new Date(firstDual.date) - new Date(secondDual.date));

	const nextUpcomingDual = upcomingDuals.length > 0 ? upcomingDuals[0] : null;

	return {
		completedDuals,
		totalWinsCount,
		totalLossesCount,
		totalPointsForSum,
		totalPointsAgainstSum,
		winPercentageRatio,
		netPointsDifferenceVal,
		nextUpcomingDual
	};
};

// ============================================================================
// PRESENTATION JSX COMPONENTS
// ============================================================================

const DonutChartSvg = ({ dataMetrics, chartSize = 220, innerRadiusValue = 68, centerContent }) => {
	const [hoveredIndex, setHoveredIndex] = useState(null);
	const totalValue = dataMetrics.reduce((runningSum, dataPoint) => runningSum + dataPoint.value, 0);

	if (totalValue === 0) {
		return <div className="no-chart-data">No data recorded for this season.</div>;
	}

	const centerCoordinateX = chartSize / 2;
	const centerCoordinateY = chartSize / 2;
	const outerRadiusValue = (chartSize / 2) - 10;
	const innerRadius = innerRadiusValue;

	let cumulativeAngle = -Math.PI / 2;

	const pieSlices = dataMetrics.map((dataPoint, indexValue) => {
		const angleValue = totalValue > 0 ? (dataPoint.value / totalValue) * 2 * Math.PI : 0;
		const startAngle = cumulativeAngle;
		const endAngle = cumulativeAngle + angleValue;
		cumulativeAngle = endAngle;

		const percentageText = totalValue > 0 ? ((dataPoint.value / totalValue) * 100).toFixed(1) : "0.0";
		const isFullCircle = angleValue >= 2 * Math.PI - 0.0001;

		let pathDataText = "";
		if (isFullCircle) {
			pathDataText = `M ${centerCoordinateX - outerRadiusValue} ${centerCoordinateY} A ${outerRadiusValue} ${outerRadiusValue} 0 1 0 ${centerCoordinateX + outerRadiusValue} ${centerCoordinateY} A ${outerRadiusValue} ${outerRadiusValue} 0 1 0 ${centerCoordinateX - outerRadiusValue} ${centerCoordinateY} M ${centerCoordinateX - innerRadius} ${centerCoordinateY} A ${innerRadius} ${innerRadius} 0 1 1 ${centerCoordinateX + innerRadius} ${centerCoordinateY} A ${innerRadius} ${innerRadius} 0 1 1 ${centerCoordinateX - innerRadius} ${centerCoordinateY} Z`;
		} else if (angleValue > 0) {
			const xOuterStart = centerCoordinateX + outerRadiusValue * Math.cos(startAngle);
			const yOuterStart = centerCoordinateY + outerRadiusValue * Math.sin(startAngle);
			const xOuterEnd = centerCoordinateX + outerRadiusValue * Math.cos(endAngle);
			const yOuterEnd = centerCoordinateY + outerRadiusValue * Math.sin(endAngle);

			const xInnerStart = centerCoordinateX + innerRadius * Math.cos(startAngle);
			const yInnerStart = centerCoordinateY + innerRadius * Math.sin(startAngle);
			const xInnerEnd = centerCoordinateX + innerRadius * Math.cos(endAngle);
			const yInnerEnd = centerCoordinateY + innerRadius * Math.sin(endAngle);

			const largeArcFlag = angleValue > Math.PI ? 1 : 0;

			pathDataText = `M ${xOuterStart} ${yOuterStart} A ${outerRadiusValue} ${outerRadiusValue} 0 ${largeArcFlag} 1 ${xOuterEnd} ${yOuterEnd} L ${xInnerEnd} ${yInnerEnd} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${xInnerStart} ${yInnerStart} Z`;
		}

		return {
			...dataPoint,
			indexValue,
			percentageText,
			isFullCircle,
			pathDataText
		};
	});

	return (
		<div className="donut-chart-container">
			<svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
				{pieSlices.map((sliceItem) => {
					if (sliceItem.value === 0) return null;
					const isHovered = hoveredIndex === sliceItem.indexValue;
					const categoryClass = sliceItem.key || sliceItem.label.toLowerCase().replace(/\s+/g, "-");

					return (
						<path
							key={sliceItem.label}
							d={sliceItem.pathDataText}
							fill={sliceItem.color}
							fillRule={sliceItem.isFullCircle ? "evenodd" : "nonzero"}
							className={`donut-slice ${categoryClass} ${isHovered ? "hovered" : ""}`}
							onMouseEnter={() => setHoveredIndex(sliceItem.indexValue)}
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
			{hoveredIndex !== null && pieSlices[hoveredIndex] && (
				<div className="pie-chart-tooltip-wrapper">
					<div className="pie-chart-tooltip-text">
						{pieSlices[hoveredIndex].label}: <strong>{pieSlices[hoveredIndex].value}</strong> ({pieSlices[hoveredIndex].percentageText}%)
					</div>
				</div>
			)}
		</div>
	);
};

const DualsPieChart = ({ dualEvents }) => {
	const completedDuals = dualEvents.filter(
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

	const remainingCount = Math.max(0, dualEvents.length - completedDuals.length);
	const totalDuals = winsCount + lossesCount + remainingCount;

	const chartMetrics = [
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
			<DonutChartSvg dataMetrics={chartMetrics} chartSize={220} centerContent={centerIndicator} />
			<div className="pie-chart-legend">
				{chartMetrics.map((item) => {
					const percentageText = totalDuals > 0 ? ((item.value / totalDuals) * 100).toFixed(1) : "0.0";
					return (
						<div key={item.label} className="pie-legend-item">
							<div className="pie-legend-left">
								<span className={`pie-legend-color ${item.key}`} />
								<span className="pie-legend-label">{item.label}</span>
							</div>
							<span className="pie-legend-value">{item.value} ({percentageText}%)</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};

const PointsPieChart = ({ dualEvents }) => {
	const completedDuals = dualEvents.filter(
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

	const chartMetrics = [
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
			<DonutChartSvg dataMetrics={chartMetrics} chartSize={220} centerContent={centerIndicator} />
			<div className="pie-chart-legend">
				{chartMetrics.map((item) => {
					const percentageText = totalPoints > 0 ? ((item.value / totalPoints) * 100).toFixed(1) : "0.0";
					return (
						<div key={item.label} className="pie-legend-item">
							<div className="pie-legend-left">
								<span className={`pie-legend-color ${item.key}`} />
								<span className="pie-legend-label">{item.label}</span>
							</div>
							<span className="pie-legend-value">{item.value} ({percentageText}%)</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};

const MatchDetailMatrix = ({ dualEvents }) => {
	const sortedDuals = [...dualEvents].sort((dualA, dualB) => new Date(dualA.date) - new Date(dualB.date));
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

const WeightClassChart = ({ chartMetrics }) => {
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

	const getXCoordinate = (indexVal) => paddingLeft + (indexVal + 0.5) * (availableWidth / chartMetrics.length);
	const getPointsY = (pts) => zeroY - (pts / 6) * heightRange;

	const gridlinesY = [
		paddingTop,
		paddingTop + heightRange * 0.25,
		paddingTop + heightRange * 0.5,
		paddingTop + heightRange * 0.75,
		zeroY
	];

	const pointsPath = chartMetrics.map((dataPoint, indexVal) => {
		return `${indexVal === 0 ? "M" : "L"} ${getXCoordinate(indexVal)} ${getPointsY(dataPoint.averagePoints)}`;
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
					{gridlinesY.map((yVal, gridIndex) => (
						<line
							key={`wc-grid-h-${gridIndex}`}
							x1={paddingLeft}
							y1={yVal}
							x2={chartWidth - paddingRight}
							y2={yVal}
							stroke="var(--outline)"
							strokeWidth={0.5}
							strokeDasharray="3,3"
						/>
					))}

					{chartMetrics.map((dataPoint, indexVal) => (
						<line
							key={`wc-grid-v-${indexVal}`}
							x1={getXCoordinate(indexVal)}
							y1={paddingTop}
							x2={getXCoordinate(indexVal)}
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

					{chartMetrics.map((dataPoint, indexVal) => {
						const step = availableWidth / chartMetrics.length;
						const barWidth = step * 0.55;
						const coordinateX = getXCoordinate(indexVal) - barWidth / 2;

						const barHeight = (dataPoint.winPercentage / 100) * heightRange;
						const coordinateY = zeroY - barHeight;
						const barPath = generateBarSvgPath(coordinateX, coordinateY, barWidth, barHeight, true);

						let barColor = "#ef4444";
						if (dataPoint.status === "Powerhouse") {
							barColor = "#10b981";
						} else if (dataPoint.status === "Stable") {
							barColor = "#f59e0b";
						}

						const isHovered = hoveredIndex === indexVal;

						return (
							<g key={`wc-bar-${indexVal}`}>
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

					{chartMetrics.map((dataPoint, indexVal) => {
						const coordinateX = getXCoordinate(indexVal);
						return (
							<text
								key={`wc-x-lbl-${indexVal}`}
								x={coordinateX}
								y={zeroY + 20}
								textAnchor="middle"
								fontFamily="var(--font-body)"
								fontSize={labelFontSize}
								fontWeight="700"
								fill="var(--on-surface-variant)"
							>
								{dataPoint.weightClass}
							</text>
						);
					})}

					{chartMetrics.length > 1 && (
						<path
							d={pointsPath}
							fill="none"
							stroke="var(--primary)"
							strokeWidth={2.5}
							style={{ pointerEvents: "none" }}
						/>
					)}

					{chartMetrics.map((dataPoint, indexVal) => {
						const coordinateX = getXCoordinate(indexVal);
						const ptsY = getPointsY(dataPoint.averagePoints);
						const isHovered = hoveredIndex === indexVal;

						return (
							<circle
								key={`wc-marker-${indexVal}`}
								cx={coordinateX}
								cy={ptsY}
								r={isHovered ? 6 : 4}
								fill="var(--primary)"
								stroke="#ffffff"
								strokeWidth={1.5}
								style={{ pointerEvents: "none", transition: "all 0.15s ease" }}
							/>
						);
					})}

					{chartMetrics.map((dataPoint, indexVal) => {
						const step = availableWidth / chartMetrics.length;
						const coordinateX = getXCoordinate(indexVal) - step / 2;
						return (
							<rect
								key={`wc-hover-${indexVal}`}
								x={coordinateX}
								y={paddingTop}
								width={step}
								height={heightRange}
								fill="transparent"
								style={{ cursor: "pointer" }}
								onMouseEnter={() => setHoveredIndex(indexVal)}
								onMouseLeave={() => setHoveredIndex(null)}
							/>
						);
					})}
				</svg>
			</div>

			{hoveredIndex !== null && (() => {
				const activeMetric = chartMetrics[hoveredIndex];
				return (
					<div className="season-chart-tooltip">
						<div className="season-chart-tooltip-title">
							{activeMetric.weightClass} LBS
						</div>
						<div className="season-chart-tooltip-content">
							<div className="season-chart-tooltip-col">
								Status: <span className={`status-text-${activeMetric.status === "Powerhouse" ? "powerhouse" : activeMetric.status === "Stable" ? "stable" : "wip"}`}>
									{activeMetric.status}
								</span>
								<br />
								Matches: {activeMetric.totalMatches}
								<br />
								Wins: {activeMetric.wins} | Losses: {activeMetric.losses}
							</div>
							<div className="season-chart-tooltip-col opponent-col">
								Win Rate: <strong>{activeMetric.winPercentage.toFixed(1)}%</strong>
								<br />
								Average Points: <strong>{activeMetric.averagePoints.toFixed(1)}</strong>
							</div>
						</div>
					</div>
				);
			})()}
		</div>
	);
};

const WeightClassListCards = ({ chartMetrics }) => {
	return (
		<div className="weight-comparison-grid">
			{chartMetrics.map((item) => {
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

const WeightClassOverview = ({ dualEvents }) => {
	const aggregatedData = processWeightClassData(dualEvents);

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
					<WeightClassChart chartMetrics={aggregatedData} />
				</div>
			</div>

			<div className="weight-matrix-section">
				<h3 className="matrix-section-title">Weight Class Depth</h3>
				<WeightClassListCards chartMetrics={aggregatedData} />
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
			.then(payload => {
				const fetchedEvents = payload.events || [];
				const filteredDuals = fetchedEvents.filter(eventItem => eventItem.eventType === "Dual");

				setLoggedInUser(payload.loggedInUser);
				setDuals(filteredDuals);
				setPageActive(true);
				setIsLoading(false);
			})
			.catch(fetchError => {
				console.warn("Error loading dual report details:", fetchError);
				setIsLoading(false);
			});
	}, [selectedSeason]);

	const {
		completedDuals,
		totalWinsCount,
		totalLossesCount,
		totalPointsForSum,
		totalPointsAgainstSum,
		winPercentageRatio,
		netPointsDifferenceVal,
		nextUpcomingDual
	} = calculateSeasonKpiMetrics(duals);

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
					<>
					<div className={`dualreport container ${pageActive ? "active" : ""}`}>
						<header>
							<h1>Duals Overview</h1>
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

						{activeView === "overview" ? (
							<>
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

								<div className="report-charts-row">
									<div className="report-chart-card">
										<h3 className="chart-card-title">Dual Meets Overview</h3>
										<DualsPieChart dualEvents={duals} />
									</div>
									<div className="report-chart-card">
										<h3 className="chart-card-title">Points Overview</h3>
										<PointsPieChart dualEvents={duals} />
									</div>
								</div>

								<div className="report-matrix-section">
									<h3 className="matrix-section-title">Duals</h3>
									<MatchDetailMatrix dualEvents={duals} />
								</div>
							</>
						) : activeView === "weight_classes" ? (
							<WeightClassOverview dualEvents={duals} />
						) : null}

					</div>

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
