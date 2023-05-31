import React, { useState } from "react";
import "./include/index.css";
import "./include/nav.css";

const Nav = (props) => {

	return (

<nav className={ props.isMenuOpen ? "active" : "" }>
	<header>
		<div className="menuIconToggle button" onClick={ () => props.closeMenu() }>
			{/* Close */}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
				<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
			</svg>
		</div>
	</header>

	<ul>
	<li>
		{/* Home */}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
			<path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"/>
		</svg>

		<span>Home</span>
	</li>
	
	<li onClick={ () => props.navigate("announcements") }>
		{/* Post */}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
			<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h360v80H200v560h560v-360h80v360q0 33-23.5 56.5T760-120H200Zm120-160v-80h320v80H320Zm0-120v-80h320v80H320Zm0-120v-80h320v80H320Zm360-80v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"/>
		</svg>

		<span>Announcements</span>
	</li>
	</ul>
</nav>


		)
	};
	
export default Nav;
