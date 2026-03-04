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

	const [ duals, setDuals ] = useState([]);
	const [ wrestlers, setWrestlers ] = useState([]);
	const [ dualId, setDualId ] = useState(null);
	const [ opponent, setOpponent ] = useState("");
	const [ dualDate, setDualDate ] = useState("");
	const [ imagePath, setImagePath ] = useState(null);
	
	const [ zoom, setZoom ] = useState(0);
	const [panelWidth, setPanelWidth] = useState(0);
	
	const fileInputRef = createRef();
	const panelRef = createRef();

	useEffect(() => {
		const currentPanelRef = panelRef.current;
		if (currentPanelRef) {
			const resizeObserver = new ResizeObserver(entries => {
				for (let entry of entries) {
					setPanelWidth(entry.contentRect.width);
				}
			});
			resizeObserver.observe(currentPanelRef);
			return () => resizeObserver.disconnect();
		}
	}, [imagePath]);
	
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
					setDuals(data.duals.map(dual => ({ ...dual, dualDate: new Date(dual.dualDate) })));
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const handleZoomChange = (event) => {
		setZoom(parseInt(event.target.value, 10));
	};

	const handleFileChange = (event) => {
		setSelectedFile(event.target.files[0]);
		setDualId(null);
		setDualDate("");
		setOpponent("");
		setWrestlers([]);
		setImagePath(null);
	};

	const pollJobStatus = (jobId) => {
		const interval = setInterval(() => {
			fetch(`/api/dualstatsupload/${jobId}`)
				.then(response => response.json())
				.then(data => {

					if (data.status === "completed") {
						setOpponent(data.stats.opponent);
						setWrestlers(data.stats.wrestlers);
						setImagePath(`/media/temp/${data.fileName}`);

						clearInterval(interval);
						setIsUploading(false);
						setSelectedFile(null);
					}
					else if (data.status === "error") {
						clearInterval(interval);
						setIsUploading(false);
						console.error("File upload error", data.error);
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

	const handleWrestlerChange = (index, field, value) => {
		const updatedWrestlers = [...wrestlers];
		updatedWrestlers[index][field] = value;
		setWrestlers(updatedWrestlers);
	};

	const handleSave = () => {
		const dualData = {
			id: dualId,
			opponent,
			imagePath: imagePath ? imagePath.replace("/media/temp/", "") : null,
			dualDate,
			wrestlers,
		};

		fetch("/api/dualstatssave", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ dual: dualData }),
		})
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				console.error("Save error", data.error);
			}
			else {
				setDuals(data.duals.map(dual => ({ ...dual, dualDate: new Date(dual.dualDate) })));

				setDualId(null);
				setDualDate("");
				setOpponent("");
				setWrestlers([]);
				setSelectedFile(null);
				setImagePath(null);
			}
		})
		.catch(error => {
			console.error("Save error", error);
		});
	};

	const handleDelete = (id) => {
		fetch("/api/dualstatsdelete", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ id }),
		})
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				console.error("Delete error", data.error);
			}
			else {
				setDuals(data.duals.map(dual => ({ ...dual, dualDate: new Date(dual.dualDate) })));
			}
		})
		.catch(error => {
			console.error("Delete error", error);
		});
	};

	const loadDual = (dual) => {
		setDualId(dual.id);
		setOpponent(dual.opponent);
		setDualDate(dual.dualDate.toISOString().split("T")[0]);
		setWrestlers(dual.wrestlers);
		setImagePath(`/media/temp/${dual.imagePath}`);
		setSelectedFile(null);
		setZoom(0);
		setPanelWidth(0);
		fileInputRef.current.value = "";
		panelRef.current.scrollTop = 0;
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

			{duals.length > 0 && (
			<div className="panel">
				<h3>Existing Duals</h3>
				
				{duals.map((dual, index) => (
					<div key={index} className="dual-summary" onClick={() => { loadDual(dual); }}>
						<span className="dual-date">{dual.dualDate.toLocaleDateString()}</span>
						<span className="dual-opponent">{dual.opponent}</span>
						<button onClick={() => handleDelete(dual.id)}>
							{/* Trash */}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
								<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
							</svg>
						</button>
					</div>
				))}
			</div>
			)}

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
					<input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden-file-input" />
					
					<div className="uploadActions">
						<button type="submit" disabled={isUploading}>Upload</button>
					</div>
				</form>
				}
			</div>

			{imagePath && (
			<div className="panel" ref={panelRef} style={{ height: panelWidth ? `${panelWidth}px` : 'auto' }}>
				<h3>Stat Sheet Image</h3>
				<div className="image-scroll-container">
					<img
						src={imagePath}
						className="stat-sheet-image"
						style={{
							width: `${100 + zoom}%`,
						}}
						alt="Stat Sheet"
					/>
				</div>
				<div className="zoom-slider">
					<input
						type="range"
						min="0"
						max="200"
						value={zoom}
						onChange={handleZoomChange}
						className="zoom-slider-input"
					/>
				</div>
			</div>
			)}

			{wrestlers.length > 0 &&
			<div className="panel">
				<h3>Dual Meet Stats</h3>

				<div className="form-group">
					<label>Dual Date</label>
					<input
						type="date"
						value={dualDate}
						onChange={e => setDualDate(e.target.value)}
					/>
				</div>

				<div className="form-group">
					<label>Opponent</label>
					<input
						type="text"
						value={opponent}
						onChange={e => setOpponent(e.target.value)}
					/>
				</div>

				<table className="wrestler-stats-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Weight</th>
							<th>Score</th>
							<th>T</th>
							<th>E</th>
							<th>R</th>
							<th>N</th>
						</tr>
					</thead>
					<tbody>
						{wrestlers.map((wrestler, index) => (
							<tr key={index}>
								<td>
									<input
										type="text"
										value={wrestler.name}
										onChange={e => handleWrestlerChange(index, "name", e.target.value)}
									/>
								</td>
								<td>
									<input
										type="text"
										value={wrestler.weight}
										onChange={e => handleWrestlerChange(index, "weight", e.target.value)}
									/>
								</td>
								<td>
									<input
										type="text"
										value={wrestler.results}
										onChange={e => handleWrestlerChange(index, "results", e.target.value)}
									/>
								</td>
								<td>
									<input
										type="number"
										value={wrestler.scores.takedowns}
										onChange={e => handleWrestlerChange(index, "scores.takedowns", parseInt(e.target.value))}
									/>
								</td>
								<td>
									<input
										type="number"
										value={wrestler.scores.escapes}
										onChange={e => handleWrestlerChange(index, "scores.escapes", parseInt(e.target.value))}
									/>
								</td>
								<td>
									<input
										type="number"
										value={wrestler.scores.reversals}
										onChange={e => handleWrestlerChange(index, "scores.reversals", parseInt(e.target.value))}
									/>
								</td>
								<td>
									<input
										type="number"
										value={wrestler.scores.nearfalls}
										onChange={e => handleWrestlerChange(index, "scores.nearfalls", parseInt(e.target.value))}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className="form-actions">
					<button onClick={handleSave}>Save</button>
				</div>
			</div>
			}

		</div>

		}

	</div>

</div>

	);

};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<DualStats />);
export default DualStats;
