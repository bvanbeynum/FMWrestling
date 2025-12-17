import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/opponentevent.css";

const Match = ({ match, showRound }) => {
	return (
		<tr>
			{showRound && <td>{match.round}</td>}
			<td>{match.vs} ({match.vsTeam})</td>
			<td><span className={match.isWinner ? 'win' : 'loss'}>{match.isWinner ? 'Win' : 'Loss'}</span> • {match.winType}</td>
		</tr>
	);
};

const Wrestler = ({ wrestler }) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const sortedMatches = wrestler.matches.sort((a, b) => a.sort - b.sort);

	const wins = wrestler.matches.filter(match => match.isWinner).length;
	const losses = wrestler.matches.length - wins;
	const winPercentage = wrestler.matches.length > 0 ? ((wins / wrestler.matches.length) * 100).toFixed(0) : 0;

	const showRound = wrestler.matches.some(match => match.round && match.round.length > 0);

	return (
		<div className="wrestler-item">
			<div className="wrestler-header" onClick={() => setIsExpanded(!isExpanded)}>
				<div>
					<div>{wrestler.weightClass} &bull; {wrestler.name}</div>
					<div className="wrestler-stats">{wins}-{losses} ({winPercentage}%)</div>
				</div>
				<span>{isExpanded ? '[-]' : '[+]'}</span>
			</div>
			{isExpanded && (
				<div className="matches-container inlay">
					<table className="sectionTable">
						<thead>
							<tr>
								{showRound && <th>Round</th>}
								<th>Opponent</th>
								<th>Result</th>
							</tr>
						</thead>
						<tbody>
							{sortedMatches.map((match, index) => (
								<Match key={index} match={match} showRound={showRound} />
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

const EventPanel = ({ event }) => {
	const wrestlersByDivision = event.wrestlers.reduce((acc, wrestler) => {
		const { division } = wrestler;
		if (!acc[division]) {
			acc[division] = [];
		}
		acc[division].push(wrestler);
		return acc;
	}, {});

	const sortedDivisions = Object.keys(wrestlersByDivision).sort();

	return (
		<div className="panel expandable">
			<div className="eventHeader">
				<div>{event.name}</div>
			</div>
			<div className="subHeading" style={{ textAlign: 'center' }}>{new Date(event.date).toLocaleDateString()}</div>
			<div className="panelContent">
				{sortedDivisions.map(division => (
					<div key={division}>
						{sortedDivisions.length > 1 && <h4 className="division-header">{division}</h4>}
						{wrestlersByDivision[division]
							.sort((a, b) => parseInt(a.weightClass) - parseInt(b.weightClass))
							.map(wrestler => (
								<Wrestler key={wrestler.id} wrestler={wrestler} />
							))}
					</div>
				))}
			</div>
		</div>
	);
};

const OpponentEvent = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ opponentSelect, setOpponentSelect ] = useState([]);
	const [ opponents, setOpponents ] = useState([]);
	const [ selectedOpponent, setSelectedOpponent ] = useState("");
	const [ selectedOpponentId, setSelectedOpponentId ] = useState("");

	const [ events, setEvents ] = useState([]);

	useEffect(() => {
		if (!pageActive) {

			fetch(`/api/opponenteventload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {

					setOpponents(data.schools);

					const selectGroup = [...new Set(data.schools.sort((schoolA, schoolB) => 
						schoolA.classification != schoolB.classification ?
							schoolA.classification > schoolB.classification ? -1 : 1
						: schoolA.region != schoolB.region ?
							schoolA.region > schoolB.region ? 1 : -1
						: schoolA.name > schoolB.name ?
							1 : -1
						).map(school => `${school.classification || "NA"} - ${school.region || "NA"}`))]
						.map(group => ({
							name: group,
							schools: data.schools
								.filter(school => `${school.classification || "NA"} - ${school.region || "NA"}` == group)
								.sort()
						}));
					setOpponentSelect(selectGroup);

					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const selectOpponent = opponentId => {
		const opponent = opponents.find(opponent => opponent.id == opponentId);
		setIsLoading(true);
		setSelectedOpponent(opponent);
		setSelectedOpponentId(opponent.id);
		
		fetch(`/api/opponenteventselect?opponent=${ opponent.id }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setEvents(data.events);
				setIsLoading(false);
			})
			.catch(error => {
				console.warn(error);
			});
	};

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		
		{
		isLoading ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("teamManage") ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>Events</h1>
				
				{
				selectedOpponent ?
				<h1 className="subTitle">{ selectedOpponent.name }</h1>
				: "" }
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
						Opponent
						<select value={ selectedOpponentId } onChange={ event => selectOpponent(event.target.value) }>
							<option value="">-- Select Opponent --</option>
							{
							opponentSelect.map((group, groupIndex) => 
								<optgroup key={ groupIndex } label={ group.name }>
									{
									group.schools.map((school, schoolIndex) => 
										<option key={ schoolIndex } value={ school.id }>{ school.name }</option>
									)}
								</optgroup>
							)
							}
						</select>
					</label>
				</div>
			</div>

			{
			events.map((event, eventIndex) => <EventPanel key={eventIndex} event={event} />)
			}

		</div>

		}

	</div>

</div>

	);

}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<OpponentEvent />);
export default OpponentEvent;
