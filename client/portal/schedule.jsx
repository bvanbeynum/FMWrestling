import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/schedule.css";

const getSeasonOptions = (dateObject) => {
	const currentYear = dateObject.getFullYear();
	const currentMonth = dateObject.getMonth(); // 0-indexed, so 8 is September
	let startYear;
	if (currentMonth >= 8) { // Sept - Dec
		startYear = currentYear;
	} else { // Jan - Aug
		startYear = currentYear - 1;
	}
	
	const formatSeason = (startYearValue) => {
		const yearShortString = startYearValue.toString().slice(-2);
		const nextYearShortString = (startYearValue + 1).toString().slice(-2);
		return {
			name: `${yearShortString}-${nextYearShortString}`,
			startDate: `${startYearValue}-09-01`,
			endDate: `${startYearValue + 1}-08-31`
		};
	};

	return [
		formatSeason(startYear + 1),  // Next season
		formatSeason(startYear),      // Current season
		formatSeason(startYear - 1)   // Previous season
	];
};

const timeOptions = [
	"08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
	"11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM",
	"02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
	"06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM"
];

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

const formatFormDate = (dateInput) => {
	if (!dateInput) return "";
	const dateObj = parseEventDate(dateInput);
	if (!dateObj || isNaN(dateObj.getTime())) return "";
	const y = dateObj.getFullYear();
	const m = String(dateObj.getMonth() + 1).padStart(2, '0');
	const d = String(dateObj.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
};

const Schedule = props => {
	const seasonOptions = getSeasonOptions(new Date());
	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ events, setEvents ] = useState([]);
	const [ teamEvents, setTeamEvents ] = useState([]);

	const [ selectedState, setSelectedState ] = useState("SC");
	const [ selectedSeason, setSelectedSeason ] = useState(seasonOptions[1].name);
	const [ selectedEventType, setSelectedEventType ] = useState("All");
	const [ selectedDivision, setSelectedDivision ] = useState("All"); // 'All', 'Varsity', 'JV', 'Middle School'
	const [ activeView, setActiveView ] = useState("team"); // 'team' (default) or 'all'
	const [ reloadTrigger, setReloadTrigger ] = useState(0);

	// Modal form state
	const [ isModalOpen, setIsModalOpen ] = useState(false);
	const [ modalMode, setModalMode ] = useState("add"); // 'add' or 'edit'
	const [ editingEventId, setEditingEventId ] = useState(null);

	const [ formName, setFormName ] = useState("");
	const [ formDivision, setFormDivision ] = useState("Varsity");
	const [ formDate, setFormDate ] = useState("");
	const [ formEndDate, setFormEndDate ] = useState("");
	const [ formStartTime, setFormStartTime ] = useState("");
	const [ formLocation, setFormLocation ] = useState("");
	const [ formLinkedEventId, setFormLinkedEventId ] = useState("");
	const [ formLinkedEventName, setFormLinkedEventName ] = useState("");
	const [ formLinkedDualId, setFormLinkedDualId ] = useState("");

	const [ schools, setSchools ] = useState([]);
	const [ opponentSelectGroup, setOpponentSelectGroup ] = useState([]);
	const [ formEventType, setFormEventType ] = useState("Tournament");
	const [ formOpponentId, setFormOpponentId ] = useState("");
	const [ formOpponentName, setFormOpponentName ] = useState("");
	const [ isOpponentFocused, setIsOpponentFocused ] = useState(false);

	const [ eventSearchQuery, setEventSearchQuery ] = useState("");
	const [ eventSearchResults, setEventSearchResults ] = useState([]);
	
	const [ viewDate, setViewDate ] = useState(new Date());
	const [ selectedDate, setSelectedDate ] = useState(new Date());

	useEffect(() => {
		setIsLoading(true);
		const earliestSeason = seasonOptions[seasonOptions.length - 1];
		const latestSeason = seasonOptions[0];
		const startDateString = earliestSeason.startDate;
		const endDateString = latestSeason.endDate;
		
		let fetchUrl = `/api/scheduleload?startdate=${startDateString}&enddate=${endDateString}`;
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

				const loadedTeamEvents = [
					...(responseData.teamEvents || [])
				].map(teamEventItem => ({
					...teamEventItem,
					date: parseEventDate(teamEventItem.date),
					endDate: teamEventItem.endDate ? parseEventDate(teamEventItem.endDate) : null
				}));

				setLoggedInUser(responseData.loggedInUser);
				setEvents(loadedEvents);
				setTeamEvents(loadedTeamEvents);

				// Process schools dropdown grouped by classification and region
				const schoolList = responseData.schools || [];
				setSchools(schoolList);
				const groups = [...new Set(schoolList.sort((a, b) => 
					a.classification !== b.classification ? (a.classification > b.classification ? -1 : 1)
					: a.region !== b.region ? (a.region > b.region ? 1 : -1)
					: a.name > b.name ? 1 : -1
				).map(s => `${s.classification || "NA"} - ${s.region || "NA"}`))]
				.map(groupName => ({
					name: groupName,
					schools: schoolList.filter(s => `${s.classification || "NA"} - ${s.region || "NA"}` === groupName)
				}));
				setOpponentSelectGroup(groups);

				setPageActive(true);
				setIsLoading(false);

				const todayDate = new Date();
				setViewDate(todayDate);
				setSelectedDate(todayDate);
			})
			.catch(error => {
				console.warn(error);
				setIsLoading(false);
			});
	}, [selectedState, reloadTrigger]);

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

	const filteredEvents = events;

	const activeSeasonOption = seasonOptions.find(o => o.name === selectedSeason) || seasonOptions[1];
	const seasonStart = parseEventDate(activeSeasonOption.startDate);
	const seasonEnd = parseEventDate(activeSeasonOption.endDate + "T23:59:59");

	const filteredTeamEvents = teamEvents.filter(teamEventItem => {
		let matchesDivision = true;
		if (selectedDivision !== "All") {
			matchesDivision = (teamEventItem.division || "").toLowerCase() === selectedDivision.toLowerCase();
		}
		if (!matchesDivision) return false;

		if (teamEventItem.date) {
			const d = parseEventDate(teamEventItem.date);
			return d >= seasonStart && d <= seasonEnd;
		}
		return true;
	});

	const isSameDay = (firstDate, secondDate) => {
		if (!firstDate || !secondDate) return false;
		const d1 = parseEventDate(firstDate);
		const d2 = parseEventDate(secondDate);
		return d1.getFullYear() === d2.getFullYear() &&
			   d1.getMonth() === d2.getMonth() &&
			   d1.getDate() === d2.getDate();
	};

	const firstDayOfCurrentMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
	const firstDayOfNextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

	const hasPrevMonthEvents = events.some(e => {
		const d = parseEventDate(e.date);
		return d && d < firstDayOfCurrentMonth;
	});

	const hasNextMonthEvents = events.some(e => {
		const d = parseEventDate(e.date);
		return d && d >= firstDayOfNextMonth;
	});

	const handlePrevMonth = () => {
		if (!hasPrevMonthEvents) return;
		const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
		setViewDate(newDate);
		setSelectedDate(newDate);
	};

	const handleNextMonth = () => {
		if (!hasNextMonthEvents) return;
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

	const getWeekStart = (dateValue) => {
		const dateObject = new Date(dateValue);
		const dayOfWeek = dateObject.getDay();
		const dateDifference = dateObject.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
		const mondayDate = new Date(dateObject.setDate(dateDifference));
		mondayDate.setHours(0, 0, 0, 0);
		return mondayDate;
	};

	const groupEventsByWeek = (eventsList) => {
		const weekGroups = {};
		eventsList.forEach(eventItem => {
			const weekStart = getWeekStart(eventItem.date);
			const weekKey = weekStart.getTime();
			if (!weekGroups[weekKey]) {
				weekGroups[weekKey] = {
					weekStart,
					days: {}
				};
			}
			
			const dayName = eventItem.date.toLocaleDateString([], { weekday: 'short' });
			const dayNumber = eventItem.date.getDate();
			const dayKey = `${dayName} ${dayNumber}`;
			
			if (!weekGroups[weekKey].days[dayKey]) {
				weekGroups[weekKey].days[dayKey] = {
					dayName,
					dayNumber,
					date: eventItem.date,
					events: []
				};
			}
			weekGroups[weekKey].days[dayKey].events.push(eventItem);
		});
		
		return Object.values(weekGroups).sort((firstWeek, secondWeek) => firstWeek.weekStart - secondWeek.weekStart);
	};

	const calendarDays = generateCalendarDays();

	const selectedDayEvents = filteredEvents.filter(eventItem => isSameDay(eventItem.date, selectedDate));
	const viewedMonthEvents = filteredEvents.filter(eventItem => 
		eventItem.date && eventItem.date.getFullYear() === viewDate.getFullYear() && eventItem.date.getMonth() === viewDate.getMonth()
	);

	const formatTimeString = (dateValue) => {
		if (!dateValue || isNaN(dateValue.getTime())) return "All Day";
		const hours = dateValue.getHours();
		const minutes = dateValue.getMinutes();
		if (hours === 0 && minutes === 0) return "All Day";
		return dateValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	// Modal actions
	const openAddModal = () => {
		setModalMode("add");
		setEditingEventId(null);
		setFormEventType("Tournament");
		setFormOpponentId("");
		setFormOpponentName("");
		setIsOpponentFocused(false);
		setFormName("");
		setFormDivision("Varsity");
		setFormDate(selectedDate ? formatFormDate(selectedDate) : formatFormDate(new Date()));
		setFormEndDate("");
		setFormStartTime("");
		setFormLocation("");
		setFormLinkedEventId("");
		setFormLinkedEventName("");
		setFormLinkedDualId("");
		setEventSearchQuery("");
		setEventSearchResults([]);
		setIsModalOpen(true);
	};

	const openEditModal = (teamEventItem) => {
		setModalMode("edit");
		setEditingEventId(teamEventItem.id);
		setFormEventType(teamEventItem.eventType || (teamEventItem.dualId ? "Dual" : "Tournament"));
		
		const oppName = teamEventItem.opponent || (teamEventItem.name ? teamEventItem.name.replace(/^Fort Mill vs\s*/i, "") : "");
		setFormOpponentName(oppName);
		const foundSch = schools.find(s => s.name.toLowerCase() === oppName.toLowerCase());
		setFormOpponentId(foundSch ? foundSch.id : "");
		setIsOpponentFocused(false);

		setFormName(teamEventItem.name || "");
		setFormDivision(teamEventItem.division || "Varsity");
		setFormDate(formatFormDate(teamEventItem.date));
		setFormEndDate(formatFormDate(teamEventItem.endDate));
		setFormStartTime(teamEventItem.startTime || "");
		setFormLocation(teamEventItem.location || "");
		setFormLinkedEventId(teamEventItem.eventId || "");
		setFormLinkedEventName(teamEventItem.event?.name || "");
		setFormLinkedDualId(teamEventItem.dualId || "");
		setEventSearchQuery("");
		setEventSearchResults([]);
		setIsModalOpen(true);
	};

	const closeFormModal = () => {
		setIsModalOpen(false);
	};

	const handleEventSearchChange = (changeEvent) => {
		const textValue = changeEvent.target.value;
		setEventSearchQuery(textValue);

		if (textValue.length >= 3) {
			const matches = events.filter(eventItem => 
				(eventItem.name || "").toLowerCase().includes(textValue.toLowerCase())
			);
			setEventSearchResults(matches);
		} else {
			setEventSearchResults([]);
		}
	};

	const linkGeneralEvent = (eventItem) => {
		setFormLinkedEventId(eventItem.id);
		setFormLinkedEventName(eventItem.name);
		setEventSearchQuery("");
		setEventSearchResults([]);
	};

	const unlinkGeneralEvent = () => {
		setFormLinkedEventId("");
		setFormLinkedEventName("");
	};

	const handleFormSubmit = (submitEvent) => {
		submitEvent.preventDefault();

		let dateIso = null;
		if (formDate) {
			let hours = 0;
			let minutes = 0;
			if (formStartTime) {
				const [time, modifier] = formStartTime.split(' ');
				let [h, m] = time.split(':');
				let hNum = parseInt(h, 10);
				if (modifier === 'PM' && hNum < 12) hNum += 12;
				if (modifier === 'AM' && hNum === 12) hNum = 0;
				hours = hNum;
				minutes = parseInt(m || "0", 10);
			}
			dateIso = `${formDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
		}

		let endDateIso = null;
		if (formEventType === "Tournament" && formEndDate) {
			endDateIso = `${formEndDate}T00:00:00.000Z`;
		}

		const teamEventObject = {
			eventType: formEventType,
			name: formName,
			division: formDivision,
			date: dateIso,
			endDate: endDateIso,
			startTime: formStartTime,
			location: formLocation,
			eventId: formLinkedEventId || null,
			dualId: formLinkedDualId || null
		};

		if (modalMode === "edit" && editingEventId) {
			teamEventObject.id = editingEventId;
		}

		const opponentRecord = schools.find(s => String(s.id) === String(formOpponentId));
		const finalOpponent = opponentRecord ? opponentRecord.name : formOpponentName.trim();

		fetch("/api/schedulesave", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				teamEvent: teamEventObject,
				opponent: finalOpponent
			})
		})
		.then(apiResponse => {
			if (apiResponse.ok) {
				closeFormModal();
				setReloadTrigger(prev => prev + 1);
			} else {
				alert("Error saving team event");
			}
		})
		.catch(error => {
			console.error("Error saving team event:", error);
		});
	};

	const handleDeleteClick = () => {
		if (!editingEventId) return;
		if (!confirm("Are you sure you want to delete this team event?")) return;

		fetch("/api/teameventdelete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: editingEventId })
		})
		.then(apiResponse => {
			if (apiResponse.ok) {
				closeFormModal();
				setReloadTrigger(prev => prev + 1);
			} else {
				alert("Error deleting team event");
			}
		})
		.catch(error => {
			console.error("Error deleting team event:", error);
		});
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
				<header>
					<h1>
						{ activeView === "team" ? "Schedule" : `${monthNamesFull[viewDate.getMonth()]} ${viewDate.getFullYear()}` }
					</h1>
				</header>

				<div className="scheduleFilters">
					{activeView === "team" ? (
						<>
							<select 
								value={ selectedSeason } 
								onChange={ changeEvent => setSelectedSeason(changeEvent.target.value) }
								aria-label="Filter Season"
							>
								{seasonOptions.map(option => (
									<option key={option.name} value={option.name}>{option.name}</option>
								))}
							</select>

							<select 
								value={ selectedDivision } 
								onChange={ changeEvent => setSelectedDivision(changeEvent.target.value) }
								aria-label="Filter Division"
							>
								<option value="All">All Divisions</option>
								<option value="Varsity">Varsity</option>
								<option value="JV">JV</option>
								<option value="Middle School">Middle School</option>
							</select>

							{ loggedInUser?.privileges?.includes("scheduleManage") && (
								<button 
									className="lineupButton addDual"
									onClick={ openAddModal }
								>
									Add Event
								</button>
							)}
						</>
					) : (
						<>
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

							{ loggedInUser?.privileges?.includes("scheduleManage") && (
								<button 
									className="lineupButton addDual"
									onClick={ openAddModal }
								>
									Add Event
								</button>
							)}
						</>
					)}
				</div>

				{activeView === "team" ? (
					filteredTeamEvents.length === 0 ? (
						<div className="noEvents">No team events scheduled for this season.</div>
					) : (
						<div className="teamTimeline">
							{groupEventsByWeek(filteredTeamEvents).map(weekGroup => {
								const weekStartKey = weekGroup.weekStart.getTime();
								return (
									<div key={weekStartKey} className="weekSection">
										<h3 className="weekHeader">
											Week of {weekGroup.weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })}
										</h3>
										
										{Object.values(weekGroup.days).map(dayGroup => {
											const dayGroupKey = `${dayGroup.dayName}-${dayGroup.dayNumber}`;
											const dayTimeText = dayGroup.events[0]?.startTime || "All Day";
											return (
												<div key={dayGroupKey} className="dayTimelineCard">
													<div className="dayTimelineCardHeader">
														<span className="dayTitle">{dayGroup.dayName} {dayGroup.dayNumber}</span>
														<span className="dayTime">{dayTimeText}</span>
													</div>
													<div className="dayTimelineCardEvents">
														{dayGroup.events.map((teamEventItem, indexVal) => {
															const isDualEvent = teamEventItem.dualId ? true : false;
															const badgeText = isDualEvent ? "DUAL MEET" : "TOURNAMENT";
															const badgeClass = isDualEvent ? "dual" : "tournament";
															return (
																<div key={teamEventItem.id || indexVal} className="timelineEventRow">
																	<div className="timelineEventLeft">
																		<span className={`timelineBadge ${badgeClass}`}>
																			{badgeText}
																		</span>
																		<div className="timelineEventDetails">
																			<h4 className="timelineEventName">{teamEventItem.name}</h4>
																			{teamEventItem.location && (
																				<span className="timelineEventLocation">
																					📍 {teamEventItem.location}
																				</span>
																			)}
																		</div>
																	</div>
																	<div className="timelineEventRight">
																		{(() => {
																			const isDual = teamEventItem.eventType?.toLowerCase() === "dual" || teamEventItem.dualId;
																			if (isDual) {
																				return (
																					<button
																						className="timelineViewBtn"
																						onClick={() => {
																							window.location.href = `/portal/dual.html?id=${teamEventItem.dualId}`;
																						}}
																					>
																						View
																					</button>
																				);
																			} else {
																				return (
																					<>
																						{loggedInUser?.privileges?.includes("scheduleManage") && (
																							<button 
																								className="timelineEditBtn" 
																								onClick={() => openEditModal(teamEventItem)}
																							>
																								Edit
																							</button>
																						)}
																						{teamEventItem.eventId && (
																							<button
																								className="timelineViewBtn"
																								onClick={() => {
																									window.location.href = `/portal/tournamentsummary.html?id=${teamEventItem.eventId}`;
																								}}
																							>
																								View
																							</button>
																						)}
																					</>
																				);
																			}
																		})()}
																	</div>
																</div>
															);
														})}
													</div>
												</div>
											);
										})}
									</div>
								);
							})}
						</div>
					)
				) : (
					<>
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
								{ calendarDays.map((cell, indexValue) => {
									const dayEvents = filteredEvents.filter(eventItem => isSameDay(eventItem.date, cell.date));
									const isSelected = isSameDay(cell.date, selectedDate);

									return (
										<div 
											key={ indexValue } 
											className={`dayCell ${ cell.isCurrentMonth ? "currentMonth" : "otherMonth" } ${ isSelected ? "selected" : ""}`}
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
															VIEW DUAL &rarr;
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
																				window.open(`https://events.flowrestling.org/event/${ eventItem.systemId }/summary`);
																			} else if (/track/i.test(eventItem.eventSystem)) {
																				window.open(`https://www.trackwrestling.com/tw/${ eventItem.eventType || "tournament" }/VerifyPassword.jsp?tournamentId=${ eventItem.systemId }`);
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
					</>
				)}
			</div>
		)}
	</div>

	{/* Bottom Navigation Bar */}
	<div className="bottomNav">
		<div 
			className={`navItem ${activeView === "team" ? "active" : ""}`} 
			onClick={() => setActiveView("team")}
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
			<span>Team</span>
		</div>
		<div 
			className={`navItem ${activeView === "all" ? "active" : ""}`} 
			onClick={() => setActiveView("all")}
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
				<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
				<line x1="16" y1="2" x2="16" y2="6" />
				<line x1="8" y1="2" x2="8" y2="6" />
				<line x1="3" y1="10" x2="21" y2="10" />
			</svg>
			<span>All</span>
		</div>
	</div>

	{/* Team Event Add / Edit Modal */}
	{isModalOpen && (
		<div className="modalOverlay">
			<div className="modalContainer">
				<header className="modalHeader">
					<h3>{modalMode === "add" ? "ADD TEAM EVENT" : "EDIT TEAM EVENT"}</h3>
					<button className="modalCloseBtn" onClick={closeFormModal}>&times;</button>
				</header>

				<form onSubmit={handleFormSubmit} className="modalForm">
					{/* Event Type */}
					<div className="formGroup">
						<label htmlFor="eventTypeSelect">Event Type *</label>
						<select
							id="eventTypeSelect"
							value={formEventType}
							onChange={changeEvent => setFormEventType(changeEvent.target.value)}
							disabled={modalMode === "edit"}
						>
							<option value="Tournament">Tournament</option>
							<option value="Dual">Dual</option>
						</select>
					</div>

					{/* Opponent Selection (Duals only) */}
					{formEventType === "Dual" && (
						<div className="formGroup autocompleteGroup">
							<label htmlFor="eventOpponentInput">Opponent *</label>
							<input
								type="text"
								id="eventOpponentInput"
								value={formOpponentName}
								onChange={e => {
									const val = e.target.value;
									setFormOpponentName(val);
									const found = schools.find(s => s.name.toLowerCase() === val.toLowerCase());
									if (found) {
										setFormOpponentId(found.id);
									} else {
										setFormOpponentId("");
									}
									if (!formName || formName.startsWith("Fort Mill vs ")) {
										setFormName(val.trim() ? `Fort Mill vs ${val.trim()}` : "");
									}
								}}
								onFocus={() => setIsOpponentFocused(true)}
								onBlur={() => setTimeout(() => setIsOpponentFocused(false), 200)}
								placeholder="Type or select opponent school..."
								required
							/>
							{isOpponentFocused && (
								<ul className="autocompleteResultsList">
									{schools
										.filter(sch => sch.name.toLowerCase().includes((formOpponentName || "").toLowerCase()))
										.map((sch, sIdx) => (
											<li 
												key={sch.id || sIdx}
												onMouseDown={() => {
													setFormOpponentName(sch.name);
													setFormOpponentId(sch.id);
													setFormName(`Fort Mill vs ${sch.name}`);
													setIsOpponentFocused(false);
												}}
											>
												<div style={{ fontWeight: 600 }}>{sch.name}</div>
												{(sch.classification || sch.region) && (
													<div style={{ fontSize: "0.75rem", color: "#64748b" }}>
														{sch.classification || ""} {sch.region ? `• ${sch.region}` : ""}
													</div>
												)}
											</li>
										))
									}
								</ul>
							)}
						</div>
					)}

					{/* 1. Name */}
					<div className="formGroup">
						<label htmlFor="eventName">Event Name *</label>
						<input 
							type="text" 
							id="eventName" 
							value={formName} 
							onChange={changeEvent => setFormName(changeEvent.target.value)} 
							required 
						/>
					</div>

					{/* 2. Division */}
					<div className="formGroup">
						<label htmlFor="eventDivision">Division *</label>
						<select 
							id="eventDivision" 
							value={formDivision} 
							onChange={changeEvent => setFormDivision(changeEvent.target.value)}
						>
							<option value="Varsity">Varsity</option>
							<option value="JV">JV</option>
							<option value="Middle School">Middle School</option>
						</select>
					</div>

					{/* 3. Dates */}
					<div className="formRow">
						<div className="formGroup">
							<label htmlFor="eventDate">Start Date *</label>
							<input 
								type="date" 
								id="eventDate" 
								value={formDate} 
								onChange={changeEvent => setFormDate(changeEvent.target.value)} 
								required 
							/>
						</div>
						{formEventType === "Tournament" && (
							<div className="formGroup">
								<label htmlFor="eventEndDate">End Date (Optional)</label>
								<input 
									type="date" 
									id="eventEndDate" 
									value={formEndDate} 
									onChange={changeEvent => setFormEndDate(changeEvent.target.value)} 
								/>
							</div>
						)}
					</div>

					{/* 4. Start Time */}
					<div className="formGroup">
						<label htmlFor="eventStartTime">Start Time (Optional)</label>
						<select 
							id="eventStartTime" 
							value={formStartTime} 
							onChange={changeEvent => setFormStartTime(changeEvent.target.value)}
						>
							<option value="">Not Set (All Day)</option>
							{timeOptions.map(timeOption => (
								<option key={timeOption} value={timeOption}>
									{timeOption}
								</option>
							))}
						</select>
					</div>

					{/* 5. Location */}
					<div className="formGroup">
						<label htmlFor="eventLocation">Location</label>
						<input 
							type="text" 
							id="eventLocation" 
							value={formLocation} 
							onChange={changeEvent => setFormLocation(changeEvent.target.value)} 
						/>
					</div>

					{formEventType === "Tournament" && (
						<>
							<div className="modalDivider"></div>
							<h4 className="modalSubTitle">Linked Integrations</h4>

							{/* 6. Autocomplete Event Link */}
							<div className="formGroup autocompleteGroup">
								<label htmlFor="eventLinkSearch">Link to Tournament (Optional)</label>
								{formLinkedEventId ? (
									<div className="selectedIntegrationBadge">
										<span>🏆 Linked: {formLinkedEventName}</span>
										<button type="button" className="unlinkBtn" onClick={unlinkGeneralEvent}>Remove Link</button>
									</div>
								) : (
									<>
										<input 
											type="text" 
											id="eventLinkSearch" 
											placeholder="Type at least 3 chars to search general events..." 
											value={eventSearchQuery} 
											onChange={handleEventSearchChange}
										/>
										{eventSearchResults.length > 0 && (
											<ul className="autocompleteResultsList">
												{eventSearchResults.map(eventItem => (
													<li 
														key={eventItem.id} 
														onClick={() => linkGeneralEvent(eventItem)}
													>
														{eventItem.name} ({new Date(eventItem.date).toLocaleDateString()})
													</li>
												))}
											</ul>
										)}
									</>
								)}
							</div>
						</>
					)}

					{/* 8. Action Footer */}
					<footer className="modalActionFooter">
						{modalMode === "edit" && (
							<button 
								type="button" 
								className="modalDeleteBtn" 
								onClick={handleDeleteClick}
							>
								Delete Event
							</button>
						)}
						<div className="modalSubmitGroup">
							<button type="button" className="modalCancelBtn" onClick={closeFormModal}>Cancel</button>
							<button type="submit" className="modalSaveBtn">Save Event</button>
						</div>
					</footer>
				</form>
			</div>
		</div>
	)}
</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Schedule />);
export default Schedule;
