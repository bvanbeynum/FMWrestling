import React, { useEffect, useState } from "react";
import "./include/index.css";

const FloMatch = props => {

	const dataPointCount = 20,
		ChartSize = {
			padding: {},
			svg: { width: 350, height: 150 },
			axis: { left: 22, bottom: 15 }
		};
	
	const [ chartData, setChartData ] = useState(ChartSize);
	const [ averageMatch, setAverageMatch ] = useState(0);
	const [ estimatedCompletion, setEstimatedCompletion ] = useState(new Date());

	const [ matchCount, setMatchCount ] = useState(0);
	const [ matchesRemaining, setMatchesRemaining ] = useState(0);
	const [ wrestlerCount, setWrestlerCount ] = useState(0);
	const [ wrestlersRemaining, setWrestlersRemaining ] = useState(0);

	useEffect(() => {
		if (props.matches && props.matches.length > 0 && props.timingData && props.timingData.averageMatchTime) {
			
			// ****************** Build burndown chart **************************

			const chartArea = { 
				x: 0,
				y: 0,
				width: chartData.svg.width - chartData.axis.left, 
				height: chartData.svg.height - chartData.axis.bottom 
			};

			const sectionTimeLength = props.timingData.estimatedEventLength / dataPointCount;

			let completeMatchPoints = Array.from(Array(dataPointCount - 1).keys())
				.map(pointIndex => props.matches.filter(match =>
					match.completeTime &&
					match.completeTime.getTime() >= (props.timingData.startTime.getTime() + (sectionTimeLength * pointIndex)) &&
					match.completeTime.getTime() <= (props.timingData.startTime.getTime() + sectionTimeLength + (sectionTimeLength * pointIndex))
					).length
				);
			const lastPoint = completeMatchPoints.reduce((lastPoint, point, pointIndex) => point > 0 ? pointIndex : lastPoint, completeMatchPoints.length - 1);
			completeMatchPoints = completeMatchPoints.slice(0, lastPoint + 1);

			let remain = props.matches.length;
			const completeBurnDown = completeMatchPoints.map(point => remain -= point);
			completeBurnDown.unshift(props.matches.length);

			const completeSectionWidth = (chartArea.width / dataPointCount) * completeBurnDown.length;
			const completePoints = completeBurnDown.map((dataPoint, pointIndex) => ({ x: (completeSectionWidth / completeMatchPoints.length) * pointIndex, y: ((props.matches.length - dataPoint) * chartArea.height) / props.matches.length }));
			const completePath = completePoints.reduce((output, point, pointIndex) => output += (pointIndex == 0 ? "M" : "L") + point.x + " " + point.y + " ", "");
			const completeArea = completePath + 
				"L" + completePoints[completePoints.length - 1].x + " " + chartArea.height + " " +
				"L0 " + chartArea.height + " " +
				"L0 0";
			
			const emptyPointCount = dataPointCount - completeBurnDown.length - 1;
			const remainingMatchCount = props.timingData.remainingMatches / emptyPointCount;
			const remainingMatchPoints = Array.from(Array(emptyPointCount).keys())
				.map(() => remainingMatchCount);
			
			remain = completeBurnDown[completeBurnDown.length - 1];
			const remainingBurndown = remainingMatchPoints.map(point => remain -= point);
			remainingBurndown.unshift(completeBurnDown[completeBurnDown.length - 1]);

			const remainingSectionWidth = (chartArea.width / dataPointCount) * remainingBurndown.length;
			const remainingPoints = remainingBurndown.map((dataPoint, pointIndex) => ({ x: completeSectionWidth + ((remainingSectionWidth / remainingMatchPoints.length) * pointIndex), y: ((props.matches.length - dataPoint) * chartArea.height) / props.matches.length }));
			const remainingPath = remainingPoints.reduce((output, point, pointIndex) => output += (pointIndex == 0 ? "M" : "L") + point.x + " " + point.y + " ", "");

			const leftAxis = [
				{
					x: chartData.axis.left - 3,
					y: 8,
					anchor: "end",
					text: props.matches.length
				},
				{
					x: chartData.axis.left - 3,
					y: chartArea.height,
					anchor: "end",
					text: "0"
				}
			];

			const currentMatchTime = props.matches.filter(match => match.completeTime).map(match => match.completeTime).sort((matchA, matchB) => matchB - matchA).find(() => true);
			
			const bottomAxis = [
				{
					x: 0,
					y: chartData.axis.bottom - 2,
					anchor: "start",
					text: ((props.timingData.startTime.getHours() == 12 ? 12 : props.timingData.startTime.getHours() % 12)) + ":" +
						(props.timingData.startTime.getMinutes() + "").padStart(2, "0") +
						(props.timingData.startTime.getHours() < 12 ? "am" : "pm")
				},
				{
					x: completeSectionWidth,
					y: chartData.axis.bottom - 2,
					anchor: "middle",
					text: ((currentMatchTime.getHours() == 12 ? 12 : currentMatchTime.getHours() % 12)) + ":" +
						(currentMatchTime.getMinutes() + "").padStart(2, "0") +
						(currentMatchTime.getHours() < 12 ? "am" : "pm")
				},
				{
					x: chartData.svg.width - chartData.axis.left,
					y: chartData.axis.bottom - 2,
					anchor: "end",
					text: ((props.timingData.estimatedEndTime.getHours() == 12 ? 12 : props.timingData.estimatedEndTime.getHours() % 12)) + ":" +
						(props.timingData.estimatedEndTime.getMinutes() + "").padStart(2, "0") +
						(props.timingData.estimatedEndTime.getHours() < 12 ? "am" : "pm")
				}
			];

			const currentCircle = {
				x: completePoints[completePoints.length - 1].x,
				y: completePoints[completePoints.length - 1].y,
			};

			const chartLabels = [
				{
					x: completePoints[completePoints.length - 1].x,
					y: completePoints[completePoints.length - 1].y - 5,
					text: completeBurnDown[completeBurnDown.length - 1]
				}
			];

			setChartData(chartData => ({
				...chartData,
				chartArea: chartArea,
				completeArea: completeArea,
				completePath: completePath,
				remainingPath: remainingPath,
				leftAxis: leftAxis,
				bottomAxis: bottomAxis,
				currentCircle: currentCircle,
				chartLabels: chartLabels
			}));
		}

		if (props.matches && props.matches.length > 0) {

			// ****************** Match Data **************************

			setMatchCount(props.matches.length);
			setMatchesRemaining(props.matches.filter(match => !match.winType).length);
			
			const wrestlers = [...new Set(props.matches.flatMap(match => [match.topWrestler ? match.topWrestler.name : null, match.bottomWrestler ? match.bottomWrestler.name : null]))];
			const newWrestlersRemaining = wrestlers.filter(wrestler => 
				props.matches.some(match => 
					!match.winType && (
						(match.bottomWrestler && match.bottomWrestler.name == wrestler) ||
						(match.bottomWrestler && match.bottomWrestler.name == wrestler)
					)
					)
				).length;
			
			setWrestlerCount(wrestlers.length);
			setWrestlersRemaining(newWrestlersRemaining);

			setAverageMatch(props.timingData.averageMatchTime);
			setEstimatedCompletion(props.timingData.estimatedEndTime);

		}
	}, [props.timingData]);

	const updateEstimate = average => {
		setAverageMatch(average);
		setEstimatedCompletion(new Date(props.timingData.currentTime.getTime() + (props.timingData.remainingMatches * average)));
	};
	
	return (
<>
<header>
	<h1>{ props.eventName }</h1>
	<h1 className="subTitle">Event Overview</h1>
</header>

{
chartData.completeArea ?

<div className="panel">
	<h3>Event Timeline</h3>
	
	<div className="chartGrid">
		{
		chartData.completePath ?
		
		<svg viewBox={ `0 0 ${ chartData.svg.width } ${ chartData.svg.height }` } preserveAspectRatio="xMidYMid meet" className="burndownChart">
			<defs>
				<linearGradient id="0" x1="0.5" y1="0" x2="0.5" y2="1">
					<stop offset="0%" stopColor="rgba(71,173,96,.6)"/>
					<stop offset="25%" stopColor="rgba(71,173,96,.2)"/>
					<stop offset="90%" stopColor="rgba(71,173,96,0)"/>
				</linearGradient>
			</defs>

			<g className="chartArea" transform={ `translate(${ chartData.axis.left })`}>
				<path fill="url(#0)" className="completeArea" d={ chartData.completeArea } />

				<path className="completePath" d={ `${ chartData.completePath }` } />
				<path className="remainingPath" d={ `${ chartData.remainingPath }` } />

				<line className="currentLine" x1={ chartData.currentCircle.x } y1={ chartData.currentCircle.y } x2={ chartData.currentCircle.x } y2={ chartData.chartArea.height }></line>
				<circle className="currentCircle" cx={ chartData.currentCircle.x } cy={ chartData.currentCircle.y } r="5"></circle>

				{
				chartData.chartLabels.map((label, labelIndex) =>
					<text className="chartLabel" key={labelIndex} x={ label.x } y={ label.y } textAnchor={ label.anchor }>{ label.text }</text>
				)
				}
			</g>

			<g className="leftAxis">
				<line className="axisLine" x1={ chartData.axis.left } y1="0" x2={ chartData.axis.left } y2={ chartData.chartArea.height }></line>
			{
			chartData.leftAxis.map((label, labelIndex) =>
				<text className="chartLabel" key={labelIndex} x={ label.x } y={ label.y } textAnchor={ label.anchor }>{ label.text }</text>
			)
			}
			</g>

			<g className="bottomAxis" transform={ `translate(${ chartData.axis.left }, ${ chartData.chartArea.height })` }>
				<line className="axisLine" x1="0" y1="0" x2={ chartData.svg.width - chartData.axis.left } y2="0"></line>
			{
			chartData.bottomAxis.map((label, labelIndex) =>
				<text className="chartLabel" key={labelIndex} x={ label.x } y={ label.y } textAnchor={ label.anchor }>{ label.text }</text>
			)
			}
			</g>
		</svg>

		: ""
		}
	</div>
</div>

: ""
}

{
estimatedCompletion && averageMatch ?

<div className="panel">
	<h3>Match Times</h3>

	<div className="chartGrid">
		<div>
			<div className="chartBigData">{ Math.floor(averageMatch / 1000 / 60) }m { Math.floor(averageMatch / 1000 % 60) }s</div>
			<div className="chartBigLabel">avg match</div>
		</div>

		<div>
			<div className="chartBigData">
				{
				((estimatedCompletion.getHours() == 12 ? 12 : estimatedCompletion.getHours() % 12)) + ":" +
				(estimatedCompletion.getMinutes() + "").padStart(2, "0") +
				(estimatedCompletion.getHours() < 12 ? "am" : "pm")
				}
			</div>
			<div className="chartBigLabel">estimated completion</div>
		</div>
	</div>

	<div className="chartGrid">
		<input type="range" min="1000" max="360000" value={ averageMatch } onChange={ event => updateEstimate(event.target.value) } step="1000" />
		<button onClick={ () => updateEstimate(props.timingData.averageMatchTime) }>reset</button>
	</div>
</div>

:""
}

<div className="panel">
	<h3>Matches</h3>

	<div className="chartGrid">
		<div>
			<div className="chartBigData">{ matchCount }</div>
			<div className="chartBigLabel">matches</div>
		</div>

		<div>
			<div className="chartLittleData">{ matchCount - matchesRemaining } completed</div>
			<div className="chartLittleLabel">{ matchesRemaining } remaining</div>
		</div>
	</div>
</div>

<div className="panel">
	<h3>Wrestlers</h3>

	<div className="chartGrid">
		<div>
			<div className="chartBigData">{ wrestlerCount }</div>
			<div className="chartBigLabel">wrestlers</div>
		</div>

		<div>
			<div className="chartLittleData">{ wrestlerCount - wrestlersRemaining } completed</div>
			<div className="chartLittleLabel">{ wrestlersRemaining } remaining</div>
		</div>
	</div>
</div>

</>

)
};

export default FloMatch;
