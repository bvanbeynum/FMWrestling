import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/floevent.css";

const FloEvent = props => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ event, setEvent ] = useState(null);

	const [ divisions, setDivisions ] = useState([]);
	const [ weightClasses, setWeightClasses ] = useState([]);

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ selectedBrackets, setSelectedBrackets ] = useState([]);

	const [ selectedDivision, setSelectedDivision ] = useState("");
	const [ selectedWeight, setSelectedWeight ] = useState("");

	useEffect(() => {
		if (!pageActive) {
			const url = new window.URLSearchParams(window.location.search)

			fetch(`/api/floeventload?id=${ url.get("id") }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {

					setEvent(data.floEvent);

					setDivisions([...new Set(data.floEvent.divisions.map(division => division.name))]);

					setLoggedInUser(data.loggedInUser);
					setPageActive(true);

				})
				.catch(error => {
					console.warn(error);
					setLoadError(`Error: ${error.message}`);
				});

		}
	}, []);

	const selectDivision = newDivision => {
		setWeightClasses([...new Set(event.divisions.filter(division => division.name == newDivision).flatMap(division => division.weightClasses.map(weight => weight.name))) ]);
		setSelectedDivision(newDivision);
	}

	const selectWeight = newWeight => {

		const paddingSize = { top: 20, left: 0, round: 40, box: 10, match: 30, textX: 10, winTextX: 18, path: 5 },
			boxSize = { height: 40, primarySection: 160, secondarySection: 50, wrestlerTextY: 18, teamTextY: 33, winY: 25 },
			matchSize = { height: (boxSize.height * 2) + paddingSize.box + paddingSize.match, width: paddingSize.round + boxSize.primarySection + boxSize.secondarySection };
		
		const matches = event
			.divisions.find(division => division.name == selectedDivision)
			.weightClasses.find(weight => weight.name == newWeight)
			.pools[0].matches
			.sort((matchA, matchB) => matchA.roundSpot - matchB.roundSpot)

		const newRounds = [...new Set(matches.map(match => match.round))]
			.map(round => ({
				name: round,
				sort: matches.filter(match => match.round == round)[0].roundNumber,
				matches: matches.filter(match => match.round == round)
			}))
			.sort((roundA, roundB) => roundA.sort - roundB.sort);
		
		let sortedRounds = [],
			paths = [];

		const maxMatches = [...newRounds].sort((roundA, roundB) => roundB.matches.length - roundA.matches.length)[0].matches.length,
			roundCount = newRounds.length,
			roundSize = { width: boxSize.primarySection + boxSize.secondarySection + (paddingSize.round * 2), height: ((boxSize.height * 2) + paddingSize.box + paddingSize.match) * maxMatches },
			svgSize = { width: (roundSize.width * roundCount) + paddingSize.left, height: roundSize.height + paddingSize.top },
			innerBoxSize = { x: paddingSize.left, y: paddingSize.top };
		
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
								.flatMap(allRounds => allRounds.matches)
								.filter(all => all.nextMatch && all.nextMatch.winnerGUID == match.guid)
								.sort((allA, allB) => allA.startY - allB.startY)
								.map(all => all.startY)
								.reduce((total, current, index, all) => index === 0 ? total.concat(current) : index === all.length - 1 ? total.concat(current + matchSize.height) : total, [])
								.reduce((total, current, index, all) => all[0] + (((all[1] - all[0]) / 2) - (matchSize.height / 2)))
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
					roundStart: roundSize.width * roundIndex,
					guid: match.guid,
					winGUID: match.nextMatch ? match.nextMatch.winnerGUID : null,
					loseGUID: match.nextMatch && round.bracketType == "initial" && match.topWrestler && match.bottomWrestler ? match.nextMatch.loserGUID : null,
					winStart: match.nextMatch && match.winType ?
						match.startY + (
							match.topWrestler && match.topWrestler.isWinner ? boxSize.height / 2
							: boxSize.height + paddingSize.box + (boxSize.height / 2)
						)
						: null,
					loseStart: match.nextMatch && round.bracketType == "initial" && match.topWrestler && match.bottomWrestler && match.winType ?
						match.startY + (
							match.topWrestler.isWinner ? boxSize.height + paddingSize.box + (boxSize.height / 2)
							: boxSize.height / 2
						)
						: null,
					mid: match.startY + (((boxSize.height * 2) + paddingSize.box) / 2)
				})));
			
			paths = paths.map(path => ({
				bracketType: path.bracketType,
				winType: path.winType,
				winStartX: path.winGUID && ["initial", "championship"].includes(path.bracketType) ? path.roundStart + boxSize.primarySection + boxSize.secondarySection + paddingSize.round + paddingSize.path
					: path.winGUID && ["initial", "consolation"].includes(path.bracketType) ? (path.roundStart + paddingSize.round) - paddingSize.path
					: null,
				winStartY: path.winStart,
				winEndX: path.winGUID && ["initial", "championship"].includes(path.bracketType) ? paths.filter(next => next.guid == path.winGUID).map(next => (next.roundStart + paddingSize.round) - paddingSize.path)[0] 
					: path.winGUID && ["initial", "consolation"].includes(path.bracketType) ? paths.filter(next => next.guid == path.winGUID).map(next => next.roundStart + matchSize.width + paddingSize.path)[0]
					: null,
				winEndY: path.winGUID ? paths.filter(next => next.guid == path.winGUID).map(next => next.mid)[0] : null,

				loseStartX: path.loseGUID ? (path.roundStart + paddingSize.round) - paddingSize.path : null,
				loseStartY: path.loseStart,
				loseEndX: path.loseGUID ? paths.filter(next => next.guid == path.loseGUID).map(next => next.roundStart + matchSize.width + paddingSize.path)[0] : null,
				loseEndY: path.loseGUID ? paths.filter(next => next.guid == path.loseGUID).map(next => next.mid)[0] : null
			}));
		}
		else {
			sortedRounds = newRounds.map(round => ({
				...round,
				matches: round.matches.map(match => ({
					...match,
					startY: 0
				}))
			}));
		}

		setSelectedBrackets([{
			division: selectedDivision,
			weightClass: newWeight,
			matches: matches,
			rounds: sortedRounds,
			paths: paths,
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
	}

	return (
		
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		<div className={`container ${ pageActive ? "active" : "" }`}>
	
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
						Division
						<select value={ selectedDivision } onChange={ event => selectDivision(event.target.value)}>
							<option value="">-- Select --</option>
							{
							divisions
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

				<div className="bracketContainer">
					<svg className="bracket" style={{ height: `${ bracket.position.svg.height }px`, width: `${ bracket.position.svg.width }px` }}>
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

		</div>
		
		<div className="bottomNav">

			<button aria-label="Brackets">
				{/* Bracket */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M570.77-180.001V-240h98.845q21.231 0 35.808-14.385Q720-268.77 720-289.231v-82.308q0-35.692 21.231-64 21.23-28.307 55.307-39.384v-10.154q-34.077-11.077-55.307-39.384-21.231-28.308-21.231-64v-82.308q0-20.461-14.577-34.846Q690.846-720 669.615-720H570.77v-59.999h98.845q46.153 0 78.268 31.923 32.116 31.923 32.116 77.307v82.308q0 21.231 14.961 35.616 14.962 14.385 36.578 14.385h28.461v116.92h-28.461q-21.616 0-36.578 14.385-14.961 14.385-14.961 35.616v82.308q0 45.384-32.116 77.307-32.115 31.923-78.268 31.923H570.77Zm-280.385 0q-45.769 0-78.076-31.923-32.308-31.923-32.308-77.307v-82.308q0-21.231-14.961-35.616-14.962-14.385-36.578-14.385h-28.461v-116.92h28.461q21.616 0 36.578-14.385 14.961-14.385 14.961-35.616v-82.308q0-45.384 32.308-77.307 32.307-31.923 78.076-31.923h99.23V-720h-99.23q-20.846 0-35.616 14.385Q240-691.23 240-670.769v82.308q0 35.692-21.038 64-21.039 28.307-55.5 39.384v10.154q34.461 11.077 55.5 39.384 21.038 28.308 21.038 64v82.308q0 20.461 14.769 34.846Q269.539-240 290.385-240h99.23v59.999h-99.23Z"/></svg>
				Brackets
			</button>

			<button aria-label="Updates">
				{/* Brightness alert */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-290.77q13.731 0 23.019-9.288 9.288-9.289 9.288-23.019 0-13.731-9.288-23.019-9.288-9.288-23.019-9.288-13.731 0-23.019 9.288-9.288 9.288-9.288 23.019 0 13.73 9.288 23.019 9.288 9.288 23.019 9.288Zm-29.999-146.153h59.998v-240h-59.998v240ZM480-55.694 354.376-180.001H180.001v-174.375L55.694-480l124.307-125.624v-174.375h174.375L480-904.306l125.624 124.307h174.375v174.375L904.306-480 779.999-354.376v174.375H605.624L480-55.694ZM480-480Zm0 340 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Z"/></svg>
				Updates
			</button>

			<button aria-label="Upcoming">
				{/* Data alert */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M120-160v-80h480v80H120Zm520-280q-83 0-141.5-58.5T440-640q0-83 58.5-141.5T640-840q83 0 141.5 58.5T840-640q0 83-58.5 141.5T640-440Zm-520-40v-80h252q7 22 16 42t22 38H120Zm0 160v-80h376q23 14 49 23.5t55 13.5v43H120Zm500-280h40v-160h-40v160Zm20 80q8 0 14-6t6-14q0-8-6-14t-14-6q-8 0-14 6t-6 14q0 8 6 14t14 6Z"/></svg>
				Upcoming
			</button>

			<button aria-label="Teams">
				{/* Group */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z"/></svg>
				Teams
			</button>

		</div>

	</div>
</div>

	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<FloEvent />);
export default FloEvent;
