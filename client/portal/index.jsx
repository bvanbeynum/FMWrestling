import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const Index = () => {

	const [ page, setPage ] = useState("home");
	const [ isMenuOpen, setIsMenuOpen ] = useState(false);

	const navigate = newPage => {
		setPage(newPage);
		setIsMenuOpen(false);
	}
	
	return (

<div className="page">
	<Nav navigate={ navigate } closeMenu={ () => setIsMenuOpen(false) } isMenuOpen={ isMenuOpen } />

	<div className="content">
		<header>
			<div className="menuIconToggle button" onClick={ () => { setIsMenuOpen(!isMenuOpen) }}>
				{/* Hamburger menu */}
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
				</svg>
			</div>
			
			<h1>{ page === "home" ? "Welcome" : page }</h1>
		</header>
	</div>
</div>

	);
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Index />);
export default Index;
