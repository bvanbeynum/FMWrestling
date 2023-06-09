import React, { useEffect, useState } from "react";
import "./include/index.css";

const RolesComponent = (props) => {

	const [ pageActive, setPageActive ] = useState(false);

	const [ roles, setRoles ] = useState([]);

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
			
			fetch(`/api/rolesload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setRoles(data.roles);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	return (

<div className={`container ${ pageActive ? "active" : "" }`}>

	<div key={ "newPost" } className="panel">
		<div className="row">
			<div className="rowContent">
				<h3>New Role</h3>
			</div>
			
			<button aria-label="Add" className="action" onClick={ () => {} }>
				{/* Add */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"/>
				</svg>
			</button>
		</div>
	</div>

	<div className="panel">
		<div className="row">
			
			<div className="icon">
				5
			</div>

			<div className="rowContent">
				<h3>Statistician</h3>

				<div className="subHeading">
					<div>3 privileges</div>
				</div>
			</div>
			
			<button aria-label="Edit" className="action" onClick={ () => {} }>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/>
				</svg>
			</button>

		</div>
	</div>

	{
	roles
	.sort((roleA,roleB) => roleA.name > roleB.name ? 1 : -1 )
	.map(role => 

	<div key={ role.id } data-testid={ role.id } className="panel">
		<div className="row">

			<div className="rowContent">
				<div className="icon">
					{ (role.members || []).length }
				</div>

				<h3>{ role.name }</h3>

				<div className="subHeading">
					<div>{ (role.privileges || []).length } privileges</div>
				</div>
			</div>
			
			<button aria-label="Edit" className="action" onClick={ () => {} }>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/>
				</svg>
			</button>

		</div>
	</div>

	)}

</div>

	)
};

export default RolesComponent;
