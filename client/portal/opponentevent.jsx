import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const OpponentEvent = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ opponentSelect, setOpponentSelect ] = useState([]);
	const [ opponents, setOpponents ] = useState([]);
	const [ selectedOpponent, setSelectedOpponent ] = useState("");
	const [ selectedOpponentId, setSelectedOpponentId ] = useState("");

	const [ events, setEvents ] = useState([]);

	useEffect(() => {
		if (!pageActive) {

			fetch(`/api/opponenteventload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {

					setOpponents(data.schools);

					const selectGroup = [...new Set(data.schools.sort((schoolA, schoolB) => 
						schoolA.classification != schoolB.classification ?
							schoolA.classification > schoolB.classification ? -1 : 1
						: schoolA.region != schoolB.region ?
							schoolA.region > schoolB.region ? 1 : -1
						: schoolA.name > schoolB.name ?
							1 : -1
						).map(school => `${school.classification || "NA"} - ${school.region || "NA"}`))]
						.map(group => ({
							name: group,
							schools: data.schools
								.filter(school => `${school.classification || "NA"} - ${school.region || "NA"}` == group)
								.sort()
						}));
					setOpponentSelect(selectGroup);

					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const selectOpponent = opponentId => {
		const opponent = opponents.find(opponent => opponent.id == opponentId);
		setIsLoading(true);
		setSelectedOpponent(opponent);
		setSelectedOpponentId(opponent.id);
		
		fetch(`/api/opponenteventselect?opponent=${ opponent.id }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setEvents(data.events);
				setIsLoading(false);
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
		isLoading ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("teamManage") ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>Events</h1>
				
				{
				selectedOpponent ?
				<h1 className="subTitle">{ selectedOpponent.name }</h1>
				: "" }
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
						<select value={ selectedOpponentId } onChange={ event => selectOpponent(event.target.value) }>
							<option value="">-- Select Opponent --</option>
							{
							opponentSelect.map((group, groupIndex) => 
								<optgroup key={ groupIndex } label={ group.name }>
									{
									group.schools.map((school, schoolIndex) => 
										<option key={ schoolIndex } value={ school.id }>{ school.name }</option>
									)}
								</optgroup>
							)
							}
						</select>
					</label>
				</div>
				
			</div>

		</div>

		}

	</div>

</div>

	);

}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<OpponentEvent />);
export default OpponentEvent;
