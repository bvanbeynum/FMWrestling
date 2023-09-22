import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/schedule.css";

const Schedule = props => {

	const emptyEvent = { name: "", date: new Date(new Date().setHours(0,0,0,0)), endDate: "", location: "" },
		months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		minDate = new Date(new Date().setHours(0,0,0,0)),
		loading = [
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120Zm156-348q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Empty
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Top
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Full
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-516q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg> // Bottom
		];

	const [ pageActive, setPageActive ] = useState(false);
	const [ newEvent, setNewEvent ] = useState(emptyEvent);

	const [ savingId, setSavingId ] = useState(null);
	const [ loadingIndex, setLoadingIndex ] = useState(0);
	const [ errorMessage, setErrorMessage ] = useState("");
	const [ isEventsLoading, setEventsLoading ] = useState(false);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ selectedState, setSelectedState ] = useState("SC");

	const [ events, setEvents ] = useState([]);
	const [ editItem, setEditItem ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ monthSelected, setMonthSelect ] = useState(new Date().getMonth());
	const [ yearSelected, setYearSelected ] = useState(new Date().getFullYear());
	const [ monthDays, setMonthDays ] = useState(Array.from(Array(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).keys()).map(day => ({ day: day + 1})));
	const [ monthStart, setMonthStart ] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 1); // get the first day of the week for the current month

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
			setEventsLoading(true);
			
			fetch(`/api/scheduleload?startdate=${ monthSelected + 1 }/1/${ yearSelected }&enddate=${ monthSelected + 1 }/${ new Date(yearSelected, monthSelected + 1, 0).getDate() }/${ yearSelected }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					
					const newEvents = [
						...data.events.map(event => ({
								...event, 
								type: "mill",
								date: new Date(event.date),
								endDate: event.endDate ? new Date(event.endDate) : null
							})),
						...data.floEvents.map(event => ({
							...event,
							type: "flo",
							date: new Date(event.date),
							endDate: event.endDate ? new Date(event.endDate) : null,
							location: event.location + " - " + event.city + ", " + event.state
						})),
						...data.trackEvents.map(event => ({
							...event,
							type: "track",
							date: new Date(event.date),
							endDate: event.endDate ? new Date(event.endDate) : null
						}))
					];

					const days = Array.from(Array(new Date(yearSelected, monthSelected + 1, 0).getDate()).keys()) // Get array of dates, get last day of the month to know array length
					.map(day => {
						const dateStart = new Date(yearSelected, monthSelected, day + 1),
							dateEnd = new Date(yearSelected, monthSelected, day + 2);

						return {
							day: day + 1,
							className: newEvents.some(event => (event.date >= dateStart && event.date < dateEnd) || (event.endDate && event.endDate > dateStart && event.endDate < dateEnd)) ? "single" : ""
						};
					});

					setLoggedInUser(data.loggedInUser);
					setEvents(newEvents);
					setMonthDays(days);
					setEventsLoading(false);

					// Expand filter box if no events are visible
					if (!newEvents.some(event => event.date.getMonth() === monthSelected && event.date.getFullYear() === yearSelected && (!selectedState || event.state == selectedState || !event.state))) {
						setIsFilterExpanded(true);
					}
					
				})
				.catch(error => {
					console.warn(error);
					setEventsLoading(false);
				});
		}
	}, []);

	const changeMonth = (monthNew, yearNew) => {
		setMonthSelect(monthNew);
		setYearSelected(yearNew);
		setMonthStart(new Date(yearNew, monthNew, 1).getDay() + 1); // get the first day of the week for the current month
		setEventsLoading(true);
		setMonthDays(Array.from(Array(new Date(yearNew, monthNew + 1, 0).getDate()).keys()).map(day => ({ day: day + 1})));
		
		fetch(`/api/scheduleload?startdate=${ monthNew + 1 }/1/${ yearNew }&enddate=${ monthNew + 1 }/${ new Date(yearNew, monthNew + 1, 0).getDate() }/${ yearNew }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				
				const newEvents = [
					...data.events.map(event => ({
							...event, 
							type: "mill",
							date: new Date(event.date),
							endDate: event.endDate ? new Date(event.endDate) : null
						})),
					...data.floEvents.map(event => ({
						...event,
						type: "flo",
						date: new Date(event.date),
						endDate: event.endDate ? new Date(event.endDate) : null,
						location: event.location + " - " + event.city + ", " + event.state
					})),
					...data.trackEvents.map(event => ({
						...event,
						type: "track",
						date: new Date(event.date),
						endDate: event.endDate ? new Date(event.endDate) : null
					}))
				];
				
				setEvents(newEvents);
					
				const days = Array.from(Array(new Date(yearNew, monthNew + 1, 0).getDate()).keys()) // Get array of dates, get last day of the month to know array length
				.map(day => {
					const dateStart = new Date(yearNew, monthNew, day + 1),
						dateEnd = new Date(yearNew, monthNew, day + 2);

					return {
						day: day + 1,
						className: newEvents.some(event => (event.date >= dateStart && event.date < dateEnd) || (event.endDate && event.endDate > dateStart && event.endDate < dateEnd)) ? "single" : ""
					};
				})

				setMonthDays(days);
				setEventsLoading(false);

			})
			.catch(error => {
				console.warn(error);
				setEventsLoading(false);
			});
			
	};

	const saveEvent = event => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);

		setSavingId(event.id || "newEvent");

		fetch("/api/schedulesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ save: event }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				if (!event.id) {
					const newEvents = events.concat({
							...data.event, 
							type: "mill",
							date: new Date(data.event.date), 
							endDate: data.event.endDate ? new Date(data.event.endDate) : null
						});

					setEvents(newEvents);
					setNewEvent(emptyEvent);

					const days = Array.from(Array(new Date(yearSelected, monthSelected + 1, 0).getDate()).keys()) // Get array of dates, get last day of the month to know array length
					.map(day => {
						const dateStart = new Date(yearSelected, monthSelected, day + 1),
							dateEnd = new Date(yearSelected, monthSelected, day + 2);

						return {
							day: day + 1,
							className: newEvents.some(event => (event.date >= dateStart && event.date < dateEnd) || (event.endDate && event.endDate > dateStart && event.endDate < dateEnd)) ? "single" : ""
						};
					})

					setMonthDays(days);
					
				}

				setEditItem(null);
				setSavingId(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error saving the event");
				setSavingId(null);
				clearInterval(loadingInterval);
			});
	};

	const deleteEvent = eventId => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);

		setSavingId(eventId);

		fetch("/api/schedulesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delete: eventId }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {
				setEvents(events => events.filter(event => event.id !== eventId));
				setEditItem(null);
				setSavingId(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error deleting the event");
				setSavingId(null);
				clearInterval(loadingInterval);
			});
	};

	const markFavorite = event => {
		if (!event.type === "flo")
			return;

		const saveObject = event.isFavorite ? { removeFavorite: { floEventId: event.id }} : { addFavorite: { floEventId: event.id }};

		fetch("/api/schedulesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify(saveObject) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setEvents(events => events.map(event => event.id === data.floEvent.id ? 
					{ 
						...data.floEvent, 
						type: "flo", 
						date: new Date(data.floEvent.date),
						endDate: data.floEvent.endDate ? new Date(data.floEvent.endDate) : null,
						location: data.floEvent.location + " - " + data.floEvent.city + ", " + data.floEvent.state
					} 
					: event
				));
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const editEvent = (eventId, property, value) => {
		setEvents(events => events.map(event => {
			return event.id === eventId ? {
				...event,
				[property]: property === "date" ? value ? new Date(new Date(value).getTime() + (new Date(new Date(value)).getTimezoneOffset() * 60000)) : null
					: property === "endDate" ? value ? new Date(new Date(value).getTime() + (new Date(new Date(value)).getTimezoneOffset() * 60000)) : null
					: value
			}: event
		}))
	};
	
	return (

<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>

		<header>
			<h1>Schedule</h1>
		</header>

		<div className={`schedule container ${ pageActive ? "active" : "" }`}>

			<div className="panel centered">
				<div className="calendarHeader">
					<button onClick={ () => changeMonth(monthSelected == 0 ? 11 : monthSelected - 1, monthSelected == 0 ? yearSelected - 1 : yearSelected) }>◀</button>
					<h3 className="monthName">{ months[monthSelected] }</h3>
					<button onClick={ () => changeMonth((monthSelected + 1) % 12, monthSelected == 11 ? yearSelected + 1 : yearSelected) }>▶</button>
				</div>

				<ol className="calendar">
					<li className="day">S</li>
					<li className="day">M</li>
					<li className="day">T</li>
					<li className="day">W</li>
					<li className="day">T</li>
					<li className="day">F</li>
					<li className="day">S</li>

					{
					monthDays.map(date => 
					<li key={date.day} className={ date.className } style={ date.day === 1 ? { gridColumnStart: monthStart } : {} }>{ date.day }</li>
					)
					}
				</ol>

			</div>
			
			<div className="panel filter">
				<div className="row">
					<h3>Filter</h3>

					<div className="filterExpand" onClick={ () => setIsFilterExpanded(isFilterExpanded => !isFilterExpanded) }>
						{
						isFilterExpanded ?
						// Close
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
						: 
						// Tune
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z"/></svg>
						}
					</div>
				</div>

				<div className={`filterContent ${ isFilterExpanded ? "active" : "" }`}>
					<label>
						State
						<select value={ selectedState } onChange={ event => setSelectedState(event.target.value)}>
							<option value="">All States</option>
							<option value="SC">SC</option>
							<option value="NC">NC</option>
							<option value="TN">TN</option>
							<option value="GA">GA</option>
						</select>
					</label>
				</div>

			</div>
			
			{
			loggedInUser && loggedInUser.privileges && loggedInUser.privileges.includes("scheduleManage") ?
			
			<div key={ "newEvent" } className="panel">
				{
				editItem === "newEvent" ?
				<>
				
				<h3>New Event</h3>

				<label>
					<span>Date</span>
					<input type="date" min={ minDate.toLocaleDateString("fr-ca") } value={ newEvent.date ? newEvent.date.toLocaleDateString("fr-ca") : "" } onChange={ event => setNewEvent(newEvent => ({ ...newEvent, date: new Date(new Date(event.target.value).getTime() + (new Date(new Date(event.target.value)).getTimezoneOffset() * 60000)) })) } aria-label="date" />
				</label>

				<label>
					<span>End Date (leave blank if only one day)</span>
					<input type="date" min={ minDate.toLocaleDateString("fr-ca") } value={ newEvent.endDate ? newEvent.endDate.toLocaleDateString("fr-ca") : "" } onChange={ event => setNewEvent(newEvent => ({ ...newEvent, endDate: new Date(new Date(event.target.value).getTime() + (new Date(new Date(event.target.value)).getTimezoneOffset() * 60000)) })) } aria-label="End Date" />
				</label>

				<label>
					<span>Name</span>
					<input type="text" value={ newEvent.name } onChange={ event => setNewEvent(newEvent => ({...newEvent, name: event.target.value })) } aria-label="name" />
				</label>

				<label>
					<span>Location</span>
					<input type="text" value={ newEvent.location } onChange={ event => setNewEvent(newEvent => ({...newEvent, location: event.target.value })) } aria-label="location" />
				</label>

				<div className="row">
					<div className="error">{ errorMessage }</div>
					<button disabled={ savingId === "newEvent" } onClick={ () => saveEvent(newEvent) } aria-label="Save">
						{
						savingId === "newEvent" ?
							loading[loadingIndex]
						: 
							"Add"
						}
					</button>

					<button disabled={ savingId === "newEvent" } onClick={ () => setEditItem(null) } aria-label="Cancel">Cancel</button>
				</div>

				</>

				:
				
				<div className="row">
					<div className="rowContent">
						<h3>New Event</h3>
					</div>
					
					<button aria-label="Add" className="action" onClick={ () => setEditItem("newEvent") }>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"/>
						</svg>
					</button>
				</div>

				}
			</div>

			: ""
			}

			{
			events
			.filter(event => event.date.getMonth() === monthSelected && event.date.getFullYear() === yearSelected && (!selectedState || event.state == selectedState || !event.state))
			.sort((eventA, eventB) => eventA.date - eventB.date)
			.map(event =>
				
			<div key={ event.id } data-testid={ event.id } className={`panel ${ event.type } actionBar`}>
				{

				savingId == event.id && errorMessage ?

				<div className="panelError">{ errorMessage }</div>
				
				: savingId == event.id ?

				<div className="panelLoading">
					<img src="/media/wrestlingloading.gif" />
				</div>

				: editItem === event.id ?
				<>

				<div className="panelContent">
				
					<label>
						<span>Date</span>
						<input type="date" min={ minDate.toLocaleDateString("fr-ca") } value={ event.date.toLocaleDateString("fr-ca") } onChange={ e => editEvent(event.id, "date", e.target.value) } aria-label="Date" />
					</label>

					<label>
						<span>End Date (leave blank if only one day)</span>
						<input type="date" min={ minDate.toLocaleDateString("fr-ca") } value={ event.endDate ? event.endDate.toLocaleDateString("fr-ca") : "" } onChange={ e => editEvent(event.id, "endDate", e.target.value) } aria-label="End Date" />
					</label>

					<label>
						<span>Name</span>
						<input type="text" value={ event.name } onChange={ e => editEvent(event.id, "name", e.target.value) } aria-label="name" />
					</label>

					<label>
						<span>Location</span>
						<input type="text" value={ event.location } onChange={ e => editEvent(event.id, "location", e.target.value) } aria-label="location" />
					</label>

				</div>

				<div className="panelActionBar">
					<button disabled={ savingId === event.id } onClick={ () => saveEvent(event) } aria-label="Save">Save</button>
					<button disabled={ savingId === event.id } onClick={ () => deleteEvent(event.id) } aria-label="Delete">Delete</button>
					<button disabled={ savingId === event.id } onClick={ () => setEditItem(null) } aria-label="Cancel">Cancel</button>
				</div>
				
				</>
				:
				
				<>
				<div className="panelContent">
					<div className="subHeading">
						Date: { event.date.toLocaleDateString() + (event.endDate && event.endDate - event.date > 86400000 ? " - " + event.endDate.toLocaleDateString() : "" ) }
					</div>

					<h3>{ event.name }</h3>
					
					<div>Location: { event.location }</div>
				</div>

				<div className="panelActionBar">
					
					{ ["flo", "track"].includes(event.type) ?
					<button aria-label="External Event" onClick={ () => window.open(event.type === "track" ? `https://www.trackwrestling.com/tw/opentournaments/VerifyPassword.jsp?tournamentId=${ event.trackId}` : `https://events.flowrestling.org/event/${ event.floGUID }/summary`) }>
						{/* World */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480.067-100.001q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM440-162v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 121 79.5 212T440-162Zm276-102q20-22 36-47.5t26.5-53q10.5-27.5 16-56.5t5.5-59q0-98.29-54.308-179.53Q691.385-740.769 600-776.769V-760q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q26 0 47 15.5t29 40.5Z"/></svg>
						<div>link</div>
					</button>
					: ""
					}

					{
					event.type === "mill" ?

					<button aria-label="Edit" onClick={ () => setEditItem(event.id) }>
						{/* Pencil */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/></svg>
						<div>edit</div>
					</button>

					: event.type === "flo" ?

					<>
					{
					loggedInUser && loggedInUser.privileges && loggedInUser.privileges.includes("scheduleManage") ?
					<button aria-label="Favorite" className={ event.isFavorite ? "isFavorite" : "notFavorite" } onClick={ () => markFavorite(event) }>
						{/* Cloud sync */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M173.078-173.078v-59.998h116.308q-61.385-53.232-90.385-114.463-29-61.23-29-130.922 0-105.077 62.038-186.923t157.96-110.769v63.229q-70.769 27.308-115.384 91.308-44.616 64.001-44.616 143.155 0 57.461 23.616 105.846 23.615 48.385 74.847 93.694v-109.54h59.999v215.383H173.078ZM600-170.001q-45.384 0-77.692-32.307-32.307-32.308-32.307-77.692 0-44.154 30.115-75.769 30.115-31.615 76.577-33.615 15.846-35.615 48.192-58.115 32.346-22.5 75.115-22.5 51.077 0 88.423 33.538 37.346 33.539 44.192 86.462h6.154q37.769 0 64.5 25.923 26.73 25.922 26.73 63.076 0 37.769-26.115 64.384-26.115 26.615-63.884 26.615H600Zm126.001-355.384q-8.539-43.308-30.27-79.846Q674-641.77 631.538-680.694v109.155h-59.999v-215.383h215.383v59.998H670.614q53.385 47.232 80.308 96.693 26.923 49.462 35.693 104.846h-60.614ZM600-229.999h260q12.231 0 21.116-8.885T890.001-260q0-12.231-8.885-21.116T860-290.001h-59.999V-330q0-33.231-23.385-56.616-23.385-23.385-56.616-23.385-33.231 0-56.039 21.654t-23.577 52.193v6.153H600q-20.846 0-35.424 14.577-14.577 14.578-14.577 35.424t14.577 35.424q14.578 14.577 35.424 14.577ZM720-320Z"/></svg>
						<div>sync is { event.isFavorite ? "on" : "off" }</div>
					</button>
					: ""
					}

					{
					event.divisions && event.divisions.length > 0 ?

					<button aria-label="Match" onClick={ () => window.location = `/portal/floevent.html?id=${ event.id }` }>
						{/* Wrestlers */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M55.077-93.847 12.924-136l143.692-143.692-46.308-123.385q-6.23-15.692-2.423-36.692 3.808-21 20.115-37.307l132-132q10.462-10.462 22.539-15.693 12.076-5.23 27.153-5.23 15.077 0 27.154 5.23 12.076 5.231 22.538 15.693l80.769 78q27.385 27 65.231 42.692 37.846 15.692 81.692 17.615v59.999q-55-1.923-103.153-20.731-48.154-18.808-81.923-52.192l-34.923-34.154L259.23-410l87.846 89.846v230.153h-59.998v-204.615l-72.002-66.463v107.233l-160 159.999Zm552.001 3.846v-265.383l85.538-81.539-30.154-166.156q-22.693 27.616-48.386 49.502-25.693 21.885-57.463 34.27-23.768-2-45.576-11.116-21.807-9.115-37.191-24.114 45.769-7.616 84.5-34.539 38.732-26.924 59.962-61.539l39.231-64q15.077-24.307 41.423-32.269 26.345-7.961 52.268 2.885l195.846 82.923v171.075h-59.998v-132.153l-95.079-38.001L904.768-90.001H840.77L767.616-396.54l-100.54 85.001v221.538h-59.998ZM447.076-614.615q-30.692 0-52.269-21.577-21.577-21.577-21.577-52.269 0-30.692 21.577-52.269 21.577-21.576 52.269-21.576 30.692 0 52.269 21.576 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.577 21.577-52.269 21.577ZM664-776.154q-30.692 0-52.269-21.576-21.576-21.577-21.576-52.269 0-30.692 21.576-52.269 21.577-21.577 52.269-21.577 30.693 0 52.269 21.577 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.576 21.576-52.269 21.576Z"/></svg>
						<div>event</div>
					</button>

					: ""
					}
					</>

					: ""
					}
				</div>
				</>

				}
			</div>
			)}

		</div>
	</div>
</div>
	)
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Schedule />);
export default Schedule;
