import React, { useEffect, useState, createRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/dual.css";

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"];

const TIME_OPTIONS = [];
for (let h = 7; h <= 21; h++) {
	for (let m of ["00", "30"]) {
		if (h === 21 && m === "30") break;
		const hh = String(h).padStart(2, '0');
		const value = `${hh}:${m}`;
		const period = h >= 12 ? 'PM' : 'AM';
		const displayHour = h % 12 === 0 ? 12 : h % 12;
		const label = `${displayHour}:${m} ${period}`;
		TIME_OPTIONS.push({ value, label });
	}
}

const formatTimeDisplay = (timeStr) => {
	if (!timeStr) return "N/A";
	const match = TIME_OPTIONS.find(t => t.value === timeStr);
	if (match) return match.label;
	const parts = timeStr.split(":");
	if (parts.length < 2) return timeStr;
	let h = parseInt(parts[0], 10);
	const m = parts[1];
	const period = h >= 12 ? "PM" : "AM";
	h = h % 12 === 0 ? 12 : h % 12;
	return `${h}:${m} ${period}`;
};

const Dual = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ isUploading, setIsUploading ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	// Setup / Filtering State
	const [ schools, setSchools ] = useState([]);
	const [ opponentSelectGroup, setOpponentSelectGroup ] = useState([]);
	const [ selectedOpponentId, setSelectedOpponentId ] = useState("");
	const [ opponent, setOpponent ] = useState("");
	const [ dualDate, setDualDate ] = useState("");
	const [ dualTime, setDualTime ] = useState("");

	// Workflow state flag: true when scoresheet is active
	const [ isStarted, setIsStarted ] = useState(false);

	// Data & Upload State
	const [ duals, setDuals ] = useState([]);
	const [ dualId, setDualId ] = useState(null);
	const [ wrestlers, setWrestlers ] = useState([]);
	const [ imagePath, setImagePath ] = useState(null);
	const [ selectedFile, setSelectedFile ] = useState(null);

	// UI Controls State
	const [ showScorecardImage, setShowScorecardImage ] = useState(false);

	// Granular Upload Progress State
	const [ uploadProgress, setUploadProgress ] = useState({
		currentStage: "RECEIVING_FILE",
		stageMessage: "Uploading scoresheet file...",
		completedStages: [],
		geminiStep: 0,
		totalGeminiSteps: 3
	});

	const fileInputRef = createRef();

	useEffect(() => {
		if (!pageActive) {
			Promise.all([
				fetch("/api/dualstatsload").then(res => res.ok ? res.json() : Promise.reject(res.statusText)),
				fetch("/api/opponenteventload").then(res => res.ok ? res.json() : Promise.reject(res.statusText))
			])
			.then(([dualData, schoolData]) => {
				const loadedDuals = (dualData.duals || []).map(dual => ({
					...dual,
					dualDateObj: new Date(dual.dualDate)
				}));
				setDuals(loadedDuals);
				setLoggedInUser(dualData.loggedInUser);

				// Process schools dropdown grouped by classification and region
				const schoolList = schoolData.schools || [];
				setSchools(schoolList);
				const groups = [...new Set(schoolList.sort((a, b) => 
					a.classification !== b.classification ? (a.classification > b.classification ? -1 : 1)
					: a.region !== b.region ? (a.region > b.region ? 1 : -1)
					: a.name > b.name ? 1 : -1
				).map(s => `${s.classification || "NA"} - ${s.region || "NA"}`))]
				.map(groupName => ({
					name: groupName,
					schools: schoolList.filter(s => `${s.classification || "NA"} - ${s.region || "NA"}` === groupName)
				}));
				setOpponentSelectGroup(groups);

				// Check URL query parameters for ?id=
				const urlParams = new URLSearchParams(window.location.search);
				const targetId = urlParams.get("id");
				if (targetId) {
					const matched = loadedDuals.find(d => d.id === targetId || d._id === targetId);
					if (matched) {
						loadDualData(matched, schoolList);
					}
				}

				setPageActive(true);
				setIsLoading(false);
			})
			.catch(error => {
				console.warn("Initialization error:", error);
				setIsLoading(false);
			});
		}
	}, []);

	const loadDualData = (dual, schoolList = schools) => {
		setDualId(dual.id || dual._id);
		const oppName = dual.opponent || "";
		setOpponent(oppName);
		
		const matchedSchool = schoolList.find(s => s.name === oppName);
		if (matchedSchool) {
			setSelectedOpponentId(String(matchedSchool.id || matchedSchool._id));
		}
		
		const extractTime = (dObj) => {
			const m = dObj.getMinutes();
			const roundedMins = m < 15 ? '00' : (m < 45 ? '30' : '00');
			let h = dObj.getHours();
			if (m >= 45) h = (h + 1) % 24;
			return `${String(h).padStart(2, '0')}:${roundedMins}`;
		};

		if (dual.dualDateObj && !isNaN(dual.dualDateObj.getTime())) {
			setDualDate(dual.dualDateObj.toISOString().split("T")[0]);
			setDualTime(extractTime(dual.dualDateObj));
		} else if (dual.dualDate) {
			const d = new Date(dual.dualDate);
			setDualDate(d.toISOString().split("T")[0]);
			setDualTime(extractTime(d));
		}

		setWrestlers(dual.wrestlers || []);
		setImagePath(dual.imagePath ? `/media/temp/${dual.imagePath}` : null);
		setShowScorecardImage(false);
		setIsStarted(true);
	};

	const handleOpponentSelectChange = (e) => {
		const schId = e.target.value;
		setSelectedOpponentId(schId);
		const found = schools.find(s => String(s.id) === String(schId) || String(s._id) === String(schId));
		if (found) {
			setOpponent(found.name);
		} else {
			setOpponent("");
		}
	};

	const handleStartScoresheet = (e) => {
		e.preventDefault();
		if (!opponent || !dualDate || !dualTime) {
			alert("Please select an Opponent, Dual Date, and Dual Time to proceed.");
			return;
		}

		// Populate initial 14 standard weight classes if empty
		if (wrestlers.length === 0) {
			const initialWrestlers = [];
			WEIGHT_CLASSES.forEach(wt => {
				initialWrestlers.push({
					name: "",
					weight: wt,
					results: 0,
					scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 }
				});
				initialWrestlers.push({
					name: "",
					weight: wt,
					results: 0,
					scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 }
				});
			});
			setWrestlers(initialWrestlers);
		}

		setIsStarted(true);
	};

	// File upload flow matching dualstats.jsx
	const pollJobStatus = (jobId) => {
		const interval = setInterval(() => {
			fetch(`/api/dualstatsupload/${jobId}`)
				.then(res => res.json())
				.then(data => {
					if (data.status === "processing") {
						setUploadProgress({
							currentStage: data.currentStage || "RECEIVING_FILE",
							stageMessage: data.stageMessage || "Processing scoresheet...",
							completedStages: data.completedStages || [],
							geminiStep: typeof data.geminiStep === "number" ? data.geminiStep : 0,
							totalGeminiSteps: data.totalGeminiSteps || 3
						});
					} else if (data.status === "completed") {
						if (data.stats && data.stats.opponent) {
							setOpponent(data.stats.opponent);
							const found = schools.find(s => s.name === data.stats.opponent);
							if (found) setSelectedOpponentId(String(found.id || found._id));
						}
						if (data.stats && data.stats.wrestlers) {
							setWrestlers(data.stats.wrestlers);
						}
						setImagePath(`/media/temp/${data.fileName}`);
						clearInterval(interval);
						setIsUploading(false);
						setSelectedFile(null);
						setIsStarted(true);
					} else if (data.status === "error") {
						clearInterval(interval);
						setIsUploading(false);
						console.error("File upload error", data.error);
						alert("Failed to extract scoresheet. Please try again.");
					}
				})
				.catch(error => {
					clearInterval(interval);
					setIsUploading(false);
					console.error("Polling error", error);
				});
		}, 2000);
	};

	const handleFileChange = (e) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setSelectedFile(file);
			
			setIsUploading(true);
			setUploadProgress({
				currentStage: "RECEIVING_FILE",
				stageMessage: "Uploading scoresheet file to server...",
				completedStages: [],
				geminiStep: 0,
				totalGeminiSteps: 3
			});
			const formData = new FormData();
			formData.append("file", file);

			fetch("/api/dualstatsupload", {
				method: "POST",
				body: formData,
			})
			.then(res => res.json())
			.then(data => {
				if (data.jobId) {
					pollJobStatus(data.jobId);
				}
			})
			.catch(error => {
				setIsUploading(false);
				console.error("Upload error:", error);
			});
		}
	};

	// Wrestler score / details change
	const handleWrestlerChange = (index, field, isScore, value) => {
		const updated = [...wrestlers];
		if (isScore) {
			updated[index].scores = { ...updated[index].scores, [field]: Number(value) || 0 };
		} else if (field === "results") {
			updated[index].results = Number(value) || 0;
		} else {
			updated[index][field] = value;
		}
		setWrestlers(updated);
	};

	const handleWeightClassChange = (oldWt, newWt) => {
		const updated = wrestlers.map(w => w.weight === oldWt ? { ...w, weight: newWt } : w);
		setWrestlers(updated);
	};

	const handleAddWeightClass = () => {
		const usedWeights = new Set(wrestlers.map(w => w.weight));
		const nextWt = WEIGHT_CLASSES.find(w => !usedWeights.has(w)) || WEIGHT_CLASSES[0];

		const updated = [...wrestlers];
		updated.push({
			name: "",
			weight: nextWt,
			results: 0,
			scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 }
		});
		updated.push({
			name: "",
			weight: nextWt,
			results: 0,
			scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 }
		});
		setWrestlers(updated);
	};

	const handleDeleteWeightClass = (wt) => {
		if (confirm(`Remove weight class ${wt}?`)) {
			setWrestlers(wrestlers.filter(w => w.weight !== wt));
		}
	};

	const handleSave = () => {
		let combinedDateTime = dualDate;
		if (dualDate && dualTime) {
			combinedDateTime = new Date(`${dualDate}T${dualTime}`).toISOString();
		}

		const dualData = {
			id: dualId,
			opponent,
			imagePath: imagePath ? imagePath.replace("/media/temp/", "") : null,
			dualDate: combinedDateTime,
			wrestlers
		};

		fetch("/api/dualstatssave", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ dual: dualData })
		})
		.then(res => res.json())
		.then(data => {
			if (data.error) {
				console.error("Save error:", data.error);
				alert("Failed to save dual meet.");
			} else {
				alert("Dual saved successfully!");
				window.location.href = "/portal/schedule.html";
			}
		})
		.catch(err => console.error("Save catch error:", err));
	};

	const handleCancel = () => {
		window.location.href = "/portal/schedule.html";
	};

	const handleDeleteDual = () => {
		if (confirm("Are you sure you want to delete this dual meet?")) {
			fetch("/api/dualstatsdelete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: dualId })
			})
			.then(res => res.json())
			.then(data => {
				if (data.error) {
					console.error("Delete error:", data.error);
					alert("Failed to delete dual meet.");
				} else {
					window.location.href = "/portal/schedule.html";
				}
			})
			.catch(err => console.error("Delete catch error:", err));
		}
	};

	// Group wrestlers into pairs by weight class
	const pairedWeightClasses = [];
	const weightMap = new Map();

	wrestlers.forEach((w, index) => {
		const wt = w.weight || "106";
		if (!weightMap.has(wt)) {
			weightMap.set(wt, []);
			pairedWeightClasses.push(wt);
		}
		weightMap.get(wt).push({ ...w, originalIndex: index });
	});

	// Calculate overall team scores
	let homeTotalScore = 0;
	let visitorTotalScore = 0;

	pairedWeightClasses.forEach(wt => {
		const items = weightMap.get(wt);
		if (items[0]) homeTotalScore += (Number(items[0].results) || 0);
		if (items[1]) visitorTotalScore += (Number(items[1].results) || 0);
	});

	const visitorInitial = opponent ? opponent.charAt(0).toUpperCase() : "E";

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		{
		isLoading ?
		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" alt="Loading" />
		</div>
		: isUploading ?
		<div className="upload-modal-overlay">
			<div className="upload-progress-card">
				<div className="upload-card-header">
					<img src="/media/wrestlingloading.gif" alt="Loading" className="mini-loading-gif" />
					<h3>Processing Scoresheet AI</h3>
				</div>
				<p className="upload-status-message">{ uploadProgress.stageMessage }</p>

				{(() => {
					const stageList = [
						{ 
							key: "SAVING_IMAGE", 
							label: "File Transfer & Storage", 
							activeKeys: ["RECEIVING_FILE", "SAVING_IMAGE"], 
							doneKeys: ["SAVING_IMAGE"], 
							pct: 15 
						},
						{ 
							key: "GEMINI_EXTRACT", 
							label: "Gemini Vision AI (Extract Match Data)", 
							activeKeys: ["GEMINI_EXTRACT"], 
							doneKeys: ["GEMINI_EXTRACT"], 
							pct: 40 
						},
						{ 
							key: "LOOKUP_SCHOOL", 
							label: "Opponent School Matching", 
							activeKeys: ["LOOKUP_SCHOOL"], 
							doneKeys: ["LOOKUP_SCHOOL"], 
							pct: 65 
						},
						{ 
							key: "GEMINI_MATCH_ROSTERS", 
							label: "Wrestler Roster Alignment", 
							activeKeys: ["LOAD_ROSTERS", "GEMINI_MATCH_ROSTERS"], 
							doneKeys: ["GEMINI_MATCH_ROSTERS"], 
							pct: 88 
						},
						{ 
							key: "COMPLETED", 
							label: "Finalizing & Loading Whiteboard", 
							activeKeys: ["FINALIZE_DATA", "COMPLETED"], 
							doneKeys: ["FINALIZE_DATA", "COMPLETED"], 
							pct: 100 
						}
					];

					const currentItem = stageList.find(item => item.activeKeys.includes(uploadProgress.currentStage));
					const progressPct = currentItem ? currentItem.pct : 15;

					return (
						<>
							<div className="gemini-badge-row">
								<span className="gemini-badge">Gemini AI Progress: Step { uploadProgress.geminiStep } of { uploadProgress.totalGeminiSteps }</span>
							</div>

							<div className="progress-bar-container">
								<div 
									className="progress-bar-fill" 
									style={{ width: `${progressPct}%` }}
								></div>
							</div>

							<ul className="upload-stage-stepper">
								{ stageList.map((stageItem, idx) => {
									const isDone = stageItem.doneKeys.every(k => uploadProgress.completedStages.includes(k));
									const isActive = !isDone && stageItem.activeKeys.includes(uploadProgress.currentStage);
									return (
										<li key={ idx } className={`stepper-item ${ isDone ? "done" : isActive ? "active" : "pending" }`}>
											<span className="stepper-icon">{ isDone ? "✓" : isActive ? "⏳" : "○" }</span>
											<span className="stepper-label">{ stageItem.label }</span>
										</li>
									);
								})}
							</ul>
						</>
					);
				})()}
			</div>
		</div>
		: !loggedInUser ?
		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>
		:
		<div className="dual-container">

			{/* Whiteboard Mockup Header Card */}
			<div className="whiteboard-header-card">
				<form onSubmit={ handleStartScoresheet }>
					{/* Date & Time Row */}
					<div className="whiteboard-datetime-row">
						<div className="whiteboard-field">
							<label>Date</label>
							<input 
								type="date" 
								value={ dualDate } 
								onChange={ e => setDualDate(e.target.value) } 
								required
							/>
						</div>

						<div className="whiteboard-field">
							<label>Time</label>
							<select 
								value={ dualTime } 
								onChange={ e => setDualTime(e.target.value) } 
								required
							>
								<option value="">-- Choose Time --</option>
								{ TIME_OPTIONS.map((tOpt, tIdx) => (
									<option key={ tIdx } value={ tOpt.value }>{ tOpt.label }</option>
								))}
							</select>
						</div>
					</div>

					{/* Opponent Row */}
					<div className="whiteboard-opponent-container">
						<div className="whiteboard-opponent-select-wrap">
							<select 
								className="whiteboard-opponent-select"
								value={ selectedOpponentId } 
								onChange={ handleOpponentSelectChange } 
								required
							>
								<option value="">Choose Opponent...</option>
								{ opponentSelectGroup.map((group, gIdx) => (
									<optgroup key={ gIdx } label={ group.name }>
										{ group.schools.map((sch, sIdx) => (
											<option key={ sIdx } value={ sch.id }>{ sch.name }</option>
										))}
									</optgroup>
								))}
							</select>
							<span className="whiteboard-select-arrow">▼</span>
						</div>
						<div className="whiteboard-opponent-label">opponent</div>
					</div>

					{/* Initial View Action Buttons */}
					{ !isStarted && (
						<div className="dual-setup-actions">
							<button type="submit" className="btn-primary">
								Start Dual Scoresheet
							</button>
							<button 
								type="button" 
								className="btn-secondary"
								onClick={ () => fileInputRef.current.click() }
								disabled={ isUploading }
							>
								{ isUploading ? "Uploading..." : "Upload Scoresheet" }
							</button>

							<input 
								ref={ fileInputRef } 
								type="file" 
								onChange={ handleFileChange } 
								className="hidden-file-input" 
							/>
						</div>
					)}
				</form>
			</div>

			{/* Populated Content (Scoresheet Cards and Scorecard Viewer) */}
			{ isStarted && (
			<>
				{/* Dual Meet Scoresheet Container */}
				<div className="scoresheet-card">
					<div className="scoresheet-header">
						<h2>Dual Meet Scoresheet</h2>

						<div className="scoresheet-actions">
							<button 
								type="button"
								className="btn-add-row" 
								onClick={ handleAddWeightClass }
							>
								+ Add Weight Class
							</button>
							{ imagePath && (
								<button 
									type="button"
									className={ `action-btn scorecard-btn ${ showScorecardImage ? "active" : "" }` }
									onClick={ () => setShowScorecardImage(!showScorecardImage) }
								>
									{/* Check / Image Icon */}
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z"/></svg>
									Scorecard
								</button>
							)}
						</div>
					</div>

					{/* Desktop Table Header (Shown >= 768px) */}
					<div className="desktop-table-header">
						<div className="dt-col-wt">WT</div>
						<div className="dt-col-wrestlers">Wrestlers (Home vs Visitor)</div>
						<div className="dt-col-stat">T</div>
						<div className="dt-col-stat">N</div>
						<div className="dt-col-stat">R</div>
						<div className="dt-col-stat">E</div>
						<div className="dt-col-score">Match Score</div>
						<div className="dt-col-actions"></div>
					</div>

					{/* Weight Class List (Responsive Cards on Mobile, Table Rows on Desktop) */}
					<div className="scoresheet-list-body">
						{ pairedWeightClasses.map((wt, pIdx) => {
							const pair = weightMap.get(wt);
							const homeItem = pair[0] || { name: "", results: 0, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } };
							const visitorItem = pair[1] || { name: "", results: 0, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } };

							return (
								<div className="weight-card" key={ pIdx }>
									{/* Weight Card Header (Mobile view selector + trash) */}
									<div className="weight-card-header">
										<div className="weight-label-group">
											<span className="mobile-weight-title">WEIGHT</span>
											<select 
												className="weight-select"
												value={ wt }
												onChange={ e => handleWeightClassChange(wt, e.target.value) }
											>
												{ WEIGHT_CLASSES.map(wOption => (
													<option key={ wOption } value={ wOption }>{ wOption }</option>
												))}
											</select>
										</div>
										<button 
											className="btn-delete-row" 
											onClick={ () => handleDeleteWeightClass(wt) }
											title="Delete Weight Class"
										>
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
										</button>
									</div>

									{/* Wrestler Blocks Container */}
									<div className="weight-card-body">
										<div className="wrestler-row">
											<div className="wrestler-name-row">
												<span className="small-badge home">FM</span>
												<input 
													type="text" 
													className="edit-input-text" 
													value={ homeItem.name }
													onChange={ e => handleWrestlerChange(homeItem.originalIndex, "name", false, e.target.value) }
													placeholder="Home Wrestler"
												/>
											</div>
											
											<div className="stat-boxes-group">
											
												{/* Takedowns Column */}
												<div className="stat-box">
													<span className="stat-label">T</span>
													<input 
														type="number" 
														className="stat-input" 
														value={ homeItem.scores?.takedowns || 0 } 
														onChange={ e => handleWrestlerChange(homeItem.originalIndex, "takedowns", true, e.target.value) }
													/>
												</div>
												
												{/* Nearfalls Column */}
												<div className="stat-box">
													<span className="stat-label">N</span>
													<input 
														type="number" 
														className="stat-input" 
														value={ homeItem.scores?.nearfalls || 0 } 
														onChange={ e => handleWrestlerChange(homeItem.originalIndex, "nearfalls", true, e.target.value) }
													/>
												</div>

												{/* Reversals Column */}
												<div className="stat-box">
													<span className="stat-label">R</span>
													<input 
														type="number" 
														className="stat-input" 
														value={ homeItem.scores?.reversals || 0 } 
														onChange={ e => handleWrestlerChange(homeItem.originalIndex, "reversals", true, e.target.value) }
													/>
												</div>
												
												{/* Escapes Column */}
												<div className="stat-box">
													<span className="stat-label">E</span>
													<input 
														type="number" 
														className="stat-input" 
														value={ homeItem.scores?.escapes || 0 } 
														onChange={ e => handleWrestlerChange(homeItem.originalIndex, "escapes", true, e.target.value) }
													/>
												</div>

												{/* Match Score Column */}
												<div className="match-score-box home">
													<input 
														type="number" 
														className="score-input home" 
														value={ homeItem.results || 0 } 
														onChange={ e => handleWrestlerChange(homeItem.originalIndex, "results", false, e.target.value) }
													/>
												</div>
											</div>
										</div>

										<div className="wrestler-row">
											<div className="wrestler-name-row">
												<span className="small-badge visitor">{ visitorInitial }</span>
												<input 
													type="text" 
													className="edit-input-text" 
													value={ visitorItem.name }
													onChange={ e => handleWrestlerChange(visitorItem.originalIndex, "name", false, e.target.value) }
													placeholder="Visitor Wrestler"
												/>
											</div>
											
											<div className="stat-boxes-group">

												{/* Takedowns Column */}
												<div className="stat-box">
													<span className="stat-label">T</span>
													<input 
														type="number" 
														className="stat-input visitor" 
														value={ visitorItem.scores?.takedowns || 0 } 
														onChange={ e => handleWrestlerChange(visitorItem.originalIndex, "takedowns", true, e.target.value) }
													/>
												</div>
												
												{/* Nearfalls Column */}
												<div className="stat-box">
													<span className="stat-label">N</span>
													<input 
														type="number" 
														className="stat-input visitor" 
														value={ visitorItem.scores?.nearfalls || 0 } 
														onChange={ e => handleWrestlerChange(visitorItem.originalIndex, "nearfalls", true, e.target.value) }
													/>
												</div>

												{/* Reversals Column */}
												<div className="stat-box">
													<span className="stat-label">R</span>
													<input 
														type="number" 
														className="stat-input visitor" 
														value={ visitorItem.scores?.reversals || 0 } 
														onChange={ e => handleWrestlerChange(visitorItem.originalIndex, "reversals", true, e.target.value) }
													/>
												</div>

												{/* Escapes Column */}
												<div className="stat-box">
													<span className="stat-label">E</span>
													<input 
														type="number" 
														className="stat-input visitor" 
														value={ visitorItem.scores?.escapes || 0 } 
														onChange={ e => handleWrestlerChange(visitorItem.originalIndex, "escapes", true, e.target.value) }
													/>
												</div>

												{/* Match Score Column */}
												<div className="match-score-box visitor">
													<input 
														type="number" 
														className="score-input visitor" 
														value={ visitorItem.results || 0 } 
														onChange={ e => handleWrestlerChange(visitorItem.originalIndex, "results", false, e.target.value) }
													/>
												</div>
											</div>
										</div>

									</div>
									
									{/* Desktop Delete Trash Column */}
									<div className="btn-delete-row-desktop-wrap">
										<button 
											className="btn-delete-row" 
											onClick={ () => handleDeleteWeightClass(wt) }
											title="Delete Weight Class"
										>
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
										</button>
									</div>
									
								</div>
							);
						})}
					</div>

					{/* Footer Total Score & Actions */}
					<div className="scoresheet-footer">
						<div className="scoresheet-footer-score-wrap">
							<label>Final Score:</label>
							<div className="final-score-box">
								{ homeTotalScore } - { visitorTotalScore }
							</div>
						</div>
						<div className="scoresheet-footer-actions">
							{ dualId && (
								<button type="button" className="btn-danger" onClick={ handleDeleteDual }>
									Delete Dual
								</button>
							)}
							<button type="button" className="btn-secondary" onClick={ handleCancel }>
								Cancel
							</button>
							<button type="button" className="btn-primary" onClick={ handleSave }>
								Save Changes
							</button>
						</div>
					</div>
				</div>

				{/* Scorecard Image Viewer Panel */}
				{ showScorecardImage && imagePath && (
					<div className="scorecard-image-card">
						<h3>Stat Sheet Scorecard Image</h3>
						<div className="image-scroll-box">
							<img 
								src={ imagePath } 
								alt="Stat Sheet Scorecard" 
								className="scorecard-img" 
								style={{ width: `100%` }}
								onClick={ () => window.open(imagePath, "_blank") }
							/>
						</div>
					</div>
				)}
			</>
			)}

		</div>
		}
	</div>
</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Dual />);
export default Dual;
