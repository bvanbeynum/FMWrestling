import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import "./include/index.css";
import "./include/wrestlerreport.css";

const InteractiveOpponentGraphComponent = ({ wrestler }) => {
	const [ timeframeMonths, setTimeframeMonths ] = useState("1");
	const [ columns, setColumns ] = useState([]);
	const [ isGraphLoading, setIsGraphLoading ] = useState(false);

	const loadInitialColumn = async (monthsValue) => {
		if (!wrestler || !wrestler.sqlId) return;
		setIsGraphLoading(true);

		try {
			const fetchResponse = await fetch(`/api/wrestlergraph?id=${ wrestler.sqlId }&months=${ monthsValue || "" }`);
			if (fetchResponse.ok) {
				const graphData = await fetchResponse.json();
				const initialColumn = {
					depth: 0,
					wrestlerId: wrestler.sqlId,
					wrestlerName: wrestler.name,
					selectedOpponentId: null,
					opponents: graphData.connections || []
				};

				setColumns([ initialColumn ]);
			}
		}
		catch (error) {
			console.warn(error);
		}
		finally {
			setIsGraphLoading(false);
		}
	};

	useEffect(() => {
		loadInitialColumn(timeframeMonths);
	}, [ timeframeMonths, wrestler ]);

	const handleOpponentClick = async (clickedOpponentItem, columnDepthIndex) => {
		const clickedOpponentId = clickedOpponentItem.opponent.id;

		const updatedColumns = columns.slice(0, columnDepthIndex + 1).map((columnItem, index) => {
			if (index === columnDepthIndex) {
				return { ...columnItem, selectedOpponentId: clickedOpponentId };
			}
			return columnItem;
		});

		setColumns(updatedColumns);
		setIsGraphLoading(true);

		try {
			const fetchResponse = await fetch(`/api/wrestlergraph?id=${ clickedOpponentId }&months=${ timeframeMonths || "" }`);
			if (fetchResponse.ok) {
				const graphData = await fetchResponse.json();
				const newColumn = {
					depth: columnDepthIndex + 1,
					wrestlerId: clickedOpponentId,
					wrestlerName: clickedOpponentItem.opponent.name,
					selectedOpponentId: null,
					opponents: graphData.connections || []
				};

				setColumns([ ...updatedColumns, newColumn ]);
			}
		}
		catch (error) {
			console.warn(error);
		}
		finally {
			setIsGraphLoading(false);
		}
	};

	return (
		<section className="report-section-panel">
			<div className="section-panel-title">
				<span>OPPONENT NETWORK EXPLORER</span>
				<div className="graph-controls-group">
					<span className="control-label">Timeframe:</span>
					<button className={`timeframe-btn ${ timeframeMonths === "1" ? "active" : "" }`} onClick={ () => setTimeframeMonths("1") }>1 Month</button>
					<button className={`timeframe-btn ${ timeframeMonths === "3" ? "active" : "" }`} onClick={ () => setTimeframeMonths("3") }>3 Months</button>
					<button className={`timeframe-btn ${ timeframeMonths === "6" ? "active" : "" }`} onClick={ () => setTimeframeMonths("6") }>6 Months</button>
					<button className={`timeframe-btn ${ timeframeMonths === "12" ? "active" : "" }`} onClick={ () => setTimeframeMonths("12") }>1 Year</button>
					<button className={`timeframe-btn ${ timeframeMonths === "" ? "active" : "" }`} onClick={ () => setTimeframeMonths("") }>All Time</button>
					<button className="reset-graph-btn" onClick={ () => loadInitialColumn(timeframeMonths) }>Reset</button>
				</div>
			</div>

			<div className="miller-columns-scroll-container">
				{ isGraphLoading ? <div className="graph-overlay-loading">Loading Opponent Data...</div> : null }

				<div className="miller-columns-flow">
					{ columns.map((columnItem, columnIndex) => (
						<div key={ `${ columnItem.wrestlerId }-${ columnIndex }` } className="miller-column">
							<div className="miller-column-header">
								<div className="column-header-title">
									<span className="column-depth-tag">DEPTH { columnItem.depth }</span>
									<span className="column-wrestler-name">{ columnItem.wrestlerName }</span>
									<a
										href={ `/portal/wrestlerreport.html?id=${ columnItem.wrestlerId }` }
										target="_blank"
										rel="noopener noreferrer"
										className="wrestler-external-link"
										title="Open Wrestler Report in New Tab"
										onClick={ (clickEvent) => clickEvent.stopPropagation() }
									>
										<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
											<polyline points="15 3 21 3 21 9" />
											<line x1="10" y1="14" x2="21" y2="3" />
										</svg>
									</a>
								</div>
								<span className="column-count-sub">{ columnItem.opponents.length } { columnItem.opponents.length === 1 ? "Opponent" : "Opponents" }</span>
							</div>

							<div className="miller-column-list">
								{ columnItem.opponents.length === 0 ? (
									<div className="empty-column-state">No Opponents Found in Timeframe</div>
								) : (
									columnItem.opponents.map((opponentConnectionItem, opponentIndex) => {
										const opponentObj = opponentConnectionItem.opponent;
										const matchObj = opponentConnectionItem.match;
										const isSelected = columnItem.selectedOpponentId === opponentObj.id;

										return (
											<div
												key={ `${ opponentObj.id }-${ opponentIndex }` }
												className={`miller-opponent-card ${ isSelected ? "active-selected" : "" } ${ opponentObj.isFortMill ? "fortmill-card" : "" }`}
												onClick={ () => handleOpponentClick(opponentConnectionItem, columnIndex) }
											>
												<div className="miller-card-info">
													<div className="miller-name-row">
														<span className="miller-opponent-name">{ opponentObj.name }</span>
														{ opponentObj.isFortMill ? <span className="fortmill-tag">FORT MILL</span> : null }
													</div>

													<div className="miller-match-row">
														<span className={`match-result-badge ${ matchObj.isWinner ? "win" : "loss" }`}>
															{ matchObj.isWinner ? "WIN" : "LOSS" }
														</span>
														{ matchObj.winType ? <span className="miller-wintype">{ matchObj.winType }</span> : null }
														<span className="miller-match-date">{ matchObj.eventDate }</span>
													</div>
												</div>

												<div className="miller-card-arrow">
													<svg viewBox="0 0 24 24" width="16" height="16">
														<path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
													</svg>
												</div>
											</div>
										);
									})
								) }
							</div>
						</div>
					)) }
				</div>
			</div>
		</section>
	);
};

const computeRatingChartData = (ratingHistory, currentContainerWidth) => {
	if (!ratingHistory || ratingHistory.length <= 1) return null;

	const chartHeight = 220;
	const chartPaddingLeft = 50;
	const chartPaddingRight = 25;
	const chartPaddingTop = 20;
	const chartPaddingBottom = 40;

	const chartDrawableWidth = Math.max(100, currentContainerWidth - chartPaddingLeft - chartPaddingRight);
	const chartDrawableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

	const totalRatingPoints = ratingHistory.length;

	const minimumRatingValue = ratingHistory.reduce(
		(currentMinimum, ratingRecord) => 
			(ratingRecord.rating - ratingRecord.deviation) < currentMinimum 
				? (ratingRecord.rating - ratingRecord.deviation) 
				: currentMinimum,
		ratingHistory[0].rating - ratingHistory[0].deviation
	);

	const maximumRatingValue = ratingHistory.reduce(
		(currentMaximum, ratingRecord) => 
			(ratingRecord.rating + ratingRecord.deviation) > currentMaximum 
				? (ratingRecord.rating + ratingRecord.deviation) 
				: currentMaximum,
		ratingHistory[0].rating + ratingHistory[0].deviation
	);

	const ratingRangeValue = maximumRatingValue - minimumRatingValue === 0 ? 1 : maximumRatingValue - minimumRatingValue;

	const estimatedLabelWidth = 45;
	const minimumLabelGap = 15;
	const labelSlotWidth = estimatedLabelWidth + minimumLabelGap;
	const maxAllowedLabels = Math.max(2, Math.floor(chartDrawableWidth / labelSlotWidth));

	const visibleLabelIndices = new Set();
	if (totalRatingPoints <= maxAllowedLabels) {
		for (let ratingPointIndex = 0; ratingPointIndex < totalRatingPoints; ratingPointIndex++) {
			visibleLabelIndices.add(ratingPointIndex);
		}
	} else {
		const labelIndexStep = (totalRatingPoints - 1) / (maxAllowedLabels - 1);
		for (let labelStepMultiplier = 0; labelStepMultiplier < maxAllowedLabels; labelStepMultiplier++) {
			const calculatedIndex = Math.round(labelStepMultiplier * labelIndexStep);
			visibleLabelIndices.add(calculatedIndex);
		}
		visibleLabelIndices.add(totalRatingPoints - 1);
	}

	const ratingGraphPoints = ratingHistory.map((ratingRecord, ratingPointIndex) => {
		const horizontalCoordinate = totalRatingPoints > 1 
			? chartPaddingLeft + (ratingPointIndex * (chartDrawableWidth / (totalRatingPoints - 1)))
			: chartPaddingLeft + (chartDrawableWidth / 2);

		const verticalCoordinate = chartHeight - chartPaddingBottom - (((ratingRecord.rating - minimumRatingValue) / ratingRangeValue) * chartDrawableHeight);

		const shouldDisplayLabel = visibleLabelIndices.has(ratingPointIndex);

		return {
			x: horizontalCoordinate,
			y: verticalCoordinate,
			rating: ratingRecord.rating,
			date: ratingRecord.periodEndDate,
			shouldDisplayLabel: shouldDisplayLabel
		};
	});

	const linePathText = "M" + ratingGraphPoints.map(pointRecord => `${ pointRecord.x } ${ pointRecord.y }`).join(" L");

	const areaPoints = ratingHistory.map((ratingRecord, ratingPointIndex) => {
		const horizontalCoordinate = totalRatingPoints > 1 
			? chartPaddingLeft + (ratingPointIndex * (chartDrawableWidth / (totalRatingPoints - 1)))
			: chartPaddingLeft + (chartDrawableWidth / 2);

		const upperVerticalCoordinate = chartHeight - chartPaddingBottom - (((ratingRecord.rating + ratingRecord.deviation - minimumRatingValue) / ratingRangeValue) * chartDrawableHeight);
		const lowerVerticalCoordinate = chartHeight - chartPaddingBottom - (((ratingRecord.rating - ratingRecord.deviation - minimumRatingValue) / ratingRangeValue) * chartDrawableHeight);
		return { x: horizontalCoordinate, upperY: upperVerticalCoordinate, lowerY: lowerVerticalCoordinate };
	});

	const upperPathText = areaPoints.map(pointRecord => `${ pointRecord.x } ${ pointRecord.upperY }`).join(" L ");
	const lowerPathText = [ ...areaPoints ].reverse().map(pointRecord => `${ pointRecord.x } ${ pointRecord.lowerY }`).join(" L ");
	const areaPathText = `M ${ upperPathText } L ${ lowerPathText } Z`;

	const yAxisTicks = [ 0, 0.33, 0.66, 1 ].map(tickFraction => {
		const tickRating = minimumRatingValue + (tickFraction * ratingRangeValue);
		const tickVerticalCoordinate = chartHeight - chartPaddingBottom - (tickFraction * chartDrawableHeight);
		return { rating: Math.round(tickRating), y: tickVerticalCoordinate };
	});

	return {
		width: currentContainerWidth,
		height: chartHeight,
		paddingLeft: chartPaddingLeft,
		paddingBottom: chartPaddingBottom,
		points: ratingGraphPoints,
		path: linePathText,
		areaPath: areaPathText,
		ticks: yAxisTicks
	};
};

const WrestlerReportComponent = () => {

	const [ isLoading, setIsLoading ] = useState(false);
	const [ wrestler, setWrestler ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ activeView, setActiveView ] = useState("events");
	const [ expandedEventIds, setExpandedEventIds ] = useState([]);
	const [ timeframeFilter, setTimeframeFilter ] = useState("this_season");

	const chartContainerRef = useRef(null);
	const [ chartContainerWidth, setChartContainerWidth ] = useState(800);

	useEffect(() => {
		if (!chartContainerRef.current) return;

		const updateContainerWidth = () => {
			if (chartContainerRef.current) {
				const measuredWidth = chartContainerRef.current.clientWidth;
				if (measuredWidth > 0) {
					setChartContainerWidth(measuredWidth);
				}
			}
		};

		updateContainerWidth();

		const resizeObserver = new ResizeObserver(() => {
			updateContainerWidth();
		});

		resizeObserver.observe(chartContainerRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [ activeView ]);

	const seasonStart = useMemo(() => {
		const currentDate = new Date();
		return currentDate > new Date(currentDate.getFullYear(), 11, 1)
			? new Date(currentDate.getFullYear(), 8, 1)
			: new Date(currentDate.getFullYear() - 1, 8, 1);
	}, []);

	const filteredEvents = useMemo(() => {
		if (!wrestler || !wrestler.events) return [];

		return wrestler.events.filter(eventItem => {
			const eventDate = eventItem.date instanceof Date ? eventItem.date : new Date(eventItem.date);
			const month = eventDate.getMonth();
			const date = eventDate.getDate();
			// Nov (10), Dec (11), Jan (0), Feb (1), or Mar 1st (month 2, date <= 1)
			const isInSeasonWindow = month === 10 || month === 11 || month === 0 || month === 1 || (month === 2 && date <= 1);

			if (timeframeFilter === "this_season") {
				return eventDate >= seasonStart && isInSeasonWindow;
			}
			if (timeframeFilter === "in_season") {
				return isInSeasonWindow;
			}
			// "all_events"
			return true;
		});
	}, [ wrestler, timeframeFilter, seasonStart ]);

	const winTypeChartData = useMemo(() => {
		const parsedMatchesList = filteredEvents.flatMap(eventItem => (eventItem.matches || []).map(matchItem => ({
			isWinner: matchItem.isWinner,
			winType: /fall/i.test(matchItem.winType) ? "F" 
				: /tf/i.test(matchItem.winType) ? "TF" 
				: /dec/i.test(matchItem.winType) ? "DEC" 
				: /sv/i.test(matchItem.winType) ? "DEC"
				: /md/i.test(matchItem.winType) ? "MD" 
				: /maj/i.test(matchItem.winType) ? "MD" 
				: matchItem.winType
		}))).filter(matchItem => [ "F", "TF", "MD", "DEC" ].includes(matchItem.winType));

		const winTypesData = {
			types: [
				parsedMatchesList.filter(matchItem => matchItem.winType === "F" && matchItem.isWinner).length,
				parsedMatchesList.filter(matchItem => matchItem.winType === "DEC" && matchItem.isWinner).length,
				parsedMatchesList.filter(matchItem => matchItem.winType === "TF" && matchItem.isWinner).length,
				parsedMatchesList.filter(matchItem => matchItem.winType === "MD" && matchItem.isWinner).length
			]
		};

		const loseTypesData = {
			types: [
				parsedMatchesList.filter(matchItem => matchItem.winType === "F" && !matchItem.isWinner).length,
				parsedMatchesList.filter(matchItem => matchItem.winType === "DEC" && !matchItem.isWinner).length,
				parsedMatchesList.filter(matchItem => matchItem.winType === "TF" && !matchItem.isWinner).length,
				parsedMatchesList.filter(matchItem => matchItem.winType === "MD" && !matchItem.isWinner).length
			]
		};

		winTypesData.max = winTypesData.types.reduce((outputMax, currentVal) => outputMax > currentVal ? outputMax : currentVal, 0) || 1;
		loseTypesData.max = loseTypesData.types.reduce((outputMax, currentVal) => outputMax > currentVal ? outputMax : currentVal, 0) || 1;

		winTypesData.points = winTypesData.types.map((typeVal, typeIndex) => ([ 0, 3 ].includes(typeIndex) ? -1 : 1) * (typeVal * 80) / winTypesData.max);
		loseTypesData.points = loseTypesData.types.map((typeVal, typeIndex) => ([ 0, 3 ].includes(typeIndex) ? -1 : 1) * (typeVal * 80) / loseTypesData.max);

		winTypesData.labels = winTypesData.points.map((pointVal, pointIndex) => ({ x: pointIndex % 2 === 0 ? 5 : pointVal, y: pointIndex % 2 === 0 ? pointVal : -5, text: winTypesData.types[pointIndex] }));
		loseTypesData.labels = loseTypesData.points.map((pointVal, pointIndex) => ({ x: pointIndex % 2 === 0 ? 5 : pointVal, y: pointIndex % 2 === 0 ? pointVal : -5, text: loseTypesData.types[pointIndex] }));

		winTypesData.path = "M" + winTypesData.points.map((pointVal, pointIndex) => pointIndex % 2 === 0 ? "0 " + pointVal : pointVal + " 0").join(",L") + ",L0 " + winTypesData.points[0];
		loseTypesData.path = "M" + loseTypesData.points.map((pointVal, pointIndex) => pointIndex % 2 === 0 ? "0 " + pointVal : pointVal + " 0").join(",L") + ",L0 " + loseTypesData.points[0];

		return {
			win: winTypesData,
			lose: loseTypesData
		};
	}, [ filteredEvents ]);

	// Compute Scoring Actions statistics for Style tab (unconditional hook)
	const scoringStats = useMemo(() => {
		if (!filteredEvents || filteredEvents.length === 0) {
			return {
				totalTakedowns: 0,
				totalNearfalls: 0,
				totalReversals: 0,
				totalEscapes: 0,
				avgTakedowns: "0.0",
				avgNearfalls: "0.0",
				avgReversals: "0.0",
				avgEscapes: "0.0",
				qualifyingMatchesCount: 0
			};
		}

		const allMatchesList = filteredEvents.flatMap(eventItem => eventItem.matches || []);
		
		let totalTakedowns = 0;
		let totalNearfalls = 0;
		let totalReversals = 0;
		let totalEscapes = 0;
		let qualifyingMatchesCount = 0;

		allMatchesList.forEach(matchItem => {
			let takedowns = Number(matchItem.takedowns || matchItem.takedown || matchItem.scores?.takedowns || 0);
			let nearfalls = Number(matchItem.nearfalls || matchItem.nearfall || matchItem.scores?.nearfalls || 0);
			let reversals = Number(matchItem.reversals || matchItem.reversal || matchItem.reverses || matchItem.reverse || matchItem.scores?.reversals || 0);
			let escapes = Number(matchItem.escapes || matchItem.escape || matchItem.scores?.escapes || 0);

			if ((!takedowns && !nearfalls && !reversals && !escapes) && Array.isArray(matchItem.wrestlers)) {
				const targetWrestler = matchItem.wrestlers.find(w => 
					(w.wrestlerId && wrestler && w.wrestlerId === wrestler.id) ||
					(w.name && wrestler && wrestler.name && w.name.toLowerCase() === wrestler.name.toLowerCase()) ||
					w.isWinner === matchItem.isWinner
				);
				if (targetWrestler) {
					takedowns = Number(targetWrestler.takedowns || targetWrestler.scores?.takedowns || 0);
					nearfalls = Number(targetWrestler.nearfalls || targetWrestler.scores?.nearfalls || 0);
					reversals = Number(targetWrestler.reversals || targetWrestler.scores?.reversals || 0);
					escapes = Number(targetWrestler.escapes || targetWrestler.scores?.escapes || 0);
				}
			}

			totalTakedowns += takedowns;
			totalNearfalls += nearfalls;
			totalReversals += reversals;
			totalEscapes += escapes;

			if ((takedowns + nearfalls + reversals + escapes) > 0) {
				qualifyingMatchesCount++;
			}
		});

		const avgTakedowns = qualifyingMatchesCount > 0 ? (totalTakedowns / qualifyingMatchesCount).toFixed(1) : "0.0";
		const avgNearfalls = qualifyingMatchesCount > 0 ? (totalNearfalls / qualifyingMatchesCount).toFixed(1) : "0.0";
		const avgReversals = qualifyingMatchesCount > 0 ? (totalReversals / qualifyingMatchesCount).toFixed(1) : "0.0";
		const avgEscapes = qualifyingMatchesCount > 0 ? (totalEscapes / qualifyingMatchesCount).toFixed(1) : "0.0";

		return {
			totalTakedowns,
			totalNearfalls,
			totalReversals,
			totalEscapes,
			avgTakedowns,
			avgNearfalls,
			avgReversals,
			avgEscapes,
			qualifyingMatchesCount
		};
	}, [ filteredEvents, wrestler ]);

	const ratingChartData = useMemo(() => {
		if (!wrestler || !wrestler.ratingHistory) return null;
		return computeRatingChartData(wrestler.ratingHistory, chartContainerWidth);
	}, [ wrestler, chartContainerWidth ]);

	const ratingTableRecords = useMemo(() => {
		if (!wrestler || !wrestler.ratingHistory) return [];

		const fullRatingHistory = wrestler.ratingHistory;

		return fullRatingHistory.map((ratingRecord, ratingRecordIndex) => {
			const isOldestRecord = ratingRecordIndex === fullRatingHistory.length - 1;
			const previousRatingRecord = !isOldestRecord ? fullRatingHistory[ratingRecordIndex + 1] : null;

			const ratingDifference = previousRatingRecord ? (ratingRecord.rating - previousRatingRecord.rating) : 0;
			const isRatingChanged = isOldestRecord || Math.abs(ratingDifference) >= 0.1;

			return {
				...ratingRecord,
				ratingDifference: ratingDifference,
				isRatingChanged: isRatingChanged
			};
		}).filter(ratingRecord => ratingRecord.isRatingChanged);
	}, [ wrestler ]);

	useEffect(() => {
		if (!isLoading && !wrestler) {
			setIsLoading(true);

			const urlParameters = new window.URLSearchParams(window.location.search);
			const wrestlerId = urlParameters.get("id");

			fetch(`/api/wrestlerdetails?id=${ wrestlerId }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					const processedEvents = (data.wrestler.events || []).map(eventItem => {
						const eventDate = new Date(eventItem.date);
						const formattedDivision = /(hs|high school|high)/i.test(eventItem.division) ? "Varsity"
							: /(jv|junior varsity)/i.test(eventItem.division) ? "JV"
							: /(ms|middle school)/i.test(eventItem.division) ? "MS"
							: (eventItem.division || "").trim();

						const eventWins = (eventItem.matches || []).filter(matchItem => matchItem.isWinner && matchItem.vs).length;
						const eventLosses = (eventItem.matches || []).filter(matchItem => !matchItem.isWinner && matchItem.vs).length;

						const eventPlace = (eventItem.matches || []).some(matchItem => matchItem.winType && /^(finals|1st place)/i.test(matchItem.round) && matchItem.isWinner) ? "1st"
							: (eventItem.matches || []).some(matchItem => matchItem.winType && /^(finals|1st place)/i.test(matchItem.round) && !matchItem.isWinner) ? "2nd"
							: (eventItem.matches || []).some(matchItem => matchItem.winType && /^3rd place/i.test(matchItem.round) && matchItem.isWinner) ? "3rd"
							: (eventItem.matches || []).some(matchItem => matchItem.winType && /^3rd place/i.test(matchItem.round) && !matchItem.isWinner) ? "4th"
							: (eventItem.matches || []).some(matchItem => matchItem.winType && /^5th place/i.test(matchItem.round) && matchItem.isWinner) ? "5th"
							: (eventItem.matches || []).some(matchItem => matchItem.winType && /^5th place/i.test(matchItem.round) && !matchItem.isWinner) ? "6th"
							: (eventItem.place || "DNP");

						return {
							...eventItem,
							date: eventDate,
							division: formattedDivision,
							wins: eventWins,
							losses: eventLosses,
							place: eventPlace
						};
					}).sort((eventFirst, eventSecond) => +eventSecond.date - +eventFirst.date);

					// Process 2 Year Rating History
					const rawRatingHistory = (data.wrestler.ratingHistory || []).map(ratingItem => ({
						...ratingItem,
						periodEndDate: new Date(new Date(ratingItem.periodEndDate).setHours(0,0,0,0))
					})).sort((ratingFirst, ratingSecond) => +ratingSecond.periodEndDate - +ratingFirst.periodEndDate);

					const latestRatingDate = rawRatingHistory[0] ? rawRatingHistory[0].periodEndDate : new Date();
					const twoYearsAgoDate = new Date(latestRatingDate);
					twoYearsAgoDate.setFullYear(twoYearsAgoDate.getFullYear() - 2);

					const filteredRatingHistory = rawRatingHistory.filter(ratingItem => ratingItem.periodEndDate >= twoYearsAgoDate)
						.map(ratingItem => {
							const matchingResults = processedEvents.filter(eventItem => 
								eventItem.date <= ratingItem.periodEndDate
								&& eventItem.date >= new Date(new Date(ratingItem.periodEndDate).setDate(ratingItem.periodEndDate.getDate() - 6))
							).flatMap(eventItem => (eventItem.matches || []).map(matchItem => ({
								eventDate: eventItem.date,
								eventName: eventItem.name,
								isWinner: matchItem.isWinner,
								vs: matchItem.vs,
								vsTeam: matchItem.vsTeam,
								vsRating: matchItem.vsRating,
								vsDeviation: matchItem.vsDeviation
							})));

							return {
								...ratingItem,
								results: matchingResults
							};
						});

					setWrestler({
						...data.wrestler,
						events: processedEvents,
						ratingHistory: filteredRatingHistory
					});

					setIsLoading(false);
					setLoggedInUser(data.loggedInUser);
				})
				.catch(error => {
					console.warn(error);
					setIsLoading(false);
				});
		}
	}, []);

	const toggleEventExpansion = eventSqlId => {
		setExpandedEventIds(previousExpandedIds => 
			previousExpandedIds.includes(eventSqlId)
				? previousExpandedIds.filter(id => id !== eventSqlId)
				: [ ...previousExpandedIds, eventSqlId ]
		);
	};

	if (isLoading || !wrestler) {
		return (
			<div className="pageLoading">
				<img src="/media/wrestlingloading.gif" alt="Loading" />
			</div>
		);
	}

	if (!loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("wrestlerResearch")) {
		return (
			<div className="noAccess">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
				<a>Unauthorized</a>
			</div>
		);
	}

	const allMatches = filteredEvents.flatMap(eventItem => eventItem.matches || []).filter(matchItem => matchItem.vs);
	const totalWins = allMatches.filter(matchItem => matchItem.isWinner).length;
	const totalLosses = allMatches.filter(matchItem => !matchItem.isWinner).length;
	const totalMatchesCount = totalWins + totalLosses;
	const winPercentText = totalMatchesCount > 0 ? ((totalWins / totalMatchesCount) * 100).toFixed(1) + "%" : "0.0%";

	const pinWinsCount = allMatches.filter(matchItem => matchItem.isWinner && /fall|pin|^f$/i.test(matchItem.winType)).length;
	const techWinsCount = allMatches.filter(matchItem => matchItem.isWinner && /tf|tech/i.test(matchItem.winType)).length;
	const majorWinsCount = allMatches.filter(matchItem => matchItem.isWinner && /md|maj/i.test(matchItem.winType)).length;
	const bonusWinsCount = pinWinsCount + techWinsCount + majorWinsCount;
	const bonusPercentText = totalWins > 0 ? ((bonusWinsCount / totalWins) * 100).toFixed(1) + "%" : "0.0%";

	const lastEventItem = filteredEvents[0];
	const lastEventDisplayDate = lastEventItem ? (lastEventItem.date instanceof Date ? lastEventItem.date : new Date(lastEventItem.date)).toLocaleDateString() : "-";
	const lastEventDisplayName = lastEventItem ? lastEventItem.name : "No Events";

	const firstPlaceCount = filteredEvents.filter(eventItem => eventItem.place === "1st").length;
	const secondPlaceCount = filteredEvents.filter(eventItem => eventItem.place === "2nd").length;
	const thirdPlaceCount = filteredEvents.filter(eventItem => eventItem.place === "3rd").length;
	const podiumSummaryText = `${ firstPlaceCount }x 1st • ${ secondPlaceCount }x 2nd • ${ thirdPlaceCount }x 3rd`;

	// Compute opponents summary for Opponents View
	const opponentMap = {};
	allMatches.forEach(matchItem => {
		const opponentName = matchItem.vs || "Unknown Opponent";
		if (!opponentMap[opponentName]) {
			opponentMap[opponentName] = {
				name: opponentName,
				teams: [],
				wins: 0,
				losses: 0,
				lastDate: null
			};
		}
		if (matchItem.vsTeam && !opponentMap[opponentName].teams.includes(matchItem.vsTeam)) {
			opponentMap[opponentName].teams.push(matchItem.vsTeam);
		}
		if (matchItem.isWinner) {
			opponentMap[opponentName].wins += 1;
		} else {
			opponentMap[opponentName].losses += 1;
		}
	});

	const opponentsList = Object.values(opponentMap).sort((opponentFirst, opponentSecond) => (opponentSecond.wins + opponentSecond.losses) - (opponentFirst.wins + opponentFirst.losses));

	return (
		<div className="wrestler-report-container">
			
			<header className="wrestler-report-header">
				<h1 className="wrestler-report-name">{ wrestler.name }</h1>
			</header>

			<div className="reportFilters">
				<select
					id="timeframe-select"
					value={ timeframeFilter }
					onChange={ event => setTimeframeFilter(event.target.value) }
					aria-label="Filter Timeframe"
				>
					<option value="this_season">This Season</option>
					<option value="in_season">In Season</option>
					<option value="all_events">All Events</option>
				</select>
			</div>

			{ activeView === "events" ? (
				<>
					<section className="kpi-cards-grid">
						<div className="kpi-card win-accent">
							<div className="kpi-label">OVERALL RECORD</div>
							<div className="kpi-value">{ totalWins } - { totalLosses }</div>
							<div className="kpi-subtext">Win Rate: { winPercentText }</div>
						</div>

						<div className="kpi-card secondary-accent">
							<div className="kpi-label">BONUS WINS & PINS</div>
							<div className="kpi-value">{ pinWinsCount } Pins</div>
							<div className="kpi-subtext">{ bonusWinsCount } Bonus Wins ({ bonusPercentText } of wins)</div>
						</div>

						<div className="kpi-card tertiary-accent">
							<div className="kpi-label">LAST EVENT</div>
							<div className="kpi-value" style={{ fontSize: "18px", wordBreak: "break-word" }}>{ lastEventDisplayName }</div>
							<div className="kpi-subtext">{ lastEventDisplayDate }</div>
						</div>

						<div className="kpi-card">
							<div className="kpi-label">PODIUM FINISHES</div>
							<div className="kpi-value">{ firstPlaceCount } 1st</div>
							<div className="kpi-subtext">{ podiumSummaryText }</div>
						</div>
					</section>

					<section className="report-section-panel">
						<div className="section-panel-title">
							<span>EVENT HISTORY</span>
							<span style={{ fontSize: "14px", fontWeight: "normal", color: "var(--on-surface-variant)" }}>
								{ filteredEvents.length } Events • { totalMatchesCount } Matches
							</span>
						</div>

						<div className="events-list-container">
							{ filteredEvents.length === 0 ? (
								<div className="empty-state">No Events Recorded for Selected Timeframe</div>
							) : (
								filteredEvents.map((eventItem, eventIndex) => {
									const eventKey = eventItem.sqlId || eventIndex;
									const isEventExpanded = expandedEventIds.includes(eventKey);
									const placeBadgeClass = eventItem.place === "1st" ? "place-1st"
										: eventItem.place === "2nd" ? "place-2nd"
										: eventItem.place === "3rd" ? "place-3rd"
										: eventItem.place === "4th" ? "place-4th"
										: eventItem.place === "DNP" ? "place-dnp"
										: "place-other";

									return (
										<div 
											key={ eventKey }
											className={`event-card ${ isEventExpanded ? "expanded" : "" }`}
										>
											<div 
												className="event-card-header"
												onClick={ () => toggleEventExpansion(eventKey) }
											>
												<div className="event-card-main-info">
													<div className="event-card-title-row">
														<span className="event-card-name">{ eventItem.name }</span>
														<span className="event-card-date">• { eventItem.date.toLocaleDateString() }</span>
													</div>
													<div className="event-card-tags">
														{ eventItem.division ? (
															<span className="event-tag">{ eventItem.division }</span>
														) : "" }
														{ eventItem.weightClass ? (
															<span className="event-tag">{ eventItem.weightClass } lbs</span>
														) : "" }
													</div>
												</div>

												<div className="event-card-stats-side">
													<span className="event-record-badge">{ eventItem.wins } - { eventItem.losses }</span>
													<span className={`place-badge ${ placeBadgeClass }`}>
														{ eventItem.place }
													</span>
													<span className="expand-toggle-icon">
														<svg viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg">
															<path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/>
														</svg>
													</span>
												</div>
											</div>

											{ isEventExpanded ? (
												<div className="event-card-matches-drawer">
													<div className="matches-drawer-title">MATCH DETAILS — { eventItem.name }</div>
													
													{ (eventItem.matches || []).length === 0 ? (
														<div className="empty-state">No match data available for this event</div>
													) : (
														<div className="matches-list">
															{ (eventItem.matches || []).sort((matchFirst, matchSecond) => matchFirst.sort - matchSecond.sort).map((matchItem, matchIndex) => (
																<div key={ matchIndex } className="match-item-card">
																	<div className="match-item-left">
																		<span className="match-round-tag">{ matchItem.round || "Match" }</span>
																		<span className="match-opponent-info">
																			<span className="match-opponent-name">{ matchItem.vs }</span>
																			{ matchItem.vsTeam ? (
																				<span className="match-opponent-team">({ matchItem.vsTeam })</span>
																			) : "" }
																		</span>
																	</div>

																	<div className="match-item-right">
																		<span className={`result-chip ${ matchItem.isWinner ? "win" : "loss" }`}>
																			{ matchItem.isWinner ? "WIN" : "LOSS" }
																		</span>
																		{ matchItem.winType ? (
																			<span className="match-win-type">{ matchItem.winType }</span>
																		) : "" }
																	</div>
																</div>
															)) }
														</div>
													) }
												</div>
											) : "" }
										</div>
									);
								})
							) }
						</div>
					</section>
				</>
			) : activeView === "ratings" ? (
				<section className="report-section-panel">
					<div className="section-panel-title">
						<span>RATING HISTORY (2 YEAR)</span>
						{ wrestler.rating ? (
							<span style={{ fontSize: "14px", fontWeight: "normal", color: "var(--on-surface-variant)" }}>
								Current Rating: { wrestler.rating.toFixed(0) } ± { wrestler.deviation ? wrestler.deviation.toFixed(0) : "0" }
							</span>
						) : "" }
					</div>

					<div className="rating-history-container">
						<div className="rating-chart-container" ref={ chartContainerRef }>
							{ ratingChartData ? (
								<svg className="rating-chart" style={{ width: `${ ratingChartData.width }px`, height: `${ ratingChartData.height }px` }}>
									{/* Y-Axis Line & Grid Lines */}
									<line x1={ ratingChartData.paddingLeft } y1={ 10 } x2={ ratingChartData.paddingLeft } y2={ ratingChartData.height - ratingChartData.paddingBottom } stroke="var(--outline-variant)" strokeWidth="1.5" />
									
									{ (ratingChartData.ticks || []).map((tickItem, tickIndex) => (
										<g key={ tickIndex }>
											<line x1={ ratingChartData.paddingLeft - 4 } y1={ tickItem.y } x2={ ratingChartData.width } y2={ tickItem.y } stroke="var(--outline)" strokeWidth="0.5" strokeDasharray="3,3" />
											<text x={ ratingChartData.paddingLeft - 8 } y={ tickItem.y + 4 } textAnchor="end" className="ratingLabel" fill="var(--on-surface-variant)">{ tickItem.rating }</text>
										</g>
									)) }

									{/* Area & Rating Line */}
									<path d={ ratingChartData.areaPath } className="ratingArea" />
									<path d={ ratingChartData.path } className="ratingPath" />
									
									{/* Data Points (Newest to Oldest from left to right) */}
									{ ratingChartData.points.map((pointItem, pointIndex) => (
										<g key={ pointIndex }>
											<circle cx={ pointItem.x } cy={ pointItem.y } r="4" className="ratingPoint">
												<title>{ `${ pointItem.date.toLocaleDateString() }: ${ Math.round(pointItem.rating) }` }</title>
											</circle>
											{ pointItem.shouldDisplayLabel ? (
												<>
													<text x={ pointItem.x } y={ pointItem.y - 8 } textAnchor="middle" className="ratingLabel">{ Math.round(pointItem.rating) }</text>
													<text x={ pointItem.x } y={ ratingChartData.height - 12 } textAnchor="middle" className="dateLabel">{ pointItem.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }</text>
												</>
											) : null }
										</g>
									)) }
								</svg>
							) : (
								<div className="empty-state">Not enough rating data available for a chart.</div>
							) }
						</div>

						<div className="rating-rows-list">
							{ ratingTableRecords.length === 0 ? (
								<div className="empty-state">No rating change records found for this period.</div>
							) : (
								ratingTableRecords.map((ratingItem, ratingIndex) => {
									const roundedDifference = Math.round(ratingItem.ratingDifference || 0);
									const formattedDelta = roundedDifference > 0 ? `+${ roundedDifference }` : `${ roundedDifference }`;
									const isPositiveChange = roundedDifference > 0;
									const isNegativeChange = roundedDifference < 0;

									return (
										<div key={ ratingIndex } className="rating-row-card">
											<div className="rating-row-header">
												<span>{ ratingItem.periodEndDate ? ratingItem.periodEndDate.toLocaleDateString() : "-" }</span>
												<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
													{ roundedDifference !== 0 ? (
														<span className={`rating-delta ${ isPositiveChange ? "win" : isNegativeChange ? "lose" : "" }`}>
															({ formattedDelta })
														</span>
													) : null }
													<span>Rating: { ratingItem.rating ? ratingItem.rating.toFixed(0) : "-" } (±{ ratingItem.deviation ? ratingItem.deviation.toFixed(0) : "0" })</span>
												</div>
											</div>
											{ (ratingItem.results || []).length > 0 ? (
												<div className="matches-list" style={{ marginTop: "8px" }}>
													{ (ratingItem.results || []).map((resultItem, resultIndex) => {
														const wrestlerRating = ratingItem.rating || 0;
														const wrestlerDeviation = ratingItem.deviation || 0;
														const opponentRating = resultItem.vsRating;
														const opponentDeviation = resultItem.vsDeviation;

														let expectationTag = null;
														let expectationClass = "";

														if (opponentRating !== undefined && opponentRating !== null) {
															if (resultItem.isWinner) {
																if (wrestlerRating + wrestlerDeviation < opponentRating) {
																	expectationTag = "UPSET";
																	expectationClass = "win-upset";
																} else if (wrestlerRating < opponentRating) {
																	expectationTag = "UNEXPECTED";
																	expectationClass = "win-unexpected";
																} else {
																	expectationTag = "EXPECTED";
																	expectationClass = "win-expected";
																}
															} else {
																if (wrestlerRating - wrestlerDeviation > opponentRating) {
																	expectationTag = "UPSET";
																	expectationClass = "loss-upset";
																} else if (wrestlerRating > opponentRating) {
																	expectationTag = "UNEXPECTED";
																	expectationClass = "loss-unexpected";
																} else {
																	expectationTag = "EXPECTED";
																	expectationClass = "loss-expected";
																}
															}
														}

														return (
															<div key={ resultIndex } className="match-item-card" style={{ background: "var(--surface-container-low)" }}>
																<div className="match-item-left">
																	<span className="match-opponent-info">
																		<strong>{ resultItem.isWinner ? "Beat" : "Lost to" }</strong> { resultItem.vs } { resultItem.vsTeam ? `(${ resultItem.vsTeam })` : "" }
																		{ opponentRating !== undefined && opponentRating !== null ? (
																			<span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--on-surface-variant)" }}>
																				— Rating: { Math.round(opponentRating) } { opponentDeviation ? `(±${ Math.round(opponentDeviation) })` : "" }
																			</span>
																		) : null }
																	</span>
																</div>
																<div className="match-item-right">
																	{ expectationTag ? (
																		<span className={`expectation-badge ${ expectationClass }`}>
																			{ expectationTag }
																		</span>
																	) : null }
																	<span className="match-win-type">{ resultItem.eventName }</span>
																</div>
															</div>
														);
													}) }
												</div>
											) : null }
										</div>
									);
								})
							) }
						</div>
					</div>
				</section>
			) : activeView === "opponents" && !wrestler.isFortMill ? (
				<>
					<InteractiveOpponentGraphComponent wrestler={ wrestler } />

					<section className="report-section-panel">
						<div className="section-panel-title">
							<span>TOP 5 WINNING PATHS TO FORT MILL</span>
							<span style={{ fontSize: "14px", fontWeight: "normal", color: "var(--on-surface-variant)" }}>
								{ (wrestler.winningPaths || []).length } Paths Found
							</span>
						</div>
						{ (wrestler.winningPaths || []).length === 0 ? (
							<div className="empty-state">No Winning Paths Found to a Fort Mill Wrestler</div>
						) : (
							<div className="memgraph-paths-list">
								{ wrestler.winningPaths.map((pathItem, pathIndex) => (
									<div key={ pathIndex } className="memgraph-path-card win-path">
										<div className="path-card-header">
											<span className="path-badge win-badge">
												PATH #{ pathIndex + 1 } ({ pathItem.hops } { pathItem.hops === 1 ? "HOP" : "HOPS" })
											</span>
											<span className="path-oldest-date">Oldest Match Date: { pathItem.oldestDate }</span>
										</div>
										<div className="path-flow-container">
											{ pathItem.wrestlers.map((wrestlerItem, wIndex) => {
												const isTarget = wIndex === pathItem.wrestlers.length - 1;
												const matchItem = wIndex < (pathItem.matches || []).length ? pathItem.matches[wIndex] : null;

												return (
													<React.Fragment key={ wIndex }>
														<div className="path-step-row wrestler-row">
															<div className={`path-wrestler-chip ${ isTarget ? "fortmill-target" : wIndex === 0 ? "start-wrestler" : "" }`}>
																<span className="wrestler-chip-name">{ wrestlerItem.name }</span>
																<a
																	href={ `/portal/wrestlerreport.html?id=${ wrestlerItem.id }` }
																	target="_blank"
																	rel="noopener noreferrer"
																	className="wrestler-external-link"
																	title="Open Wrestler Report in New Tab"
																	onClick={ (clickEvent) => clickEvent.stopPropagation() }
																>
																	<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
																		<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
																		<polyline points="15 3 21 3 21 9" />
																		<line x1="10" y1="14" x2="21" y2="3" />
																	</svg>
																</a>
																{ wrestlerItem.isFortMill ? (
																	<span className="fortmill-tag">FORT MILL</span>
																) : null }
															</div>
														</div>
														{ matchItem ? (
															<div className="path-step-row match-row">
																<div className="path-step-details">
																	{ matchItem.winType ? <span className="step-wintype">{ matchItem.winType }</span> : null }
																	<span className="step-date">{ matchItem.eventDate }</span>
																</div>
																<div className="arrow-line-wrapper">
																	<svg className="arrow-icon horizontal-arrow" viewBox="0 0 24 24" width="16" height="16">
																		<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
																	</svg>
																	<svg className="arrow-icon vertical-arrow" viewBox="0 0 24 24" width="16" height="16">
																		<path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
																	</svg>
																</div>
															</div>
														) : null }
													</React.Fragment>
												);
											}) }
										</div>
									</div>
								)) }
							</div>
						) }
					</section>

					<section className="report-section-panel">
						<div className="section-panel-title">
							<span>TOP 5 LOSING PATHS TO FORT MILL</span>
							<span style={{ fontSize: "14px", fontWeight: "normal", color: "var(--on-surface-variant)" }}>
								{ (wrestler.losingPaths || []).length } Paths Found
							</span>
						</div>
						{ (wrestler.losingPaths || []).length === 0 ? (
							<div className="empty-state">No Losing Paths Found to a Fort Mill Wrestler</div>
						) : (
							<div className="memgraph-paths-list">
								{ wrestler.losingPaths.map((pathItem, pathIndex) => (
									<div key={ pathIndex } className="memgraph-path-card lose-path">
										<div className="path-card-header">
											<span className="path-badge lose-badge">
												PATH #{ pathIndex + 1 } ({ pathItem.hops } { pathItem.hops === 1 ? "HOP" : "HOPS" })
											</span>
											<span className="path-oldest-date">Oldest Match Date: { pathItem.oldestDate }</span>
										</div>
										<div className="path-flow-container">
											{ pathItem.wrestlers.map((wrestlerItem, wIndex) => {
												const isTarget = wIndex === pathItem.wrestlers.length - 1;
												const matchItem = wIndex < (pathItem.matches || []).length ? pathItem.matches[wIndex] : null;

												return (
													<React.Fragment key={ wIndex }>
														<div className="path-step-row wrestler-row">
															<div className={`path-wrestler-chip ${ isTarget ? "fortmill-target" : wIndex === 0 ? "start-wrestler" : "" }`}>
																<span className="wrestler-chip-name">{ wrestlerItem.name }</span>
																<a
																	href={ `/portal/wrestlerreport.html?id=${ wrestlerItem.id }` }
																	target="_blank"
																	rel="noopener noreferrer"
																	className="wrestler-external-link"
																	title="Open Wrestler Report in New Tab"
																	onClick={ (clickEvent) => clickEvent.stopPropagation() }
																>
																	<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
																		<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
																		<polyline points="15 3 21 3 21 9" />
																		<line x1="10" y1="14" x2="21" y2="3" />
																	</svg>
																</a>
																{ wrestlerItem.isFortMill ? (
																	<span className="fortmill-tag">FORT MILL</span>
																) : null }
															</div>
														</div>
														{ matchItem ? (
															<div className="path-step-row match-row">
																<div className="path-step-details">
																	{ matchItem.winType ? <span className="step-wintype">{ matchItem.winType }</span> : null }
																	<span className="step-date">{ matchItem.eventDate }</span>
																</div>
																<div className="arrow-line-wrapper">
																	<svg className="arrow-icon horizontal-arrow" viewBox="0 0 24 24" width="16" height="16">
																		<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
																	</svg>
																	<svg className="arrow-icon vertical-arrow" viewBox="0 0 24 24" width="16" height="16">
																		<path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
																	</svg>
																</div>
															</div>
														) : null }
													</React.Fragment>
												);
											}) }
										</div>
									</div>
								)) }
							</div>
						) }
					</section>

					<section className="report-section-panel">
						<div className="section-panel-title">
							<span>OPPONENT RECORD BREAKDOWN</span>
							<span style={{ fontSize: "14px", fontWeight: "normal", color: "var(--on-surface-variant)" }}>
								{ opponentsList.length } Unique Opponents
							</span>
						</div>

						<div className="opponents-grid-list">
							{ opponentsList.length === 0 ? (
								<div className="empty-state">No Opponents Recorded</div>
							) : (
								opponentsList.map((opponentItem, opponentIndex) => (
									<div key={ opponentIndex } className="opponent-card-item">
										<div className="opponent-card-left">
											<span className="opponent-card-name">{ opponentItem.name }</span>
											{ opponentItem.teams.length > 0 ? (
												<span className="opponent-card-teams">{ opponentItem.teams.join(", ") }</span>
											) : "" }
										</div>
										<div className="opponent-card-right">
											<span className={`opponent-record-tag ${ opponentItem.wins > opponentItem.losses ? "better" : opponentItem.wins < opponentItem.losses ? "worse" : "" }`}>
												{ opponentItem.wins } - { opponentItem.losses }
											</span>
										</div>
									</div>
								))
							) }
						</div>
					</section>
				</>
			) : activeView === "style" ? (
				<>
					<section className="report-section-panel">
						<div className="section-panel-title">
							<span>SCORING ACTIONS</span>
							<span style={{ fontSize: "14px", fontWeight: "normal", color: "var(--on-surface-variant)" }}>
								{ scoringStats.qualifyingMatchesCount } { scoringStats.qualifyingMatchesCount === 1 ? "Match" : "Matches" } with Actions
							</span>
						</div>

						<div className="scoring-actions-grid">
							<div className="scoring-action-card takedown-card">
								<span className="scoring-action-label">TAKEDOWNS</span>
								<div className="scoring-action-value">{ scoringStats.totalTakedowns }</div>
								<div className="scoring-action-sub">{ scoringStats.avgTakedowns } avg per match</div>
							</div>

							<div className="scoring-action-card nearfall-card">
								<span className="scoring-action-label">NEARFALLS</span>
								<div className="scoring-action-value">{ scoringStats.totalNearfalls }</div>
								<div className="scoring-action-sub">{ scoringStats.avgNearfalls } avg per match</div>
							</div>

							<div className="scoring-action-card reversal-card">
								<span className="scoring-action-label">REVERSALS</span>
								<div className="scoring-action-value">{ scoringStats.totalReversals }</div>
								<div className="scoring-action-sub">{ scoringStats.avgReversals } avg per match</div>
							</div>

							<div className="scoring-action-card escape-card">
								<span className="scoring-action-label">ESCAPES</span>
								<div className="scoring-action-value">{ scoringStats.totalEscapes }</div>
								<div className="scoring-action-sub">{ scoringStats.avgEscapes } avg per match</div>
							</div>
						</div>
					</section>

					<section className="report-section-panel">
						<div className="section-panel-title">
							<span>WIN / LOSS STYLE BREAKDOWN</span>
						</div>

						<div className="style-charts-container">
							{ winTypeChartData.win ? (
								<div className="win-by-chart-box">
									<span className="win-by-chart-title">WINS BY TYPE</span>
									<div className="winByChart">
										<svg style={{ width: "225px", height: "200px" }}>
											<line x1="105" y1="20" x2="105" y2="180" />
											<line x1="25" y1="100" x2="185" y2="100" />
											<text x="105" y="0" textAnchor="middle" alignmentBaseline="hanging">F</text>
											<text x="105" y="185" textAnchor="middle" alignmentBaseline="hanging">TF</text>
											<text x="190" y="100" textAnchor="start" alignmentBaseline="middle">DEC</text>
											<text x="0" y="100" textAnchor="start" alignmentBaseline="middle">MD</text>
											<g transform="translate(105,100)">
												<path className="winPath" d={ winTypeChartData.win.path } />
												{ winTypeChartData.win.labels.map((labelItem, labelIndex) => (
													<text className="winTypeText" x={ labelItem.x } y={ labelItem.y } key={ labelIndex }>{ labelItem.text }</text>
												)) }
											</g>
										</svg>
									</div>
								</div>
							) : "" }

							{ winTypeChartData.lose ? (
								<div className="win-by-chart-box">
									<span className="win-by-chart-title">LOSSES BY TYPE</span>
									<div className="winByChart">
										<svg style={{ width: "225px", height: "200px" }}>
											<line x1="105" y1="20" x2="105" y2="180" />
											<line x1="25" y1="100" x2="185" y2="100" />
											<text x="105" y="0" textAnchor="middle" alignmentBaseline="hanging">F</text>
											<text x="105" y="185" textAnchor="middle" alignmentBaseline="hanging">TF</text>
											<text x="190" y="100" textAnchor="start" alignmentBaseline="middle">DEC</text>
											<text x="0" y="100" textAnchor="start" alignmentBaseline="middle">MD</text>
											<g transform="translate(105,100)">
												<path className="losePath" d={ winTypeChartData.lose.path } />
												{ winTypeChartData.lose.labels.map((labelItem, labelIndex) => (
													<text className="winTypeText" x={ labelItem.x } y={ labelItem.y } key={ labelIndex }>{ labelItem.text }</text>
												)) }
											</g>
										</svg>
									</div>
								</div>
							) : "" }
						</div>
					</section>
				</>
			) : null }

			{/* Sticky Bottom Navigation Bar */}
			<div className="bottomNav">
				<div 
					className={`navItem ${ activeView === "events" ? "active" : "" }`}
					onClick={ () => setActiveView("events") }
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
					<span>events</span>
				</div>

				<div 
					className={`navItem ${ activeView === "ratings" ? "active" : "" }`}
					onClick={ () => setActiveView("ratings") }
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
					</svg>
					<span>ratings</span>
				</div>

				{ !wrestler.isFortMill ? (
					<div 
						className={`navItem ${ activeView === "opponents" ? "active" : "" }`}
						onClick={ () => setActiveView("opponents") }
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
						<span>opponents</span>
					</div>
				) : null }

				<div 
					className={`navItem ${ activeView === "style" ? "active" : "" }`}
					onClick={ () => setActiveView("style") }
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M12 20v-6M6 20V10M18 20V4" />
					</svg>
					<span>style</span>
				</div>
			</div>

		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<WrestlerReportComponent />);
export default WrestlerReportComponent;
