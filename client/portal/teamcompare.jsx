import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/team.css";
import TeamCompareMatch from "./teamcomparematch.jsx";
import TeamCompareSCMat from "./teamcomparescmat.jsx";

const TeamCompare = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("overview");
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ divisions, setDivisions ] = useState([]);
	const [ selectedDivision, setSelectedDivision ] = useState("");
	const [ compareData, setCompareData ] = useState(null);

	const [ team, setTeam ] = useState(null);
	const [ opponents, setOpponents ] = useState([]);
	const [ selectedOpponentId, setSelectedOpponentId ] = useState("");

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
					
					if (data.loggedInUser.session) {
						if (data.loggedInUser.session.selectedDivision) {
							setSelectedDivision(data.loggedInUser.session.selectedDivision);
						}

						if (data.loggedInUser.session.selectedOpponentId) {
							setSelectedOpponentId(data.loggedInUser.session.selectedOpponentId);
						}
						
						if (data.loggedInUser.session.compare) {
							setCompareData(data.loggedInUser.session.compare);
						}
					}

					setTeam(data.team);
					setOpponents(data.scmatTeams);

					setDivisions([...new Set(data.team.wrestlers.map(wrestler => wrestler.division))]);
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const selectOpponent = newOpponentId => {
		setSelectedOpponentId(newOpponentId);
		
		fetch(`/api/usersessionsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: { selectedOpponentId: newOpponentId } }) })
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

	const saveCompareData = saveCompare => {
		const newCompareData = compareData.some(existing => existing.division == saveCompare.division && existing.opponentId == saveCompare.opponentId) ?
				compareData.map(existing => existing.division == saveCompare.division && existing.opponentId == saveCompare.opponentId ? saveCompare : existing)
			:
				compareData.concat(saveCompare);
		
		setCompareData(newCompareData);
		
		fetch(`/api/usersessionsave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: { compare: saveCompare } }) })
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
				<h1>{ team ? team.name : "" }</h1>
			</header>
		
			{

			pageView == "scmat" ? 
				<TeamCompareSCMat
					opponents={ opponents }
					teamId={ team.scmatTeams[0].id }
					selectedOpponentId={ selectedOpponentId }
					setSelectedOpponentId={ selectOpponent }
					/>

			: pageView == "flo" ? ""
				
			: 
				<TeamCompareMatch 
					team={ team }
					opponents={ opponents }
					compareData={ compareData }
					saveCompareData={ saveCompareData }
					selectedDivision={ selectedDivision } 
					setSelectedDivision={ setSelectedDivision } 
					divisions={ divisions }
					selectedOpponentId={ selectedOpponentId }
					setSelectedOpponentId={ selectOpponent }
					/>

			}
		</div>

		<div className="bottomNav">

			<button aria-label="Match Compare" onClick={ () => setPageView("") }>
				{/* Wrestlers */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M55.077-93.847 12.924-136l143.692-143.692-46.308-123.385q-6.23-15.692-2.423-36.692 3.808-21 20.115-37.307l132-132q10.462-10.462 22.539-15.693 12.076-5.23 27.153-5.23 15.077 0 27.154 5.23 12.076 5.231 22.538 15.693l80.769 78q27.385 27 65.231 42.692 37.846 15.692 81.692 17.615v59.999q-55-1.923-103.153-20.731-48.154-18.808-81.923-52.192l-34.923-34.154L259.23-410l87.846 89.846v230.153h-59.998v-204.615l-72.002-66.463v107.233l-160 159.999Zm552.001 3.846v-265.383l85.538-81.539-30.154-166.156q-22.693 27.616-48.386 49.502-25.693 21.885-57.463 34.27-23.768-2-45.576-11.116-21.807-9.115-37.191-24.114 45.769-7.616 84.5-34.539 38.732-26.924 59.962-61.539l39.231-64q15.077-24.307 41.423-32.269 26.345-7.961 52.268 2.885l195.846 82.923v171.075h-59.998v-132.153l-95.079-38.001L904.768-90.001H840.77L767.616-396.54l-100.54 85.001v221.538h-59.998ZM447.076-614.615q-30.692 0-52.269-21.577-21.577-21.577-21.577-52.269 0-30.692 21.577-52.269 21.577-21.576 52.269-21.576 30.692 0 52.269 21.576 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.577 21.577-52.269 21.577ZM664-776.154q-30.692 0-52.269-21.576-21.576-21.577-21.576-52.269 0-30.692 21.576-52.269 21.577-21.577 52.269-21.577 30.693 0 52.269 21.577 21.577 21.577 21.577 52.269 0 30.692-21.577 52.269-21.576 21.576-52.269 21.576Z"></path></svg>
				Match
			</button>

			{
			team.scmatTeams && team.scmatTeams.length > 0 ?
			
			<button aria-label="SC Mat Compare" onClick={ () => setPageView("scmat") }>
				{/* World */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480.067-100.001q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM440-162v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 121 79.5 212T440-162Zm276-102q20-22 36-47.5t26.5-53q10.5-27.5 16-56.5t5.5-59q0-98.29-54.308-179.53Q691.385-740.769 600-776.769V-760q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q26 0 47 15.5t29 40.5Z"></path></svg>
				SC Mat
			</button>

			: "" }

			<button aria-label="Flo Compare" onClick={ () => setPageView("flo") }>
				{/* World */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M432.307-298.463H281.539q-75.338 0-128.438-53.093-53.1-53.093-53.1-128.422t53.1-128.444q53.1-53.115 128.438-53.115h150.768v59.998H281.539q-50.385 0-85.962 35.577Q160-530.385 160-480q0 50.385 35.577 85.962 35.577 35.577 85.962 35.577h150.768v59.998ZM330.001-450.001v-59.998h299.998v59.998H330.001Zm197.692 151.538v-59.998h150.768q50.385 0 85.962-35.577Q800-429.615 800-480q0-50.385-35.577-85.962-35.577-35.577-85.962-35.577H527.693v-59.998h150.768q75.338 0 128.438 53.093 53.1 53.093 53.1 128.422t-53.1 128.444q-53.1 53.115-128.438 53.115H527.693Z"/></svg>
				Flo
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
