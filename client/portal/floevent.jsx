import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import FloUpdate from "./floupdate.jsx";
import FloUpcoming from "./floupcoming.jsx";
import "./include/index.css";
import "./include/floevent.css";
import FloBracket from "./flobracket.jsx";

const FloEvent = props => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isRefreshing, setIsRefreshing ] = useState(false);
	const [ timeInterval, setTimeInterval ] = useState(false);
	const [ timeDisplay, setTimeDisplay ] = useState("");
	const [ lastRefresh, setLastRefresh ] = useState(null);
	const [ pageView, setPageView ] = useState("bracket");

	const [ eventId, setEventId ] = useState(null);
	const [ event, setEvent ] = useState(null);
	const [ matches, setMatches ] = useState([]);

	const [ divisionNames, setDivisionNames ] = useState([]);
	const [ teamNames, setTeamNames ] = useState([]);

	useEffect(() => {
		if (!pageActive) {
			const url = new window.URLSearchParams(window.location.search);
			setEventId(url.get("id"));
		}

		return () => {
			if (timeInterval) {
				clearInterval(timeInterval);
				setTimeInterval(null);
			}
		}
	}, []);

	// Make sure the event ID is set before it is used by the refresh function
	useEffect(() => {
		if (eventId) {
			refreshData();
		}
	}, [eventId])

	const updateTime = () => {
		const updateTimeDiff = new Date() - lastRefresh;

		setTimeDisplay(
			(updateTimeDiff > (1000 * 60 * 60) ? Math.floor(updateTimeDiff / 1000 / 60 / 60) + "h " : "") +
			(updateTimeDiff > (1000 * 60) ? Math.floor((updateTimeDiff / 1000 / 60) % 60) + "m " : "") + 
			Math.floor(updateTimeDiff / 1000 % 60) + "s" 
			);
		
		if (updateTimeDiff > 1000 * 10) {
			// If the last update is more than 10 seconds out, then refresh
			refreshData();
		}
	};

	const refreshData = () => {
		setIsRefreshing(true);

		fetch(`/api/floeventload?id=${ eventId }${ lastRefresh ? "&lastLoad=" + lastRefresh : "" }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				if (!data.floEvent)
					return; // No updates since last checked

				const newEvent = data.floEvent,
					newMatches = newEvent.divisions.flatMap(division =>
						division.weightClasses.flatMap(weight =>
							weight.pools.flatMap(pool =>
								pool.matches.map(match => ({
									...match,
									division: division.name,
									weightClass: weight.name,
									pool: pool.name
								}))
								)
							)
						);

				setEvent(({
					...newEvent,
					updates: newEvent.updates.map(update => ({...update, dateTime: new Date(update.dateTime)}))
				}));

				setMatches(newMatches);

				setDivisionNames([...new Set(newEvent.divisions.map(division => division.name))]);
				setTeamNames(
					[...new Set(matches.flatMap(match => [match.topWrestler ? match.topWrestler.team : null, match.bottomWrestler ? match.bottomWrestler.team : null]))]
					.filter(team => team) // Remove null
					.sort((teamA, teamB) => teamA > teamB ? 1 : -1)
					);

				if (!newEvent.isComplete && !timeInterval) {
					// If the event is not complete & we haven't already set the refresh interval, then set
					setTimeInterval(setInterval(updateTime, 1000));
				}

				setLastRefresh(new Date());
				setIsRefreshing(false);

				if (!pageActive) {
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
				}
			})
			.catch(error => {
				console.warn(error);
				setLoadError(`Error: ${error.message}`);
			});

	};

	return (
		
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		<div className={`container ${ pageActive ? "active" : "" }`}>
			{
			pageView == "bracket" ?

				<FloBracket divisions={ event && event.divisions ? event.divisions : [] } />
			
			: pageView === "updates" ?

				<FloUpdate updates={ event.updates } divisions={ divisionNames } teams={ teamNames } />

			: pageView == "upcoming" ?

				<FloUpcoming matches={ matches } divisions={ divisionNames } teams={ teamNames } />

			: ""
			}
		</div>
		
		<div className="bottomNav">

			<button aria-label="Brackets" onClick={ () => setPageView("bracket") }>
				{/* Bracket */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M570.77-180.001V-240h98.845q21.231 0 35.808-14.385Q720-268.77 720-289.231v-82.308q0-35.692 21.231-64 21.23-28.307 55.307-39.384v-10.154q-34.077-11.077-55.307-39.384-21.231-28.308-21.231-64v-82.308q0-20.461-14.577-34.846Q690.846-720 669.615-720H570.77v-59.999h98.845q46.153 0 78.268 31.923 32.116 31.923 32.116 77.307v82.308q0 21.231 14.961 35.616 14.962 14.385 36.578 14.385h28.461v116.92h-28.461q-21.616 0-36.578 14.385-14.961 14.385-14.961 35.616v82.308q0 45.384-32.116 77.307-32.115 31.923-78.268 31.923H570.77Zm-280.385 0q-45.769 0-78.076-31.923-32.308-31.923-32.308-77.307v-82.308q0-21.231-14.961-35.616-14.962-14.385-36.578-14.385h-28.461v-116.92h28.461q21.616 0 36.578-14.385 14.961-14.385 14.961-35.616v-82.308q0-45.384 32.308-77.307 32.307-31.923 78.076-31.923h99.23V-720h-99.23q-20.846 0-35.616 14.385Q240-691.23 240-670.769v82.308q0 35.692-21.038 64-21.039 28.307-55.5 39.384v10.154q34.461 11.077 55.5 39.384 21.038 28.308 21.038 64v82.308q0 20.461 14.769 34.846Q269.539-240 290.385-240h99.23v59.999h-99.23Z"/></svg>
				Brackets
			</button>

			<button aria-label="Updates" onClick={ () => setPageView("updates") }>
				{/* Brightness alert */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-290.77q13.731 0 23.019-9.288 9.288-9.289 9.288-23.019 0-13.731-9.288-23.019-9.288-9.288-23.019-9.288-13.731 0-23.019 9.288-9.288 9.288-9.288 23.019 0 13.73 9.288 23.019 9.288 9.288 23.019 9.288Zm-29.999-146.153h59.998v-240h-59.998v240ZM480-55.694 354.376-180.001H180.001v-174.375L55.694-480l124.307-125.624v-174.375h174.375L480-904.306l125.624 124.307h174.375v174.375L904.306-480 779.999-354.376v174.375H605.624L480-55.694ZM480-480Zm0 340 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Z"/></svg>
				Updates
			</button>

			<button aria-label="Upcoming" onClick={ () => setPageView("upcoming") }>
				{/* Data alert */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M120-160v-80h480v80H120Zm520-280q-83 0-141.5-58.5T440-640q0-83 58.5-141.5T640-840q83 0 141.5 58.5T840-640q0 83-58.5 141.5T640-440Zm-520-40v-80h252q7 22 16 42t22 38H120Zm0 160v-80h376q23 14 49 23.5t55 13.5v43H120Zm500-280h40v-160h-40v160Zm20 80q8 0 14-6t6-14q0-8-6-14t-14-6q-8 0-14 6t-6 14q0 8 6 14t14 6Z"/></svg>
				Upcoming
			</button>

			<button aria-label="Teams">
				{/* Group */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z"/></svg>
				Teams
			</button>

			{
			timeDisplay ?
			
			<div className={ `refreshDisplay ${ isRefreshing ? "refresh" : "" }` }>
				{ timeDisplay }
			</div>

			: ""
			}

		</div>

	</div>
</div>

	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<FloEvent />);
export default FloEvent;
