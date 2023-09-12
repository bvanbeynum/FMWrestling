import React, { useEffect, useState, useRef } from "react";
import "./include/index.css";

const FloBracket = props => {

	const paddingSize = { top: 20, left: 0, round: 40, box: 10, match: 30, textX: 10, winTextX: 18, path: 5 },
		boxSize = { height: 40, primarySection: 160, secondarySection: 50, wrestlerTextY: 18, teamTextY: 33, winY: 25 },
		matchSize = { height: (boxSize.height * 2) + paddingSize.box + paddingSize.match, width: paddingSize.round + boxSize.primarySection + boxSize.secondarySection };

	const filterRef = useRef();

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ selectedDivision, setSelectedDivision ] = useState("");
	const [ weightClasses, setWeightClasses ] = useState([]);
	const [ selectedWeight, setSelectedWeight ] = useState("");

	const [ selectedBrackets, setSelectedBrackets ] = useState([]);

	const selectDivision = newDivision => {
		setWeightClasses([...new Set(props.divisions.filter(division => division.name == newDivision).flatMap(division => division.weightClasses.map(weight => weight.name))) ]);
		setSelectedDivision(newDivision);
	};

	const selectWeight = newWeight => {

		const matches = props
			.divisions.filter(division => division.name == selectedDivision).flatMap(division =>
				division.weightClasses.filter(weight => weight.name == newWeight).flatMap(weight =>
					weight.pools.flatMap(pool =>
						pool.matches
						)
					)
				)
			.sort((matchA, matchB) => matchA.roundSpot - matchB.roundSpot)

		const newRounds = [...new Set(matches.map(match => match.round))]
			.map(round => ({
				name: round,
				sort: matches.filter(match => match.round == round)[0].roundNumber,
				matches: matches.filter(match => match.round == round).sort((matchA, matchB) => matchA.sort - matchB.sort)
			}))
			.sort((roundA, roundB) => roundA.sort - roundB.sort);
		
		let sortedRounds = [],
			paths = [];

		const maxMatches = [...newRounds].sort((roundA, roundB) => roundB.matches.length - roundA.matches.length).map(round => round.matches.length).find(() => true),
			roundCount = newRounds.length,
			roundSize = { width: boxSize.primarySection + boxSize.secondarySection + (paddingSize.round * 2), height: ((boxSize.height * 2) + paddingSize.box + paddingSize.match) * maxMatches },
			svgSize = { width: (roundSize.width * roundCount) + paddingSize.left, height: roundSize.height + paddingSize.top },
			innerBoxSize = { x: paddingSize.left, y: paddingSize.top },
			maxZoom = filterRef.current.offsetWidth > filterRef.current.offsetHeight ? Math.ceil((svgSize.width * 100) / (filterRef.current.offsetWidth * .5)) : Math.ceil((svgSize.height * 100) / (filterRef.current.offsetHeight * 1.1));
		
		// If there's a next match then it is a bracket and not a round robin
		if (matches.some(match => match.nextMatch)) {
			// Add initial round (round that is never the next match)
			sortedRounds.push(({
					...newRounds.filter(round => 
						round.matches[0].nextMatch &&
						!matches.some(all => all.nextMatch && (all.nextMatch.winnerGUID == round.matches[0].guid || all.nextMatch.loserGUID == round.matches[0].guid))
						)
						.map(round => ({
							...round,
							matches: round.matches.map((match, matchIndex) => ({
								...match,
								startY: matchSize.height * matchIndex
							}))
						}))[0],
					bracketType: "initial"
				}));

			// Add the next rounds in order
			while (sortedRounds[sortedRounds.length - 1].matches[0].nextMatch) {
				sortedRounds.push(({
					...newRounds.filter(round =>
						round.matches.some(match => match.guid == sortedRounds[sortedRounds.length -1].matches[0].nextMatch.winnerGUID)
					)
					.map(round => ({
						...round,
						matches: round.matches.map(match => ({
							...match,
							startY: sortedRounds
								.flatMap(allRounds => allRounds.matches) // Get all prev round matches
								.filter(all => all.nextMatch && all.nextMatch.winnerGUID == match.guid) // Filter for just the last prev round (has match in current round)
								.sort((allA, allB) => allA.startY - allB.startY)
								.map(all => all.startY) // Get all the start points
								.reduce((total, current, index, all) => index === 0 ? total.concat(current) : index === all.length - 1 ? total.concat(current + matchSize.height) : total, []) // Get the top and bottom points
								.reduce((total, current, index, all) => all[0] + (((all[1] - all[0]) / 2) - (matchSize.height / 2))) // starting at the first point, get the height, get the midpoint, then move up half a match
						}))
					}))[0],
					bracketType: "championship"
				}));
			}

			// Add the first consolation round (first loser match) (add to the beginning)
			sortedRounds.unshift(({
					...newRounds.filter(round => 
						round.matches.some(match => match.guid == sortedRounds[0].matches[0].nextMatch.loserGUID)
					)
					.map(round => ({
						...round,
						matches: round.matches.map((match, matchIndex) => ({
							...match,
							startY: sortedRounds
								.flatMap(allRounds => allRounds.matches)
								.filter(all => all.nextMatch && all.nextMatch.loserGUID == match.guid)
								.sort((allA, allB) => allA.startY - allB.startY)
								.map(all => all.startY)
								.reduce((total, current, index, all) => index === 0 ? total.concat(current) : index === all.length - 1 ? total.concat(current + matchSize.height) : total, [])
								.reduce((total, current, index, all) => all[0] + (((all[1] - all[0]) / 2) - (matchSize.height / 2)))
						}))
					}))[0],
					bracketType: "consolation"
				}));

			// Add the next console rounds in order (while it can find a next match)
			while (sortedRounds[0].matches[0].nextMatch) {
				sortedRounds.unshift(({
						...newRounds.filter(round =>
							round.matches.some(match => match.guid == sortedRounds[0].matches[0].nextMatch.winnerGUID)
						)
						.map(round => ({
							...round,
							matches: round.matches.map((match, matchIndex) => ({
								...match,
								startY: sortedRounds
									.flatMap(allRounds => allRounds.matches)
									.filter(all => all.nextMatch && all.nextMatch.winnerGUID == match.guid)
									.sort((allA, allB) => allA.startY - allB.startY)
									.map(all => all.startY)
									.reduce((total, current, index, all) => index === 0 ? total.concat(current) : index === all.length - 1 ? total.concat(current + matchSize.height) : total, [])
									.reduce((total, current, index, all) => all[0] + (((all[1] - all[0]) / 2) - (matchSize.height / 2)))
							}))
						}))[0],
						bracketType: "consolation"
					}));
			}

			paths = sortedRounds.flatMap((round, roundIndex) => round.matches.map((match) => ({
					bracketType: round.bracketType,
					winType: match.winType,
					roundStart: roundSize.width * roundIndex, // Get the x point for the round
					guid: match.guid,
					winGUID: match.nextMatch ? match.nextMatch.winnerGUID : null, // Where will the path go for winner
					loseGUID: match.nextMatch && round.bracketType == "initial" && match.topWrestler && match.bottomWrestler ? match.nextMatch.loserGUID : null, // Where will the path go for loser (only the initial loser gets mapped)
					winStart: match.nextMatch && match.winType ?
						match.startY + (
							match.topWrestler && match.topWrestler.isWinner ? boxSize.height / 2 // If the winner is on the top box start there
							: boxSize.height + paddingSize.box + (boxSize.height / 2) // If the winner is on the bottom box then start there
						)
						: null,
					loseStart: match.nextMatch && round.bracketType == "initial" && match.topWrestler && match.bottomWrestler && match.winType ?
						match.startY + (
							match.topWrestler.isWinner ? boxSize.height + paddingSize.box + (boxSize.height / 2)
							: boxSize.height / 2
						)
						: null,
					mid: match.startY + (((boxSize.height * 2) + paddingSize.box) / 2) // Get the midpoint for the box for the line to end
				})));
			
			paths = paths.map(path => ({
				bracketType: path.bracketType,
				winType: path.winType,
				winStartX: path.winGUID && ["initial", "championship"].includes(path.bracketType) ? path.roundStart + boxSize.primarySection + boxSize.secondarySection + paddingSize.round + paddingSize.path // start the path at the other side of the box
					: path.winGUID && ["initial", "consolation"].includes(path.bracketType) ? (path.roundStart + paddingSize.round) - paddingSize.path // Loser starts path at the beginning of the box
					: null, // No path
				winStartY: path.winStart, // Calcuated to be either the top or bottom
				winEndX: path.winGUID && ["initial", "championship"].includes(path.bracketType) ? paths.filter(next => next.guid == path.winGUID).map(next => (next.roundStart + paddingSize.round) - paddingSize.path)[0] // Go to the beginning of the next round
					: path.winGUID && ["initial", "consolation"].includes(path.bracketType) ? paths.filter(next => next.guid == path.winGUID).map(next => next.roundStart + matchSize.width + paddingSize.path)[0] // Go to the end of the next round
					: null, // No path
				winEndY: path.winGUID ? paths.filter(next => next.guid == path.winGUID).map(next => next.mid)[0] : null,

				loseStartX: path.loseGUID ? (path.roundStart + paddingSize.round) - paddingSize.path : null,
				loseStartY: path.loseStart,
				loseEndX: path.loseGUID ? paths.filter(next => next.guid == path.loseGUID).map(next => next.roundStart + matchSize.width + paddingSize.path)[0] : null,
				loseEndY: path.loseGUID ? paths.filter(next => next.guid == path.loseGUID).map(next => next.mid)[0] : null
			}));
		}
		else {
			// Round robin, sort
			sortedRounds = newRounds.map(round => ({
				...round,
				matches: round.matches.map((match, matchIndex) => ({
					...match,
					startY: matchSize.height * matchIndex
				}))
			}));
		}

		setSelectedBrackets([{
			division: selectedDivision,
			weightClass: newWeight,
			matches: matches,
			rounds: sortedRounds,
			paths: paths,
			zoom: 100,
			maxZoom: maxZoom,
			position: {
				svg: svgSize,
				innerBox: innerBoxSize,
				round: roundSize,
				box: boxSize,
				padding: paddingSize,
				match: matchSize
			}

		}])

		setSelectedWeight(newWeight);
	};

	const setZoom = bracketIndex => event => {
		setSelectedBrackets([
			...selectedBrackets.slice(0, bracketIndex),
			{
				...selectedBrackets[bracketIndex],
				zoom: event.target.value
			},
			...selectedBrackets.slice(bracketIndex + 1)
		])
	};

	return (

<>
<header>
	<h1>Brackets</h1>
</header>

<div className="panel filter" ref={ filterRef }>
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
			Division
			<select value={ selectedDivision } onChange={ event => selectDivision(event.target.value)}>
				<option value="">-- Select --</option>
				{
				[...new Set(props.divisions.map(division => division.name))]
				.sort((divisionA, divisionB) => divisionA > divisionB ? 1 : -1)
				.map(division => 
				<option key={ division } value={ division }>{ division }</option>
				)
				}
			</select>
		</label>
		
		<label>
			Weight Class
			<select value={ selectedWeight } onChange={ event => selectWeight(event.target.value) }>
				<option value="">-- Select --</option>
				{
				weightClasses
				.sort((weightA, weightB) => isNaN(weightA) ? 1 : isNaN(weightB) ? -1 : +weightA - +weightB)
				.map(weight => 
				<option key={ weight } value={ weight }>{ weight }</option>
				)
				}
			</select>
		</label>
	</div>

</div>

{
selectedBrackets
.sort((bracketA, bracketB) =>
	bracketA.division > bracketB.division ? 1
	: bracketA.division < bracketB.division ? -1
	: !isNaN(bracketA.weightClass) && !isNaN(bracketB.weightClass) ? +bracketA.weightClass - +bracketB.weightClass
	: bracketA.weightClass > bracketB.weightClass ? 1
	: -1
)
.map((bracket, bracketIndex) =>

<div className="panel expandable" key={bracketIndex}>
	<h3>{ `${ bracket.division} - ${ bracket.weightClass }` }</h3>

	<div>
		<input type="range" min="100" max={ bracket.maxZoom } value={ bracket.zoom } onChange={ setZoom(bracketIndex) } step="1" />
	</div>

	<div className="bracketContainer">
		<svg className="bracket" style={{ height: `${ bracket.zoom }%`, width: `${ bracket.zoom }%` }} viewBox={ `0 0 ${ bracket.position.svg.width } ${ bracket.position.svg.height }` } preserveAspectRatio="xMidYMid meet">
			<defs>
				<filter id="shadow" x="-20" y="-20" width="50" height="50">
					<feOffset result="offOut" in="SourceAlpha" dx="0" dy="0" />
					<feColorMatrix result="matrixOut" in="offOut" type="matrix" values=" 0.49 0 0 0 0 0 0.49 0 0 0 0 0 0.49 0 0 0 0 0 0.16 0" />
					<feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="3" />
					<feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
				</filter>
				
				<filter id="shadowWin" x="-20" y="-20" width="50" height="50">
					<feOffset result="offOut" in="SourceAlpha" dx="0" dy="0" />
					<feColorMatrix result="matrixOut" in="offOut" type="matrix" values=" 0.49 0 0 0 0 0 0.49 0 0 0 0 0 0.49 0 0 0 0 0 0.43 0" />
					<feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="4" />
					<feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
				</filter>
			</defs>

			<g transform={ `translate(${ bracket.position.innerBox.x } ${ bracket.position.innerBox.y })` }>
				{
				bracket.rounds.map((round, roundIndex) =>
				<g key={roundIndex} transform={ `translate(${ bracket.position.round.width * roundIndex })` }>

					{
					round.matches.map((match, matchIndex) =>

					<g key={ matchIndex } transform={ `translate(${ bracket.position.padding.round } ${ match.startY })` }>
						<g>
							<rect x="0" y="0" width={ bracket.position.box.primarySection } height={ bracket.position.box.height } rx="5" className={`background ${ match.topWrestler && match.topWrestler.isWinner ? "win" : "" }`} style={{filter:`url(#${ match.topWrestler && match.topWrestler.isWinner ? "shadowWin" : "shadow" })`}} />
							<rect x={ bracket.position.box.primarySection } y="0" width={ bracket.position.box.secondarySection } height={ bracket.position.box.height } rx="5" className={`backgroundDark ${ match.topWrestler && match.topWrestler.isWinner ? "win" : "" }`} style={{filter:`url(#${ match.topWrestler && match.topWrestler.isWinner ? "shadowWin" : "shadow" })`}} />
							<rect x={ bracket.position.padding.textX / 2 } y="0" width={ bracket.position.box.primarySection + (bracket.position.padding.textX / 2) } height={ bracket.position.box.height } className={`foreground ${ match.topWrestler && match.topWrestler.isWinner ? "win" : "" }`} />

							<text x={ bracket.position.padding.textX } y={ bracket.position.box.wrestlerTextY } className="wrestler">{ match.topWrestler ? match.topWrestler.name : "" }</text>
							<text x={ bracket.position.padding.textX } y={ bracket.position.box.teamTextY } className="team">{ match.topWrestler ? match.topWrestler.team : "" }</text>
							<text x={ bracket.position.box.primarySection + bracket.position.padding.winTextX } y={ bracket.position.box.winY }>{ match.topWrestler && match.topWrestler.isWinner ? match.winType : "" }</text>
						</g>
						
						<g transform={ `translate(0, ${ bracket.position.box.height + bracket.position.padding.box })` }>
							<rect x="0" y="0" width={ bracket.position.box.primarySection } height={ bracket.position.box.height } rx="5" className={`background ${ match.bottomWrestler && match.bottomWrestler.isWinner ? "win" : "" }`} style={{filter:`url(#${ match.bottomWrestler && match.bottomWrestler.isWinner ? "shadowWin" : "shadow" })`}} />
							<rect x={ bracket.position.box.primarySection } y="0" width={ bracket.position.box.secondarySection } height={ bracket.position.box.height } rx="5" className={`backgroundDark ${ match.bottomWrestler && match.bottomWrestler.isWinner ? "win" : "" }`} style={{filter:`url(#${ match.bottomWrestler && match.bottomWrestler.isWinner ? "shadowWin" : "shadow" })`}} />
							<rect x={ bracket.position.padding.textX / 2 } y="0" width={ bracket.position.box.primarySection + (bracket.position.padding.textX / 2) } height={ bracket.position.box.height } className={`foreground ${ match.bottomWrestler && match.bottomWrestler.isWinner ? "win" : "" }`} />

							<text x={ bracket.position.padding.textX } y={ bracket.position.box.wrestlerTextY } className="wrestler">{ match.bottomWrestler ? match.bottomWrestler.name : "" }</text>
							<text x={ bracket.position.padding.textX } y={ bracket.position.box.teamTextY } className="team">{ match.bottomWrestler ? match.bottomWrestler.team : "" }</text>
							<text x={ bracket.position.box.primarySection + bracket.position.padding.winTextX } y={ bracket.position.box.winY }>{ match.bottomWrestler && match.bottomWrestler.isWinner ? match.winType : "" }</text>
						</g>
					</g>

					)
					}

				</g>
				)
				}

				{
				bracket.paths
				.filter(path => path.loseStartY)
				.map((path, pathIndex) =>
					<path key={pathIndex} d={ `M${ path.loseStartX } ${ path.loseStartY } C${ path.loseEndX } ${ path.loseStartY }, ${ path.loseStartX } ${ path.loseEndY}, ${ path.loseEndX } ${ path.loseEndY }` } className="winPath" />
				)
				}

				{
				bracket.paths
				.filter(path => path.winStartY)
				.map((path, pathIndex) =>
					<path key={pathIndex} d={ `M${ path.winStartX } ${ path.winStartY } C${ path.winEndX  } ${ path.winStartY }, ${ path.winStartX } ${ path.winEndY}, ${ path.winEndX } ${ path.winEndY }` } className="winPath" style={{strokeWidth: path.winType == "F" ? 4 : 2 }} />
				)
				}
			</g>
		</svg>
	</div>

</div>

)
}
</>

		)
	};
	
export default FloBracket;
