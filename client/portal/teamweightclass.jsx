import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/dualreport.css";

// ============================================================================
// TOP-OF-PAGE PURE LOGIC & DATA PROCESSING FUNCTIONS
// ============================================================================

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"];

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

const generateBarSvgPath = (coordinateX, coordinateY, widthValue, heightValue, isUpwards, cornerRadius = 4) => {
	if (heightValue <= 0) return "";
	const radiusValue = Math.min(cornerRadius, heightValue, widthValue / 2);
	if (isUpwards) {
		return `M ${coordinateX},${coordinateY + heightValue} L ${coordinateX},${coordinateY + radiusValue} A ${radiusValue},${radiusValue} 0 0,1 ${coordinateX + radiusValue},${coordinateY} L ${coordinateX + widthValue - radiusValue},${coordinateY} A ${radiusValue},${radiusValue} 0 0,1 ${coordinateX + widthValue},${coordinateY + radiusValue} L ${coordinateX + widthValue},${coordinateY + heightValue} Z`;
	} else {
		return `M ${coordinateX},${coordinateY} L ${coordinateX},${coordinateY + heightValue - radiusValue} A ${radiusValue},${radiusValue} 0 0,0 ${coordinateX + radiusValue},${coordinateY + heightValue} L ${coordinateX + widthValue - radiusValue},${coordinateY + heightValue} A ${radiusValue},${radiusValue} 0 0,0 ${coordinateX + widthValue},${coordinateY + heightValue - radiusValue} L ${coordinateX + widthValue},${coordinateY} Z`;
	}
};

const parseWeightClassNumeric = (rawWeightClass) => {
	if (!rawWeightClass) return null;
	const digitMatch = rawWeightClass.toString().match(/\d+/);
	if (!digitMatch) return null;
	const numericDigits = digitMatch[0];
	if (numericDigits.length < 3) return null;
	return numericDigits;
};

const processWeightClassData = (seasonEvents, selectedDivisionSetting = "Varsity") => {
	const completedEvents = seasonEvents.filter(eventItem => eventItem.matches && eventItem.matches.length > 0);

	const statsByWeightClass = {};
	WEIGHT_CLASSES.forEach(weightClass => {
		statsByWeightClass[weightClass] = {
			weightClass: weightClass,
			wrestlerRecords: {}
		};
	});

	completedEvents.forEach(eventItem => {
		(eventItem.matches || []).forEach(matchItem => {
			const parsedWeightClass = parseWeightClassNumeric(matchItem.weightClass);
			if (!parsedWeightClass || !statsByWeightClass[parsedWeightClass]) {
				return;
			}

			const matchDivisionValue = matchItem.divisionConvert || eventItem.divisionConvert || matchItem.division || "Varsity";

			const winType = (matchItem.winType || "").toUpperCase();
			let matchPoints = 3;
			if (winType === "DEC") matchPoints = 3;
			else if (winType === "MD") matchPoints = 4;
			else if (winType === "TF") matchPoints = 5;
			else if (["F", "FF", "FOR", "DQ", "DEF"].includes(winType)) matchPoints = 6;

			const fortMillWrestler = (matchItem.wrestlers || []).find(wrestlerItem => wrestlerItem.team && wrestlerItem.team.toLowerCase() === "fort mill");

			if (fortMillWrestler) {
				const wrestlerName = fortMillWrestler.name || "Unknown Wrestler";
				const wrestlerId = fortMillWrestler.wrestlerId || fortMillWrestler.id || fortMillWrestler.sqlId || fortMillWrestler._id;

				if (!statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName]) {
					statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName] = {
						id: wrestlerId,
						name: wrestlerName,
						wins: 0,
						losses: 0,
						points: 0,
						wrestledDivisions: new Set()
					};
				} else if (!statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName].id && wrestlerId) {
					statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName].id = wrestlerId;
				}

				const wrestlerEntry = statsByWeightClass[parsedWeightClass].wrestlerRecords[wrestlerName];
				wrestlerEntry.wrestledDivisions.add(matchDivisionValue);

				if (fortMillWrestler.isWinner) {
					wrestlerEntry.wins += 1;
					wrestlerEntry.points += matchPoints;
				} else {
					wrestlerEntry.losses += 1;
				}
			}
		});
	});

	return WEIGHT_CLASSES.map(weightClass => {
		const weightClassData = statsByWeightClass[weightClass];

		const qualifiedWrestlers = Object.values(weightClassData.wrestlerRecords).filter(wrestlerItem => {
			if (selectedDivisionSetting === "All Divisions") return true;
			return wrestlerItem.wrestledDivisions.has(selectedDivisionSetting);
		});

		let weightClassWins = 0;
		let weightClassLosses = 0;
		let weightClassPoints = 0;
		let weightClassTotalMatches = 0;

		const wrestlerItems = qualifiedWrestlers.map(wrestlerItem => {
			const totalMatches = wrestlerItem.wins + wrestlerItem.losses;
			weightClassWins += wrestlerItem.wins;
			weightClassLosses += wrestlerItem.losses;
			weightClassPoints += wrestlerItem.points;
			weightClassTotalMatches += totalMatches;

			return {
				id: wrestlerItem.id,
				name: wrestlerItem.name,
				wins: wrestlerItem.wins,
				losses: wrestlerItem.losses,
				points: wrestlerItem.points,
				winPercentage: totalMatches > 0 ? (wrestlerItem.wins / totalMatches) * 100 : 0
			};
		}).sort((firstWrestler, secondWrestler) => secondWrestler.points - firstWrestler.points);

		const winPercentage = weightClassTotalMatches > 0 ? (weightClassWins / weightClassTotalMatches) * 100 : 0;
		const averagePoints = weightClassTotalMatches > 0 ? weightClassPoints / weightClassTotalMatches : 0;

		let status = "Work in Progress";
		if (winPercentage > 75) {
			status = "Powerhouse";
		} else if (winPercentage >= 50) {
			status = "Stable";
		}

		return {
			weightClass: weightClass,
			wins: weightClassWins,
			losses: weightClassLosses,
			points: weightClassPoints,
			totalMatches: weightClassTotalMatches,
			winPercentage: winPercentage,
			averagePoints: averagePoints,
			status: status,
			wrestlers: wrestlerItems
		};
	});
};

// ============================================================================
// PRESENTATION JSX COMPONENTS
// ============================================================================

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

const WeightClassOverview = ({ seasonEvents, selectedDivisionSetting }) => {
	const aggregatedData = processWeightClassData(seasonEvents, selectedDivisionSetting);

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

const TeamWeightClass = () => {
	const seasonOptions = getSeasonOptions(new Date());
	
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [events, setEvents] = useState([]);
	const [selectedSeason, setSelectedSeason] = useState(seasonOptions[1].name);
	const [selectedDivisionSetting, setSelectedDivisionSetting] = useState("Varsity");

	useEffect(() => {
		setIsLoading(true);
		
		const fetchUrl = `/api/teamweightclassload?season=${selectedSeason}`;
		
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
				setLoggedInUser(payload.loggedInUser);
				setEvents(fetchedEvents);
				setPageActive(true);
				setIsLoading(false);
			})
			.catch(fetchError => {
				console.warn("Error loading weight class details:", fetchError);
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
							<h1>Weight Classes Overview</h1>
						</header>

						<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', margin: '20px 0', flexWrap: 'wrap' }}>
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

							<div className="division-selector-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
						</div>

						<WeightClassOverview seasonEvents={events} selectedDivisionSetting={selectedDivisionSetting} />
					</div>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamWeightClass />);
