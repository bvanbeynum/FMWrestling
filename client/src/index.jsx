import React, { Component } from "react";
import ReactDOM from "react-dom/client";
import Schedule from "./schedule";
import Roster from "./roster";
import "./include/index.css";

class Index extends Component {

	constructor(props) {
		super(props);

		this.state = {
		};
	};

	render() { return (
	<div className="page">

		<div className="topBar"></div>

		<div className="row top">
			<div className="mainPic">
				<img className="sectionImage" src="/media/2.jpg" />
			</div>

			<div className="topContent">
				<h1>FORT MILL WRESTLING</h1>
				<h2>Building Champions for Life</h2>

				{/* <iframe 
					src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Ffortmillwrestling&tabs=timeline&width=340&height=350&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true&appId=750633496067048" 
					style={{ width: "340px", height: "350px" }}
					scrolling="no" 
					frameBorder="0" 
					allowFullScreen={ true }
					allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
				</iframe> */}
			</div>
		</div>

		<div className="announcements">
			<span>** 1/23/2023 : JV & MS State Championships • 9 JV Wrestlers, 3 MS Wreslters</span>
			<span>** 1/28/2023 : Vasity Regional Duals @ Fort Mill</span>
		</div>
		
		<div className="row sideBar">
			<div className="sponsor">
				<img src="/media/biehl.png" />
			</div>

			<div className="secondaryPic">
				<img className="sectionImage" src="/media/1.jpg" />
			</div>

			<div className="sponsorForm">
				<h2>Become a Sponsor</h2>

				<div className="formInput">
					<input type="text" placeholder="* Name" />
				</div>

				<div className="formInput">
					<input type="text" placeholder="Company" />
				</div>
				
				<div className="formInput">
					<input type="phone" placeholder="* Phone" />
				</div>
				
				<div className="formInput">
					<input type="email" placeholder="* Email" />
				</div>

				<div className="formInput">
					<div className="button">Submit</div>
				</div>
			</div>
		</div>

		<div className="row">
			<Schedule />
			<Roster />
		</div>

	</div>
	) };
}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Index />);
export default Index;
