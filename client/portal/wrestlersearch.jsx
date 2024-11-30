import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import NavComponent from "./nav.jsx";
import WrestlerDetails from "./wrestlerdetails.jsx";
import "./include/index.css";
import "./include/wrestler.css";

const WrestlerSearchComponent = () => {

	const chartColors = ["#0074C2", "#F0AC00", "#E66000", "#5E97BD", "#B89E5C", "#E5641E"];
	const TAU = 0.5;

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("search");
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ teamLookup, setTeamLookup ] = useState([]);
	const [ teamLookupSelected, setTeamLookupSelected ] = useState("");
	const [ wrestlerSearch, setWrestlerSearch ] = useState("");
	const [ teamSearch, setTeamSearch ] = useState("");

	const [ wrestlerResults, setWrestlerResults ] = useState([]);
	const [ selectedWrestlers, setSelectedWrestlers ] = useState([]);
	const [ compareWrestlers, setCompareWrestlers ] = useState([]);
	const [ compareChart, setCompareChart ] = useState({ size: { width: 500, height: 350 }, paths: [], labels: [] });
	const [ probabilities, setProbabilities ] = useState([]);

	useEffect(() => {
		if (!pageActive) {
			fetch(`/api/wrestlersearchload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setTeamLookup(data.scmatTeams);
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	useEffect(() => {
		if (wrestlerSearch && wrestlerSearch.length > 3) {
			
			fetch(`/api/wrestlersearch?search=${ wrestlerSearch }&searchtype=wrestler`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setWrestlerResults(data.wrestlers.map(wrestler => ({
						...wrestler,
						lastEvent: wrestler.lastEvent ? {...wrestler.lastEvent, date: new Date(wrestler.lastEvent.date)} : null
					})));
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, [ wrestlerSearch ]);

	const selectWrestler = wrestler => {
		window.open(`/portal/wrestler.html?id=${ wrestler.id }`, "_blank");
		// setPageView("results");

		// if (!selectedWrestlers.some(selected => selected.id == wrestler.id)) {
		// 	setSelectedWrestlers(selectedWrestlers.concat(wrestler));
		// }
	};

	const updateWrestler = updatedWrestler => {
		setSelectedWrestlers(selectedWrestlers.map(wrestler => wrestler.id == updatedWrestler.id ? updatedWrestler : wrestler));
	};

	const normalDistribution = (x, mean, standardDeviation) => {
		// Calculate the Z-score (standardizaion)
		const z = (x - mean) / standardDeviation;

		// Probability density function (PDF)
		const constant = 1 / (standardDeviation * Math.sqrt(2 * Math.PI));
		const pdf = constant * Math.exp(-0.5 * Math.pow((x - mean) / standardDeviation, 2));

		return pdf;
	};

	const scale = phi => 1 / Math.sqrt(1 + 3 * Math.pow(phi, 2) / Math.pow(Math.PI, 2));

	const probability = (rating1, deviation1, rating2, deviation2) => {
		// Calculate the expected outcome for each partitipant
		const expected1 = 1 / (1 + Math.exp(-TAU * scale(deviation2) * (rating1 - rating2)));
		const expected2 = 1 / (1 + Math.exp(-TAU * scale(deviation1) * (rating2 - rating1)));

		// Calculate the win probability for participant 1
		const winProbability = expected1 / (expected1 + expected2);

		return winProbability;
	};

	const addCompare = compare => {

		if (compareWrestlers.some(wrestler => wrestler.id == compare.id)) {
			setCompareWrestlers(compareWrestlers.filter(wrestler => wrestler.id != compare.id));
		}
		else {
			const wrestlers = compareWrestlers.concat(compare);

			const valueMin = wrestlers.map(wrestler => wrestler.gRating - (wrestler.gDeviation * 3)).sort((wrestlerA, wrestlerB) => wrestlerA - wrestlerB).find(() => true),
				valueMax = wrestlers.map(wrestler => wrestler.gRating + (wrestler.gDeviation * 3)).sort((wrestlerA, wrestlerB) => wrestlerB - wrestlerA).find(() => true),
				steps = 100,
				step = (valueMax - valueMin) / steps,
				wrestlerDistributions = wrestlers.map(wrestler =>
					Array.from(Array(steps).keys()).map(point => normalDistribution(valueMin + (point * step), wrestler.gRating, wrestler.gDeviation))
					),
				pointMin = wrestlerDistributions.flatMap(distribution => distribution).sort((pointA, pointB) => pointA - pointB).find(() => true),
				pointMax = wrestlerDistributions.flatMap(distribution => distribution).sort((pointA, pointB) => pointB - pointA).find(() => true),
				wrestlerPaths = wrestlerDistributions.map((distribution, distributionIndex) => ({
					color: chartColors[distributionIndex],
					path: distribution.map((point, pointIndex) => 
						(pointIndex == 0 ? "M" : "L") + ((pointIndex * compareChart.size.width) / steps) + " " + (compareChart.size.height - ((point * compareChart.size.height) / (pointMax - pointMin)))
					).join(", ")
				})),
				labels = [
					{ x: 0, text: Math.round(valueMin), align: "start" },
					{ x: compareChart.size.width, text: Math.round(valueMax), align: "end" },
					...wrestlers.map(wrestler => ({ x: ((wrestler.gRating - valueMin) * compareChart.size.width) / (valueMax - valueMin), text: Math.round(wrestler.gRating), align: "middle" }))
				];
			
			const updatedProbability = wrestlers.map(wrestler => ({
				name: wrestler.name,
				compare: wrestlers
					.filter(compare => compare.id != wrestler.id)
					.map(compare => ({
						name: compare.name,
						wrestlerProb: (probability(wrestler.gRating, wrestler.gDeviation, compare.gRating, compare.gDeviation) * 100).toFixed(2),
						compareProb: (probability(compare.gRating, compare.gDeviation, wrestler.gRating, wrestler.gDeviation) * 100).toFixed(2)
					}))
			}));
			
			setCompareChart({ ...compareChart, paths: wrestlerPaths, labels: labels })
			setProbabilities(updatedProbability);
			setCompareWrestlers(wrestlers);
		}
	}

	return (
<div className="page">
	<NavComponent loggedInUser={ loggedInUser } />

	<div>
		
		{
		!pageActive ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("wrestlerResearch") ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:
		<>

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>Search Wrestlers</h1>
			</header>
		
			{

			pageView == "results" ? 
			
			selectedWrestlers.map((wrestler, wrestlerIndex) =>
				
				<WrestlerDetails 
					key={wrestlerIndex} 
					wrestlerId={ wrestler.id } 
					wrestlerName={ wrestler.name }
					updateWrestler={ updateWrestler }
					addCompare={ addCompare }
					isCompare={ compareWrestlers.some(compare => compare.id == wrestler.id) }
					wrestler={ wrestler }
					closeWrestler={ wrestlerId => setSelectedWrestlers(selectedWrestlers.filter(selected => selected.id != wrestlerId)) }
					/>

			)

			: pageView == "compare" ?
			<>

			<div className="panel expandable">
				<h3>
					{ compareWrestlers.map(wrestler => wrestler.name).join(" • ") }
				</h3>

				<svg viewBox={`0 0 ${ compareChart.size.width } ${ compareChart.size.height + 20 }`} preserveAspectRatio="xMidYMid meet" className="lineChart">
					<g className="chartArea">
						{
						compareChart.paths.map((path, pathIndex) =>
						<path key={ pathIndex } stroke={ path.color } d={ path.path } />
						)
						}

						{
						compareChart.labels
						.filter((label) => label.x != 0 && label.x != compareChart.size.width)
						.map((label, labelIndex) => 
						<line key={labelIndex} className="chartLine" x1={ label.x } y1="0" x2={ label.x } y2={ compareChart.size.height }></line>
						)
						}
					</g>

					<g className="bottomAxis" transform={`translate(0, ${ compareChart.size.height + 3 })`}>
						<line className="axisLine" x1="0" y1="0" x2={ compareChart.size.width } y2="0"></line>
						{
						compareChart.labels.map((label, labelIndex) => 	
						<text key={ labelIndex } x={ label.x } y="8" textAnchor={ label.align } alignmentBaseline="hanging">{ label.text }</text>
						)
						}
					</g>
				</svg>

				<div className="lineChart legend">
				{
				compareWrestlers.map((wrestler, wrestlerIndex) =>
					
					<div key={wrestlerIndex} className="legendItem">
						<div className="colorBox" style={{ backgroundColor: chartColors[wrestlerIndex] }}></div>
						<div>{ wrestler.name }</div>
					</div>

				)
				}
				</div>
			</div>

			{
			probabilities.map((wrestler, wrestlerIndex) =>

			<div key={wrestlerIndex} className="panel">
				<h3>{ wrestler.name }</h3>

				<table className="sectionTable probabilityTable">
				<tbody>
				{
				wrestler.compare.map((compare, compareIndex) =>
				<tr key={compareIndex}>
					<td>{ wrestler.name }</td>
					<td className={ compare.wrestlerProb > 50 ? "win" : compare.wrestlerProb < 50 ? "lose" : "" }>{ compare.wrestlerProb }</td>
					<td className={ compare.compareProb > 50 ? "win" : compare.compareProb < 50 ? "lose" : "" }>{ compare.compareProb }</td>
					<td>{ compare.name }</td>
				</tr>
				)
				}
				</tbody>
				</table>
			</div>

			)
			}

			</>
			: 

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
						Wrestler
						<input type="text" value={ wrestlerSearch } onChange={ event => setWrestlerSearch(event.target.value) } aria-label="Wrestler Search" />
					</label>
{/* 					
					<label>
						Team
						<input type="text" value={ teamSearch } onChange={ event => setTeamSearch(event.target.value) } aria-label="Team Search" />
					</label>
					
					<label>
						Select Team
						<select value={ teamLookupSelected } onChange={ event => setTeamLookupSelected(event.target.value) }>
							{
							teamLookup
							.sort((teamA, teamB) => teamA.name > teamB.name ? 1 : -1)
							.map((team, teamIndex) =>
								<option key={teamIndex} value={ team.id }>{ team.name }</option>
							)
							}
						</select>
					</label> */}
				</div>

			</div>
			
			{
			wrestlerResults.map((wrestler, wrestlerIndex) => 
				<div key={wrestlerIndex} className="panel button" onClick={ event => selectWrestler(wrestler) }>
					{
					wrestler.division ?
					<div className="subHeading">
						{ wrestler.division } • { wrestler.weightClass}
					</div>
					: ""
					}

					<h3>{ wrestler.name }</h3>

					<div>{ wrestler.team }</div>
					{
					wrestler.lastEvent ?
					<div>{ wrestler.lastEvent.date.toLocaleDateString() } • { wrestler.lastEvent.name }</div>
					: ""
					}
				</div>
			)
			}
			
			</>
			}
		</div>

		</>
		}

	</div>
</div>
	);
		
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<WrestlerSearchComponent />);
export default WrestlerSearchComponent;
