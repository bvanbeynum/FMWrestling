import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import ProbabilityChart from "./include/ProbabilityChart.jsx";
import "./include/index.css";
import "./include/opponent.css";

const Opponent = () => {
	const WeightClassNames = ["106","113","120","126","132","138","144","150","157","165","175","190","215","285"];

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ team, setTeam ] = useState([]);
	const [ opponents, setOpponents ] = useState([]);
	const [ selectedOpponent, setSelectedOpponent ] = useState("");
	const [ opponent, setOpponent ] = useState([]);
	const [ selectedOpponentAlternate, setSelectedOpponentAlternate ] = useState("");

	const [ lineup, setLineup ] = useState([]);

	const [ selectedWeightClass, setSelectedWeightClass ] = useState("");
	const [ weightClassView, setWeightClassView ] = useState("alternate");

	useEffect(() => {
		if (!pageActive) {

			fetch(`/api/opponentload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {

					const savedWeightClasses = data.loggedInUser.session?.team || [];
					
					const wrestlersLoaded = data.team
						.filter(wrestler => WeightClassNames.includes(wrestler.weightClass))
						.map(wrestler => ({
							id: wrestler.id,
							name: wrestler.name,
							rating: wrestler.rating,
							deviation: wrestler.deviation,
							weightClass: savedWeightClasses.some(savedWeightClass => savedWeightClass.wrestlerId == wrestler.id) ? // have we saved the wrestler to a different weight class
								savedWeightClasses.filter(savedWeightClass => savedWeightClass.wrestlerId == wrestler.id).map(savedWeightClass => savedWeightClass.weightClass).find(() => true)
								: wrestler.weightClass,
							isSavedWrestler: savedWeightClasses.some(savedWeightClass => savedWeightClass.wrestlerId == wrestler.id)
						}))
						.map(wrestler => ({
							...wrestler,
							weightClassPosition: WeightClassNames.indexOf(wrestler.weightClass)
						}));

					setTeam(wrestlersLoaded);
					setOpponents(data.opponents);

					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const selectOpponent = (opponentName) => {
		setIsLoading(true);
		
		fetch(`/api/opponentselect?opponent=${ opponentName }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				const wrestlersLoaded = data.wrestlers
					.filter(wrestler => WeightClassNames.includes(wrestler.weightClass))
					.map(wrestler => ({
						id: wrestler.id,
						name: wrestler.name,
						rating: wrestler.rating,
						deviation: wrestler.deviation,
						weightClass: wrestler.weightClass,
						weightClassPosition: WeightClassNames.indexOf(wrestler.weightClass)
					}));
				
				setOpponent(wrestlersLoaded);
				setSelectedOpponent(opponentName);
				setIsLoading(false);
			})
			.catch(error => {
				console.warn(error);
			});
	};

	useEffect(() => {
		if (team.length > 0 && opponent.length > 0) {
			const initialTeamLineup = WeightClassNames.map(weightClass => 
				team.filter(wrestler => wrestler.weightClass == weightClass)
					.sort((wrestlerA, wrestlerB) => wrestlerB.rating - wrestlerA.rating)
					.find(() => true)
			);
			const opponentLineup = generateLineup(opponent, initialTeamLineup);
			console.log(`opponent: ${calculateLineupScore(opponentLineup)}`);

			const teamLineup = generateLineup(team, opponentLineup.map(weightClass => ({
				...weightClass.team,
				overrideWeightClass: weightClass.weightClass,
				overrideWeightClassPosition: weightClass.weightClassPosition
			})));
			
			const finalLineup = teamLineup.map(match => ({
				...match,
				teamAlternates: team
					.filter(wrestler => 
						Math.abs(wrestler.weightClassPosition - match.weightClassPosition) <= 1
						&& wrestler.id != match.team?.id
					)
					.sort((wrestlerA, wrestlerB) => wrestlerB.rating - wrestlerA.rating)
					.slice(0, 5),
				opponentAlternates: opponent
					.filter(wrestler => 
						Math.abs(wrestler.weightClassPosition - match.weightClassPosition) <= 1
						&& wrestler.id != match.opponent?.id
					)
					.sort((wrestlerA, wrestlerB) => wrestlerB.rating - wrestlerA.rating)
					.slice(0, 5)
			}));

			setLineup(finalLineup);
			console.log(`team: ${calculateLineupScore(finalLineup)}`);
			console.log(finalLineup);
		}
	}, [ team, opponent ]);

	const generateLineup = (team, opponent) => {
		const matches = WeightClassNames.map((weightClass, weightClassIndex) => ({
			weightClass: weightClass,
			weightClassPosition: weightClassIndex,
			team: null,
			opponent: opponent
				.filter(wrestler => (wrestler.overrideWeightClass || wrestler.weightClass) == weightClass)
				.find(() => true)
		}));

		const usedWeightClasses = new Set();
		const availableWrestlers = [].concat(team);

		availableWrestlers.sort((wrestlerA, wrestlerB) => wrestlerB.rating - wrestlerA.rating);

		for (let wrestlerIndex = 0; wrestlerIndex < availableWrestlers.length; wrestlerIndex++) {
			const bestWrestler = availableWrestlers[wrestlerIndex];
			const bestOpponent = matches
				.filter(lineupWrestler => 
					Math.abs(bestWrestler.weightClassPosition - lineupWrestler.weightClassPosition) <= 1 
					&& !usedWeightClasses.has(lineupWrestler.weightClass)
				)
				.map(lineupWrestler => ({
					...lineupWrestler,
					prediction: !lineupWrestler.opponent ? 6
						: !bestWrestler ? -6
						: predictMatchOutcomePoints(bestWrestler, lineupWrestler.opponent, lineupWrestler.weightClassPosition),
					isWin: bestWrestler.rating > (lineupWrestler.opponent?.rating || 0)
				}))
				.sort((lineupWrestlerA, lineupWrestlerB) => 
					// lineupWrestlerA.isWin != lineupWrestlerB.isWin ?
					// 	lineupWrestlerA.isWin ? -1 : 1
					// : lineupWrestlerB.prediction - lineupWrestlerA.prediction
					lineupWrestlerB.prediction - lineupWrestlerA.prediction
				)
				.find(() => true);
			
			if (bestOpponent) {
				const match = matches.find(lineupWrestler => lineupWrestler.weightClass == bestOpponent.weightClass);
				match.team = bestWrestler;
				match.prediction = bestOpponent.prediction;
				match.isWin = bestOpponent.isWin;

				usedWeightClasses.add(bestOpponent.weightClass);
			}
		}

		return matches;
	};

	const calculateLineupScore = matches => {
		let totalScore = 0;
		matches.forEach(match => {
			// If myWrestler is null, it's a forfeit, 0 points for my team.
			if (match.team) {
				if (!match.opponent) {
					totalScore += 6;
				}
				else {
					totalScore += predictMatchOutcomePoints(match.team, match.opponent, match.weightClassPosition);
				}
			}
		});
		return totalScore;
	}

	/**
	 * Predicts the points my wrestler would earn against an opponent,
	 * using a simplified Glicko-inspired probabilistic model.
	 *
	 * This is a crucial area for fine-tuning. A more complex model could:
	 * - Use a logistic function based on rating difference to get win probability.
	 * - Further subdivide win probability into probabilities for decision, major, tech fall, pin.
	 * (e.g., larger rating difference = higher chance of bonus points).
	 * - Incorporate Glicko Deviation: higher deviation means more uncertainty,
	 * which could slightly flatten the probabilities or introduce more variance.
	 *
	 * @param {Object} myWrestler - My team's wrestler object.
	 * @param {Object} opponentWrestler - Opponent's wrestler object.
	 * @returns {number} Predicted points (e.g., 0, 3, 4, 5, 6)
	 */
	const predictMatchOutcomePoints = (myWrestler, opponentWrestler, weightClassPosition) => {
		// Handle forfeits or missing data gracefully
		if (!myWrestler || !opponentWrestler) {
			return 0;
		}

		let impactedWrestlerRating = myWrestler.rating;
		if (myWrestler.weightClassPosition != weightClassPosition) {
			const bumpAmount = Math.abs(myWrestler.weightClassPosition - weightClassPosition);
			if (bumpAmount > 0) {
				// Apply a penalty if bumped. A fixed penalty per bump is a simple approach.
				// You can adjust this penalty value (e.g., 50 Glicko points per class bumped).
				const bumpPenalty = 75 * bumpAmount; // Example: 75 Glicko points penalty per class bumped
				impactedWrestlerRating -= bumpPenalty;
			}
		}

		let impactedOpponentRating = opponentWrestler.rating;
		if (opponentWrestler.weightClassPosition != weightClassPosition) {
			const bumpAmount = Math.abs(opponentWrestler.weightClassPosition - weightClassPosition);
			if (bumpAmount > 0) {
				// Apply a penalty if bumped. A fixed penalty per bump is a simple approach.
				// You can adjust this penalty value (e.g., 50 Glicko points per class bumped).
				const bumpPenalty = 75 * bumpAmount; // Example: 75 Glicko points penalty per class bumped
				impactedOpponentRating -= bumpPenalty;
			}
		}

		const ratingDiff = impactedWrestlerRating - impactedOpponentRating;
		// Combine deviations to get an overall uncertainty factor.
		const combinedDeviation = Math.sqrt(
			myWrestler.deviation * myWrestler.deviation +
			opponentWrestler.deviation * opponentWrestler.deviation
		);

		// Base win probability (simplified logistic function for better behavior than linear)
		// Using a sigmoid-like function: P(win) = 1 / (1 + e^(-x))
		// Scale ratingDiff so that 100 rating points difference is significant, 400 is dominant
		const scaledRatingDiff = ratingDiff / 150; // Adjust this scaling for desired sensitivity
		let winProbability = 1 / (1 + Math.exp(-scaledRatingDiff));

		// Adjust win probability based on combined deviation: higher deviation means more uncertainty.
		// This could pull the probability closer to 0.5 for highly uncertain matches.
		if (combinedDeviation > 120) { // Arbitrary threshold for "high uncertainty"
			const uncertaintyFactor = Math.min(1, (combinedDeviation - 120) / 100); // Scales 0 to 1
			winProbability = winProbability * (1 - uncertaintyFactor * 0.3) + 0.5 * (uncertaintyFactor * 0.3); // Pull towards 0.5
		}

		// Now, predict points based on win probability and rating difference
		// This model tries to be more granular with bonus points
		if (winProbability > 0.95) { // Very strong favorite
			if (ratingDiff > 250) return 6; // Pin
			return 5; // Tech Fall
		} 
		else if (winProbability > 0.8) { // Strong favorite
			if (ratingDiff > 150) return 4; // Major Decision
			return 3; // Decision
		} 
		else if (winProbability > 0.51) { // Slight favorite
			return 3; // Decision
		} 
		else if (winProbability > 0.4) { // Close match, slight underdog
			return -3; // Likely a close loss
		} 
		else if (winProbability < 0.05) { // Very strong underdog
			if (ratingDiff < -250) return -6; // Likely pinned by opponent (or tech/major)
			return -5; // Likely tech/major
		}
		else if (winProbability < 0.2) { // Strong underdog
			if (ratingDiff < -150) return -4; // Likely major decision loss
			return -3; // Likely decision loss
		} 
		return -3; // Default: assumed loss for anything less than significant favor
	};

	const selectAlternate = (wrestlerId, alternateTeam) => {
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
				<h1>Match Up</h1>
				
				{
				selectOpponent ?
				<h1 className="subTitle">{ selectedOpponent }</h1>
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
						<select value={ selectedOpponent } onChange={ event => selectOpponent(event.target.value) }>
							<option value="">-- Select Opponent --</option>
							{
							opponents.map((opponent, opponentIndex) => 
							<option key={ opponentIndex } value={ opponent }>{ opponent }</option>
							)}
						</select>
					</label>
				</div>
			</div>

			{
			
			lineup.map(match => 
			<div key={ match.weightClass }>

			<div className="panel button weightClassContainer" onClick={ () => setSelectedWeightClass(selectedWeightClass == match.weightClass ? "" : match.weightClass) }>
				<div className={`wrestlerContainer ${ match.isWin ? "win" : "lose" }`}>
					{
					match.team ?
					<>
					<div>{ match.team?.name.split(" ")[0] }</div>
					<div>{ match.team?.name.split(" ").slice(1).join(" ") } ({ match.team?.weightClass })</div>
					<div>{`${ match.team?.rating.toFixed(0) } / ${ match.team?.deviation.toFixed(0) }`}</div>
					</>
					: 
					<div>Forfeit</div>
					 }
				</div>

				<div className="scoreContainer">
					<div>{ match.weightClass }</div>
					<div className="scoreBoard">
						<div className={`scoreTeam ${ match.prediction > 0 ? "win" : "lose" }`}>{ match.prediction }</div>
						<div className={`scoreTeam ${ match.prediction < 0 ? "win" : "lose" }`}>{ match.prediction * -1 }</div>
					</div>
				</div>

				<div className={`wrestlerContainer ${ !match.isWin ? "win" : "lose" }`}>
					{
					match.opponent ?
					<>
					<div>{ match.opponent?.name.split(" ")[0] }</div>
					<div>{ match.opponent?.name.split(" ").slice(1).join(" ") } ({ match.opponent?.weightClass })</div>
					<div>{`${ match.opponent?.rating.toFixed(0) } / ${ match.opponent?.deviation.toFixed(0) }`}</div>
					</>
					: 
					<div>Forfeit</div>
					}
				</div>
			</div>

			{
			selectedWeightClass == match.weightClass ?
			
			<div className="panel actionBar weightClassExapnded">
				<div className="panelContent weightClassExpandedContent">
					{
					weightClassView == "alternate" ?
					<div className="alternateSection">

						<div className="inlay alternateContainer">
							{
							match.teamAlternates && match.teamAlternates.length > 0 ?
							match.teamAlternates.map((wrestler, wrestlerIndex) => 

							<div key={ wrestlerIndex } className={`pill button ${ wrestler.rating > (match.opponent?.rating || 0) ? "win" : "lose" }`}>
								{ wrestler.weightClass }: { wrestler.name }
							</div>
							
							)
							: ""
							}
							<div className="pill">
								<select value={ selectedOpponentAlternate } onChange={ event => selectAlternate(event.target.value, 'team') }>
									<option value="" disabled>-- other --</option>
									{
									opponent
									.sort((opponentA, opponentB) => 
										opponentA.weightClass != opponentB.weightClass ?
											isNaN(opponentA.weightClass) != isNaN(opponentB.weightClass) ?
												isNaN(opponentA.weightClass) ? 1 : -1
											: opponentA.weightClass - opponentB.weightClass
										: opponentB.rating - opponentA.rating
									)
									.map((opponent, opponentIndex) => 
										<option key={ opponentIndex } value={ opponent.id }>{ opponent.weightClass }: { opponent.name }</option>
									)
									}
								</select>
							</div>
						</div>

						<div className="inlay alternateContainer">
							{
							match.opponentAlternates && match.opponentAlternates.length > 0 ?
							match.opponentAlternates.map((wrestler, wrestlerIndex) => 

							<div key={ wrestlerIndex } className={`pill button ${ wrestler.rating > (match.opponent?.rating || 0) ? "win" : "lose" }`}>
								{ wrestler.weightClass }: { wrestler.name }
							</div>
							
							)
							: ""
							}
							<div className="pill">
								<select value={ selectedOpponentAlternate } onChange={ event => selectAlternate(event.target.value, 'opponent') }>
									<option value="" disabled>other</option>
									{
									opponent
									.sort((opponentA, opponentB) => 
										opponentA.weightClass != opponentB.weightClass ?
											isNaN(opponentA.weightClass) != isNaN(opponentB.weightClass) ?
												isNaN(opponentA.weightClass) ? 1 : -1
											: opponentA.weightClass - opponentB.weightClass
										: opponentB.rating - opponentA.rating
									)
									.map((opponent, opponentIndex) => 
										<option key={ opponentIndex } value={ opponent.id }>{ opponent.weightClass }: { opponent.name }</option>
									)
									}
								</select>
							</div>
						</div>
					</div>

					: weightClassView == "compare" ?

					<div className="probabilityChart">
						<ProbabilityChart team={match.team} opponent={match.opponent} />
					</div>

					: ""
					}
				</div>

				<div className="panelActionBar">
					<button className={ weightClassView == "alternate" ? "select" : "" } onClick={ () => setWeightClassView("alternate") }>
						{/* Wrestlers */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M55.077-93.847 12.924-136l143.692-143.692-46.308-123.385q-6.23-15.692-2.423-36.692 3.808-21 20.115-37.307l132-132q10.462-10.462 22.539-15.693 12.076-5.23 27.153-5.23 15.077 0 27.154 5.23 12.076 5.231 22.538 15.693l80.769 78q27.385 27 65.231 42.692 37.846 15.692 81.692 17.615v59.999q-55-1.923-103.153-20.731-48.154-18.808-81.923-52.192l-34.923-34.154L259.23-410l87.846 89.846v230.153h-59.998v-204.615l-72.002-66.463v107.233l-160 159.999Zm552.001 3.846v-265.383l85.538-81.539-30.154-166.156q-22.693 27.616-48.386 49.502-25.693 21.885-57.463 34.27-23.768-2-45.576-11.116-21.807-9.115-37.191-24.114 45.769-7.616 84.5-34.539 38.732-26.924 59.962-61.539l39.231-64q15.077-24.307 41.423-32.269 26.345-7.961 52.268 2.885l195.846 82.923v171.075h-59.998v-132.153l-95.079-38.001L904.768-90.001H840.77L767.616-396.54l-100.54 85.001v221.538h-59.998ZM447.076-614.615q-30.692 0-52.269-21.577-21.577-21.577-21.577-52.269 0-30.692 21.577-52.269 21.577-21.576 52.269-21.576 30.692 0 52.269 21.576 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.577 21.577-52.269 21.577ZM664-776.154q-30.692 0-52.269-21.576-21.576-21.577-21.576-52.269 0-30.692 21.576-52.269 21.577-21.577 52.269-21.577 30.693 0 52.269 21.577 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.576 21.576-52.269 21.576Z"></path></svg>
						Alternate
					</button>
					<button className={ weightClassView == "compare" ? "select" : "" } onClick={ () => setWeightClassView("compare") }>
						{/* Compare */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M420.001-55.386V-140H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h207.692v-84.615H480v849.228h-59.999ZM200-240h220.001v-263.848L200-240Zm360 99.999V-480l200 240v-507.691q0-4.616-3.846-8.463-3.847-3.846-8.463-3.846H560v-59.999h187.691q30.308 0 51.308 21t21 51.308v535.382q0 30.308-21 51.308t-51.308 21H560Z"/></svg>
						Compare
					</button>
				</div>
			</div>
			
			: ""
			}

			</div>
			)
			}

		</div>

		}

	</div>
</div>
	);
		
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Opponent />);
export default Opponent;
