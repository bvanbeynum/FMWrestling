import React, { useEffect, useState } from "react";
import "./include/team.css";

const TeamCompareMatch = props => {

	const [ startingWeight, setStartingWeight ] = useState(0);
	
	const [ opposingChart, setOpposingChart ] = useState(null);
	const [ cumulativeChart, setCumulativeChart ] = useState(null);

	useEffect(() => {
		if (props.weightClasses && props.weightClasses.length > 0) {
			const opposingChart = {
				svg: { width: 350, height: 200 },
				leftAxis: { top: 0 },
				bottomAxis: { left: 25, top: 180 },
				chart: { left: 25, top: 20, width: 325, height: 150 },
				team: { },
				opponent: { }
			};

			let teamRunningScore = 0,
				teamCumulative = 0,
				opponentRunningScore = 0,
				opponentCumulative = 0;

			const weightClassesOrdered = [
				...props.weightClasses.slice(startingWeight),
				...props.weightClasses.slice(0, startingWeight)
			]

			const scores = weightClassesOrdered.map(weightClass => ({ 
				name: weightClass.name, 
				teamScore: weightClass.teamScore || 0, 
				teamRunning: weightClass.teamScore > 0 ? teamRunningScore += +weightClass.teamScore
					: weightClass.opponentScore > 0 ? teamRunningScore += (+weightClass.opponentScore * -1)
					: teamRunningScore,
				teamCumulative: teamCumulative += +weightClass.teamScore,
				opponentScore: weightClass.opponentScore || 0,
				opponentRunning: weightClass.opponentScore > 0 ? opponentRunningScore += +weightClass.opponentScore
					: weightClass.teamScore > 0 ? opponentRunningScore += (+weightClass.teamScore * -1)
					: opponentRunningScore,
				opponentCumulative: opponentCumulative += +weightClass.opponentScore,
			}));

			const maxOpposingScore = scores.reduce((max, score) => score.teamRunning > max ? score.teamRunning : score.opponentRunning > max ? score.opponentRunning : max, 0) || 10,
				minOpposingScore = scores.reduce((max, score) => score.teamRunning < max ? score.teamRunning : score.opponentRunning < max ? score.opponentRunning : max, 0) || -10,
				opposingRange = Math.abs(maxOpposingScore) + Math.abs(minOpposingScore);
			
			const pointWidth = opposingChart.chart.width / scores.length;

			opposingChart.team.points = scores.map((score, scoreIndex) => ({
				x: ((scoreIndex * pointWidth) + (pointWidth / 2)),
				y: (opposingChart.chart.height - ((((opposingRange / 2) + score.teamRunning) * opposingChart.chart.height) / opposingRange))
			}));

			opposingChart.team.labels = opposingChart.team.points.map((point, pointIndex) => ({
				x: point.x,
				y: point.y - 10,
				text: scores[pointIndex].teamRunning
			}));

			opposingChart.team.path = opposingChart.team.points.map((point, pointIndex) =>
				(pointIndex == 0 ? "M" : "L") + point.x + " " + point.y
				).join(" ");

			opposingChart.opponent.points = scores.map((score, scoreIndex) => ({
				x: ((scoreIndex * pointWidth) + (pointWidth / 2)),
				y: (opposingChart.chart.height - ((((opposingRange / 2) + score.opponentRunning) * opposingChart.chart.height) / opposingRange))
			}));

			opposingChart.opponent.labels = opposingChart.opponent.points.map((point, pointIndex) => ({
				x: point.x,
				y: point.y - 10,
				text: scores[pointIndex].opponentRunning
			}));

			opposingChart.opponent.path = opposingChart.opponent.points.map((point, pointIndex) =>
				(pointIndex == 0 ? "M" : "L") + point.x + " " + point.y
				).join(" ");
				
			opposingChart.leftAxis.text = [
				{ x: opposingChart.chart.left - 5, y: 5, text: maxOpposingScore, align: "hanging" },
				{ x: opposingChart.chart.left - 5, y: opposingChart.chart.top + (opposingChart.chart.height / 2), text: 0, align: "middle" },
				{ x: opposingChart.chart.left - 5, y: opposingChart.bottomAxis.top, text: minOpposingScore, align: "baseline" }
			];

			opposingChart.bottomAxis.text = scores.map((score, scoreIndex) => ({ 
				x: (scoreIndex * pointWidth) + (pointWidth / 2),
				y: 15,
				text: score.name
			}));

			setOpposingChart(opposingChart);

			const cumulativeChart = {
				svg: { width: 350, height: 200 },
				leftAxis: { top: 0 },
				bottomAxis: { left: 25, top: 180 },
				chart: { left: 25, top: 20, width: 325, height: 150 },
				team: { },
				opponent: { }
			};
			
			const maxCumulativeScore = scores.reduce((max, score) => score.teamCumulative > max ? score.teamCumulative : score.opponentCumulative > max ? score.opponentCumulative : max, 0) || 10;

			cumulativeChart.team.points = scores.map((score, scoreIndex) => ({
				x: ((scoreIndex * pointWidth) + (pointWidth / 2)),
				y: cumulativeChart.chart.height - ((score.teamCumulative * cumulativeChart.chart.height) / maxCumulativeScore)
			}));

			cumulativeChart.team.labels = cumulativeChart.team.points.map((point, pointIndex) => ({
				x: point.x,
				y: point.y - 10,
				text: scores[pointIndex].teamCumulative
			}));

			cumulativeChart.team.path = cumulativeChart.team.points.map((point, pointIndex) =>
				(pointIndex == 0 ? "M" : "L") + point.x + " " + point.y
				).join(" ");

			cumulativeChart.opponent.points = scores.map((score, scoreIndex) => ({
				x: ((scoreIndex * pointWidth) + (pointWidth / 2)),
				y: cumulativeChart.chart.height - ((score.opponentCumulative * cumulativeChart.chart.height) / maxCumulativeScore)
			}));

			cumulativeChart.opponent.labels = cumulativeChart.opponent.points.map((point, pointIndex) => ({
				x: point.x,
				y: point.y - 10,
				text: scores[pointIndex].opponentCumulative
			}));

			cumulativeChart.opponent.path = cumulativeChart.opponent.points.map((point, pointIndex) =>
				(pointIndex == 0 ? "M" : "L") + point.x + " " + point.y
				).join(" ");
				
			cumulativeChart.leftAxis.text = [
				{ x: cumulativeChart.chart.left - 5, y: 5, text: maxCumulativeScore, align: "hanging" },
				{ x: cumulativeChart.chart.left - 5, y: cumulativeChart.chart.top + (cumulativeChart.chart.height / 2), text: Math.floor(maxCumulativeScore / 2), align: "middle" },
				{ x: cumulativeChart.chart.left - 5, y: cumulativeChart.bottomAxis.top, text: 0, align: "baseline" }
			];

			cumulativeChart.bottomAxis.text = scores.map((score, scoreIndex) => ({ 
				x: (scoreIndex * pointWidth) + (pointWidth / 2),
				y: 15,
				text: score.name
			}));

			setCumulativeChart(cumulativeChart);

		}
	}, [ props.weightClasses, startingWeight ]);

	return (
<>

{
opposingChart ?
<>

<div className="panel">
	<h3>Opposing Score</h3>

	<svg viewBox={`0 0 ${ opposingChart.svg.width } ${ opposingChart.svg.height }`} className="lineChart">

		<g className="chartArea" transform={`translate(${ opposingChart.chart.left }, ${ opposingChart.chart.top })`}>
			<line className="chartLine" x1="0" y1={ opposingChart.chart.height / 2 } x2={ opposingChart.chart.width } y2={ opposingChart.chart.height / 2} />

			{
			opposingChart.opponent.path ?
			<path className="opponentLine" d={ opposingChart.opponent.path } />
			: ""
			}

			{
			opposingChart.opponent.points.map((point, pointIndex) =>
			<circle className="opponentPoint" cx={ point.x } cy={ point.y } r="3" key={ pointIndex } />
			)
			}

			{
			opposingChart.team.path ?
			<path className="teamLine" d={ opposingChart.team.path } />
			: ""
			}
			
			{
			opposingChart.team.points.map((point, pointIndex) =>
			<circle className="teamPoint" cx={ point.x } cy={ point.y } r="3" key={ pointIndex } />
			)
			}

			{
			opposingChart.opponent.labels.map((label, labelIndex) =>
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="middle">{ label.text }</text>
			)
			}

			{
			opposingChart.team.labels.map((label, labelIndex) =>
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="middle">{ label.text }</text>
			)
			}

		</g>

		<g className="leftAxis" transform={`translate(0, ${ opposingChart.leftAxis.top })`}>
			<line className="axisLine" x1={ opposingChart.chart.left } y1="0" x2={ opposingChart.chart.left } y2={ opposingChart.bottomAxis.top }></line>

			{
			opposingChart.leftAxis.text.map((text, textIndex) => 
			<text key={ textIndex } className="chartLabel" x={ text.x } y={ text.y } textAnchor="end" alignmentBaseline={ text.align }>{ text.text }</text>
			)
			}
		</g>

		<g className="bottomAxis" transform={`translate(${ opposingChart.bottomAxis.left }, ${ opposingChart.bottomAxis.top })`}>
			<line className="axisLine" x1="0" y1="0" x2={ opposingChart.chart.width } y2="0"></line>

			{
			opposingChart.bottomAxis.text.map((text, textIndex) => 
			<text key={ textIndex } className="chartLabel" x={ text.x } y={ text.y } textAnchor="middle">{ text.text }</text>
			)
			}
		</g>

	</svg>

	<div className="chartGrid">
		<div className="row">
			<input type="range" min="0" max={ props.weightClasses.length - 1 } value={ startingWeight } onChange={ event => setStartingWeight(event.target.value) } step="1" />
			<div>{ props.weightClasses[startingWeight].name }</div>
		</div>
	</div>

</div>

<div className="panel">
	<h3>Cumulative Score</h3>

	<svg viewBox={`0 0 ${ cumulativeChart.svg.width } ${ cumulativeChart.svg.height }`} className="lineChart">

		<g className="chartArea" transform={`translate(${ cumulativeChart.chart.left }, ${ cumulativeChart.chart.top })`}>
			{
			cumulativeChart.opponent.path ?
			<path className="opponentLine" d={ cumulativeChart.opponent.path } />
			: ""
			}

			{
			cumulativeChart.opponent.points.map((point, pointIndex) =>
			<circle className="opponentPoint" cx={ point.x } cy={ point.y } r="3" key={ pointIndex } />
			)
			}

			{
			cumulativeChart.opponent.labels.map((label, labelIndex) =>
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="middle">{ label.text }</text>
			)
			}

			{
			cumulativeChart.team.path ?
			<path className="teamLine" d={ cumulativeChart.team.path } />
			: ""
			}
			
			{
			cumulativeChart.team.points.map((point, pointIndex) =>
			<circle className="teamPoint" cx={ point.x } cy={ point.y } r="3" key={ pointIndex } />
			)
			}

			{
			cumulativeChart.team.labels.map((label, labelIndex) =>
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="middle">{ label.text }</text>
			)
			}

		</g>

		<g className="leftAxis" transform={`translate(0, ${ cumulativeChart.leftAxis.top })`}>
			<line className="axisLine" x1={ cumulativeChart.chart.left } y1="0" x2={ cumulativeChart.chart.left } y2={ cumulativeChart.bottomAxis.top }></line>

			{
			cumulativeChart.leftAxis.text.map((text, textIndex) => 
			<text key={ textIndex } className="chartLabel" x={ text.x } y={ text.y } textAnchor="end" alignmentBaseline={ text.align }>{ text.text }</text>
			)
			}
		</g>

		<g className="bottomAxis" transform={`translate(${ cumulativeChart.bottomAxis.left }, ${ cumulativeChart.bottomAxis.top })`}>
			<line className="axisLine" x1="0" y1="0" x2={ cumulativeChart.chart.width } y2="0"></line>

			{
			cumulativeChart.bottomAxis.text.map((text, textIndex) => 
			<text key={ textIndex } className="chartLabel" x={ text.x } y={ text.y } textAnchor="middle">{ text.text }</text>
			)
			}
		</g>

	</svg>

	<div className="chartGrid">
		<div className="row">
			<input type="range" min="0" max={ props.weightClasses.length - 1 } value={ startingWeight } onChange={ event => setStartingWeight(event.target.value) } step="1" />
			<div>{ props.weightClasses[startingWeight].name }</div>
		</div>
	</div>

</div>

</>
: "" }

<div className="panel expandable">
	{
	props.weightClasses
	.map((weightClass, weightClassIndex) =>
	
	<div key={ weightClassIndex } className="compareRow">
		<div className={`compareTeam ${ weightClass.teamScore === "" ? "" : weightClass.teamScore > 0 ? "win" : "lose" }`}>
			{ weightClass.teamWrestlers[0]?.name }
		</div>

		<div className={`compareScore ${ weightClass.teamScore === "" ? "" : weightClass.teamScore > 0 ? "win" : "lose" }`}>
			<select value={ weightClass.teamScore } onChange={ event => props.updateScore(weightClass.name, true, event.target.value) }>
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
			<select value={ weightClass.opponentScore } onChange={ event => props.updateScore(weightClass.name, false, event.target.value) }>
				<option value="">-</option>
				<option>0</option>
				<option>3</option>
				<option>4</option>
				<option>5</option>
				<option>6</option>
			</select>
		</div>

		<div className={`compareTeam ${ weightClass.opponentScore === "" ? "" : weightClass.opponentScore > 0 ? "win" : "lose" }`}>
			{ weightClass.opponentWrestlers[0]?.name }
		</div>
	</div>

	)
	}
</div>

</>
	)
}

export default TeamCompareMatch;
