import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import TeamsEdit from "./teamsedit.jsx";

const Teams = () => {

	const emptyTeam = { name: "", state: "", confrence: "", isMyTeam: false };

	const [ pageActive, setPageActive ] = useState(false);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ editTeamId, setEditTeamId ] = useState(null);
	const [ savingTeamId, setSavingTeamId ] = useState(null);
	const [ savingError, setSavingError ] = useState("");

	const [ teams, setTeams ] = useState([]);
	const [ myTeam, setMyTeam ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ filterConfrence, setFilterConfrence ] = useState("");
	const [ filterState, setFilterState ] = useState("");
	const [ filterSection, setFilterSection ] = useState("");
	const [ filterRegion, setFilterRegion ] = useState("");

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

	const saveTeam = (team) => {
		setSavingTeamId(editTeamId);
		setSavingError("");

		fetch("/api/teamssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveTeam: team }) })
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
					if (myTeam && myTeam.id == data.team.id) {
						setMyTeam(null);
					}
					
					setTeams(teams => team.id ? 
							teams.map(team => team.id == data.team.id ? data.team : team)
						: teams.concat(data.team)
					)
				}

				setEditTeamId(null);
				setSavingTeamId(null);

			})
			.catch(error => {
				console.warn(error);
				setSavingError("There was an error saving the team");
				setEditTeamId(null);
			});
	};

	const deleteTeam = teamId => {
		setSavingTeamId(teamId);

		fetch("/api/teamssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteTeam: teamId }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {

				setTeams(teams => teams.filter(team => team.id != teamId));
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

					: editTeamId == myTeam.id ?

					<TeamsEdit team={ myTeam } saveTeam={ saveTeam } cancelEdit={ () => setEditTeamId(null) } deleteTeam={ null } />

					:
					<>
					
					<div className="subHeading">
						{ myTeam.state }
						{ myTeam.confrence ? ` • ${ myTeam.confrence }` : "" }
						{ myTeam.section ? ` • ${ myTeam.section }` : "" }
						{ myTeam.region ? ` • region ${ myTeam.region }` : "" }
					</div>
					<h3>{ myTeam.name }</h3>

					</>
					}

				</div>

				{
				(editTeamId != myTeam.id) &&
				(savingTeamId != myTeam.id || !savingError) ?

				<div className="panelActionBar">
					{
					loggedInUser.privileges.includes("teamManage") ?
					<>

					<button aria-label="Edit Team" onClick={() => setEditTeamId(myTeam.id) }>
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
					
					<button aria-label="View Wrestlers" onClick={ () => window.location = `/portal/teamview.html?id=${ myTeam.id }&page=wrestlers` }>
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
						<select value={ filterConfrence } onChange={ event => setFilterConfrence(event.target.value) }>
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
						<select value={ filterState } onChange={ event => setFilterState(event.target.value) }>
							<option value="">-- Select --</option>
							<option>SC</option>
							<option>NC</option>
							<option>GA</option>
							<option>TN</option>
						</select>
					</label>
					
					<label>
						Section
						<select value={ filterSection } onChange={ event => setFilterSection(event.target.value) }>
							<option value="">-- Select --</option>
							<option>Upper State</option>
							<option>Lower State</option>
						</select>
					</label>
					
					<label>
						Region
						<input type="number" value={ filterRegion } onChange={ event => setFilterRegion(event.target.value) } />
					</label>
				</div>

			</div>

			{
			teams
			.filter(team => 
				(!filterState || team.state == filterState) && 
				(!filterConfrence || team.confrence == filterConfrence) &&
				(!filterSection || team.section == filterSection) &&
				(!filterRegion || team.region == filterRegion)
				)
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

					: editTeamId == team.id ?

					<TeamsEdit team={ team } saveTeam={ saveTeam } cancelEdit={ () => setEditTeamId(null) } deleteTeam={ deleteTeam } />

					:
					<>

					<div className="subHeading">
						{ team.state }
						{ team.confrence ? ` • ${ team.confrence }` : "" }
						{ team.section ? ` • ${ team.section }` : "" }
						{ team.region ? ` • region ${ team.region }` : "" }
					</div>
					<h3>{ team.name }</h3>

					</>
					}

				</div>

				{
				(editTeamId != team.id) &&
				(savingTeamId != team.id || !savingError) ?

				<div className="panelActionBar">
					{
					loggedInUser.privileges.includes("teamManage") ?
					<>
					
					<button aria-label="Edit Team" onClick={() => setEditTeamId(team.id) }>
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
					
					<button aria-label="View Wrestlers" onClick={ () => window.location = `/portal/teamview.html?id=${ team.id }&page=wrestlers` }>
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

			<div aria-label="Add Team" role="button" className={ `panel ${ editTeamId != "new" ? "button" : "" }` } onClick={ () => { if (editTeamId != "new") { setEditTeamId("new") } }}>
				
				{
				savingTeamId == "new" && savingError ?

				<div className="panelError">{ savingError }</div>

				: savingTeamId == "new" ?

				<div className="panelLoading">
					<img src="/media/wrestlingloading.gif" />
				</div>

				: editTeamId == "new" ?

				<TeamsEdit team={ {...emptyTeam} } saveTeam={ saveTeam } cancelEdit={ () => setEditTeamId(null) } deleteTeam={ null } />

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
