import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import ProbabilityChart from "./include/ProbabilityChart.jsx";
import RunningTotalChart from "./include/RunningTotalChart.jsx";
import "./include/index.css";
import "./include/opponent.css";

const Opponent = () => {
	
	const seasonStart = new Date() > new Date(new Date().getFullYear(), 11, 1) ?
		new Date(new Date().getFullYear(), 8, 1)
		: new Date(new Date().getFullYear() - 1, 8, 1);
		
	const originalWeightClasses = ["106","113","120","126","132","138","144","150","157","165","175","190","215","285"];

	const [ weightClassNames, setWeightClassNames ] = useState(["106","113","120","126","132","138","144","150","157","165","175","190","215","285"]);
	const [ startingWeightIndex, setStartingWeightIndex ] = useState(0)
	const [ startingWeight, setStartingWeight ] = useState("106")

	const [ opponentEvents, setOpponentEvents ] = useState([]);
	const [ selectedEventLineup, setSelectedEventLineup ] = useState("");

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ saveName, setSaveName ] = useState("");
	const [ selectedLineup, setSelectedLineup ] = useState("");

	const [ teamWrestlers, setTeamWrestlers ] = useState([]);

	const [ opponentSelect, setOpponentSelect ] = useState([]);
	const [ opponents, setOpponents ] = useState([]);
	const [ selectedOpponent, setSelectedOpponent ] = useState("");
	const [ selectedOpponentId, setSelectedOpponentId ] = useState("");
	const [ opponentWrestlers, setOpponentWrestlers ] = useState([]);

	const [ lineup, setLineup ] = useState([]);
	const [ eventDetails, setEventDetails ] = useState({})
	const [ savedLineups, setSavedLineups ] = useState([]);

	const [ viewPlayer, setViewPlayer ] = useState(null);

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
						.filter(wrestler => weightClassNames.includes(wrestler.weightClass))
						.map(wrestler => ({
							id: wrestler.id,
							name: wrestler.name,
							rating: wrestler.rating,
							deviation: wrestler.deviation,
							lastDate: new Date(wrestler.lastEvent?.date),
							weightClass: savedWeightClasses.some(savedWeightClass => savedWeightClass.wrestlerId == wrestler.id) ? // have we saved the wrestler to a different weight class
								savedWeightClasses.filter(savedWeightClass => savedWeightClass.wrestlerId == wrestler.id).map(savedWeightClass => savedWeightClass.weightClass).find(() => true)
								: wrestler.weightClass,
							isSavedWrestler: savedWeightClasses.some(savedWeightClass => savedWeightClass.wrestlerId == wrestler.id)
						}));

					setTeamWrestlers(wrestlersLoaded);
					setOpponents(data.schools);

					const selectGroup = [...new Set(data.schools.sort((schoolA, schoolB) => 
						schoolA.classification != schoolB.classification ?
							schoolA.classification > schoolB.classification ? -1 : 1
						: schoolA.region != schoolB.region ?
							schoolA.region > schoolB.region ? 1 : -1
						: schoolA.name > schoolB.name ?
							1 : -1
						).map(school => `${school.classification || "NA"} - ${school.region || "NA"}`))]
						.map(group => ({
							name: group,
							schools: data.schools
								.filter(school => `${school.classification || "NA"} - ${school.region || "NA"}` == group)
								.sort()
						}));
					setOpponentSelect(selectGroup);

					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const selectOpponent = opponentId => {
		const opponent = opponents.find(opponent => opponent.id == opponentId);
		setIsLoading(true);
		setSelectedOpponent(opponent);
		setSelectedOpponentId(opponent.id);
		
		fetch(`/api/opponentselect?opponent=${ opponent.id }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				const opponentWrestlers = data.wrestlers
					.filter(wrestler => weightClassNames.includes(wrestler.weightClass))
					.map(wrestler => ({
						id: wrestler.id,
						name: wrestler.name,
						rating: wrestler.rating,
						deviation: wrestler.deviation,
						weightClass: wrestler.weightClass,
						lastDate: new Date(wrestler.lastEvent?.date),
					}));

				const bestLineup = pickBestLineup(teamWrestlers, opponentWrestlers, []);
				const eventStats = generateStats(bestLineup);
				
				if (loggedInUser.session && loggedInUser.session.matchSave && loggedInUser.session.matchSave.length > 0) {
					setSavedLineups(loggedInUser.session.matchSave
						.filter(save => save.opponentId == opponent.id)
						.map(save => ({...save, id: save["_id"] }))
					);
				}
						
				setLineup(bestLineup)
				setEventDetails(eventStats);

				const newEvents = data.events
					.filter(event => event.wrestlers.some(wrestler => opponentWrestlers.some(opponentWrestler => opponentWrestler.id == wrestler.id)))
					.map(event => ({...event, date: new Date(event.date) })).sort((eventA, eventB) => +eventB.date - +eventA.date);

				setOpponentEvents(newEvents);
				setOpponentWrestlers(opponentWrestlers);
				setIsLoading(false);
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const setEventLinup = eventKey => {
		const opponentEvent = opponentEvents.find(event => event.key == eventKey);

		const newLineup = lineup.map(lineupMatch => {
			const eventWrestler = opponentEvent.wrestlers.find(wrestler => wrestler.weightClass == lineupMatch.weightClass);
			const opponentWrestler = eventWrestler ? opponentWrestlers.find(wrestler => wrestler.id == eventWrestler.id) : null;
			const weightClassPosition = weightClassNames.indexOf(lineupMatch.weightClass)

			return {
				...lineupMatch,
				weightClass: lineupMatch.weightClass,
				weightClassPosition: weightClassPosition,
				teamScore: 0,
				isStaticOpponent: true,
				opponent: opponentWrestler,
				opponentScore: 0,
				prediction: !opponentWrestler ? 6
					: !lineupMatch.team ? -6
					: predictMatchOutcomePoints(lineupMatch.team, opponentWrestler, weightClassPosition)
			}
		});

		setLineup(newLineup);
		setSelectedLineup("");
		setEventDetails(generateStats(newLineup));
		setSelectedEventLineup(eventKey);
	};

	const changeLineup = lineupId => {
		let loadLineup,
			newWeightClasses,
			newLineup;

		if (lineupId) {
			// Selected an existing lineup
			loadLineup = savedLineups.find(lineup => lineup.id == lineupId);
			
			const weightIndex = weightClassNames.findIndex(weightClass => weightClass == loadLineup.startingWeightClass),
				rangeIndex = originalWeightClasses.findIndex(weightClass => weightClass == loadLineup.startingWeightClass);
			
			newWeightClasses = [
					...weightClassNames.slice(weightIndex),
					...weightClassNames.slice(0, weightIndex)
				];

			newLineup = loadLineup.lineup.map(lineupMatch => {
				const teamWrestler = teamWrestlers.find(wrestler => wrestler.id == lineupMatch.teamWrestlerId);
				const opponentWrestler = opponentWrestlers.find(wrestler => wrestler.id == lineupMatch.opponentWrestlerId);
				const weightClassPosition = newWeightClasses.indexOf(lineupMatch.weightClass)

				return {
					weightClass: lineupMatch.weightClass,
					weightClassPosition: weightClassPosition,
					isStaticTeam: lineupMatch.isStaticTeam && teamWrestler !== null,
					team: teamWrestler,
					teamScore: lineupMatch.teamScore,
					isStaticOpponent: lineupMatch.isStaticOpponent && opponentWrestler !== null,
					opponent: opponentWrestler,
					opponentScore: lineupMatch.opponentScore,
					prediction: !opponentWrestler ? 6
						: !teamWrestler ? -6
						: predictMatchOutcomePoints(teamWrestler, opponentWrestler, weightClassPosition)
				}
			});

			setSelectedLineup(lineupId);
			setSaveName(loadLineup.name);
			setStartingWeight(loadLineup.startingWeightClass);
			setStartingWeightIndex(rangeIndex);
			setSelectedEventLineup("");
		}
		else {
			// Create a new lineup

			const weightIndex = weightClassNames.findIndex(weightClass => weightClass == "106");
			
			newWeightClasses = [
					...weightClassNames.slice(weightIndex),
					...weightClassNames.slice(0, weightIndex)
				];
				
			newLineup = pickBestLineup(teamWrestlers, opponentWrestlers, [], newWeightClasses, true);

			setSelectedLineup("");
			setSaveName("");
			setStartingWeight("106");
		}

		setWeightClassNames(newWeightClasses);
		setLineup(newLineup);
		setEventDetails(generateStats(newLineup));
	};

	const changeScore = (teamName, match, score) => {
		const scoreLineup = lineup.map(lineupMatch => ({
			...lineupMatch,
			teamScore: match.weightClass != lineupMatch.weightClass ? lineupMatch.teamScore 
				: teamName == "Fort Mill" ? +score 
				: 0,
			opponentScore: match.weightClass != lineupMatch.weightClass ? lineupMatch.opponentScore 
				: teamName != "Fort Mill" ? +score
				: 0
		}));

		setLineup(scoreLineup);
		setEventDetails(generateStats(scoreLineup));
	};

	const updateStartingWeight = startingWeight => {
		const weightIndex = weightClassNames.findIndex(weightClass => weightClass == startingWeight),
			newWeightClasses = [
				...weightClassNames.slice(weightIndex),
				...weightClassNames.slice(0, weightIndex)
			],
			updatedLineup = [
				...lineup.slice(weightIndex),
				...lineup.slice(0, weightIndex)
				]
				.map((match, matchIndex) => ({
					...match,
					weightClassPosition: matchIndex
				}));

		setLineup(updatedLineup);
		setWeightClassNames(newWeightClasses);
		setStartingWeight(startingWeight);
	};

	const updateStartingWeightIndex = newStartIndex => {
		const newWeightClass = originalWeightClasses[newStartIndex],
			newIndex = weightClassNames.findIndex(weightClass => weightClass == newWeightClass),
			newWeightClasses = [
				...weightClassNames.slice(newIndex),
				...weightClassNames.slice(0, newIndex)
			],
			updatedLineup = [
				...lineup.slice(newIndex),
				...lineup.slice(0, newIndex)
				]
				.map((match, matchIndex) => ({
					...match,
					weightClassPosition: matchIndex
				}));

		setLineup(updatedLineup);
		setWeightClassNames(newWeightClasses);
		setStartingWeight(newWeightClass);
		setStartingWeightIndex(newStartIndex);
	};

	const selectViewPlayer = (teamName, match) => {
		const originalMatchPosition = originalWeightClasses.findIndex(weightClass => weightClass == match.weightClass);

		const topPicks = (teamName == "Fort Mill" ? teamWrestlers : opponentWrestlers)
				.map(wrestler => ({...wrestler, weightClassPosition: originalWeightClasses.indexOf(wrestler.weightClass)}))
				.filter(wrestler => Math.abs(wrestler.weightClassPosition - originalMatchPosition) <= 1)
				.sort((wrestlerA, wrestlerB) => wrestlerB.rating - wrestlerA.rating),

			alternatePicks = (teamName == "Fort Mill" ? teamWrestlers : opponentWrestlers)
				.map(wrestler => ({...wrestler, weightClassPosition: weightClassNames.indexOf(wrestler.weightClass)}))
				.filter(wrestler => Math.abs(wrestler.weightClassPosition - originalMatchPosition) > 1)
				.sort((wrestlerA, wrestlerB) => 
					wrestlerA.weightClassPosition != wrestlerB.weightClassPosition ?
						wrestlerA.weightClassPosition - wrestlerB.weightClassPosition
					: wrestlerB.rating - wrestlerA.rating
				);

		setViewPlayer({ team: teamName, match: match, topPicks: topPicks, alternatePicks: alternatePicks});
	};

	const selectAlternate = (teamName, match, wrestlerId) => {
		const staticLineup = lineup.filter(lineupMatch => lineupMatch.isStaticOpponent || lineupMatch.isStaticTeam)
			.map(lineupMatch => ({
				weightClass: lineupMatch.weightClass,
				teamWrestlerId: lineupMatch.isStaticTeam && !lineupMatch.team ? "forfeit"
					: teamName == "Fort Mill" && lineupMatch.team?.id == wrestlerId ? null // If the wrestler is already assigned (and not the weight class) then blank
					: lineupMatch.isStaticTeam ? lineupMatch.team?.id // Keep the existing record
					: null,
				opponentWrestlerId: lineupMatch.isStaticOpponent && !lineupMatch.opponent ? "forfeit"
					: teamName != "Fort Mill" && lineupMatch.opponent?.id == wrestlerId ? null 
					: lineupMatch.isStaticOpponent ? lineupMatch.opponent?.id
					: null
			}));
		
		const staticLineupIndex = staticLineup.findIndex(lineupMatch => lineupMatch.weightClass === match.weightClass);

		if (staticLineupIndex !== -1) {
			// If the weight class already exists in staticLineup
			if (teamName === "Fort Mill") {
				staticLineup[staticLineupIndex].teamWrestlerId = wrestlerId || "forfeit";
			} else {
				staticLineup[staticLineupIndex].opponentWrestlerId = wrestlerId || "forfeit";
			}
		} else {
			// If the weight class does not exist, add a new record
			staticLineup.push({
				weightClass: match.weightClass,
				teamWrestlerId: teamName === "Fort Mill" ? wrestlerId || "forfeit" : null,
				opponentWrestlerId: teamName !== "Fort Mill" ? wrestlerId || "forfeit" : null
			});
		}

		const bestLineup = pickBestLineup(teamWrestlers, opponentWrestlers, staticLineup);
		const eventStats = generateStats(bestLineup);

		setLineup(bestLineup);
		setEventDetails(eventStats);
		setViewPlayer(null);
	};

	const saveLineup = isSave => {
		
		let saveLineup = null;
		if (isSave) {
			saveLineup = lineup.map(lineupMatch => ({
				weightClass: lineupMatch.weightClass,
				isStaticTeam: lineupMatch.isStaticTeam,
				teamWrestlerId: lineupMatch.team?.id,
				teamScore: lineupMatch.teamScore,
				isStaticOpponent: lineupMatch.isStaticOpponent,
				opponentWrestlerId: lineupMatch.opponent?.id,
				opponentScore: lineupMatch.opponentScore,
			}));
		}

		setIsLoading(true);
		
		fetch(`/api/opponentsavelineup`, { 
				method: "post", 
				headers: { "Content-Type": "application/json" }, 
				body: JSON.stringify({ 
					saveid: selectedLineup, 
					savename: saveName, 
					opponentid: selectedOpponent.id,
					startingweightclass: startingWeight, 
					lineup: saveLineup 
				}) 
			})
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				if (data.savedMatches && data.savedMatches.length > 0) {
					setSavedLineups(data.savedMatches
						.filter(save => save.opponentId == selectedOpponent.id)
						.map(save => ({...save, id: save["_id"] }))
					);
				}
				
				if (!selectedLineup) {
					const addedMatch = data.savedMatches.find(save => !savedLineups.some(existing => existing.id == save["_id"]));

					setSelectedLineup(addedMatch["_id"]);
				}
				else if (!isSave) {
					// Create a new lineup

					const weightIndex = weightClassNames.findIndex(weightClass => weightClass == "106");
					
					const newWeightClasses = [
							...weightClassNames.slice(weightIndex),
							...weightClassNames.slice(0, weightIndex)
						];
						
					const newLineup = pickBestLineup(teamWrestlers, opponentWrestlers, [], newWeightClasses, true);

					setSelectedLineup("");
					setSaveName("");
					setStartingWeight("106");
					setWeightClassNames(newWeightClasses);
					setLineup(newLineup);
					setEventDetails(generateStats(newLineup));
				}

				setIsLoading(false);
			})
			.catch(error => {
				console.warn(error);
			});
		
	};

	const pickBestLineup = (teamWrestlers, opponentWrestlers, staticLineup, weightClassOverride, newLineupOverride = false) => {
		const initialTeamLineup = (weightClassOverride || weightClassNames).map(weightClass => 
			teamWrestlers.filter(wrestler => wrestler.weightClass == weightClass)
				.sort((wrestlerA, wrestlerB) => 
					wrestlerA.lastDate < seasonStart ? 1
					: wrestlerB.lastDate < seasonStart ? -1
					: wrestlerB.rating - wrestlerA.rating)
				.find(() => true)
		);

		// If the initial lineup has any nulls (forfeits), fill them with the next best available wrestler
		initialTeamLineup.forEach((lineupWrestler, lineupIndex) => {
			if (!lineupWrestler) {
				const usedWrestlerIds = new Set(initialTeamLineup.map(lineupWrestler => lineupWrestler?.id));
				const availableWrestlers = teamWrestlers
					.filter(wrestler => 
						Math.abs(weightClassNames.findIndex(weightClass => weightClass == wrestler.weightClass) - lineupIndex) <= 1 &&
						!usedWrestlerIds.has(wrestler.id))
					.sort((wrestlerA, wrestlerB) => 
						wrestlerA.lastDate < seasonStart ? 1
						: wrestlerB.lastDate < seasonStart ? -1
						: wrestlerB.rating - wrestlerA.rating);
				if (availableWrestlers.length > 0) {
					initialTeamLineup[lineupIndex] = availableWrestlers[0];
				}
			}
		});

		const opponentStatic = staticLineup
				.filter(weightClass => weightClass.opponentWrestlerId)
				.map(weightClass => ({ weightClass: weightClass.weightClass, wrestlerId: weightClass.opponentWrestlerId })),
			teamStatic = staticLineup
				.filter(weightClass => weightClass.teamWrestlerId)
				.map(weightClass => ({ weightClass: weightClass.weightClass, wrestlerId: weightClass.teamWrestlerId}));

		// Pick the best opponent linup given the team's best wrester at their default weight class
		const opponentLineup = generateLineup((weightClassOverride || weightClassNames), opponentWrestlers, initialTeamLineup, opponentStatic);

		const opponentOverrides = opponentLineup
			.filter(weightClass => weightClass.team)
			.map(weightClass => ({
				...weightClass.team,
				overrideWeightClass: weightClass.weightClass
			}));
		const teamBestLineup = generateLineup((weightClassOverride || weightClassNames), teamWrestlers, opponentOverrides, teamStatic);

		const teamLineup = teamBestLineup.map(match => {
			const existing = lineup.filter(lineupMatch => lineupMatch.weightClass == match.weightClass)
				.map(lineupMatch => ({
					...match,
					teamScore: (lineupMatch.teamScore || 0),
					opponentScore: (lineupMatch.opponentScore || 0),
					isStaticTeam: teamStatic && teamStatic.some(record => record.weightClass == match.weightClass && record.wrestlerId),
					isStaticOpponent: opponentStatic && opponentStatic.some(record => record.weightClass == match.weightClass && record.wrestlerId)
				}))
				.find(() => true)
			
			if (existing && !newLineupOverride) {
				return existing;
			}
			else {
				return {...match, teamScore: 0, opponentScore: 0, isStaticTeam: false, isStaticOpponent: false };
			}
		});

		return teamLineup;
	};

	const generateStats = (lineup) => {
		return lineup.reduce((output, match) => ({
			teamWins: output.teamWins + (
				match.teamScore > 0 ? 1
				: match.opponentScore > 0 ? 0
				: match.prediction > 0 ? 1
				: 0
			),
			teamLosses: output.teamLosses + (
				match.teamScore > 0 ? 0
				: match.opponentScore > 0 ? 1
				: match.prediction < 0 ? 1
				: 0
			),
			teamScore: output.teamScore + +match.teamScore,
			teamScorePredicted: output.teamScorePredicted + (match.prediction > 0 ? match.prediction : 0),
			opponentWins: output.opponentWins + (
				match.teamScore > 0 ? 0
				: match.opponentScore > 0 ? 1
				: match.prediction < 0 ? 1
				: 0
			),
			opponentLosses: output.opponentLosses + (
				match.teamScore > 0 ? 1
				: match.opponentScore > 0 ? 0
				: match.prediction > 0 ? 1
				: 0
			),
			opponentScore: output.opponentScore + +match.opponentScore,
			opponentScorePredicted: output.opponentScorePredicted + (match.prediction < 0 ? match.prediction * -1 : 0),
		}), { 
			teamWins: 0, 
			teamLosses: 0, 
			teamScore: 0,
			teamScorePredicted: 0, 
			opponentWins: 0, 
			opponentLosses: 0, 
			opponentScore: 0,
			opponentScorePredicted: 0 
		});
	};

	const generateLineup = (weightClasses, teamA, teamBMatches, staticTeam = []) => {
		const weights = weightClasses.map((weightClass, weightClassIndex) => ({
			weightClass: weightClass,
			weightClassPosition: weightClassIndex,
			team: null,
			opponent: teamBMatches
				.filter(match => (match.overrideWeightClass || match.weightClass) == weightClass)
				.find(() => true)
		}));

		const usedWeightClasses = new Set();
		const availableWrestlers = [].concat(teamA);

		// Set the static weight classes first
		staticTeam.forEach(staticWrestler => {
			const match = weights.find(lineupWrestler => lineupWrestler.weightClass == staticWrestler.weightClass);

			match.team = teamA.find(wrestler => wrestler.id == staticWrestler.wrestlerId);
			match.prediction = !match.opponent && !match.team ? 0 // Double forfeit
				: !match.opponent ? 6
				: !match.team ? -6
				: predictMatchOutcomePoints(match.team, match.opponent, match.weightClassPosition);

			usedWeightClasses.add(match.weightClass);
			availableWrestlers.splice(availableWrestlers.indexOf(match.team), 1);
		});

		availableWrestlers.sort((wrestlerA, wrestlerB) => 
			wrestlerA.lastDate < seasonStart ? 1
			: wrestlerB.lastDate < seasonStart ? -1
			: wrestlerB.rating - wrestlerA.rating
		);

		for (let wrestlerIndex = 0; wrestlerIndex < availableWrestlers.length; wrestlerIndex++) {
			const bestWrestler = availableWrestlers[wrestlerIndex];

			const bestMatch = weights
				.filter((match) => 
					Math.abs(weightClasses.findIndex(weightClass => weightClass == bestWrestler.weightClass) - match.weightClassPosition) <= 1 
					&& !usedWeightClasses.has(match.weightClass)
				)
				.map(match => ({
					...match,
					prediction: !match.opponent && !bestWrestler ? 0 // Double forfeit
						: !match.opponent ? 6
						: !bestWrestler ? -6
						: predictMatchOutcomePoints(bestWrestler, match.opponent, match.weightClassPosition)
				}))
				.sort((lineupWrestlerA, lineupWrestlerB) => 
					lineupWrestlerB.prediction - lineupWrestlerA.prediction
				)
				.find(() => true);
			
			if (bestMatch) {
				const match = weights.find(lineupWrestler => lineupWrestler.weightClass == bestMatch.weightClass);
				match.team = bestWrestler;
				match.prediction = bestMatch.prediction;

				usedWeightClasses.add(bestMatch.weightClass);
			}
		}

		return weights;
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

		const wrestlerPosition = weightClassNames.findIndex(weightClass => weightClass == myWrestler.weightClass);
		const opponentPosition = weightClassNames.findIndex(weightClass => weightClass == opponentWrestler.weightClass)

		let impactedWrestlerRating = myWrestler.rating;
		if (wrestlerPosition != weightClassPosition) {
			const bumpAmount = Math.abs(wrestlerPosition - weightClassPosition);
			if (bumpAmount > 0) {
				// Apply a penalty if bumped. A fixed penalty per bump is a simple approach.
				// You can adjust this penalty value (e.g., 50 Glicko points per class bumped).
				const bumpPenalty = 75 * bumpAmount; // Example: 75 Glicko points penalty per class bumped
				impactedWrestlerRating -= bumpPenalty;
			}
		}

		let impactedOpponentRating = opponentWrestler.rating;
		if (opponentPosition != weightClassPosition) {
			const bumpAmount = Math.abs(opponentPosition - weightClassPosition);
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
				selectedOpponent ?
				<h1 className="subTitle">{ selectedOpponent.name }</h1>
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
						<select value={ selectedOpponentId } onChange={ event => selectOpponent(event.target.value) }>
							<option value="">-- Select Opponent --</option>
							{
							opponentSelect.map((group, groupIndex) => 
								<optgroup key={ groupIndex } label={ group.name }>
									{
									group.schools.map((school, schoolIndex) => 
										<option key={ schoolIndex } value={ school.id }>{ school.name }</option>
									)}
								</optgroup>
							)
							}
						</select>
					</label>
					
					{
					selectedOpponent ?
					
					<label>
						Event Lineup
						<select value={ selectedEventLineup } onChange={ event => setEventLinup(event.target.value) }>
							<option value="">-- Select Event --</option>
							{
							opponentEvents.map((event, eventIndex) => 
							<option key={ eventIndex } value={ event.key }>{ event.name + " (" + event.date.toLocaleDateString() + ")" }</option>
							)}
						</select>
					</label>

					: ""
					}

					{
					savedLineups && savedLineups.length > 0 ?

					<label>
						Saved
						<select value={ selectedLineup } onChange={ event => changeLineup(event.target.value) }>
							<option value="">*New</option>
							{
							savedLineups.map(lineup => 
							<option key={ lineup.id } value={ lineup.id }>{ lineup.name }</option>
							)}
						</select>
					</label>

					: ""

					}
				</div>
				
			</div>

			{
			selectedOpponent ?
			<>

			<div className="panel resultContainer">
				<div className="teamContainer team">
					<div className="teamAbbreviation">{ "Fort Mill".split(" ").map(word => word.charAt(0)).join("").toUpperCase() }</div>
					<div className="teamActualScore">{ eventDetails.teamScore }</div>
					<div className="teamPredictedScore">{ eventDetails.teamScorePredicted }</div>
					<div className="teamName">Fort Mill</div>
					<div className="teamStats">
						wins: { eventDetails.teamWins } losses: { eventDetails.teamLosses }
					</div>
				</div>

				<div className="teamContainer opponent">
					<div className="teamAbbreviation">{ selectedOpponent.name.split(" ").map(word => word.charAt(0)).join("").toUpperCase() }</div>
					<div className="teamActualScore">{ eventDetails.opponentScore }</div>
					<div className="teamPredictedScore">{ eventDetails.opponentScorePredicted }</div>
					<div className="teamName">{ selectedOpponent.name }</div>
					<div className="teamStats">
						wins: { eventDetails.opponentWins } losses: { eventDetails.opponentLosses }
					</div>
				</div>
			</div>
			
			<div className="panel">
				<h3>Score</h3>

				<div className="runningTotalChart">
					<RunningTotalChart
						lineup={lineup}
						weightClassNames={weightClassNames}
						teamName={"Fort Mill"}
						opponentName={selectedOpponent.name}
					/>
				</div>

				<div className="startingWeight">
					<input type="range" min="0" max={ weightClassNames.length - 1 } step="1" value={ startingWeightIndex } onChange={ event => updateStartingWeightIndex(event.target.value) } />
					<div>Starting Weight: { startingWeight } lbs</div>
				</div>
			</div>
			
			<div className="panel">
				<h3>Lineup</h3>

			{
			lineup.map(match => 

				<div key={ match.weightClass } className="matchContainer">

					<div className={`wrestlerContainer ${ match.teamScore > 0 ? "win" : match.opponentScore > 0 ? "lose" : "" }`}>
						<div className="wrestlerDetails">
							<div className="button" onClick={ () => selectViewPlayer("Fort Mill", match) }>
								{ match.team ? match.team.name : "Forfeit" }
								{ 
								match.isStaticTeam ?
									/* Lock */
									<svg viewBox="0 -960 960 960">
										<path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/>
									</svg>
								: ""
								}
							</div>
							<div className="subItem">{ match.team ? match.team.weightClass + " • " + match.team.rating.toFixed(0) + " (" + match.team.deviation.toFixed(0) + ")" : "" }</div>
						</div>

						<div className="scoreDetails">
							<div>
								<select className={ match.teamScore > 0 ? "win" : match.opponentScore > 0 ? "lose" : "" } value={ match.teamScore } onChange={ event => changeScore("Fort Mill", match, event.target.value) }>
									<option value="0">0</option>
									<option value="3">3</option>
									<option value="4">4</option>
									<option value="5">5</option>
									<option value="6">6</option>
								</select>
							</div>
							<div className={ match.prediction > 0 ? "win" : "lose" }>{ match.prediction > 0 ? match.prediction : 0 }</div>
						</div>
					</div>

					<div className="weightContainer">
						{ match.weightClass }
					</div>

					<div className={`wrestlerContainer ${ match.opponentScore > 0 ? "win" : match.teamScore > 0 ? "lose" : "" }`}>
						<div className="scoreDetails">
							<div>
								<select className={ match.opponentScore > 0 ? "win" : match.teamScore > 0 ? "lose" : "" } value={ match.opponentScore } onChange={ event => changeScore(selectedOpponent.name, match, event.target.value)}>
									<option value="0">0</option>
									<option value="3">3</option>
									<option value="4">4</option>
									<option value="5">5</option>
									<option value="6">6</option>
								</select>
							</div>
							<div className={ match.prediction < 0 ? "win" : "lose" }>{ match.prediction < 0 ? match.prediction * -1 : 0 }</div>
						</div>

						<div className="wrestlerDetails">
							<div className="button" onClick={ () => selectViewPlayer(selectedOpponent.name, match) }>
								{ match.opponent ? match.opponent.name : "Forfeit" }
								{ 
								match.isStaticOpponent ?
									/* Lock */
									<svg viewBox="0 -960 960 960">
										<path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/>
									</svg>
								: ""
								}
							</div>
							<div className="subItem">
								{ match.opponent ? match.opponent.weightClass + " • " + match.opponent.rating.toFixed(0) + " (" + match.opponent.deviation.toFixed(0) + ")" : "" }
							</div>
						</div>
					</div>

				</div>

			)
			}

				<div className="saveLineupContainer">
					<input type="text" value={ saveName } onChange={ event => setSaveName(event.target.value) } />

					<button className="lineupButton save" onClick={ () => saveLineup(true) } disabled={ !saveName }>
						Save
					</button>
					
					{
					selectedLineup ?
					
					<button className="lineupButton delete" onClick={ () => saveLineup(false) }>
						Delete
					</button>

					: ""
					}
				</div>

			</div>

			</>
			: ""
			}

		</div>

		}

	</div>

	<div className={`backdrop ${ viewPlayer ? "active" : "" }`} onClick={ () => setViewPlayer(null) }></div>

	<div className={`editLineupContainer ${ viewPlayer ? "active" : "" }`}>
		{
		viewPlayer ?
		<>

		<div className="linupTop">
			<div className="lineupHeader">
				{/* Close */}
				<svg className="button" viewBox="0 -960 960 960" onClick={ () => setViewPlayer(null) }>
					<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
				</svg>
			</div>

			{
			(viewPlayer.team == "Fort Mill" && !viewPlayer.match.team) || (viewPlayer.team != "Fort Mill" && !viewPlayer.match.opponent) ?

				<div className="wrestlerName">Forfeit</div>
			
			:
			<>
			<div className="wrestlerName">
				{
				viewPlayer.team == "Fort Mill" ? 
					<a href={ `/portal/wrestler.html?id=${ viewPlayer.match.team.id }` } target="_blank">
						{viewPlayer.match.team.name}
					</a>
					
					: 
				
					<a href={ `/portal/wrestler.html?id=${ viewPlayer.match.opponent.id }` } target="_blank">
						{viewPlayer.match.opponent.name}
					</a>
				}
			</div>
			<div className="wrestlerStats">
				{
				viewPlayer.team == "Fort Mill" ? 
					`${viewPlayer.match.team.rating.toFixed(0)} / ${ viewPlayer.match.team.deviation.toFixed(0) }`
					: `${viewPlayer.match.opponent.rating.toFixed(0)} / ${ viewPlayer.match.opponent.deviation.toFixed(0) }`
				}
			</div>
			</>
			}
		</div>
		
		{
		(viewPlayer.team == "Fort Mill" && viewPlayer.match.team) || (viewPlayer.team != "Fort Mill" && viewPlayer.match.opponent) ?
		<div className="lineupContainer">
			<div className="lineupTitle">Comparison Probability</div>

			<div className="probabilityChart">
				<ProbabilityChart team={viewPlayer.match.team} opponent={viewPlayer.match.opponent} />
			</div>
		</div>
		: ""
		}

		<div className="lineupContainer">
			<div className="lineupTitle">Alternate Wrestlers</div>
			
			<div>
				<div className="lineupAlternate">
					<div></div>
					<div className="alternateName">Forfeit</div>
					<div className="alternateSelect button" onClick={ () => selectAlternate(viewPlayer.team, viewPlayer.match, null) }>
						{/* Check */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
						</svg>
					</div>
				</div>

				<div className="lineupAlternateHeader">
					Top Picks
				</div>

				<div className="lineupAlternates">
				{
				viewPlayer.topPicks.map((topPick, topPickIndex) =>
					<div key={ topPickIndex } className="lineupAlternate">
						<div className="alternateWeightClass">{ topPick.weightClass }</div>

						<div>
							<div className="alternateName">
								<a href={ `/portal/wrestler.html?id=${ topPick.id }` } target="_blank">
									{ topPick.name }
								</a>
							</div>
							<div className="subItem">{`${topPick.rating?.toFixed(0)} / ${ topPick.deviation?.toFixed(0) }`}</div>
							<div className="subItem">
								Status: 
								{
								lineup.filter(match => match.team && match.team.id == topPick.id || match.opponent && match.opponent.id == topPick.id)
									.map(match => match.weightClass)
									.find(() => true) || " available"
								}
							</div>
						</div>
						
						<div className="alternateSelect button" onClick={ () => selectAlternate(viewPlayer.team, viewPlayer.match, topPick.id) }>
							{/* Check */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
							</svg>
						</div>
					</div>
				)}
				</div>

				<div className="lineupAlternateHeader">
					Alternates
				</div>

				<div className="lineupAlternates">
				{
				viewPlayer.alternatePicks.map((alternatePick, alternatePickIndex) =>
					<div key={ alternatePickIndex } className="lineupAlternate">
						<div className="alternateWeightClass">{ alternatePick.weightClass }</div>

						<div>
							<div className="alternateName">{ alternatePick.name }</div>
							<div className="subItem">{`${alternatePick.rating?.toFixed(0)} / ${ alternatePick.deviation?.toFixed(0) }`}</div>
							<div className="subItem">Status: unassigned</div>
						</div>
						
						<div className="alternateSelect button" onClick={ () => selectAlternate(viewPlayer.team, viewPlayer.match, alternatePick.id) }>
							{/* Check */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
							</svg>
						</div>
					</div>
				)}
				</div>
			
			</div>
		</div>
		
		</>
		: ""
		}

	</div>

</div>

	);
		
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Opponent />);
export default Opponent;
