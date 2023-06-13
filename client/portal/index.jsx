import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import Posts from "./posts.jsx";
import Schedule from "./schedule.jsx";
import RolesComponent from "./roles.jsx";
import RequestsComponent from "./requests.jsx";
import "./include/index.css";

const Index = () => {

	const [ page, setPage ] = useState("home");

	const navigate = newPage => {
		setPage(newPage);
	}
	
	return (

<div className="page">

	<Nav navigate={ navigate } />
		<header>
			<h1>{ page === "home" ? "Welcome" : page.substring(0,1).toUpperCase() + page.substring(1) }</h1>
		</header>

		{
		page === "posts" ?
		<Posts />

		: page === "schedule" ?
		<Schedule />

		: page === "roles" ?
		<RolesComponent />

		: page === "requests" ?
		<RequestsComponent />

		: ""
		}
</div>

	);
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Index />);
export default Index;
