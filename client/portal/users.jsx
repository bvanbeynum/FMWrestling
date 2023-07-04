import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const UsersComponent = props => {

	const loading = [
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120Zm156-348q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Empty
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Top
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Full
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-516q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg> // Bottom
		],
		emptyUser = { firstName: "", lastName: "", email: "", phone: "", devices: [], roles: [] };

	const [ pageActive, setPageActive ] = useState(false);
	const [ loadError, setLoadError ] = useState("");
	const [ panelError, setPanelError ] = useState("");

	const [ users, setUsers ] = useState([]);
	const [ roles, setRoles ] = useState([]);

	const [ loadingIndex, setLoadingIndex ] = useState(0);
	const [ editPanel, setEditPanel ] = useState(null);
	const [ savePanel, setSavePanel ] = useState(null);
	const [ isNewRoleEdit, setisNewRoleEdt ] = useState(false);
	
	const [ newUser, setNewUser ] = useState(emptyUser);

	useEffect(() => {
		if (!pageActive) {
			
			fetch(`/api/usersload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setUsers(data.users.map(user => buildUser(user)));

					setRoles(data.roles);
					setPageActive(true);
				})
				.catch(error => {
					console.warn(error);
					setLoadError(`Error: ${error.message}`);
				});

		}
	}, []);

	const buildUser = user => ({
		...user,
		devices: user.devices.map(device => ({
			...device,
			createdDisplay: new Date(device.created).toLocaleDateString().replace(/\/20[\d]{2}/, "/" + (new Date().getFullYear() + "").substring(2)),
			lastAccessDisplay: new Date(device.lastAccess).toLocaleString().replace(/\:[\d]{2} /, " ").replace(/, /, "\n"),
			browserDisplay: device.browser.isDesktop && !/unknown/i.test(device.browser.platform) ? device.browser.platform
				: device.browser.isDesktop ? device.browser.os
				: device.browser.isAndroid ? "Android"
				: device.browser.isiPhone ? "iPhone"
				: device.browser.isMobile ? "Mobile Other"
				: "Unknown"
			}))
	});

	// Edit properties (e.g. name)
	const editProperty = (userId, property, value) => {
		setUsers(users => users.map(user => {
			return user.id === userId ? {
				...user,
				[property]: value
			} : user
		}));
	};

	const saveUser = save => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSavePanel(save.id || "new");

		fetch("/api/userssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveUser: save }) })
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
					setUsers(users => users.concat(data.user));
					setNewUser(emptyUser);
				}

				setEditPanel(null);
				setSavePanel(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setPanelError("There was an error saving the user");
				setSavePanel(null);
				clearInterval(loadingInterval);
			});
	};

	const deleteUser = userId => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSavePanel(userId);

		fetch("/api/userssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteUser: userId }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {
				setUsers(users => users.filter(user => user.id !== userId));

				setEditPanel(null);
				setSavePanel(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setPanelError("There was an error saving the role");
				setSavePanel(null);
				clearInterval(loadingInterval);
			});
	};

	const removeDeviceFromUser = (userId, token) => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSavePanel(userId);

		fetch("/api/userssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteDevice: { userId: userId, token: token } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setUsers(users => users.map(user => user.id === data.user.id ? data.user : user));
				setEditPanel(null);
				setSavePanel(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setPanelError("There was an error removing the device");
				setSavePanel(null);
				clearInterval(loadingInterval);
			});
	};

	const addRoleToUser = (userId, roleId) => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSavePanel(userId);

		fetch("/api/userssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saveRole: { userId: userId, roleId: roleId } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setUsers(users => users.map(user => user.id === data.user.id ? data.user : user));
				setEditPanel(null);
				setSavePanel(null);
				setisNewRoleEdt(false);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setPanelError("There was an error adding the role");
				setSavePanel(null);
				clearInterval(loadingInterval);
			});
	};

	const removeRoleFromUser = (userId, roleId) => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);
		setSavePanel(userId);

		fetch("/api/userssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deleteRole: { userId: userId, roleId: roleId } }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				setUsers(users => users.map(user => user.id === data.user.id ? data.user : user));
				setEditPanel(null);
				setSavePanel(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setPanelError("There was an error removing the role");
				setSavePanel(null);
				clearInterval(loadingInterval);
			});
	};

	return (

<div className="page">
	<Nav />

	<div>
		<header><h1>Users</h1></header>

		<div className={`container ${ pageActive ? "active" : "" }`}>

		{
		loadError ?

			<div className="panel error">
				<h3>{ loadError }</h3>
			</div>

		: 
		<>
		{
			savePanel === "new" ?

			<div className="panel">
				<div className="loading">
					{
					loading[loadingIndex]
					}
				</div>
			</div>

			: editPanel === "new" ?
			
			<div className="panel">
				<>
				<label>
					<span>First Name</span>
					<input type="text" value={ newUser.firstName } onChange={ event => setNewUser(newUser => ({...newUser, firstName: event.target.value })) } aria-label="First Name" />
				</label>

				<label>
					<span>Last Name</span>
					<input type="text" value={ newUser.lastName} onChange={ event => setNewUser(newUser => ({...newUser, lastName: event.target.value })) } aria-label="Last Name" />
				</label>
				
				<label>
					<span>Email</span>
					<input type="email" value={ newUser.email } onChange={ event => setNewUser(newUser => ({...newUser, email: event.target.value })) } aria-label="Email" />
				</label>
				
				<label>
					<span>Phone</span>
					<input type="phone" value={ newUser.phone } onChange={ event => setNewUser(newUser => ({...newUser, phone: event.target.value })) } aria-label="Phone" />
				</label>
				
				<div className="row">
					<div className="error">{ panelError }</div>

					<button disabled="" onClick={ () => saveUser(newUser) } aria-label="Save User">
						{/* Check */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
						</svg>
					</button>

					<button disabled="" onClick={ () => setEditPanel(null) } aria-label="Cancel">
						{/* Cancel */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
						</svg>
					</button>

					<button disabled="" onClick={ () => {} } aria-label="Delete User">
						{/* Trash */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
						</svg>
					</button>
				</div>
				</>
			</div>
			
			:

			<div className="panel">
				<div className="row">
					<div className="rowContent">
						<h3>New User</h3>
					</div>

					<button aria-label="Add User" className="action" onClick={ () => setEditPanel("new") }>
						{/* Add */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"/>
						</svg>
					</button>
				</div>
			</div>

		}

		{
		users
			.sort((userA, userB) => userA.lastName > userB.lastName ? 1 : userA.lastName < userB.lastName ? -1 : userA.firstName > userB.firstName ? 1 : -1)
			.map(user =>
			
			editPanel !== user.id ?
			
			<div key={ user.id } data-testid={ user.id } className="panel">
				<div className="row">
					<div className="rowContent">
						<h3>{ `${ user.lastName }, ${ user.firstName }` }</h3>

						<div className="subHeading">
							<div>{ user.devices.length } devices</div>
							<div>{ user.roles.length } roles</div>
						</div>
					</div>

					<button aria-label="Edit User" className="action" onClick={ () => setEditPanel(user.id) }>
						{/* pencil */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/>
						</svg>
					</button>
				</div>
			</div>

			:

			<div key={ user.id } data-testid={ user.id } className="panel">
				<>
				<label>
					<span>First Name</span>
					<input type="text" value={ newUser.firstName } onChange={ event => editProperty(user.id, "firstName", event.target.value) } aria-label="First Name" />
				</label>

				<label>
					<span>Last Name</span>
					<input type="text" value={ newUser.lastName} onChange={ event => editProperty(user.id, "lastName", event.target.value) } aria-label="Last Name" />
				</label>
				
				<label>
					<span>Email</span>
					<input type="email" value={ newUser.email } onChange={ event => editProperty(user.id, "email", event.target.value) } aria-label="Email" />
				</label>
				
				<label>
					<span>Phone</span>
					<input type="phone" value={ newUser.phone } onChange={ event => editProperty(user.id, "phone", event.target.value) } aria-label="Phone" />
				</label>
				
				<div className="row">
					<div className="error">{ panelError }</div>

					<button disabled="" onClick={ () => saveUser(user) } aria-label="Save User">
						{/* Check */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
						</svg>
					</button>

					<button disabled="" onClick={ () => setEditPanel(null) } aria-label="Cancel">
						{/* Cancel */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
						</svg>
					</button>

					<button disabled="" onClick={ () => deleteUser(user.id) } aria-label="Delete User">
						{/* Trash */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
						</svg>
					</button>
				</div>

				<h3>Devices</h3>

				<div className="sectionList">
					<div className="pill">
						<table>
						<thead>
						<tr>
							<th>Device</th>
							<th>Accessed</th>
							<th>Created</th>
							<th></th>
						</tr>
						</thead>
						<tbody>
						{
						user.devices
						.sort((deviceA, deviceB) => new Date(deviceB.lastAccess) - new Date(deviceA.lastAccess))
						.map(device =>
						
						<tr key={ device["_id"] }>
							<td>{ device.browserDisplay }</td>
							<td><pre>{ device.lastAccessDisplay }</pre></td>
							<td>{ device.createdDisplay }</td>
							<td>
								<button onClick={ () => removeDeviceFromUser(user.id, device.token) } aria-label="Remove Device">
									{/* Trash */}
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
										<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
									</svg>
								</button>
							</td>
						</tr>

						)}
						
						</tbody>
						</table>
					</div>
				</div>

				<h3>Roles</h3>

				<div className="sectionList">
					{
					user.roles
					.sort((roleA, roleB) => roleA.name > roleB.name ? 1 : -1)
					.map(role =>
						
					<div key={ role.id } className="pill">
						{ role.name }
						<button onClick={ () => removeRoleFromUser(user.id, role.id) } aria-label="Remove Role">
							{/* Trash */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
							</svg>
						</button>
					</div>

					)}

					{
					isNewRoleEdit ?

					<select value="" onChange={ event => addRoleToUser(user.id, event.target.value) } aria-label="New Role">
						<option value="">-- Select Role --</option>
						{
						roles.map(role =>
							<option key={ role.id } value={ role.id }>{ role.name }</option>
						)}
					</select>

					:
					
					<div className="pill">
						<button onClick={ () => setisNewRoleEdt(true) } aria-label="Add Role">
							{/* Plus */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-200v-240H200v-80h240v-240h80v240h240v80H520v240h-80Z"></path></svg>
						</button>
					</div>

					}

				</div>
				</>
			</div>

		)}

		</>
		}
		</div>
	</div>
</div>

	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<UsersComponent />);
export default UsersComponent;
