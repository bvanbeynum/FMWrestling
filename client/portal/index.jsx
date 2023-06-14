import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const Index = () => {

	return (

<div className="page">

	<Nav />

	<div>
		<header>
			<h1>Welcome</h1>
		</header>
	</div>
</div>

	);
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Index />);
export default Index;
