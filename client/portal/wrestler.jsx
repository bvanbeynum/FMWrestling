import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./include/index.css";
import "./include/wrestler.css";
import * as d3 from "d3";

const WrestlerComponent = props => {

	const [ isLoading, setIsLoading ] = useState(false);
	const [ wrestler, setWrestler ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ selectedEvent, setSelectedEvent ] = useState(null);

	const svgRef = useRef();

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
							place: event.matches?.some(match => match.winType && /^finals$/i.test(match.round) && match.isWinner) ? "1st"
								: event.matches?.some(match => match.winType && /^finals$/i.test(match.round) && !match.isWinner) ? "2nd"
								: event.matches?.some(match => match.winType && /^3rd place$/i.test(match.round) && match.isWinner) ? "3rd"
								: event.matches?.some(match => match.winType && /^3rd place$/i.test(match.round) && !match.isWinner) ? "4th"
								: ""
						}))
					};
					console.log(wrestlerData);
					setWrestler(wrestlerData);

					const matchesData = wrestlerData.events.flatMap(event => event.matches.map(match => ({
						date: new Date(match.date),
						sqlId: match.winnerSqlId == data.wrestler.sqlId ? match.loserSqlId : match.winnerSqlId,
						vs: match.winnerSqlId == data.wrestler.sqlId ? match.loser : match.winner,
					})));

					const relationships = [...new Set(matchesData.map(match => match.sqlId))]
							.map(group => 
								matchesData
									.filter(match => match.sqlId == group)
									.sort((matchA, matchB) => +matchB.date - +matchA.date)
									.map(match => ({
										source: wrestlerData.sqlId,
										target: match.sqlId,
										vs: match.vs,
										shade: (((Date.now() - match.date) / 1000 / 60 / 60 / 24 / 365) * 255) / 2
									}))
									.find(() => true)
							)
							.sort((opponentA, opponentB) => opponentA.age - opponentB.age),

						nodes = relationships.map(relationship => ({ id: relationship.target, name: relationship.vs })).concat([{ id: wrestlerData.sqlId, name: wrestlerData.name }]);
					
					const svg = d3.select(svgRef.current);

					const lines = svg.selectAll("line")
						.data(relationships)
						.enter()
						.append("line")
						.attr("stroke", d => `rgb(${ d.shade } ${ d.shade } ${ d.shade })`);
					
					const nodeSVG = svg.selectAll(".node")
						.data(nodes)
						.enter()
						.append("g")
						.attr("class", "node")
						.each(function (parent) {
							const node = d3.select(this);
							
							const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
							textNode.appendChild(document.createTextNode(parent.name));
							console.log(textNode.getBBox())

							// const bBox = node
							// 	.append("text")
							// 	.text(d => d.name)
							// 	.node()
							// 	.getBBox();
							
							node.append("rect")
								.attr("width", 100) // Math.ceil(bBox.width) + 10
								.attr("height", 30)
								.attr("x", -5)
								.attr("y", -20)
								.attr("rx", "5");
							
							node.node().appendChild(textNode);
						});
					
					// nodeSVG.append("rect")
					// 	.attr("width", 100)
					// 	.attr("height", 30)
					// 	.attr("x", -5)
					// 	.attr("y", -20)
					// 	.attr("rx", "5");

					// nodeSVG.append("text")
					// 	.text(d => d.name);
					
					const simulation = d3.forceSimulation(nodes)
						.force("link", d3.forceLink(relationships).id(d => d.id))
						.force("collide", d3.forceCollide().radius(100))
						.force("charge", d3.forceManyBody().strength(-300))
						.force("center", d3.forceCenter(500, 500));
					
					simulation.on("tick", () => {
						lines.attr("x1", d => d.source.x)
							.attr("y1", d => d.source.y)
							.attr("x2", d => d.target.x)
							.attr("y2", d => d.target.y);
						
						nodeSVG.attr("transform", d => `translate(${d.x}, ${d.y})`);
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
				<td>{ event.name }</td>
				<td>{ (event.place ? event.place + " " : "") + event.wins + " - " + event.losses + " (" + (event.wins / (event.wins + event.losses)).toFixed(3) + ")" }</td>
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
			.sort((matchA,matchB) => matchB.sort - matchA.sort)
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

	</div>
</div>

}
</div>

	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<WrestlerComponent />);
export default WrestlerComponent;
