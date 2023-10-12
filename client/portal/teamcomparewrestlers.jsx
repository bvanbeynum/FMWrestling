import React, { useEffect, useState } from "react";
import "./include/team.css";

const TeamCompareWrestlers = props => {

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(false);
	const [ selectedDivision, setSelectedDivision ] = useState("");
	const [ selectedWrestlers, setSelectedWrestlers ] = useState([]);

	const [ divisions, setDivisions ] = useState([]);
	const [ opponentWrestlers, setOpponentWrestlers ] = useState([]);
	const [ weightClasses, setWeightClasses ] = useState([]);
	
	useEffect(() => {
		if (props.selectedOpponentId && props.teamId) {
			setIsLoading(true);

			fetch(`/api/teamgetcomparewrestlers?teamid=${ props.teamId }&opponentscmatid=${ props.selectedOpponentId }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					const newOpponents = data.wrestlers.map(wrestler => ({
						...wrestler,
						weightClasses: wrestler.weightClasses.map(weightClass => ({
							...weightClass,
							lastDate: new Date(weightClass.lastDate)
						}))
					}));

					const wrestlerWeights = newOpponents.flatMap(wrestler => wrestler.weightClasses.map(wrestlerWeight => ({
						wrestlerId: wrestler.id,
						wrestlerName: wrestler.name,
						...wrestlerWeight
					})));

					const newDivisions = [...new Set(wrestlerWeights.map(weight => weight.division.trim()))];
					const newSelectedDivision = selectedDivision && newDivisions.includes(selectedDivision) ? selectedDivision 
						: newDivisions
							.sort((divisionA, divisionB) => /varsity/i.test(divisionA) ? -1 : /varsity/i.test(divisionB) ? 1 : divisionA > divisionB ? 1 : -1)
							.find(() => true);
					
					const newWeightClasses = [...new Set(wrestlerWeights.map(weightClass => weightClass.division + "|" + weightClass.weightClass))]
						.map(group => ({ division: group.split("|")[0], name: group.split("|")[1] }))
						.sort((weightA, weightB) => 
							!isNaN(weightA.name) && !isNaN(weightB.name) ? +weightA.name - +weightB.name
							: !isNaN(weightA.name) && isNaN(weightB.name) ? -1
							: isNaN(weightA.name) && !isNaN(weightB.name) ? 1
							: weightA.name > weightB.name ? 1 : -1
						)
						.map(weightClass => ({
							division: weightClass.division,
							name: weightClass.name,
							wrestlers: wrestlerWeights
								.filter(wrestlerWeight => wrestlerWeight.weightClass == weightClass.name)
								.sort((wrestlerA, wrestlerB) => +wrestlerB.lastDate - +wrestlerA.lastDate)
						}));

					setDivisions(newDivisions);
					setSelectedDivision(newSelectedDivision);
					setWeightClasses(newWeightClasses);
					setOpponentWrestlers(newOpponents);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, [ props.selectedOpponentId, props.teamId ]);

	const selectDivision = newDivision => {
		setSelectedWrestlers([]);
		setSelectedDivision(newDivision);
	};

	return (
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
			Opponent
			<select value={ props.selectedOpponentId } onChange={ event => props.setSelectedOpponentId(event.target.value) }>
				{
				props.opponents
					.sort((opponentA, opponentB) => opponentA.name > opponentB.name ? 1 : -1)
					.map((opponent, opponentIndex) =>
				<option key={opponentIndex} value={ opponent.id }>{ opponent.name }</option>
				)
				}
			</select>
		</label>
		
		<label>
			Division
			<select value={ selectedDivision } onChange={ event => selectDivision(event.target.value) }>
				{
				divisions
				.sort((divisionA, divisionB) => divisionA > divisionB ? 1 : -1)
				.map((division, divisionIndex) =>
				<option key={divisionIndex}>{ division }</option>
				)
				}
			</select>
		</label>
	</div>

</div>

{
isLoading ?

<div className="panel">
	<div className="panelLoading">
		<img src="/media/wrestlingloading.gif" />
	</div>
</div>

: 
<>

<div className="panel expandable">
	<h3>Depth Chart</h3>

	<table className="sectionTable">
	<thead>
	<tr>
		<th>Weight</th>
		<th className="dataColumn">Wrestlers</th>
	</tr>
	</thead>
	<tbody>
	{
	weightClasses
	.filter(weightClass => weightClass.division == selectedDivision)
	.map((weightClass, weightClassIndex) => 
	<tr key={ weightClassIndex }>
		<td>{ weightClass.name }</td>
		<td className="sectionList">
		{
			weightClass.wrestlers
			.sort((wrestlerA, wrestlerB) => +wrestlerB.lastDate - +wrestlerA.lastDate)
			.map((wrestler, wrestlerIndex) =>

			<div key={wrestlerIndex} className="pill">
				<button aria-label="Select Wrestler" onClick={ () => { if (!selectedWrestlers.some(selected => selected.id == wrestler.wrestlerId)) { setSelectedWrestlers(selectedWrestlers.concat(opponentWrestlers.find(opponent => opponent.id == wrestler.wrestlerId))) } } }>
					{ wrestler.wrestlerName }
				</button>
			</div>

			)
		}
		</td>
	</tr>
	)
	}
	</tbody>
	</table>
</div>

{
selectedWrestlers.map((wrestler, wrestlerIndex) =>

<div key={wrestlerIndex} className="panel">
	<h3>
		{ wrestler.name }
		<button aria-label="Remove User" onClick={ () => setSelectedWrestlers(selectedWrestlers.filter(selected => selected.id != wrestler.id)) }>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"></path></svg>
		</button>
	</h3>

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

)}

</>
}

</>
	)		
};

export default TeamCompareWrestlers;
