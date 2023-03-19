import React, { useState } from "react";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const events = [
	{ date: new Date(2023,0,4,18), event: "Clover/Blythewood", location: "Clover HS" },
	{ date: new Date(2023,0,10,19), event: "Spring Valley", location: "Fort Mill HS" },
	{ date: new Date(2023,0,12,19), event: "Rock Hill", location: "Rock Hill HS" },
	{ date: new Date(2023,0,13,12), event: "Fanetti Classic", location: "Johnson City, TN" },
	{ date: new Date(2023,0,19,19), event: "Nation Ford", location: "Fort Mill HS" },
	{ date: new Date(2023,0,28,10), event: "Region Tounament", location: "Fort Mill HS" },
	{ date: new Date(2023,1,4,10), event: "State Duals Round 1 & 2", location: "Fort Mil HS" },
	{ date: new Date(2023,1,6,19), event: "State Duals Quarter Finals", location: "Dorman HS" },
	{ date: new Date(2023,1,8,19), event: "State Duals Semi Finals", location: "Fort Mill HS" },
	{ date: new Date(2023,1,8,19), event: "State Duals Finals", location: "Dreher HS" },
	{ date: new Date(2023,1,11,19), event: "Individual State Upper State Day 1", location: "Hillcrest HS" },
	{ date: new Date(2023,1,17,17), event: "Individual State Upper State Day 2", location: "Hillcrest HS" },
	{ date: new Date(2023,1,24,12), event: "Individual State Tounament Day 1", location: "Anderson Civic Center" },
	{ date: new Date(2023,1,25,10), event: "Individual State Tounament Day 2", location: "Anderson Civic Center" }
];

const Schedule = (props) => {
	
	const [ monthSelected, setMonthSelected ] = useState(new Date().getMonth());
	const [ monthDays, setMonthDays ] = useState(Array.from(Array(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).keys())); // Get array of dates, get last day of the month to know array length
	const [ monthStart, setMonthStart ] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 1); // get the first day of the week for the current month

	const changeMonth = change => {
		const monthNew = monthSelected + change > months.length - 1 ? 0
			: monthSelected + change < 0 ? months.length - 1
			: monthSelected + change;

		setMonthSelected(monthNew);
		setMonthDays(Array.from(Array(new Date(new Date().getFullYear(), monthNew + 1, 0).getDate()).keys()));
		setMonthStart(new Date(new Date().getFullYear(), monthNew, 1).getDay() + 1);
	};

	return (
		<div className="subsection schedule">
			<h2>Team Schedule</h2>

			<div className="scheduleHeader">
				<div className="monthAction" onClick={ () => { changeMonth(-1) }}>◀</div>
				<div className="monthName">{ months[monthSelected] }</div>
				<div className="monthAction" onClick={ () => { changeMonth(1) }}>▶</div>
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
				<li key={date} className={ events.some(event => event.date.getMonth() === monthSelected && event.date.getDate() === date) ? "dayEvent" : "" } style={ date === 0 ? { gridColumnStart: monthStart } : {} }>{ date + 1 }</li>
				)
				}
			</ol>

			<div className="scheduleHeader">
				<div >Events</div>
			</div>

			<div className="eventContainer">
			{
			events
			.filter(event => event.date.getMonth() === monthSelected)
			.map((event, eventIndex) =>
				
				<div className="listItem eventItem" key={ eventIndex }>
					<div className="eventSubItem">
						<div>{ event.date.toLocaleDateString("en-us", { month: "numeric", day: "numeric" }) }</div>
						<div>{ event.date.toLocaleTimeString("en-us", { hour: "numeric" }) }</div>
					</div>

					<div className="eventName">{ event.event }</div>

					<div className="eventSubItem">{ event.location }</div>
				</div>

			)}
			</div>

{/* 
			<table>
			<thead>
				<tr>
				<th>Time</th>
				<th>Event</th>
				<th>Location</th>
				</tr>
			</thead>
			<tbody>
			{
			events.filter(event => event.date.getMonth() === monthSelected).length === 0 ?
			<tr>
			<td colSpan="3" className="noEvents">No Events Scheduled</td>
			</tr>
			:
			events
			.filter(event => event.date.getMonth() === monthSelected)
			.map((event, eventIndex) =>
				<tr key={ eventIndex }>
				<td>{ event.date.toLocaleDateString("en-us", { month: "numeric", day: "numeric", hour: "numeric" }) }</td>
				<td>{ event.event }</td>
				<td>{ event.location }</td>
				</tr>
			)
			}
			</tbody>
			</table> */}
		</div>
	)
};

export default Schedule;