import React, { useEffect, useState, useRef, createRef } from "react";
import "./include/team.css";

const TeamCompareWrestlers = props => {

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);
	const [ selectedWrestlers, setSelectedWrestlers ] = useState([]);

	const [ dragIndex, setDragIndex ] = useState(null);
	const [ dragWeight, setDragWeight ] = useState(null);
	const [ dragSelectWeight, setDragSelectWeight ] = useState(null);
	const [ dragPosition, setDragPosition ] = useState(null);
	const [ isPositionUpdate, setIsPositionUpdate ] = useState(false);

	const weightRefs = useRef([]);
	const dragRef = useRef(null);
	const mouseRef = useRef(null);

	// Wait until position is triggered so that all attributes are up-to-date
	useEffect(() => {
		if (isPositionUpdate) {
			if (dragSelectWeight && dragWeight && dragIndex && (dragPosition || dragPosition === 0)) {
				const wrestlerId = props.weightClasses.filter(w => w.name == dragWeight).flatMap(w => w.opponentWrestlers[dragIndex].id).find(() => true);
				props.updatePosition(dragSelectWeight, wrestlerId, dragPosition);
			}

			setIsPositionUpdate(false);
			setDragSelectWeight(null);
			setDragWeight(null);
			setDragPosition(null);
			setDragIndex(null);
		}
	}, [ isPositionUpdate ]);
	
	const selectDivision = newDivision => {
		setSelectedWrestlers([]);
		props.setSelectedDivision(newDivision);
	};

	const selectWrestler = wrestler => {
		if (!selectedWrestlers.some(selected => selected.id == wrestler.id)) {
			setSelectedWrestlers(selectedWrestlers.concat(wrestler));
		} 
	};

	const setWeightClassRef = (element, weightClass) => {
		if (element) {
			if (weightRefs.current.some(weightClassRef => weightClassRef.name == weightClass.name)) {
				weightRefs.current.find(weightClassRef => weightClassRef.name == weightClass.name).element = element;
			}
			else {
				weightRefs.current.push({ name: weightClass.name, element: element })
			}
		}
	};

	const setWrestlerRef = element => {
		if (element && !element.isEventSet) {
			element.addEventListener("touchstart", event => onDragDown(event), { passive: false });
			element.addEventListener("touchmove", event => onDrag(event), { passive: false });
			element.addEventListener("touchend", event => onDragUp(event), { passive: false });
			element.addEventListener("touchcancel", event => onDragCancel(event), { passive: false });
			
			element.addEventListener("mousedown", event => onDragDown(event), { passive: false });
			element.addEventListener("mousemove", event => onDrag(event), { passive: false });
			element.addEventListener("mouseup", event => onDragUp(event), { passive: false });

			element.isEventSet = true;
		}
	};

	const onDragDown = (event) => {
		event.preventDefault();
		
		const eventElement = event.target.tagName == "BUTTON" ? event.target.parentNode : event.target;
		const elementBox = eventElement.getBoundingClientRect();

		// Get the weight class index
		const dragWeightIndex = weightRefs.current.findIndex(ref => {
			const box = ref.element.getBoundingClientRect();

			return box.top <= elementBox.top && box.bottom > elementBox.bottom;
		});

		// Get the wrestler Index
		const elementIndex = [...weightRefs.current[dragWeightIndex].element.querySelectorAll(".pill")]
			.findIndex(pill => pill == eventElement);

		eventElement.style.top = eventElement.top + "px";
		eventElement.style.left = eventElement.left + "px";

		dragRef.current = {
			wrestlerId: props.weightClasses[dragWeightIndex].opponentWrestlers[elementIndex].id,
			weightClass: props.weightClasses[dragWeightIndex].name,
			dragIndex: elementIndex,
			element: eventElement,
			isDragging: false
		};
	};

	const onDrag = (event) => {
		// Make sure the down event was called
		if (dragRef.current) {
			event.preventDefault();

			if (!dragRef.current.isDragging) {
				dragRef.current.element.classList.add("dragging");
				dragRef.current.isDragging = true;
				setDragIndex(dragRef.current.dragIndex);
				setDragWeight(dragRef.current.weightClass);
			}

			// Get the element that's dragging
			const eventElement = event.target.tagName == "BUTTON" ? event.target.parentNode : event.target;
			const elementBox = eventElement.getBoundingClientRect();

			mouseRef.current = { 
				adjustX: (window.screen.availWidth >= 1024 ? -300 : 0) + (event.touches ? event.touches[0].clientX : event.clientX),
				x: event.touches ? event.touches[0].clientX : event.clientX,
				y: event.touches ? event.touches[0].clientY : event.clientY
			};
			
			eventElement.style.top = (window.scrollY + (mouseRef.current.y - (elementBox.height / 2))) + "px";
			eventElement.style.left = (mouseRef.current.adjustX - (elementBox.width / 2)) + "px";

			// ************** Get the position and update UI with position information 
			
			const padding = 5;

			const overWeightIndex = weightRefs.current.findIndex(ref => {
				const box = ref.element.getBoundingClientRect();

				return (box.top - padding) < mouseRef.current.y
					&& (box.bottom + padding) > mouseRef.current.y
			});

			if (overWeightIndex >= 0) {
				const overWeight = props.weightClasses.filter(weightClass => weightClass.divisions.includes(props.selectedDivision))[overWeightIndex].name;

				// Get the wrestler Index
				const position = [...weightRefs.current[overWeightIndex].element.querySelectorAll(".pill")]
					.filter(pill => pill != eventElement)
					.map(ref => {
						const box = ref.getBoundingClientRect();
						
						return { 
							left: box.left - (box.width / 2), 
							right: box.left + (box.width / 2),
							top: box.top - padding,
							bottom: box.bottom + padding
						};
					})
					.reduce((output, zone, zoneIndex, zoneArray) => 
						mouseRef.current.y > zone.top && mouseRef.current.y < zone.bottom && mouseRef.current.x > zone.left && mouseRef.current.x < zone.right ? zoneIndex 
							: zoneIndex == zoneArray.length -1 && mouseRef.current.y > zone.top && mouseRef.current.y < zone.bottom && mouseRef.current.x > zone.left ? zoneIndex + 1
							: output
					, null);

				setDragSelectWeight(overWeight);
				setDragPosition(position);
			}
			else {
				setDragSelectWeight(null);
				setDragPosition(null);
			}
		}
		else {
			dragRef.current = null;
			mouseRef.current = null;
	
			setDragPosition(null);
			setDragSelectWeight(null);
			setDragWeight(null);
			setDragIndex(null);
		}
	};
	
	const onDragUp = (event) => {
		if (dragRef.current) {
			event.preventDefault();

			setIsPositionUpdate(true);

			dragRef.current.element.style.top = "";
			dragRef.current.element.style.left = "";
			dragRef.current.element.classList.remove("dragging");

			dragRef.current = null;
			mouseRef.current = null;
		}
	};
	
	const onDragCancel = (event) => {
		event.preventDefault();

		dragRef.current.element.style.top = "";
		dragRef.current.element.style.left = "";
		dragRef.current.element.classList.remove("dragging");

		dragRef.current = null;
		mouseRef.current = null;

		setDragPosition(null);
		setDragSelectWeight(null);
		setDragWeight(null);
		setDragIndex(null);
	};

	return (
<>

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
			<select value={ props.selectedOpponentId } onChange={ event => props.selectOpponent(event.target.value) }>
				{
				props.opponents
					.sort((opponentA, opponentB) => opponentA.name > opponentB.name ? 1 : -1)
					.map((opponent, opponentIndex) =>
				<option key={opponentIndex} value={ opponent.id }>{ opponent.name }</option>
				)
				}
			</select>
		</label>
		
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

<div className="panel expandable">
	<h3>Depth Chart</h3>

	<table className="sectionTable">
	<thead>
	<tr>
		<th>Weight</th>
		<th className="dataColumn">Wrestlers</th>
	</tr>
	</thead>
	<tbody>
	{
	props.weightClasses
	.filter(weightClass => weightClass.divisions.includes(props.selectedDivision))
	.map((weightClass, weightClassIndex) => 
	<tr key={ weightClassIndex }>
		<td>
			{ weightClass.name }
		</td>
		<td className={`sectionList ${ dragSelectWeight == weightClass.name ? "selected" : "" }`} ref={ element => setWeightClassRef(element, weightClass) }>
		{
			weightClass.opponentWrestlers.length == 0 ?
			<div className="emptyTable">No Wrestlers Assigned</div>
			
			:
			<>
			{
			weightClass.opponentWrestlers
			.map((wrestler, wrestlerIndex) =>
			<React.Fragment key={wrestlerIndex}>

			{
			!dragRef.current || dragRef.current.weightClass != weightClass.name || dragIndex != wrestlerIndex ?
			// If the selected is on current weight and before current index, then look for index - 1, else look for index
			<div index={ dragRef.current && dragRef.current.weightClass == weightClass.name && dragIndex < wrestlerIndex ? wrestlerIndex - 1 : wrestlerIndex } className={`dragPosition ${ dragSelectWeight == weightClass.name && dragPosition == (dragRef.current && dragRef.current.weightClass == weightClass.name && dragIndex < wrestlerIndex ? wrestlerIndex - 1 : wrestlerIndex) ? "selected" : "" }` }></div>
	
			: "" }

			<div className="pill" ref={ element => setWrestlerRef(element) }>
				<button aria-label="Select Wrestler" onClick={ () => selectWrestler(wrestler) }>
					{ wrestler.name }
				</button>
			</div>

			</React.Fragment>
			)}

			{/* If the item is on the current weight, then look for length - 1 else length */}
			<div index={ dragRef.current && dragRef.current.weightClass == weightClass.name ? weightClass.opponentWrestlers.length - 1 : weightClass.opponentWrestlers.length } className={`dragPosition ${ dragSelectWeight == weightClass.name && dragPosition == (dragRef.current && dragRef.current.weightClass == weightClass.name ? weightClass.opponentWrestlers.length - 1 : weightClass.opponentWrestlers.length) ? "selected" : "" }` }></div>
			</>
		}
		</td>
	</tr>
	)
	}
	</tbody>
	</table>
</div>

{
selectedWrestlers.map((wrestler, wrestlerIndex) =>

<div key={wrestlerIndex} className="panel">
	<h3>
		{ wrestler.name }
		<button aria-label="Remove User" onClick={ () => setSelectedWrestlers(selectedWrestlers.filter(selected => selected.id != wrestler.id)) }>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"></path></svg>
		</button>
	</h3>

	<table className="sectionTable">
	<thead>
	<tr>
		<th>Weight</th>
		<th>Last Date</th>
		<th>Last Event</th>
	</tr>
	</thead>
	<tbody>
	{
	wrestler.weightClasses
	.sort((weightClassA, weightClassB) => +weightClassA.lastDate - +weightClassB.lastDate)
	.map((weightClass, weightClassIndex) =>
	<tr key={weightClassIndex}>
		<td>{ weightClass.weightClass }</td>
		<td>{ weightClass.lastDate.toLocaleDateString() }</td>
		<td>{ weightClass.lastEvent }</td>
	</tr>
	)}
	</tbody>
	</table>
</div>

)}

</>
	)		
};

export default TeamCompareWrestlers;
