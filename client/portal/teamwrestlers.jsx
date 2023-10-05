import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import TeamDepth from "./teamdepth.jsx";
import TeamWrestlersEdit from "./teamwrestlersedit.jsx";
import TeamLink from "./teamlink.jsx";
import "./include/index.css";
import "./include/team.css";

const TeamWrestlers = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("overview");
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ savingError, setSavingError ] = useState("");

	const [ divisions, setDivisions ] = useState([]);
	const [ selectedDivision, setSelectedDivision ] = useState("");

	const [ team, setTeam ] = useState(null);

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
					
					if (data.loggedInUser.session) {
						if (data.loggedInUser.session.selectedDivision) {
							setSelectedDivision(data.loggedInUser.session.selectedDivision);
						}
					}

					setTeam(data.team);
					setDivisions([...new Set(data.team.wrestlers.map(wrestler => wrestler.division))]);
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const selectDivision = division => {
		const session = {
			selectedDivision: division
		};

		fetch(`/api/usersessionsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: session }) })
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
		
		setSelectedDivision(division);
	};

	const addWrestler = newWrestler => {
		setSavingError("");

		// fetch(`/api/teamwrestlerssave?teamid=${ team.id }`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wrestler: newWrestler }) })
		// 	.then(response => {
		// 		if (response.ok) {
		// 			return response.json();
		// 		}
		// 		else {
		// 			throw Error(response.statusText);
		// 		}
		// 	})
		// 	.then(data => {
		// 		resetData({...team, wrestlers: team.wrestlers.concat(data.wrestler) }, opponents);
		// 	})
		// 	.catch(error => {
		// 		console.warn(error);
		// 		setSavingError("There was an error saving the wretler");
		// 	});
	};

	const updateWrestlers = wrestlers => {
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
	};

	const linkFlo = floTeamId => {
		const savePacket = {
			saveFloTeam: { teamId: team.id, floTeamId: floTeamId }
		};

		fetch(`/api/teamviewsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savepacket: savePacket }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				resetData(c, opponents);
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const unlinkFlo = floTeamId => {
		const savePacket = {
			deleteFloTeam: { teamId: team.id, floTeamId: floTeamId }
		};

		fetch(`/api/teamviewsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savepacket: savePacket }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				resetData({
					...team,
					floTeams: data.floTeams
				}, opponents);
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const linkSCMat = scmatTeamId => {
		const savePacket = {
			saveSCMatTeam: { teamId: team.id, scmatTeamId: scmatTeamId }
		};

		fetch(`/api/teamviewsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savepacket: savePacket }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				resetData({
					...team,
					scmatTeams: data.scmatTeams
				}, opponents);
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const unlinkSCMat = scmatTeamId => {
		const savePacket = {
			deleteSCMatTeam: { teamId: team.id, scmatTeamId: scmatTeamId }
		};

		fetch(`/api/teamviewsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savepacket: savePacket }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				resetData({
					...team,
					scmatTeams: data.scmatTeams
				}, opponents);
			})
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
				<h1>{ team ? team.name : "" }</h1>
				<h1 className="subTitle">
				{ pageView == "depth" ? "Team Depth"
					: pageView == "link" ? "External Link"
					: ""
				}
				</h1>
			</header>
		
			{
			pageView == "depth" ? 
				<TeamDepth 
					wrestlers={ team.wrestlers } 
					updateWrestlers={ updateWrestlers } 
					divisions={ divisions }
					selectedDivision={ selectedDivision }
					selectDivision={ selectDivision }
				/>
			
			: pageView == "link" ?
				<TeamLink 
					scmatTeams={ (team.scmatTeams || []) } 
					floTeams={ (team.floTeams || []) } 
					linkFlo={ linkFlo }
					unlinkFlo={ unlinkFlo }
					linkSCMat={ linkSCMat }
					unlinkSCMat={ unlinkSCMat }
				/>
			
			: 
				<TeamWrestlersEdit
					addWrestler={ addWrestler }
					savingError={ savingError }
				/>
			}
		</div>

		<div className="bottomNav">

			<button aria-label="Edit Team" onClick={ () => setPageView("edit") }>
				{/* Team */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z"/></svg>
				Edit Team
			</button>

			<button aria-label="Depth Chart" onClick={ () => setPageView("depth") }>
				{/* List */}
				<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M637.398-407.693q-43.552 0-74.128-30.486-30.577-30.486-30.577-74.038 0-43.551 30.486-74.128 30.486-30.576 74.038-30.576 43.552 0 74.128 30.486 30.577 30.486 30.577 74.037 0 43.552-30.486 74.129-30.486 30.576-74.038 30.576ZM412.693-183.079v-60.614q0-17.03 8.269-32.437 8.269-15.408 22.808-24.485 43.461-25.461 91.734-38.577 48.273-13.115 101.803-13.115 53.531 0 101.804 13.115 48.273 13.116 91.734 38.577 14.539 9.077 22.808 24.485 8.269 15.407 8.269 32.437v60.614H412.693Zm63.691-66.152v6.154h321.847v-6.154q-37.308-21.154-78.039-32.116t-82.885-10.962q-42.153 0-82.884 10.962t-78.039 32.116Zm160.923-218.46q18.539 0 31.578-13.039 13.038-13.039 13.038-31.577 0-18.539-13.038-31.577-13.039-13.039-31.578-13.039-18.538 0-31.577 13.039-13.038 13.038-13.038 31.577 0 18.538 13.038 31.577 13.039 13.039 31.577 13.039Zm0-44.616Zm0 269.23ZM137.694-410.001v-59.998h299.998v59.998H137.694Zm0-320v-59.998h459.998v59.998H137.694Zm318.23 160h-318.23v-59.998h347.691q-10.538 13.153-17.692 27.961-7.154 14.807-11.769 32.037Z"/></svg>
				Depth
			</button>

			{
			loggedInUser.privileges && loggedInUser.privileges.includes("teamManage") ?

			<button aria-label="Team Link" onClick={ () => setPageView("link") }>
				{/* Link */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M432.307-298.463H281.539q-75.338 0-128.438-53.093-53.1-53.093-53.1-128.422t53.1-128.444q53.1-53.115 128.438-53.115h150.768v59.998H281.539q-50.385 0-85.962 35.577Q160-530.385 160-480q0 50.385 35.577 85.962 35.577 35.577 85.962 35.577h150.768v59.998ZM330.001-450.001v-59.998h299.998v59.998H330.001Zm197.692 151.538v-59.998h150.768q50.385 0 85.962-35.577Q800-429.615 800-480q0-50.385-35.577-85.962-35.577-35.577-85.962-35.577H527.693v-59.998h150.768q75.338 0 128.438 53.093 53.1 53.093 53.1 128.422t-53.1 128.444q-53.1 53.115-128.438 53.115H527.693Z"/></svg>
				Link
			</button>

			:""
			}

		</div>

		</>
		}

	</div>
</div>
			);

}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamWrestlers />);
export default TeamWrestlers;
