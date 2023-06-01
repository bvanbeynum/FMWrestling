import React, { useEffect, useState } from "react";
import "./include/index.css";
import "./include/announcements.css";

const Announcements = (props) => {

	const emptyPost = { content: "", expires: "" },
		minExpire = new Date();
	
	minExpire.setDate(minExpire.getDate() + 1);

	const [ pageActive, setPageActive ] = useState(false);
	const [ newPost, setNewPost ] = useState(emptyPost);
	const [ errorMessage, setErrorMessage ] = useState("");
	const [ isSaving, setIsSaving ] = useState(false);

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
		}
	}, []);

	const savePost = post => {
		setIsSaving(true);

		fetch("/api/announcementsave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify(post) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {
				setNewPost(emptyPost);
				setIsSaving(false);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error saving the post");
			});
	};
	
	return (

<div className={`container ${ pageActive ? "active" : "" }`}>
	
	<div className="panel">
		<h3>New Post</h3>

		<label>
			<textarea placeholder="Enter content" value={ newPost.content } onChange={ event => setNewPost(newPost => ({ ...newPost, content: event.target.value })) } />
		</label>

		<label>
			<span>Expires</span>
			<input type="date" min={ minExpire.toLocaleDateString("fr-ca") } value={ newPost.expires } onChange={ event => setNewPost(newPost => ({ ...newPost, expires: event.target.value })) } />
		</label>

		<div className="row">
			<div className="error">{ errorMessage }</div>
			<button onClick={ () => savePost(newPost) }>Add Post</button>
		</div>
	</div>
	
</div>

		)
	};
	
export default Announcements;
