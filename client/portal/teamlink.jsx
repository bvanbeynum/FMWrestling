import React, { useEffect, useState, useRef } from "react";

const TeamLink = props => {

	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	return (
<>

<div className="panel">
	<h3>Flo External</h3>
</div>

<div className="panel">
	<h3>SC Mat External</h3>
</div>

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
			Site
			<select value="" aria-label="Select Site">
				<option value="flo">Flo</option>
				<option value="scmat">SC Mat</option>
			</select>
		</label>

		<label>
			<span>Search</span>
			<input type="text" aria-label="Search Teams" />
		</label>
	</div>

</div>

<div className="panel actionBar">
	<div className="panelContent">
		<h3>Fort Mil</h3>

		<div className="sectionHeading">Wrestlers</div>
		<table className="sectionTable">
		<thead>
		<tr>
			<th>Name</th>
			<th>First Match</th>
			<th>Last Match</th>
			<th>Matches</th>
		</tr>
		</thead>
		<tbody>
			<tr>
				<td>Jim Wrestler</td>
				<td>Southern Slam (10/22/2019)</td>
				<td>States (2/15/2021)</td>
				<td>5</td>
			</tr>
		</tbody>
		</table>
		
		<div className="sectionHeading">Event</div>
		<table className="sectionTable">
		<thead>
		<tr>
			<th>Date</th>
			<th>Name</th>
		</tr>
		</thead>
		<tbody>
			<tr>
				<td>10/22/2019</td>
				<td>Southern Slam</td>
			</tr>
		</tbody>
		</table>
		
	</div>
</div>

<div className="panel actionBar">
	<div className="panelContent">
		<h3>Fort Mil</h3>

		<table className="sectionTable">
		<thead>
		<tr>
			<th>Date</th>
			<th>Rank</th>
			<th>Ranked Wrestlers</th>
		</tr>
		</thead>
		<tbody>
			<tr>
				<td>1/11/2023</td>
				<td>5</td>
				<td>10 Wrestlers</td>
			</tr>
		</tbody>
		</table>
		
	</div>
</div>

</>
	)
}

export default TeamLink;
