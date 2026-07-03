import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/schedule.css";

const getSeasonOptions = (date) => {
	const currentYear = date.getFullYear();
	const currentMonth = date.getMonth(); // 0-indexed, so 8 is September
	let startYear;
	if (currentMonth >= 8) { // Sept - Dec
		startYear = currentYear;
	} else { // Jan - Aug
		startYear = currentYear - 1;
	}
	
	const formatSeason = (start) => {
		const sShort = start.toString().slice(-2);
		const eShort = (start + 1).toString().slice(-2);
		return {
			name: `${sShort}-${eShort}`,
			startDate: `${start}-09-01`,
			endDate: `${start + 1}-08-31`
		};
	};

	return [
		formatSeason(startYear),      // Current season
		formatSeason(startYear - 1)   // Previous season
	];
};

const Schedule = props => {
	const seasonOptions = getSeasonOptions(new Date());
	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ events, setEvents ] = useState([]);

	const [ selectedState, setSelectedState ] = useState("SC");
	const [ selectedSeason, setSelectedSeason ] = useState(seasonOptions[0].name);
	const [ selectedEventType, setSelectedEventType ] = useState("All");
	
	const [ viewDate, setViewDate ] = useState(new Date());
	const [ selectedDate, setSelectedDate ] = useState(new Date());

	useEffect(() => {
		setIsLoading(true);
		const seasonOpt = seasonOptions.find(opt => opt.name === selectedSeason) || seasonOptions[0];
		const startStr = seasonOpt.startDate;
		const endStr = seasonOpt.endDate;
		
		let url = `/api/scheduleload?startdate=${startStr}&enddate=${endStr}`;
		if (selectedState !== "All") {
			url += `&state=${selectedState}`;
		}
		
		fetch(url)
			.then(response => {
				if (response.ok) {
					return response.json();
				} else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				const loadedEvents = [
					...(data.events || [])
				].map(event => ({
					...event,
					type: event.eventSystem?.toLowerCase(),
					date: new Date(event.date),
					endDate: event.endDate ? new Date(event.endDate) : null
				}));

				// Prevent duplicate dual entries if the dual has been integrated as an event
				const eventSystemIds = new Set(
					loadedEvents
						.filter(e => e.eventSystem === "WrestlingPortal" && e.systemId)
						.map(e => e.systemId)
				);

				const allEvents = loadedEvents;
				setLoggedInUser(data.loggedInUser);
				setEvents(allEvents);
				setPageActive(true);
				setIsLoading(false);

				const sDate = new Date(Date.parse(startStr));
				const eDate = new Date(Date.parse(endStr));
				const today = new Date();
				if (today >= sDate && today <= eDate) {
					setViewDate(today);
					setSelectedDate(today);
				} else {
					setViewDate(sDate);
					setSelectedDate(sDate);
				}
			})
			.catch(error => {
				console.warn(error);
				setIsLoading(false);
			});
	}, [selectedState, selectedSeason]);

	const getEventCategory = (event) => {
		const system = (event.eventSystem || "").toLowerCase();
		const name = (event.name || "").toLowerCase();
		if (system.includes("track") || system.includes("flo")) {
			return "Tournament";
		}
		if ((event.eventType || "").toLowerCase() === "dual" || name.includes("dual")) {
			return "Dual Meet";
		}
		return event.category || "Tournament";
	};

	const filteredEvents = events.filter(event => {
		let matchesType = true;
		if (selectedEventType !== "All") {
			const category = getEventCategory(event);
			if (selectedEventType.toLowerCase() === "dual") {
				matchesType = category.toLowerCase().includes("dual");
			} else if (selectedEventType.toLowerCase() === "tournament") {
				matchesType = category.toLowerCase().includes("tournament");
			} else {
				matchesType = category.toLowerCase() === selectedEventType.toLowerCase();
			}
		}
		
		return matchesType;
	});

	const isSameDay = (d1, d2) => {
		if (!d1 || !d2) return false;
		return d1.getFullYear() === d2.getFullYear() &&
			   d1.getMonth() === d2.getMonth() &&
			   d1.getDate() === d2.getDate();
	};

	const handlePrevMonth = () => {
		const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
		setViewDate(newDate);
		setSelectedDate(newDate);
	};

	const handleNextMonth = () => {
		const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
		setViewDate(newDate);
		setSelectedDate(newDate);
	};

	const generateCalendarDays = () => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();

		const firstDayOfMonth = new Date(year, month, 1);
		const startingDayOfWeek = firstDayOfMonth.getDay();

		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const daysInPrevMonth = new Date(year, month, 0).getDate();

		const calendarDays = [];

		for (let i = startingDayOfWeek - 1; i >= 0; i--) {
			const date = new Date(year, month - 1, daysInPrevMonth - i);
			calendarDays.push({ date, isCurrentMonth: false });
		}

		for (let i = 1; i <= daysInMonth; i++) {
			const date = new Date(year, month, i);
			calendarDays.push({ date, isCurrentMonth: true });
		}

		const totalCells = calendarDays.length > 35 ? 42 : 35;
		const remainingCells = totalCells - calendarDays.length;
		for (let i = 1; i <= remainingCells; i++) {
			const date = new Date(year, month + 1, i);
			calendarDays.push({ date, isCurrentMonth: false });
		}

		return calendarDays;
	};

	const calendarDays = generateCalendarDays();

	const selectedDayEvents = filteredEvents.filter(e => isSameDay(e.date, selectedDate));
	const viewedMonthEvents = filteredEvents.filter(e => 
		e.date && e.date.getFullYear() === viewDate.getFullYear() && e.date.getMonth() === viewDate.getMonth()
	);

	const formatTimeString = (date) => {
		if (!date || isNaN(date.getTime())) return "All Day";
		const hours = date.getHours();
		const minutes = date.getMinutes();
		if (hours === 0 && minutes === 0) return "All Day";
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
				<h1 className="visually-hidden">Schedule</h1>

				<header className="scheduleHeader">
					<div className="headerTitleGroup">
						<h2 className="calendarMonthTitleDesktop">
							{ monthNamesFull[viewDate.getMonth()].toUpperCase() } { viewDate.getFullYear() }
						</h2>
						<p className="monthEventsCount">
							{ viewedMonthEvents.length } { viewedMonthEvents.length === 1 ? "Event" : "Events" } this month
						</p>
					</div>

					<div className="scheduleFilters">
						<select 
							value={ selectedState } 
							onChange={ e => setSelectedState(e.target.value) }
							aria-label="Filter State"
						>
							<option value="SC">SC</option>
							<option value="NC">NC</option>
							<option value="GA">GA</option>
							<option value="TN">TN</option>
							<option value="All">All States</option>
						</select>

						<select 
							value={ selectedSeason } 
							onChange={ e => setSelectedSeason(e.target.value) }
							aria-label="Filter Season"
						>
							{seasonOptions.map(opt => (
								<option key={opt.name} value={opt.name}>{opt.name}</option>
							))}
						</select>

						<select 
							value={ selectedEventType } 
							onChange={ e => setSelectedEventType(e.target.value) }
							aria-label="Filter Event Type"
						>
							<option value="All">All Events</option>
							<option value="Tournament">Tournament</option>
							<option value="Dual">Dual</option>
						</select>

						<div className="monthNavGroup">
							<button onClick={ handlePrevMonth } aria-label="Previous Month" className="navArrowBtn">&lt;</button>
							<button onClick={ handleNextMonth } aria-label="Next Month" className="navArrowBtn">&gt;</button>
						</div>

						{ loggedInUser?.privileges?.includes("scheduleManage") && (
							<button 
								className="lineupButton addDual"
								onClick={ () => { window.location.href = "/portal/dual.html"; } }
							>
								Add Dual
							</button>
						)}
					</div>
				</header>

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
						{ calendarDays.map((cell, idx) => {
							const dayEvents = filteredEvents.filter(e => isSameDay(e.date, cell.date));
							const isSelected = isSameDay(cell.date, selectedDate);

							return (
								<div 
									key={ idx } 
									className={`dayCell ${ cell.isCurrentMonth ? "currentMonth" : "otherMonth" } ${ isSelected ? "selected" : "" }`}
									onClick={ () => setSelectedDate(cell.date) }
								>
									<span className="dayNumber">{ cell.date.getDate() }</span>
									
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
							{ selectedDayEvents.map((event, idx) => {
								const category = getEventCategory(event);
								const isDual = category.toLowerCase().includes("dual");
								const isPrep = category.toLowerCase().includes("prep");
								
								let badgeClass = "tournament";
								if (isDual) badgeClass = "dual";
								if (isPrep) badgeClass = "prep";

								return (
									<div 
										key={ event.id || idx } 
										data-testid={ event.id } 
										className={`eventCard ${ badgeClass }`}
									>
										<div className={`eventAccentBar ${ badgeClass }`}></div>
										
										<div className="eventCardHeader">
											<span className={`eventBadge ${ badgeClass }`}>
												{ category.toUpperCase() }
											</span>
											<span className={`eventTime ${ badgeClass }`}>
												{ formatTimeString(event.date) }
											</span>
										</div>

										<h3 className="eventName">{ event.name }</h3>

										<div className="eventMetaDetails">
											{ event.location && (
												<span className="metaItem">
													📍 { event.location }
												</span>
											)}
											{ isDual ? (
												event.opponent && (
													<span className="metaItem">
														👤 Opponent: { event.opponent }
													</span>
												)
											) : (
												Array.isArray(event.opponents) && event.opponents.length > 0 && (
													<span className="metaItem">
														👥 { event.opponents.join(", ") }
													</span>
												)
											)}
										</div>

										<div className="eventPills">
											{ event.division && <span className="eventPill">{ event.division.toUpperCase() }</span> }
											{ event.weightClasses && <span className="eventPill">{ event.weightClasses }</span> }
											{ !event.division && !event.weightClasses && isDual && <span className="eventPill">VARSITY</span> }
										</div>

										<div className="eventCardDivider"></div>

										<div className="eventCardFooter">
											{ isDual ? (
												<button 
													className="eventActionBtn dual"
													onClick={ () => { window.location.href = `/portal/dual.html?id=${ event.systemId || event.id || "" }`; } }
												>
													MANAGE LINEUP &rarr;
												</button>
											) : (
												<>
													{event.hasMatches ? (
														<button 
															className="eventActionBtn tournament"
															onClick={ () => { window.location.href = `/portal/tournamentsummary.html?id=${ event.id }`; } }
														>
															VIEW EVENT &rarr;
														</button>
													) : (
														(event.eventSystem === "Flo" || event.eventSystem === "Track" || /flo/i.test(event.eventSystem) || /track/i.test(event.eventSystem)) && (
															<button 
																className="eventActionBtn tournament"
																onClick={ () => {
																	if (/flo/i.test(event.eventSystem)) {
																		window.open(`https://events.flowrestling.org/event/${ event.systemId }/summary`);
																	} else if (/track/i.test(event.eventSystem)) {
																		window.open(`https://www.trackwrestling.com/tw/${ event.eventType || "tournament" }/VerifyPassword.jsp?tournamentId=${ event.systemId }`);
																	}
																}}
															>
																VIEW BRACKETS &rarr;
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

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Schedule />);
export default Schedule;
