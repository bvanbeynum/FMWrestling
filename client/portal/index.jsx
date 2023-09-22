import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";

const Index = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	useEffect(() => {
		if(!pageActive) {

			fetch(`/api/homeload`)
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
					setPageActive(true);

				})
				.catch(error => {
					console.warn(error);
				});

		}
	}, [])

	return (

<div className="page">

	<Nav loggedInUser={ loggedInUser } />

	<div className={`container ${ pageActive ? "active" : "" }`}>
		<header>
			<h1>Welcome</h1>
		</header>
	</div>
</div>

	);
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Index />);
export default Index;
