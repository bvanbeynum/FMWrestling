import React, { useEffect, useState } from "react";
import "./include/index.css";

const FloUpdate = props => {

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ updates, setUpdates ] = useState([]);

	const [ selectedDivision, setSelectedDivision ] = useState("");
	const [ selectedTeam, setSelectedTeam ] = useState("");
	const [ updateLength, setUpdateLength ] = useState("");

	useEffect(() => {
		if (props.updates) {
			setUpdates(props.updates.map(update => ({...update, dateTime: new Date(update.dateTime)})));
		}
	}, [props.updates])
	
	return (

<>
<header>
	<h1>Updates</h1>
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
			<select value={ selectedDivision } onChange={ event => selectDivision(event.target.value)}>
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
			Updates in Last
			<select value={ updateLength } onChange={ event => setUpdateLength(event.target.value)}>
				<option value="">-- Select --</option>
				<option value="15">15 min</option>
				<option value="30">30 min</option>
				<option value="60">1 hour</option>
				<option value="120">2 hours</option>
				<option value="240">4 hours</option>
			</select>
		</label>
	</div>

</div>

{
updates
.filter(updateBlock => updateBlock.updates.some(update => 
	(!selectedTeam || update.teams.includes(selectedTeam)) && 
	(!selectedDivision || update.division == selectedDivision) &&
	(!updateLength || update.dateTime > new Date(new Date().setMinutes(new Date().getMinutes() + updateLength)))
	))
.sort((blockA, blockB) => blockB.dateTime - blockA.dateTime)
.map((updateBlock, blockIndex) =>
	
	<div className="panel expandable" key={blockIndex}>
		<h3>{ `${ updateBlock.dateTime.toLocaleString() }` }</h3>
		
		{
		updateBlock.updates.some(update => /complete/i.test(update.updateType) && (!selectedTeam || update.teams.includes(selectedTeam)) && (!selectedDivision || update.division == selectedDivision)) ?
		<>
		<div className="subHeading">Completed Matches</div>
		<div className="sectionList">
			<div key={ blockIndex } className="pill">
				<table>
				<tbody>
				{
				updateBlock.updates
				.filter(update => /complete/i.test(update.updateType) && (!selectedTeam || update.teams.includes(selectedTeam)) && (!selectedDivision || update.division == selectedDivision))
				.map((update, updateIndex) => 
				
					<tr key={ updateIndex }>
						<td>{ `${ update.division } / ${ update.weightClass }: ${ update.message }` }</td>
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
		updateBlock.updates.some(update => /mat assignment/i.test(update.updateType) && (!selectedTeam || update.teams.includes(selectedTeam)) && (!selectedDivision || update.division == selectedDivision)) ?
		<>
		<div className="subHeading">Mat Assignments</div>
		<div className="sectionList">
			<div key={ blockIndex } className="pill">
				<table>
				<tbody>
				{
				updateBlock.updates
				.filter(update => /mat assignment/i.test(update.updateType) && (!selectedTeam || update.teams.includes(selectedTeam)) && (!selectedDivision || update.division == selectedDivision))
				.map((update, updateIndex) => 
				
					<tr key={ updateIndex }>
						<td>{ update.message }</td>
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
		updateBlock.updates.some(update => /new match/i.test(update.updateType) && (!selectedTeam || update.teams.includes(selectedTeam)) && (!selectedDivision || update.division == selectedDivision)) ?
		<>
		<div className="subHeading">New Matches</div>
		<div className="sectionList">
			<div key={ blockIndex } className="pill">
				<table>
				<tbody>
				{
				updateBlock.updates
				.filter(update => /new match/i.test(update.updateType) && (!selectedTeam || update.teams.includes(selectedTeam)) && (!selectedDivision || update.division == selectedDivision))
				.map((update, updateIndex) => 
				
					<tr key={ updateIndex }>
						<td>{ update.message }</td>
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
		updateBlock.updates.some(update => /wrestler/i.test(update.updateType) && (!selectedTeam || update.teams.includes(selectedTeam)) && (!selectedDivision || update.division == selectedDivision)) ?
		<>
		<div className="subHeading">Wrestlers Assigned</div>
		<div className="sectionList">
			<div key={ blockIndex } className="pill">
				<table>
				<tbody>
				{
				updateBlock.updates
				.filter(update => /wrestler/i.test(update.updateType) && (!selectedTeam || update.teams.includes(selectedTeam)))
				.map((update, updateIndex) => 
				
					<tr key={ updateIndex }>
						<td>{ `${ update.division } / ${ update.weightClass }: ${ update.message }` }</td>
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

)
}
</>

		)
	};
	
export default FloUpdate;
