import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/team.css";
import TeamCompareMatch from "./teamcomparematch.jsx";
import TeamCompareSCMat from "./teamcomparescmat.jsx";
import TeamDepthEdit from "./teamdepthedit.jsx";

const TeamCompare = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("overview");
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ divisions, setDivisions ] = useState([]);
	const [ selectedDivision, setSelectedDivision ] = useState("");
	const [ sessionData, setSessionData ] = useState(null);

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
					const newDivisions = [...new Set(
						data.team.wrestlers.flatMap(wrestler => 
							/(hs|high school|high)/i.test(wrestler.division) ? "Varsity"
							: /(jv|junior varsity)/i.test(wrestler.division) ? "JV"
							: /(ms|middle school)/i.test(wrestler.division) ? "MS"
							: wrestler.division.trim()
						))];
		
					const newSelectedDivision = newDivisions.includes(data.loggedInUser.session.selectedDivision) ? data.loggedInUser.session.selectedDivision // If the session has a selected division (and it exists)
						: newDivisions
							.sort((divisionA, divisionB) => 
								/varsity/i.test(divisionA) ? -1 
								: /varsity/i.test(divisionB) ? 1 
								: /jv/i.test(divisionA) ? -1
								: /jv/i.test(divisionB) ? 1
								: /ms/i.test(divisionA) ? -1
								: /ms/i.test(divisionB) ? 1
								: divisionA > divisionB ? 1 : -1
							) // Prioritize by type of division
							.find(() => true);
		
					const teamWeightClasses = data.team.wrestlers.flatMap(wrestler => ({ weightClass: wrestler.weightClass, division: wrestler.division }));
							
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
							divisions: weightClassName == "Other" ? divisions // Use all divisions if this is for other
								: [...new Set(teamWeightClasses.filter(weightClass => weightClass.weightClass == weightClassName).map(weightClass => weightClass.division)) ], 
							teamWrestlers: data.team.wrestlers
								.filter(wrestler => wrestler.weightClass == weightClassName)
								.sort((wrestlerA, wrestlerB) =>
									wrestlerA.division == selectedDivision && wrestlerB.division != selectedDivision ? -1
									: wrestlerA.division != selectedDivision && wrestlerB.division == selectedDivision ? 1
									: wrestlerA.position - wrestlerB.position
								)
								.map((wrestler, wrestlerIndex) => ({
									...wrestler,
									name: wrestler.firstName + " " + wrestler.lastName,
									position: wrestlerIndex
								})),
							opponentWrestlers: []
						}));
					
					if (data.loggedInUser.session) {
						if (data.loggedInUser.session.selectedDivision) {
							setSelectedDivision(data.loggedInUser.session.selectedDivision);
						}

						if (data.loggedInUser.session.selectedOpponentId) {
							setSelectedOpponentId(data.loggedInUser.session.selectedOpponentId);
						}
						
						if (data.loggedInUser.session.compare) {
							setSessionData(data.loggedInUser.session.compare);
						}
					}

					setTeam(data.team);
					setOpponents(data.scmatTeams);
					setDivisions(newDivisions);
					setSelectedDivision(newSelectedDivision);
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
					const teamSession = (sessionData || []).filter(record => record.division == selectedDivision && record.opponentId == selectedOpponentId)
							.flatMap(record => record.weightClasses.flatMap(weightClass => weightClass.teamWrestlers))
							.map(wrestler => ({ id: wrestler.id, weightClass: wrestler.weightClass, position: wrestler.position }));
					
					const opponentSession = (sessionData || []).filter(record => record.division == selectedDivision && record.opponentId == selectedOpponentId)
						.flatMap(record => record.weightClasses.flatMap(weightClass => weightClass.opponentWrestlers))
						.map(wrestler => ({ id: wrestler.id, weightClass: wrestler.weightClass, position: wrestler.position }));
					
					const sessionWeightClasses = (sessionData || []).filter(record => record.division == selectedDivision && record.opponentId == selectedOpponentId)
						.flatMap(record => record.weightClasses);

					// Set the data for the weight classes they've wrestled before
					const wrestlers = data.wrestlers.map(wrestler => {
							const lastWeightClass = wrestler.weightClasses
								.map(weightClass => ({...weightClass, lastDate: new Date(weightClass.lastDate) }))
								.filter(weightClass => !isNaN(weightClass.weightClass))
								.sort((weightClassA, weightClassB) => +weightClassB.lastDate - +weightClassA.lastDate)
								.find(() => true);
		
							const closestWeightClass = opponentSession.some(sessionWrestler => wrestler.id == sessionWrestler.id) ?
									opponentSession.filter(sessionWrestler => wrestler.id == sessionWrestler.id).map(sessionWrestler => sessionWrestler.weightClass).find(() => true)
								: lastWeightClass ? weightClasses
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
								weightClasses: wrestler.weightClasses.map(weightClass => ({...weightClass, lastDate: new Date(weightClass.lastDate)})),
								weightClass: closestWeightClass,
								position: opponentSession.filter(sessionWrestler => wrestler.id == sessionWrestler.id).map(sessionWrestler => sessionWrestler.position).find(() => true),
								lastDate: lastWeightClass ? lastWeightClass.lastDate : null
							}
						});
					
					const opponentDivisions = wrestlers.flatMap(wrestler => 
						/(hs|high school|high)/i.test(wrestler.division) ? "Varsity"
						: /(jv|junior varsity)/i.test(wrestler.division) ? "JV"
						: /(ms|middle school)/i.test(wrestler.division) ? "MS"
						: wrestler.division.trim());
					
					const newDivisions = [...new Set(divisions.concat(opponentDivisions))];
					const opponentWeightClasses = wrestlers.flatMap(wrestler => ({ weightClass: wrestler.weightClass, division: wrestler.division }));
					
					const newWeightClasses = weightClasses.map(weightClass => ({
							...weightClass,
							divisions: weightClass.name == "Other" ? divisions 
								: [...new Set(weightClass.divisions.concat(
									opponentWeightClasses.filter(opponentWeightClass => opponentWeightClass.weightClass == weightClass.name).map(filterWeightClass => filterWeightClass.division)
								)) ], // Use all divisions if this is for other
							teamWrestlers: weightClass.teamWrestlers.map((teamWrestler, teamWrestlerIndex) => ({
									...teamWrestler,
									position: teamSession.filter(sessionWrestler => sessionWrestler.id == teamWrestler.id).map(sessionWrestler => sessionWrestler.position).find(() => true) ?? teamWrestlerIndex
								}))
								.sort((wrestlerA, wrestlerB) => wrestlerA.position - wrestlerB.position),
							opponentWrestlers: wrestlers
								.filter(wrestler => wrestler.weightClass == weightClass.name)
								.sort((wrestlerA, wrestlerB) => 
									(wrestlerA.position || wrestlerA.position === 0) && (wrestlerB.position || wrestlerB.position === 0) ? wrestlerA.position - wrestlerB.position
									: (wrestlerA.position || wrestlerA.position === 0) && (!wrestlerB.position && wrestlerB.position !== 0) ? -1
									: (!wrestlerA.position && wrestlerA.position !== 0) && (wrestlerB.position || wrestlerB.position === 0) ? 1
									: wrestlerA.division == selectedDivision && wrestlerB.division != selectedDivision ? -1
									: wrestlerA.division != selectedDivision && wrestlerB.division == selectedDivision ? 1
									: +wrestlerB.lastDate - +wrestlerA.lastDate
								)
								.map((wrestler, wrestlerIndex) => ({
									...wrestler,
									position: wrestlerIndex
								})),
							teamScore: sessionWeightClasses.filter(sessionWeightClass => sessionWeightClass.name == weightClass.name).map(sessionWeightClass => sessionWeightClass.teamScore).find(() => true) ?? "",
							opponentScore: sessionWeightClasses.filter(sessionWeightClass => sessionWeightClass.name == weightClass.name).map(sessionWeightClass => sessionWeightClass.opponentScore).find(() => true) ?? ""
						}));
					
					setDivisions(newDivisions);
					setWeightClasses(newWeightClasses);
					saveCompareSession(newWeightClasses);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, [ selectedOpponentId ]);

	const updatePosition = (isTeam, weightClassChange, wrestlerId, newPosition) => {
		const changedWrestler = weightClasses
			.flatMap(weightClass => isTeam ? weightClass.teamWrestlers : weightClass.opponentWrestlers)
			.filter(wrestler => wrestler.id == wrestlerId)
			.find(() => true);
		
		if (changedWrestler.weightClass != weightClassChange || changedWrestler.position !== newPosition) {
			changedWrestler.weightClass = weightClassChange;

			const newWeightClasses = weightClasses.map(weightClass => {
				const filteredWrestlers = (isTeam ? weightClass.teamWrestlers : weightClass.opponentWrestlers).filter(wrestler => wrestler.id != wrestlerId);
				
				return {
					...weightClass,
					teamWrestlers: !isTeam ? weightClass.teamWrestlers
						: weightClass.name != weightClassChange ? filteredWrestlers
						: [
							...filteredWrestlers.slice(0, newPosition),
							changedWrestler,
							...filteredWrestlers.slice(newPosition)
						].map((wrestler, wrestlerIndex) => ({...wrestler, position: wrestlerIndex })),
					opponentWrestlers: isTeam ? weightClass.opponentWrestlers
						: weightClass.name != weightClassChange ? filteredWrestlers
						: [
							...filteredWrestlers.slice(0, newPosition),
							changedWrestler,
							...filteredWrestlers.slice(newPosition)
						].map((wrestler, wrestlerIndex) => ({...wrestler, position: wrestlerIndex }))
				};
			});

			setWeightClasses(newWeightClasses);
			saveCompareSession(newWeightClasses);
		}
	};

	const updateScore = (weightClassUpdate, isTeam, score) => {
		const newWeightClasses = weightClasses.map(weightClass => ({
			...weightClass,
			teamScore: weightClass.name != weightClassUpdate ? weightClass.teamScore
				: isTeam ? score 
				: score === "" ? ""
				: +score === 0 ? 3
				: 0,
			opponentScore: weightClass.name != weightClassUpdate ? weightClass.opponentScore
				: !isTeam ? score 
				: score === "" ? ""
				: +score === 0 ? 3
				: 0
		}));
		
		setWeightClasses(newWeightClasses);
		saveCompareSession(newWeightClasses);
	};

	const saveCompareSession = newWeightClasses => {
		const saveSession = {
			selectedDivision: selectedDivision,
			selectedOpponentId: selectedOpponentId,
			compare: {
				division: selectedDivision,
				opponentId: selectedOpponentId,
				weightClasses: newWeightClasses.map(weightClass => ({
					name: weightClass.name,
					teamWrestlers: weightClass.teamWrestlers.map(wrestler => ({ id: wrestler.id, weightClass: wrestler.weightClass, position: wrestler.position })),
					opponentWrestlers: weightClass.opponentWrestlers.map(wrestler => ({ id: wrestler.id, weightClass: wrestler.weightClass, position: wrestler.position })),
					teamScore: weightClass.teamScore,
					opponentScore: weightClass.opponentScore
				}))
			}
		};

		fetch(`/api/usersessionsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: saveSession }) })
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
							{
							opponents
								.sort((opponentA, opponentB) => opponentA.name > opponentB.name ? 1 : -1)
								.map((opponent, opponentIndex) =>
							<option key={opponentIndex} value={ opponent.id }>{ opponent.name }</option>
							)
							}
						</select>
					</label>
					
					{
					pageView != "scmat" ?

					<label>
						Division
						<select value={ selectedDivision } onChange={ event => setSelectedDivision(event.target.value) }>
							{
							divisions
							.sort((divisionA, divisionB) => divisionA > divisionB ? 1 : -1)
							.map((division, divisionIndex) =>
							<option key={divisionIndex}>{ division }</option>
							)
							}
						</select>
					</label>

					: "" }
				</div>

			</div>

			{

			pageView == "opponentdepth" ? 
			
				<TeamDepthEdit
					weightClasses={ weightClasses.map(weightClass => ({...weightClass, wrestlers: weightClass.opponentWrestlers })) }
					selectedDivision={ selectedDivision }
					updatePosition={ updatePosition }
					homeTeam={ team.name }
					isTeam={ false }
					/>

			: pageView == "teamdepth" ? 
	
				<TeamDepthEdit
					weightClasses={ weightClasses.map(weightClass => ({...weightClass, wrestlers: weightClass.teamWrestlers })) }
					selectedDivision={ selectedDivision }
					updatePosition={ updatePosition }
					isTeam={ true }
					/>
	
			: pageView == "match" ?

				<TeamCompareMatch 
					team={ team }
					weightClasses={ weightClasses }
					updateScore={ updateScore }
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

			<button aria-label="Team Wrestlers" onClick={ () => setPageView("teamdepth") }>
				{/* Group */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z"/></svg>
				Team
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
