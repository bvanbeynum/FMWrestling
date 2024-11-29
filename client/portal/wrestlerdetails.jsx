import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

const WrestlerDetails = props => {

	const [ isLoading, setIsLoading ] = useState(true);
	const [ errorMessage, setErrorMessage ] = useState("");
	const [ wrestler, setWrestler ] = useState(null);
	const [ selectedEvent, setSelectedEvent ] = useState(null);
	const [ maxZoom, setMaxZoom ] = useState(400);
	const [ currentZoom, setCurrentZoom ] = useState(100);

	const panelRef = useRef();
	const svgRef = useRef();

	useEffect(() => {
		if (panelRef.current) {
			panelRef.current.scrollIntoView({ behavior: "smooth" });
		}

		if (props.wrestler && props.wrestler.sqlId) {
			setWrestler(props.wrestler);
			setIsLoading(false);
		}
		else if (props.wrestlerId) {
			setIsLoading(true);

			fetch(`/api/externalwrestlerdetails?id=${ props.wrestlerId }&hometeam=${ props.homeTeam || "" }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					const updatedWrestler = {
						...data.wrestler,
						weightClasses: data.wrestler.weightClasses?.map(weightClass => ({...weightClass, lastDate: new Date(weightClass.lastDate) })),
						events: data.wrestler.events?.map(event => ({
							...event, 
							date: new Date(event.date),
							wins: event.matches?.filter(match => match.isWinner && match.vs).length,
							losses: event.matches?.filter(match => !match.isWinner && match.vs).length,
							place: event.matches?.some(match => match.winType && /^finals$/i.test(match.round) && match.isWinner) ? "1st"
								: event.matches?.some(match => match.winType && /^finals$/i.test(match.round) && !match.isWinner) ? "2nd"
								: event.matches?.some(match => match.winType && /^3rd place$/i.test(match.round) && match.isWinner) ? "3rd"
								: event.matches?.some(match => match.winType && /^3rd place$/i.test(match.round) && !match.isWinner) ? "4th"
								: "—"
						})),
						matches: data.wrestler.matches.map(match => ({
							...match, 
							date: new Date(match.date),
							vs: match.winnerSqlId == data.wrestler.sqlId ? { sqlId: match.loserSqlId, name: match.loser, team: match.loserTeam } : { sqlId: match.winnerSqlId, name: match.winner, team: match.winnerTeam },
							isWinner: match.winnerSqlId == data.wrestler.sqlId
						}))
					};

					setWrestler(updatedWrestler);
					props.updateWrestler(updatedWrestler);

					const relationships = [...new Set(updatedWrestler.matches.map(match => match.vs.sqlId))]
							.map(group => 
								updatedWrestler.matches
									.filter(match => match.vs.sqlId == group)
									.sort((matchA, matchB) => +matchB.date - +matchA.date)
									.map(match => ({
										source: updatedWrestler.sqlId,
										target: match.vs.sqlId,
										vs: match.vs.name,
										shade: (((Date.now() - match.date) / 1000 / 60 / 60 / 24 / 365) * 255) / 2
									}))
									.find(() => true)
							)
							.sort((opponentA, opponentB) => opponentA.age - opponentB.age),

						nodes = relationships.map(relationship => ({ id: relationship.target, name: relationship.vs })).concat([{ id: updatedWrestler.sqlId, name: updatedWrestler.name }]);
					
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
				})
				.catch(error => {
					console.warn(error);
					setIsLoading(false);
					setErrorMessage("There was an error loading the wrestler details");
				});
		}

	}, [ props.wrestlerId ])

	return (

<div className="panel actionBar" ref={ panelRef }>
	<div className="panelContent">

		<h3>
			{ wrestler ? wrestler.name : props.wrestlerName }
		</h3>

		{
		isLoading ?
		<div className="panelLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: errorMessage ?
			<div className="panelError">{ errorMessage }</div>
		:
		<>

		{
		wrestler.gRating ?
		<div className="sectionHeading">{ wrestler.gRating.toFixed(2) } • { wrestler.gDeviation.toFixed(2) }</div>
		: ""
		}

		<div className="sectionHeading">Weight Classes</div>
		<div className="tableContainer">
			<table className="sectionTable">
			<thead>
			<tr>
				<th>Weight</th>
				<th>Last Date</th>
				<th>Last Event</th>
			</tr>
			</thead>
			<tbody>
			{
			wrestler.weightClasses
			.sort((weightClassA, weightClassB) => +weightClassB.lastDate - +weightClassA.lastDate)
			.map((weightClass, weightClassIndex) =>
			<tr key={weightClassIndex}>
				<td>{ weightClass.weightClass }</td>
				<td>{ weightClass.lastDate.toLocaleDateString() }</td>
				<td>{ weightClass.lastEvent }</td>
			</tr>
			)}
			</tbody>
			</table>
		</div>

		<div className="sectionHeading">Events</div>
		<div className="tableContainer">
			<table className="sectionTable">
			<thead>
			<tr>
				<th>Date</th>
				<th>Event</th>
				<th>W</th>
				<th>L</th>
				<th>Pl</th>
			</tr>
			</thead>
			<tbody>
			{
			wrestler.events.length === 0 ?
			<tr>
				<td colSpan="5" className="emptyTable">No Events Found</td>
			</tr>

			:
			wrestler.events
			.sort((eventA, eventB) => +eventB.date - +eventA.date )
			.map((event, eventIndex) =>
			<tr key={eventIndex} onClick={ () => setSelectedEvent(event) }>
				<td>{ event.date.toLocaleDateString() }</td>
				<td>{ event.name }</td>
				<td>{ event.wins }</td>
				<td>{ event.losses }</td>
				<td>{ event.place }</td>
			</tr>
			)
			}
			</tbody>
			</table>
		</div>

		{
		selectedEvent ?
		<>
		<div className="sectionHeading">{ selectedEvent.name }</div>
		<div className="tableContainer">
			<table className="sectionTable">
			<thead>
			<tr>
				<th>Round</th>
				<th>Opponent</th>
				<th>Result</th>
			</tr>
			</thead>
			<tbody>
			{
			selectedEvent.matches
			.sort((matchA,matchB) => matchB.sort - matchA.sort)
			.map((match, matchIndex) =>
			<tr key={matchIndex}>
				<td>{ match.round }</td>
				<td>{ match.isWinner ? "Beat " : "Lost to " } { match.vs }</td>
				<td>{ match.winType }</td>
			</tr>
			)}
			</tbody>
			</table>
		</div>
		</>
		: "" }

		{
		wrestler.tree && wrestler.tree.length > 0 ?
		<>
		<div className="sectionHeading">vs { props.homeTeam }</div>
		
		<div className="tableContainer">
			<table className="sectionTable">
			<tbody>
			{
			wrestler.tree
			.map((treeDetails, treeIndex) =>
			<tr key={treeIndex}>
				<td className="predata">{ treeDetails }</td>
			</tr>
			)}
			</tbody>
			</table>
		</div>
		</>
		: ""}

		</>
		}

		<div className="sectionHeading">Wrestling Network</div>

		<div className="network">
			<svg ref={ svgRef } viewBox="0 0 1000 1000" style={{ height: `${ currentZoom }%`, width: `${ currentZoom }%` }}></svg>
		</div>

		<div>
			<input type="range" min="100" max={ maxZoom } value={ currentZoom } onChange={ event => setCurrentZoom(event.target.value) } step="1" />
		</div>

	</div>

	<div className="panelActionBar">

		<button aria-label="Close User" onClick={ () => props.closeWrestler(props.wrestlerId) }>
			{/* Close */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"></path></svg>
			<div>close</div>
		</button>

		{
		props.addCompare ?

		<button aria-label="Close User" disabled={ !wrestler || !wrestler.sqlId || !wrestler.gRating || !wrestler.gDeviation } onClick={ () => props.addCompare(wrestler) }>
			{/* Compare */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M420.001-55.386V-140H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h207.692v-84.615H480v849.228h-59.999ZM200-240h220.001v-263.848L200-240Zm360 99.999V-480l200 240v-507.691q0-4.616-3.846-8.463-3.847-3.846-8.463-3.846H560v-59.999h187.691q30.308 0 51.308 21t21 51.308v535.382q0 30.308-21 51.308t-51.308 21H560Z"></path></svg>

			<div>
				{ props.isCompare ? "remove" : "compare" }
			</div>
		</button>

		: "" }

	</div>
</div>

	)

};

export default WrestlerDetails;
