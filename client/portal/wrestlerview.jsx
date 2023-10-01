import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const WrestlerView = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	const [ wrestlerId, setWrestlerId ] = useState(null);
	
	useEffect(() => {
		if (!pageActive) {
			const url = new window.URLSearchParams(window.location.search);
			setWrestlerId(url.get("id"));
		}
	}, []);

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
		}
	}, [ wrestlerId ])

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		
		{
		!pageActive ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>
		: 
		
		<div className={`container ${ pageActive ? "active" : "" }`}>
						
			<header>
				<h1>Luke van Beynum</h1>
			</header>

			<div className="panel centered">
				<h3>SC Mat</h3>

				<svg viewBox={`0 0 350 200`} className="lineChart">
					<g className="chartArea"></g>
					<g className="bottomAxis"></g>
				</svg>
			</div>

			<div className="panel">
				<div className="subHeader">9/22/2023</div>
				<h3>Pins in the Park</h3>

				<table className="sectionTable">
				<thead>
				<tr>
					<th>Round</th>
					<th>Opponent</th>
					<th colSpan="2" className="dataColumn">Result</th>
				</tr>
				</thead>
				<tbody>
				<tr>
					<td>Round of 32</td>
					<td>Bill Smitt</td>
					<td className="dataColumn">W</td>
					<td className="dataColumn">F</td>
				</tr>
				</tbody>
				</table>
			</div>

		</div>

		}

	</div>
</div>
	)
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<WrestlerView />);
export default WrestlerView;
