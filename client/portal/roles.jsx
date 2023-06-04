import React, { useEffect, useState } from "react";
import "./include/index.css";

const Roles = (props) => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ newRole, setNewRole ] = useState("");
	const [ saving, setSaving ] = useState([]);
	const [ errors, setErrors ] = useState([]);

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
		}
	}, []);

	return (

<div className={`container ${ pageActive ? "active" : "" }`}>
	<div key={ "newPost" } className="panel">
		<h3>New Role</h3>

		<label>
			<span>Name</span>
			<input type="text" value={ newRole.name } onChange={ event => setNewRole(event.target.value) } />
		</label>

		<div className="row">
			<div className="error">{ errors.find(error => error.id === "new") }</div>
			<button disabled={ saving.includes("new") }>
				{
				saving.includes("new") ?
					loading[loadingIndex]
				: 
					"Add"
				}
			</button>
		</div>
	</div>

</div>

	)
};

export default Roles;
