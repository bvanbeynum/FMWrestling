import React, { useEffect, useState } from "react";
import "./include/index.css";

const Posts = (props) => {

	const emptyPost = { content: "", expires: "", scope: "Internal" },
		minExpire = new Date(),
		loading = [
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120Zm156-348q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Empty
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M324-168h312v-120q0-65-45.5-110.5T480-444q-65 0-110.5 45.5T324-288v120ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Top
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg>, // Full
			<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-516q65 0 110.5-45.5T636-672v-120H324v120q0 65 45.5 110.5T480-516ZM192-96v-72h60v-120q0-59 28-109.5t78-82.5q-49-32-77.5-82.5T252-672v-120h-60v-72h576v72h-60v120q0 59-28.5 109.5T602-480q50 32 78 82.5T708-288v120h60v72H192Z"/></svg> // Bottom
		];
	
	minExpire.setDate(minExpire.getDate() + 1);

	const [ pageActive, setPageActive ] = useState(false);
	const [ savingId, setSavingId ] = useState(null);
	const [ loadingIndex, setLoadingIndex ] = useState(0);
	const [ newPost, setNewPost ] = useState(emptyPost);
	const [ posts, setPosts ] = useState([]);
	const [ errorMessage, setErrorMessage ] = useState("");
	const [ scopes, setScopes ] = useState([]);

	useEffect(() => {
		if (!pageActive) {
			setPageActive(true);
			
			fetch(`/api/postload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setPosts(
						data.posts.map(post => ({
							...post, 
							created: new Date(post.created), 
							expires: post.expires ? new Date(post.expires) : ""
						}))
					);

					setScopes(["Internal", "Public", "All"]);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const savePost = post => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);

		setSavingId(post.id || "new");

		fetch("/api/postsave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ save: post }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				if (!post.id) {
					setPosts(posts => posts.concat({
						...data.post, 
						created: new Date(data.post.created), 
						expires: data.post.expires ? new Date(data.post.expires) : "" 
					}));
					setNewPost(emptyPost);
				}

				setSavingId(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error saving the post");
				setSavingId(null);
				clearInterval(loadingInterval);
			});
	};

	const deletePost = postId => {
		const loadingInterval = setInterval(() => setLoadingIndex(loadingIndex => loadingIndex + 1 === loading.length ? 0 : loadingIndex + 1), 1000);

		setSavingId(postId);

		fetch("/api/postsave", { method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delete: postId }) })
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(() => {
				setPosts(posts => posts.filter(post => post.id !== postId));
				setSavingId(null);
				clearInterval(loadingInterval);
			})
			.catch(error => {
				console.warn(error);
				setErrorMessage("There was an error deleting the post");
				setSavingId(null);
				clearInterval(loadingInterval);
			});
	};

	const editPost = (postId, property, value) => {
		setPosts(posts => posts.map(post => ({
			...post.id === postId ? {
				...post,
				[property]: value
			}: post
		})))
	};
	
	return (

<div className={`container ${ pageActive ? "active" : "" }`}>
	
	<div key={ "newPost" } className="panel">
		<h3>New Post</h3>

		<label>
			<textarea placeholder="Enter content" value={ newPost.content } onChange={ event => setNewPost(newPost => ({ ...newPost, content: event.target.value })) } />
		</label>

		<label>
			<span>Scope</span>
			<select name="scope" value={ newPost.scope || "Internal" } onChange={ event => setNewPost(newPost => ({...newPost, scope: event.target.value })) }>
				{
				scopes.map(scope => <option key={ scope } value={ scope }>{ scope }</option>)
				}
			</select>
		</label>

		<label>
			<span>Expires</span>
			<input type="date" min={ minExpire.toLocaleDateString("fr-ca") } value={ newPost.expires } onChange={ event => setNewPost(newPost => ({ ...newPost, expires: event.target.value })) } />
		</label>

		<div className="row">
			<div className="error">{ errorMessage }</div>
			<button onClick={ () => savePost({...newPost, expires: newPost.expires ? newPost.expires : null }) } disabled={ savingId == "new" }>
				{
				savingId === "new" ?
					loading[loadingIndex]
				: 
					"Add"
				}
			</button>
		</div>
	</div>

	{
	posts
	.sort((postA, postB) => postB.created - postA.created)
	.map(post => (
		
	<div key={ post.id } data-testid={ post.id } className="panel">
		<h3>Posted { post.created.toLocaleDateString() + " " + post.created.toLocaleTimeString() }</h3>

		<label>
			<textarea placeholder="Enter content" value={ post.content || "" } onChange={ event => editPost(post.id, "content", event.target.value) } />
		</label>

		<label>
			<span>Scope</span>
			<select name="scope" value={ post.scope } onChange={ event => editPost(post.id, "scope", event.target.value) }>
				{
				scopes.map(scope => <option key={ scope } value={ scope }>{ scope }</option>)
				}
			</select>
		</label>

		<label>
			<span>Expires</span>
			<input type="date" min={ minExpire.toLocaleDateString("fr-ca") } value={ post.expires ? post.expires.toLocaleDateString("fr-ca") : "" } onChange={ event => editPost(post.id, "expires", event.target.value) } />
		</label>

		<div className="row">
			<div className="error">{ errorMessage }</div>
			<button onClick={ () => savePost(post) } disabled={ savingId === post.id }>
				{
				savingId === post.id ?
					loading[loadingIndex]
				: 
					"Save"
				}
			</button>
			
			<button onClick={ () => deletePost(post.id) } disabled={ savingId === post.id }>Delete</button>
		</div>
	</div>
	))
	}
	
</div>

		)
	};
	
export default Posts;
