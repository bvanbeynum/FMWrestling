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

	const [ editPanelId, setEditPanelId ] = useState(null);
	const [ savePanelId, setSavePanelId ] = useState(null);

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ expandPanelList, setExpandPanelList ] = useState([]);
	const [ expandListItemList, setExpandListItemList ] = useState([]);

	const [ teams, setTeams ] = useState([]);
	const [ newTeam, setNewTeam ] = useState(emptyTeam);

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
					setTeams(data.teams);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
					setLoadError(`Error: ${error.message}`);
				});

		}
	}, []);

	const saveTeam = save => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSavePanelId(save.id || "new");

		fetch("/api/teamssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveTeam: save }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				if (!save.id) {
					setTeams(teams => teams.concat(data.team));
					setNewTeam(emptyTeam);
				}

				setEditPanelId(null);
				setSavePanelId(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setPanelError("There was an error saving the team");
				setSavePanelId(null);
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

	return (
		
<div className="page">
	<Nav />

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
			
			savePanelId === "new" ?

			<div className="panel">
				<div className="loading">
					{
					loading[loadingIndex]
					}
				</div>
			</div>

			: editPanelId === "new" ?
			
			<div className="panel">
				<label>
					<span>Name</span>
					<input type="text" value={ newTeam.name } onChange={ event => setNewTeam(newTeam => ({...newTeam, name: event.target.value })) } aria-label="Team Name" />
				</label>

				<label>
					<span>State</span>
					<select value={ newTeam.state } onChange={ event => setNewTeam(newTeam => ({...newTeam, state: event.target.value })) } aria-label="Team State">
						<option value="">-- Select State --</option>
						<option>SC</option>
						<option>NC</option>
						<option>GA</option>
						<option>TN</option>
					</select>
				</label>

				<label>
					<span>Confrence</span>
					<select value={ newTeam.confrence } onChange={ event => setNewTeam(newTeam => ({...newTeam, confrence: event.target.value })) } aria-label="Team Confrence">
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

					<button disabled="" onClick={ () => saveTeam(newTeam) } aria-label="Save Team">
						{/* Check */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
						</svg>
					</button>

					<button disabled="" onClick={ () => setEditPanelId(null) } aria-label="Cancel">
						{/* Cancel */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
						</svg>
					</button>
				</div>
			</div>

			:

			<div className="panel">
				<div className="row">
					<h3>
						Add Team
						<button aria-label="Add Team" className="action" onClick={ () => setEditPanelId("new") }>
							{/* Add */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"/>
							</svg>
						</button>
					</h3>
				</div>
			</div>

			}

			{
			teams.map(team => 
			
			savePanelId === team.id ?

			<div key={ team.id } data-testid={ team.id } className="panel">
				<div className="loading">
					{
					loading[loadingIndex]
					}
				</div>
			</div>

			: editPanelId === team.id ?

			<div key={ team.id } data-testid={ team.id } className="panel">
				<label>
					<span>Name</span>
					<input type="text" value={ team.name } onChange={ event => editProperty(team.id, "name", event.target.value) } aria-label="Team Name" />
				</label>

				<label>
					<span>State</span>
					<select value={ team.state } onChange={ event => editProperty(team.id, "state", event.target.value) } aria-label="Team State">
						<option value="">-- Select State --</option>
						<option>SC</option>
						<option>NC</option>
						<option>GA</option>
						<option>TN</option>
					</select>
				</label>

				<label>
					<span>Confrence</span>
					<select value={ team.confrence } onChange={ event => editProperty(team.id, "confrence", event.target.value) } aria-label="Team Confrence">
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

					<button disabled="" onClick={ () => saveTeam(team) } aria-label="Save Team">
						{/* Check */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
						</svg>
					</button>

					<button disabled="" onClick={ () => setEditPanelId(null) } aria-label="Cancel">
						{/* Cancel */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
						</svg>
					</button>
				</div>
			</div>

			:

			<div key={ team.id } data-testid={ team.id } className="panel">
				<div className="row">
					<div className="rowContent">
						<h3>
							{ team.name }
							<button aria-label="Edit Team" className="action" onClick={ () => setEditPanelId(team.id) }>
								{/* pencil */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
									<path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/>
								</svg>
							</button>
						</h3>
					</div>
					
					<button aria-label="Expand Team" className="action" onClick={ () => setExpandPanelList(expandPanelList => expandPanelList.includes(team.id) ? expandPanelList.filter(item => item !== team.id) : expandPanelList.concat(team.id)) }>
						{
						expandPanelList.includes(team.id) ?
						// Shrink
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m296-345-56-56 240-240 240 240-56 56-184-184-184 184Z"/></svg>
						:
						// Expand
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>
						}
					</button>
				</div>
				
				{
				expandPanelList.includes(team.id) ?

				<>
				<h3>Flow Wrestling Sync</h3>

				<label>
					<input type="text" placeholder="Filter List" />
				</label>

				<ul>
				<li>

				<div className="listItem">
						<button aria-label="Select Flow Team">
							{/* Check */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
						</button>

						<span className="listItemContent">Ft Mill</span>

						<button aria-label="Expand Flow Team" className="secondary">
							{/* Expand */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>
						</button>
					</div>
					
				</li>
				<li>
					
					<div className="listItem">
						<button aria-label="Select Flow Team" className="selected">
							{/* Check */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
						</button>

						<span className="listItemContent">Fort Mill</span>

						<button aria-label="Expand Flow Team" className="secondary">
							{/* Expand */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>
						</button>
					</div>
				
					<div className="sectionList">
						<div className="pill">TJ</div>
						<div className="pill">Lucas van Beynum</div>
					</div>

					<div className="sectionList">
						<div className="pill">Southern Slam</div>
						<div className="pill">May River</div>
					</div>

				</li>
				<li>
					
					<div className="listItem">
						<button aria-label="Select Flow Team">
							{/* Check */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
						</button>

						<span className="listItemContent">C2X</span>

						<button aria-label="Expand Flow Team" className="secondary">
							{/* Expand */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>
						</button>
					</div>
					
				</li>
				</ul>
				</>

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
