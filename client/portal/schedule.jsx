import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/schedule.css";

const Schedule = props => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ events, setEvents ] = useState([]);
	
	// Determine current season based on Sept 1 - Aug 31
	const getCurrentSeason = (d = new Date()) => {
		const year = d.getFullYear();
		const month = d.getMonth(); // 0-indexed, 8 is September
		if (month >= 8) {
			return `${year}-${year + 1}`;
		} else {
			return `${year - 1}-${year}`;
		}
	};

	const [ selectedSeason, setSelectedSeason ] = useState(getCurrentSeason());
	const [ selectedEventType, setSelectedEventType ] = useState("All");

	useEffect(() => {
		if (!pageActive) {
			fetch(`/api/scheduleload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					} else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					const loadedEvents = [
						...(data.events || []),
						...(data.floEvents || []),
						...(data.trackEvents || [])
					].map(event => ({
						...event,
						type: event.eventSystem?.toLowerCase(),
						date: new Date(event.date),
						endDate: event.endDate ? new Date(event.endDate) : null
					}));

					const loadedDuals = (data.duals || []).map(dual => ({
						id: dual.id || dual._id,
						name: dual.opponent ? `Dual vs ${dual.opponent}` : "Dual Match",
						opponent: dual.opponent,
						date: new Date(dual.dualDate),
						eventSystem: "dual",
						type: "dual"
					}));

					setLoggedInUser(data.loggedInUser);
					setEvents([...loadedEvents, ...loadedDuals]);
					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
					setIsLoading(false);
				});
		}
	}, []);

	// Helper to get season string for an event date
	const getEventSeason = (date) => {
		if (!date || isNaN(date.getTime())) return getCurrentSeason();
		const year = date.getFullYear();
		const month = date.getMonth();
		return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
	};

	// Generate season options dynamically
	const availableSeasons = Array.from(new Set([
		getCurrentSeason(),
		`${new Date().getFullYear() + 1}-${new Date().getFullYear() + 2}`,
		`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
		...events.map(e => getEventSeason(e.date))
	])).sort().reverse();

	// Helper to calculate Monday of the week for a given date
	const getMonday = (d) => {
		const date = new Date(d);
		const day = date.getDay();
		const diff = date.getDate() - day + (day === 0 ? -6 : 1);
		const monday = new Date(date.setDate(diff));
		monday.setHours(0, 0, 0, 0);
		return monday;
	};

	const getEventCategory = (event) => {
		const system = (event.eventSystem || "").toLowerCase();
		if (system.includes("track") || system.includes("flo")) {
			return "Tournament";
		}
		return "Dual";
	};

	// Filter events by season and event type
	const filteredEvents = events.filter(event => {
		const matchesSeason = getEventSeason(event.date) === selectedSeason;
		
		let matchesType = true;
		if (selectedEventType !== "All") {
			const category = getEventCategory(event);
			matchesType = category.toLowerCase() === selectedEventType.toLowerCase();
		}
		
		return matchesSeason && matchesType;
	});

	// Group filtered events by Week (Monday start) and then by Day
	const groupEventsByWeek = (eventList) => {
		const sorted = [...eventList].sort((a, b) => a.date - b.date);
		const weeksMap = new Map();

		sorted.forEach(event => {
			const monday = getMonday(event.date);
			const weekKey = monday.getTime();

			if (!weeksMap.has(weekKey)) {
				weeksMap.set(weekKey, {
					mondayDate: monday,
					daysMap: new Map()
				});
			}

			const weekGroup = weeksMap.get(weekKey);
			const dayKey = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate()).getTime();

			if (!weekGroup.daysMap.has(dayKey)) {
				weekGroup.daysMap.set(dayKey, {
					date: event.date,
					events: []
				});
			}

			weekGroup.daysMap.get(dayKey).events.push(event);
		});

		return Array.from(weeksMap.values()).map(week => ({
			mondayDate: week.mondayDate,
			days: Array.from(week.daysMap.values())
		}));
	};

	const groupedWeeks = groupEventsByWeek(filteredEvents);

	const formatTimeString = (date) => {
		if (!date) return "All Day";
		const hours = date.getHours();
		const minutes = date.getMinutes();
		if (hours === 0 && minutes === 0) return "All Day";
		return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	};

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		{
		isLoading ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" alt="Loading..." />
		</div>

		: !loggedInUser || !loggedInUser.privileges || (!loggedInUser.privileges.includes("scheduleView") && !loggedInUser.privileges.includes("scheduleManage")) ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:

		<div className={`schedule container ${ pageActive ? "active" : "" }`}>
			<header className="scheduleHeader">
				<h1>Schedule</h1>

				<div className="scheduleFilters">
					<select 
						value={ selectedSeason } 
						onChange={ e => setSelectedSeason(e.target.value) }
						aria-label="Filter Season"
					>
						{ availableSeasons.map(season => (
							<option key={ season } value={ season }>{ season }</option>
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

					<button 
						className="lineupButton addDual"
						onClick={ () => { window.location.href = "/portal/dual.html"; } }
					>
						Add Dual
					</button>
				</div>
			</header>

			<div className="agendaStream">
				{ groupedWeeks.length === 0 ? (
					<div className="noEvents">No events scheduled for this season.</div>
				) : (
					groupedWeeks.map(week => (
						<div key={ week.mondayDate.getTime() } className="weekGroup">
							<div className="weekHeader">
								<h2>Week of { week.mondayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) }</h2>
								<div className="weekDivider"></div>
							</div>

							<div className="weekCards">
								{ week.days.map(dayGroup => (
									<div key={ dayGroup.date.getTime() } className="dayCard">
										<div className="dayAccentBar"></div>
										
										<div className="dayDateColumn">
											<div className="dayName">
												{ dayGroup.date.toLocaleDateString("en-US", { weekday: "short" }) } { dayGroup.date.getDate() }
											</div>
											<div className="dayTime">
												{ formatTimeString(dayGroup.date) }
											</div>
										</div>

										<div className="dayEventsColumn">
											{ dayGroup.events.map((event, idx) => {
												const category = getEventCategory(event);
												const isDual = category.toLowerCase() === "dual";

												return (
													<div 
														key={ event.id || idx } 
														data-testid={ event.id } 
														className="eventRow"
													>
														<div className="eventMainDetails">
															<div className="eventTitleHeader">
																<span className={`eventBadge ${ isDual ? "dual" : "tournament" }`}>
																	{ category }
																</span>
																<h3 className="eventName">{ event.name }</h3>
															</div>

															<div className="eventMeta">
																{ event.location && (
																	<span className="eventLocation">
																		📍 { event.location }
																	</span>
																)}
															</div>

															{ isDual ? (
																event.opponent && (
																	<div className="opponentTag">
																		<span className="oppDot"></span> Opponent: { event.opponent }
																	</div>
																)
															) : (
																Array.isArray(event.opponents) && event.opponents.length > 0 && (
																	<div className="opponentPills">
																		{ event.opponents.map((opp, i) => (
																			<span key={ i } className="oppPill">{ opp }</span>
																		))}
																	</div>
																)
															)}
														</div>

														<div className="eventAction">
															{ isDual ? (
																<button 
																	className="lineupButton view"
																	onClick={ () => { window.location.href = `/portal/dual.html?id=${ event.id || "" }`; } }
																>
																	Manage Dual
																</button>
															) : (
																<button 
																	className="lineupButton view"
																	onClick={ () => {
																		if (/flo/i.test(event.eventSystem)) {
																			window.open(`https://events.flowrestling.org/event/${ event.systemId }/summary`);
																		} else if (/track/i.test(event.eventSystem)) {
																			window.open(`https://www.trackwrestling.com/tw/${ event.eventType || "tournament" }/VerifyPassword.jsp?tournamentId=${ event.systemId }`);
																		}
																	}}
																>
																	View
																</button>
															)}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								))}
							</div>
						</div>
					))
				)}
			</div>
		</div>
		}
	</div>
</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Schedule />);
export default Schedule;
