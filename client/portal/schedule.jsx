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
							<option value="">-- Select --</option>
							<option value="SC">SC</option>
							<option value="NC">NC</option>
							<option value="TN">TN</option>
							<option value="GA">GA</option>
						</select>
					</label>
				</div>

			</div>
			
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

			{
			events
			.filter(event => event.date.getMonth() === monthSelected && event.date.getFullYear() === yearSelected && (!selectedState || event.state == selectedState || !event.state))
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

					<div>
						<div>
							<button aria-label="Favorite" className={`action ${ event.isFavorite ? "isFavorite" : "notFavorite" }`} onClick={ () => markFavorite(event) }>
								{/* Star */}
								<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m233-80 65-281L80-550l288-25 112-265 112 265 288 25-218 189 65 281-247-149L233-80Z"/></svg>
							</button>
						</div>

						{
						event.divisions && event.divisions.length > 0 ?

						<div>
							<button aria-label="Match" className={`action`} onClick={ () => window.location = `/portal/floevent.html?id=${ event.id }` }>
								{/* Wrestlers */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M55.077-93.847 12.924-136l143.692-143.692-46.308-123.385q-6.23-15.692-2.423-36.692 3.808-21 20.115-37.307l132-132q10.462-10.462 22.539-15.693 12.076-5.23 27.153-5.23 15.077 0 27.154 5.23 12.076 5.231 22.538 15.693l80.769 78q27.385 27 65.231 42.692 37.846 15.692 81.692 17.615v59.999q-55-1.923-103.153-20.731-48.154-18.808-81.923-52.192l-34.923-34.154L259.23-410l87.846 89.846v230.153h-59.998v-204.615l-72.002-66.463v107.233l-160 159.999Zm552.001 3.846v-265.383l85.538-81.539-30.154-166.156q-22.693 27.616-48.386 49.502-25.693 21.885-57.463 34.27-23.768-2-45.576-11.116-21.807-9.115-37.191-24.114 45.769-7.616 84.5-34.539 38.732-26.924 59.962-61.539l39.231-64q15.077-24.307 41.423-32.269 26.345-7.961 52.268 2.885l195.846 82.923v171.075h-59.998v-132.153l-95.079-38.001L904.768-90.001H840.77L767.616-396.54l-100.54 85.001v221.538h-59.998ZM447.076-614.615q-30.692 0-52.269-21.577-21.577-21.577-21.577-52.269 0-30.692 21.577-52.269 21.577-21.576 52.269-21.576 30.692 0 52.269 21.576 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.577 21.577-52.269 21.577ZM664-776.154q-30.692 0-52.269-21.576-21.576-21.577-21.576-52.269 0-30.692 21.576-52.269 21.577-21.577 52.269-21.577 30.693 0 52.269 21.577 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.576 21.576-52.269 21.576Z"/></svg>
							</button>
						</div>

						: ""
						}
					</div>

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
