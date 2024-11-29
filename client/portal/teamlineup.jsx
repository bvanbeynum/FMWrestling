import React, { useState, useEffect } from "react";

const TeamLineup = props => {

	const [ weightClasses, setWeightClasses ] = useState([]);
	const [ selectedWeightClass, setSelectedWeightClass ] = useState("");
	const [ allWrestlers, setAllWrestlers ] = useState([]);
	const [ selectedOpponentWeight, setSelectedOpponentWeight ] = useState("")

	useEffect(() => {
		if (props.weightClasses) {
			const updatedWeights = props.weightClasses.map(weightClass => ({
				...weightClass,
				opponentWrestlers: weightClass.opponentWrestlers.map(wrestler => ({
						...wrestler,
						division: /(hs|high school|high|varsity)/i.test(wrestler.division) ? "V"
						: /(jv|junior varsity)/i.test(wrestler.division) ? "JV"
						: /(ms|middle school)/i.test(wrestler.division) ? "MS"
						: "-"
					}))
					.sort((wrestlerA, wrestlerB) => 
						wrestlerA.division != wrestlerB.division ?
							/^v/i.test(wrestlerA.division) ? -1 
							: /^v/i.test(wrestlerB.division) ? 1 
							: /jv/i.test(wrestlerA.division) ? -1
							: /jv/i.test(wrestlerB.division) ? 1
							: /ms/i.test(wrestlerA.division) ? -1
							: /ms/i.test(wrestlerB.division) ? 1
							: -1
						: +wrestlerA.weightClass < +wrestlerB.weightClass ? -1
						: +wrestlerA.weightClass > +wrestlerB.weightClass ? 1
						: +wrestlerA.lastDate > +wrestlerB.lastDate ? -1
						: +wrestlerA.lastDate < +wrestlerB.lastDate ? 1
						: wrestlerA.name > wrestlerB.name ? -1
						: 1
					)
			}));

			const wrestlers = updatedWeights.flatMap(weightClass => weightClass.opponentWrestlers)	
				.sort((wrestlerA, wrestlerB) => 
					wrestlerA.division != wrestlerB.division ?
						/^v/i.test(wrestlerA.division) ? -1 
						: /^v/i.test(wrestlerB.division) ? 1 
						: /jv/i.test(wrestlerA.division) ? -1
						: /jv/i.test(wrestlerB.division) ? 1
						: /ms/i.test(wrestlerA.division) ? -1
						: /ms/i.test(wrestlerB.division) ? 1
						: -1
					: +wrestlerA.weightClass < +wrestlerB.weightClass ? -1
					: +wrestlerA.weightClass > +wrestlerB.weightClass ? 1
					: +wrestlerA.lastDate > +wrestlerB.lastDate ? -1
					: +wrestlerA.lastDate < +wrestlerB.lastDate ? 1
					: wrestlerA.name > wrestlerB.name ? -1
					: 1
				);
			
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
	.map((weightClass, weightClassIndex) =>
	
	<div key={weightClassIndex} className="weightContainer">

		<div className="weightHeader button" onClick={ () => changeSelectedWeightClass(weightClass.name) }>

			<div className="subTitle">{ weightClass.name }&nbsp;</div>
			<div>
			{
			weightClass.opponentWrestler ?
				`	• ${weightClass.opponentWrestler.name}`
			: ""
			}
			</div>
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
			.map(wrestler => 
			
			<div key={wrestler.id} className={`selectWrestlerItem ${ wrestler.division }`} onClick={ () => { props.saveWrestler(weightClass.name, false, wrestler); setSelectedWeightClass(""); } }>
				<div className="selectWrestlerDivision">{ wrestler.division }</div>

				<div className="selectedWrestlerContainer">
					<div>{ wrestler.name }</div>
					<div>
						{ wrestler.wins ? wrestler.wins + " - " + wrestler.losses + " (" + (wrestler.wins / (wrestler.wins + wrestler.losses)).toFixed(3) + ")" : "" }
					</div>
					<div>{ (wrestler.lastDate ? wrestler.lastDate.toLocaleDateString() + ": ": "") + wrestler.lastEvent.event }</div>
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
