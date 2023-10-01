import React, { useEffect, useState, useRef } from "react";

const TeamWrestlers = props => {

	const emptyWrestler = { firstName: "", lastName: "", division: "", weightClass: "" };

	const [ selectedDivision, setSelectedDivision ] = useState(null);

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ divisions, setDivisions ] = useState([]);

	const [ newWrestler, setNewWrestler ] = useState(null);
	const [ isSaving, setIsSaving ] = useState(false);

	const [ dragWrestlerId, setDragWrestlerId ] = useState(null);
	const wrestlerRefs = useRef([]);
	const mousePosition = useRef();
	const boxPositionRef = useRef();
	const boxRef = useRef(null);
	const isSavingRef = useRef(false);

	useEffect(() => {

		const newDivisions = buildTeamWrestlers(props.wrestlers),
			newSelected = selectedDivision ? 
					newDivisions.find(division => division.name == selectedDivision.name)
				:
					newDivisions
						.sort((divisionA, divisionB) => /varsity/i.test(divisionA.name) ? -1 : /varsity/i.test(divisionB.name) ? 1 : divisionA.name > divisionB.name ? 1 : -1)
						.find(() => true);

		wrestlerRefs.current = newSelected.weightClasses
			.flatMap(weightClass => weightClass.wrestlers)
			.map(wrestler => ({
				id: wrestler.id,
				weightClass: wrestler.weightClass,
				element: wrestlerRefs.current.filter(ref => ref.id == wrestler.id).map(ref => ref.element).find(() => true)
			}));
		
		setDivisions(newDivisions);
		setSelectedDivision(newSelected);

		if (isSaving) {
			setIsSaving(false);
			setNewWrestler(null);
		}
		if (isSavingRef.current) {
			isSavingRef.current = false;
		}

	}, [ props.wrestlers ])

	useEffect(() => {
		if (selectedDivision && wrestlerRefs.current && wrestlerRefs.current.length > 0) {
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

	const buildTeamWrestlers = wrestlers => {
		const newDivisions = [...new Set(wrestlers.map(wrestler => wrestler.division))]
			.map(division => ({
				name: division,
				weightClasses: [...new Set(wrestlers.filter(wrestler => wrestler.division == division).map(wrestler => wrestler.weightClass)) ]
					.map(weightClass => ({
						name: weightClass,
						wrestlers: wrestlers.filter(wrestler => wrestler.division == division && wrestler.weightClass == weightClass)
					}))
			}));

		return newDivisions;
	};

	const onDragDown = (event, wrestlerId) => {
		event.preventDefault();

		mousePosition.current = event.touches ? event.touches[0].clientY : event.clientY;
		boxPositionRef.current = 0;
		
		if (event.target.tagName.toLowerCase() == "svg") {
			boxRef.current = event.target.parentElement.parentElement;
		}
		else {
			boxRef.current = event.target.parentElement.parentElement.parentElement;
		}

		boxRef.current.style.top = boxPositionRef.current + "px";

		setDragWrestlerId(wrestlerId);
	};

	const onDrag = (event) => {
		if (boxRef.current) {
			event.preventDefault();

			const newPosition = (event.touches ? event.touches[0].clientY : event.clientY) - mousePosition.current;
			mousePosition.current = event.touches ? event.touches[0].clientY : event.clientY;
			boxPositionRef.current = boxPositionRef.current + newPosition;
			boxRef.current.style.top = boxPositionRef.current + "px";
			
			console.log(`drag: ${ boxRef.current.style.top }`);
		}
	};

	const onDragUp = (event, weightClass, wrestlerId) => {
		event.preventDefault();

		if (!isSavingRef.current) {
			isSavingRef.current = true;

			const notMovingRefs = wrestlerRefs.current.filter(ref => ref.weightClass == weightClass && ref.id != wrestlerId);
			const movingRef = wrestlerRefs.current.find(ref => ref.id == wrestlerId);

			const newPosition = notMovingRefs
				.map(ref => ref.element.getBoundingClientRect().y)
				.sort((refA, refB) => refA - refB)
				.reduce((newPosition, ref, index) => movingRef.element.getBoundingClientRect().y > ref ? index + 1 : newPosition, 0);

			const currentPosition = props.wrestlers.find(wrestler => wrestler.id == wrestlerId).position;

			const wrestlersChanged = props.wrestlers.map(wrestler => {

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

			props.updateWrestlers(wrestlersChanged);

			mousePosition.current = null;
			setDragWrestlerId(null);
		}
	};

	const onDragCancel = (event) => {
		event.preventDefault();
		setDragWrestlerId(null);
	};

	const selectDivision = divisionName => {
		const newDivision = divisions.find(division => division.name == divisionName);
		
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

	return (
<>
{
selectedDivision ?

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
				divisions
				.sort((divisionA, divisionB) => divisionA.name > divisionB.name ? 1 : -1)
				.map((division, divisionIndex) =>
				<option key={divisionIndex}>{ division.name }</option>
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
	
	<div className={`listItem teamWrestler ${ dragWrestlerId == wrestler.id ? "dragging": "" }`} key={wrestler.id} data-testid={ wrestler.id }>
		<button className="wrestlerInfo" onClick={ () => window.location = `/portal/wrestlerview.html?id=${ wrestler.id }` }>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M450.001-290.001h59.998V-520h-59.998v229.999ZM480-588.461q13.731 0 23.019-9.288 9.288-9.288 9.288-23.019 0-13.73-9.288-23.019-9.288-9.288-23.019-9.288-13.731 0-23.019 9.288-9.288 9.289-9.288 23.019 0 13.731 9.288 23.019 9.288 9.288 23.019 9.288Zm.067 488.46q-78.836 0-148.204-29.92-69.369-29.92-120.682-81.21-51.314-51.291-81.247-120.629-29.933-69.337-29.933-148.173t29.92-148.204q29.92-69.369 81.21-120.682 51.291-51.314 120.629-81.247 69.337-29.933 148.173-29.933t148.204 29.92q69.369 29.92 120.682 81.21 51.314 51.291 81.247 120.629 29.933 69.337 29.933 148.173t-29.92 148.204q-29.92 69.369-81.21 120.682-51.291 51.314-120.629 81.247-69.337 29.933-148.173 29.933ZM480-160q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"></path></svg>
		</button>

		<div className="listItemHeader">
			{ wrestler.firstName } { wrestler.lastName }
		</div>

		<div className="dragBar">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" ref={ element => setRef(wrestler.id, element) }>
				<path d="M360-175.386q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm240 0q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm-240-240q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm240 0q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm-240-240q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Zm240 0q-26.653 0-45.634-18.98-18.98-18.981-18.98-45.634t18.98-45.634q18.981-18.98 45.634-18.98t45.634 18.98q18.98 18.981 18.98 45.634t-18.98 45.634q-18.981 18.98-45.634 18.98Z"/>
			</svg>
		</div>

	</div>
	
	)}

</div>

)}

</>
: "" }

<div aria-label="Add Wrestler" role="button" className={ `panel ${ !newWrestler ? "button" : "" }` } onClick={ () => { if (!newWrestler) { setNewWrestler({...emptyWrestler}) } }}>
	
	{
	isSaving && props.savingError ?

	<div className="panelError">{ props.savingError }</div>

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
			<button onClick={ () => { setIsSaving(true); props.addWrestler(newWrestler) } } aria-label="Save">
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

</>
	)
}

export default TeamWrestlers;
