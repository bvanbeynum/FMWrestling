import React, { useEffect, useState } from 'react';

const ProbabilityChart = ({ team, opponent }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (team && opponent) {
      const width = 350;
      const height = 150; // Increased height for legend
      const margin = { top: 20, right: 10, bottom: 30, left: 10 }; // Increased bottom margin for legend

      const minX = Math.min(team.rating - 4 * team.deviation, opponent.rating - 4 * opponent.deviation);
      const maxX = Math.max(team.rating + 4 * team.deviation, opponent.rating + 4 * opponent.deviation);

      const normalPDF = (mean, stdDev, x) => {
        const a = 1 / (stdDev * Math.sqrt(2 * Math.PI));
        const b = -0.5 * Math.pow((x - mean) / stdDev, 2);
        return a * Math.exp(b);
      };

      const generatePath = (data, color) => {
        const points = [];
        const numPoints = 100;
        const step = (maxX - minX) / numPoints;

        for (let i = 0; i <= numPoints; i++) {
          const x = minX + i * step;
          const y = normalPDF(data.rating, data.deviation, x);
          points.push({ x, y });
        }

        const maxY = Math.max(...points.map(p => p.y));

        const scaleX = (x) => margin.left + (x - minX) / (maxX - minX) * (width - margin.left - margin.right);
        const scaleY = (y) => (height - margin.bottom) - (y / maxY) * (height - margin.top - margin.bottom);

        let path = `M${scaleX(points[0].x)},${scaleY(points[0].y)}`;
        for (let i = 1; i < points.length; i++) {
          path += ` L${scaleX(points[i].x)},${scaleY(points[i].y)}`;
        }

        let fillPath = `${path} L${scaleX(maxX)},${height - margin.bottom} L${scaleX(minX)},${height - margin.bottom} Z`;

        const meanX = scaleX(data.rating);

        return { 
          path, 
          fillPath,
          color, 
          name: data.name,
          meanLine: { x1: meanX, y1: height - margin.bottom, x2: meanX, y2: margin.top },
          meanLabel: { x: meanX, y: margin.top - 5, text: data.rating.toFixed(0) }
        };
      };

      setChartData({
        width,
        height,
        teamData: generatePath(team, 'steelblue'),
        opponentData: generatePath(opponent, 'red'),
      });
    }
  }, [team, opponent]);

  if (!chartData) {
    return null;
  }

  return (
    <svg width={chartData.width} height={chartData.height}>
      <path d={chartData.teamData.fillPath} fill={chartData.teamData.color} fillOpacity="0.2" />
      <path d={chartData.teamData.path} stroke={chartData.teamData.color} fill="none" strokeWidth="2" />
      <line {...chartData.teamData.meanLine} stroke={chartData.teamData.color} strokeWidth="1" strokeDasharray="4 2" />
      <text {...chartData.teamData.meanLabel} textAnchor="middle" fontSize="10">{chartData.teamData.meanLabel.text}</text>

      <path d={chartData.opponentData.fillPath} fill={chartData.opponentData.color} fillOpacity="0.2" />
      <path d={chartData.opponentData.path} stroke={chartData.opponentData.color} fill="none" strokeWidth="2" />
      <line {...chartData.opponentData.meanLine} stroke={chartData.opponentData.color} strokeWidth="1" strokeDasharray="4 2" />
      <text {...chartData.opponentData.meanLabel} textAnchor="middle" fontSize="10">{chartData.opponentData.meanLabel.text}</text>

      <g transform={`translate(${chartData.width / 2}, ${chartData.height - 20})`}>
        <rect x="-100" y="0" width="10" height="10" fill={chartData.teamData.color} />
        <text x="-85" y="9" fontSize="10" textAnchor="start">{chartData.teamData.name}</text>
        <rect x="10" y="0" width="10" height="10" fill={chartData.opponentData.color} />
        <text x="25" y="9" fontSize="10" textAnchor="start">{chartData.opponentData.name}</text>
      </g>
    </svg>
  );
};

export default ProbabilityChart;
