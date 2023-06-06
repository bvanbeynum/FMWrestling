import React, { useEffect, useState } from "react";
import "./include/index.css";
import "./include/schedule.css";

const Schedule = (props) => {

	const emptyEvent = { name: "", date: new Date(new Date().setHours(0,0,0,0)), location: "" },
		months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

	const [ pageActive, setPageActive ] = useState(false);
	const [ newEvent, setNewEvent ] = useState(emptyEvent);
	const [ saving, setSaving ] = useState([]);
	const [ errors, setErrors ] = useState([]);

	const [ events, setEvents ] = useState([]);

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

	return (

<div className={`container ${ pageActive ? "active" : "" }`}>

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
		<h3>New Event</h3>

		<label>
			<span>Name</span>
			<input type="text" value={ newEvent.name } onChange={ event => setNewEvent(newEvent => ({...newEvent, name: event.target.value })) } />
		</label>

		<div className="row">
			<div className="error">{ errors.find(error => error.id === "new") }</div>
			<button disabled={ saving.includes("new") }>
				{
				saving.includes("new") ?
					loading[loadingIndex]
				: 
					"Add"
				}
			</button>
		</div>
	</div>

</div>

	)
};

export default Schedule;
