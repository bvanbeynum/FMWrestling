import React, { useState, useEffect } from "react";

const TeamLineup = props => {

	const [ weightClasses, setWeightClasses ] = useState([]);
	const [ selectedWeightClass, setSelectedWeightClass ] = useState("");
	const [ allWrestlers, setAllWrestlers ] = useState([]);
	const [ selectedOpponentWeight, setSelectedOpponentWeight ] = useState("")

	useEffect(() => {
		if (props.weightClasses) {

			const wrestlers = props.weightClasses.flatMap(weightClass => weightClass.opponentWrestlers.map(wrestler => ({
						...wrestler,
						weightClass: weightClass.name,
						division: /(hs|high school|high|varsity)/i.test(wrestler.division) ? "V"
						: /(jv|junior varsity)/i.test(wrestler.division) ? "JV"
						: /(ms|middle school)/i.test(wrestler.division) ? "MS"
						: "-"
					}))
				)
				.sort((wrestlerA, wrestlerB) => 
					+wrestlerA.weightClass < +wrestlerB.weightClass ? -1
					: +wrestlerA.weightClass > +wrestlerB.weightClass ? 1
					: wrestlerA.division != wrestlerB.division ?
						/^v/i.test(wrestlerA.division) ? -1 
						: /^v/i.test(wrestlerB.division) ? 1 
						: /jv/i.test(wrestlerA.division) ? -1
						: /jv/i.test(wrestlerB.division) ? 1
						: /ms/i.test(wrestlerA.division) ? -1
						: /ms/i.test(wrestlerB.division) ? 1
						: -1
					: +wrestlerA.lastDate > +wrestlerB.lastDate ? -1
					: +wrestlerA.lastDate < +wrestlerB.lastDate ? 1
					: wrestlerA.name > wrestlerB.name ? -1
					: 1
				);
			
			const updatedWeights = props.weightClasses
				.filter(weightClass => !isNaN(weightClass.name))
				.map(weightClass => ({
					...weightClass,
					opponentWrestlers: wrestlers.filter(wrestler => wrestler.weightClass == weightClass.name)
				}))
				.concat([{
					name: "All",
					opponentWrestlers: wrestlers
				}]);

			setWeightClasses(updatedWeights);
			
			setAllWrestlers(wrestlers);
			setSelectedOpponentWeight(updatedWeights.map(weightClass => weightClass.name).find(() => true));
		}
	}, [ props.weightClasses ]);

	const changeSelectedWeightClass = weightClass => {
		setSelectedOpponentWeight(weightClass);
		setSelectedWeightClass(weightClass == selectedWeightClass ? "" : weightClass);
	};

	return (

weightClasses.some(weightClass => weightClass.opponentWrestlers && weightClass.opponentWrestlers.length > 0) > 0 ?

<div className="panel expandable">

	{
	weightClasses
	.filter(weightClass => !isNaN(weightClass.name))
	.map((weightClass, weightClassIndex) =>
	
	<div key={weightClassIndex} className="weightContainer">

		<div className="weightHeader">

			<div className="subTitle">
				{ weightClass.name + (weightClass.opponentWrestler ? " • " + weightClass.opponentWrestler.name : "") }

				{
				weightClass.opponentWrestler ?
				<button onClick={ () => window.open(`/portal/wrestler.html?id=${ weightClass.opponentWrestler.id }`, "_blank") }>
					{/* Eye View */}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
				</button>
				: ""
				}
			</div>

			<button onClick={ () => changeSelectedWeightClass(weightClass.name) }>
				{/* pencil */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/></svg>
			</button>

		</div>
		
		{
		selectedWeightClass == weightClass.name ?

		<div className="overflowInset selectOpponentContainer">
			<div className="weightSidebar">
			{
				weightClasses.map((insetWeight, insetWeightIndex) =>				
				<div key={insetWeightIndex} onClick={ () => setSelectedOpponentWeight(insetWeight.name) } className={`${ selectedOpponentWeight == insetWeight.name ? "selected" : "" }`}>{insetWeight.name}</div>
				)
			}
			</div>

			<div className="weightContent">
			{
			weightClasses
			.filter(opponentWeight => opponentWeight.name == selectedOpponentWeight)
			.map(opponentWeight => opponentWeight.opponentWrestlers)
			.find(() => true)
			.map((wrestler, wrestlerIndex, allWrestlers) => 
			
			<div key={wrestler.id}>
			
			{
			isNaN(selectedOpponentWeight) && (wrestlerIndex == 0 || allWrestlers[wrestlerIndex - 1].weightClass != wrestler.weightClass) ?
			<div className="allWeightDivision">{ wrestler.weightClass }</div>
			: ""
			}
			
			<div className={`selectWrestlerItem ${ wrestlerIndex % 2 == 0 ? "alternate" : "" }`}>
				<div className="selectWrestlerDivision">{ wrestler.division }</div>

				<div className="selectedWrestlerContainer">
					<div>{ 
						wrestler.name +
						(wrestler.wins ? " • " + wrestler.wins + " - " + wrestler.losses + " (" + (wrestler.wins / (wrestler.wins + wrestler.losses)).toFixed(3) + ")" : "")
					}</div>
					<div>{ (wrestler.lastDate ? wrestler.lastDate.toLocaleDateString() + ": ": "") + wrestler.lastEvent.event }</div>
				</div>

				<div>
					<button onClick={ () => window.open(`/portal/wrestler.html?id=${ wrestler.id }`, "_blank") }>
						{/* Eye View */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
					</button>

					<button onClick={ () => { props.saveWrestler(weightClass.name, false, wrestler); setSelectedWeightClass(""); } }>
						{/* Check */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
					</button>
				</div>
			</div>

			</div>

			)
			}
			</div>

		</div>

		: ""
		}
	
	</div>

	)
	}

</div>

: ""

	);
}

export default TeamLineup;
