import React, { useEffect, useState } from "react";
import "./include/index.css";

const FloTeam = props => {

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ selectedTeam, setSelectedTeam ] = useState("");
	const [ selectedWeightClass, setSelectedWeightClass ] = useState("");
	
	return (

<>
<header>
	<h1>Teams</h1>
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
			Team
			<select value={ selectedTeam } onChange={ event => setSelectedTeam(event.target.value)}>
				<option value="">-- Select --</option>
				{
				props.teams
				.sort((teamA, teamB) => teamA.name > teamB.name ? 1 : -1)
				.map((team, teamIndex) => 
				<option key={ teamIndex } value={ team.name }>{ team.name }</option>
				)
				}
			</select>
		</label>
		
		<label>
			Weight Class
			<select value={ selectedWeightClass } onChange={ event => setSelectedWeightClass(event.target.value)}>
				<option value="">-- Select --</option>
				{
				props.weightClasses
				.sort((weightA, weightB) => weightA > weightB ? 1 : -1)
				.map((weight, weightIndex) => 
				<option key={ weightIndex } value={ weight }>{ weight }</option>
				)
				}
			</select>
		</label>
	</div>

</div>

{
props.teams
.filter(team => (!selectedTeam || team.name == selectedTeam) && (!selectedWeightClass || team.wrestlers.some(wrestler => wrestler.weightClass == selectedWeightClass)))
.sort((teamA, teamB) => teamA.name > teamB.name ? 1 : -1)
.map((team, teamIndex) => 
<div className="panel" key={teamIndex}>
	<h3>{ team.name }</h3>
	
	<div className="chartGird">
		<div className="chartGridItem">
			<svg viewBox="0 0 36 36" className="progressChart">
				<circle cx="18" cy="18" r="15.91549430918954"></circle>
				<circle cx="18" cy="18" r="15.91549430918954" strokeDasharray={ `${ team.wrestlers.length > 0 ? (team.wrestlers.filter(wrestler => !wrestler.isComplete).length / team.wrestlers.length) * 100 : 0 } 100` } className="progressBar"></circle>

				<line x1="11" y1="27" x2="28" y2="18" className="progressDivide" />

				<text x="14" y="20" textAnchor="middle" className="progressActive">{ team.wrestlers.filter(wrestler => !wrestler.isComplete).length }</text>
				<text x="24" y="28" textAnchor="middle" className="progressTotal">{ team.wrestlers.length }</text>
			</svg>
		</div>

		<div className="chartGridItem">
			<div className="teamPlaceSection">
				<svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" viewBox="0 0 24 24"><path d="M19,5h-2V3H7v2H5C3.9,5,3,5.9,3,7v1c0,2.55,1.92,4.63,4.39,4.94c0.63,1.5,1.98,2.63,3.61,2.96V19H7v2h10v-2h-4v-3.1 c1.63-0.33,2.98-1.46,3.61-2.96C19.08,12.63,21,10.55,21,8V7C21,5.9,20.1,5,19,5z M5,8V7h2v3.82C5.84,10.4,5,9.3,5,8z M19,8 c0,1.3-0.84,2.4-2,2.82V7h2V8z"/></svg>
				<div className="teamPlacePodium">
					{ team.wrestlers.filter(wrestler => wrestler.place == "2nd").length }
				</div>
			</div>
			
			<div className="teamPlaceSection">
				<svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" viewBox="0 0 24 24"><path d="M19,5h-2V3H7v2H5C3.9,5,3,5.9,3,7v1c0,2.55,1.92,4.63,4.39,4.94c0.63,1.5,1.98,2.63,3.61,2.96V19H7v2h10v-2h-4v-3.1 c1.63-0.33,2.98-1.46,3.61-2.96C19.08,12.63,21,10.55,21,8V7C21,5.9,20.1,5,19,5z M5,8V7h2v3.82C5.84,10.4,5,9.3,5,8z M19,8 c0,1.3-0.84,2.4-2,2.82V7h2V8z"/></svg>
				<div className="teamPlacePodium">
					{ team.wrestlers.filter(wrestler => wrestler.place == "1st").length }
				</div>
			</div>
			
			<div className="teamPlaceSection">
				<svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" viewBox="0 0 24 24"><path d="M19,5h-2V3H7v2H5C3.9,5,3,5.9,3,7v1c0,2.55,1.92,4.63,4.39,4.94c0.63,1.5,1.98,2.63,3.61,2.96V19H7v2h10v-2h-4v-3.1 c1.63-0.33,2.98-1.46,3.61-2.96C19.08,12.63,21,10.55,21,8V7C21,5.9,20.1,5,19,5z M5,8V7h2v3.82C5.84,10.4,5,9.3,5,8z M19,8 c0,1.3-0.84,2.4-2,2.82V7h2V8z"/></svg>
				<div className="teamPlacePodium">
					{ team.wrestlers.filter(wrestler => wrestler.place == "3rd").length }
				</div>
			</div>
		</div>
	</div>
	
	{
	team.wrestlers.some(wrestler => !wrestler.isComplete && (!selectedWeightClass || wrestler.weightClass == selectedWeightClass)) ?
	<>
	<div className="subHeading">Wrestlers Competing</div>
	<div className="sectionList">
		<div className="pill">
			<table>
			<thead>
			<tr>
				<th>Div</th>
				<th>Wt</th>
				<th>Wrestler</th>
				<th>W</th>
				<th>L</th>
				<th>Next Match</th>
			</tr>
			</thead>
			<tbody>
			{
			team.wrestlers
			.filter(wrestler => !wrestler.isComplete && (!selectedWeightClass || wrestler.weightClass == selectedWeightClass))
			.sort((wrestlerA, wrestlerB) => wrestlerB.wins - wrestlerA.wins)
			.map((wrestler, wrestlerIndex) => 
				<tr key={wrestlerIndex}>
					<td>{ wrestler.division }</td>
					<td>{ wrestler.weightClass }</td>
					<td>{ wrestler.name }</td>
					<td>{ wrestler.wins }</td>
					<td>{ wrestler.losses }</td>
					<td></td>
				</tr>
			)}
			</tbody>
			</table>
		</div>
	</div>
	</>
	: ""
	}

	{
	team.wrestlers.some(wrestler => wrestler.isComplete && (!selectedWeightClass || wrestler.weightClass == selectedWeightClass)) ?
	<>
	<div className="subHeading">Wrestlers Completed</div>
	<div className="sectionList">
		<div className="pill">
			<table>
			<thead>
			<tr>
				<th>Div</th>
				<th>Wt</th>
				<th>Wrestler</th>
				<th>W</th>
				<th>L</th>
				<th>Place</th>
			</tr>
			</thead>
			<tbody>
			{
			team.wrestlers
			.filter(wrestler => wrestler.isComplete && (!selectedWeightClass || wrestler.weightClass == selectedWeightClass))
			.sort((wrestlerA, wrestlerB) => wrestlerA.weightClass - wrestlerB.weightClass)
			.map((wrestler, wrestlerIndex) => 
				<tr key={wrestlerIndex}>
					<td>{ wrestler.division }</td>
					<td>{ wrestler.weightClass }</td>
					<td>{ wrestler.name }</td>
					<td>{ wrestler.wins }</td>
					<td>{ wrestler.losses }</td>
					<td>{ wrestler.place }</td>
				</tr>
			)}
			</tbody>
			</table>
		</div>
	</div>
	</>
	: ""
	}

</div>
)}

</>

		)
	};
	
export default FloTeam;
