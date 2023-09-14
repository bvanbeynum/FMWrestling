import React, { useEffect, useState } from "react";
import "./include/index.css";
import "./include/nav.css";

const Nav = props => {

	const [ subExpanded, setSubExpanded ] = useState(null);
	const [ isMenuOpen, setIsMenuOpen ] = useState(false);
	const [ privileges, setPrivileges ] = useState([]);
	
	useEffect(() => {
		if (/(users|roles|request)/i.test(window.location)) {
			setSubExpanded("user");
		}
	}, []);

	useEffect(() => {
		if (props.loggedInUser && props.loggedInUser.privileges) {
			setPrivileges(props.loggedInUser.privileges);
		}
	}, [ props.loggedInUser ])

	return (

<div>
	<div className="menuIconToggle button" onClick={ () => { setIsMenuOpen(!isMenuOpen) }}>
		{/* Hamburger menu */}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
			<path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
		</svg>
	</div>

	<nav className={ isMenuOpen ? "active" : "" }>
		<div className="actions">
			<div className="closeMenu button" onClick={ () => { setSubExpanded(null); setIsMenuOpen(false); }}>
				{/* Close */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
				</svg>
			</div>
		</div>

		<div className="fixedScroll">
			{
			props.loggedInUser ?
			<h2>Welcome { props.loggedInUser.firstName } { props.loggedInUser.lastName }</h2>
			: ""
			}

			<ul>
			<li role="button" className="button" onClick={ () => window.location = "/portal/"} aria-label="Home">
				{/* Home */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"/>
				</svg>

				<span>Home</span>
			</li>
			
			{
			privileges.includes("scheduleView") ?
			<li role="button" className="button" onClick={ () => window.location = "/portal/schedule.html" }>
				{/* Post */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z"/>
				</svg>

				<span>Schedule</span>
			</li>
			: ""
			}
			
			{
			privileges.includes("teamManage") ?
			<li role="button" className="button" onClick={ () => window.location = "/portal/teams.html"} aria-label="Team Management">
				{/* Group */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z"/></svg>
				<span>Teams</span>
			</li>
			: ""
			}
			
			{
			privileges.includes("poster") ?
			<li role="button" className="button" onClick={ () => window.location = "/portal/posts.html" } aria-label="Posts">
				{/* Post */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h360v80H200v560h560v-360h80v360q0 33-23.5 56.5T760-120H200Zm120-160v-80h320v80H320Zm0-120v-80h320v80H320Zm0-120v-80h320v80H320Zm360-80v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"/>
				</svg>

				<span>Posts</span>
			</li>
			: ""
			}

			{
			privileges.includes("userAdmin") ?

			<>
			<li role="button" className="button" onClick={ () => setSubExpanded(subExpanded => subExpanded === "user" ? null : "user") } aria-label="User Management">
				{/* User settings */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M400-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm560 40-12-60q-12-5-22.5-10.5T584-204l-58 18-40-68 46-40q-2-14-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T628-460l12-60h80l12 60q12 5 22.5 11t21.5 15l58-20 40 70-46 40q2 12 2 25t-2 25l46 40-40 68-58-18q-11 8-21.5 13.5T732-180l-12 60h-80Zm40-120q33 0 56.5-23.5T760-320q0-33-23.5-56.5T680-400q-33 0-56.5 23.5T600-320q0 33 23.5 56.5T680-240ZM400-560q33 0 56.5-23.5T480-640q0-33-23.5-56.5T400-720q-33 0-56.5 23.5T320-640q0 33 23.5 56.5T400-560Zm0-80Zm12 400Z"/>
				</svg>

				<span>User Management</span>
			</li>

			<li role="button" onClick={ () => window.location = "/portal/requests.html" } className={`button sub ${ subExpanded === "user" ? "active" : "" }`}>
				<span>Requests</span>
			</li>

			<li role="button" onClick={ () => window.location = "/portal/users.html" } className={`button sub ${ subExpanded === "user" ? "active" : "" }`}>
				<span>Users</span>
			</li>

			<li role="button" onClick={ () => window.location = "/portal/roles.html" } className={`button sub ${ subExpanded === "user" ? "active" : "" }`}>
				<span>Roles</span>
			</li>
			</>

			: ""
			}

			</ul>
		</div>
	</nav>
</div>

		)
	};
	
export default Nav;
