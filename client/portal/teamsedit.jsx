import React, { useEffect, useState } from "react";
import "./include/index.css";

const TeamsEdit = props => {

	const [ team, setTeam ] = useState(props.team);

	useEffect(() => setTeam(props.team), [props.team]);

	return (

<div>
	<label>
		<span>Name</span>
		<input type="text" value={ team.name } onChange={ event => setTeam(team => ({...team, name: event.target.value })) } aria-label="Team Name" />
	</label>

	<label>
		<span>State</span>
		<select value={ team.state } onChange={ event => setTeam(team => ({...team, state: event.target.value })) } aria-label="Team State">
			<option value="">-- Select State --</option>
			<option>SC</option>
			<option>NC</option>
			<option>GA</option>
			<option>TN</option>
		</select>
	</label>

	<label>
		<span>Confrence</span>
		<select value={ team.confrence } onChange={ event => setTeam(team => ({...team, confrence: event.target.value })) } aria-label="Team Confrence">
			<option value="">-- Select Confrence --</option>
			<option>5A</option>
			<option>4A</option>
			<option>3A</option>
			<option>2A-1A</option>
			<option>SCISA</option>
		</select>
	</label>

	<label>
		<span>Section</span>
		<select value={ team.section } onChange={ event => setTeam(team => ({...team, section: event.target.value })) } aria-label="Team Section">
			<option value="">-- Select Section --</option>
			<option>Upper State</option>
			<option>Lower State</option>
		</select>
	</label>

	<label>
		<span>Region</span>
		<input type="number" value={ team.region } onChange={ event => setTeam(team => ({...team, region: event.target.value })) } aria-label="Team Region" />
	</label>

	<label>
		<span>My Team</span>
		<select value={ team.isMyTeam } onChange={ event => setTeam(team => ({...team, confrence: event.target.value })) } aria-label="Is My Team">
			<option value={true}>Yes</option>
			<option value={false}>No</option>
		</select>
	</label>

	<div className="row">
		<button onClick={ () => props.saveTeam(team) } aria-label="Save Team">
			{/* Check */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
				<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
			</svg>
			<div>save</div>
		</button>

		<button aria-label="Cancel" onClick={ () => props.cancelEdit() }>
			{/* Cancel */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
				<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
			</svg>
			<div>cancel</div>
		</button>
		
		{
		props.deleteTeam ?
		<button aria-label="Delete Team" onClick={ () => props.deleteTeam(team.id)}>
			{/* Trash */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
			<div>delete</div>
		</button>
		: ""
		}
	</div>
</div>

		)
	};
	
export default TeamsEdit;
