import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const TeamView = () => {

	const emptyWrestler = { firstName: "", lastName: "", division: "", weightClass: "" };

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("overview");
	const [ selectedDivision, setSelectedDivision ] = useState(null);

	const [ teamId, setTeamId ] = useState(null);
	const [ team, setTeam ] = useState(null);
	const [ loggedInUser, setLoggedInUser ] = useState({});

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ filterDivisions, setFilterDivisions ] = useState([]);

	const [ newWrestler, setNewWrestler ] = useState(null);
	const [ isSaving, setIsSaving ] = useState(false);
	const [ savingError, setSavingError ] = useState("");

	const [ dragWrestlerId, setDragWrestlerId ] = useState(null);
	const [ dragPosition, setDragPosition ] = useState(null);
	const wrestlerRefs = useRef([]);
	const dragWrestlerRef = useState(null);
	const mousePosition = useRef();

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
					
					const newTeam = {
							...data.team,
							divisions: buildTeamWrestlers(data.team.wrestlers)
						},
						newSelected = newTeam.divisions
							.sort((divisionA, divisionB) => /varsity/i.test(divisionA.name) ? -1 : /varsity/i.test(divisionB.name) ? 1 : divisionA.name > divisionB.name ? 1 : -1)
							.find(() => true);

					wrestlerRefs.current = newSelected.weightClasses
						.flatMap(weightClass => weightClass.wrestlers)
						.map(wrestler => ({
							id: wrestler.id,
							weightClass: wrestler.weightClass,
							element: null
						}));
		
					setTeam(newTeam);
					setSelectedDivision(newSelected);
					setFilterDivisions(newTeam.divisions.map(division => division.name));

					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
				});

		}
	}, [teamId]);

	const saveWrestler = () => {
		setIsSaving(true);
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

				const newWrestlers = team.wrestlers.concat(data.wrestler),
					divisions = buildTeamWrestlers(newWrestlers),
					newSelected = divisions.find(division => division.name == selectedDivision.name);

				wrestlerRefs.current = newSelected.weightClasses
					.flatMap(weightClass => weightClass.wrestlers)
					.map(wrestler => ({
						id: wrestler.id,
						weightClass: wrestler.weightClass,
						element: null
					}));

				setTeam(team => ({
					...team,
					divisions: divisions
				}))
				setFilterDivisions(divisions.map(division => division.name));
				setSelectedDivision(newSelected);

				setNewWrestler(null);
				setIsSaving(null);

			})
			.catch(error => {
				console.warn(error);
				setSavingError("There was an error saving the wretler");
				setNewWrestler(null);
			});
	};

	const buildTeamWrestlers = wrestlers => {
		const divisions = [...new Set(wrestlers.map(wrestler => wrestler.division))]
			.map(division => ({
				name: division,
				weightClasses: [...new Set(wrestlers.filter(wrestler => wrestler.division == division).map(wrestler => wrestler.weightClass)) ]
					.map(weightClass => ({
						name: weightClass,
						wrestlers: wrestlers.filter(wrestler => wrestler.division == division && wrestler.weightClass == weightClass)
					}))
			}));

		return divisions;
	};

	const onDragDown = (event, wrestlerId) => {
		event.preventDefault();
		mousePosition.current = event.touches ? event.touches[0].clientY : event.clientY;

		dragWrestlerRef.current = wrestlerId;
		setDragWrestlerId(wrestlerId);
		setDragPosition(0)
	};

	const onDrag = (event, wrestlerId) => {
		if (dragWrestlerRef.current == wrestlerId) {
			event.preventDefault();

			const newPosition = (event.touches ? event.touches[0].clientY : event.clientY) - mousePosition.current;
			mousePosition.current = event.touches ? event.touches[0].clientY : event.clientY;
			setDragPosition(dragPosition => dragPosition + newPosition);
		}
	};

	const onDragUp = (event, weightClass, wrestlerId) => {
		event.preventDefault();

		const notMovingRefs = wrestlerRefs.current.filter(ref => ref.weightClass == weightClass && ref.id != wrestlerId);
		const movingRef = wrestlerRefs.current.find(ref => ref.id == wrestlerId);

		const newPosition = notMovingRefs.reduce((newPosition, ref, index) => movingRef.element.getBoundingClientRect().y > ref.element.getBoundingClientRect().y ? index + 1 : newPosition, 0);
		const currentPosition = team.wrestlers.find(wrestler => wrestler.id == wrestlerId).position;

		const wrestlersChanged = team.wrestlers.map(wrestler => {

			if (wrestler.division == selectedDivision.name && wrestler.weightClass == weightClass) {
				if (wrestler.id == wrestlerId) {
					wrestler.position = newPosition;
				}
				else if (wrestler.position >= newPosition && wrestler.position < currentPosition) {
					wrestler.position += 1;
				}
				else if (wrestler.position > currentPosition && wrestler.position <= newPosition) {
					wrestler.position -= 1;
				}
			}

			return wrestler;
		});

		const divisions = buildTeamWrestlers(wrestlersChanged);
		const teamUpdate = {...team, wrestlers: wrestlersChanged};

		setTeam(({
			...team,
			wrestlers: wrestlersChanged,
			divisions: divisions
		}));

		mousePosition.current = null;
		setDragWrestlerId(null);
		setDragPosition(null);
		
		fetch(`/api/teamssave`, { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveTeam: teamUpdate }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const onDragCancel = (event) => {
		event.preventDefault();

		mousePosition.current = null;
		setDragWrestlerId(null);
		setDragPosition(null);
	};

	const selectDivision = divisionName => {
		const newDivision = team.divisions.find(division => division.name == divisionName);
		
		wrestlerRefs.current = newDivision.weightClasses
			.flatMap(weightClass => weightClass.wrestlers)
			.map(wrestler => ({
				id: wrestler.id,
				weightClass: wrestler.weightClass,
				element: null
			}));

		setSelectedDivision(newDivision)
	};

	const setRef = (wrestlerId, element) => {
		const ref = wrestlerRefs.current.find(ref => ref.id == wrestlerId);

		if (ref)
			ref.element = element;
	};

	useEffect(() => {
		if (wrestlerRefs.current && wrestlerRefs.current.length > 0) {
			for (let refIndex = 0; refIndex < wrestlerRefs.current.length; refIndex++) {
				const ref = wrestlerRefs.current[refIndex];

				if (ref.element) {
					ref.element.addEventListener("touchstart", event => onDragDown(event, ref.id), { passive: false });
					ref.element.addEventListener("touchmove", event => onDrag(event, ref.id), { passive: false });
					ref.element.addEventListener("touchend", event => onDragUp(event, ref.weightClass, ref.id), { passive: false });
					ref.element.addEventListener("touchcancel", event => onDragCancel(event), { passive: false });
					
					ref.element.addEventListener("mousedown", event => onDragDown(event, ref.id), { passive: false });
					ref.element.addEventListener("mousemove", event => onDrag(event, ref.id), { passive: false });
					ref.element.addEventListener("mouseup", event => onDragUp(event, ref.weightClass, ref.id), { passive: false });
				}
			}
		}
	}, [selectedDivision]);

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		
		{
		!pageActive ?
		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>
		: ""
		}

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
			filterDivisions && selectedDivision ?
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
						Division
						<select value={ selectedDivision.name } onChange={ event => selectDivision(event.target.value) }>
							{
							filterDivisions
							.sort((divisionA, divisionB) => divisionA > divisionB ? 1 : -1)
							.map((division, divisionIndex) =>
							<option key={divisionIndex}>{ division }</option>
							)
							}
						</select>
					</label>
				</div>

			</div>

			: "" }
			
			{
			selectedDivision ? 
			<>
			
			<div className="panelHeader">
				<div>{ selectedDivision.name }</div>
			</div>
			
			{
			selectedDivision.weightClasses
			.sort((weightClassA, weightClassB) => weightClassA.name - weightClassB.name)
			.map((weightClass, weightClassIndex) =>

			<div className="panel" key={ weightClassIndex }>
				<h3>{ weightClass.name }</h3>

				{
				weightClass.wrestlers
				.sort((wrestlerA, wrestlerB) => wrestlerA.position ? wrestlerA.position - wrestlerB.position : wrestlerA.name > wrestlerB.name ? 1 : -1)
				.map(wrestler => 
				
				<div className={`listItem ${ dragWrestlerId == wrestler.id ? "dragging": "" }`} key={wrestler.id} data-testid={ wrestler.id } style={ dragWrestlerId == wrestler.id ? { top: dragPosition }: {} }>

					<div className="listItemHeader">
						{ wrestler.firstName } { wrestler.lastName }
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" ref={ element => setRef(wrestler.id, element) }>
							<path d="M360-175.386q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm240 0q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm-240-240q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm240 0q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm-240-240q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm240 0q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Z"/>
						</svg>
					</div>

				</div>
				
				)}

			</div>

			)}

			</>
			: ""
			}

			<div aria-label="Add Wrestler" role="button" className={ `panel ${ !newWrestler ? "button" : "" }` } onClick={ () => { if (!newWrestler) { setNewWrestler({...emptyWrestler}) } }}>
				
				{
				isSaving && savingError ?

				<div className="panelError">{ savingError }</div>

				: isSaving ?

				<div className="panelLoading">
					<img src="/media/wrestlingloading.gif" />
				</div>

				: newWrestler ?
				
				<div>
					<label>
						<span>First Name</span>
						<input type="text" value={ newWrestler.firstName } onChange={ event => setNewWrestler(wrestler => ({...wrestler, firstName: event.target.value })) } aria-label="First Name" />
					</label>
					
					<label>
						<span>Last Name</span>
						<input type="text" value={ newWrestler.lastName } onChange={ event => setNewWrestler(wrestler => ({...wrestler, lastName: event.target.value })) } aria-label="Last Name" />
					</label>

					<label>
						<span>Division</span>
						<input type="text" value={ newWrestler.division } onChange={ event => setNewWrestler(wrestler => ({...wrestler, division: event.target.value })) } aria-label="Wrestler Division" />
					</label>

					<label>
						<span>Weight Class</span>
						<input type="number" value={ newWrestler.weightClass } onChange={ event => setNewWrestler(wrestler => ({...wrestler, weightClass: event.target.value })) } aria-label="Wrestler Weight Class" />
					</label>

					<div className="row">
						<button onClick={ () => saveWrestler() } aria-label="Save">
							{/* Check */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
							</svg>
							<div>save</div>
						</button>

						<button aria-label="Cancel" onClick={ () => setNewWrestler(null) }>
							{/* Cancel */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
							</svg>
							<div>cancel</div>
						</button>
					</div>
				</div>


				:

				<h3>Add Wrestler</h3>

				}

			</div>

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

	</div>
</div>
	);
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TeamView />);
export default TeamView;
