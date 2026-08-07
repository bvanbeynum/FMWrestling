import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/schedule.css";

const getSeasonOptions = (dateObject) => {
	const currentYear = dateObject.getFullYear();
	const currentMonth = dateObject.getMonth();
	let startYear;
	if (currentMonth >= 8) {
		startYear = currentYear;
	} else {
		startYear = currentYear - 1;
	}
	
	const formatSeason = (startYearValue) => {
		const yearShort = startYearValue.toString().slice(-2);
		const nextYearShort = (startYearValue + 1).toString().slice(-2);
		return {
			name: `${yearShort}-${nextYearShort}`,
			startDate: `${startYearValue}-09-01`,
			endDate: `${startYearValue + 1}-08-31`
		};
	};

	return [
		formatSeason(startYear + 1),
		formatSeason(startYear),
		formatSeason(startYear - 1)
	];
};

const parseEventDate = (dateInput) => {
	if (!dateInput) return null;
	if (dateInput instanceof Date) return dateInput;

	const dateText = String(dateInput).trim();
	const isoMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
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

const AllSchedule = () => {
	const seasonOptions = getSeasonOptions(new Date());
	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ events, setEvents ] = useState([]);

	const [ selectedState, setSelectedState ] = useState("SC");
	const [ viewDate, setViewDate ] = useState(new Date());
	const [ selectedDate, setSelectedDate ] = useState(new Date());

	useEffect(() => {
		setIsLoading(true);
		const earliestSeason = seasonOptions[seasonOptions.length - 1];
		const latestSeason = seasonOptions[0];
		const startDate = earliestSeason.startDate;
		const endDate = latestSeason.endDate;
		
		let fetchUrl = `/api/allscheduleload?startdate=${startDate}&enddate=${endDate}`;
		if (selectedState !== "All") {
			fetchUrl += `&state=${selectedState}`;
		}
		
		fetch(fetchUrl)
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				} else {
					throw Error(apiResponse.statusText);
				}
			})
			.then(responseData => {
				const loadedEvents = [
					...(responseData.events || [])
				].map(eventItem => ({
					...eventItem,
					type: eventItem.eventSystem?.toLowerCase(),
					date: parseEventDate(eventItem.date),
					endDate: eventItem.endDate ? parseEventDate(eventItem.endDate) : null
				}));

				setLoggedInUser(responseData.loggedInUser);
				setEvents(loadedEvents);
				setPageActive(true);
				setIsLoading(false);

				const todayDate = new Date();
				setViewDate(todayDate);
				setSelectedDate(todayDate);
			})
			.catch(fetchError => {
				console.warn(fetchError);
				setIsLoading(false);
			});
	}, [selectedState]);

	const getEventCategory = (eventItem) => {
		const system = (eventItem.eventSystem || "").toLowerCase();
		const name = (eventItem.name || "").toLowerCase();
		if (system.includes("track") || system.includes("flo")) {
			return "Tournament";
		}
		if ((eventItem.eventType || "").toLowerCase() === "dual" || name.includes("dual")) {
			return "Dual Meet";
		}
		return eventItem.category || "Tournament";
	};

	const isSameDay = (firstDate, secondDate) => {
		if (!firstDate || !secondDate) return false;
		const dateOne = parseEventDate(firstDate);
		const dateTwo = parseEventDate(secondDate);
		return dateOne.getFullYear() === dateTwo.getFullYear() &&
			   dateOne.getMonth() === dateTwo.getMonth() &&
			   dateOne.getDate() === dateTwo.getDate();
	};

	const firstDayOfCurrentMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
	const firstDayOfNextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

	const hasPrevMonthEvents = events.some(eventItem => {
		const eventDate = parseEventDate(eventItem.date);
		return eventDate && eventDate < firstDayOfCurrentMonth;
	});

	const hasNextMonthEvents = events.some(eventItem => {
		const eventDate = parseEventDate(eventItem.date);
		return eventDate && eventDate >= firstDayOfNextMonth;
	});

	const handlePrevMonth = () => {
		if (!hasPrevMonthEvents) return;
		const previousMonthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
		setViewDate(previousMonthDate);
		setSelectedDate(previousMonthDate);
	};

	const handleNextMonth = () => {
		if (!hasNextMonthEvents) return;
		const nextMonthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
		setViewDate(nextMonthDate);
		setSelectedDate(nextMonthDate);
	};

	const generateCalendarDays = () => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();

		const firstDayOfMonth = new Date(year, month, 1);
		const startingDayOfWeek = firstDayOfMonth.getDay();

		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const daysInPrevMonth = new Date(year, month, 0).getDate();

		const calendarDaysList = [];

		for (let dayIndex = startingDayOfWeek - 1; dayIndex >= 0; dayIndex--) {
			const dateValue = new Date(year, month - 1, daysInPrevMonth - dayIndex);
			calendarDaysList.push({ date: dateValue, isCurrentMonth: false });
		}

		for (let dayIndex = 1; dayIndex <= daysInMonth; dayIndex++) {
			const dateValue = new Date(year, month, dayIndex);
			calendarDaysList.push({ date: dateValue, isCurrentMonth: true });
		}

		const totalCells = calendarDaysList.length > 35 ? 42 : 35;
		const remainingCells = totalCells - calendarDaysList.length;
		for (let cellIndex = 1; cellIndex <= remainingCells; cellIndex++) {
			const dateValue = new Date(year, month + 1, cellIndex);
			calendarDaysList.push({ date: dateValue, isCurrentMonth: false });
		}

		return calendarDaysList;
	};

	const calendarDays = generateCalendarDays();

	const selectedDayEvents = events.filter(eventItem => isSameDay(eventItem.date, selectedDate));

	const formatTimeString = (dateValue) => {
		if (!dateValue || isNaN(dateValue.getTime())) return "All Day";
		const hours = dateValue.getHours();
		const minutes = dateValue.getMinutes();
		if (hours === 0 && minutes === 0) return "All Day";
		return dateValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	const dayNamesFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

	return (
		<div className="page">
			<Nav loggedInUser={ loggedInUser } />

			<div>
				{ isLoading ? (
					<div className="pageLoading">
						<img src="/media/wrestlingloading.gif" alt="Loading..." />
					</div>
				) : !loggedInUser || !loggedInUser.privileges || (!loggedInUser.privileges.includes("scheduleView") && !loggedInUser.privileges.includes("scheduleManage")) ? (
					<div className="noAccess">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
						<a>Unauthorized</a>
					</div>
				) : (
					<div className={`schedule container ${ pageActive ? "active" : "" }`}>
						<header>
							<h1>
								{ `${monthNamesFull[viewDate.getMonth()]} ${viewDate.getFullYear()}` }
							</h1>
						</header>

						<div className="scheduleFilters">
							<select 
								value={ selectedState } 
								onChange={ changeEvent => setSelectedState(changeEvent.target.value) }
								aria-label="Filter State"
							>
								<option value="SC">SC</option>
								<option value="NC">NC</option>
								<option value="GA">GA</option>
								<option value="TN">TN</option>
								<option value="All">All States</option>
							</select>

							<div className="monthNavGroup">
								<button 
									onClick={ handlePrevMonth } 
									disabled={ !hasPrevMonthEvents }
									aria-label="Previous Month" 
									className={`navArrowBtn ${ !hasPrevMonthEvents ? "disabled" : "" }`}
								>
									&lt;
								</button>
								<button 
									onClick={ handleNextMonth } 
									disabled={ !hasNextMonthEvents }
									aria-label="Next Month" 
									className={`navArrowBtn ${ !hasNextMonthEvents ? "disabled" : "" }`}
								>
									&gt;
								</button>
							</div>
						</div>

						<div className="calendarCard">
							<div className="mobileCalendarHeader">
								<span className="calendarMonthTitleMobile">
									{ monthNamesFull[viewDate.getMonth()] } { viewDate.getFullYear() }
								</span>
								<div className="monthNavGroup">
									<button onClick={ handlePrevMonth } aria-label="Previous Month Mobile" className="navArrowBtn">&lt;</button>
									<button onClick={ handleNextMonth } aria-label="Next Month Mobile" className="navArrowBtn">&gt;</button>
								</div>
							</div>

							<div className="calendarDaysHeader">
								<div>S</div>
								<div>M</div>
								<div>T</div>
								<div>W</div>
								<div>T</div>
								<div>F</div>
								<div>S</div>
							</div>

							<div className="calendarGrid">
								{ calendarDays.map((cellItem, indexValue) => {
									const dayEvents = events.filter(eventItem => isSameDay(eventItem.date, cellItem.date));
									const isSelected = isSameDay(cellItem.date, selectedDate);

									return (
										<div 
											key={ indexValue } 
											className={`dayCell ${ cellItem.isCurrentMonth ? "currentMonth" : "otherMonth" } ${ isSelected ? "selected" : ""}`}
											onClick={ () => setSelectedDate(cellItem.date) }
										>
											<span className="dayNumber">{ cellItem.date.getDate() }</span>
											
											<div className="dayIndicators">
												{ dayEvents.length > 0 && (
													<div className={`eventCountPill ${ isSelected ? "selected" : "" }`}>
														{ dayEvents.length }<span className="pillText">{ dayEvents.length === 1 ? " event" : " events" }</span>
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="eventsStreamSection">
							<div className="eventsStreamHeader">
								<div className="eventsDateTitleGroup">
									<h2 className="eventsDateTitleDesktop">
										{ dayNamesFull[selectedDate.getDay()].toUpperCase() } { monthNamesShort[selectedDate.getMonth()].toUpperCase() } { selectedDate.getDate() }
									</h2>
									<h2 className="eventsDateTitleMobile">
										{ dayNamesFull[selectedDate.getDay()] }, { monthNamesShort[selectedDate.getMonth()] } { selectedDate.getDate() }
									</h2>
								</div>
								<span className="eventsCountSubtitle">
									{ selectedDayEvents.length } { selectedDayEvents.length === 1 ? "EVENT" : "EVENTS" } { selectedDayEvents.length === 1 ? "SCHEDULED" : "" }
								</span>
							</div>

							{ selectedDayEvents.length === 0 ? (
								<div className="noEvents">No events scheduled for this date.</div>
							) : (
								<div className="eventCardsGrid">
									{ selectedDayEvents.map((eventItem, indexValue) => {
										const category = getEventCategory(eventItem);
										const isDual = category.toLowerCase().includes("dual");
										const isPrep = category.toLowerCase().includes("prep");
										
										let badgeClass = "tournament";
										if (isDual) badgeClass = "dual";
										if (isPrep) badgeClass = "prep";

										return (
											<div 
												key={ eventItem.id || indexValue } 
												data-testid={ eventItem.id } 
												className={`eventCard ${ badgeClass }`}
											>
												<div className={`eventAccentBar ${ badgeClass }`}></div>
												
												<div className="eventCardHeader">
													<span className={`eventBadge ${ badgeClass }`}>
														{ category.toUpperCase() }
													</span>
													<span className={`eventTime ${ badgeClass }`}>
														{ formatTimeString(eventItem.date) }
													</span>
												</div>

												<h3 className="eventName">{ eventItem.name }</h3>

												<div className="eventMetaDetails">
													{ eventItem.location && (
														<span className="metaItem">
															📍 { eventItem.location }
														</span>
													)}
													{ isDual ? (
														eventItem.opponent && (
															<span className="metaItem">
																👤 Opponent: { eventItem.opponent }
															</span>
														)
													) : (
														Array.isArray(eventItem.opponents) && eventItem.opponents.length > 0 && (
															<span className="metaItem">
																👥 { eventItem.opponents.join(", ") }
															</span>
														)
													)}
												</div>

												<div className="eventPills">
													{ eventItem.division && <span className="eventPill">{ eventItem.division.toUpperCase() }</span> }
													{ eventItem.weightClasses && <span className="eventPill">{ eventItem.weightClasses }</span> }
													{ !eventItem.division && !eventItem.weightClasses && isDual && <span className="eventPill">VARSITY</span> }
												</div>

												<div className="eventCardDivider"></div>

												<div className="eventCardFooter">
													{ isDual ? (
														<button 
															className="eventActionBtn dual"
															onClick={ () => { window.location.href = `/portal/dual.html?id=${ eventItem.systemId || eventItem.id || "" }`; } }
														>
															VIEW DUAL &rrarr;
														</button>
													) : (
														<>
															{eventItem.hasMatches ? (
																<button 
																	className="eventActionBtn tournament"
																	onClick={ () => { window.location.href = `/portal/tournamentsummary.html?id=${ eventItem.id }`; } }
																>
																	VIEW EVENT &rarr;
																</button>
															) : (
																(eventItem.eventSystem === "Flo" || eventItem.eventSystem === "Track" || /flo/i.test(eventItem.eventSystem) || /track/i.test(eventItem.eventSystem)) && (
																	<button 
																		className="eventActionBtn tournament"
																		onClick={ () => {
																			if (/flo/i.test(eventItem.eventSystem)) {
																				window.open(`https://www.flowrestling.org/nextgen/events/${ eventItem.systemId }/information`);
																			} else if (/track/i.test(eventItem.eventSystem)) {
																				window.open(`https://www.trackwrestling.com/tw/${ eventItem.eventType || "tournament" }/VerifyPassword.jsp?tournamentId=${ eventItem.systemId }`);
																			}
																		}}
																	>
																		VIEW ON FLO &rarr;
																	</button>
																)
															)}
														</>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<AllSchedule />);
export default AllSchedule;
