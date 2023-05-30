import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import Roster from "./roster";
import Schedule from "./schedule";
import "./include/index.css";

const Index = () => {

	const [ posts, setPosts ] = useState();
	const [ images, setImages ] = useState(["/media/instagram/2023-02-07_23-42-13_UTC.jpg", "/media/instagram/2023-02-23_23-29-48_UTC.jpg"]);
	const [ imageInterval, setImageInterval ] = useState();
	const [ imageIndex, setImageIndex ] = useState(0);

	useEffect(() => {
		if (!posts) {
			fetch(`/api/indexload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setPosts(data.posts);
					setImages(data.images);

					setImageInterval(setInterval(() => setImageIndex(imageIndex => imageIndex + 1 === images.length ? 0 : imageIndex + 1), 3000));
				})
				.catch(error => {
					console.warn(error);
				});
		}

		return () => clearInterval(imageInterval);
	}, []);

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
				{ posts && posts.length > 0 ? posts[0].post : "" }
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
			{
			images && images.length > 0 && <img src={ images[imageIndex] } />
			}
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
