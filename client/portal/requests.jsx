import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const RequestsComponent = (props) => {

	const emptyUser = { firstName: "", lastName: "", email: "" },
		loading = [
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120Zm156-348q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Empty
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Top
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Full
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-516q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg> // Bottom
		];

	const [ pageActive, setPageActive ] = useState(false);
	const [ loadingIndex, setLoadingIndex ] = useState(0);
	const [ editItem, setEditItem ] = useState(null);
	const [ saveItem, setSaveItem ] = useState(null);
	const [ errorMessage, setErrorMessage ] = useState("");

	const [ requests, setRequests ] = useState([]);
	const [ users, setUsers ] = useState([]);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ requestUser, setRequestUser ] = useState("");
	const [ newUser, setNewUser ] = useState(emptyUser);

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
			
			fetch(`/api/requestsload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {

					setLoggedInUser(data.loggedInUser);
					setRequests(data.deviceRequests.map(request => ({
						...request,
						created: new Date(request.created),
						deviceName: request.device.browser.isDesktop && !/unknown/i.test(request.device.browser.platform) ? request.device.browser.platform + " / " + request.device.browser.browser
							: request.device.browser.isDesktop ? request.device.browser.os + " / " + request.device.browser.browser
							: request.device.browser.isAndroid ? "Mobile / Android"
							: request.device.browser.isiPhone ? "Mobile / iPhone"
							: request.device.browser.isMobile ? "Mobile / Other"
							: "Other"
					})));

					setUsers(data.users);

				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const saveRequest = request => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);

		setSaveItem(request.id);

		const save = {
			request: request
		};

		if (requestUser === "new" && newUser.firstName && newUser.lastName && newUser.email) {
			save.user = newUser;
		}
		else if (users.some(user => user.id === requestUser)) {
			save.userId = requestUser;
		}
		else {
			setErrorMessage("Invalid User");
			return;
		}

		fetch("/api/requestssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ save: save }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {
				setRequests(requests => requests.filter(request => request.id !== save.request.id));
				setEditItem(null);
				setSaveItem(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error saving the request");
				setSaveItem(null);
				clearInterval(loadingInterval);
			});
	};

	const deleteRequest = requestId => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);

		setSaveItem(requestId);

		fetch("/api/requestssave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delete: requestId }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {
				setRequests(requests => requests.filter(item => item.id !== requestId));
				setEditItem(null);
				setSaveItem(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error deleting the request");
				setSaveItem(null);
				clearInterval(loadingInterval);
			});
	};

	const editRequest = request => {
		setRequestUser("");
		setNewUser({
			firstName: request.name ? request.name.split(" ")[0] : "",
			lastName: request.name && request.name.split(" ").length > 1 ? request.name.split(" ").slice(1).join(" ") : "",
			email: request.email
		});
		setEditItem(request.id)
	};

	return (

<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		<header>
			<h1>Requests</h1>
		</header>

		<div className={`container ${ pageActive ? "active" : "" }`}>

			{
			requests
			.sort((requestA,requestB) => requestA.created - requestB.created )
			.map(request => 

			<div key={ request.id } data-testid={ request.id } className="panel">
				<div className="row">

					<div className="rowContent">
						<h3>{ request.name }</h3>

						<div className="subHeading">Date: { request.created.toLocaleDateString() } { request.created.toLocaleTimeString() }</div>
						<div className="subHeading">Email: { request.email }</div>
						<div className="subHeading">Device: { request.deviceName }</div>
					</div>
					
					{
					editItem !== request.id ?
					<button aria-label="Edit" className="action" onClick={ () => editRequest(request) }>
						{/* Edit */}
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M200-200h56l345-345-56-56-345 345v56Zm572-403L602-771l56-56q23-23 56.5-23t56.5 23l56 56q23 23 24 55.5T829-660l-57 57Zm-58 59L290-120H120v-170l424-424 170 170Zm-141-29-28-28 56 56-28-28Z"/>
						</svg>
					</button>
					: ""
					}

				</div>

				{
				editItem === request.id ?

				<>
				<div className="seperator"></div>

				<label>
					<span>User</span>
					<select name="scope" aria-label="User" value={ requestUser } onChange={ event => setRequestUser(event.target.value) }>
						<option value="">-- Select User --</option>
						<option value="new">New User</option>

						{
						users.map(user =>
						<option key={user.id} value={user.id}>{ `${ user.firstName } ${ user.lastName }` }</option>
						)}

					</select>
				</label>

				{
				requestUser === "new" ?

				<>
				<label>
					<span>First Name</span>
					<input type="text" value={ newUser.firstName } onChange={ event => setNewUser(newUser => ({...newUser, firstName: event.target.value })) } aria-label="First Name" />
				</label>
				
				<label>
					<span>Last Name</span>
					<input type="text" value={ newUser.lastName } onChange={ event => setNewUser(newUser => ({...newUser, lastName: event.target.value })) } aria-label="Last Name" />
				</label>
				
				<label>
					<span>Email</span>
					<input type="email" value={ newUser.email } onChange={ event => setNewUser(newUser => ({...newUser, email: event.target.value })) } aria-label="Email" />
				</label>

				</>

				: ""
				}
				
				<div className="row">
					<div className="error">{ errorMessage }</div>

					<button disabled={ saveItem === request.id } onClick={ () => saveRequest(request) } aria-label="Save">
						{
						saveItem === request.id ?
							loading[loadingIndex]
						: 
							"Save"
						}
					</button>

					<button disabled={ saveItem === request.id } onClick={ () => deleteRequest(request.id) } aria-label="Delete">Delete</button>
					<button disabled={ saveItem === request.id } onClick={ () => setEditItem(null) } aria-label="Cancel">Cancel</button>
				</div>

				</>

				: ""
				}
			</div>

			)}

		</div>

	</div>
</div>
	)
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<RequestsComponent />);
export default RequestsComponent;
