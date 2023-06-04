import React, { useState } from "react";
import "./include/index.css";
import "./include/nav.css";

const Nav = (props) => {

	const [ subExpanded, setSubExpanded ] = useState(null);

	return (

<nav className={ props.isMenuOpen ? "active" : "" }>
	<header>
		<div className="menuIconToggle button" onClick={ () => { setSubExpanded(null); props.closeMenu() }}>
			{/* Close */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
				<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
			</svg>
		</div>
	</header>

	<ul>
	<li onClick={ () => { setSubExpanded(null); props.navigate("home") }}>
		{/* Home */}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
			<path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"/>
		</svg>

		<span>Home</span>
	</li>
	
	<li onClick={ () => { setSubExpanded(null); props.navigate("posts") }}>
		{/* Post */}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
			<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h360v80H200v560h560v-360h80v360q0 33-23.5 56.5T760-120H200Zm120-160v-80h320v80H320Zm0-120v-80h320v80H320Zm0-120v-80h320v80H320Zm360-80v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"/>
		</svg>

		<span>Posts</span>
	</li>

	<li onClick={ () => setSubExpanded(subExpanded => subExpanded === "user" ? null : "user") }>
		{/* User settings */}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
			<path d="M400-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm560 40-12-60q-12-5-22.5-10.5T584-204l-58 18-40-68 46-40q-2-14-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T628-460l12-60h80l12 60q12 5 22.5 11t21.5 15l58-20 40 70-46 40q2 12 2 25t-2 25l46 40-40 68-58-18q-11 8-21.5 13.5T732-180l-12 60h-80Zm40-120q33 0 56.5-23.5T760-320q0-33-23.5-56.5T680-400q-33 0-56.5 23.5T600-320q0 33 23.5 56.5T680-240ZM400-560q33 0 56.5-23.5T480-640q0-33-23.5-56.5T400-720q-33 0-56.5 23.5T320-640q0 33 23.5 56.5T400-560Zm0-80Zm12 400Z"/>
		</svg>

		<span>User Management</span>
	</li>

	<li className={`sub ${ subExpanded === "user" ? "active" : "" }`}>
		<span>Users</span>
	</li>

	<li onClick={ () => props.navigate("roles") } className={`sub ${ subExpanded === "user" ? "active" : "" }`}>
		<span>Roles</span>
	</li>

	<li className={`sub ${ subExpanded === "user" ? "active" : "" }`}>
		<span>Requests</span>
	</li>

	</ul>
</nav>


		)
	};
	
export default Nav;
