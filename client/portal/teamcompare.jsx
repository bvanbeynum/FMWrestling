import React, { useEffect, useState, useRef } from "react";
import "./include/team.css";

const TeamCompare = props => {

	const [ opponentId, setOpponentId ] = useState("");
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ weightClasses, setWeightClasses ] = useState([]);
	const [ dropDown, setDropDown ] = useState({});
	const [ scoreChart, setScoreChart ] = useState();

	useEffect(() => {

		if (props.team && props.team.wrestlers) {
			if (!props.selectedDivision || !props.divisions.some(division => division == props.selectedDivision)) {
				props.setSelectedDivision(props.divisions
					.sort((divisionA, divisionB) => /varsity/i.test(divisionA) ? -1 : /varsity/i.test(divisionB) ? 1 : divisionA > divisionB ? 1 : -1)
					.find(() => true)
				)
			}
		}

	}, [ props.divisions ]);

	useEffect(() => {
		if (!props.selectedDivision) {
			return;
		}
		else if (!props.team) {
			return;
		}
		else if (!props.team.wrestlers) {
			return;
		}
		else if (!props.team.wrestlers.some(wrestler => wrestler.weightClass)) {
			return;
		}

		const sessionData = props.compareData && props.compareData.division == props.selectedDivision ? props.compareData : null;

		const currentOpponent = opponentId ? opponentId
			: sessionData && sessionData.opponentId ? sessionData.opponentId
			: "";
		
		const weightClassNames = [...new Set(props.team.wrestlers.filter(wrestler => wrestler.division == props.selectedDivision).map(wrestler => wrestler.weightClass))]
			.sort((weightClassA, weightClassB) => weightClassA > weightClassB ? 1 : -1);
		
		const newWeightClassMatches = weightClassNames.map(weightClass => {
			const sessionMatch = sessionData ? sessionData.weightClasses.find(sessionWeight => sessionWeight.name == weightClass) : null;

			const teamWrestlers = props.team.wrestlers
				.map(wrestler => ({...wrestler, name: wrestler.firstName + " " + wrestler.lastName}))
				.sort((wrestlerA, wrestlerB) =>
					sessionMatch && sessionMatch.teamWrestler == wrestlerA.id ? -1
					: sessionMatch && sessionMatch.teamWrestler == wrestlerB.id ? 1
					: wrestlerA.division == props.selectedDivision && wrestlerB.division != props.selectedDivision ? -1
					: wrestlerA.division != props.selectedDivision && wrestlerB.division == props.selectedDivision ? 1
					: wrestlerA.weightClass == wrestlerB.weightClass && wrestlerA.position < wrestlerB.position ? -1
					: wrestlerA.weightClass == wrestlerB.weightClass && wrestlerA.position > wrestlerB.position ? 1
					: wrestlerA.weightClass == weightClass && wrestlerB.weightClass != weightClass ? -1
					: wrestlerA.weightClass != weightClass && wrestlerB.weightClass == weightClass ? 1
					: Math.abs(wrestlerA.weightClass - weightClass) - Math.abs(wrestlerB.weightClass - weightClass)
				),
				selectedTeamWrestler = !sessionMatch || !sessionMatch.teamWrestler ? (teamWrestlers.find(() => true) || { name: "" }) // If no session data, then pick first wrestler
					: teamWrestlers.some(wrestler => wrestler.id == sessionMatch.teamWrestler) ? teamWrestlers.find(wrestler => wrestler.id == sessionMatch.teamWrestler)
					: { name: sessionMatch.teamWrestler };
			
			const opponentWrestlers = currentOpponent ? props.opponents.filter(opponent => opponent.id == currentOpponent)
				.flatMap(opponent => opponent.wrestlers.map(wrestler => ({...wrestler, name: wrestler.firstName + " " + wrestler.lastName })))
				.sort((wrestlerA, wrestlerB) =>
					sessionMatch && sessionMatch.opponentWrestler == wrestlerA.id ? -1
					: sessionMatch && sessionMatch.opponentWrestler == wrestlerB.id ? 1
					: wrestlerA.division == props.selectedDivision && wrestlerB.division != props.selectedDivision ? -1
					: wrestlerA.division != props.selectedDivision && wrestlerB.division == props.selectedDivision ? 1
					: wrestlerA.weightClass == wrestlerB.weightClass && wrestlerA.position < wrestlerB.position ? -1
					: wrestlerA.weightClass == wrestlerB.weightClass && wrestlerA.position > wrestlerB.position ? 1
					: wrestlerA.weightClass == weightClass && wrestlerB.weightClass != weightClass ? -1
					: wrestlerA.weightClass != weightClass && wrestlerB.weightClass == weightClass ? 1
					: Math.abs(wrestlerA.weightClass - weightClass) - Math.abs(wrestlerB.weightClass - weightClass)
				)
				: [],
				selectedOpponentWrestler = !sessionMatch || !sessionMatch.opponentWrestler ? (opponentWrestlers.find(() => true) || { name: "" }) // If no session data, then pick first wrestler
					: opponentWrestlers.some(wrestler => wrestler.id == sessionMatch.opponentWrestler) ? opponentWrestlers.find(wrestler => wrestler.id == sessionMatch.opponentWrestler)
					: { name: sessionMatch.opponentWrestler };
			
			return {
				name: weightClass,
				teamWrestlers: teamWrestlers,
				selectedTeamWrestler: selectedTeamWrestler,
				opponentWrestlers: opponentWrestlers,
				selectedOpponentWrestler: selectedOpponentWrestler,
				teamScore: !sessionMatch ? "" 
					: sessionMatch.teamScore === 0 ? 0
					: sessionMatch.teamScore || "",
				opponentScore: !sessionMatch ? "" 
					: sessionMatch.opponentScore === 0 ? 0
					: sessionMatch.opponentScore || ""
			}
		});

		if (currentOpponent != opponentId) {
			setOpponentId(currentOpponent);
		}

		setWeightClasses(newWeightClassMatches);
		saveSession(currentOpponent, newWeightClassMatches);
	}, [ props.team, props.opponents, props.selectedDivision, props.compareData ]);

	const saveSession = (opponentId, updatedWeightClasses) => {

		const sessionSave = {
			division: props.selectedDivision,
			opponentId: opponentId,
			weightClasses: updatedWeightClasses.map(weightClass => ({
				name: weightClass.name,
				teamWrestler: !weightClass.selectedTeamWrestler ? null : weightClass.selectedTeamWrestler.id ? weightClass.selectedTeamWrestler.id : weightClass.selectedTeamWrestler.name,
				teamScore: weightClass.teamScore === "" ? null : +weightClass.teamScore,
				opponentWrestler: !weightClass.selectedOpponentWrestler ? null : weightClass.selectedOpponentWrestler.id ? weightClass.selectedOpponentWrestler.id : weightClass.selectedOpponentWrestler.name,
				opponentScore: weightClass.opponentScore === "" ? null : +weightClass.opponentScore,
			}))
		};

		props.saveCompareData(sessionSave);
	};

	const setOpponent = newOpponentId => {
		const newWeightClasses = weightClasses.map(listWeight => ({
			...listWeight,
			teamScore: "",
			opponentWrestlers: [],
			selectedOpponentWrestler: { name: "" },
			opponentScore: ""
		}));

		setWeightClasses(newWeightClasses);
		saveSession(newOpponentId, newWeightClasses);
		setOpponentId(newOpponentId);
	};

	const changeTeamWrestlerName = (weightClass, name) => {
		const newWeightClasses = weightClasses.map(listWeight => ({ ...listWeight, selectedTeamWrestler: listWeight.name == weightClass ? { name: name } : listWeight.selectedTeamWrestler }));

		setWeightClasses(newWeightClasses);
		saveSession(opponentId, newWeightClasses);
	};

	const changeTeamWrestler = (weightClass, wrestler) => {
		const newWeightClasses = weightClasses.map(listWeight => ({ ...listWeight, selectedTeamWrestler: listWeight.name == weightClass ? wrestler : listWeight.selectedTeamWrestler }));

		setWeightClasses(newWeightClasses);
		saveSession(opponentId, newWeightClasses);
	};

	const changeOpponentWrestlerName = (weightClass, name) => {
		const newWeightClasses = weightClasses.map(listWeight => ({ ...listWeight, selectedOpponentWrestler: listWeight.name == weightClass ? { name: name } : listWeight.selectedOpponentWrestler }));

		setWeightClasses(newWeightClasses);
		saveSession(opponentId, newWeightClasses);
	};

	const changeOpponentWrestler = (weightClass, wrestler) => {
		const newWeightClasses = weightClasses.map(listWeight => ({ ...listWeight, selectedOpponentWrestler: listWeight.name == weightClass ? wrestler : listWeight.selectedOpponentWrestler }));

		setWeightClasses(newWeightClasses);
		saveSession(opponentId, newWeightClasses);
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
		saveSession(opponentId, newWeightClasses);
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
		saveSession(opponentId, newWeightClasses);
	};

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

			const scores = weightClasses.map(weightClass => ({ 
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
	}, [ weightClasses ]);

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
			Division
			<select value={ props.selectedDivision } onChange={ event => props.setSelectedDivision(event.target.value) }>
				{
				props.divisions
					.sort((divisionA, divisionB) => divisionA > divisionB ? 1 : -1)
					.map((division, divisionIndex) =>
				<option key={divisionIndex}>{ division }</option>
				)
				}
			</select>
		</label>
	</div>

</div>

<div className="panel centered">

	<div className="compareHeader">
		<h3>{ props.team.name }</h3>
		<h3>
			<select value={ opponentId } onChange={ event => setOpponent(event.target.value) }>
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
		<div className={`compareSearch button ${ weightClass.teamScore === "" ? "" : weightClass.teamScore > 0 ? "win" : "lose" }`}>
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
		<div className={`compareSearch button ${ weightClass.opponentScore === "" ? "" : weightClass.opponentScore > 0 ? "win" : "lose" }`}>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M450.001-290.001h59.998V-520h-59.998v229.999ZM480-588.461q13.731 0 23.019-9.288 9.288-9.288 9.288-23.019 0-13.73-9.288-23.019-9.288-9.288-23.019-9.288-13.731 0-23.019 9.288-9.288 9.289-9.288 23.019 0 13.731 9.288 23.019 9.288 9.288 23.019 9.288Zm.067 488.46q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM480-160q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
		</div>
		:
		<div className={ weightClass.opponentScore === "" ? "" : weightClass.opponentScore > 0 ? "win" : "lose" }></div>
		}
	</div>

	)}
	
</div>

<div className="panel">
	<h3>Score</h3>

	{
	scoreChart ?
	
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

	:

	""
	}
</div>

</>
	)
}

export default TeamCompare;
