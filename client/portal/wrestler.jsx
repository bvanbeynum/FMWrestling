import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./include/index.css";
import "./include/wrestler.css";

const WrestlerComponent = props => {

	const [ isLoading, setIsLoading ] = useState(false);
	const [ wrestler, setWrestler ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ selectedEvent, setSelectedEvent ] = useState(null);
	const [ opponentChart, setOpponentChart ] = useState({ width: 0, height: 0 });
	const [ isOpponentLoading, setIsOpponentLoading ] = useState(false);
	const [ selectedOpponent, setSelectedOpponent ] = useState(null);

	const chartConstants = {
		padding: { left: 10, top: 15 },
		boxHeight: 40,
		boxWidth: 230,
		boxPadHeight: 20,
		boxPadWidth: 60,
		wrestlerRadius: 15
	};

	useEffect(() => {
		if (!isLoading && !wrestler) {
			setIsLoading(true);

			const url = new window.URLSearchParams(window.location.search);
			const wrestlerId = url.get("id");

			fetch(`/api/externalwrestlerdetails?id=${ wrestlerId }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					const wrestlerData = {
						...data.wrestler,
						events: data.wrestler.events?.map(event => ({
							...event, 
							date: new Date(event.date),
							division: /(hs|high school|high)/i.test(event.division) ? "Varsity"
								: /(jv|junior varsity)/i.test(event.division) ? "JV"
								: /(ms|middle school)/i.test(event.division) ? "MS"
								: (event.division || "").trim(),
							wins: event.matches?.filter(match => match.isWinner && match.vs).length,
							losses: event.matches?.filter(match => !match.isWinner && match.vs).length,
							place: event.matches?.some(match => match.winType && /^(finals|1st place)/i.test(match.round) && match.isWinner) ? "1st"
								: event.matches?.some(match => match.winType && /^(finals|1st place)/i.test(match.round) && !match.isWinner) ? "2nd"
								: event.matches?.some(match => match.winType && /^3rd place/i.test(match.round) && match.isWinner) ? "3rd"
								: event.matches?.some(match => match.winType && /^3rd place/i.test(match.round) && !match.isWinner) ? "4th"
								: ""
						}))
					};
					setWrestler(wrestlerData);

					const matches = wrestlerData.events.flatMap(event => event.matches.map(match => ({...match, eventDate: event.date }))),
						opponents = [...new Set(matches.map(match => match.vsSqlId))]
							.map(wrestlerId => 
								matches.filter(match => match.vsSqlId == wrestlerId)
									.reduce((output, current) => ({
										...output,
										id: current.vsId,
										name: current.vs,
										teams: [...new Set(output.teams.concat(current.vsTeam))].sort((teamA, teamB) => teamA > teamB ? 1 : -1),
										wins: output.wins + (current.isWinner ? 1 : 0),
										losses: output.losses + (current.isWinner ? 0 : 1),
										dates: output.dates.concat(current.eventDate),
										lastDate: !output.lastDate || +output.lastDate < current.eventDate ? current.eventDate : output.lastDate
									}), { sqlId: wrestlerId, wins: 0, losses: 0, teams: [], dates: [] })
							)
							.sort((opponentA, opponentB) => +opponentB.lastDate - +opponentA.lastDate);
					
					const tiers = [{
						x: chartConstants.boxPadWidth + chartConstants.padding.left + (chartConstants.wrestlerRadius * 2),
						originY: chartConstants.padding.top + chartConstants.wrestlerRadius,
						opponents: opponents.map((opponent, opponentIndex) => ({
							y: (opponentIndex * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top,
							record: opponent.wins + "-" + opponent.losses,
							name: opponent.name,
							teams: opponent.teams.join(", ").substring(0, 25),
							date: opponent.lastDate,
							id: opponent.id
						}))
					}];
					
					setOpponentChart({
						width: (1 * (chartConstants.boxPadWidth + chartConstants.boxWidth)) + chartConstants.padding.left + (chartConstants.wrestlerRadius * 2) + 30,
						height: tiers.reduce((height, tier) => height > (tier.opponents.length * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top ? height : (tier.opponents.length * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top, 0),
						tiers: tiers
					});
					
					setIsLoading(false);
					setLoggedInUser(data.loggedInUser);
				})
				.catch(error => {
					console.warn(error);
					setIsLoading(false);
					setErrorMessage("There was an error loading the wrestler details");
				});
		}
	}, []);

	const selectOpponent = (tierIndex, opponent) => {
		setIsOpponentLoading(true);

		fetch(`/api/externalwrestlerdetails?id=${ opponent.id }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				
				const tierPadding = chartConstants.boxPadWidth + chartConstants.padding.left + (chartConstants.wrestlerRadius * 2),
					tierWidth =(chartConstants.boxPadWidth + chartConstants.boxWidth),
					matches = data.wrestler.events.flatMap(event => event.matches.map(match => ({...match, eventDate: new Date(event.date) }))),
					opponents = [...new Set(matches.map(match => match.vsSqlId))]
						.map(wrestlerId => 
							matches.filter(match => match.vsSqlId == wrestlerId)
								.reduce((output, current) => ({
									...output,
									id: current.vsId,
									name: current.vs,
									teams: [...new Set(output.teams.concat(current.vsTeam))].sort((teamA, teamB) => teamA > teamB ? 1 : -1),
									wins: output.wins + (current.isWinner ? 1 : 0),
									losses: output.losses + (current.isWinner ? 0 : 1),
									dates: output.dates.concat(current.eventDate),
									lastDate: !output.lastDate || +output.lastDate < current.eventDate ? current.eventDate : output.lastDate
								}), { sqlId: wrestlerId, wins: 0, losses: 0, teams: [], dates: [] })
						)
						.sort((opponentA, opponentB) => +opponentB.lastDate - +opponentA.lastDate);
				
				const tiers = [
					...opponentChart.tiers.slice(0, tierIndex + 1),
					{
						x: tierPadding + ((tierIndex + 1) * tierWidth),
						originY: opponent.y + (chartConstants.boxHeight / 2),
						opponents: opponents.map((opponent, opponentIndex) => ({
							y: (opponentIndex * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top,
							record: opponent.wins + "-" + opponent.losses,
							name: opponent.name,
							teams: opponent.teams.join(", ").substring(0, 25),
							date: opponent.lastDate,
							id: opponent.id
						}))
					}
				];
				
				setOpponentChart({
					width: tierPadding + ((tierIndex + 2) * tierWidth),
					height: tiers.reduce((height, tier) => height > (tier.opponents.length * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top ? height : (tier.opponents.length * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top, 0),
					tiers: tiers
				});

				setSelectedOpponent(opponent.id);
				setIsOpponentLoading(false);
			})
			.catch(error => {
				console.warn(error);
				setIsLoading(false);
				setErrorMessage("There was an error loading the wrestler details");
			});
	};

	return (

<div>
		
{
isLoading || !wrestler ?

<div className="pageLoading">
	<img src="/media/wrestlingloading.gif" />
</div>

: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("wrestlerResearch") ?

<div className="noAccess">
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
	<a>Unauthorized</a>
</div>

:

<div className="container active">
	<header>
		<h1>Wrestler Details</h1>
		
		<h1 className="subTitle">
			{ wrestler.name }
		</h1>
	</header>
	
	<div className="panel expandable">
		<h3>
			Wrestling Timeline
		</h3>

		<div className="tableContainer">
			<table className="sectionTable wrestlerEvent">
			<thead>
			<tr>
				<th>Date</th>
				<th>State</th>
				<th>Event</th>
				<th>Restuls</th>
				<th>Team</th>
				<th>Division</th>
				<th>Weight</th>
			</tr>
			</thead>
			<tbody>
			{
			wrestler.events.length === 0 ?
			<tr>
				<td colSpan="6" className="emptyTable">No Events Found</td>
			</tr>

			:

			wrestler.events
			.sort((eventA, eventB) => +eventB.date - +eventA.date )
			.map((event, eventIndex) =>
			<tr key={eventIndex} onClick={ () => setSelectedEvent(event) } className={ selectedEvent?.sqlId == event.sqlId ? "selected" : "" }>
				<td>{ event.date.toLocaleDateString() }</td>
				<td>{ event.locationState }</td>
				<td>{ event.name }</td>
				<td>{ event.wins + " - " + event.losses + " (" + (event.wins / (event.wins + event.losses)).toFixed(3) + ")" + (event.place ? " " + event.place : "") }</td>
				<td>{ event.team }</td>
				<td>{ event.division }</td>
				<td>{ event.weightClass }</td>
			</tr>
			)
			}
			</tbody>
			</table>
		</div>

		<div className="sectionHeading">{ selectedEvent ? selectedEvent.name : "Select Event" }</div>
		<div className="tableContainer">
			<table className="sectionTable wrestlerMatches">
			<thead>
			<tr>
				<th>Round</th>
				<th>Match</th>
				<th>Result</th>
			</tr>
			</thead>
			<tbody>
			{
			selectedEvent ?

			selectedEvent.matches
			.sort((matchA,matchB) => matchA.sort - matchB.sort)
			.map((match, matchIndex) =>
			<tr key={matchIndex}>
				<td>{ match.round }</td>
				<td>
					{ match.isWinner ? "Beat " : "Lost to " } { match.vs } ({ match.vsTeam })

					{
					match.vsId ?
					<button onClick={ () => window.open(`/portal/wrestler.html?id=${ match.vsId }`, "_blank") }>
						{/* Eye View */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
					</button>
					: ""}
				</td>
				<td>{ match.winType }</td>
			</tr>
			)
			
			:
			
			<tr>
				<td colSpan="3" className="emptyTable">No Matches</td>
			</tr>

			}
			</tbody>
			</table>
		</div>

		<div className="sectionHeading">Opponents</div>

		<div className="opponentNetwork">
			{
			isOpponentLoading ?
			<div className="pageLoading">
				<img src="/media/wrestlingloading.gif" />
			</div>
			:

			<svg style={{ height: `${ opponentChart.height }px`, width: `${ opponentChart.width }px` }}>

				<circle className="wrestlerContainer" cx={ chartConstants.padding.left + chartConstants.wrestlerRadius } cy={ chartConstants.padding.top + chartConstants.wrestlerRadius } r={ chartConstants.wrestlerRadius } />
				<text className="wrestlerLetter" x={ chartConstants.padding.left + chartConstants.wrestlerRadius } y={ chartConstants.padding.top + chartConstants.wrestlerRadius  } r={ chartConstants.wrestlerRadius } textAnchor="middle" alignmentBaseline="middle">{ wrestler.name.substring(0, 1).toUpperCase() }</text>

				{
				opponentChart.tiers.map((tier, tierIndex) =>
				
				<g key={tierIndex} transform={`translate(${ tier.x })`}>

					{
					tier.opponents.map((opponent, opponentIndex) =>
					<g key={ opponentIndex }>
						<path d={ `M${ chartConstants.boxPadWidth * -1 } ${ tier.originY } C0 ${ tier.originY }, ${ chartConstants.boxPadWidth * -1 } ${ opponent.y + (chartConstants.boxHeight / 2) }, 0 ${ opponent.y + (chartConstants.boxHeight / 2) }` } />
						
						<g transform={`translate(0, ${ opponent.y })`}>
							<rect x="0" y="0" width={ chartConstants.boxWidth } height={ chartConstants.boxHeight } rx="5" className={`wrestlerContainer ${ selectedOpponent == opponent.id ? "selected" : "" }`} />

							<rect x="5" y="5" width="30" height={ chartConstants.boxHeight - 10 } rx="5" className="opponentRecordBox" />
							<text x="19" y={ chartConstants.boxHeight / 2 } className="record" textAnchor="middle" alignmentBaseline="middle">{ opponent.record }</text>

							<text x="40" y="5" alignmentBaseline="hanging">{ opponent.date ? opponent.date.toLocaleDateString() : "" }</text>
							<text x="40" y={ (chartConstants.boxHeight / 2) + 1 } alignmentBaseline="middle" className="opponentName"><title>{opponent.name}</title>{ opponent.name.length > 24 ? opponent.name.substring(0, 24) + "..." : opponent.name }</text>
							<text x="40" y={ chartConstants.boxHeight - 5 } alignmentBaseline="baseline">{ opponent.teams + (opponent.teams.length == 25 ? "..." : "") }</text>

							{
							opponent.id ?
							<>
							<rect x={ chartConstants.boxWidth - 30 } y={ (chartConstants.boxHeight / 2) - 12 } width="24" height="24" onClick={ () => window.open(`/portal/wrestler.html?id=${ opponent.id }`, "_blank") } className="networkIcon" />
							<svg x={ chartConstants.boxWidth - 30 } y={ (chartConstants.boxHeight / 2) - 12 } width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className="networkIcon"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
							
							{
							selectedOpponent != opponent.id ?
							<>
							<rect x={ chartConstants.boxWidth } y={ (chartConstants.boxHeight / 2) - 12 } width="24" height="24" onClick={ () => selectOpponent(tierIndex, opponent) } className="networkIcon" />
							<svg x={ chartConstants.boxWidth } y={ (chartConstants.boxHeight / 2) - 12 } width="24px" height="24px" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" className="networkIcon"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
							</>
							: ""
							}
							</>
							: "" }

						</g>
					</g>
					)
					}
				</g>

				)
				}

			</svg>

			}
		</div>

	</div>
</div>

}
</div>

	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<WrestlerComponent />);
export default WrestlerComponent;
