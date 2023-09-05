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
					
					setLoggedInUser(data.loggedInUser);
					setEvents(newEvents);
					
					setMonthDays(monthDays => monthDays.map(day => ({
						...day,
						className: newEvents.some(event => 
							(event.date >= new Date(yearSelected, monthSelected, day.day + 1) && event.date < new Date(yearSelected, monthSelected, day.day + 2)) 
							|| (event.endDate && event.endDate > new Date(yearSelected, monthSelected, day.day + 1) && event.endDate < new Date(yearSelected, monthSelected, day.day + 2))) ? "single" : ""
					})));
					setEventsLoading(false);

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
					setEvents(events => events.concat({
						...data.event, 
						type: "mill",
						date: new Date(data.event.date), 
						endDate: data.event.endDate ? new Date(data.event.endDate) : null
					}));
					setNewEvent(emptyEvent);
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
				[property]: property === "date" ? new Date(new Date(value).getTime() + (new Date().getTimezoneOffset() * 60000)) 
					: property === "endDate" ? new Date(new Date(value).getTime() + (new Date().getTimezoneOffset() * 60000)) 
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

			<div className="panel">
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
		</div>

		<div className={`schedule container ${ pageActive ? "active" : "" }`}>

			<div key={ "newEvent" } className="panel">
				{
				editItem === "newEvent" ?
				<>
				
				<h3>New Event</h3>

				<label>
					<span>Date</span>
					<input type="date" min={ minDate.toLocaleDateString("fr-ca") } value={ newEvent.date ? newEvent.date.toLocaleDateString("fr-ca") : "" } onChange={ event => setNewEvent(newEvent => ({ ...newEvent, date: new Date(new Date(event.target.value).getTime() + (new Date().getTimezoneOffset() * 60000)) })) } aria-label="date" />
				</label>

				<label>
					<span>End Date (leave blank if only one day)</span>
					<input type="date" min={ minDate.toLocaleDateString("fr-ca") } value={ newEvent.endDate ? newEvent.endDate.toLocaleDateString("fr-ca") : "" } onChange={ event => setNewEvent(newEvent => ({ ...newEvent, endDate: new Date(new Date(event.target.value).getTime() + (new Date().getTimezoneOffset() * 60000)) })) } aria-label="End Date" />
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

			{
			events
			.filter(event => event.date.getMonth() === monthSelected && event.date.getFullYear() === yearSelected)
			.sort((eventA, eventB) => eventA.date - eventB.date)
			.map(event =>
				
			<div key={ event.id } className={`panel ${ event.type }`}>
				{
				editItem === event.id ?
				<>
				
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

				<div className="row">
					<div className="error">{ errorMessage }</div>

					<button disabled={ savingId === event.id } onClick={ () => saveEvent(event) } aria-label="Save">
						{
						savingId === event.id ?
							loading[loadingIndex]
						: 
							"Save"
						}
					</button>

					<button disabled={ savingId === event.id } onClick={ () => deleteEvent(event.id) } aria-label="Delete">Delete</button>
					<button disabled={ savingId === event.id } onClick={ () => setEditItem(null) } aria-label="Cancel">Cancel</button>
				</div>

				</>

				:
				
				<div data-testid={ event.id } className="row">
					<div className="rowContent">
						{
						event.type === "track" ?
						<h3><a href={`https://www.trackwrestling.com/tw/opentournaments/VerifyPassword.jsp?tournamentId=${ event.trackId}`} target="_blank">{ event.name }</a></h3>
						: event.type === "flo" ?
						<h3><a href={`https://events.flowrestling.org/event/${ event.floGUID }/summary`} target="_blank">{ event.name }</a></h3>
						:
						<h3>{ event.name }</h3>
						}
						

						<div className="subHeading">
							<div>Date: { event.date.toLocaleDateString() + (event.endDate && event.endDate - event.date > 86400000 ? " - " + event.endDate.toLocaleDateString() : "" ) }</div>
							<div>Location: { event.location }</div>
						</div>
					</div>
					
					{
					event.type === "mill" ?

					<button aria-label="Edit" className="action" onClick={ () => setEditItem(event.id) }>
						{/* Pencil */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/></svg>
					</button>

					: event.type === "flo" ?

					<button aria-label="Favorite" className={`action ${ event.isFavorite ? "isFavorite" : "notFavorite" }`} onClick={ () => markFavorite(event) }>
						{/* Star */}
						<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m233-80 65-281L80-550l288-25 112-265 112 265 288 25-218 189 65 281-247-149L233-80Z"/></svg>
					</button>

					: ""
					}
				</div>
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
