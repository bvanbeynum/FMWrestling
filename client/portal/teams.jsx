import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const Teams = props => {

	const loading = [
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120Zm156-348q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Empty
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Top
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Full
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-516q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg> // Bottom
		],
		emptyTeam = { name: "", state: "", confrence: "", externalTeams: [] };

	const [ pageActive, setPageActive ] = useState(false);
	const [ loadError, setLoadError ] = useState("");
	const [ panelError, setPanelError ] = useState("");
	const [ loadingIndex, setLoadingIndex ] = useState(0);

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ editPanelId, setEditPanelId ] = useState(null);
	const [ savePanelId, setSavePanelId ] = useState(null);
	const [ expandPanelId, setExpandPanelId ] = useState(null);

	const [ expandPanel, setExpandPanel ] = useState({});

	const [ externalFilter, setExternalFilter ] = useState("");

	const [ teams, setTeams ] = useState([]);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ editTeam, setEditTeam ] = useState(emptyTeam);
	const [ externalTeams, setExternalTeams ] = useState([]);

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

					setTeams(data.teams.map(team => ({
							...team, 
							externalTeams: team.externalTeams.map(external => ({
								...external,
								wrestlers: external.wrestlers || [],
								meets: external.meets || []
							}))
						})
					));

					setPageActive(true);

				})
				.catch(error => {
					console.warn(error);
					setLoadError(`Error: ${error.message}`);
				});

		}
	}, []);

	const setTeamMode = (teamId, mode) => {
		if (expandPanel.id === teamId && expandPanel.mode === mode) {
			setExpandPanel({});
			setEditTeam(null);
		}
		else {
			setExpandPanel({ id: teamId, mode: mode });
			setEditTeam(teamId == "new" ? emptyTeam : teams.find(team => team.id == teamId));
		}
	};

	const saveTeam = () => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setExpandPanel(expandPanel => ({...expandPanel, mode: "save" }));

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

				setTeams(teams => 
					expandPanel.id == "new" ? teams.concat(data.team)
					: teams.map(team => team.id == expandPanel.id ? data.team : team)
				);

				setEditTeam(null);
				setExpandPanel({});
				clearInterval(loadingInterval);

			})
			.catch(error => {
				console.warn(error);
				setPanelError("There was an error saving the team");
				setExpandPanel({});
				clearInterval(loadingInterval);
			});
	};

	const deleteTeam = teamId => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setExpandPanel(expandPanel => ({...expandPanel, mode: "save" }));

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
				setExpandPanel({});
				clearInterval(loadingInterval);

			})
			.catch(error => {
				console.warn(error);
				setPanelError("There was an error saving the team");
				setExpandPanel({});
				clearInterval(loadingInterval);
			});
	};

	// Edit properties (e.g. name)
	const editProperty = (teamId, property, value) => {
		setTeams(team => team.map(team => {
			return team.id === teamId ? {
				...team,
				[property]: value
			} : team
		}));
	};

	const filterExternal = event => {
		const filterText = event.target.value;

		setExternalFilter(filterText);

		if (filterText.length > 2) {
			fetch(`/api/externalteamssearch?filter=${ filterText }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setExternalTeams(data.externalTeams);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	};

	return (
		
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		<header><h1>Teams</h1></header>

		<div className={`container ${ pageActive ? "active" : "" }`}>

		{
		loadError ?
			<div className="panel error">
				<h3>{ loadError }</h3>
			</div>
		:

		<>
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
			
			expandPanel.id === "new" && expandPanel.mode == "save" ?

			<div className="panel">
				<div className="loading">
					{
					loading[loadingIndex]
					}
				</div>
			</div>

			: expandPanel.id === "new" && expandPanel.mode == "edit" ?
			
			<div className="panel">
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
				
				<div className="row">
					<div className="error">{ panelError }</div>

					<button disabled="" onClick={ () => saveTeam() } aria-label="Save Team">
						{/* Check */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
						</svg>
					</button>

					<button disabled="" onClick={ () => setExpandPanel({}) } aria-label="Cancel">
						{/* Cancel */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
						</svg>
					</button>
				</div>
			</div>

			:

			<div className="panel">
				<button aria-label="Add Team" className="action" onClick={ () => setTeamMode("new", "edit") }>
					<h3>Add Team</h3>
				</button>
			</div>

			}

			{
			teams.map(team => 
			
			<div key={ team.id } data-testid={ team.id } className="panel">
				<div className="row">
					<div className="rowContent">
						<h3>{ team.name }</h3>
					</div>

					<div className="actions">
						
						<button aria-label="Edit Team" className="action" onClick={ () => setTeamMode(team.id, "edit") }>
							{/* pencil */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/></svg>
						</button>

						<button aria-label="External Teams" className="action" onClick={ () => setTeamMode(team.id, "external") }>
							{/* share */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>
						</button>

						<button aria-label="Wrestlers" className="action">
							{/* wrestler */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M57-80 1-136l146-146-44-118q-7-18-3-41.5t23-42.5l132-132q12-12 26-18t31-6q17 0 31 6t26 18l80 78q27 27 66 42.5t84 15.5v80q-60 0-112-19t-90-57l-28-28-94 94 84 86v244h-80v-210l-52-48v88L57-80Zm542 0v-280l84-80-24-140q-15 18-33 32t-39 26q-33-2-62.5-14T475-568q45-8 79.5-30.5T611-656l40-64q17-27 47-36.5t59 2.5l202 86v188h-80v-136l-72-28L919-80h-84l-72-300-84 80v220h-80ZM459-620q-33 0-56.5-23.5T379-700q0-33 23.5-56.5T459-780q33 0 56.5 23.5T539-700q0 33-23.5 56.5T459-620Zm200-160q-33 0-56.5-23.5T579-860q0-33 23.5-56.5T659-940q33 0 56.5 23.5T739-860q0 33-23.5 56.5T659-780Z"/></svg>
						</button>

						<button aria-label="Delete Team" className="action" onClick={ () => deleteTeam(team.id) }>
							{/* Trash */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
						</button>
					</div>
				</div>

				{
				expandPanel.id === team.id && expandPanel.mode == "edit" ?

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
					
					<div className="row">
						<div className="error">{ panelError }</div>

						<button disabled="" onClick={ () => saveTeam() } aria-label="Save Team">
							{/* Check */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
							</svg>
						</button>

						<button disabled="" onClick={ () => setExpandPanel({}) } aria-label="Cancel">
							{/* Cancel */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
							</svg>
						</button>
					</div>
				</div>

				: expandPanel.id === team.id && expandPanel.mode == "external" ?

				<div>
					
					<div className="sectionList">
						{
						team.externalTeams.map(externalTeam =>

						<div className="pill" key={ externalTeam.id }>
							{ externalTeam.name }

							<button aria-label="Delete External">
								{/* Trash */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
							</button>
							
						</div>

						)}
					</div>
					
					<label>
						<input type="text" value={ externalFilter } onChange={ filterExternal } placeholder="Filter List" aria-label="External Filter" />
					</label>

					<ul>
						
						{
						externalTeams
						.sort((externalA, externalB) => externalA.name > externalB.name ? 1 : -1)
						.map(externalTeam => 
						<li key={ externalTeam.id } data-testid={ externalTeam.id }>
						
							<div className="listItem">
								<span className="listItemHeader">{ externalTeam.name }</span>

								<button aria-label="Add external" className="secondary">
									{/* Add */}
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"/></svg>
								</button>
							</div>
						
							<div className="textList">
								{
								externalTeam.wrestlers.map((wrestler, wrestlerIndex, all) =>
								<div key={ wrestlerIndex }>{ wrestler + (wrestlerIndex < all.length - 1 ? "," : "") }</div>
								)}
							</div>

							<div className="textList">
								{
								externalTeam.meets.map((meet, meetIndex, all) =>
								<div key={ meetIndex }>{ meet + (meetIndex < all.length - 1 ? "," : "") }</div>
								)}
							</div>

						</li>
						)}

					</ul>

				</div>

				: ""
				}
			</div>
			
			)
			}
			
		</>

		}
		</div>
	</div>
</div>
	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Teams />);
export default Teams;
