import React, { useEffect, useState } from 'react';

const RunningTotalChart = ({ lineup, weightClassNames, teamName, opponentName }) => {
	const [chartData, setChartData] = useState(null);

	useEffect(() => {
		if (lineup && lineup.length > 0 && weightClassNames && weightClassNames.length > 0) {
			const width = 348;
			const height = 261;
			const margin = { top: 20, right: 20, bottom: 70, left: 40 };

			let teamRunningScore = 0;
			let opponentRunningScore = 0;
			let teamRunningPrediction = 0;
			let opponentRunningPrediction = 0;

			const data = weightClassNames.map(weightClass => {
				const match = lineup.find(m => m.weightClass === weightClass);
				if (match) {
					teamRunningScore += +match.teamScore || 0;
					opponentRunningScore += +match.opponentScore || 0;
					teamRunningPrediction += +match.prediction > 0 ? +match.prediction : 0;
					opponentRunningPrediction += +match.prediction < 0 ? -match.prediction : 0;
				}
				return {
					weightClass,
					teamScore: teamRunningScore,
					opponentScore: opponentRunningScore,
					teamPrediction: teamRunningPrediction,
					opponentPrediction: opponentRunningPrediction,
				};
			});

			const allScores = data.flatMap(d => [+d.teamScore, +d.opponentScore, +d.teamPrediction, +d.opponentPrediction]);
			const maxY = Math.max(...allScores);

			const scaleX = (index) => margin.left + index * ((width - margin.left - margin.right) / (data.length - 1));
			const scaleY = (y) => (height - margin.bottom) - (y / maxY) * (height - margin.top - margin.bottom);

			const teamScorePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d.teamScore)}`).join(' ');
			const opponentScorePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d.opponentScore)}`).join(' ');
			const teamPredictionPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d.teamPrediction)}`).join(' ');
			const opponentPredictionPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d.opponentPrediction)}`).join(' ');
			
			const teamScorePoints = data.map((d, i) => ({ cx: scaleX(i), cy: scaleY(d.teamScore), r: 2 }));
			const opponentScorePoints = data.map((d, i) => ({ cx: scaleX(i), cy: scaleY(d.opponentScore), r: 2 }));

			const xAxisLabels = data.map((d, i) => ({
				x: scaleX(i),
				y: height - margin.bottom + 20,
				text: d.weightClass,
			}));

			const yAxisLabels = [];
			const numTicks = 5;
			for (let i = 0; i <= numTicks; i++) {
				const yValue = (maxY / numTicks) * i;
				yAxisLabels.push({
					x: margin.left - 10,
					y: scaleY(yValue),
					text: yValue.toFixed(0),
				});
			}

			setChartData({
				width,
				height,
				margin,
				teamScorePath,
				opponentScorePath,
				teamPredictionPath,
				opponentPredictionPath,
				teamScorePoints,
				opponentScorePoints,
				xAxisLabels,
				yAxisLabels,
				teamName,
				opponentName
			});
		}
	}, [lineup, weightClassNames, teamName, opponentName]);

	if (!chartData) {
		return null;
	}

	return (
		<svg width={chartData.width} height={chartData.height}>
			{/* Axes */}
			<line x1={chartData.margin.left} y1={chartData.height - chartData.margin.bottom} x2={chartData.width - chartData.margin.right} y2={chartData.height - chartData.margin.bottom} stroke="black" />
			<line x1={chartData.margin.left} y1={chartData.margin.top} x2={chartData.margin.left} y2={chartData.height - chartData.margin.bottom} stroke="black" />

			{/* X-Axis Labels */}
			{chartData.xAxisLabels.map((label, i) => (
				<text key={i} x={label.x} y={label.y} textAnchor="middle" fontSize="10">{label.text}</text>
			))}

			{/* Y-Axis Labels */}
			{chartData.yAxisLabels.map((label, i) => (
				<text key={i} x={label.x} y={label.y} textAnchor="end" fontSize="10">{label.text}</text>
			))}

			{/* Opponent Prediction */}
			<path d={chartData.opponentPredictionPath} stroke="red" fill="none" strokeWidth="2" strokeDasharray="4 2" />

			{/* Team Prediction */}
			<path d={chartData.teamPredictionPath} stroke="steelblue" fill="none" strokeWidth="2" strokeDasharray="4 2" />

			{/* Opponent Score */}
			<path d={chartData.opponentScorePath} stroke="red" fill="none" strokeWidth="2" />
			{chartData.opponentScorePoints.map((p, i) => <circle key={i} {...p} fill="red" />)}

			{/* Team Score */}
			<path d={chartData.teamScorePath} stroke="steelblue" fill="none" strokeWidth="2" />
			{chartData.teamScorePoints.map((p, i) => <circle key={i} {...p} fill="steelblue" />)}

			{/* Legend */}
			<g transform={`translate(${chartData.width / 2}, ${chartData.height - 45})`}>
				<rect x="-150" y="10" width="10" height="10" fill="steelblue" />
				<text x="-135" y="19" fontSize="10" textAnchor="start">{chartData.teamName} Score</text>
				<rect x="-150" y="30" width="10" height="2" fill="steelblue" />
				<text x="-135" y="35" fontSize="10" textAnchor="start">{chartData.teamName} Predicted</text>
				
				<rect x="20" y="10" width="10" height="10" fill="red" />
				<text x="35" y="19" fontSize="10" textAnchor="start">{chartData.opponentName} Score</text>
				<rect x="20" y="30" width="10" height="2" fill="red" />
				<text x="35" y="35" fontSize="10" textAnchor="start">{chartData.opponentName} Predicted</text>
			</g>
		</svg>
	);
};

export default RunningTotalChart;