import React, { useEffect, useState, useRef } from "react";

const TeamComparePredict = props => {
	
	const [bestLineup, setBestLineup] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [stats, setStats] = useState({ wins: 0, losses: 0, pointDiff: 0 });
	const workerRef = useRef(null);

	const handleStop = () => {
		if (workerRef.current) {
			workerRef.current.terminate();
			workerRef.current = null;
			setIsLoading(false);
		}
	};

	useEffect(() => {
		const computeLineup = () => {
			const weightClasses = [].concat(props.weightClasses)
				.sort((weightClassA, weightClassB) => +weightClassA.name - +weightClassB.name)
				.map((weightClass, weightClassIndex) => ({
					name: weightClass.name,
					position: weightClassIndex,
					opponentWrestler: weightClass.opponentWrestler,
					opponentRating: weightClass.opponentWrestler.rating
				}));

			const competingWrestlers = new Map();
			props.weightClasses.forEach(weightClass => {
				const activeWrestlers = [...weightClass.teamWrestlers]
					.filter(wrestler => new Date(wrestler.lastEvent.date) >= new Date(new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1, 8, 1));

				const topWrestlers = activeWrestlers
					.sort((wrestlerA, wrestlerB) => wrestlerB.rating - wrestlerA.rating)
					.slice(0, 2);
				
				topWrestlers.forEach(wrestler => {
					if (!competingWrestlers.has(wrestler.id)) {
						competingWrestlers.set(wrestler.id, wrestler);
					}
				});
			});

			const team = Array.from(competingWrestlers.values())
				.map(wrestler => ({...wrestler, weightClassPosition: weightClasses.find(weightClass => weightClass.name === wrestler.weightClass).position }));
			
			const matchups = weightClasses.map(weightClass => ({
				...weightClass,
				team: team.filter(wrestler => Math.abs(wrestler.weightClassPosition - weightClass.position) <= 1)
			}));

			setIsLoading(true);
			setBestLineup([]);

			workerRef.current = new Worker(new URL('./lineup-worker.js', import.meta.url));

			workerRef.current.onmessage = (e) => {
				const { lineup } = e.data;
				setBestLineup(lineup);
				setIsLoading(false);
				if (workerRef.current) {
					workerRef.current.terminate();
					workerRef.current = null;
				}
			};

			workerRef.current.onerror = (e) => {
				console.error('Error in lineup worker:', e);
				setIsLoading(false);
				if (workerRef.current) {
					workerRef.current.terminate();
					workerRef.current = null;
				}
			};

			workerRef.current.postMessage({ matchups });
		};

		if (props.weightClasses && props.weightClasses.length > 0 && props.weightClasses.some(weightClass => weightClass.opponentWrestlers?.length > 0)) {
			// computeLineup();

			const weightClasses = props.weightClasses
				.sort((weightClassA, weightClassB) => +weightClassA. weightClass - +weightClassB.weightClass)
				.map((weightClass, weightClassIndex) => ({...weightClass, position: weightClassIndex }));
			
			const team = weightClasses.flatMap(weightClass => 
				weightClass.teamWrestlers
					.map(wrestler => ({
						id: wrestler.id,
						name: wrestler.name,
						weightClass: weightClass.name,
						rating: wrestler.rating,
						weightClassRange: weightClasses
							.filter(allWeights => Math.abs(allWeights.position - weightClass.position) <= 1)
							.map(allWeights => allWeights.name),
						opponents: weightClasses
							.filter(opponentWeightClass => Math.abs(opponentWeightClass.position - weightClass.position) <= 1)
							.map(opponentWeightClass => ({
								weightClass: opponentWeightClass.name,
								id: opponentWeightClass.opponentWrestler.id,
								name: opponentWeightClass.opponentWrestler.name, 
								opponentRating: opponentWeightClass.opponentWrestler.rating,
								matchupPoints: wrestler.rating - opponentWeightClass.opponentWrestler.rating,
								isWin: wrestler.rating > opponentWeightClass.opponentWrestler.rating
							}))
							.sort((opponentA, opponentB) => 
								opponentA.isWin !== opponentB.isWin ?
									opponentA.isWin ? -1 : 1 // Sort the winners to the top
								: opponentA.isWin ? // If the opponent is a winner
									opponentA.matchupPoints - opponentB.matchupPoints // Sort accending
									: opponentB.matchupPoints - opponentA.matchupPoints // Sort decending
							)
					}))
			);

			const opponents = weightClasses
				.flatMap(weightClass => weightClass.opponentWrestlers
					.map(opponent => ({
						id: opponent.id,
						name: opponent.name,
						weightClass: weightClass.name,
						rating: opponent.rating,
						weightClassRange: weightClasses
							.filter(allWeights => Math.abs(allWeights.position - weightClass.position) <= 1)
							.map(allWeights => allWeights.name)
					}))
				);

			const pick1 = team.map(wrestler => ({
				teamId: wrestler.id,
				team: wrestler.name,
				teamWeight: wrestler.weightClass,
				teamRating: wrestler.rating,
				weightClass: wrestler.opponents[0].weightClass,
				opponentId: wrestler.opponents[0].id,
				opponent: wrestler.opponents[0].name,
				opponentRating: wrestler.opponents[0].opponentRating,
				teamPoints: wrestler.opponents[0].matchupPoints,
				isWin: wrestler.opponents[0].isWin
			}));

			const pick1Matches = [...new Set(pick1.map(match => match.opponentId))]
				.map(opponent => pick1
					.filter(pick => pick.opponentId === opponent)
					.sort((pickA, pickB) => pickA.isWin !== pickB.isWin ? pickA.isWin ? -1 : 1 : pickB.teamPoints - pickA.teamPoints)
					.find(() => true)
				);
			
			const matchups = weightClasses.map(weightClass => {
				let match = pick1Matches.find(match => match.weightClass === weightClass.name);

				if (!match) {
					// If this isn't anyone's first pick, then find the next best wrestler

					match = team
						.map(wrestler => {
							// Get the opponent for this weight class, if the wrestler can't wrestle this weight class, this will be null
							const opponent = wrestler.opponents
								.find(opponent => opponent.weightClass === weightClass.name);

							return {
								teamId: wrestler.id,
								team: wrestler.name,
								teamWeight: wrestler.weightClass,
								teamRating: wrestler.rating,
								weightClass: opponent?.weightClass,
								opponentId: opponent?.id,
								opponent: opponent?.name,
								opponentRating: opponent?.opponentRating,
								teamPoints: opponent?.matchupPoints,
								isWin: opponent?.isWin
							};
						})
						.filter(wrestler => wrestler.opponent && !pick1Matches.some(match => match.teamId === wrestler.teamId))
						.sort((wrestlerA, wrestlerB) => wrestlerA.isWin !== wrestlerB.isWin ? wrestlerA.isWin ? -1 : 1 : wrestlerB.teamPoints - wrestlerA.teamPoints)
						.find(() => true);
					
				}

				return {
					weightClass: weightClass.name,
					position: weightClass.position,
					teamId: match?.teamId,
					team: match?.team,
					teamWeight: match?.teamWeight,
					teamRating: match?.teamRating,
					opponentId: match?.opponentId,
					opponent: match?.opponent,
					opponentRating: match?.opponentRating,
					teamPoints: match?.teamPoints,
					isWin: match?.isWin,
					teamOptions: team
						.filter(wrestler => wrestler.weightClassRange.includes(weightClass.name))
						.map(wrestler => {
							const opponent = wrestler.opponents
								.find(opponent => opponent.weightClass === weightClass.name);
							
							return {
								teamId: wrestler.id,
								team: wrestler.name,
								teamRating: wrestler.rating,
								isWin: opponent?.isWin,
								teamPoints: opponent?.matchupPoints
							}
						})
						.sort((wrestlerA, wrestlerB) => wrestlerA.isWin !== wrestlerB.isWin ? wrestlerA.isWin ? -1 : 1 : wrestlerB.teamPoints - wrestlerA.teamPoints),
					opponentOptions: opponents
						.filter(opponent => opponent.weightClassRange.includes(weightClass.name))
						.map(opponent => ({
							opponentId: opponent.id,
							opponent: opponent.name,
							opponentRating: opponent.rating,
							isWin: match?.teamRating < opponent.rating,
							teamPoints: match?.teamRating - opponent.rating
						}))
						.sort((opponentA, opponentB) => opponentB.rating - opponentA.rating)
				};
			});

			const teamStats = {
				wins: matchups.filter(match => match.isWin).length,
				losses: matchups.filter(match => !match.isWin).length,
				pointDiff: matchups.reduce((total, match) => total + match.teamPoints, 0)
			};
			
			console.log({ team, matchups, pick1Matches });

			setStats(teamStats);
			setBestLineup(matchups);
			setIsLoading(false);
		}

		return () => {
			if (workerRef.current) {
				workerRef.current.terminate();
				workerRef.current = null;
			}
		};
	}, [ props.weightClasses ]);

	return (

<div className="panel expandable">
{
isLoading ?
	<div>
		<img src="/media/wrestlingloading.gif" alt="Loading..." />
		<p>Calculating optimal lineup...</p>
		<button onClick={handleStop}>Stop</button>
	</div>

: !isLoading && bestLineup && bestLineup.length > 0 ?
<>
	<div className="statsContainer">
		<div>
			<div className="statsTeam">Fort Mill</div>
			<div>{ stats.wins }</div>
		</div>

		<div>
			<div>
				{ stats.pointDiff > 0 ? "+" : "" }
				{ stats.pointDiff.toFixed(0) }
			</div>
		</div>

		<div>
			<div className="statsTeam">Opponent</div>
			<div>{ stats.losses }</div>
		</div>
	</div>
{
bestLineup.map((match, matchIndex) =>
	<div key={matchIndex} className="predictMatchContainer">
		
		<div className={`predictWrestler ${match.isWin ? "win" : "loss" }`}>
			<div>{ match.team }</div>
			<div>{ match.teamRating.toFixed(0) }</div>
			<div>{ match.teamPoints.toFixed(0) }</div>
			
			<div className="predictOptions">
			{
			match.teamOptions
			.slice(0, 3)
			.map((option, optionIndex) =>
				<div key={optionIndex} className="predictOption">
					{option.team}<br />
					{ `${option.teamRating.toFixed(0)} • ${option.teamPoints.toFixed(0)}` }
				</div>
			)
			}
			</div>
			
		</div>

		<div className="predictWeightClass">
			{ match.weightClass }
		</div>

		<div className={`predictWrestler ${match.isWin ? "loss" : "win" }`}>
			<div>{ match.opponent }</div>
			<div>{ match.opponentRating.toFixed(0) }</div>
			<div>{ (match.teamPoints * -1).toFixed(0) }</div>
			
			<div className="predictOptions">
			{
			match.opponentOptions
			.slice(0, 3)
			.map((option, optionIndex) =>
				<div key={optionIndex} className="predictOption">
					{option.opponent}<br />
					{ `${option.opponentRating.toFixed(0)} • ${option.teamPoints.toFixed(0)}` }
				</div>
			)
			}
			</div>

		</div>
		
	</div>
)
}	
</>
: ""

}
</div>
	)
}

export default TeamComparePredict;