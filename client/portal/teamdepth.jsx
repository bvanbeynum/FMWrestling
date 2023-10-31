import React, { useEffect, useState, useRef } from "react";

const TeamDepth = props => {

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ weightClasses, setWeightClasses ] = useState([]);

	const [ dragWrestlerId, setDragWrestlerId ] = useState(null);
	const wrestlerRefs = useRef([]);
	const mousePosition = useRef();
	const boxPositionRef = useRef();
	const boxRef = useRef(null);
	const isSavingRef = useRef(false);

	useEffect(() => {

		if (props.divisions && props.wrestlers) {
			const selectedDivision = props.selectedDivision ? props.selectedDivision 
				: props.divisions
					.sort((divisionA, divisionB) => /varsity/i.test(divisionA) ? -1 : /varsity/i.test(divisionB) ? 1 : divisionA > divisionB ? 1 : -1)
					.find(() => true);

			buildWrestlerRefs(selectedDivision);

			if (selectedDivision != props.selectedDivision) {
				props.selectDivision(selectedDivision);
			}

			if (isSavingRef.current) {
				isSavingRef.current = false;
			}

		}
		
	}, [ props.wrestlers, props.divisions ])

	useEffect(() => {
		if (props.selectedDivision && wrestlerRefs.current && wrestlerRefs.current.length > 0) {
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
	}, [ weightClasses ]);

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

				if (wrestler.division == props.selectedDivision && wrestler.weightClass == weightClass) {
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
		buildWrestlerRefs(divisionName)
		props.selectDivision(divisionName)
	};

	const buildWrestlerRefs = newDivision => {
		
		const newWeightClasses = [...new Set(props.wrestlers.filter(wrestler => wrestler.division == newDivision).map(wrestler => wrestler.weightClass)) ]
			.map(weightClass => ({
				name: weightClass,
				wrestlers: props.wrestlers.filter(wrestler => wrestler.division == newDivision && wrestler.weightClass == weightClass)
			}));;
	
		wrestlerRefs.current = newWeightClasses
			.flatMap(weightClass => weightClass.wrestlers)
			.map(wrestler => ({
				id: wrestler.id,
				weightClass: wrestler.weightClass,
				element: wrestlerRefs.current.filter(ref => ref.id == wrestler.id).map(ref => ref.element).find(() => true)
			}));
		
		setWeightClasses(newWeightClasses);
	};

	const setRef = (wrestlerId, element) => {
		const ref = wrestlerRefs.current.find(ref => ref.id == wrestlerId);

		if (ref)
			ref.element = element;
	};

	return (
<>
{
props.selectedDivision ?

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
			<select value={ props.selectedDivision } onChange={ event => selectDivision(event.target.value) }>
				{
				props.divisions
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
props.selectedDivision ? 
<>

<div className="panelHeader">
	<div>{ props.selectedDivision }</div>
</div>

{
weightClasses
.sort((weightClassA, weightClassB) => weightClassA.name - weightClassB.name)
.map((weightClass, weightClassIndex) =>

<div className="panel" key={ weightClassIndex }>
	<h3>{ weightClass.name }</h3>

	{
	weightClass.wrestlers
	.sort((wrestlerA, wrestlerB) => wrestlerA.position ? wrestlerA.position - wrestlerB.position : wrestlerA.name > wrestlerB.name ? 1 : -1)
	.map(wrestler => 
	
	<div className={`listItem teamWrestler ${ dragWrestlerId == wrestler.id ? "dragging": "" }`} key={wrestler.id} data-testid={ wrestler.id }>
		<div>
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

</>
	)
}

export default TeamDepth;
