import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./include/index.css";
import "./include/wrestlerreport.css";

const WrestlerReportComponent = () => {

	const [ isLoading, setIsLoading ] = useState(false);
	const [ wrestler, setWrestler ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ activeView, setActiveView ] = useState("events");
	const [ expandedEventIds, setExpandedEventIds ] = useState([]);

	const [ ratingChartData, setRatingChartData ] = useState(null);
	const [ winTypeChartData, setWinTypeChartData ] = useState({});

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
								vsTeam: matchItem.vsTeam
							})));

							return {
								...ratingItem,
								results: matchingResults
							};
						});

					if (filteredRatingHistory.length > 1) {
						const chartHeight = 220;
						const paddingLeft = 50;
						const paddingRight = 25;
						const paddingTop = 20;
						const paddingBottom = 40;
						const pointWidth = 55;

						const minRatingValue = filteredRatingHistory.reduce((min, r) => (r.rating - r.deviation) < min ? (r.rating - r.deviation) : min, filteredRatingHistory[0].rating - filteredRatingHistory[0].deviation);
						const maxRatingValue = filteredRatingHistory.reduce((max, r) => (r.rating + r.deviation) > max ? (r.rating + r.deviation) : max, filteredRatingHistory[0].rating + filteredRatingHistory[0].deviation);
						const ratingRange = maxRatingValue - minRatingValue === 0 ? 1 : maxRatingValue - minRatingValue;
						const drawableHeight = chartHeight - paddingTop - paddingBottom;

						// Points ordered newest to oldest (newest records on left)
						const graphPoints = filteredRatingHistory.map((ratingItem, indexVal) => {
							const pointX = paddingLeft + (indexVal * pointWidth);
							const pointY = chartHeight - paddingBottom - (((ratingItem.rating - minRatingValue) / ratingRange) * drawableHeight);
							return { x: pointX, y: pointY, rating: ratingItem.rating, date: ratingItem.periodEndDate };
						});

						const linePathText = "M" + graphPoints.map(pointItem => `${ pointItem.x } ${ pointItem.y }`).join(" L");

						const areaPointsList = filteredRatingHistory.map((ratingItem, indexVal) => {
							const pointX = paddingLeft + (indexVal * pointWidth);
							const upperY = chartHeight - paddingBottom - (((ratingItem.rating + ratingItem.deviation - minRatingValue) / ratingRange) * drawableHeight);
							const lowerY = chartHeight - paddingBottom - (((ratingItem.rating - ratingItem.deviation - minRatingValue) / ratingRange) * drawableHeight);
							return { x: pointX, upperY, lowerY };
						});

						const upperPathText = areaPointsList.map(pointItem => `${ pointItem.x } ${ pointItem.upperY }`).join(" L ");
						const lowerPathText = [ ...areaPointsList ].reverse().map(pointItem => `${ pointItem.x } ${ pointItem.lowerY }`).join(" L ");
						const areaPathText = `M ${ upperPathText } L ${ lowerPathText } Z`;

						const totalChartWidth = paddingLeft + paddingRight + ((filteredRatingHistory.length - 1) * pointWidth);

						// Y-axis Ticks (4 Ticks)
						const yAxisTicks = [ 0, 0.33, 0.66, 1 ].map(fraction => {
							const tickRating = minRatingValue + (fraction * ratingRange);
							const tickY = chartHeight - paddingBottom - (fraction * drawableHeight);
							return { rating: Math.round(tickRating), y: tickY };
						});

						setRatingChartData({
							width: totalChartWidth,
							height: chartHeight,
							paddingLeft,
							paddingBottom,
							points: graphPoints,
							path: linePathText,
							areaPath: areaPathText,
							ticks: yAxisTicks
						});
					}

					const parsedMatchesList = processedEvents.flatMap(eventItem => (eventItem.matches || []).map(matchItem => ({
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

					setWinTypeChartData({
						win: winTypesData,
						lose: loseTypesData
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

	const allMatches = (wrestler.events || []).flatMap(eventItem => eventItem.matches || []).filter(matchItem => matchItem.vs);
	const totalWins = allMatches.filter(matchItem => matchItem.isWinner).length;
	const totalLosses = allMatches.filter(matchItem => !matchItem.isWinner).length;
	const totalMatchesCount = totalWins + totalLosses;
	const winPercentText = totalMatchesCount > 0 ? ((totalWins / totalMatchesCount) * 100).toFixed(1) + "%" : "0.0%";

	const pinWinsCount = allMatches.filter(matchItem => matchItem.isWinner && /fall|pin|^f$/i.test(matchItem.winType)).length;
	const techWinsCount = allMatches.filter(matchItem => matchItem.isWinner && /tf|tech/i.test(matchItem.winType)).length;
	const majorWinsCount = allMatches.filter(matchItem => matchItem.isWinner && /md|maj/i.test(matchItem.winType)).length;
	const bonusWinsCount = pinWinsCount + techWinsCount + majorWinsCount;
	const bonusPercentText = totalWins > 0 ? ((bonusWinsCount / totalWins) * 100).toFixed(1) + "%" : "0.0%";

	const lastEventItem = (wrestler.events || [])[0];
	const lastEventDisplayDate = lastEventItem ? lastEventItem.date.toLocaleDateString() : "-";
	const lastEventDisplayName = lastEventItem ? lastEventItem.name : "No Events";

	const firstPlaceCount = (wrestler.events || []).filter(eventItem => eventItem.place === "1st").length;
	const secondPlaceCount = (wrestler.events || []).filter(eventItem => eventItem.place === "2nd").length;
	const thirdPlaceCount = (wrestler.events || []).filter(eventItem => eventItem.place === "3rd").length;
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

	// Filter rating history table records to only show dates where there are events
	const ratingTableRecords = (wrestler.ratingHistory || []).filter(ratingItem => (ratingItem.results || []).length > 0);

	return (
		<div className="wrestler-report-container">
			
			<header className="wrestler-report-header">
				<div className="wrestler-report-title-row">
					<h1 className="wrestler-report-name">{ wrestler.name }</h1>
				</div>
			</header>

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
							<div className="kpi-value">{ firstPlaceCount } Gold</div>
							<div className="kpi-subtext">{ podiumSummaryText }</div>
						</div>
					</section>

					<section className="report-section-panel">
						<div className="section-panel-title">
							<span>EVENT HISTORY</span>
							<span style={{ fontSize: "14px", fontWeight: "normal", color: "var(--on-surface-variant)" }}>
								{ (wrestler.events || []).length } Events • { totalMatchesCount } Matches
							</span>
						</div>

						<div className="events-list-container">
							{ (wrestler.events || []).length === 0 ? (
								<div className="empty-state">No Events Recorded</div>
							) : (
								(wrestler.events || []).map((eventItem, eventIndex) => {
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
						<div className="rating-chart-container">
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
											<circle cx={ pointItem.x } cy={ pointItem.y } r="4" className="ratingPoint" />
											<text x={ pointItem.x } y={ pointItem.y - 8 } textAnchor="middle" className="ratingLabel">{ Math.round(pointItem.rating) }</text>
											<text x={ pointItem.x } y={ ratingChartData.height - 12 } textAnchor="middle" className="dateLabel">{ pointItem.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) }</text>
										</g>
									)) }
								</svg>
							) : (
								<div className="empty-state">Not enough rating data available for a chart.</div>
							) }
						</div>

						<div className="rating-rows-list">
							{ ratingTableRecords.length === 0 ? (
								<div className="empty-state">No rating event records found for this period.</div>
							) : (
								ratingTableRecords.map((ratingItem, ratingIndex) => (
									<div key={ ratingIndex } className="rating-row-card">
										<div className="rating-row-header">
											<span>{ ratingItem.periodEndDate ? ratingItem.periodEndDate.toLocaleDateString() : "-" }</span>
											<span>Rating: { ratingItem.rating ? ratingItem.rating.toFixed(0) : "-" } (±{ ratingItem.deviation ? ratingItem.deviation.toFixed(0) : "0" })</span>
										</div>
										{ (ratingItem.results || []).length > 0 ? (
											<div className="matches-list" style={{ marginTop: "8px" }}>
												{ (ratingItem.results || []).map((resultItem, resultIndex) => (
													<div key={ resultIndex } className="match-item-card" style={{ background: "var(--surface-container-low)" }}>
														<div className="match-item-left">
															<span className="match-opponent-info">
																<strong>{ resultItem.isWinner ? "Beat" : "Lost to" }</strong> { resultItem.vs } { resultItem.vsTeam ? `(${ resultItem.vsTeam })` : "" }
															</span>
														</div>
														<div className="match-item-right">
															<span className="match-win-type">{ resultItem.eventName }</span>
														</div>
													</div>
												)) }
											</div>
										) : "" }
									</div>
								))
							) }
						</div>
					</div>
				</section>
			) : activeView === "opponents" ? (
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
			) : activeView === "style" ? (
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
