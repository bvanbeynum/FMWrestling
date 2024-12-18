import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./include/index.css";
import "./include/wrestler.css";

const WrestlerComponent = () => {

	const [ isLoading, setIsLoading ] = useState(false);
	const [ wrestler, setWrestler ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ selectedEvent, setSelectedEvent ] = useState(null);

	const [ opponentChart, setOpponentChart ] = useState({ width: 0, height: 0 });
	const [ isOpponentLoading, setIsOpponentLoading ] = useState(false);
	const [ selectedOpponent, setSelectedOpponent ] = useState(null);

	const [ winTypeChart, setWinTypeChart ] = useState({});

	const chartConstants = {
		padding: { left: 10, top: 15 },
		boxHeight: 40,
		boxWidth: 230,
		boxPadHeight: 20,
		boxPadWidth: 60
	};

	useEffect(() => {
		if (!isLoading && !wrestler) {
			setIsLoading(true);

			const url = new window.URLSearchParams(window.location.search);
			const wrestlerId = url.get("id");

			fetch(`/api/externalwrestlerdetails?id=${ wrestlerId }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					const wrestlerData = {
						...data.wrestler,
						events: data.wrestler.events?.map(event => ({
							...event, 
							date: new Date(event.date),
							division: /(hs|high school|high)/i.test(event.division) ? "Varsity"
								: /(jv|junior varsity)/i.test(event.division) ? "JV"
								: /(ms|middle school)/i.test(event.division) ? "MS"
								: (event.division || "").trim(),
							wins: event.matches?.filter(match => match.isWinner && match.vs).length,
							losses: event.matches?.filter(match => !match.isWinner && match.vs).length,
							place: event.matches?.some(match => match.winType && /^(finals|1st place)/i.test(match.round) && match.isWinner) ? "1st"
								: event.matches?.some(match => match.winType && /^(finals|1st place)/i.test(match.round) && !match.isWinner) ? "2nd"
								: event.matches?.some(match => match.winType && /^3rd place/i.test(match.round) && match.isWinner) ? "3rd"
								: event.matches?.some(match => match.winType && /^3rd place/i.test(match.round) && !match.isWinner) ? "4th"
								: ""
						}))
					};
					setWrestler(wrestlerData);

					const matchResults = data.wrestler.events.flatMap(event => event.matches.map(match => ({
								isWinner: match.isWinner,
								winType: /fall/i.test(match.winType) ? "F" 
									: /tf/i.test(match.winType) ? "TF" 
									: /dec/i.test(match.winType) ? "DEC" 
									: /sv/i.test(match.winType) ? "DEC"
									: /md/i.test(match.winType) ? "MD" 
									: /maj/i.test(match.winType) ? "MD" 
									: match.winType
							})))
							.filter(match => ["F", "TF", "MD", "DEC"].includes(match.winType)),
						winTypes = {
							types: [
								matchResults.filter(match => match.winType == "F" && match.isWinner).length,
								matchResults.filter(match => match.winType == "DEC" && match.isWinner).length,
								matchResults.filter(match => match.winType == "TF" && match.isWinner).length,
								matchResults.filter(match => match.winType == "MD" && match.isWinner).length
							]},
						loseTypes = {
							types: [
								matchResults.filter(match => match.winType == "F" && !match.isWinner).length,
								matchResults.filter(match => match.winType == "DEC" && !match.isWinner).length,
								matchResults.filter(match => match.winType == "TF" && !match.isWinner).length,
								matchResults.filter(match => match.winType == "MD" && !match.isWinner).length
							]};
					
					winTypes.max = winTypes.types.reduce((output, current) => output > current ? output : current, 0);
					loseTypes.max = loseTypes.types.reduce((output, current) => output > current ? output : current, 0);

					winTypes.points = winTypes.types.map((winType, typeIndex) => ([0,3].includes(typeIndex) ? -1 : 1) * (winType * 80) / winTypes.max);
					loseTypes.points = loseTypes.types.map((winType, typeIndex) => ([0,3].includes(typeIndex) ? -1 : 1) * (winType * 80) / loseTypes.max);

					winTypes.labels = winTypes.points.map((point, pointIndex) => ({ x: pointIndex % 2 == 0 ? 5 : point, y: pointIndex % 2 == 0 ? point : -5, text: winTypes.types[pointIndex] }));
					loseTypes.labels = loseTypes.points.map((point, pointIndex) => ({ x: pointIndex % 2 == 0 ? 5 : point, y: pointIndex % 2 == 0 ? point : -5, text: loseTypes.types[pointIndex] }));

					winTypes.path = "M" + winTypes.points.map((point,pointIndex) => pointIndex % 2 == 0 ? "0 " + point : point + " 0").join(",L") + 
						",L0 " + winTypes.points[0];

					loseTypes.path = "M" + loseTypes.points.map((point,pointIndex) => pointIndex % 2 == 0 ? "0 " + point : point + " 0").join(",L") + 
						",L0 " + loseTypes.points[0];

					console.log(winTypes);

					setWinTypeChart({
						win: winTypes,
						lose: loseTypes
					});

					const opponents = getOpponents(data.wrestler);
					const tiers = [{
						x: chartConstants.padding.left,
						originY: chartConstants.padding.top,
						opponents: opponents.map((opponent, opponentIndex) => ({
							y: (opponentIndex * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top,
							record: opponent.wins + "-" + opponent.losses,
							wins: opponent.wins,
							losses: opponent.losses,
							name: opponent.name,
							teams: opponent.teams.join(", ").substring(0, 25),
							date: opponent.lastDate,
							id: opponent.id
						}))
					}];
					
					setOpponentChart({
						width: (1 * (chartConstants.boxPadWidth + chartConstants.boxWidth)),
						height: tiers.reduce((height, tier) => height > (tier.opponents.length * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top ? height : (tier.opponents.length * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top, 0),
						tiers: tiers
					});

					setIsLoading(false);
					setLoggedInUser(data.loggedInUser);
				})
				.catch(error => {
					console.warn(error);
					setIsLoading(false);
					setErrorMessage("There was an error loading the wrestler details");
				});
		}
	}, []);

	const selectOpponent = (tierIndex, opponent) => {
		setIsOpponentLoading(opponent.id);

		fetch(`/api/externalwrestlerdetails?id=${ opponent.id }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				const opponents = getOpponents(data.wrestler);
				const tierWidth = chartConstants.boxPadWidth + chartConstants.boxWidth;
				
				const tiers = [
					...opponentChart.tiers.slice(0, tierIndex + 1),
					{
						x: ((tierIndex + 1) * tierWidth) + chartConstants.padding.left,
						originY: opponent.y + (chartConstants.boxHeight / 2),
						opponents: opponents.map((opponent, opponentIndex) => ({
							y: (opponentIndex * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top,
							record: opponent.wins + "-" + opponent.losses,
							wins: opponent.wins,
							losses: opponent.losses,
							name: opponent.name,
							teams: opponent.teams.join(", ").substring(0, 25),
							date: opponent.lastDate,
							id: opponent.id
						}))
					}
				];
				
				setOpponentChart({
					width: (tierIndex + 2) * tierWidth,
					height: tiers.reduce((height, tier) => height > (tier.opponents.length * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top ? height : (tier.opponents.length * (chartConstants.boxHeight + chartConstants.boxPadHeight)) + chartConstants.padding.top, 0),
					tiers: tiers
				});

				setSelectedOpponent(opponent.id);
				setIsOpponentLoading(null);
			})
			.catch(error => {
				console.warn(error);
				setIsLoading(false);
				setErrorMessage("There was an error loading the wrestler details");
			});
	};

	const getOpponents = wrestler => {
		const matches = wrestler.events.flatMap(event => event.matches.map(match => ({...match, eventDate: new Date(event.date) }))),
			opponents = [...new Set(matches.map(match => match.vsSqlId))]
				.map(wrestlerId => 
					matches.filter(match => match.vsSqlId == wrestlerId)
						.reduce((output, current) => ({
							...output,
							id: current.vsId,
							name: current.vs,
							teams: [...new Set(output.teams.concat(current.vsTeam))].sort((teamA, teamB) => teamA > teamB ? 1 : -1),
							wins: output.wins + (current.isWinner ? 1 : 0),
							losses: output.losses + (current.isWinner ? 0 : 1),
							dates: output.dates.concat(new Date(current.eventDate)),
							lastDate: !output.lastDate || +output.lastDate < current.eventDate ? current.eventDate : output.lastDate
						}), { sqlId: wrestlerId, wins: 0, losses: 0, teams: [], dates: [] })
				)
				.sort((opponentA, opponentB) => +opponentB.lastDate - +opponentA.lastDate);
		
		return opponents;
	};

	return (

<div>
		
{
isLoading || !wrestler ?

<div className="pageLoading">
	<img src="/media/wrestlingloading.gif" />
</div>

: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("wrestlerResearch") ?

<div className="noAccess">
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
	<a>Unauthorized</a>
</div>

:

<div className="container active">
	<header>
		<h1>Wrestler Details</h1>
		
		<h1 className="subTitle">
			{ wrestler.name }
		</h1>
	</header>
	
	<div className="panel expandable">
		<h3>
			Wrestling Timeline
		</h3>

		<div className="tableContainer">
			<table className="sectionTable wrestlerEvent">
			<thead>
			<tr>
				<th>Date</th>
				<th>State</th>
				<th>Event</th>
				<th>Restuls</th>
				<th>Team</th>
				<th>Division</th>
				<th>Weight</th>
			</tr>
			</thead>
			<tbody>
			{
			wrestler.events.length === 0 ?
			<tr>
				<td colSpan="6" className="emptyTable">No Events Found</td>
			</tr>

			:

			wrestler.events
			.sort((eventA, eventB) => +eventB.date - +eventA.date )
			.map((event, eventIndex) =>
			<tr key={eventIndex} onClick={ () => setSelectedEvent(event) } className={ selectedEvent?.sqlId == event.sqlId ? "selected" : "" }>
				<td>{ event.date.toLocaleDateString() }</td>
				<td>{ event.locationState }</td>
				<td>{ event.name }</td>
				<td>{ event.wins + " - " + event.losses + " (" + (event.wins / (event.wins + event.losses)).toFixed(3) + ")" + (event.place ? " " + event.place : "") }</td>
				<td>{ event.team }</td>
				<td>{ event.division }</td>
				<td>{ event.weightClass }</td>
			</tr>
			)
			}
			</tbody>
			</table>
		</div>

		{
		selectedEvent ?
		<>
		<div className="sectionHeading">{ selectedEvent.name }</div>
		<div className="tableContainer">
			<table className="sectionTable wrestlerMatches">
			<thead>
			<tr>
				<th>Round</th>
				<th>Match</th>
				<th>Result</th>
			</tr>
			</thead>
			<tbody>
			{
			selectedEvent.matches
			.sort((matchA,matchB) => matchA.sort - matchB.sort)
			.map((match, matchIndex) =>
			<tr key={matchIndex}>
				<td>{ match.round }</td>
				<td>
					{ match.isWinner ? "Beat " : "Lost to " } { match.vs } ({ match.vsTeam })

					{
					match.vsId ?
					<button onClick={ () => window.open(`/portal/wrestler.html?id=${ match.vsId }`, "_blank") }>
						{/* Eye View */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
					</button>
					: ""}
				</td>
				<td>{ match.winType }</td>
			</tr>
			)
			}
			</tbody>
			</table>
		</div>
		</>
		: ""
		}
	</div>

	<div className="panel expandable">
		<h3>
			Opponents
		</h3>

		<div className="inlay opponentNetwork">
			<svg style={{ height: `${ opponentChart.height }px`, width: `${ opponentChart.width }px` }}>

				{
				opponentChart.tiers.map((tier, tierIndex) =>
				
				<g key={tierIndex} transform={`translate(${ tier.x })`}>

					{
					tier.opponents.map((opponent, opponentIndex) =>
					<g key={ opponentIndex }>

						{
						tierIndex > 0 ?
						<path d={ `M${ chartConstants.boxPadWidth * -1 } ${ tier.originY } C0 ${ tier.originY }, ${ chartConstants.boxPadWidth * -1 } ${ opponent.y + (chartConstants.boxHeight / 2) }, 0 ${ opponent.y + (chartConstants.boxHeight / 2) }` } />
						: ""
						}
						
						<g transform={`translate(0, ${ opponent.y })`}>
							<rect x="0" y="0" width={ chartConstants.boxWidth } height={ chartConstants.boxHeight } rx="5" className={`wrestlerContainer ${ opponent.id && selectedOpponent == opponent.id ? "selected" : "" }`} />

							<rect x="5" y="5" width="30" height={ chartConstants.boxHeight - 10 } rx="5" className={`opponentRecordBox ${ opponent.wins > opponent.losses ? "better" : "worse" }`} />
							<text x="19" y={ chartConstants.boxHeight / 2 } className="record" textAnchor="middle" alignmentBaseline="middle">{ opponent.record }</text>

							<text x="40" y="5" alignmentBaseline="hanging">{ opponent.date ? opponent.date.toLocaleDateString() : "" }</text>
							<text x="40" y={ (chartConstants.boxHeight / 2) + 1 } alignmentBaseline="middle" className="opponentName"><title>{opponent.name}</title>{ opponent.name.length > 24 ? opponent.name.substring(0, 24) + "..." : opponent.name }</text>
							<text x="40" y={ chartConstants.boxHeight - 5 } alignmentBaseline="baseline">{ opponent.teams + (opponent.teams.length == 25 ? "..." : "") }</text>

							{
							opponent.id ?
							<>
							<rect x={ chartConstants.boxWidth - 30 } y={ (chartConstants.boxHeight / 2) - 12 } width="24" height="24" onClick={ () => window.open(`/portal/wrestler.html?id=${ opponent.id }`, "_blank") } className="networkIcon" />
							<svg x={ chartConstants.boxWidth - 30 } y={ (chartConstants.boxHeight / 2) - 12 } width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className="networkIcon"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
							
							{
							opponent.id && selectedOpponent != opponent.id && !isOpponentLoading ?
							<>
							<rect x={ chartConstants.boxWidth } y={ (chartConstants.boxHeight / 2) - 12 } width="24" height="24" onClick={ () => selectOpponent(tierIndex, opponent) } className="networkIcon" />
							<svg x={ chartConstants.boxWidth } y={ (chartConstants.boxHeight / 2) - 12 } width="24px" height="24px" onClick={ () => selectOpponent(tierIndex, opponent) } viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" className="networkIcon"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
							</>
							: ""
							}
							</>
							: "" }

						</g>
					</g>
					)
					}
				</g>

				)
				}

			</svg>

		</div>
	</div>

	{
	winTypeChart.win ?

	<div className="panel">
		<h3>
			Win By
		</h3>

		<div className="inlay winByChart">
			<svg style={{width: "225px", height: "200px"}}>
				<line x1="105" y1="20" x2="105" y2="180" />
				<line x1="25" y1="100" x2="185" y2="100" />

				<text x="105" y="0" textAnchor="middle" alignmentBaseline="hanging">F</text>
				<text x="105" y="185" textAnchor="middle" alignmentBaseline="hanging">TF</text>
				<text x="190" y="100" textAnchor="start" alignmentBaseline="middle">DEC</text>
				<text x="0" y="100" textAnchor="start" alignmentBaseline="middle">MD</text>

				<g transform="translate(105,100)">
					<path className="winPath" d={ winTypeChart.win.path } />
					
					{
					winTypeChart.win.labels.map((label, labelIndex) =>
					<text className="winTypeText" x={ label.x } y={ label.y } key={labelIndex}>{ label.text }</text>
					)
					}
				</g>
			</svg>
		</div>

	</div>
	: ""
	}

	{
	winTypeChart.lose ?

	<div className="panel">
		<h3>
			Lost By
		</h3>

		<div className="inlay winByChart">
			<svg style={{width: "225px", height: "200px"}}>
				<line x1="105" y1="20" x2="105" y2="180" />
				<line x1="25" y1="100" x2="185" y2="100" />

				<text x="105" y="0" textAnchor="middle" alignmentBaseline="hanging">F</text>
				<text x="105" y="185" textAnchor="middle" alignmentBaseline="hanging">TF</text>
				<text x="190" y="100" textAnchor="start" alignmentBaseline="middle">DEC</text>
				<text x="0" y="100" textAnchor="start" alignmentBaseline="middle">MD</text>

				<g transform="translate(105,100)">
					<path className="losePath" d={ winTypeChart.lose.path } />
					
					{
					winTypeChart.lose.labels.map((label, labelIndex) =>
					<text className="winTypeText" x={ label.x } y={ label.y } key={labelIndex}>{ label.text }</text>
					)
					}
				</g>
			</svg>
		</div>

	</div>
	: ""
	}

</div>

}
</div>

	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<WrestlerComponent />);
export default WrestlerComponent;
