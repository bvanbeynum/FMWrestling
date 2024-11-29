import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/team.css";
import TeamCompareMatch from "./teamcomparematch.jsx";
import TeamCompareSCMat from "./teamcomparescmat.jsx";
import TeamLineup from "./teamlineup.jsx";

const TeamCompare = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("overview");
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ team, setTeam ] = useState(null);
	const [ opponents, setOpponents ] = useState([]);
	const [ selectedOpponentId, setSelectedOpponentId ] = useState("");
	const [ weightClasses, setWeightClasses ] = useState([]);

	useEffect(() => {
		if (!pageActive) {
			
			fetch(`/api/teamcompareload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					const dataTeam = {
						...data.team,
						wrestlers: data.team.wrestlers.map(wrestler => ({
							...wrestler,
							name: wrestler.firstName + " " + wrestler.lastName,
							division: /(hs|high school|high)/i.test(wrestler.division) ? "Varsity"
								: /(jv|junior varsity)/i.test(wrestler.division) ? "JV"
								: /(ms|middle school)/i.test(wrestler.division) ? "MS"
								: (wrestler.division || "").trim(),
						}))
					};

					const teamWeightClasses = dataTeam.wrestlers.flatMap(wrestler => ({ weightClass: wrestler.weightClass, division: wrestler.division }));
							
					// get the distinct list of weight classes from the team's weigh classes
					const newWeightClassNames = [...new Set(teamWeightClasses.map(weightClass => weightClass.weightClass))]
						.sort((weightA, weightB) => 
							!isNaN(weightA) && !isNaN(weightB) ? +weightA - +weightB
							: !isNaN(weightA) && isNaN(weightB) ? -1
							: isNaN(weightA) && !isNaN(weightB) ? 1
							: weightA > weightB ? 1 : -1
						).concat(["Other"]);

					const newWeightClasses = newWeightClassNames.map(weightClassName => ({
							name: weightClassName,
							teamWrestlers: dataTeam.wrestlers
								.filter(wrestler => wrestler.weightClass == weightClassName)
								.sort((wrestlerA, wrestlerB) => wrestlerA.position - wrestlerB.position)
								.map((wrestler, wrestlerIndex) => ({
									...wrestler,
									position: wrestlerIndex
								})),
							opponentWrestlers: []
						}));
					
					setTeam(dataTeam);
					setOpponents(data.scmatTeams);
					setWeightClasses(newWeightClasses);

					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	useEffect(() => {
		if (selectedOpponentId) {
			fetch(`/api/teamgetopponentwrestlers?opponentid=${ selectedOpponentId }`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {

					// Set the data for the weight classes they've wrestled before
					const wrestlers = data.wrestlers.map(wrestler => {
							const lastWeightClass = wrestler.weightClasses
								.map(weightClass => ({...weightClass, lastDate: new Date(weightClass.lastDate) }))
								.filter(weightClass => !isNaN(weightClass.weightClass))
								.sort((weightClassA, weightClassB) => +weightClassB.lastDate - +weightClassA.lastDate)
								.find(() => true);
		
							const closestWeightClass = lastWeightClass ? weightClasses
									.map(weightClass => weightClass.name)
									.filter(weightClass => !isNaN(weightClass))
									.sort((weightClassA, weightClassB) =>
										weightClassA == lastWeightClass.weightClass && weightClassB != lastWeightClass.weightClass ? -1
										: weightClassA != lastWeightClass.weightClass && weightClassB == lastWeightClass.weightClass ? 1
										: Math.abs(+lastWeightClass.weightClass - +weightClassA) >= Math.abs(+lastWeightClass.weightClass - +weightClassB) ? 1
										: -1
									)
									.find(() => true)
								: "Other";
							
							return {
								...wrestler,
								division: /(hs|high school|high)/i.test(wrestler.division) ? "Varsity"
									: /(jv|junior varsity)/i.test(wrestler.division) ? "JV"
									: /(ms|middle school)/i.test(wrestler.division) ? "MS"
									: (wrestler.division || "").trim(),
								lastEvent: {...wrestler.lastEvent, date: new Date(wrestler.lastEvent?.date) },
								weightClasses: wrestler.weightClasses.map(weightClass => ({...weightClass, lastDate: new Date(weightClass.lastDate)})),
								weightClass: closestWeightClass,
								lastDate: lastWeightClass ? lastWeightClass.lastDate : null
							}
						});

					const sessionOpponent = loggedInUser.session && loggedInUser.session?.opponents ? loggedInUser.session.opponents.find(opponent => opponent.id == selectedOpponentId) : null,
						sessionWeights = sessionOpponent ? 
							sessionOpponent.weightClasses
								.map(sessionWeight => ({ 
									name: sessionWeight.name, 
									opponentWrestler: wrestlers.find(wrestler => sessionWeight.opponentWrestlerId == wrestler.id),
									opponentScore: sessionWeight.opponentScore,

									teamWrestler: team.wrestlers.find(wrestler => sessionWeight.teamWrestlerId == wrestler.id),
									teamScore: sessionWeight.teamScore
								}))
								: [];
					
					const weightClassSorted = weightClasses.map(weightClass => ({
							name: weightClass.name,
							wrestlers: wrestlers
								.filter(wrestler => wrestler.weightClass == weightClass.name)
								.sort((wrestlerA, wrestlerB) => 
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
									: +wrestlerA.lastDate - +wrestlerB.lastDate
								)
								.map((wrestler, wrestlerIndex) => ({
									...wrestler,
									position: wrestlerIndex
								}))
						})
					);
					
					const newWeightClasses = weightClasses.map(weightClass => ({
							...weightClass,

							opponentWrestler: sessionWeights.some(sessionWeight => sessionWeight.name == weightClass.name && sessionWeight.opponentWrestler) ? 
								sessionWeights.filter(sessionWeight => sessionWeight.name == weightClass.name).map(sessionWeight => sessionWeight.opponentWrestler).find(() => true)
								: weightClassSorted.filter(sorted => sorted.name == weightClass.name).map(sorted => sorted.wrestlers.find(() => true)).find(() => true),
							opponentWrestlers: weightClassSorted.filter(sorted => sorted.name == weightClass.name).map(sorted => sorted.wrestlers).find(() => true),

							teamWrestler: sessionWeights.some(sessionWeight => sessionWeight.name == weightClass.name && sessionWeight.teamWrestler) ? 
								sessionWeights.filter(sessionWeight => sessionWeight.name == weightClass.name).map(sessionWeight => sessionWeight.teamWrestler).find(() => true)
								: weightClass.teamWrestlers.find(() => true),

							teamScore: sessionWeights
								.filter(sessionWeight => sessionWeight.name == weightClass.name && sessionWeight.teamScore)
								.map(sessionWeight => sessionWeight.teamScore).find(() => true) 
								|| 0,
							opponentScore: sessionWeights
								.filter(sessionWeight => sessionWeight.name == weightClass.name && sessionWeight.opponentScore)
								.map(sessionWeight => sessionWeight.opponentScore).find(() => true) 
								|| 0
						}));
					
					setWeightClasses(newWeightClasses);

				})
				.catch(error => {
					console.warn(error);
				});
		}
		else {
			setWeightClasses(weightClasses => weightClasses.map(weightClass => ({
				...weightClass,
				opponentWrestlers: []
			})));
		}
	}, [ selectedOpponentId ]);

	const updateScore = (weightClassSave, isTeamScore, scoreSave) => {
		console.log(`Save - s: ${ loggedInUser.session ? "yes" : "no" }, o: ${ loggedInUser.session && loggedInUser.session.opponents ? "yes" : "no" }, o#: ${ loggedInUser.session && loggedInUser.session.opponents ? loggedInUser.session.opponents.length : "-" }`);
		let sessionOpponents = loggedInUser.session?.opponents || [];

		if (!sessionOpponents.some(opponent => opponent.id == selectedOpponentId)) {
			sessionOpponents.push({
				id: selectedOpponentId,
				weightClasses: []
			});
		}

		const teamScore = isTeamScore ? +scoreSave
				: scoreSave === "" ? ""
				: +scoreSave === 0 ? 3
				: 0,
			opponentScore = !isTeamScore ? +scoreSave 
				: scoreSave === "" ? ""
				: +scoreSave === 0 ? 3
				: 0;
		
		sessionOpponents = sessionOpponents.map(opponent => ({
			...opponent,
			weightClasses: opponent.weightClasses.some(weightClass => weightClass.name == weightClassSave) ?
				opponent.weightClasses.map(weightClass => ({
					...weightClass, 
					opponentScore: weightClass.name == weightClassSave ? opponentScore : weightClass.opponentScore,
					teamScore: weightClass.name == weightClassSave ? teamScore : weightClass.teamScore
				}))
				: opponent.weightClasses.concat([{
					name: weightClassSave,
					opponentScore: opponentScore,
					teamScore: teamScore
				}])
		}));

		fetch(`/api/usersessionsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: { opponents: sessionOpponents } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => { })
			.catch(error => {
				console.warn(error);
			});
		
		setWeightClasses(weightClasses => weightClasses.map(weightClass => ({
			...weightClass,
			opponentScore: weightClass.name == weightClassSave ? opponentScore : weightClass.opponentScore,
			teamScore: weightClass.name == weightClassSave ? teamScore : weightClass.teamScore
		})));
		
		setLoggedInUser(loggedInUser => ({
			...loggedInUser,
			session: {
				...loggedInUser.session,
				opponents: sessionOpponents
			}
		}));
	};

	const saveWrestler = (weightClassSave, isTeam, wrestlerSave) => {
		
		let sessionOpponents = loggedInUser.session?.opponents || [];

		if (!sessionOpponents.some(opponent => opponent.id == selectedOpponentId)) {
			sessionOpponents.push({
				id: selectedOpponentId,
				weightClasses: []
			});
		}

		sessionOpponents = sessionOpponents.map(opponent => ({
			...opponent,
			weightClasses: opponent.weightClasses.some(weightClass => weightClass.name == weightClassSave) ? // Do we already have the weight class in the session
				opponent.weightClasses.map(weightClass => ({
					...weightClass, 
					opponentWrestlerId: !isTeam && weightClass.name == weightClassSave ? wrestlerSave.id : weightClass.opponentWrestlerId, 
					teamWrestlerId: isTeam && weightClass.name == weightClassSave ? wrestlerSave.id : weightClass.teamWrestlerId
				}))
				: opponent.weightClasses.concat([{
					name: weightClassSave,
					opponentWrestlerId: !isTeam ? wrestlerSave.id : null,
					teamWrestlerId: isTeam ? wrestlerSave.id : null
				}])
		}));

		fetch(`/api/usersessionsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: { opponents: sessionOpponents } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => { })
			.catch(error => {
				console.warn(error);
			});
		
		setWeightClasses(weightClasses => weightClasses.map(weightClass => ({
			...weightClass,
			opponentWrestler: !isTeam && weightClass.name == weightClassSave ? wrestlerSave : weightClass.opponentWrestler,
			teamWrestler: isTeam && weightClass.name == weightClassSave ? wrestlerSave : weightClass.teamWrestler
		})));
		
		setLoggedInUser(loggedInUser => ({
			...loggedInUser,
			session: {
				...loggedInUser.session,
				opponents: sessionOpponents
			}
		}));
	};

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		
		{
		!pageActive ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("teamManage") ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:
		<>

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>
					Compare { selectedOpponentId ? opponents.filter(opponent => opponent.id == selectedOpponentId).map(opponent => opponent.name).find(() => true) : "Teams" }
				</h1>

				<h1 className="subTitle">
					{
					pageView == "opponentdepth" ? "Opponent Depth"
					: pageView == "teamdepth" ? "Team Depth"
					: pageView == "match" ? "Simulated Match"
					: "SC Mat Rankings"
					}
				</h1>
			</header>
		
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
						Opponent
						<select value={ selectedOpponentId } onChange={ event => setSelectedOpponentId(event.target.value) }>
							<option value="">-- Select Opponent --</option>
							{
							opponents
								.sort((opponentA, opponentB) => opponentA.name > opponentB.name ? 1 : -1)
								.map((opponent, opponentIndex) =>
							<option key={opponentIndex} value={ opponent.id }>{ opponent.name }</option>
							)
							}
						</select>
					</label>
				</div>

			</div>

			{

			pageView == "opponentdepth" ? 
			
				<TeamLineup
					weightClasses={ weightClasses }
					saveWrestler={ saveWrestler }
					/>

			: pageView == "match" ?

				<TeamCompareMatch 
					team={ team }
					weightClasses={ weightClasses }
					updateScore={ updateScore }
					saveWrestler={ saveWrestler }
					/>

			: 
				
				<TeamCompareSCMat
					opponents={ opponents }
					teamId={ team.scmatTeams[0].id }
					selectedOpponentId={ selectedOpponentId }
					setSelectedOpponentId={ setSelectedOpponentId }
					/>

			}

		</div>

		<div className="bottomNav">

			{
			team.scmatTeams && team.scmatTeams.length > 0 ?
			
			<button aria-label="SC Mat Compare" onClick={ () => setPageView("scmat") }>
				{/* World */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480.067-100.001q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM440-162v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 121 79.5 212T440-162Zm276-102q20-22 36-47.5t26.5-53q10.5-27.5 16-56.5t5.5-59q0-98.29-54.308-179.53Q691.385-740.769 600-776.769V-760q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q26 0 47 15.5t29 40.5Z"></path></svg>
				SC Mat
			</button>

			: ""
			}

			<button aria-label="Opponent Wrestlers" onClick={ () => setPageView("opponentdepth") }>
				{/* Wrestlers */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M55.077-93.847 12.924-136l143.692-143.692-46.308-123.385q-6.23-15.692-2.423-36.692 3.808-21 20.115-37.307l132-132q10.462-10.462 22.539-15.693 12.076-5.23 27.153-5.23 15.077 0 27.154 5.23 12.076 5.231 22.538 15.693l80.769 78q27.385 27 65.231 42.692 37.846 15.692 81.692 17.615v59.999q-55-1.923-103.153-20.731-48.154-18.808-81.923-52.192l-34.923-34.154L259.23-410l87.846 89.846v230.153h-59.998v-204.615l-72.002-66.463v107.233l-160 159.999Zm552.001 3.846v-265.383l85.538-81.539-30.154-166.156q-22.693 27.616-48.386 49.502-25.693 21.885-57.463 34.27-23.768-2-45.576-11.116-21.807-9.115-37.191-24.114 45.769-7.616 84.5-34.539 38.732-26.924 59.962-61.539l39.231-64q15.077-24.307 41.423-32.269 26.345-7.961 52.268 2.885l195.846 82.923v171.075h-59.998v-132.153l-95.079-38.001L904.768-90.001H840.77L767.616-396.54l-100.54 85.001v221.538h-59.998ZM447.076-614.615q-30.692 0-52.269-21.577-21.577-21.577-21.577-52.269 0-30.692 21.577-52.269 21.577-21.576 52.269-21.576 30.692 0 52.269 21.576 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.577 21.577-52.269 21.577ZM664-776.154q-30.692 0-52.269-21.576-21.576-21.577-21.576-52.269 0-30.692 21.576-52.269 21.577-21.577 52.269-21.577 30.693 0 52.269 21.577 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.576 21.576-52.269 21.576Z"></path></svg>
				Opponent
			</button>

			<button aria-label="Match Compare" onClick={ () => setPageView("match") }>
				{/* Compare */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M420.001-55.386V-140H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h207.692v-84.615H480v849.228h-59.999ZM200-240h220.001v-263.848L200-240Zm360 99.999V-480l200 240v-507.691q0-4.616-3.846-8.463-3.847-3.846-8.463-3.846H560v-59.999h187.691q30.308 0 51.308 21t21 51.308v535.382q0 30.308-21 51.308t-51.308 21H560Z"/></svg>
				Match
			</button>

		</div>

		</>
		}

	</div>
</div>
	);
		
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamCompare />);
export default TeamCompare;
