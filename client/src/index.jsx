import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import Roster from "./roster";
import Schedule from "./schedule";
import "./include/index.css";

const Index = () => {

	const posts = [
		{ date: new Date(2021,2,8), post: "Reminder... Varsity and JV yearbook  pictures will be done Wednesday morning, March 10th at 8:15. Wrestlers should bring ALL gear to be turned in." },
		{ date: new Date(2021,0,19), post: "Clover update fir JV for Saturday: JV wrestlers will meet at 7:00am on Saturday morning to go to the Area Tournament at Clover High School.  Spectators are not allowed to this event.  Not all wrestlers will be competing.  They are currently only allowing 1 wrestler per weight class per school.  Wrestlers will be informed at practice if they are expected to attend.  They will need to make weight for the weight class that they are competing in. Thank you." },
		{ date: new Date(2020,8,30), post: "Coach Doran sent out an email today - WRESTLING….. Pre-Season workouts will begin on Tuesday, October 6th. Practices will be on Tuesdays and Thursdays and will run from 4:00-5:00. Anyone interested in or planning on JV or varsity wrestling this year should plan to attend. If you did not get the email, please text me - 803-984-3457 - Stacey McLean Kelley" }
	];

	return (

<div className="page">
	<div></div>

	<div className="column">
		<div className="logo box blue">
			<img src="/media/logo.png" alt="Fort Mill Wrestling" />
		</div>
		
		<div className="topContent box">
			<h1>FORT MILL WRESTLING</h1>
			<h2>Building Champions for Life</h2>

			<p>
				Reminder... Varsity and JV yearbook  pictures will be done Wednesday morning, March 10th at 8:15. Wrestlers should bring ALL gear to be turned in.
			</p>
		</div>
	
		<Roster />
		
		<div className="box blue">
			<h2>Varsity</h2>
			<p>
				The varsity wrestling program is one of the top wrestling programs in the state, with a
				long tradition of excellence that is established as a dominant force in high school wrestling.
				Our varsity athletes not only compete to win championships but also to honor those who have
				come before them and to inspire those who will follow in their footsteps. They embody the
				spirit of our school and community, representing us with integrity, passion, and a fierce
				determination to succeed.
			</p>
			<p>
				Our varsity wrestlers have the opportunity to catch the attention of college recruiters and
				earn scholarships based on their exceptional performance. We have a track record of our
				athletes continuing their wrestling careers at the collegiate level, showcasing the caliber
				of talent and dedication that our program nurtures.
			</p>
		</div>
		
		<div className="box">
			<h2>Recreation</h2>
			<p>
				Our recreation wrestling program is specifically designed for young athletes in 6th grade
				and younger, providing a safe and welcoming introduction to the exciting world of wrestling.
				Our experienced coaches work closely with each wrestler, focusing on fundamental techniques,
				coordination, and agility, through engaging and age-appropriate drills and exercises. Wrestlers
				have the opportunity to train and interact with their peers, fostering friendships and building
				a sense of community within our program. While there may be friendly matches and demonstrations,
				the emphasis remains on skill development and having fun rather than intense competition.
			</p>
		</div>
	</div>

	<div className="column">
		<div className="sponsor box yellow">
			<img src="/media/sponsor/biehl.png" />
		</div>

		<div className="instagram box">
			<img src="/media/instagram/2023-02-07_23-42-13_UTC.jpg" />
		</div>

		<Schedule />

		<div className="box">
			<h2>JV</h2>
			<p>
				Our junior varsity program serves to provide athletes with a platform to further develop their
				wrestling skills and gain valuable experience in preparation for potential varsity participation.
				Athletes on the junior varsity team receive comprehensive coaching, targeted training, and
				opportunities to compete against other schools in their division. This program allows wrestlers
				to refine their technique, enhance their physical conditioning, and gain the confidence needed
				to progress as a wrestler.
			</p>
		</div>
		
		<div className="box yellow">
			<h2>Middle</h2>
			<p>
				Our middle school wrestling program is the perfect starting point for aspiring wrestlers. It
				aims to introduce young athletes to the fundamentals of wrestling, while fostering a love for
				the sport and promoting good sportsmanship. Middle school wrestlers receive expert coaching,
				participate in regular practices, and compete in matches against other middle school teams in
				the area. This program emphasizes skill development, teamwork, discipline, and character building.
				It serves as a stepping stone for wrestlers who aspire to join the high school programs in
				the future.
			</p>
		</div>
	</div>

	<div></div>

	<div className="footer">
		<div>
			<img src="/media/facebook.png" alt="Facebook" />
			<img src="/media/instagram.png" alt="Instagram" />
			<img src="/media/twitter.png" alt="Twitter" />
		</div>

		<div>Privacy Policy</div>
	</div>
</div>

	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Index />);
export default Index;
