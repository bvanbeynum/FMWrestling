import React, { useEffect, useState, createRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/dualstats.css";

const DualStats = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ isUploading, setIsUploading ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ selectedFile, setSelectedFile ] = useState(null);
	const [ uploadResult, setUploadResult ] = useState(null);
	const fileInputRef = createRef();

	useEffect(() => {
		if (!pageActive) {
			fetch("/api/dualstatsload")
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
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const handleFileChange = (event) => {
		setSelectedFile(event.target.files[0]);
		setUploadResult(null);
	};

	const pollJobStatus = (jobId) => {
		const interval = setInterval(() => {
			fetch(`/api/dualstatsupload/${jobId}`)
				.then(response => response.json())
				.then(job => {
					if (job.status === "completed") {
						clearInterval(interval);
						setIsUploading(false);
						setUploadResult(job.data);
						setSelectedFile(null);
					} else if (job.status === "error") {
						clearInterval(interval);
						setIsUploading(false);
						console.error("File upload error", job.error);
					}
				})
				.catch(error => {
					clearInterval(interval);

					setIsUploading(false);
					console.error("Polling error", error);
				});
		}, 2000);
	};

	const handleFileUpload = (event) => {
		event.preventDefault();
		
		if (!selectedFile) {
			return;
		}

		setIsUploading(true);
		setUploadResult(null);

		const formData = new FormData();
		formData.append("file", selectedFile);

		fetch("/api/dualstatsupload", {
				method: "POST",
				body: formData,
			})
			.then((response) => response.json())
			.then((data) => {
				if (data.jobId) {
					pollJobStatus(data.jobId);
				}
			})
			.catch((error) => {
				setIsUploading(false);
				console.error("File upload error", error);
			});
	};

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		
		{
		isLoading ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: !loggedInUser ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>Dual Stats</h1>
			</header>

			<div className="panel">
				<h3>Upload Stat Sheet</h3>

				{
				isUploading ?
				<div className="pageLoading">
					<img src="/media/wrestlingloading.gif" alt="Loading" />
				</div>
				:
				<form onSubmit={handleFileUpload}>
					<div className="fake-input" onClick={() => fileInputRef.current.click()}>
						{selectedFile ? selectedFile.name : "Select stat sheet file..."}
					</div>
					<input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display: "none" }} />
					
					<div className="uploadActions">
						<button type="submit" disabled={isUploading}>Upload</button>
					</div>
				</form>
				}
			</div>

		</div>

		}

	</div>

</div>

	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<DualStats />);
export default DualStats;
