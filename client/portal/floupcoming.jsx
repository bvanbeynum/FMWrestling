import React, { useEffect, useState } from "react";
import "./include/index.css";

const FloUpcoming = props => {

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ selectedDivision, setSelectedDivision ] = useState("");
	const [ selectedTeam, setSelectedTeam ] = useState("");
	const [ upcomingCount, setUpcomingCount ] = useState(30);

	const [ mats, setMats ] = useState([]);
	const [ upcoming, setUpcoming ] = useState([]);

	useEffect(() => {
		if (props.matches) {
			
			setMats([...new Set(props.matches.filter(match => match.mat).map(match => match.mat))]
				.sort((matA, matB) => matA > matB ? 1 : -1)
				.map(mat => ({
					name: mat,
					matches: props.matches.filter(match => match.mat == mat && match.topWrestler && match.bottomWrestler).sort((matchA, matchB) => matchA.sort - matchB.sort),
					upcoming: props.matches.filter(match => match.mat == mat && match.topWrestler && match.bottomWrestler && !match.winType).sort((matchA, matchB) => matchA.sort - matchB.sort)
				})));
		
			setUpcoming(props.matches.filter(match => !match.winType && match.topWrestler && match.bottomWrestler).sort((matchA, matchB) => matchA.sort - matchB.sort));

		}
	}, [props.matches])
	
	return (

<>
<header>
	<h1>{ props.eventName }</h1>
	<h1 className="subTitle">Upcoming</h1>
</header>

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
			Division
			<select value={ selectedDivision } onChange={ event => setSelectedDivision(event.target.value)}>
				<option value="">-- Select --</option>
				{
				props.divisions
				.sort((divisionA, divisionB) => divisionA > divisionB ? 1 : -1)
				.map(division => 
				<option key={ division } value={ division }>{ division }</option>
				)
				}
			</select>
		</label>
		
		<label>
			Team
			<select value={ selectedTeam } onChange={ event => setSelectedTeam(event.target.value)}>
				<option value="">-- Select --</option>
				{
				props.teams
				.map((team, teamIndex) => 
				<option key={ teamIndex } value={ team }>{ team }</option>
				)
				}
			</select>
		</label>
		
		<label>
			Number of Upcoming
			<select value={ upcomingCount } onChange={ event => setUpcomingCount(event.target.value)}>
				<option value="">-- Select --</option>
				<option value="10">10</option>
				<option value="20">20</option>
				<option value="30">30</option>
				<option value="40">40</option>
				<option value="50">50</option>
				<option value="60">60</option>
				<option value="70">70</option>
				<option value="80">80</option>
				<option value="90">90</option>
				<option value="100">100</option>
			</select>
		</label>
	</div>

</div>

{
mats.map((mat, matIndex) => 

<div className="panel" key={matIndex}>
	<h3>{ mat.name }</h3>
	
	<table className="sectionTable">
	<thead>
	<tr>
		<th>#</th>
		<th>Division</th>
		<th>Weight</th>
		<th>Wrestler</th>
		<th>Wrestler</th>
	</tr>
	</thead>
	<tbody>
	{
	!mat.upcoming.some(match => (!selectedTeam || match.topWrestler.team == selectedTeam || match.bottomWrestler.team == selectedTeam) && (!selectedDivision || match.division == selectedDivision)) ?
		<tr>
			<td colSpan="5" className="emptyTable">No Upcoming Matches</td>
		</tr>
	:

	mat.upcoming
	.filter(match => (!selectedTeam || match.topWrestler.team == selectedTeam || match.bottomWrestler.team == selectedTeam) && (!selectedDivision || match.division == selectedDivision))
	.map((match, matchIndex) => 
	
		<tr key={ matchIndex }>
			<td>{ match.matchNumber }</td>
			<td>{ match.division }</td>
			<td>{ match.weightClass }</td>
			<td>
				{ match.topWrestler.name }<br />
				{ match.topWrestler.team}
			</td>
			<td>
				{ match.bottomWrestler.name }<br />
				{ match.bottomWrestler.team}
			</td>
		</tr>

	)}
	</tbody>
	</table>

</div>

)
}

<div className="panel">
	<h3>Upcoming</h3>

	<table className="sectionTable">
	<thead>
	<tr>
		<th>#</th>
		<th>Division</th>
		<th>Weight</th>
		<th>Wrestler</th>
		<th>Wrestler</th>
	</tr>
	</thead>
	<tbody>
	{
	!upcoming.some(match => (!selectedTeam || match.topWrestler.team == selectedTeam || match.bottomWrestler.team == selectedTeam) && (!selectedDivision || match.division == selectedDivision)) ?
		<tr>
			<td colSpan="5" className="emptyTable">No Upcoming Matches</td>
		</tr>
	:

	upcoming
	.filter(match => (!selectedTeam || match.topWrestler.team == selectedTeam || match.bottomWrestler.team == selectedTeam) && (!selectedDivision || match.division == selectedDivision))
	.sort((matchA, matchB) => matchA.sort - matchB.sort)
	.slice(0, upcomingCount)
	.map((match, matchIndex) => 
	
		<tr key={ matchIndex }>
			<td>{ match.matchNumber }</td>
			<td>{ match.division }</td>
			<td>{ match.weightClass }</td>
			<td>
				{ match.topWrestler.name }<br />
				{ match.topWrestler.team}
			</td>
			<td>
				{ match.bottomWrestler.name }<br />
				{ match.bottomWrestler.team}
			</td>
		</tr>

	)}
	</tbody>
	</table>

</div>

</>

		)
	};
	
export default FloUpcoming;
