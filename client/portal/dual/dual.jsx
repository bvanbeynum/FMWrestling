import React, { Component } from "react";
import ReactDOM from "react-dom/client";
import Navigation from "./navigation.jsx";
import Edit from "./edit.jsx";
import Stats from "./stats.jsx";
import "./dual.css";

class Dual extends Component {
	
	constructor(props) {
		super(props);

		this.state = {
			page: "edit",
			weightClasses: []
		};
	};

	selectPage = page => {
		this.setState({ page: page });
	};

	addWeightClass = () => {
		this.setState(({ weightClasses }) => ({ weightClasses: weightClasses.concat({}) }));
	};

	render() { return (

<div className="page">
	{
	this.state.page === "stats" ?
		<Stats />
	: 
		<Edit weightClasses={ this.state.weightClasses } addWeightClass={ this.addWeightClass } />
	}
	
	<Navigation page={ this.state.page } navigate={ this.selectPage } />
</div>

	)};
}

ReactDOM.createRoot(document.getElementById("root")).render(<Dual />);
