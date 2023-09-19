import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const Teams = () => {

	const emptyTeam = { name: "", state: "", confrence: "", isMyTeam: false };

	const [ pageActive, setPageActive ] = useState(false);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ editTeam, setEditTeam ] = useState(null);
	const [ savingTeamId, setSavingTeamId ] = useState(null);
	const [ savingError, setSavingError ] = useState("");

	const [ teams, setTeams ] = useState([]);
	const [ myTeam, setMyTeam ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	useEffect(() => {
		if (!pageActive) {
			
			fetch(`/api/teamsload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {

					setLoggedInUser(data.loggedInUser);
					setTeams(data.teams.filter(team => !team.isMyTeam).map(team => ({...team, isMyTeam: false })));
					setMyTeam(data.teams.filter(team => team.isMyTeam).map(team => ({...team, isMyTeam: true })).find(() => true));
					setPageActive(true);

				})
				.catch(error => {
					console.warn(error);
				});

		}
	}, []);

	const saveTeam = () => {
		setSavingTeamId(editTeam.id);
		setSavingError("");

		fetch("/api/teamssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveTeam: editTeam }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {

				if (data.team.isMyTeam) {
					setMyTeam(data.team);
					setTeams(teams => teams.filter(team => team.id != data.team.id));
				}
				else {
					setMyTeam(teams.filter(team => !team.isMyTeam && team.id != data.team.id));
					setTeams(teams => editTeam.id ? 
							teams.map(team => team.id == data.team.id ? data.team : team)
						: teams.concat(data.team)
					)
				}

				setEditTeam(null);
				setSavingTeamId(null);

			})
			.catch(error => {
				console.warn(error);
				setSavingError("There was an error saving the team");
				setEditTeam(null);
			});
	};

	const deleteTeam = () => {
		setSavingTeamId(editTeam.id);

		fetch("/api/teamssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteTeam: editTeam.id }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {

				setTeams(teams => teams.filter(team => team.id != editTeam.id));
				setSavingTeamId(null);

			})
			.catch(error => {
				console.warn(error);
				setSavingError("There was an error deleting the team");
			});
	};

	return (
		
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		{
		!pageActive ?
		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>
		: ""
		}

		<div className={`container ${ pageActive ? "active" : "" }`}>

			<header><h1>Teams</h1></header>

			{
			myTeam ?
			<>

			<div className="panelHeader">
				<div>My Team</div>
			</div>

			<div className="panel centered actionBar">
				<div className="panelContent">
					
				{
					savingTeamId == myTeam.id && savingError ?

					<div className="panelError">{ savingError }</div>

					: savingTeamId == myTeam.id ?

					<div className="panelLoading">
						<img src="/media/wrestlingloading.gif" />
					</div>

					: editTeam && editTeam.id == myTeam.id ?

					<div>
						<label>
							<span>Name</span>
							<input type="text" value={ editTeam.name } onChange={ event => setEditTeam(editTeam => ({...editTeam, name: event.target.value })) } aria-label="Team Name" />
						</label>

						<label>
							<span>State</span>
							<select value={ editTeam.state } onChange={ event => setEditTeam(editTeam => ({...editTeam, state: event.target.value })) } aria-label="Team State">
								<option value="">-- Select State --</option>
								<option>SC</option>
								<option>NC</option>
								<option>GA</option>
								<option>TN</option>
							</select>
						</label>

						<label>
							<span>Confrence</span>
							<select value={ editTeam.confrence } onChange={ event => setEditTeam(editTeam => ({...editTeam, confrence: event.target.value })) } aria-label="Team Confrence">
								<option value="">-- Select Confrence --</option>
								<option>5A</option>
								<option>4A</option>
								<option>3A</option>
								<option>2A-1A</option>
								<option>SCISA</option>
							</select>
						</label>

						<label>
							<span>My Team</span>
							<select value={ editTeam.isMyTeam } onChange={ event => setEditTeam(editTeam => ({...editTeam, confrence: event.target.value })) } aria-label="Team Confrence">
								<option value={true}>Yes</option>
								<option value={false}>No</option>
							</select>
						</label>

						<div className="row">
							<button onClick={ () => saveTeam() } aria-label="Save Team">
								{/* Check */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
									<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
								</svg>
								<div>save</div>
							</button>

							<button aria-label="Cancel" onClick={ () => setEditTeam(null) }>
								{/* Cancel */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
									<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
								</svg>
								<div>cancel</div>
							</button>
						</div>
					</div>

					:

					<h3>{ myTeam.name }</h3>

					}

				</div>

				{
				!editTeam || editTeam.id != myTeam.id ?

				<div className="panelActionBar">
					{
					loggedInUser.privileges.includes("teamManage") ?
					<>

					<button aria-label="Edit Team" onClick={() => setEditTeam({...myTeam}) }>
						{/* pencil */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/></svg>
						<div>edit</div>
					</button>
					
					<button aria-label="Link Team">
						{/* Link */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M432.307-298.463H281.539q-75.338 0-128.438-53.093-53.1-53.093-53.1-128.422t53.1-128.444q53.1-53.115 128.438-53.115h150.768v59.998H281.539q-50.385 0-85.962 35.577Q160-530.385 160-480q0 50.385 35.577 85.962 35.577 35.577 85.962 35.577h150.768v59.998ZM330.001-450.001v-59.998h299.998v59.998H330.001Zm197.692 151.538v-59.998h150.768q50.385 0 85.962-35.577Q800-429.615 800-480q0-50.385-35.577-85.962-35.577-35.577-85.962-35.577H527.693v-59.998h150.768q75.338 0 128.438 53.093 53.1 53.093 53.1 128.422t-53.1 128.444q-53.1 53.115-128.438 53.115H527.693Z"/></svg>
						<div>link</div>
					</button>

					</>
					: ""
					}
					
					<button aria-label="View Wrestlers">
						{/* wrestler */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M57-80 1-136l146-146-44-118q-7-18-3-41.5t23-42.5l132-132q12-12 26-18t31-6q17 0 31 6t26 18l80 78q27 27 66 42.5t84 15.5v80q-60 0-112-19t-90-57l-28-28-94 94 84 86v244h-80v-210l-52-48v88L57-80Zm542 0v-280l84-80-24-140q-15 18-33 32t-39 26q-33-2-62.5-14T475-568q45-8 79.5-30.5T611-656l40-64q17-27 47-36.5t59 2.5l202 86v188h-80v-136l-72-28L919-80h-84l-72-300-84 80v220h-80ZM459-620q-33 0-56.5-23.5T379-700q0-33 23.5-56.5T459-780q33 0 56.5 23.5T539-700q0 33-23.5 56.5T459-620Zm200-160q-33 0-56.5-23.5T579-860q0-33 23.5-56.5T659-940q33 0 56.5 23.5T739-860q0 33-23.5 56.5T659-780Z"/></svg>
						<div>wrestlers</div>
					</button>
					
					<button aria-label="Compare Team">
						{/* Compare */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M420.001-55.386V-140H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h207.692v-84.615H480v849.228h-59.999ZM200-240h220.001v-263.848L200-240Zm360 99.999V-480l200 240v-507.691q0-4.616-3.846-8.463-3.847-3.846-8.463-3.846H560v-59.999h187.691q30.308 0 51.308 21t21 51.308v535.382q0 30.308-21 51.308t-51.308 21H560Z"/></svg>
						<div>compare</div>
					</button>
				</div>
				: ""
				}

			</div>

			</>
			: ""
			}

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
						Confrence
						<select>
							<option value="">-- Select --</option>
							<option>5A</option>
							<option>4A</option>
							<option>3A</option>
							<option>2A-1A</option>
							<option>SCISA</option>
						</select>
					</label>
					
					<label>
						State
						<select>
							<option value="">-- Select --</option>
							<option>SC</option>
							<option>NC</option>
							<option>GA</option>
							<option>TN</option>
						</select>
					</label>
				</div>

			</div>

			{
			teams
			.sort((teamA, teamB) => teamA.name > teamB.name ? 1 : -1)
			.map(team => 
			
			<div key={team.id} data-testid={ team.id } className="panel actionBar">
				<div className="panelContent">
					
					{
					savingTeamId == team.id && savingError ?

					<div className="panelError">{ savingError }</div>

					: savingTeamId == team.id ?

					<div className="panelLoading">
						<img src="/media/wrestlingloading.gif" />
					</div>

					: editTeam && editTeam.id == team.id ?

					<div>
						<label>
							<span>Name</span>
							<input type="text" value={ editTeam.name } onChange={ event => setEditTeam(editTeam => ({...editTeam, name: event.target.value })) } aria-label="Team Name" />
						</label>

						<label>
							<span>State</span>
							<select value={ editTeam.state } onChange={ event => setEditTeam(editTeam => ({...editTeam, state: event.target.value })) } aria-label="Team State">
								<option value="">-- Select State --</option>
								<option>SC</option>
								<option>NC</option>
								<option>GA</option>
								<option>TN</option>
							</select>
						</label>

						<label>
							<span>Confrence</span>
							<select value={ editTeam.confrence } onChange={ event => setEditTeam(editTeam => ({...editTeam, confrence: event.target.value })) } aria-label="Team Confrence">
								<option value="">-- Select Confrence --</option>
								<option>5A</option>
								<option>4A</option>
								<option>3A</option>
								<option>2A-1A</option>
								<option>SCISA</option>
							</select>
						</label>

						<label>
							<span>My Team</span>
							<select value={ editTeam.isMyTeam } onChange={ event => setEditTeam(editTeam => ({...editTeam, isMyTeam: event.target.value })) } aria-label="My Team">
								<option value={true}>Yes</option>
								<option value={false}>No</option>
							</select>
						</label>

						<div className="row">
							<button onClick={ () => saveTeam() } aria-label="Save Team">
								{/* Check */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
									<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
								</svg>
								<div>save</div>
							</button>

							<button aria-label="Cancel" onClick={ () => setEditTeam(null) }>
								{/* Cancel */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
									<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
								</svg>
								<div>cancel</div>
							</button>
							
							<button aria-label="Delete Team" onClick={ () => deleteTeam()}>
								{/* Trash */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
								<div>delete</div>
							</button>
						</div>
					</div>

					:

					<h3>{ team.name }</h3>

					}

				</div>

				{
				(!editTeam || editTeam.id != team.id) &&
				(savingTeamId != team.id || !savingError) ?

				<div className="panelActionBar">
					{
					loggedInUser.privileges.includes("teamManage") ?
					<>
					
					<button aria-label="Edit Team" onClick={() => setEditTeam({...team}) }>
						{/* pencil */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/></svg>
						<div>edit</div>
					</button>
					
					<button aria-label="Link Team">
						{/* Link */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M432.307-298.463H281.539q-75.338 0-128.438-53.093-53.1-53.093-53.1-128.422t53.1-128.444q53.1-53.115 128.438-53.115h150.768v59.998H281.539q-50.385 0-85.962 35.577Q160-530.385 160-480q0 50.385 35.577 85.962 35.577 35.577 85.962 35.577h150.768v59.998ZM330.001-450.001v-59.998h299.998v59.998H330.001Zm197.692 151.538v-59.998h150.768q50.385 0 85.962-35.577Q800-429.615 800-480q0-50.385-35.577-85.962-35.577-35.577-85.962-35.577H527.693v-59.998h150.768q75.338 0 128.438 53.093 53.1 53.093 53.1 128.422t-53.1 128.444q-53.1 53.115-128.438 53.115H527.693Z"/></svg>
						<div>link</div>
					</button>

					</>
					: ""
					}
					
					<button aria-label="View Wrestlers">
						{/* wrestler */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M57-80 1-136l146-146-44-118q-7-18-3-41.5t23-42.5l132-132q12-12 26-18t31-6q17 0 31 6t26 18l80 78q27 27 66 42.5t84 15.5v80q-60 0-112-19t-90-57l-28-28-94 94 84 86v244h-80v-210l-52-48v88L57-80Zm542 0v-280l84-80-24-140q-15 18-33 32t-39 26q-33-2-62.5-14T475-568q45-8 79.5-30.5T611-656l40-64q17-27 47-36.5t59 2.5l202 86v188h-80v-136l-72-28L919-80h-84l-72-300-84 80v220h-80ZM459-620q-33 0-56.5-23.5T379-700q0-33 23.5-56.5T459-780q33 0 56.5 23.5T539-700q0 33-23.5 56.5T459-620Zm200-160q-33 0-56.5-23.5T579-860q0-33 23.5-56.5T659-940q33 0 56.5 23.5T739-860q0 33-23.5 56.5T659-780Z"/></svg>
						<div>wrestlers</div>
					</button>
					
					<button aria-label="Compare Team">
						{/* Compare */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M420.001-55.386V-140H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h207.692v-84.615H480v849.228h-59.999ZM200-240h220.001v-263.848L200-240Zm360 99.999V-480l200 240v-507.691q0-4.616-3.846-8.463-3.847-3.846-8.463-3.846H560v-59.999h187.691q30.308 0 51.308 21t21 51.308v535.382q0 30.308-21 51.308t-51.308 21H560Z"/></svg>
						<div>compare</div>
					</button>
				</div>
				: ""
				}

			</div>

			)
			}

			<div aria-label="Add Team" role="button" className={ `panel ${ !editTeam || !editTeam.id ? "button" : "" }` } onClick={ () => setEditTeam({...emptyTeam}) }>
				
				{
				savingTeamId == "new" && savingError ?

				<div className="panelError">{ savingError }</div>

				: savingTeamId == "new" ?

				<div className="panelLoading">
					<img src="/media/wrestlingloading.gif" />
				</div>

				: editTeam && !editTeam.id ?

				<div>
					<label>
						<span>Name</span>
						<input type="text" value={ editTeam.name } onChange={ event => setEditTeam(editTeam => ({...editTeam, name: event.target.value })) } aria-label="Team Name" />
					</label>

					<label>
						<span>State</span>
						<select value={ editTeam.state } onChange={ event => setEditTeam(editTeam => ({...editTeam, state: event.target.value })) } aria-label="Team State">
							<option value="">-- Select State --</option>
							<option>SC</option>
							<option>NC</option>
							<option>GA</option>
							<option>TN</option>
						</select>
					</label>

					<label>
						<span>Confrence</span>
						<select value={ editTeam.confrence } onChange={ event => setEditTeam(editTeam => ({...editTeam, confrence: event.target.value })) } aria-label="Team Confrence">
							<option value="">-- Select Confrence --</option>
							<option>5A</option>
							<option>4A</option>
							<option>3A</option>
							<option>2A-1A</option>
							<option>SCISA</option>
						</select>
					</label>

					<label>
						<span>My Team</span>
						<select value={ editTeam.isMyTeam } onChange={ event => setEditTeam(editTeam => ({...editTeam, isMyTeam: event.target.value })) } aria-label="My Team">
							<option value={true}>Yes</option>
							<option value={false}>No</option>
						</select>
					</label>

					<div className="row">
						<button onClick={ () => saveTeam() } aria-label="Save Team">
							{/* Check */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
							</svg>
							<div>save</div>
						</button>

						<button aria-label="Cancel" onClick={ () => setEditTeam(null) }>
							{/* Cancel */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
							</svg>
							<div>cancel</div>
						</button>
					</div>
				</div>

				:

				<h3>Add Team</h3>

				}

			</div>

		</div>
	</div>
</div>
	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Teams />);
export default Teams;
