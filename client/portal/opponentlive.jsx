import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import ProbabilityChart from "./include/ProbabilityChart.jsx";
import RunningTotalChart from "./include/RunningTotalChart.jsx";
import "./include/index.css";
import "./include/opponent.css";

const OpponentLive = () => {

	const seasonStart = new Date() > new Date(new Date().getFullYear(), 11, 1) ?
		new Date(new Date().getFullYear(), 8, 1)
		: new Date(new Date().getFullYear() - 1, 8, 1);
		
	const originalWeightClasses = ["106","113","120","126","132","138","144","150","157","165","175","190","215","285"];

	const [ weightClassNames, setWeightClassNames ] = useState(originalWeightClasses);
	const [ startingWeightIndex, setStartingWeightIndex ] = useState(0)
	const [ startingWeight, setStartingWeight ] = useState("106")

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ teamWrestlers, setTeamWrestlers ] = useState([]);

	const [ opponentSelect, setOpponentSelect ] = useState([]);
	const [ opponents, setOpponents ] = useState([]);
	const [ selectedOpponent, setSelectedOpponent ] = useState("");
	const [ selectedOpponentId, setSelectedOpponentId ] = useState("");
	const [ opponentWrestlers, setOpponentWrestlers ] = useState([]);

	const [ saveName, setSaveName ] = useState("");
	const [ savedLineups, setSavedLineups ] = useState([]);
	const [ selectedLineup, setSelectedLineup ] = useState("");
	const [ lineup, setLineup ] = useState([]);
	const [ eventDetails, setEventDetails ] = useState({})

	const [ viewPlayer, setViewPlayer ] = useState(null);

	const generateStats = (lineup) => {
		const stats = lineup.reduce((output, match) => ({
			teamWins: output.teamWins + (
				match.teamScore > 0 ? 1
				: match.opponentScore > 0 ? 0
				: 0
			),
			teamWinPredicted: output.teamWinPredicted + (match.prediction > 0 ? 1 : 0),
			teamScore: output.teamScore + +match.teamScore,
			teamScorePredicted: output.teamScorePredicted + (match.prediction > 0 ? match.prediction : 0),
			opponentWins: output.opponentWins + (
				match.teamScore > 0 ? 0
				: match.opponentScore > 0 ? 1
				: 0
			),
			opponentLosses: output.opponentLosses + (
				match.teamScore > 0 ? 1
				: match.opponentScore > 0 ? 0
				: 0
			),
			opponentWinPredicted: output.opponentWinPredicted + (match.prediction < 0 ? 1 : 0),
			opponentScore: output.opponentScore + +match.opponentScore,
			opponentScorePredicted: output.opponentScorePredicted + (match.prediction < 0 ? match.prediction * -1 : 0),
		}), { 
			teamWins: 0, 
			teamWinPredicted: 0,
			teamScore: 0,
			teamScorePredicted: 0, 
			opponentWins: 0, 
			opponentLosses: 0, 
			opponentWinPredicted: 0,
			opponentScore: 0,
			opponentScorePredicted: 0 
		});

		const remainingMatches = lineup.length - (stats.teamWins + stats.opponentWins),
			remainingPoints = remainingMatches * 6;

		stats.teamToWin = Math.ceil((remainingPoints + stats.opponentScore - stats.teamScore + 1) / 2);
		stats.opponentToWin = Math.ceil((remainingPoints + stats.teamScore - stats.opponentScore + 1) / 2);

		return stats;
	};

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

				if (loggedInUser.session && loggedInUser.session.matchSave && loggedInUser.session.matchSave.length > 0) {
					setSavedLineups(loggedInUser.session.matchSave
						.filter(save => save.opponentId == opponent.id)
						.map(save => ({...save, id: save["_id"] }))
					);
				}

				
				const newLineup = originalWeightClasses.map((weightClass, index) => ({
					weightClass: weightClass,
					weightClassPosition: index,
					team: null,
					teamSaved: null,
					teamScore: 0,
					opponent: null,
					opponentSaved: null,
					opponentScore: 0,
					prediction: 0
				}));
				
				setOpponentWrestlers(opponentWrestlers);
				setIsLoading(false);
				setSaveName("");
				setSelectedLineup("");
				setLineup(newLineup);
				setEventDetails(generateStats(newLineup));
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const changeLineup = lineupId => {
		let startingWeightClassIndex,
			newWeightClasses,
			newLineup;

		if (lineupId) {
			// Selected an existing lineup
			const loadLineup = savedLineups.find(lineup => lineup.id == lineupId);
			
			const weightIndex = weightClassNames.findIndex(weightClass => weightClass == loadLineup.startingWeightClass);
			
			startingWeightClassIndex = originalWeightClasses.findIndex(weightClass => weightClass == loadLineup.startingWeightClass);
			
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
					team: null,
					teamSaved: teamWrestler,
					teamScore: 0,
					opponent: null,
					opponentSaved: opponentWrestler,
					opponentScore: 0,
					prediction: lineupMatch.teamScore > 0 ? lineupMatch.teamScore
						: lineupMatch.opponentScore > 0 ? lineupMatch.opponentScore * -1
						: 0
				}
			});
		}
		else {
			// New lineup
			startingWeightClassIndex = 0;
			
			newWeightClasses = [...weightClassNames];
			newLineup = originalWeightClasses.map((weightClass, index) => ({
				weightClass: weightClass,
				weightClassPosition: index,
				team: null,
				teamSaved: null,
				teamScore: 0,
				opponent: null,
				opponentSaved: null,
				opponentScore: 0,
				prediction: 0
			}));
		}

		setSelectedLineup(lineupId);
		setStartingWeight(originalWeightClasses[startingWeightClassIndex]);
		setStartingWeightIndex(startingWeightClassIndex);

		setWeightClassNames(newWeightClasses);
		setSaveName("");
		setLineup(newLineup);
		setEventDetails(generateStats(newLineup));
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

	const changeScore = (teamName, match, score) => {
		let runningPrediction = 0,
			runningScore = 0;

		const scoreLineup = lineup.map(lineupMatch => {
			if (lineupMatch.teamScore || lineupMatch.opponentScore || lineupMatch.weightClass == match.weightClass) {
				// Only update running totals for matches that have a score or are the match being updated
				runningPrediction += lineupMatch.prediction || 0;
				runningScore += 
					lineupMatch.weightClass == match.weightClass ? // updating this match
							+score == 0 ? 0 // no score
							: teamName == "Fort Mill" ? +score 
							: teamName != "Fort Mill" ? +score * -1
							: 0
						: lineupMatch.teamScore > 0 ? lineupMatch.teamScore // existing match team score
						: lineupMatch.opponentScore > 0 ? lineupMatch.opponentScore * -1 // existing match opponent score
						: 0;
			}

			return {
				...lineupMatch,
				teamScore: match.weightClass != lineupMatch.weightClass ? lineupMatch.teamScore 
					: score == 0 ? 0 // no score
					: teamName == "Fort Mill" ? +score 
					: 0,
				opponentScore: match.weightClass != lineupMatch.weightClass ? lineupMatch.opponentScore 
					: score == 0 ? 0 // no score
					: teamName != "Fort Mill" ? +score
					: 0,
				running: runningPrediction,
				runningScore: runningScore,
				scoreDifference: runningScore - runningPrediction
			};
		});

		setLineup(scoreLineup);
		setEventDetails(generateStats(scoreLineup));
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
		const wrestler = (teamName == "Fort Mill" ? teamWrestlers : opponentWrestlers)
				.find(wrestler => wrestler.id == wrestlerId);

		const newLineup = lineup.map(lineupMatch => {
			if (lineupMatch.weightClass === match.weightClass) {
				return {
					...lineupMatch,
					team: teamName === "Fort Mill" ? wrestler || "forfeit" : lineupMatch.team,
					opponent: teamName !== "Fort Mill" ? wrestler || "forfeit" : lineupMatch.opponent
				};
			}
			return lineupMatch;
		});
		
		const eventStats = generateStats(newLineup);

		setLineup(newLineup);
		setEventDetails(eventStats);
		setViewPlayer(null);
	};

	const saveLineup = () => {
		
		const saveLineup = lineup.map(lineupMatch => ({
				weightClass: lineupMatch.weightClass,
				isStaticTeam: true,
				teamWrestlerId: lineupMatch.team?.id,
				teamScore: lineupMatch.teamScore,
				isStaticOpponent: true,
				opponentWrestlerId: lineupMatch.opponent?.id,
				opponentScore: lineupMatch.opponentScore
			}));

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
				
				setIsLoading(false);
			})
			.catch(error => {
				console.warn(error);
			});
		
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
				<h1>Live Match</h1>
				
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
					savedLineups && savedLineups.length > 0 ?

					<label>
						Saved
						<select value={ selectedLineup } onChange={ event => changeLineup(event.target.value) }>
							<option value="">Unsaved</option>
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
			lineup && lineup.length > 0?
			<>

			<div className="panel resultContainer">
				<div className="teamContainer team">
					<div className="teamAbbreviation">{ "Fort Mill".split(" ").map(word => word.charAt(0)).join("").toUpperCase() }</div>
					<div className="teamActualScore">{ eventDetails.teamScore }</div>
					<div className="teamPredictedScore">{ eventDetails.teamScorePredicted }</div>
					<div className="teamName">Fort Mill</div>

					<div className="winTable">
						<table>
						<tbody>
						<tr>
							<td>Wins</td>
							<td>{ eventDetails.teamWins } <span className="teamStats">({ eventDetails.teamWinPredicted })</span></td>
						</tr>
						<tr>
							<td>Losses</td>
							<td>{ eventDetails.opponentWins } <span className="teamStats">({ eventDetails.opponentWinPredicted })</span></td>
						</tr>
						<tr>
							<td>To Win</td>
							<td>
								<div>{ eventDetails.teamToWin }</div>
								{
								eventDetails.teamToWin < 0 ?
									<div className="teamStats positive">clinched</div>
								: eventDetails.opponentToWin <= 0 ?
									<div className="teamStats negative">lost</div>
								: ""
								}
							</td>
						</tr>
						</tbody>
						</table>
					</div>
				</div>

				<div className="teamContainer opponent">
					<div className="teamAbbreviation">{ selectedOpponent.name.split(" ").map(word => word.charAt(0)).join("").toUpperCase() }</div>
					<div className="teamActualScore">{ eventDetails.opponentScore }</div>
					<div className="teamPredictedScore">{ eventDetails.opponentScorePredicted }</div>
					<div className="teamName">{ selectedOpponent.name }</div>
					
					<div className="winTable">
						<table>
						<tbody>
						<tr>
							<td>{ eventDetails.opponentWins } <span className="teamStats">({ eventDetails.opponentWinPredicted })</span></td>
							<td>Wins</td>
						</tr>
						<tr>
							<td>{ eventDetails.teamWins } <span className="teamStats">({ eventDetails.teamWinPredicted })</span></td>
							<td>Losses</td>
						</tr>
						<tr>
							<td>
								<div>{ eventDetails.opponentToWin }</div>
								{
								eventDetails.opponentToWin < 0 ?
									<div className="teamStats positive">clinched</div>
								: eventDetails.opponentToWin <= 0 ?
									<div className="teamStats negative">lost</div>
								: ""
								}
							</td>
							<td>To Win</td>
						</tr>
						</tbody>
						</table>
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
								{ match.team ? match.team.name : "—" }
							</div>
							<div className="subItem">
								{ match.teamSaved ? match.teamSaved.name : "" }
							</div>
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
							<div className={ match.prediction > 0 ? "win" : match.prediction < 0 ? "lose" : "" }>{ match.prediction }</div>
						</div>
					</div>

					<div className="weightContainer">
						<div>{ match.weightClass }</div>

						<div className={`scoreDifference ${ match.scoreDifference > 0 ? "positive" : match.scoreDifference < 0 ? "negative" : "" }`}>
							{ match.scoreDifference }
						</div>
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
							<div className={ match.prediction < 0 ? "win" : match.prediction > 0 ? "lose" : "" }>{ match.prediction ? match.prediction * -1 : 0 }</div>
						</div>

						<div className="wrestlerDetails">
							<div className="button" onClick={ () => selectViewPlayer(selectedOpponent.name, match) }>
								{ match.opponent ? match.opponent.name : "—" }
							</div>
							<div className="subItem">
								{ match.opponentSaved ? match.opponentSaved.name : "" }
							</div>
						</div>
					</div>

				</div>

			)
			}

				<div className="saveLineupContainer">
					<input type="text" value={ saveName } onChange={ event => setSaveName(event.target.value) } />

					<button className="lineupButton save" onClick={ () => saveLineup() } disabled={ !saveName }>
						Save
					</button>
				</div>

			</div>

			</>
			: "" }

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

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<OpponentLive />);
export default OpponentLive;