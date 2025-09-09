import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/schedule.css";

const Schedule = props => {

	const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

	const [ pageActive, setPageActive ] = useState(false);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ selectedState, setSelectedState ] = useState("SC");

	const [ events, setEvents ] = useState([]);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ monthSelected, setMonthSelect ] = useState(new Date().getMonth());
	const [ yearSelected, setYearSelected ] = useState(new Date().getFullYear());
	const [ monthDays, setMonthDays ] = useState(Array.from(Array(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).keys()).map(day => ({ day: day + 1})));
	const [ monthStart, setMonthStart ] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 1); // get the first day of the week for the current month

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
			
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
					
					const newEvents = data.events.map(event => ({
							...event,
							type: event.eventSystem?.toLowerCase(),
							date: new Date(event.date),
							endDate: event.endDate ? new Date(event.endDate) : null,
							location: event.location,
							state: event.state
						}));

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

					// Expand filter box if no events are visible
					if (!newEvents.some(event => event.date.getMonth() === monthSelected && event.date.getFullYear() === yearSelected && (!selectedState || event.state == selectedState || !event.state))) {
						setIsFilterExpanded(true);
					}
					
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const changeMonth = (monthNew, yearNew) => {
		setMonthSelect(monthNew);
		setYearSelected(yearNew);
		setMonthStart(new Date(yearNew, monthNew, 1).getDay() + 1); // get the first day of the week for the current month
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
				
				const newEvents = data.events.map(event => ({
					...event,
					type: event.eventSystem?.toLowerCase(),
					date: new Date(event.date),
					endDate: event.endDate ? new Date(event.endDate) : null,
					location: event.location,
					state: event.state
				}));
				
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

			})
			.catch(error => {
				console.warn(error);
			});
			
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
			events
			.filter(event => event.date.getMonth() === monthSelected && event.date.getFullYear() === yearSelected && (!selectedState || event.state == selectedState))
			.sort((eventA, eventB) => eventA.date - eventB.date)
			.map(event =>
				
			<div key={ event.id } data-testid={ event.id } className={`panel ${ event.type } actionBar`}>
				<div className="panelContent">
					<div className="subHeading">
						Date: { event.date.toLocaleDateString() + (event.endDate && event.endDate - event.date > 86400000 ? " - " + event.endDate.toLocaleDateString() : "" ) }
					</div>

					<h3>{ event.name }</h3>
					
					<div>Location: { event.location }</div>
				</div>

				<div className="panelActionBar">
					
					{
					/flo/i.test(event.eventSystem) ?
					<>
					
					<button aria-label="External Event" onClick={ () => window.open(`https://events.flowrestling.org/event/${ event.systemId }/summary`) }>
						{/* World */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480.067-100.001q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM440-162v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 121 79.5 212T440-162Zm276-102q20-22 36-47.5t26.5-53q10.5-27.5 16-56.5t5.5-59q0-98.29-54.308-179.53Q691.385-740.769 600-776.769V-760q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q26 0 47 15.5t29 40.5Z"/></svg>
						<div>info</div>
					</button>
					
					<button aria-label="External Event" onClick={ () => window.open(`https://arena.flowrestling.org/event/${ event.systemId }`) }>
						{/* Brackets */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M560-160v-80h120q17 0 28.5-11.5T720-280v-80q0-38 22-69t58-44v-14q-36-13-58-44t-22-69v-80q0-17-11.5-28.5T680-720H560v-80h120q50 0 85 35t35 85v80q0 17 11.5 28.5T840-560h40v160h-40q-17 0-28.5 11.5T800-360v80q0 50-35 85t-85 35H560Zm-280 0q-50 0-85-35t-35-85v-80q0-17-11.5-28.5T120-400H80v-160h40q17 0 28.5-11.5T160-600v-80q0-50 35-85t85-35h120v80H280q-17 0-28.5 11.5T240-680v80q0 38-22 69t-58 44v14q36 13 58 44t22 69v80q0 17 11.5 28.5T280-240h120v80H280Z"/></svg>
						<div>brackets</div>
					</button>

					</>
					
					: /track/i.test(event.eventSystem) ?

					<button aria-label="External Event" onClick={ () => window.open(`https://www.trackwrestling.com/tw/${ event.eventType }/VerifyPassword.jsp?tournamentId=${ event.systemId }`) }>
						{/* World */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480.067-100.001q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM440-162v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 121 79.5 212T440-162Zm276-102q20-22 36-47.5t26.5-53q10.5-27.5 16-56.5t5.5-59q0-98.29-54.308-179.53Q691.385-740.769 600-776.769V-760q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q26 0 47 15.5t29 40.5Z"/></svg>
						<div>link</div>
					</button>
					
					: ""
					}
				</div>
			</div>
			)}

		</div>
	</div>
</div>
	)
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Schedule />);
export default Schedule;
