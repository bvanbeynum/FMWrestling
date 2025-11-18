import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import NavComponent from "./nav.jsx";
import "./include/index.css";
import "./include/wrestler.css";

const WrestlerSearchComponent = () => {

	const chartColors = ["#0074C2", "#F0AC00", "#E66000", "#5E97BD", "#B89E5C", "#E5641E"];

	const [ pageActive, setPageActive ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ wrestlerSearch, setWrestlerSearch ] = useState("");
	const [ teamSearch, setTeamSearch ] = useState("");

	const [ wrestlerResults, setWrestlerResults ] = useState([]);
	const [ wrestlerRankings, setWrestlerRankings ] = useState([]);

	const [ filterState, setFilterState ] = useState("SC");
	const [ filterWeightClass, setFilterWeightClass ] = useState("");
	const [ filterClassification, setFilterClassification ] = useState("");
	const [ filterTeam, setFilterTeam ] = useState("");
	const [ filters, setFilters ] = useState({});
	
	useEffect(() => {
		if (!pageActive) {
			fetch(`/api/wrestlersearchload?rankingstate=SC`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					const rankings = data.wrestlerRankings.map((wrestler, index) => ({
						...wrestler,
						teamLast: wrestler.teams
							.sort((teamA, teamB) => new Date(teamB.lastDate) - new Date(teamA.lastDate))
							.find(() => true),
						weightClassLast: wrestler.weightClasses
							.sort((weightClassA, weightClassB) => new Date(weightClassB.lastDate) - new Date(weightClassA.lastDate))
							.find(() => true),
						weightClassCommon: wrestler.events.slice(0,5)
							.reduce((output, event) => {
								const weightClassEntry = output.find(entry => entry.weightClass === event.weightClass);
								if (weightClassEntry) {
									weightClassEntry.count += 1;
								}
								else {
									output.push({ weightClass: event.weightClass, count: 1 });
								}
								return output;
							}, [])
							.sort((a, b) => b.count - a.count)[0]?.weightClass || null
					}));

					setWrestlerRankings(rankings);

					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	useEffect(() => {
		if (wrestlerSearch && wrestlerSearch.length > 3) {
			
			fetch(`/api/wrestlersearch?search=${ wrestlerSearch }&searchtype=wrestler`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setWrestlerResults(data.wrestlers.map(wrestler => ({
						...wrestler,
						lastEvent: wrestler.lastEvent ? {...wrestler.lastEvent, date: new Date(wrestler.lastEvent.date)} : null
					})));
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, [ wrestlerSearch ]);

	useEffect(() => {
		if (teamSearch && teamSearch.length > 3) {
			
			fetch(`/api/wrestlersearch?search=${ teamSearch }&searchtype=team`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setWrestlerResults(data.wrestlers.map(wrestler => ({
						...wrestler,
						lastEvent: wrestler.lastEvent ? {...wrestler.lastEvent, date: new Date(wrestler.lastEvent.date)} : null
					})));
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, [ teamSearch ]);

	const selectWrestler = wrestler => {
		window.open(`/portal/wrestler.html?id=${ wrestler.id }`, "_blank");
	};

	const updateFilter = (filterName, filterValue) => {
		const newFilters = { ...filters, [filterName]: filterValue };
		setPageActive(false);
		setFilters(newFilters);
		setFilterState(newFilters.state || "");
		setFilterWeightClass(newFilters.weightClass || "");
		setFilterTeam(newFilters.team || "");

		fetch(`/api/wrestlersearchranking?state=${ newFilters.state || "" }&team=${ newFilters.team || "" }&weightclass=${ newFilters.weightClass || "" }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				const rankings = data.wrestlerRankings.map((wrestler, index) => ({
					...wrestler,
					teamLast: wrestler.teams
						.sort((teamA, teamB) => new Date(teamB.lastDate) - new Date(teamA.lastDate))
						.find(() => true),
					weightClassLast: wrestler.weightClasses
						.sort((weightClassA, weightClassB) => new Date(weightClassB.lastDate) - new Date(weightClassA.lastDate))
						.find(() => true),
					weightClassCommon: wrestler.events.slice(0,5)
						.reduce((output, event) => {
							const weightClassEntry = output.find(entry => entry.weightClass === event.weightClass);
							if (weightClassEntry) {
								weightClassEntry.count += 1;
							}
							else {
								output.push({ weightClass: event.weightClass, count: 1 });
							}
							return output;
						}, [])
						.sort((a, b) => b.count - a.count)[0]?.weightClass || null
				}));

				setWrestlerRankings(rankings);
				setPageActive(true);
			})
			.catch(error => {
				console.warn(error);
			});
	}

	return (
<div className="page">
	<NavComponent loggedInUser={ loggedInUser } />

	<div>
		
		{
		!pageActive ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("wrestlerResearch") ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:
		<>

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>Search Wrestlers</h1>
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
						Wrestler
						<input type="text" value={ wrestlerSearch } onChange={ event => setWrestlerSearch(event.target.value) } aria-label="Wrestler Search" />
					</label>
					
					<label>
						Team
						<input type="text" value={ teamSearch } onChange={ event => setTeamSearch(event.target.value) } aria-label="Team Search" />
					</label>
				</div>

			</div>
			
			{
			wrestlerResults.length > 0 ?

			wrestlerResults
			.sort((wrestlerA, wrestlerB) => wrestlerA.lastEvent && wrestlerB.lastEvent ? +wrestlerB.lastEvent.date - +wrestlerA.lastEvent.date : 1 )
			.map((wrestler, wrestlerIndex) => 
				<div key={wrestlerIndex} className="panel button" onClick={ () => selectWrestler(wrestler) }>
					{
					wrestler.division ?
					<div className="subHeading">
						{ wrestler.division } • { wrestler.weightClass}
					</div>
					: ""
					}

					<h3>{ wrestler.name }</h3>

					<div>{ wrestler.teams.join(", ") }</div>
					{
					wrestler.lastEvent ?
					<div>{ wrestler.lastEvent.date.toLocaleDateString() } • { wrestler.lastEvent.name }</div>
					: ""
					}
				</div>
			)

			: loggedInUser && loggedInUser.privileges && loggedInUser.privileges.includes("rankingsView") ?

			<div className="panel expandable">
				<h3>Rankings</h3>

				<div className="filterControls">
					<div className="filterBar">
						<div className="filterItem">
							<label htmlFor="state-filter">State</label>
							<select id="state-filter" name="state" value={ filterState } onChange={ event => updateFilter("state", event.target.value) }>
								<option value="">All</option>
								<option value="SC">SC</option>
								<option value="NC">NC</option>
								<option value="GA">GA</option>
								<option value="Tn">TN</option>
							</select>
						</div>
						<div className="filterItem">
							<label htmlFor="weight-class-filter">Weight Class</label>
							<select id="weight-class-filter" name="weightClass" value={ filterWeightClass } onChange={ event => updateFilter("weightClass", event.target.value) }>
								<option value="">All</option>
								<option value="106">106</option>
								<option value="113">113</option>
								<option value="120">120</option>
								<option value="126">126</option>
								<option value="132">132</option>
								<option value="138">138</option>
								<option value="144">144</option>
								<option value="150">150</option>
								<option value="157">157</option>
								<option value="165">165</option>
								<option value="175">175</option>
								<option value="190">190</option>
								<option value="215">215</option>
								<option value="285">285</option>
							</select>
						</div>
						{/* <div className="filterItem">
							<label htmlFor="classification-filter">Classification</label>
							<select id="classification-filter" name="classification">
								<option value="">All</option>
							</select>
						</div> */}
						<div className="filterItem">
							<label htmlFor="team-filter">Team</label>
							<select id="team-filter" name="team" value={ filterTeam } onChange={ event => updateFilter("state", event.target.value) }>
								<option value="">All</option>
							</select>
						</div>
					</div>
				</div>

				<table className="rankingsTable">
					<thead>
						<tr>
							<th>Rank</th>
							<th>Name</th>
							<th>Weight Class (Last)</th>
							<th>Weight Class (Common)</th>
							<th>Team</th>
						</tr>
					</thead>
					<tbody>
						{wrestlerRankings.map((wrestler, index) => (
							<tr key={wrestler.id}>
								<td>{index + 1}</td>
								<td>
									<a onClick={() => selectWrestler(wrestler)}>{wrestler.name}</a>
								</td>
								<td>{wrestler.weightClassLast?.weightClass}</td>
								<td>{wrestler.weightClassCommon}</td>
								<td>{wrestler.teamLast?.name}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			: ""

			}
			
		</div>

		</>
		}

	</div>
</div>
	);
		
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<WrestlerSearchComponent />);
export default WrestlerSearchComponent;
