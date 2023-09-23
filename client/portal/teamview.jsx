import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import TeamWrestlers from "./teamwrestlers.jsx";
import TeamLink from "./teamlink.jsx";

const TeamView = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("overview");
	const [ savingError, setSavingError ] = useState("");

	const [ teamId, setTeamId ] = useState(null);
	const [ team, setTeam ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState({});

	useEffect(() => {
		if (!pageActive) {
			const url = new window.URLSearchParams(window.location.search);
			setTeamId(url.get("id"));
			
			const urlPageView = url.get("page");
			if (urlPageView) {
				setPageView(urlPageView);
			}
		}
	}, []);

	// Make sure the event ID is set before it is used by the refresh function
	useEffect(() => {
		if (teamId) {
			
			fetch(`/api/teamviewload?id=${ teamId }`)
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
	}, [teamId]);

	const addWrestler = newWrestler => {
		setSavingError("");

		fetch(`/api/teamswrestlersave?teamid=${ team.id }`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wrestler: newWrestler }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setTeam(team => ({
					...team,
					wrestlers: team.wrestlers.concat(data.wrestler)
				}));
			})
			.catch(error => {
				console.warn(error);
				setSavingError("There was an error saving the wretler");
			});
	};

	const updateWrestlers = wrestlers => {
		const teamUpdate = {...team, wrestlers: wrestlers };

		fetch(`/api/teamssave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveTeam: teamUpdate }) })
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

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		
		{
		!pageActive ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>
		: 
		<>

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>{ team ? team.name : "" }</h1>
				<h1 className="subTitle">
				{ pageView == "wrestlers" ? "Wrestlers"
					: pageView == "compare" ? "Compare"
					: pageView == "link" ? "External Link"
					: "Overview"
				}
				</h1>
			</header>
			
			{
			pageView == "wrestlers" ? <TeamWrestlers wrestlers={ team.wrestlers } updateWrestlers={ updateWrestlers } addWrestler={ addWrestler } savingError={ savingError } />

			: pageView == "link" ? <TeamLink flo={ team.externalTeams } />

			: ""
			}

		</div>

		<div className="bottomNav">

			<button aria-label="Upcoming" onClick={ () => setPageView("overview") }>
				{/* Group */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m105-233-65-47 200-320 120 140 160-260 109 163q-23 1-43.5 5.5T545-539l-22-33-152 247-121-141-145 233ZM863-40 738-165q-20 14-44.5 21t-50.5 7q-75 0-127.5-52.5T463-317q0-75 52.5-127.5T643-497q75 0 127.5 52.5T823-317q0 26-7 50.5T795-221L920-97l-57 57ZM643-217q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm89-320q-19-8-39.5-13t-42.5-6l205-324 65 47-188 296Z"/></svg>
				Overview
			</button>

			<button aria-label="Updates" onClick={ () => setPageView("wrestlers") }>
				{/* wrestler */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M57-80 1-136l146-146-44-118q-7-18-3-41.5t23-42.5l132-132q12-12 26-18t31-6q17 0 31 6t26 18l80 78q27 27 66 42.5t84 15.5v80q-60 0-112-19t-90-57l-28-28-94 94 84 86v244h-80v-210l-52-48v88L57-80Zm542 0v-280l84-80-24-140q-15 18-33 32t-39 26q-33-2-62.5-14T475-568q45-8 79.5-30.5T611-656l40-64q17-27 47-36.5t59 2.5l202 86v188h-80v-136l-72-28L919-80h-84l-72-300-84 80v220h-80ZM459-620q-33 0-56.5-23.5T379-700q0-33 23.5-56.5T459-780q33 0 56.5 23.5T539-700q0 33-23.5 56.5T459-620Zm200-160q-33 0-56.5-23.5T579-860q0-33 23.5-56.5T659-940q33 0 56.5 23.5T739-860q0 33-23.5 56.5T659-780Z"/></svg>
				Wrestlers
			</button>

			<button aria-label="Teams" onClick={ () => setPageView("compare") }>
				{/* Compare */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M420.001-55.386V-140H212.309q-30.308 0-51.308-21t-21-51.308v-535.382q0-30.308 21-51.308t51.308-21h207.692v-84.615H480v849.228h-59.999ZM200-240h220.001v-263.848L200-240Zm360 99.999V-480l200 240v-507.691q0-4.616-3.846-8.463-3.847-3.846-8.463-3.846H560v-59.999h187.691q30.308 0 51.308 21t21 51.308v535.382q0 30.308-21 51.308t-51.308 21H560Z"/></svg>
				Compare
			</button>

			{
			loggedInUser.privileges && loggedInUser.privileges.includes("teamManage") ?

			<button aria-label="Teams" onClick={ () => setPageView("link") }>
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

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamView />);
export default TeamView;
