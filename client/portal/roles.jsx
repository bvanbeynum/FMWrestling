import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const RolesComponent = props => {

	const emptyRole = { name: "", isActive: true },
		loading = [
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120Zm156-348q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Empty
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Top
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Full
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-516q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg> // Bottom
		];

	const [ pageActive, setPageActive ] = useState(false);
	const [ editItem, setEditItem ] = useState(null);
	const [ saveItem, setSaveItem ] = useState(null);
	const [ loadingIndex, setLoadingIndex ] = useState(0);
	const [ errorMessage, setErrorMessage ] = useState("");

	const [ roles, setRoles ] = useState([]);
	const [ newRole, setNewRole ] = useState(emptyRole);

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
			
			fetch(`/api/roleload`)
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

	const saveRole = save => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSaveItem(save.id || "new");

		fetch("/api/rolesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ save: save }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				if (!save.id) {
					setRoles(roles => roles.concat(data.role));
					setNewRole(emptyRole);
				}

				setEditItem(null);
				setSaveItem(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error saving the event");
				setSaveItem(null);
				clearInterval(loadingInterval);
			});
	};

	const editRole = (roleId, property, value) => {
		setRoles(roles => roles.map(role => {
			return role.id === roleId ? {
				...role,
				[property]: value
			} : role
		}));
	};

	return (

<div className="page">
	<Nav />

	<div>
		<header>
			<h1>Roles</h1>
		</header>

		<div className={`container ${ pageActive ? "active" : "" }`}>

			<div key={ "newPost" } className="panel">
				{
				editItem === "new" ?

				<>
				<h3>New Role</h3>

				<label>
					<span>Name</span>
					<input type="text" value={ newRole.name } onChange={ event => setNewRole(newRole => ({ ...newRole, name: event.target.value }))} aria-label="name" />
				</label>

				<div className="row">
					<div className="error">{ errorMessage }</div>
					<button disabled={ saveItem === "new" || !newRole.name } onClick={ () => saveRole(newRole) } aria-label="Save">
						{
						saveItem === "new" ?
							loading[loadingIndex]
						: 
							"Add"
						}
					</button>

					<button disabled={ saveItem === "newEvent" } onClick={ () => setEditItem(null) } aria-label="Cancel">Cancel</button>
				</div>
				</>

				:

				<div className="row">
					<div className="rowContent">
						<h3>New Role</h3>
					</div>
					
					<button aria-label="Add" className="action" onClick={ () => setEditItem("new") }>
						{/* Add */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"/>
						</svg>
					</button>
				</div>

				}
			</div>

			{
			roles
			.sort((roleA,roleB) => roleA.name > roleB.name ? 1 : -1 )
			.map(role => 

			<div key={ role.id } data-testid={ role.id } className="panel">
				<div className="row">
					
					<div className="icon">
						{ (role.members || []).length }
					</div>

					<div className="rowContent">
						{
						editItem === role.id ?
						<label>
							<span>Name</span>
							<input type="text" value={ role.name } onChange={ event => editRole(role.id, "name", event.target.value) } aria-label="name" />
						</label>
						:
						<>
						<h3>{ role.name }</h3>

						<div className="subHeading">
							<div>{ (role.privileges || []).length } privileges</div>
						</div>
						</>
						}
					</div>
					
					{
					editItem !== role.id ?
					<button aria-label="Edit" className="action" onClick={ () => setEditItem(role.id) }>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/>
						</svg>
					</button>
					: ""
					}

				</div>

				{
				editItem === role.id ?

				<div className="row">
					<div className="error">{ errorMessage }</div>
					<button disabled={ saveItem === role.id || !role.name } onClick={ () => saveRole(role) } aria-label="Save">
						{
						saveItem === role.id ?
							loading[loadingIndex]
						: 
							"Save"
						}
					</button>

					<button disabled={ saveItem === role.id } onClick={ () => {} } aria-label="Delete">Delete</button>
					<button disabled={ saveItem === role.id } onClick={ () => setEditItem(null) } aria-label="Cancel">Cancel</button>
				</div>

				: ""
				}
			</div>

			)}

		</div>

	</div>
</div>
	)
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<RolesComponent />);
export default RolesComponent;
