import React, { useEffect, useState } from "react";
import "./include/index.css";
import "./include/schedule.css";

const Schedule = (props) => {

	const emptyEvent = { name: "", date: new Date(new Date().setHours(0,0,0,0)), location: "" },
		months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		minDate = new Date(new Date().setHours(0,0,0,0)),
		loading = [
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120Zm156-348q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Empty
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Top
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Full
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-516q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg> // Bottom
		];;

	const [ pageActive, setPageActive ] = useState(false);
	const [ newEvent, setNewEvent ] = useState(emptyEvent);

	const [ savingId, setSavingId ] = useState([]);
	const [ loadingIndex, setLoadingIndex ] = useState(0);
	const [ errorMessage, setErrorMessage ] = useState([]);

	const [ events, setEvents ] = useState([]);
	const [ editItem, setEditItem ] = useState(null);

	const [ monthSelected, setMonthSelect ] = useState(new Date().getMonth());
	const [ monthDays, setMonthDays ] = useState(Array.from(Array(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).keys())); // Get array of dates, get last day of the month to know array length
	const [ monthStart, setMonthStart ] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 1); // get the first day of the week for the current month

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
			
			fetch(`/api/scheduleload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setEvents(
						data.events ?
							data.events.map(event => ({
								...event, 
								date: new Date(event.date)
							}))
						: []
					);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const changeMonth = monthNew => {
		setMonthSelect(monthNew);
		setMonthDays(Array.from(Array(new Date(new Date().getFullYear(), monthNew + 1, 0).getDate()).keys()));
		setMonthStart(new Date(new Date().getFullYear(), monthNew, 1).getDay() + 1);
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
						date: new Date(data.event.date)
					}));
					setNewEvent(emptyEvent);
				}

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

	return (

<div className={`container ${ pageActive ? "active" : "" } schedule`}>

	<div className="panel">
		<div className="calendarHeader">
			<button onClick={ () => changeMonth(monthSelected == 0 ? 11 : monthSelected - 1) }>◀</button>
			<div className="monthName">{ months[monthSelected] }</div>
			<button onClick={ () => changeMonth((monthSelected + 1) % 12) }>▶</button>
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
			<li key={date} className={ events.some(event => event.date.getMonth() === monthSelected && event.date.getDate() === date + 1) ? "dayEvent" : "" } style={ date === 0 ? { gridColumnStart: monthStart } : {} }>{ date + 1 }</li>
			)
			}
		</ol>

	</div>

	<div key={ "newEvent" } className="panel">
		{
		editItem === "newEvent" ?
		<>
		
		<h3>New Event</h3>

		<label>
			<span>Date</span>
			<input type="date" min={ minDate.toLocaleDateString("fr-ca") } value={ newEvent.date } onChange={ event => setNewEvent(newEvent => ({ ...newEvent, date: event.target.value })) } aria-label="date" />
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
			<button aria-label="Add" className="icon" onClick={ () => setEditItem("newEvent") }>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"/>
				</svg>
			</button>

			<h3>New Event</h3>
		</div>

		}

		{
		events
		.filter(event => event.date.getMonth() === monthSelected)
		.sort((eventA, eventB) => eventA.date - eventB.date)
		.map(event =>

		
		editItem === event.id ?
		<>
		
		<h3>New Event</h3>

		<label>
			<span>Date</span>
			<input type="date" min={ minDate.toLocaleDateString("fr-ca") } value={ event.date } onChange={ event => setNewEvent(newEvent => ({ ...newEvent, date: event.target.value })) } aria-label="date" />
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
		
		<div key={ event.id } data-testid={ event.id } className="row">
			<button aria-label="Edit" className="icon" onClick={ () => setEditItem(event.id) }>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/>
				</svg>
			</button>

			<h3>{ event.name }</h3>
		</div>

		)}
	</div>

</div>

	)
};

export default Schedule;
