import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import TeamDepthEdit from "./teamdepthedit.jsx";
import "./include/index.css";
import "./include/team.css";
import TeamWrestlersEdit from "./teamwrestlersedit.jsx";

const TeamWrestlers = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ team, setTeam ] = useState(null);
	const [ weightClasses, setWeightClasses ] = useState([]);

	const [ editWrestler, setEditWrestler ] = useState(null);
	const [ isWrestlerSaving, setIsWrestlerSaving ] = useState(false);

	useEffect(() => {
		if (!pageActive) {
			
			fetch(`/api/teamwrestlersload`)
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
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);

				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	useEffect(() => {
		if (team && team.wrestlers) {
			const teamWeightClasses = team.wrestlers.flatMap(wrestler => ({ weightClass: wrestler.weightClass, division: wrestler.division }));
			const divisions = [...new Set(teamWeightClasses.map(weightClass => weightClass.division)) ];
			
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
					divisions: divisions, 
					wrestlers: team.wrestlers
						.filter(wrestler => wrestler.weightClass == weightClassName)
						.sort((wrestlerA, wrestlerB) => wrestlerA.position - wrestlerB.position)
						.map((wrestler, wrestlerIndex) => ({
							...wrestler,
							name: wrestler.firstName + " " + wrestler.lastName,
							position: wrestlerIndex
						}))
				}));
			
			setWeightClasses(newWeightClasses);
		}
	}, [ team ])

	const selectWrestler = wrestler => setEditWrestler(wrestler);

	const updatePosition = (isTeam, weightClassChange, wrestlerId, newPosition) => {
		const changedWrestler = weightClasses
			.flatMap(weightClass => weightClass.wrestlers)
			.filter(wrestler => wrestler.id == wrestlerId)
			.find(() => true);
		
		if (changedWrestler.weightClass != weightClassChange || changedWrestler.position !== newPosition) {
			changedWrestler.weightClass = weightClassChange;

			const newWeightClasses = weightClasses.map(weightClass => {
				const filteredWrestlers = weightClass.wrestlers.filter(wrestler => wrestler.id != wrestlerId);
				
				return {
					...weightClass,
					wrestlers: weightClass.name != weightClassChange ? filteredWrestlers
						: [
							...filteredWrestlers.slice(0, newPosition),
							changedWrestler,
							...filteredWrestlers.slice(newPosition)
						].map((wrestler, wrestlerIndex) => ({...wrestler, position: wrestlerIndex }))
				};
			});

			const wrestlers = newWeightClasses.flatMap(weightClass => weightClass.wrestlers);
			const savePacket = {teamId: team.id, saveWrestlers: wrestlers };

			fetch(`/api/teamwrestlerssave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savepacket: savePacket }) })
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
				})
				.catch(error => {
					console.warn(error);
				});
		}
	};

	const saveWrestler = wrestler => {
		setIsWrestlerSaving(true);

		const savePacket = { teamId: team.id };

		if (wrestler && editWrestler && editWrestler.id == wrestler.id) {
			savePacket.saveWrestlers = weightClasses.flatMap(weightClass => 
				weightClass.wrestlers.map(weightClassWrestler => wrestler.id == weightClassWrestler.id ? wrestler : weightClassWrestler)
				);
		}
		else if (wrestler) {
			savePacket.saveWrestlers = weightClasses.flatMap(weightClass => weightClass.wrestlers).concat(wrestler);
		}
		else if (editWrestler) {
			savePacket.saveWrestlers = weightClasses.flatMap(weightClass => 
				weightClass.wrestlers.filter(weightClassWrestler => weightClassWrestler.id != editWrestler.id)
				);
		}

		fetch(`/api/teamwrestlerssave?teamid=${ team.id }`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savepacket: savePacket }) })
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
				setIsWrestlerSaving(false);
				setEditWrestler(null);

			})
			.catch(error => {
				console.warn(error);
				setSavingError("There was an error saving the wretler");
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

		: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("myteam") ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>{ team ? team.name : "" }</h1>
			</header>

			<TeamDepthEdit
				weightClasses={ weightClasses }
				selectedDivision={ "Varsity" }
				updatePosition={ updatePosition }
				isTeam={ true }
				selectWrestler={ selectWrestler }
				/>

			<TeamWrestlersEdit saveWrestler={ saveWrestler } isSaving={ isWrestlerSaving } />

			{
			editWrestler ? 
				<TeamWrestlersEdit wrestler={ editWrestler } saveWrestler={ saveWrestler } cancelEdit={ () => setEditWrestler(null) } isSaving={ isWrestlerSaving } /> 
			: ""
			}

		</div>

		}

	</div>
</div>
	);

}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamWrestlers />);
export default TeamWrestlers;
