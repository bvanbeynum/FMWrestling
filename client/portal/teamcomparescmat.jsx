import React, { useEffect, useState } from "react";

const TeamCompareSCMat = props => {

	const [ isLoading, setIsLoading ] = useState(false);

	const [ team, setTeam ] = useState(null);
	const [ opponent, setOpponent ] = useState(null);
	const [ weightClasses, setWeightClasses ] = useState(null);
	const [ selectedDateIndex, setSelectedDateIndex ] = useState(0);
	const [ individualChartMode, setIndividualChartMode ] = useState("ranked");

	const [ teamChart, setTeamChart ] = useState(null);
	const [ individualChart, setIndividualChart ] = useState(null);

	useEffect(() => {
		if (props.selectedOpponentId && props.teamId) {
			setIsLoading(true);

			fetch(`/api/teamgetscmatcompare?teamid=${ props.teamId }&opponentid=${ props.selectedOpponentId }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setTeam(data.team);
					setOpponent(data.opponent);

					const newWeightClasses = data.weightClasses
						.map(weightClass => ({...weightClass, date: new Date(weightClass.date)}))
						.sort((weightA, weightB) => +weightB.date - +weightA.date);

					setWeightClasses(newWeightClasses);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
		else {
			setTeam(null);
			setOpponent(null);
		}
	}, [ props.selectedOpponentId, props.teamId ]);

	useEffect(() => {
		if (opponent) {

			// ******************* Team Rankings ***********************

			const teamMax = 21;

			const teamChart = {
				svg: { width: 350, height: 200 },
				leftAxis: { top: 2 },
				bottomAxis: { left: 25, top: 180 },
				chart: { left: 25, top: 0, width: 325, height: 180 },
				team: {},
				opponent: {}
			};

			teamChart.leftAxis.labels = Array.from(Array(teamMax).keys())
				.map(rankIndex => ({
					x: teamChart.chart.left - 5,
					y: (rankIndex * teamChart.bottomAxis.top) / teamMax,
					text: rankIndex < teamMax - 1 ? rankIndex + 1 : "NR",
					align: rankIndex == 0 ? "hanging" // "hanging"
						: rankIndex == teamMax - 1 ? "hanging" // "baseline"
						: "hanging"
				}))
				.filter((label, labelIndex) => labelIndex % 4 == 0);

			const rankingDates = [...new Set([
					...team.rankings.map(ranking => +(new Date(ranking.date))),
					...opponent.rankings.map(ranking => +(new Date(ranking.date)))
				])];

			const pointWidth = teamChart.chart.width / rankingDates.length;

			teamChart.bottomAxis.labels = rankingDates
				.sort((dateA, dateB) => dateB - dateA)
				.map((date, dateIndex) => ({
					date: new Date(date),
					x: dateIndex == 0 ? pointWidth / 2
						: dateIndex == rankingDates.length - 1 ? teamChart.chart.width - (pointWidth / 2)
						: (dateIndex * pointWidth) + (pointWidth / 2),
					y: 15,
					width: pointWidth,
					text: new Date(date).toLocaleDateString("en-us", { month: "numeric", day: "numeric" }),
					align: dateIndex == 0 ? "middle"
						: dateIndex == rankingDates.length - 1 ? "middle"
						: "middle"
				}));
			
			teamChart.channels = rankingDates.map((rankDate, index) => ({
				x: index * pointWidth,
				y: 0,
				width: pointWidth,
				height: teamChart.chart.height
			}));

			teamChart.team.bars = teamChart.bottomAxis.labels.map((rankDate, rankDateIndex) => {
				const currentRank = team.rankings.find(ranking => +(new Date(ranking.date)) == +rankDate.date);
				const y = ((currentRank ? currentRank.ranking : teamMax) * teamChart.chart.height) / teamMax; // (ranking * ChartHeight) / teamMaxing

				return {
					x: rankDateIndex * pointWidth,
					y: y,
					width: pointWidth / 2,
					label: {
						x: (rankDateIndex * pointWidth) + (pointWidth / 4),
						y: !currentRank ? y - 4
						: currentRank.ranking > (teamMax / 2) ? y - 4
						: y + 4,
						text: currentRank ? currentRank.ranking : "NR",
						align: !currentRank ? "baseline"
							: currentRank.ranking > (teamMax / 2) ? "baseline"
							: "hanging"
					}
				}
			});

			teamChart.opponent.bars = teamChart.bottomAxis.labels.map((rankDate, rankDateIndex) => {
				const currentRank = opponent.rankings.find(ranking => +(new Date(ranking.date)) == +rankDate.date);
				const y = ((currentRank ? currentRank.ranking : teamMax) * teamChart.chart.height) / teamMax; // (ranking * ChartHeight) / teamMaxing

				return {
					x: (rankDateIndex * pointWidth) + (pointWidth / 2),
					y: y,
					width: pointWidth / 2,
					label: {
						x: (rankDateIndex * pointWidth) + (pointWidth * .75),
						y: !currentRank ? y - 4
							: currentRank.ranking > (teamMax / 2) ? y - 4
							: y + 4,
						text: currentRank ? currentRank.ranking : "NR",
						align: !currentRank ? "baseline"
							: currentRank.ranking > (teamMax / 2) ? "baseline"
							: "hanging"
					}
				}
			});

			setTeamChart(teamChart);
			buildIndividualChart();
		}
	}, [ opponent ]);

	useEffect(() => {
		if (opponent && weightClasses) {
			buildIndividualChart();
		}
	}, [ selectedDateIndex ])

	const buildIndividualChart = () => {
		const individualMax = 9;

		const individualChart = {
			svg: { width: 350, height: 400 },
			leftAxis: { top: 20 },
			topAxis: { left: 25, top: 0 },
			bottomAxis: { left: 25, top: 380 },
			chart: { left: 25, top: 20, width: 325, height: 360 },
			team: { ranked: {}, returning: {} },
			opponent: { ranked: {}, returning: {} }
		};

		const currentWeights = weightClasses
			.find(weightClass => +weightClasses[selectedDateIndex].date == +weightClass.date)
			.weightClasses
			.sort((weightA, weightB) => weightA - weightB);

		const pointHeight = individualChart.chart.height / currentWeights.length;
		const pointWidth = individualChart.chart.width / individualMax;

		individualChart.leftAxis.labels = currentWeights.map((weightClass, weightIndex) => ({
			x: 23,
			y: (weightIndex * pointHeight) + (pointHeight / 2),
			text: weightClass,
			align: "middle"
		}));

		individualChart.channels = currentWeights.map((weightClass, weightIndex) => ({
			x: 0,
			y: (weightIndex * pointHeight),
			width: individualChart.chart.width,
			height: pointHeight
		}));

		individualChart.topAxis.labels = Array.from(Array(individualMax).keys())
			.map(rankIndex => ({
				x: (rankIndex * pointWidth) + (pointWidth / 2),
				y: 8,
				text: rankIndex == 0 ? "NR" : individualMax - rankIndex,
				align: "middle"
			}));

		individualChart.bottomAxis.labels = Array.from(Array(individualMax).keys())
			.map(rankIndex => ({
				x: (rankIndex * pointWidth) + (pointWidth / 2),
				y: 15,
				text: rankIndex == 0 ? "NR" : individualMax - rankIndex,
				align: "middle"
			}));
		
		const teamWrestlerRankings = team.wrestlers.flatMap(wrestler => 
			wrestler.rankings
				.filter(ranking => +(new Date(ranking.date)) == +weightClasses[selectedDateIndex].date)
				.map(ranking => ({ weightClass: ranking.weightClass, ranking: ranking.ranking, name: wrestler.firstName + " " + wrestler.lastName }) )
			),
			opponentWrestlerRankings = opponent.wrestlers.flatMap(wrestler => 
				wrestler.rankings
					.filter(ranking => +(new Date(ranking.date)) == +weightClasses[selectedDateIndex].date)
					.map(ranking => ({ weightClass: ranking.weightClass, ranking: ranking.ranking, name: wrestler.firstName + " " + wrestler.lastName }) )
				);

		individualChart.team.rankedWrestlers = teamWrestlerRankings.length;
		individualChart.opponent.rankedWrestlers = opponentWrestlerRankings.length;
	
		individualChart.team.ranked.bars = currentWeights.map((weightClass, weightIndex) => {
			const rankedWrestler = teamWrestlerRankings
				.filter(ranking => ranking.weightClass == weightClass)
				.find(() => true);
			const x = (((individualMax - 1) - (rankedWrestler ? rankedWrestler.ranking - 1 : individualMax - 1)) * pointWidth) + (pointWidth / 2);

			return {
				x: x,
				y: weightIndex * pointHeight,
				height: pointHeight / 2,
				label: {
					x: !rankedWrestler || rankedWrestler.ranking > (individualMax / 2) ? x + 4
						: x - 4,
					y: (weightIndex * pointHeight) + (pointHeight * .25),
					text: rankedWrestler ? rankedWrestler.name : "",
					align: !rankedWrestler || rankedWrestler.ranking > (individualMax / 2) ? "start"
						: "end"
				}
			};
		});

		individualChart.opponent.ranked.bars = currentWeights.map((weightClass, weightIndex) => {
			const rankedWrestler = opponentWrestlerRankings
				.filter(ranking => ranking.weightClass == weightClass)
				.find(() => true);
			const x = (((individualMax - 1) - (rankedWrestler ? rankedWrestler.ranking - 1 : individualMax - 1)) * pointWidth) + (pointWidth / 2);

			return {
				x: (((individualMax - 1) - (rankedWrestler ? rankedWrestler.ranking - 1 : individualMax - 1)) * pointWidth) + (pointWidth / 2),
				y: (pointHeight / 2) + (weightIndex * pointHeight),
				height: pointHeight / 2,
				label: {
					x: !rankedWrestler || rankedWrestler.ranking > (individualMax / 2) ? x + 4
						: x - 4,
					y: (weightIndex * pointHeight) + (pointHeight / 2) + (pointHeight * .25),
					text: rankedWrestler ? rankedWrestler.name : "",
					align: !rankedWrestler || rankedWrestler.ranking > (individualMax / 2) ? "start"
						: "end"
				}
			};
		});

		const teamWrestlerReturning = team.wrestlers.flatMap(wrestler => 
			wrestler.rankings
				.filter(ranking => +(new Date(ranking.date)) == +weightClasses[selectedDateIndex].date && !/^sr$/i.test(ranking.grade))
				.map(ranking => ({ weightClass: ranking.weightClass, ranking: ranking.ranking, name: wrestler.firstName + " " + wrestler.lastName }) )
			),
			opponentWrestlerReturning = opponent.wrestlers.flatMap(wrestler => 
				wrestler.rankings
					.filter(ranking => +(new Date(ranking.date)) == +weightClasses[selectedDateIndex].date && !/^sr$/i.test(ranking.grade))
					.map(ranking => ({ weightClass: ranking.weightClass, ranking: ranking.ranking, name: wrestler.firstName + " " + wrestler.lastName }) )
				);

		individualChart.team.returningWrestlers = teamWrestlerReturning.length;
		individualChart.opponent.returningWrestlers = opponentWrestlerReturning.length;
			
		individualChart.team.returning.bars = currentWeights.map((weightClass, weightIndex) => {
			const rankedWrestler = teamWrestlerReturning
				.filter(ranking => ranking.weightClass == weightClass)
				.find(() => true);
			const x = (((individualMax - 1) - (rankedWrestler ? rankedWrestler.ranking - 1 : individualMax - 1)) * pointWidth) + (pointWidth / 2);

			return {
				x: (((individualMax - 1) - (rankedWrestler ? rankedWrestler.ranking - 1 : individualMax - 1)) * pointWidth) + (pointWidth / 2),
				y: weightIndex * pointHeight,
				height: pointHeight / 2,
				label: {
					x: !rankedWrestler || rankedWrestler.ranking > (individualMax / 2) ? x + 4
						: x - 4,
					y: (weightIndex * pointHeight) + (pointHeight * .25),
					text: rankedWrestler ? rankedWrestler.name : "",
					align: !rankedWrestler || rankedWrestler.ranking > (individualMax / 2) ? "start"
						: "end"
				}
			};
		});

		individualChart.opponent.returning.bars = currentWeights.map((weightClass, weightIndex) => {
			const rankedWrestler = opponentWrestlerReturning
				.filter(ranking => ranking.weightClass == weightClass)
				.find(() => true);
			const x = (((individualMax - 1) - (rankedWrestler ? rankedWrestler.ranking - 1 : individualMax - 1)) * pointWidth) + (pointWidth / 2);

			return {
				x: (((individualMax - 1) - (rankedWrestler ? rankedWrestler.ranking - 1 : individualMax - 1)) * pointWidth) + (pointWidth / 2),
				y: (pointHeight / 2) + (weightIndex * pointHeight),
				height: pointHeight / 2,
				label: {
					x: !rankedWrestler || rankedWrestler.ranking > (individualMax / 2) ? x + 4
						: x - 4,
					y: (weightIndex * pointHeight) + (pointHeight / 2) + (pointHeight * .25),
					text: rankedWrestler ? rankedWrestler.name : "",
					align: !rankedWrestler || rankedWrestler.ranking > (individualMax / 2) ? "start"
						: "end"
				}
			};
		});

		setIndividualChart(individualChart);
	};

	return (
<>

{
teamChart && opponent ? 
<div className="panel">
	{
	isLoading ?

	<div className="panelLoading">
		<img src="/media/wrestlingloading.gif" />
	</div>

	:
	<>

	<h3>Team Rankings: { team.name } vs { opponent.name }</h3>

	<svg viewBox={`0 0 ${ teamChart.svg.width } ${ teamChart.svg.height }`} className="lineChart">

		<g className="chartArea" transform={`translate(${ teamChart.chart.left }, ${ teamChart.chart.top })`}>
			{
			teamChart.channels.map((channel, channelIndex) => 
			<rect key={channelIndex} x={channel.x} y={channel.y} width={channel.width} height={channel.height} className={`chartBackground ${ channelIndex % 2 == 0 ? "alternate" : "" }`}></rect>
			)
			}

			{
			teamChart.opponent.bars.map((bar, barIndex) => 
			<g key={barIndex}>
			<line className="opponentLine" x1={bar.x} y1={bar.y} x2={bar.x + bar.width} y2={bar.y}></line>
			<text className="chartLabel" x={ bar.label.x } y={ bar.label.y } textAnchor="middle" alignmentBaseline={ bar.label.align }>{ bar.label.text }</text>
			</g>
			)
			}
			
			{
			teamChart.team.bars.map((bar, barIndex) => 
			<g key={barIndex}>
			<line className="teamLine" x1={bar.x} y1={bar.y} x2={bar.x + bar.width} y2={bar.y}></line>
			<text className="chartLabel" x={ bar.label.x } y={ bar.label.y } textAnchor="middle" alignmentBaseline={ bar.label.align }>{ bar.label.text }</text>
			</g>
			)
			}
		</g>

		<g className="leftAxis" transform={`translate(0, ${ teamChart.leftAxis.top })`}>
			<line className="axisLine" x1={ teamChart.chart.left } y1="0" x2={ teamChart.chart.left } y2={ teamChart.bottomAxis.top }></line>

			{
			teamChart.leftAxis.labels.map((label, labelIndex) => 
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="end" alignmentBaseline={ label.align }>{ label.text }</text>
			)
			}
		</g>

		<g className="bottomAxis" transform={`translate(${ teamChart.bottomAxis.left }, ${ teamChart.bottomAxis.top })`}>
			<line className="axisLine" x1="0" y1="0" x2={ teamChart.chart.width } y2="0"></line>

			{
			teamChart.bottomAxis.labels.map((label, labelIndex) => 
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor={ label.align }>{ label.text }</text>
			)
			}
		</g>

	</svg>

	</>

	}
</div>

: "" }

{
individualChart && opponent ?

<div className="panel">

	{
	isLoading ?

	<div className="panelLoading">
		<img src="/media/wrestlingloading.gif" />
	</div>

	:
	<>

	<h3>Individual Rankings</h3>

	<div className="selectorContainer">
		<div className={`selector ${ individualChartMode == "ranked" ? "selected" : "" }`} onClick={ () => { if (individualChartMode != "ranked") { setIndividualChartMode("ranked") } } }>Ranked</div>
		<div className={`selector ${ individualChartMode != "ranked" ? "selected" : "" }`} onClick={ () => { if (individualChartMode == "ranked") { setIndividualChartMode("running") } } }>Returning</div>
	</div>

	{
	individualChartMode == "ranked" ?
	<>
	
	<div className="dataGrid">
		<div>{ team.name } ranked: { individualChart.team.rankedWrestlers }</div>
		<div>{ opponent.name } ranked: { individualChart.opponent.rankedWrestlers }</div>
	</div>

	<svg viewBox={`0 0 ${ individualChart.svg.width } ${ individualChart.svg.height }`} className="lineChart">

		<g className="chartArea" transform={`translate(${ individualChart.chart.left }, ${ individualChart.chart.top })`}>
			{
			individualChart.channels.map((channel, channelIndex) => 
			<rect key={channelIndex} x={channel.x} y={channel.y} width={channel.width} height={channel.height} className={`chartBackground ${ channelIndex % 2 == 0 ? "alternate" : "" }`}></rect>
			)
			}

			{
			individualChart.opponent.ranked.bars.map((bar, barIndex) => 
			<g key={barIndex}>
			<line className="opponentLine" x1={bar.x} y1={bar.y} x2={bar.x} y2={bar.y + bar.height}></line>
			<text className="chartLabel" x={ bar.label.x } y={ bar.label.y } textAnchor={ bar.label.align } alignmentBaseline="middle">{ bar.label.text }</text>
			</g>
			)
			}

			{
			individualChart.team.ranked.bars.map((bar, barIndex) => 
			<g key={barIndex}>
			<line className="teamLine" x1={bar.x} y1={bar.y} x2={bar.x} y2={bar.y + bar.height}></line>
			<text className="chartLabel" x={ bar.label.x } y={ bar.label.y } textAnchor={ bar.label.align } alignmentBaseline="middle">{ bar.label.text }</text>
			</g>
			)
			}
		</g>

		<g className="leftAxis" transform={`translate(0, ${ individualChart.leftAxis.top })`}>
			<line className="axisLine" x1={ individualChart.chart.left } y1="0" x2={ individualChart.chart.left } y2={ individualChart.chart.height }></line>

			{
			individualChart.leftAxis.labels.map((label, labelIndex) => 
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="end" alignmentBaseline={ label.align }>{ label.text }</text>
			)
			}
		</g>

		<g className="topAxis" transform={`translate(${ individualChart.topAxis.left })`}>
			<line className="axisLine" x1="0" y1={ individualChart.chart.top } x2={ individualChart.chart.width } y2={ individualChart.chart.top }></line>

			{
			individualChart.topAxis.labels.map((label, labelIndex) => 
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor={ label.align } alignmentBaseline="hanging">{ label.text }</text>
			)
			}
		</g>

		<g className="bottomAxis" transform={`translate(${ individualChart.chart.left }, ${ individualChart.bottomAxis.top })`}>
			{
			individualChart.bottomAxis.labels.map((label, labelIndex) => 
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor={ label.align }>{ label.text }</text>
			)
			}
		</g>

	</svg>

	</>
	: 
	<>

	<div className="dataGrid">
		<div>{ team.name } returning: { individualChart.team.returningWrestlers }</div>
		<div>{ opponent.name } returning: { individualChart.opponent.returningWrestlers }</div>
	</div>

	<svg viewBox={`0 0 ${ individualChart.svg.width } ${ individualChart.svg.height }`} className="lineChart">

		<g className="chartArea" transform={`translate(${ individualChart.chart.left }, ${ individualChart.chart.top })`}>
			{
			individualChart.channels.map((channel, channelIndex) => 
			<rect key={channelIndex} x={channel.x} y={channel.y} width={channel.width} height={channel.height} className={`chartBackground ${ channelIndex % 2 == 0 ? "alternate" : "" }`}></rect>
			)
			}

			{
			individualChart.opponent.returning.bars.map((bar, barIndex) => 
			<g key={barIndex}>
			<line className="opponentLine" x1={bar.x} y1={bar.y} x2={bar.x} y2={bar.y + bar.height}></line>
			<text className="chartLabel" x={ bar.label.x } y={ bar.label.y } textAnchor={ bar.label.align } alignmentBaseline="middle">{ bar.label.text }</text>
			</g>
			)
			}
			{
			individualChart.team.returning.bars.map((bar, barIndex) => 
			<g key={barIndex}>
			<line className="teamLine" x1={bar.x} y1={bar.y} x2={bar.x} y2={bar.y + bar.height}></line>
			<text className="chartLabel" x={ bar.label.x } y={ bar.label.y } textAnchor={ bar.label.align } alignmentBaseline="middle">{ bar.label.text }</text>
			</g>
			)
			}
		</g>

		<g className="leftAxis" transform={`translate(0, ${ individualChart.leftAxis.top })`}>
			<line className="axisLine" x1={ individualChart.chart.left } y1="0" x2={ individualChart.chart.left } y2={ individualChart.chart.height }></line>

			{
			individualChart.leftAxis.labels.map((label, labelIndex) => 
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor="end" alignmentBaseline={ label.align }>{ label.text }</text>
			)
			}
		</g>

		<g className="topAxis" transform={`translate(${ individualChart.topAxis.left })`}>
			<line className="axisLine" x1="0" y1={ individualChart.chart.top } x2={ individualChart.chart.width } y2={ individualChart.chart.top }></line>

			{
			individualChart.topAxis.labels.map((label, labelIndex) => 
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor={ label.align } alignmentBaseline="hanging">{ label.text }</text>
			)
			}
		</g>

		<g className="bottomAxis" transform={`translate(${ individualChart.chart.left }, ${ individualChart.bottomAxis.top })`}>
			{
			individualChart.bottomAxis.labels.map((label, labelIndex) => 
			<text key={ labelIndex } className="chartLabel" x={ label.x } y={ label.y } textAnchor={ label.align }>{ label.text }</text>
			)
			}
		</g>

	</svg>

	</>
	}

	<div className="chartGrid">
		<div className="row">
			<input type="range" min="0" max={ weightClasses.length - 1 } value={ selectedDateIndex } onChange={ event => setSelectedDateIndex(event.target.value) } step="1" />
			<div>{ weightClasses[selectedDateIndex].date.toLocaleDateString() }</div>
		</div>
	</div>

	</>
	}
</div>

: "" }

</>
	)
};

export default TeamCompareSCMat;
