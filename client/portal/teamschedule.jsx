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

const timeOptions = [
	"08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
	"11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM",
	"02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
	"06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM"
];

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

const formatFormDate = (dateInput) => {
	if (!dateInput) return "";
	const dateObject = parseEventDate(dateInput);
	if (!dateObject || isNaN(dateObject.getTime())) return "";
	const year = dateObject.getFullYear();
	const month = String(dateObject.getMonth() + 1).padStart(2, '0');
	const day = String(dateObject.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const TeamSchedule = () => {
	const seasonOptions = getSeasonOptions(new Date());
	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ teamEvents, setTeamEvents ] = useState([]);
	const [ events, setEvents ] = useState([]);
	const [ schools, setSchools ] = useState([]);

	const [ selectedSeason, setSelectedSeason ] = useState(seasonOptions[1].name);
	const [ selectedDivision, setSelectedDivision ] = useState("All");
	const [ reloadTrigger, setReloadTrigger ] = useState(0);

	// Modal form state
	const [ isModalOpen, setIsModalOpen ] = useState(false);
	const [ modalMode, setModalMode ] = useState("add");
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

	const [ formEventType, setFormEventType ] = useState("Tournament");
	const [ formOpponentId, setFormOpponentId ] = useState("");
	const [ formOpponentName, setFormOpponentName ] = useState("");
	const [ isOpponentFocused, setIsOpponentFocused ] = useState(false);

	const [ eventSearchQuery, setEventSearchQuery ] = useState("");
	const [ eventSearchResults, setEventSearchResults ] = useState([]);

	useEffect(() => {
		setIsLoading(true);
		const earliestSeason = seasonOptions[seasonOptions.length - 1];
		const latestSeason = seasonOptions[0];
		const startDate = earliestSeason.startDate;
		const endDate = latestSeason.endDate;
		
		const fetchUrl = `/api/teamscheduleload?startdate=${startDate}&enddate=${endDate}`;
		
		fetch(fetchUrl)
			.then(apiResponse => {
				if (apiResponse.ok) {
					return apiResponse.json();
				} else {
					throw Error(apiResponse.statusText);
				}
			})
			.then(responseData => {
				const loadedTeamEvents = [
					...(responseData.teamEvents || [])
				].map(teamEventItem => ({
					...teamEventItem,
					date: parseEventDate(teamEventItem.date),
					endDate: teamEventItem.endDate ? parseEventDate(teamEventItem.endDate) : null
				}));

				const loadedEvents = [
					...(responseData.events || [])
				].map(eventItem => ({
					...eventItem,
					date: parseEventDate(eventItem.date),
					endDate: eventItem.endDate ? parseEventDate(eventItem.endDate) : null
				}));

				setLoggedInUser(responseData.loggedInUser);
				setTeamEvents(loadedTeamEvents);
				setEvents(loadedEvents);
				setSchools(responseData.schools || []);

				setPageActive(true);
				setIsLoading(false);
			})
			.catch(fetchError => {
				console.warn(fetchError);
				setIsLoading(false);
			});
	}, [reloadTrigger]);

	const activeSeasonOption = seasonOptions.find(option => option.name === selectedSeason) || seasonOptions[1];
	const seasonStart = parseEventDate(activeSeasonOption.startDate);
	const seasonEnd = parseEventDate(activeSeasonOption.endDate + "T23:59:59");

	const filteredTeamEvents = teamEvents.filter(teamEventItem => {
		let matchesDivision = true;
		if (selectedDivision !== "All") {
			matchesDivision = (teamEventItem.division || "").toLowerCase() === selectedDivision.toLowerCase();
		}
		if (!matchesDivision) return false;

		if (teamEventItem.date) {
			const eventDate = parseEventDate(teamEventItem.date);
			return eventDate >= seasonStart && eventDate <= seasonEnd;
		}
		return true;
	});

	const getWeekStart = (dateValue) => {
		const dateObject = new Date(dateValue);
		const dayOfWeek = dateObject.getDay();
		const dateDifference = dateObject.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
		const mondayDate = new Date(dateObject.setDate(dateDifference));
		mondayDate.setHours(0, 0, 0, 0);
		return mondayDate;
	};

	const groupEventsByWeek = (eventsToGroup) => {
		const weekGroups = {};
		eventsToGroup.forEach(teamEventItem => {
			const weekStart = getWeekStart(teamEventItem.date);
			const weekKey = weekStart.getTime();
			if (!weekGroups[weekKey]) {
				weekGroups[weekKey] = {
					weekStart,
					days: {}
				};
			}
			
			const dayName = teamEventItem.date.toLocaleDateString([], { weekday: 'short' });
			const dayNumber = teamEventItem.date.getDate();
			const dayKey = `${dayName} ${dayNumber}`;
			
			if (!weekGroups[weekKey].days[dayKey]) {
				weekGroups[weekKey].days[dayKey] = {
					dayName,
					dayNumber,
					date: teamEventItem.date,
					events: []
				};
			}
			weekGroups[weekKey].days[dayKey].events.push(teamEventItem);
		});
		
		return Object.values(weekGroups).sort((firstWeek, secondWeek) => firstWeek.weekStart - secondWeek.weekStart);
	};

	const openAddModal = () => {
		setModalMode("add");
		setEditingEventId(null);
		setFormEventType("Tournament");
		setFormOpponentId("");
		setFormOpponentName("");
		setIsOpponentFocused(false);
		setFormName("");
		setFormDivision("Varsity");
		setFormDate(formatFormDate(new Date()));
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
		
		const opponentName = teamEventItem.opponent || (teamEventItem.name ? teamEventItem.name.replace(/^Fort Mill vs\s*/i, "") : "");
		setFormOpponentName(opponentName);
		const foundSchool = schools.find(schoolRecord => schoolRecord.name.toLowerCase() === opponentName.toLowerCase());
		setFormOpponentId(foundSchool ? foundSchool.id : "");
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
		const queryText = changeEvent.target.value;
		setEventSearchQuery(queryText);

		if (queryText.length >= 3) {
			const matchingEvents = events.filter(eventItem => 
				(eventItem.name || "").toLowerCase().includes(queryText.toLowerCase())
			);
			setEventSearchResults(matchingEvents);
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
				const [timePart, periodModifier] = formStartTime.split(' ');
				let [hourPart, minutePart] = timePart.split(':');
				let hourNumber = parseInt(hourPart, 10);
				if (periodModifier === 'PM' && hourNumber < 12) hourNumber += 12;
				if (periodModifier === 'AM' && hourNumber === 12) hourNumber = 0;
				hours = hourNumber;
				minutes = parseInt(minutePart || "0", 10);
			}
			dateIso = `${formDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
		}

		let endDateIso = null;
		if (formEventType === "Tournament" && formEndDate) {
			endDateIso = `${formEndDate}T00:00:00.000Z`;
		}

		const teamEventPayload = {
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
			teamEventPayload.id = editingEventId;
		}

		const opponentRecord = schools.find(schoolRecord => String(schoolRecord.id) === String(formOpponentId));
		const finalOpponentName = opponentRecord ? opponentRecord.name : formOpponentName.trim();

		fetch("/api/teamschedulesave", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				teamEvent: teamEventPayload,
				opponent: finalOpponentName
			})
		})
		.then(apiResponse => {
			if (apiResponse.ok) {
				closeFormModal();
				setReloadTrigger(previousCount => previousCount + 1);
			} else {
				alert("Error saving team event");
			}
		})
		.catch(submitError => {
			console.error("Error saving team event:", submitError);
		});
	};

	const handleDeleteClick = () => {
		if (!editingEventId) return;
		if (!confirm("Are you sure you want to delete this team event?")) return;

		fetch("/api/teamscheduledelete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: editingEventId })
		})
		.then(apiResponse => {
			if (apiResponse.ok) {
				closeFormModal();
				setReloadTrigger(previousCount => previousCount + 1);
			} else {
				alert("Error deleting team event");
			}
		})
		.catch(deleteError => {
			console.error("Error deleting team event:", deleteError);
		});
	};

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
							<h1>Team Schedule</h1>
						</header>

						<div className="scheduleFilters">
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
						</div>

						{filteredTeamEvents.length === 0 ? (
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
															{dayGroup.events.map((teamEventItem, indexValue) => {
																const isDualEvent = teamEventItem.eventType?.toLowerCase() === "dual" || teamEventItem.dualId ? true : false;
																const badgeText = isDualEvent ? "DUAL MEET" : "TOURNAMENT";
																const badgeClass = isDualEvent ? "dual" : "tournament";
																return (
																	<div key={teamEventItem.id || indexValue} className="timelineEventRow">
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
																				const isDual = teamEventItem.eventType?.toLowerCase() === "dual";
																				const targetEventId = teamEventItem.eventId;
																				if (isDual && targetEventId) {
																					return (
																						<button
																							className="timelineViewBtn"
																							onClick={() => {
																								window.location.href = `/portal/dual.html?id=${targetEventId}`;
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
						)}
					</div>
				)}
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
										onChange={changeEvent => {
											const valueText = changeEvent.target.value;
											setFormOpponentName(valueText);
											const foundSchool = schools.find(schoolRecord => schoolRecord.name.toLowerCase() === valueText.toLowerCase());
											if (foundSchool) {
												setFormOpponentId(foundSchool.id);
											} else {
												setFormOpponentId("");
											}
											if (!formName || formName.startsWith("Fort Mill vs ")) {
												setFormName(valueText.trim() ? `Fort Mill vs ${valueText.trim()}` : "");
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
												.filter(schoolRecord => schoolRecord.name.toLowerCase().includes((formOpponentName || "").toLowerCase()))
												.map((schoolRecord, schoolIndex) => (
													<li 
														key={schoolRecord.id || schoolIndex}
														onMouseDown={() => {
															setFormOpponentName(schoolRecord.name);
															setFormOpponentId(schoolRecord.id);
															setFormName(`Fort Mill vs ${schoolRecord.name}`);
															setIsOpponentFocused(false);
														}}
													>
														<div style={{ fontWeight: 600 }}>{schoolRecord.name}</div>
														{(schoolRecord.classification || schoolRecord.region) && (
															<div style={{ fontSize: "0.75rem", color: "#64748b" }}>
																{schoolRecord.classification || ""} {schoolRecord.region ? `• ${schoolRecord.region}` : ""}
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

							{/* Action Footer */}
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

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamSchedule />);
export default TeamSchedule;
