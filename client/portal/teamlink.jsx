import React, { useEffect, useState, useRef } from "react";

const TeamLink = props => {

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ searchText, setSearchText ] = useState("");
	const [ externalSite, setExternalSite ] = useState("flo");
	const [ isSearching, setIsSearching ] = useState(false);

	const [ floTeams, setFloTeams ] = useState([]);
	const [ scmatTeams, setSCMatTeams ] = useState([]);

	const search = () => {
		setIsSearching(true);

		if (externalSite == "flo") {
			setSCMatTeams([]);

			fetch(`/api/externalteamssearch?name=${ searchText }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setFloTeams(
						data.floTeams.map(team => ({
							...team,
							wrestlers: team.wrestlers.map(wrestler => ({
								...wrestler, 
								firstEvent: wrestler.firstEvent ? {...wrestler.firstEvent, date: wrestler.firstEvent.date ? new Date(wrestler.firstEvent.date) : null } : null, 
								lastEvent: wrestler.lastEvent ? {...wrestler.lastEvent, date: wrestler.lastEvent.date ? new Date(wrestler.lastEvent.date) : null } : null
							})),
							events: team.events.map(event => ({...event, date: new Date(event.date) }))
						}))
					);

					setIsSearching(false);
				})
				.catch(error => {
					console.warn(error);
					setIsSearching(false);
				});
		}
		else if (externalSite == "scmat") {
			setFloTeams([]);

			fetch(`/api/scmatteamsearch?name=${ searchText }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setSCMatTeams(
						data.scmatTeams.map(team => ({...team, lastUpdate: new Date(team.lastUpdate)}))
					);

					setIsSearching(false);
				})
				.catch(error => {
					console.warn(error);
					setIsSearching(false);
				});
		}
	};

	const linkFlo = floTeamId => {
		setFloTeams(floTeams.filter(team => team.id != floTeamId));
		props.linkFlo(floTeamId);
	};

	const linkSCMat = scmatTeamId => {
		setSCMatTeams(scmatTeams.filter(team => team.id != scmatTeamId));
		props.linkSCMat(scmatTeamId);
	};

	return (
<>

<div className="panel">
	<h3>SC Mat External</h3>

	<div className="dataGrid">
		<div>{ props.scmatTeams.length } teams linked</div>
		<div>{ props.scmatTeams.flatMap(team => team.rankings ).length } team data points</div>
		<div>{ props.scmatTeams.flatMap(team => team.wrestlers ).length } ranked wrestlers</div>
		<div>
			{ 
			props.scmatTeams
				.flatMap(team => team.rankings.map(ranking => new Date(ranking.date)) )
				.sort((dateA, dateB) => dateB - dateA)
				.map(date => date.toLocaleDateString())
				.find(() => true) 
			} last updated
		</div>
	</div>
	
	<table className="sectionTable">
	<thead>
	<tr>
		<th>Name</th>
		<th>DataPoints</th>
		<th>Wrestlers</th>
		<th>Last Update</th>
		<th></th>
	</tr>
	</thead>
	<tbody>
	{
	props.scmatTeams.length == 0 ?
	<tr>
		<td colSpan="4" className="emptyTable">No SC Mat Teams Linked</td>
	</tr>
	:

	props.scmatTeams.map((team, teamIndex) =>
	<tr key={teamIndex}>
		<td>{ team.name }</td>
		<td className="dataColumn">{ team.rankings.length }</td>
		<td className="dataColumn">{ team.wrestlers.length }</td>
		<td>
			{
			team.rankings.map(ranking => new Date(ranking.date))
				.sort((dateA, dateB) => dateB - dateA)
				.map(date => date.toLocaleDateString())
				.find(() => true) 
			}
		</td>
		<td>
			<button aria-label="Remove Flo Team" onClick={ () => props.unlinkSCMat(team.id) }>
				{/* trash */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"></path></svg>
			</button>
		</td>
	</tr>
	)
	}
	</tbody>
	</table>
</div>

<div className="panel">
	<h3>Flo External</h3>

	<div className="dataGrid">
		<div>{ props.floTeams.length } teams linked</div>
		<div>{ props.floTeams.flatMap(team => team.wrestlers ).length } wrestlers</div>
		<div>{ props.floTeams.flatMap(team => team.events ).length } events</div>
	</div>

	<table className="sectionTable">
	<thead>
	<tr>
		<th>Name</th>
		<th>Wrestlers</th>
		<th>Events</th>
		<th></th>
	</tr>
	</thead>
	<tbody>
	{
	props.floTeams.length == 0 ?
	<tr>
		<td colSpan="4" className="emptyTable">No Flo Teams Linked</td>
	</tr>
	:

	props.floTeams.map((team, teamIndex) =>
	<tr key={teamIndex}>
		<td>{ team.name }</td>
		<td className="dataColumn">{ team.wrestlers.length }</td>
		<td className="dataColumn">{ team.events.length }</td>
		<td>
			<button aria-label="Remove Flo Team" onClick={ () => props.unlinkFlo(team.id) }>
				{/* trash */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"></path></svg>
			</button>
		</td>
	</tr>
	)
	}
	</tbody>
	</table>
</div>

<div className="panel actionBar filter">
	<div className="panelContent">
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
				External
				<select aria-label="Select External" value={ externalSite } onChange={ event => setExternalSite(event.target.value) }>
					<option value="flo">Flo</option>
					<option value="scmat">SC Mat</option>
				</select>
			</label>

			<label>
				<span>Search</span>
				<input type="text" aria-label="Search Teams" value={ searchText } onChange={ event => setSearchText(event.target.value) } />
			</label>

		</div>
	</div>

	<div className={`panelActionBar filterContent ${ isFilterExpanded ? "active" : "" }`}>
		<button aria-label="Search" onClick={ () => search() } disabled={ !searchText || searchText.length < 3 }>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>
			Search
		</button>
	</div>

</div>

{
isSearching ?

<div className="panelLoading">
	<img src="/media/wrestlingloading.gif" />
</div>

: floTeams.length > 0 ?

floTeams.map(team => 
<div key={team.id} data-testid={ team.id } className="panel actionBar">
	<div className="panelContent">
		<h3>{ team.name }</h3>

		<div className="sectionHeading">Wrestlers</div>

		<div className="tableContainer">
			<table className="sectionTable">
			<thead>
			<tr>
				<th>Name</th>
				<th>First Event</th>
				<th>Last Event</th>
				<th>Events</th>
			</tr>
			</thead>
			<tbody>
			{
			team.wrestlers.length == 0 ?
				<tr>
					<td colSpan="4" className="emptyTable">No Wrestlers</td>
				</tr>
			:

			team.wrestlers
			.sort((wrestlerA, wrestlerB) => 
				wrestlerA.lastEvent && wrestlerB.lastEvent && +wrestlerA.lastEvent.date != +wrestlerB.lastEvent.date ? +wrestlerB.lastEvent.date - +wrestlerA.lastEvent.date
				: wrestlerA.eventCount != wrestlerB.eventCount ? wrestlerB.eventCount - wrestlerA.eventCount
				: wrestlerA.name > wrestlerB.name ? 1 : -1
			)
			.map((wrestler, wrestlerIndex) => 
				<tr key={wrestlerIndex}>
					<td>{ wrestler.name }</td>
					<td>
						{ wrestler.firstEvent ? wrestler.firstEvent.name + " (" + wrestler.firstEvent.date.toLocaleDateString() + ")" : "" }
					</td>
					<td>
						{ wrestler.lastEvent ? wrestler.lastEvent.name + " (" + wrestler.lastEvent.date.toLocaleDateString() + ")" : "" }
					</td>
					<td className="dataColumn">{ wrestler.eventCount }</td>
				</tr>
			)
			}
			</tbody>
			</table>
		</div>

		<div className="sectionHeading">Events</div>
		
		<div className="tableContainer">
			<table className="sectionTable">
			<thead>
			<tr>
				<th>Date</th>
				<th>Name</th>
			</tr>
			</thead>
			<tbody>
			{
			team.events.length == 0 ?
				<tr>
					<td colSpan="2" className="emptyTable">No Events</td>
				</tr>
			:

			team.events
			.sort((eventA, eventB) => +eventB.date - +eventA.date)
			.map((event, eventIndex) =>
				<tr key={eventIndex}>
					<td>{ event.date ? event.date.toLocaleDateString() : "" }</td>
					<td>{ event.name }</td>
				</tr>
			)

			}
			</tbody>
			</table>
		</div>
		
	</div>

	<div className="panelActionBar">
		<button aria-label="Search" onClick={ () => linkFlo(team.id) }>
			{/* Link */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M432.307-298.463H281.539q-75.338 0-128.438-53.093-53.1-53.093-53.1-128.422t53.1-128.444q53.1-53.115 128.438-53.115h150.768v59.998H281.539q-50.385 0-85.962 35.577Q160-530.385 160-480q0 50.385 35.577 85.962 35.577 35.577 85.962 35.577h150.768v59.998ZM330.001-450.001v-59.998h299.998v59.998H330.001Zm197.692 151.538v-59.998h150.768q50.385 0 85.962-35.577Q800-429.615 800-480q0-50.385-35.577-85.962-35.577-35.577-85.962-35.577H527.693v-59.998h150.768q75.338 0 128.438 53.093 53.1 53.093 53.1 128.422t-53.1 128.444q-53.1 53.115-128.438 53.115H527.693Z"></path></svg>
			Link
		</button>
	</div>

</div>
)

: scmatTeams.length > 0 ?

scmatTeams
.sort((teamA, teamB) => teamA.name > teamB.name ? 1 : -1)
.map((team, teamIndex) =>

<div key={teamIndex} className="panel actionBar">
	<div className="panelContent">
		<h3>{ team.name }</h3>

		<table className="sectionTable">
		<thead>
		<tr>
			<th>Last Update</th>
			<th>Last Rank</th>
			<th>Ranked Wrestlers</th>
		</tr>
		</thead>
		<tbody>
		<tr>
			<td>{ team.lastUpdate.toLocaleDateString() }</td>
			<td className="dataColumn">{ team.lastRanking }</td>
			<td className="dataColumn">{ team.wrestlerCount }</td>
		</tr>
		</tbody>
		</table>
		
	</div>

	<div className="panelActionBar">
		<button aria-label="Search" onClick={ () => linkSCMat(team.id) }>
			{/* Link */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M432.307-298.463H281.539q-75.338 0-128.438-53.093-53.1-53.093-53.1-128.422t53.1-128.444q53.1-53.115 128.438-53.115h150.768v59.998H281.539q-50.385 0-85.962 35.577Q160-530.385 160-480q0 50.385 35.577 85.962 35.577 35.577 85.962 35.577h150.768v59.998ZM330.001-450.001v-59.998h299.998v59.998H330.001Zm197.692 151.538v-59.998h150.768q50.385 0 85.962-35.577Q800-429.615 800-480q0-50.385-35.577-85.962-35.577-35.577-85.962-35.577H527.693v-59.998h150.768q75.338 0 128.438 53.093 53.1 53.093 53.1 128.422t-53.1 128.444q-53.1 53.115-128.438 53.115H527.693Z"></path></svg>
			Link
		</button>
	</div>
</div>

)

: ""

}

</>
	)
}

export default TeamLink;
