import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const Teams = props => {

	return (
		
<div className="page">
	<Nav />

	<div>
		<header><h1>Teams</h1></header>
	</div>
</div>
	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Teams />);
export default Teams;
