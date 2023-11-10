import React, { useEffect, useState, useRef } from "react";

const WrestlerDetails = props => {

	const [ isLoading, setIsLoading ] = useState(true);
	const [ errorMessage, setErrorMessage ] = useState("");
	const [ wrestler, setWrestler ] = useState(null);

	const panelRef = useRef();

	useEffect(() => {
		if (panelRef.current) {
			panelRef.current.scrollIntoView({ behavior: "smooth" });
		}

		if (props.wrestlerId) {
			setIsLoading(true);

			fetch(`/api/externalwrestlerdetails?id=${ props.wrestlerId }&hometeam=${ props.homeTeam }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					
					setWrestler({
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
						}))
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

<div className="panel" ref={ panelRef }>

	<h3>
		{ wrestler ? wrestler.name : props.wrestlerName }
		<button aria-label="Remove User" onClick={ () => props.closeWrestler(props.wrestlerId) }>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"></path></svg>
		</button>
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

	<div className="sectionHeading">Weight Classes</div>
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
	.sort((weightClassA, weightClassB) => +weightClassA.lastDate - +weightClassB.lastDate)
	.map((weightClass, weightClassIndex) =>
	<tr key={weightClassIndex}>
		<td>{ weightClass.weightClass }</td>
		<td>{ weightClass.lastDate.toLocaleDateString() }</td>
		<td>{ weightClass.lastEvent }</td>
	</tr>
	)}
	</tbody>
	</table>

	<div className="sectionHeading">Flo Events</div>
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
	.sort((eventA, eventB) => +eventA.date - +eventB.date )
	.map((event, eventIndex) =>
	<tr key={eventIndex}>
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
</div>

	)

};

export default WrestlerDetails;
