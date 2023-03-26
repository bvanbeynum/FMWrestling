import React from "react";

const Navigation = (props) => {
	return (

<div className="navigation">
	<div className={ `button ${ props.page === "edit" ? "selected" : "" }`} onClick={ () => { props.navigate("edit") }}>Edit</div>
	<div className={ `button ${ props.page === "stats" ? "selected" : "" }`} onClick={ () => { props.navigate("stats") }}>Stats</div>
</div>

		)
	};
	
export default Navigation;
