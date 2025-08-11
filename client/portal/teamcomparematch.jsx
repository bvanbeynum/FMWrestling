import React, { useEffect, useState } from "react";
import "./include/team.css";

const TeamCompareMatch = props => {

	const [ startingWeight, setStartingWeight ] = useState(0);
	const [ teamWrestlers, setTeamWrestlers ] = useState([]);
	
	const [ opposingChart, setOpposingChart ] = useState(null);
	const [ cumulativeChart, setCumulativeChart ] = useState(null);

	useEffect(() => {
		if (props.weightClasses && props.weightClasses.length > 0 && props.weightClasses.some(weightClass => weightClass.opponentWrestlers?.length > 0)) {
			setTeamWrestlers([].concat(props.team.wrestlers).sort((wrestlerA, wrestlerB) => 
					wrestlerA.division != wrestlerB.division ?
						/varsity/i.test(wrestlerA.division) ? -1 
						: /varsity/i.test(wrestlerB.division) ? 1 
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
				));

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
				.filter(weightClass => !isNaN(weightClass.name))

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

	const selectTeamWrestler = (weightClass, wrestlerId) => {
		const teamWrestler = teamWrestlers.find(wrestler => wrestler.id == wrestlerId);
		props.saveWrestler(weightClass, true, teamWrestler);
	};

	return (
<>

{
opposingChart && opposingChart.chart ?

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
 : ""
}

{
cumulativeChart && cumulativeChart.svg ?
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

: "" }

{
props.weightClasses && props.weightClasses.some(weightClass => weightClass.opponentWrestlers && weightClass.opponentWrestlers.length > 0) > 0 ?

<div className="panel expandable">
	{
	props.weightClasses
	.filter(weightClass => !isNaN(weightClass.name))
	.map((weightClass, weightClassIndex) =>
	
	<div key={ weightClassIndex } className="compareRow">
		<div className={`compareTeam ${ weightClass.teamScore > 0 ? "win" : weightClass.opponentScore > 0 ? "lose" : "" }`}>
			{
			weightClass.teamWrestler && weightClass.teamWrestler.rating ?
			<div>
				<div style={{ textDecoration: "underline" }}>{ weightClass.teamWrestler.rating.toLocaleString(undefined, { maximumFractionDigits: 0 }) }</div>
				<div>{ weightClass.teamWrestler.deviation.toLocaleString(undefined, { maximumFractionDigits: 0 }) }</div>
			</div>
			: ""
			}

			<select className="teamSelect" onChange={ event => selectTeamWrestler(weightClass.name, event.target.value) }>

				{weightClass.teamWrestler ?
				<option value={weightClass.teamWrestler.id}>{ weightClass.teamWrestler.name }</option>
				: ""}

				{
				teamWrestlers
				.filter(allWrestler => allWrestler.id != weightClass.teamWrestler?.id)
				.map(wrestler =>
				<option key={wrestler.id} value={ wrestler.id }>{ (wrestler.division || "") + " " + wrestler.weightClass + ": " + wrestler.name }</option>
				)}
			</select>
		</div>

		<div className={`compareScore ${ weightClass.teamScore > 0 ? "win" : weightClass.opponentScore > 0 ? "lose" : "" }`}>
			<select className="scoreSelect" value={ weightClass.teamScore } onChange={ event => props.updateScore(weightClass.name, true, event.target.value) }>
				<option value="">-</option>
				<option>0</option>
				<option>3</option>
				<option>4</option>
				<option>5</option>
				<option>6</option>
			</select>
		</div>
		
		<div className="compareWeight">{ weightClass.name }</div>
		
		<div className={`compareScore ${ weightClass.opponentScore > 0 ? "win" : weightClass.teamScore > 0 ? "lose" : "" }`}>
			<select className="scoreSelect" value={ weightClass.opponentScore } onChange={ event => props.updateScore(weightClass.name, false, event.target.value) }>
				<option value="">-</option>
				<option>0</option>
				<option>3</option>
				<option>4</option>
				<option>5</option>
				<option>6</option>
			</select>
		</div>

		<div className={`compareTeam ${ weightClass.opponentScore > 0 ? "win" : weightClass.teamScore > 0 ? "lose" : "" }`}>
			<div className="wrestlerName">
				{ weightClass.opponentWrestler?.name }

				{
				weightClass.opponentWrestler ?
				<button onClick={ () => window.open(`/portal/wrestler.html?id=${ weightClass.opponentWrestler.id }`, "_blank") }>
					{/* Eye View */}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
				</button>
				: ""
				}
			</div>

			{
			weightClass.opponentWrestler && weightClass.opponentWrestler.rating ?
			<div>
				<div style={{ textDecoration: "underline" }}>{ weightClass.opponentWrestler.rating.toLocaleString(undefined, { maximumFractionDigits: 0 }) }</div>
				<div>{ weightClass.opponentWrestler.deviation.toLocaleString(undefined, { maximumFractionDigits: 0 }) }</div>
			</div>
			: ""
			}

		</div>
	</div>

	)
	}
</div>
: ""
}

</>
	)
}

export default TeamCompareMatch;
