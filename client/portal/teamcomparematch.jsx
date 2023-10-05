import React, { useEffect, useState, useRef } from "react";
import "./include/team.css";

const TeamCompareMatch = props => {

	const [ opponent, setOpponent ] = useState(null);
	const [ weightClasses, setWeightClasses ] = useState([]);

	const [ startingWeight, setStartingWeight ] = useState(0);
	const [ dropDown, setDropDown ] = useState({});
	const [ scoreChart, setScoreChart ] = useState();
	const [ isLoading, setIsLoading ] = useState(false);

	useEffect(() => {
		if (props.selectedOpponentId) {
			selectOpponent(props.selectedOpponentId);
		}
	}, [ props.selectedOpponentId ]);

	useEffect(() => {
		if (!props.team) {
			return;
		}
		else if (!props.team.wrestlers) {
			return;
		}
		else if (!props.team.wrestlers.some(wrestler => wrestler.weightClass)) {
			return;
		}

		const weightClassNames = [...new Set(props.team.wrestlers.map(wrestler => wrestler.weightClass))]
			.sort((weightClassA, weightClassB) => weightClassA > weightClassB ? 1 : -1);
		
		const newWeightClassMatches = weightClassNames.map(weightClass => {
			const sessionMatch = opponent && props.compareData ? props.compareData.filter(session => session.opponentId == opponent.id)
					.flatMap(session => session.weightClasses)
					.find(sessionWeight => sessionWeight.name == weightClass)
				: null 
			
			const teamWrestlersSorted = props.team.wrestlers.map(wrestler => ({...wrestler, name: wrestler.firstName + " " + wrestler.lastName}))
				.sort((wrestlerA, wrestlerB) =>
					sessionMatch && sessionMatch.teamWrestler == wrestlerA.id ? -1
					: sessionMatch && sessionMatch.teamWrestler == wrestlerB.id ? 1
					: /varsity/i.test(wrestlerA.division) && !/varsity/i.test(wrestlerB.division) ? -1
					: !/varsity/i.test(wrestlerA.division) && /varsity/i.test(wrestlerB.division) ? 1
					: wrestlerA.weightClass == wrestlerB.weightClass && wrestlerA.position < wrestlerB.position ? -1
					: wrestlerA.weightClass == wrestlerB.weightClass && wrestlerA.position > wrestlerB.position ? 1
					: wrestlerA.weightClass == weightClass && wrestlerB.weightClass != weightClass ? -1
					: wrestlerA.weightClass != weightClass && wrestlerB.weightClass == weightClass ? 1
					: Math.abs(wrestlerA.weightClass - weightClass) - Math.abs(wrestlerB.weightClass - weightClass)
				),
				selectedTeamWrestler = !sessionMatch || !sessionMatch.teamWrestler ? (teamWrestlersSorted.find(() => true) || { name: "" }) // If no session data, then pick first wrestler
					: teamWrestlersSorted.some(wrestler => wrestler.id == sessionMatch.teamWrestler) ? teamWrestlersSorted.find(wrestler => wrestler.id == sessionMatch.teamWrestler)
					: { name: sessionMatch.teamWrestler };
			
			const opponentWrestlersSorted = opponent ? opponent.wrestlers.map(wrestler => ({...wrestler, name: wrestler.firstName + " " + wrestler.lastName }))
				.sort((wrestlerA, wrestlerB) =>
					sessionMatch && sessionMatch.opponentWrestler == wrestlerA.id ? -1
					: sessionMatch && sessionMatch.opponentWrestler == wrestlerB.id ? 1
					: /varsity/i.test(wrestlerA.division) && !/varsity/i.test(wrestlerB.division) ? -1
					: !/varsity/i.test(wrestlerA.division) && /varsity/i.test(wrestlerB.division) ? 1
					: wrestlerA.weightClass == wrestlerB.weightClass && wrestlerA.position < wrestlerB.position ? -1
					: wrestlerA.weightClass == wrestlerB.weightClass && wrestlerA.position > wrestlerB.position ? 1
					: wrestlerA.weightClass == weightClass && wrestlerB.weightClass != weightClass ? -1
					: wrestlerA.weightClass != weightClass && wrestlerB.weightClass == weightClass ? 1
					: Math.abs(wrestlerA.weightClass - weightClass) - Math.abs(wrestlerB.weightClass - weightClass)
				) : [],
				selectedOpponentWrestler = !sessionMatch || !sessionMatch.opponentWrestler ? (opponentWrestlersSorted.find(() => true) || { name: "" }) // If no session data, then pick first wrestler
					: opponentWrestlersSorted.some(wrestler => wrestler.id == sessionMatch.opponentWrestler) ? opponentWrestlersSorted.find(wrestler => wrestler.id == sessionMatch.opponentWrestler)
					: { name: sessionMatch.opponentWrestler };
			
			return {
				name: weightClass,
				teamWrestlers: teamWrestlersSorted,
				selectedTeamWrestler: selectedTeamWrestler,
				opponentWrestlers: opponentWrestlersSorted,
				selectedOpponentWrestler: selectedOpponentWrestler,
				teamScore: !sessionMatch ? "" 
					: sessionMatch.teamScore === 0 ? 0
					: sessionMatch.teamScore || "",
				opponentScore: !sessionMatch ? "" 
					: sessionMatch.opponentScore === 0 ? 0
					: sessionMatch.opponentScore || ""
			}
		});

		setWeightClasses(newWeightClassMatches);
		saveSession(newWeightClassMatches);

	}, [ props.team, opponent ]);

	useEffect(() => {
		if (weightClasses && weightClasses.length > 0) {
			const chartData = {
				svg: { width: 350, height: 200 },
				leftAxis: { top: 0 },
				bottomAxis: { left: 25, top: 180 },
				chart: { left: 25, top: 20, width: 325, height: 150 },
				team: {},
				opponent: {}
			};

			let teamRunningScore = 0,
				opponentRunningScore = 0;

			const weightClassesOrdered = [
				...weightClasses.slice(startingWeight),
				...weightClasses.slice(0, startingWeight)
			]

			const scores = weightClassesOrdered.map(weightClass => ({ 
				name: weightClass.name, 
				teamScore: weightClass.teamScore || 0, 
				teamRunning: weightClass.teamScore > 0 ? teamRunningScore += +weightClass.teamScore
					: weightClass.opponentScore > 0 ? teamRunningScore += (+weightClass.opponentScore * -1)
					: teamRunningScore,
				opponentScore: weightClass.opponentScore || 0,
				opponentRunning: weightClass.opponentScore > 0 ? opponentRunningScore += +weightClass.opponentScore
					: weightClass.teamScore > 0 ? opponentRunningScore += (+weightClass.teamScore * -1)
					: opponentRunningScore
			}));

			const maxScore = scores.reduce((max, score) => score.teamRunning > max ? score.teamRunning : score.opponentRunning > max ? score.opponentRunning : max, 0) || 10,
				minScore = scores.reduce((max, score) => score.teamRunning < max ? score.teamRunning : score.opponentRunning < max ? score.opponentRunning : max, 0) || -10,
				range = Math.abs(maxScore) + Math.abs(minScore);
			
			const pointWidth = chartData.chart.width / scores.length;

			chartData.team.points = scores.map((score, scoreIndex) => ({
				x: ((scoreIndex * pointWidth) + (pointWidth / 2)),
				y: (chartData.chart.height - ((((range / 2) + score.teamRunning) * chartData.chart.height) / range))
			}));

			chartData.team.labels = chartData.team.points.map((point, pointIndex) => ({
				x: point.x,
				y: point.y - 10,
				text: scores[pointIndex].teamRunning
			}));

			chartData.team.path = chartData.team.points.map((point, pointIndex) =>
				(pointIndex == 0 ? "M" : "L") + point.x + " " + point.y
				).join(" ");

			chartData.opponent.points = scores.map((score, scoreIndex) => ({
				x: ((scoreIndex * pointWidth) + (pointWidth / 2)),
				y: (chartData.chart.height - ((((range / 2) + score.opponentRunning) * chartData.chart.height) / range))
			}));

			chartData.opponent.labels = chartData.opponent.points.map((point, pointIndex) => ({
				x: point.x,
				y: point.y - 10,
				text: scores[pointIndex].opponentRunning
			}));

			chartData.opponent.path = chartData.opponent.points.map((point, pointIndex) =>
				(pointIndex == 0 ? "M" : "L") + point.x + " " + point.y
				).join(" ");
				
			chartData.leftAxis.text = [
				{ x: chartData.chart.left - 5, y: 5, text: maxScore, align: "hanging" },
				{ x: chartData.chart.left - 5, y: chartData.chart.top + (chartData.chart.height / 2), text: 0, align: "middle" },
				{ x: chartData.chart.left - 5, y: chartData.bottomAxis.top, text: minScore, align: "baseline" }
			];

			chartData.bottomAxis.text = scores.map((score, scoreIndex) => ({ 
				x: (scoreIndex * pointWidth) + (pointWidth / 2),
				y: 15,
				text: score.name
			}));

			setScoreChart(chartData);
		}
	}, [ weightClasses, startingWeight ]);

	const saveSession = updatedWeightClasses => {

		if (opponent) {
			const sessionSave = {
				opponentId: opponent.id,
				weightClasses: updatedWeightClasses.map(weightClass => ({
					name: weightClass.name,
					teamWrestler: !weightClass.selectedTeamWrestler ? null : weightClass.selectedTeamWrestler.id ? weightClass.selectedTeamWrestler.id : weightClass.selectedTeamWrestler.name,
					teamScore: weightClass.teamScore === "" ? null : +weightClass.teamScore,
					opponentWrestler: !weightClass.selectedOpponentWrestler ? null : weightClass.selectedOpponentWrestler.id ? weightClass.selectedOpponentWrestler.id : weightClass.selectedOpponentWrestler.name,
					opponentScore: weightClass.opponentScore === "" ? null : +weightClass.opponentScore,
				}))
			};

			props.saveCompareData(sessionSave);
		}
	};

	const selectOpponent = () => {
		setIsLoading(true);

		fetch(`/api/teamgetopponentwrestlers?opponentid=${ props.selectedOpponentId }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setOpponent({ id: props.selectedOpponentId, wrestlers: data.wrestlers });
				setIsLoading(false);
			})
			.catch(error => {
				console.warn(error);
			});
		
	};

	const changeTeamWrestlerName = (weightClass, name) => {
		const newWeightClasses = weightClasses.map(listWeight => ({ ...listWeight, selectedTeamWrestler: listWeight.name == weightClass ? { name: name } : listWeight.selectedTeamWrestler }));

		setWeightClasses(newWeightClasses);
		saveSession(newWeightClasses);
	};

	const changeTeamWrestler = (weightClass, wrestler) => {
		const newWeightClasses = weightClasses.map(listWeight => ({ ...listWeight, selectedTeamWrestler: listWeight.name == weightClass ? wrestler : listWeight.selectedTeamWrestler }));

		setWeightClasses(newWeightClasses);
		saveSession(newWeightClasses);
	};

	const changeOpponentWrestlerName = (weightClass, name) => {
		const newWeightClasses = weightClasses.map(listWeight => ({ ...listWeight, selectedOpponentWrestler: listWeight.name == weightClass ? { name: name } : listWeight.selectedOpponentWrestler }));

		setWeightClasses(newWeightClasses);
		saveSession(newWeightClasses);
	};

	const changeOpponentWrestler = (weightClass, wrestler) => {
		const newWeightClasses = weightClasses.map(listWeight => ({ ...listWeight, selectedOpponentWrestler: listWeight.name == weightClass ? wrestler : listWeight.selectedOpponentWrestler }));

		setWeightClasses(newWeightClasses);
		saveSession(newWeightClasses);
	};

	const changeTeamScore = (weightClass, score) => {
		const newWeightClasses = weightClasses.map(listWeight => ({
				...listWeight,
				teamScore: listWeight.name == weightClass ? score : listWeight.teamScore,
				opponentScore: weightClass != listWeight.name ? listWeight.opponentScore
					: score === "" ? ""
					: listWeight.opponentScore !== "" ? listWeight.opponentScore
					: score > 0 ? 0
					: score === 0 || score === "0" ? 3
					: listWeight.opponentScore
			}));

		setWeightClasses(newWeightClasses);
		saveSession(newWeightClasses);
	};

	const changeOpponentScore = (weightClass, score) => {
		const newWeightClasses = weightClasses.map(listWeight => ({
				...listWeight,
				teamScore: weightClass != listWeight.name ? listWeight.teamScore
					: score === "" ? ""
					: listWeight.teamScore !== "" ? listWeight.teamScore
					: score > 0 ? 0
					: score === 0 || score === "0" ? 3
					: listWeight.teamScore,
				opponentScore: listWeight.name == weightClass ? score : listWeight.opponentScore
			}));

		setWeightClasses(newWeightClasses);
		saveSession(newWeightClasses);
	};

	return (
<>

<div className="panel expandable">

	{
	isLoading ?
	
	<div className="panelLoading">
		<img src="/media/wrestlingloading.gif" />
	</div>

	:
	<>

	<div className="compareHeader">
		<h3>{ props.team.name }</h3>
		<h3>
			<select value={ props.selectedOpponentId } onChange={ event => props.setSelectedOpponentId(event.target.value) }>
				<option value="">-- Select Team --</option>
				{
				props.opponents.map((opponent, opponentIndex) =>
					<option key={opponentIndex} value={ opponent.id }>{ opponent.name }</option>
				)}
			</select>
		</h3>
	</div>

	{
	weightClasses.map((weightClass, weightClassIndex) =>
	
	<div key={ weightClassIndex } className="compareRow">
		{
		weightClass.selectedTeamWrestler.id ?
		<div className={`compareSearch button ${ weightClass.teamScore === "" ? "" : weightClass.teamScore > 0 ? "win" : "lose" }`} onClick={ () => window.location = `/portal/wrestlerview.html?id=${ weightClass.selectedTeamWrestler.id }`}>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M450.001-290.001h59.998V-520h-59.998v229.999ZM480-588.461q13.731 0 23.019-9.288 9.288-9.288 9.288-23.019 0-13.73-9.288-23.019-9.288-9.288-23.019-9.288-13.731 0-23.019 9.288-9.288 9.289-9.288 23.019 0 13.731 9.288 23.019 9.288 9.288 23.019 9.288Zm.067 488.46q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM480-160q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
		</div>
		:
		<div className={ weightClass.teamScore === "" ? "" : weightClass.teamScore > 0 ? "win" : "lose" }></div>
		}

		<div className={`compareTeam ${ weightClass.teamScore === "" ? "" : weightClass.teamScore > 0 ? "win" : "lose" }`}>
			
			<div className={ `compareDropDown ${ dropDown.id == weightClass.name && dropDown.team == "team" ? "active" : "" }` }>
				<div>
				{
				weightClass.teamWrestlers.length > 0 ?

				weightClass.teamWrestlers.map((wrestler, wrestlerIndex) =>

				<div key={wrestlerIndex} className="compareDropDownItem" onMouseDown={ () => changeTeamWrestler(weightClass.name, wrestler) }>
					{ wrestler.division } • { wrestler.weightClass } • { wrestler.name }
				</div>

				)

				: 
				<div className="compareDropDownItem">No Wrestlers</div>
				}
				</div>
			</div>

			<input type="text" placeholder="-- Select Wrestler --" value={ weightClass.selectedTeamWrestler.name } onChange={ event => changeTeamWrestlerName(weightClass.name, event.target.value) } onFocus={ () => setDropDown({ id: weightClass.name, team: "team" }) } onBlur={ () => setDropDown({}) } />
			
		</div>

		<div className={`compareScore ${ weightClass.teamScore === "" ? "" : weightClass.teamScore > 0 ? "win" : "lose" }`}>
			<select value={ weightClass.teamScore } onChange={ event => changeTeamScore(weightClass.name, event.target.value) }>
				<option value="">-</option>
				<option>0</option>
				<option>3</option>
				<option>4</option>
				<option>5</option>
				<option>6</option>
			</select>
		</div>
		
		<div className="compareWeight">{ weightClass.name }</div>
		
		<div className={`compareScore ${ weightClass.opponentScore === "" ? "" : weightClass.opponentScore > 0 ? "win" : "lose" }`}>
			<select value={ weightClass.opponentScore } onChange={ event => changeOpponentScore(weightClass.name, event.target.value) }>
				<option value="">-</option>
				<option>0</option>
				<option>3</option>
				<option>4</option>
				<option>5</option>
				<option>6</option>
			</select>
		</div>

		<div className={`compareTeam ${ weightClass.opponentScore === "" ? "" : weightClass.opponentScore > 0 ? "win" : "lose" }`}>
			
			<div className={ `compareDropDown ${ dropDown.id == weightClass.name && dropDown.team == "opponent" ? "active" : "" }` }>
				<div>
				{
				weightClass.opponentWrestlers.length > 0 ?

				weightClass.opponentWrestlers.map((wrestler, wrestlerIndex) =>

				<div key={wrestlerIndex} className="compareDropDownItem" onMouseDown={ () => changeOpponentWrestler(weightClass.name, wrestler)}>
					{ wrestler.division } • { wrestler.weightClass } • { wrestler.name }
				</div>

				)

				: 
				<div className="compareDropDownItem">No Wrestlers</div>
				}
				</div>
			</div>

			<input type="text" placeholder="-- Select Wrestler --" value={ weightClass.selectedOpponentWrestler.name } onChange={ event => changeOpponentWrestlerName(weightClass.name, event.target.value) } onFocus={ () => setDropDown({ id: weightClass.name, team: "opponent" }) } onBlur={ () => setDropDown({}) } />
		</div>

		{
		weightClass.selectedOpponentWrestler.id ?
		<div className={`compareSearch button ${ weightClass.opponentScore === "" ? "" : weightClass.opponentScore > 0 ? "win" : "lose" }`} onClick={ () => window.location = `/portal/wrestlerview.html?id=${ weightClass.selectedOpponentWrestler.id }` }>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M450.001-290.001h59.998V-520h-59.998v229.999ZM480-588.461q13.731 0 23.019-9.288 9.288-9.288 9.288-23.019 0-13.73-9.288-23.019-9.288-9.288-23.019-9.288-13.731 0-23.019 9.288-9.288 9.289-9.288 23.019 0 13.731 9.288 23.019 9.288 9.288 23.019 9.288Zm.067 488.46q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM480-160q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
		</div>
		:
		<div className={ weightClass.opponentScore === "" ? "" : weightClass.opponentScore > 0 ? "win" : "lose" }></div>
		}
	</div>

	)
	}

	</>
	}
</div>

{
scoreChart ?

<div className="panel">
	<h3>Score</h3>

	<svg viewBox={`0 0 ${ scoreChart.svg.width } ${ scoreChart.svg.height }`} className="lineChart">

		<g className="chartArea" transform={`translate(${ scoreChart.chart.left }, ${ scoreChart.chart.top })`}>
			<line className="chartLine" x1="0" y1={ scoreChart.chart.height / 2 } x2={ scoreChart.chart.width } y2={ scoreChart.chart.height / 2} />

			{
			scoreChart.opponent.path ?
			<path className="opponentLine" d={ scoreChart.opponent.path } />
			: ""
			}

			{
			scoreChart.opponent.points.map((point, pointIndex) =>
			<circle className="opponentPoint" cx={ point.x } cy={ point.y } r="3" key={ pointIndex } />
			)
			}

			{
			scoreChart.team.path ?
			<path className="teamLine" d={ scoreChart.team.path } />
			: ""
			}
			
			{
			scoreChart.team.points.map((point, pointIndex) =>
			<circle className="teamPoint" cx={ point.x } cy={ point.y } r="3" key={ pointIndex } />
			)
			}

			{
			scoreChart.opponent.labels.map((label, labelIndex) =>
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="middle">{ label.text }</text>
			)
			}

			{
			scoreChart.team.labels.map((label, labelIndex) =>
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="middle">{ label.text }</text>
			)
			}

		</g>

		<g className="leftAxis" transform={`translate(0, ${ scoreChart.leftAxis.top })`}>
			<line className="axisLine" x1={ scoreChart.chart.left } y1="0" x2={ scoreChart.chart.left } y2={ scoreChart.bottomAxis.top }></line>

			{
			scoreChart.leftAxis.text.map((text, textIndex) => 
			<text key={ textIndex } className="chartLabel" x={ text.x } y={ text.y } textAnchor="end" alignmentBaseline={ text.align }>{ text.text }</text>
			)
			}
		</g>

		<g className="bottomAxis" transform={`translate(${ scoreChart.bottomAxis.left }, ${ scoreChart.bottomAxis.top })`}>
			<line className="axisLine" x1="0" y1="0" x2={ scoreChart.chart.width } y2="0"></line>

			{
			scoreChart.bottomAxis.text.map((text, textIndex) => 
			<text key={ textIndex } className="chartLabel" x={ text.x } y={ text.y } textAnchor="middle">{ text.text }</text>
			)
			}
		</g>

	</svg>

	<div className="chartGrid">
		<div className="row">
			<input type="range" min="0" max={ weightClasses.length } value={ startingWeight } onChange={ event => setStartingWeight(event.target.value) } step="1" />
			<div>{ weightClasses[startingWeight].name }</div>
		</div>
	</div>

</div>
:

""
}

</>
	)
}

export default TeamCompareMatch;
