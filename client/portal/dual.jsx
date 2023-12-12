import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import NavComponent from "./nav.jsx";
import "./include/index.css";

const DualComponent = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ pageView, setPageView ] = useState("overview");
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	useEffect(() => {
		if (!pageActive) {
		}
	}, []);

	return (
<div className="page">
	<NavComponent loggedInUser={ loggedInUser } />

	<div>
		
		{
		!pageActive ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: !loggedInUser || !loggedInUser.privileges || !loggedInUser.privileges.includes("scheduleManage") ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:
		<>

		</>
		}

	</div>
</div>
	);
		
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<DualComponent />);
export default DualComponent;
