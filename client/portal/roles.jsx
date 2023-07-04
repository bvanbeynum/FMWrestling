import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const RolesComponent = props => {

	const emptyRole = { name: "", isActive: true, users: [], privileges: [] },
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
	const [ users, setUsers ] = useState([]);
	const [ privileges, setPrivileges ] = useState([]);
	const [ newRole, setNewRole ] = useState(emptyRole);

	const [ sectionEdit, setSectionEdit ] = useState(null);

	useEffect(() => {
		if (!pageActive) {
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
					setUsers(data.users);
					setPrivileges(data.privileges);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	// Edit role properties (e.g. name)
	const editRole = (roleId, property, value) => {
		setRoles(roles => roles.map(role => {
			return role.id === roleId ? {
				...role,
				[property]: value
			} : role
		}));
	};

	const saveRole = save => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSaveItem(save.id || "new");

		fetch("/api/rolesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveRole: save }) })
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

	const deleteRole = roleId => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSaveItem(roleId);

		fetch("/api/rolesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delete: roleId }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {
				setRoles(roles => roles.filter(role => role.id !== roleId));

				setEditItem(null);
				setSaveItem(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error saving the role");
				setSaveItem(null);
				clearInterval(loadingInterval);
			});
	};

	const addMemberToRole = (roleId, userId) => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSaveItem(roleId);

		fetch("/api/rolesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveMember: { roleId: roleId, memberId: userId } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setRoles(roles => roles.map(role => role.id === data.role.id ? data.role : role));
				setEditItem(null);
				setSaveItem(null);
				setSectionEdit(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error adding the user");
				setSaveItem(null);
				clearInterval(loadingInterval);
			});
	};

	const removeMemberFromRole = (roleId, userId) => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSaveItem(roleId);

		fetch("/api/rolesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteMember: { roleId: roleId, memberId: userId } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setRoles(roles => roles.map(role => role.id === data.role.id ? data.role : role));
				setEditItem(null);
				setSaveItem(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error removing the member");
				setSaveItem(null);
				clearInterval(loadingInterval);
			});
	};

	const addPrivilegeToRole = (roleId, privilegeId) => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSaveItem(roleId);

		fetch("/api/rolesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savePrivilege: { roleId: roleId, privilegeId: privilegeId } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setRoles(roles => roles.map(role => role.id === data.role.id ? data.role : role));
				setEditItem(null);
				setSaveItem(null);
				setSectionEdit(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error adding the privilege");
				setSaveItem(null);
				clearInterval(loadingInterval);
			});
	};

	const removePrivilegeFromRole = (roleId, privilegeId) => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSaveItem(roleId);

		fetch("/api/rolesave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deletePrivilege: { roleId: roleId, privilegeId: privilegeId } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setRoles(roles => roles.map(role => role.id === data.role.id ? data.role : role));
				setEditItem(null);
				setSaveItem(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error removing the privilege");
				setSaveItem(null);
				clearInterval(loadingInterval);
			});
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
				saveItem === "new" ?
				
				<div className="loading">
					{
					loading[loadingIndex]
					}
				</div>

				: editItem === "new" ?

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
			.sort((roleA,roleB) => roleA.name.toLowerCase() > roleB.name.toLowerCase() ? 1 : -1 )
			.map(role => 

			<div key={ role.id } data-testid={ role.id } className="panel">
				{
				saveItem === role.id ?
				
				<div className="loading">
					{
					loading[loadingIndex]
					}
				</div>

				: editItem === role.id ?
				<>
				
				<label>
					<span>Name</span>
					<input type="text" value={ role.name } onChange={ event => editRole(role.id, "name", event.target.value) } aria-label="name" />
				</label>

				<div className="row">
					<div className="error">{ errorMessage }</div>

					<button disabled={ saveItem === role.id || !role.name } onClick={ () => saveRole(role) } aria-label="Save">
						{/* Check */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
						</svg>
					</button>

					<button disabled={ saveItem === role.id } onClick={ () => setEditItem(null) } aria-label="Cancel">
						{/* Cancel */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
						</svg>
					</button>

					<button disabled={ saveItem === role.id } onClick={ () => deleteRole(role.id) } aria-label="Delete Role">
						{/* Trash */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
						</svg>
					</button>
				</div>

				<h3>Members</h3>

				<div className="sectionList">
					{
					role.users.map(user =>
						<div key={ user.id } className="pill">
							{ user.firstName + " " + user.lastName }
							<button onClick={ () => removeMemberFromRole(role.id, user.id) } aria-label="Remove Member">
								{/* Trash */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
									<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
								</svg>
							</button>
						</div>
					)}

					<div className="pill">
						{
						sectionEdit === "member" ?
						
						<>
						<select value="" onChange={ event => addMemberToRole(role.id, event.target.value) } aria-label="Member">
							<option value="">-- Select User --</option>
						{
						users.map(user =>
							<option key={ user.id } value={ user.id }>{ user.firstName + " " + user.lastName }</option>
						)
						}
						</select>
						</>

						:
						<button onClick={ () => setSectionEdit("member") } aria-label="Add Member">
							{/* Plus */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"></path></svg>
						</button>
						}
					</div>
				</div>

				<h3>Privileges</h3>

				<div className="sectionList">
					{
					role.privileges.map(privilege =>
						<div key={ privilege.id } className="pill">
							{ privilege.name }
							<button onClick={ () => removePrivilegeFromRole(role.id, privilege.id) } aria-label="Remove Privilege">
								{/* Trash */}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
									<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
								</svg>
							</button>
						</div>
					)}

					<div className="pill">
						{
						sectionEdit === "privilege" ?
						
						<select value="" onChange={ event => addPrivilegeToRole(role.id, event.target.value) } aria-label="Privilege">
							<option value="">-- Select Privilege --</option>
						{
						privileges.map(privilege =>
							<option key={ privilege.id } value={ privilege.id }>{ privilege.name }</option>
						)
						}
						</select>

						:
						<button onClick={ () => setSectionEdit("privilege") } aria-label="Add Privilege">
							{/* Plus */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"></path></svg>
						</button>
						}
					</div>
				</div>

				</>

				:

				// Not edit
				<div className="row">
					<div className="rowContent">
						<h3>{ role.name }</h3>

						<div className="subHeading">
							<div>{ (role.users || []).length } members</div>
							<div>{ (role.privileges || []).length } privileges</div>
						</div>
					</div>
					
					<button aria-label="Edit" className="action" onClick={ () => setEditItem(role.id) }>
						{/* pencil */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/>
						</svg>
					</button>
				</div>

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
