import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/team.css";

const MyTeam = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ weightClasses, setWeightClasses ] = useState([]);
	const [ expandWeightClass, setExpandWeightClass ] = useState("");
	const [ viewWeightClass, setViewWeightClass ] = useState("");
	const [ allWrestlers, setAllWrestlers ] = useState([]);

	useEffect(() => {
		if (!pageActive) {
			
			fetch(`/api/myteamload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {

					const savedWeightClasses = data.loggedInUser.session?.team || [];
					
					const newWeightClasses = [
						{ name: "106", wrestlers: [] },
						{ name: "113", wrestlers: []  },
						{ name: "120", wrestlers: []  },
						{ name: "126", wrestlers: []  },
						{ name: "132", wrestlers: []  },
						{ name: "138", wrestlers: []  },
						{ name: "144", wrestlers: []  },
						{ name: "150", wrestlers: []  },
						{ name: "157", wrestlers: []  },
						{ name: "165", wrestlers: []  },
						{ name: "175", wrestlers: []  },
						{ name: "190", wrestlers: []  },
						{ name: "215", wrestlers: []  },
						{ name: "285", wrestlers: []  },
						{ name: "Other", wrestlers: []  }
					];

					const wrestlers = data.wrestlers.map(wrestler => {
						
							const closestWeightClass = wrestler.weightClass && !isNaN(wrestler.weightClass) ? newWeightClasses
									.sort((weightClassA, weightClassB) =>
										weightClassA.name == wrestler.weightClass && weightClassB.name != wrestler.weightClass ? -1
										: weightClassA.name != wrestler.weightClass && weightClassB.name == wrestler.weightClass ? 1
										: Math.abs(+wrestler.weightClass - +weightClassA.name) >= Math.abs(+wrestler.weightClass - +weightClassB.name) ? 1
										: -1
									)
									.find(() => true)
								: "Other";
							
							return {
								...wrestler,
								division: /(hs|high school|high|varsity)/i.test(wrestler.division) ? "V"
									: /(jv|junior varsity)/i.test(wrestler.division) ? "JV"
									: /(ms|middle school)/i.test(wrestler.division) ? "MS"
									: "?",
								lastEvent: {...wrestler.lastEvent, date: new Date(wrestler.lastEvent?.date) },
								weightClasses: wrestler.weightClasses.map(weightClass => ({...weightClass, lastDate: new Date(weightClass.lastDate)})),
								weightClass: closestWeightClass.name,
								lastDate: wrestler.lastEvent && wrestler.lastEvent.date ? new Date(wrestler.lastEvent.date) : null
							}
						})
						.sort((wrestlerA, wrestlerB) => 
							+wrestlerA.weightClass < +wrestlerB.weightClass ? -1
							: +wrestlerA.weightClass > +wrestlerB.weightClass ? 1
							: wrestlerA.division != wrestlerB.division ?
								/^v/i.test(wrestlerA.division) ? -1 
								: /^v/i.test(wrestlerB.division) ? 1 
								: /jv/i.test(wrestlerA.division) ? -1
								: /jv/i.test(wrestlerB.division) ? 1
								: /ms/i.test(wrestlerA.division) ? -1
								: /ms/i.test(wrestlerB.division) ? 1
								: -1
							: +wrestlerA.lastDate > +wrestlerB.lastDate ? -1
							: +wrestlerA.lastDate < +wrestlerB.lastDate ? 1
							: wrestlerA.name > wrestlerB.name ? -1
							: 1
						);
					
					setWeightClasses(newWeightClasses
						.filter(weightClass => !isNaN(weightClass.name))
						.map(weightClass => ({
							...weightClass,
							wrestler: wrestlers.find(wrestler => savedWeightClasses.some(savedWeightClass => savedWeightClass.wrestlerId == wrestler.id && savedWeightClass.weightClass == weightClass.name) ),
							wrestlers: wrestlers.filter(wrestler => wrestler.weightClass == weightClass.name)
						}))
						.sort((weightClassA, weightClassB) => 
							+weightClassA.name < +weightClassB.name ? -1
							: 1
						)
						.concat([{
							name: "All",
							wrestlers: wrestlers
						}])
					);
					
					setAllWrestlers(wrestlers);

					setViewWeightClass(newWeightClasses.map(weightClass => weightClass.name).find(() => true));
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
				});

		}
	}, []);

	const saveWrestler = (wrestler, weightClass) => {

		let newTeam;
		if (loggedInUser.session.team && loggedInUser.session.team.some(record => record.weightClass == weightClass)) {
			newTeam = loggedInUser.session.team.map(savedWeightClass => ({
				...savedWeightClass,
				wrestlerId: savedWeightClass.weightClass == weightClass ? wrestler.id : savedWeightClass.wrestlerId
			}));
		}
		else {
			newTeam = [
				...loggedInUser.session.team || [],
				{ wrestlerId: wrestler.id, weightClass: weightClass }
			]
		}

		fetch(`/api/myteamsavewrestler`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: { team: newTeam } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {
				setExpandWeightClass("")
				setLoggedInUser(loggedInUser => ({ ...loggedInUser, session: { ...loggedInUser.session, team: newTeam } }));
				
				setWeightClasses(weightClasses => weightClasses
					.map(weightClass => ({
						...weightClass,
						wrestler: allWrestlers.find(wrestler => newTeam.some(savedWeightClass => savedWeightClass.wrestlerId == wrestler.id && savedWeightClass.weightClass == weightClass.name) ),
					}))
				);
				
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const changeSelectedWeightClass = weightClass => {
		setViewWeightClass(weightClass);
		setExpandWeightClass(weightClass == expandWeightClass ? "" : weightClass);
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
					My Team
				</h1>

				<h1 className="subTitle">
					Fort Mill
				</h1>
			</header>

			<div className="panel expandable">

				{
				weightClasses
				.filter(weightClass => !isNaN(weightClass.name))
				.map((weightClass, weightClassIndex) =>
				
				<div key={weightClassIndex} className="weightContainer">

					<div className="weightHeader">

						<div className="subTitle">
							{ weightClass.name }
							{ weightClass.wrestler ? " • " + weightClass.wrestler.name : "" }
							{ weightClass.wrestler && weightClass.wrestler.rating ? ` (${ weightClass.wrestler.rating.toLocaleString(undefined, { maximumFractionDigits: 0 }) } / ${ weightClass.wrestler.deviation.toFixed(0) })` : "" }

							{
							weightClass.wrestler ?
							<button onClick={ () => window.open(`/portal/wrestler.html?id=${ weightClass.wrestler.id }`, "_blank") }>
								{/* Eye View */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
							</button>
							: ""
							}
						</div>

						<button onClick={ () => changeSelectedWeightClass(weightClass.name) }>
							{/* pencil */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/></svg>
						</button>

					</div>
					
					{
					expandWeightClass == weightClass.name ?

					<div className="overflowInset selectOpponentContainer">
						<div className="weightSidebar">
						{
							weightClasses.map((insetWeight, insetWeightIndex) =>				
							<div key={insetWeightIndex} onClick={ () => setViewWeightClass(insetWeight.name) } className={`${ viewWeightClass == insetWeight.name ? "selected" : "" }`}>{insetWeight.name}</div>
							)
						}
						</div>

						<div className="weightContent">
						{
						weightClasses
						.filter(weightClass => weightClass.name == viewWeightClass)
						.map(weightClass => weightClass.wrestlers)
						.find(() => true)
						.map((wrestler, wrestlerIndex, allWrestlers) => 
						
						<div key={wrestler.id}>
						
						{
						isNaN(viewWeightClass) && (wrestlerIndex == 0 || allWrestlers[wrestlerIndex - 1].weightClass != wrestler.weightClass) ?
						<div className="allWeightDivision">-- { wrestler.weightClass }-- </div>
						: ""
						}
						
						<div className={`selectWrestlerItem ${ wrestlerIndex % 2 == 0 ? "alternate" : "" }`}>
							<div className="selectWrestlerDivision">{ wrestler.division }</div>

							<div className="selectedWrestlerContainer">
								<div>{ wrestler.name }</div>

								{
								wrestler.wins ?
								<div>{ `Wins: ${ wrestler.wins }, Losses: ${ wrestler.losses } (${ (wrestler.wins / (wrestler.wins + wrestler.losses)).toFixed(3) })` }</div>
								: "" 
								}

								{
								wrestler.rating ?
								<div>{ `Rating: ${ wrestler.rating.toLocaleString(undefined, { maximumFractionDigits: 0 }) } / ${ wrestler.deviation.toLocaleString(undefined, { maximumFractionDigits: 0 }) }` }</div>
								: ""
								}

								<div>{ (wrestler.lastDate ? wrestler.lastDate.toLocaleDateString() + ": ": "") + wrestler.lastEvent.event }</div>
							</div>

							<div>
								<button onClick={ () => window.open(`/portal/wrestler.html?id=${ wrestler.id }`, "_blank") }>
									{/* Eye View */}
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
								</button>

								<button onClick={ () => { saveWrestler(wrestler, weightClass.name) } }>
									{/* Check */}
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
								</button>
							</div>
						</div>

						</div>

						)
						}
						</div>

					</div>

					: ""
					}
				
				</div>

				)
				}

			</div>


		</div>

		</>
		}

	</div>
</div>
	);
		
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<MyTeam />);
export default MyTeam;
