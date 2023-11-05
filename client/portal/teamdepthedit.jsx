import React, { useState, useEffect, useRef } from "react";
import WrestlerDetails from "./wrestlerdetails";

const TeamDepthEdit = props => {

	const [ selectedWrestlers, setSelectedWrestlers ] = useState([]);
	const [ weightClasses, setWeightClasses ] = useState([]);

	const [ dragStatus, setDragStatus ] = useState(null);
	const [ dragPosition, setDragPosition ] = useState(null);
	const [ isPositionUpdate, setIsPositionUpdate ] = useState(false);

	const weightRefs = useRef([]);
	const dragRef = useRef(null);
	const mouseRef = useRef(null);
	const tableRef = useRef(null);

	useEffect(() => setWeightClasses(props.weightClasses), [ props.weightClasses ]);

	// Wait until position is triggered so that all attributes are up-to-date
	useEffect(() => {
		if (isPositionUpdate) {
			if (dragStatus && (dragStatus.selectWeightIndex ?? -1) >= 0 && (dragStatus.selectPillIndex ?? -1) >= 0 && (dragPosition ?? -1) >= 0) {
				const wrestlerId = weightClasses[dragStatus.dragWeightIndex].wrestlers[dragStatus.dragPillIndex].id;
				props.updatePosition(props.isTeam, weightClasses[dragStatus.selectWeightIndex].name, wrestlerId, dragPosition);
			}

			setIsPositionUpdate(false);
			setDragPosition(null);
			setDragStatus(null);
		}
	}, [ isPositionUpdate ]);

	useEffect(() => setSelectedWrestlers([]), [ props.selectedDivision ]);
	
	const selectWrestler = wrestler => {
		if (!selectedWrestlers.some(selected => selected.id == wrestler.id)) {
			setSelectedWrestlers(selectedWrestlers.concat(wrestler));
		} 
	};

	const setTableRef = element => {
		if (element) {
			const elementBox = element.getBoundingClientRect();
			tableRef.current = { top: elementBox.top, left: elementBox.left };
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
		
		const eventElement = event.target.tagName.toLowerCase() == "path" ? event.target.parentNode.parentNode
			: event.target.parentNode;
		const elementBox = eventElement.getBoundingClientRect();

		// Get the weight class index
		const dragWeightIndex = weightRefs.current.findIndex(ref => {
			const box = ref.element.getBoundingClientRect();

			return box.top <= elementBox.top && box.bottom > elementBox.bottom;
		});

		// Get the wrestler Index
		const elementIndex = [...weightRefs.current[dragWeightIndex].element.querySelectorAll(".pill")]
			.findIndex(pill => pill == eventElement);

		dragRef.current = {
			wrestlerId: weightClasses[dragWeightIndex].wrestlers[elementIndex].id,
			weightClass: weightClasses[dragWeightIndex].name,
			weightIndex: dragWeightIndex,
			pillIndex: elementIndex,
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
				setDragStatus({ dragPillIndex: dragRef.current.pillIndex, dragWeightIndex: dragRef.current.weightIndex });
			}

			// Get the element that's dragging
			const elementBox = dragRef.current.element.getBoundingClientRect();

			mouseRef.current = { 
				adjustX: (event.touches ? event.touches[0].clientX : event.clientX) - (window.innerWidth >= 1024 ? tableRef.current.left : 0),
				x: event.touches ? event.touches[0].clientX : event.clientX,
				y: event.touches ? event.touches[0].clientY : event.clientY
			};
			
			dragRef.current.element.style.top = (window.scrollY + (mouseRef.current.y - (elementBox.height / 2))) + "px";
			dragRef.current.element.style.left = (mouseRef.current.adjustX - (elementBox.width - (window.innerWidth >= 1024 ? 50 : 30))) + "px";

			// ************** Get the position and update UI with position information 
			
			const padding = 5;

			const overWeightIndex = weightRefs.current.findIndex(ref => {
				const box = ref.element.getBoundingClientRect();

				return (box.top - padding) < mouseRef.current.y
					&& (box.bottom + padding) > mouseRef.current.y
			});

			if (overWeightIndex >= 0) {
				// Get the wrestler Index
				const pillIndex = [...weightRefs.current[overWeightIndex].element.querySelectorAll(".pill")]
					.filter(pill => pill != dragRef.current.element)
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

				setDragStatus(dragStatus => ({ ...dragStatus, selectWeightIndex: overWeightIndex, selectPillIndex: pillIndex }))
				setDragPosition(pillIndex);
			}
			else {
				setDragStatus(dragStatus => ({ ...dragStatus, selectWeightIndex: null, selectPillIndex: null }))
				setDragPosition(null);
			}
		}
		else {
			dragRef.current = null;
			mouseRef.current = null;
	
			setDragPosition(null);
			setDragStatus(null);
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
		setDragStatus(null);
	};

	return (
<>

<div className="panel expandable">
	<h3>Depth Chart</h3>

	<table className="sectionTable dragTable" ref={ element => setTableRef(element)}>
	<thead>
	<tr>
		<th>Weight</th>
		<th className="dataColumn">Wrestlers</th>
	</tr>
	</thead>
	<tbody>
	{
	weightClasses
	.filter(weightClass => weightClass.divisions.includes(props.selectedDivision))
	.map((weightClass, weightClassIndex) => 
	<tr key={ weightClassIndex }>
		<td>
			{ weightClass.name }
		</td>
		<td className={`sectionList ${ dragStatus?.selectWeightIndex == weightClassIndex ? "selected" : "" }`} ref={ element => setWeightClassRef(element, weightClass) }>
		{
			weightClass.wrestlers.length == 0 ?
			<div className="emptyTable">No Wrestlers Assigned</div>
			
			:
			<>
			{
			weightClass.wrestlers
			.map((wrestler, wrestlerIndex) =>
			<React.Fragment key={wrestlerIndex}>

			{
			// If the pill is not the current pill (on the current weight class)
			dragStatus?.dragWeightIndex != weightClassIndex || dragStatus?.dragPillIndex != wrestlerIndex ?
			// If the selected is on current weight and before current index, then look for index - 1, else look for index
			<div index={ dragStatus?.dragWeightIndex == weightClassIndex && dragStatus?.dragPillIndex < wrestlerIndex ? wrestlerIndex - 1 : wrestlerIndex } className={`dragPosition ${ dragStatus?.selectWeightIndex == weightClassIndex && dragPosition == (dragStatus?.dragWeightIndex == weightClassIndex && dragStatus?.dragPillIndex < wrestlerIndex ? wrestlerIndex - 1 : wrestlerIndex) ? "selected" : "" }` }></div>
	
			: "" }

			<div className="pill wrestlerPill">
				<button aria-label="Select Wrestler" onClick={ () => { if (!props.isTeam) selectWrestler(wrestler) }}>{ wrestler.name }</button>
				<svg className="dragBar" ref={ element => setWrestlerRef(element) } xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-189.233q-24.749 0-42.374-17.624-17.625-17.625-17.625-42.374 0-24.75 17.625-42.374Q455.251-309.23 480-309.23q24.749 0 42.374 17.625 17.625 17.624 17.625 42.374 0 24.749-17.625 42.374-17.625 17.624-42.374 17.624Zm0-230.768q-24.749 0-42.374-17.625-17.625-17.625-17.625-42.374 0-24.749 17.625-42.374 17.625-17.625 42.374-17.625 24.749 0 42.374 17.625 17.625 17.625 17.625 42.374 0 24.749-17.625 42.374-17.625 17.625-42.374 17.625Zm0-230.769q-24.749 0-42.374-17.625-17.625-17.624-17.625-42.374 0-24.749 17.625-42.374 17.625-17.624 42.374-17.624 24.749 0 42.374 17.624 17.625 17.625 17.625 42.374 0 24.75-17.625 42.374Q504.749-650.77 480-650.77Z"/></svg>
			</div>

			</React.Fragment>
			)}

			{/* If the item is on the current weight, then look for length - 1 else length */}
			<div index={ dragStatus?.dragWeightIndex == weightClassIndex ? weightClass.wrestlers.length - 1 : weightClass.wrestlers.length } className={`dragPosition ${ dragStatus?.selectWeightIndex == weightClassIndex && dragPosition == (dragStatus?.dragWeightIndex == weightClassIndex ? weightClass.wrestlers.length - 1 : weightClass.wrestlers.length) ? "selected" : "" }` }></div>
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

	<WrestlerDetails 
		key={wrestlerIndex} 
		wrestlerId={ wrestler.id } 
		wrestlerName={ wrestler.name }
		homeTeam={ props.homeTeam }
		closeWrestler={ wrestlerId => setSelectedWrestlers(selectedWrestlers.filter(selected => selected.id != wrestlerId)) }
		/>

)}

</>
	);

}

export default TeamDepthEdit;
