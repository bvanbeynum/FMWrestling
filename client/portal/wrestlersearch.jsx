import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import NavComponent from "./nav.jsx";
import WrestlerDetails from "./wrestlerdetails.jsx";
import "./include/index.css";

const WrestlerSearchComponent = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("search");
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ teamLookup, setTeamLookup ] = useState([]);
	const [ teamLookupSelected, setTeamLookupSelected ] = useState("");
	const [ wrestlerSearch, setWrestlerSearch ] = useState("");
	const [ teamSearch, setTeamSearch ] = useState("");

	const [ wrestlerResults, setWrestlerResults ] = useState([]);
	const [ selectedWrestlers, setSelectedWrestlers ] = useState([]);
	const [ compareWrestlers, setCompareWrestlers ] = useState([]);

	useEffect(() => {
		if (!pageActive) {
			fetch(`/api/wrestlersearchload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setTeamLookup(data.scmatTeams);
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

	const selectWrestler = wrestler => {
		setPageView("results");

		if (!selectedWrestlers.some(selected => selected.id == wrestler.id)) {
			setSelectedWrestlers(selectedWrestlers.concat(wrestler));
		}
	};

	const updateWrestler = updatedWrestler => {
		setSelectedWrestlers(selectedWrestlers.map(wrestler => wrestler.id == updatedWrestler.id ? updatedWrestler : wrestler));
	};

	const addCompare = compare => {
		if (compareWrestlers.some(wrestler => wrestler.id == compare.id)) {
			setCompareWrestlers(compareWrestlers.filter(wrestler => wrestler.id != compare.id));
		}
		else {
			setCompareWrestlers(compareWrestlers.concat(compare));
		}
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
		
			{

			pageView == "results" ? 
			
			selectedWrestlers.map((wrestler, wrestlerIndex) =>
				
				<WrestlerDetails 
					key={wrestlerIndex} 
					wrestlerId={ wrestler.id } 
					wrestlerName={ wrestler.name }
					updateWrestler={ updateWrestler }
					addCompare={ addCompare }
					isCompare={ compareWrestlers.some(compare => compare.id == wrestler.id) }
					wrestler={ wrestler }
					closeWrestler={ wrestlerId => setSelectedWrestlers(selectedWrestlers.filter(selected => selected.id != wrestlerId)) }
					/>

			)

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
						Wrestler
						<input type="text" value={ wrestlerSearch } onChange={ event => setWrestlerSearch(event.target.value) } aria-label="Wrestler Search" />
					</label>
{/* 					
					<label>
						Team
						<input type="text" value={ teamSearch } onChange={ event => setTeamSearch(event.target.value) } aria-label="Team Search" />
					</label>
					
					<label>
						Select Team
						<select value={ teamLookupSelected } onChange={ event => setTeamLookupSelected(event.target.value) }>
							{
							teamLookup
							.sort((teamA, teamB) => teamA.name > teamB.name ? 1 : -1)
							.map((team, teamIndex) =>
								<option key={teamIndex} value={ team.id }>{ team.name }</option>
							)
							}
						</select>
					</label> */}
				</div>

			</div>
			
			{
			wrestlerResults.map((wrestler, wrestlerIndex) => 
				<div key={wrestlerIndex} className="panel button" onClick={ event => selectWrestler(wrestler) }>
					{
					wrestler.division ?
					<div className="subHeading">
						{ wrestler.division } • { wrestler.weightClass}
					</div>
					: ""
					}

					<h3>{ wrestler.name }</h3>

					<div>{ wrestler.team }</div>
					{
					wrestler.lastEvent ?
					<div>{ wrestler.lastEvent.date.toLocaleDateString() } • { wrestler.lastEvent.name }</div>
					: ""
					}
				</div>
			)
			}
			
			</>
			}
		</div>

		<div className="bottomNav">
			<button aria-label="Opponent Wrestlers" onClick={ () => setPageView("search") }>
				{/* Search */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M781.692-136.924 530.461-388.155q-30 24.769-69 38.769t-80.692 14q-102.55 0-173.582-71.014t-71.032-173.537q0-102.524 71.014-173.601 71.014-71.076 173.538-71.076 102.523 0 173.6 71.032T625.384-580q0 42.846-14.385 81.846-14.385 39-38.385 67.846l251.231 251.231-42.153 42.153Zm-400.923-258.46q77.308 0 130.962-53.654Q565.385-502.692 565.385-580q0-77.308-53.654-130.962-53.654-53.654-130.962-53.654-77.308 0-130.962 53.654Q196.154-657.308 196.154-580q0 77.308 53.653 130.962 53.654 53.654 130.962 53.654Z"/></svg>
				Search
			</button>

			<button aria-label="Team Wrestlers" onClick={ () => setPageView("results") } disabled={ selectedWrestlers.length == 0 }>
				{/* Wrestlers */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M55.077-93.847 12.924-136l143.692-143.692-46.308-123.385q-6.23-15.692-2.423-36.692 3.808-21 20.115-37.307l132-132q10.462-10.462 22.539-15.693 12.076-5.23 27.153-5.23 15.077 0 27.154 5.23 12.076 5.231 22.538 15.693l80.769 78q27.385 27 65.231 42.692 37.846 15.692 81.692 17.615v59.999q-55-1.923-103.153-20.731-48.154-18.808-81.923-52.192l-34.923-34.154L259.23-410l87.846 89.846v230.153h-59.998v-204.615l-72.002-66.463v107.233l-160 159.999Zm552.001 3.846v-265.383l85.538-81.539-30.154-166.156q-22.693 27.616-48.386 49.502-25.693 21.885-57.463 34.27-23.768-2-45.576-11.116-21.807-9.115-37.191-24.114 45.769-7.616 84.5-34.539 38.732-26.924 59.962-61.539l39.231-64q15.077-24.307 41.423-32.269 26.345-7.961 52.268 2.885l195.846 82.923v171.075h-59.998v-132.153l-95.079-38.001L904.768-90.001H840.77L767.616-396.54l-100.54 85.001v221.538h-59.998ZM447.076-614.615q-30.692 0-52.269-21.577-21.577-21.577-21.577-52.269 0-30.692 21.577-52.269 21.577-21.576 52.269-21.576 30.692 0 52.269 21.576 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.577 21.577-52.269 21.577ZM664-776.154q-30.692 0-52.269-21.576-21.576-21.577-21.576-52.269 0-30.692 21.576-52.269 21.577-21.577 52.269-21.577 30.693 0 52.269 21.577 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.576 21.576-52.269 21.576Z"></path></svg>
				Wrestlers
			</button>

			<button aria-label="Compare" onClick={ () => setPageView("compare") } disabled={ compareWrestlers.length < 2 }>
				{/* Compare */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M420.001-55.386V-140H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h207.692v-84.615H480v849.228h-59.999ZM200-240h220.001v-263.848L200-240Zm360 99.999V-480l200 240v-507.691q0-4.616-3.846-8.463-3.847-3.846-8.463-3.846H560v-59.999h187.691q30.308 0 51.308 21t21 51.308v535.382q0 30.308-21 51.308t-51.308 21H560Z"></path></svg>
				Compare
			</button>

		</div>

		</>
		}

	</div>
</div>
	);
		
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<WrestlerSearchComponent />);
export default WrestlerSearchComponent;
