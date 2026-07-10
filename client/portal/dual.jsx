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
	const [ matches, setMatches ] = useState([]);
	const [ division, setDivision ] = useState("Varsity");
	const [ imagePath, setImagePath ] = useState(null);
	const [ selectedFile, setSelectedFile ] = useState(null);

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
				fetch("/api/dualload").then(res => res.ok ? res.json() : Promise.reject(res.statusText)),
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

		setMatches(dual.matches || []);
		setDivision(dual.division || "Varsity");
		setImagePath(dual.imagePath ? `/media/temp/${dual.imagePath}` : null);
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

		setIsStarted(true);
	};

	// File upload flow for processing scoresheets
	const pollJobStatus = (jobId) => {
		const interval = setInterval(() => {
			fetch(`/api/dualupload/${jobId}`)
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
						const oppName = (data.stats && data.stats.opponent) || "";
						const parsedMatches = (data.stats && data.stats.matches) || [];
						const fileName = data.fileName || "";

						if (oppName) {
							setOpponent(oppName);
							const found = schools.find(school => school.name === oppName);
							if (found) setSelectedOpponentId(String(found.id || found._id));
						}
						if (parsedMatches.length > 0) {
							setMatches(parsedMatches);
						}
						if (fileName) {
							setImagePath(`/media/temp/${fileName}`);
						}

						clearInterval(interval);
						setIsUploading(false);
						setSelectedFile(null);
						setIsStarted(true);

						let combinedDateTime = dualDate;
						if (dualDate && dualTime) {
							combinedDateTime = new Date(`${dualDate}T${dualTime}`).toISOString();
						}

						const cleanedMatches = parsedMatches.map(match => ({
							...match,
							wrestlers: (match.wrestlers || []).map(wrestler => ({
								...wrestler,
								team: wrestler.team.toLowerCase() === "fort mill" ? "Fort Mill" : (oppName || "Visitor")
							}))
						}));

						const dualData = {
							id: dualId,
							opponent: oppName,
							imagePath: fileName || null,
							dualDate: combinedDateTime,
							division: division,
							matches: cleanedMatches
						};

						fetch("/api/dualsave", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ dual: dualData })
						})
						.then(res => res.json())
						.then(saveRes => {
							if (saveRes.error) {
								console.error("Auto-save error:", saveRes.error);
								alert("Failed to save dual meet automatically.");
							} else {
								clearInterval(interval);
								setIsUploading(false);
							}
						})
						.catch(err => {
							console.error("Auto-save catch error:", err);
							alert("Failed to save dual meet automatically.");
						});
					} else if (data.status === "error") {
						clearInterval(interval);
						setIsUploading(false);
						console.error("File upload error", data.error);
						if (data.error && data.error.includes("AI quota for the day has been exceeded")) {
							alert("AI quota for the day has been exceeded.");
						} else if (data.error && data.error.includes("AI service is temporarily overloaded")) {
							alert("AI service is temporarily overloaded. Please try again later.");
						} else {
							alert("Failed to extract scoresheet. Please try again.");
						}
					}
				})
				.catch(error => {
					clearInterval(interval);
					setIsUploading(false);
					console.error("Polling error", error);
				});
		}, 2000);
	};

	const handleFileChange = (event) => {
		if (event.target.files && event.target.files[0]) {
			if (!dualDate || !dualTime) {
				alert("Please select a Date and Time for the dual meet before uploading a scoresheet.");
				event.target.value = null;
				return;
			}
			const file = event.target.files[0];
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

			fetch("/api/dualupload", {
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
	const handleWrestlerChange = (matchIndex, isHome, field, isScore, value) => {
		const updatedMatches = [...matches];
		const match = updatedMatches[matchIndex];
		
		// Ensure wrestlers array exists and has home/visitor
		if (!match.wrestlers || match.wrestlers.length === 0) {
			match.wrestlers = [
				{ name: "", team: "Fort Mill", isWinner: false, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } },
				{ name: "", team: opponent || "Visitor", isWinner: false, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } }
			];
		} else if (match.wrestlers.length === 1) {
			const existing = match.wrestlers[0];
			if (existing.team.toLowerCase() === "fort mill") {
				match.wrestlers.push({ name: "", team: opponent || "Visitor", isWinner: false, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } });
			} else {
				match.wrestlers.unshift({ name: "", team: "Fort Mill", isWinner: false, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } });
			}
		}

		const wIdx = isHome ? 
			match.wrestlers.findIndex(w => w.team.toLowerCase() === "fort mill") : 
			match.wrestlers.findIndex(w => w.team.toLowerCase() !== "fort mill");
			
		if (wIdx === -1) return;

		if (isScore) {
			match.wrestlers[wIdx].scores = { ...match.wrestlers[wIdx].scores, [field]: Number(value) || 0 };
		} else if (field === "isWinner") {
			// Select winner and reset the other wrestler's winner status
			match.wrestlers.forEach((w, idx) => {
				w.isWinner = (idx === wIdx) ? !!value : false;
			});
		} else {
			match.wrestlers[wIdx][field] = value;
		}
		
		setMatches(updatedMatches);
	};

	const handleMatchChange = (matchIndex, field, value) => {
		const updatedMatches = [...matches];
		updatedMatches[matchIndex][field] = value;
		setMatches(updatedMatches);
	};

	const handleWeightClassChange = (oldWt, newWt) => {
		const updated = matches.map(m => m.weightClass === oldWt ? { ...m, weightClass: newWt } : m);
		setMatches(updated);
	};

	const handleAddWeightClass = () => {
		const usedWeights = new Set(matches.map(m => m.weightClass));
		const nextWt = WEIGHT_CLASSES.find(w => !usedWeights.has(w)) || WEIGHT_CLASSES[0];

		const updated = [...matches];
		updated.push({
			matchSqlId: null,
			weightClass: nextWt,
			winType: "DEC",
			sort: matches.length + 1,
			wrestlers: [
				{
					name: "",
					team: "Fort Mill",
					isWinner: false,
					scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 }
				},
				{
					name: "",
					team: opponent || "Visitor",
					isWinner: false,
					scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 }
				}
			]
		});
		setMatches(updated);
	};

	const handleDeleteWeightClass = (wt) => {
		if (confirm(`Remove weight class ${wt}?`)) {
			setMatches(matches.filter(m => m.weightClass !== wt));
		}
	};

	const handleSave = () => {
		let combinedDateTime = dualDate;
		if (dualDate && dualTime) {
			combinedDateTime = new Date(`${dualDate}T${dualTime}`).toISOString();
		}

		// Ensure correct team names are synchronized
		const cleanedMatches = matches.map(m => ({
			...m,
			wrestlers: (m.wrestlers || []).map(w => ({
				...w,
				team: w.team.toLowerCase() === "fort mill" ? "Fort Mill" : (opponent || "Visitor")
			}))
		}));

		const dualData = {
			id: dualId,
			opponent,
			imagePath: imagePath ? imagePath.replace("/media/temp/", "") : null,
			dualDate: combinedDateTime,
			division: division,
			matches: cleanedMatches
		};

		fetch("/api/dualsave", {
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
			fetch("/api/dualdelete", {
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

	// Calculate overall team scores
	let homeTotalScore = 0;
	let visitorTotalScore = 0;

	matches.forEach(match => {
		const winType = (match.winType || "").toUpperCase();
		let pts = 0;
		if (winType === "DEC") pts = 3;
		else if (winType === "MD") pts = 4;
		else if (winType === "TF") pts = 5;
		else if (["F", "FF", "FOR", "DQ", "DEF"].includes(winType)) pts = 6;
		else pts = 3; // fallback default to decision points

		const homeW = (match.wrestlers || []).find(w => w.team.toLowerCase() === "fort mill");
		const visitorW = (match.wrestlers || []).find(w => w.team.toLowerCase() !== "fort mill");

		if (homeW && homeW.isWinner) {
			homeTotalScore += pts;
		} else if (visitorW && visitorW.isWinner) {
			visitorTotalScore += pts;
		}
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

						<div className="whiteboard-field">
							<label>Division</label>
							<select 
								value={ division } 
								onChange={ e => setDivision(e.target.value) } 
								required
							>
								<option value="Varsity">Varsity</option>
								<option value="JV">JV</option>
								<option value="Middle School">Middle School</option>
								<option value="Girls">Girls</option>
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

					{/* Action Buttons */}
					{ !isStarted ? (
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
						</div>
					) : (
						!imagePath && (
							<div className="dual-setup-actions" style={{ marginTop: '15px' }}>
								<button 
									type="button" 
									className="btn-secondary"
									onClick={ () => fileInputRef.current.click() }
									disabled={ isUploading }
								>
									{ isUploading ? "Uploading..." : "Upload Scoresheet" }
								</button>
							</div>
						)
					)}

					<input 
						ref={ fileInputRef } 
						type="file" 
						onChange={ handleFileChange } 
						className="hidden-file-input" 
					/>
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
									className="action-btn scorecard-btn"
									onClick={ () => window.open(imagePath, "_blank") }
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z"/></svg>
									Scorecard
								</button>
							)}
						</div>
					</div>

					{/* Desktop Table Header (Shown >= 768px) */}
					<div className="desktop-table-header">
						<div className="dt-col-wt">WT</div>
						<div className="dt-col-wrestlers" style={{ width: "32%" }}>Wrestlers (Home vs Visitor)</div>
						<div className="dt-col-win" style={{ width: "10%", textAlign: "center", fontWeight: "600", fontSize: "14px", color: "var(--on-surface-variant)" }}>Winner?</div>
						<div className="dt-col-wintype" style={{ width: "12%", textAlign: "center", fontWeight: "600", fontSize: "14px", color: "var(--on-surface-variant)" }}>Win Type</div>
						<div className="dt-col-stat">T</div>
						<div className="dt-col-stat">N</div>
						<div className="dt-col-stat">R</div>
						<div className="dt-col-stat">E</div>
						<div className="dt-col-actions"></div>
					</div>

					{/* Weight Class List (Responsive Cards on Mobile, Table Rows on Desktop) */}
					<div className="scoresheet-list-body">
						{ matches.map((match, mIdx) => {
							const wt = match.weightClass || "106";
							const homeItem = (match.wrestlers || []).find(w => w.team.toLowerCase() === "fort mill") || { name: "", isWinner: false, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } };
							const visitorItem = (match.wrestlers || []).find(w => w.team.toLowerCase() !== "fort mill") || { name: "", isWinner: false, scores: { takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 } };

							return (
								<div className="weight-card" key={ mIdx }>
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

										<div className="wintype-label-group" style={{ marginLeft: "15px" }}>
											<span className="mobile-wintype-title" style={{ fontSize: "10px", color: "var(--outline)", display: "block" }}>WIN TYPE</span>
											<select 
												className="wintype-select"
												value={ match.winType || "DEC" }
												onChange={ e => handleMatchChange(mIdx, "winType", e.target.value) }
												style={{ background: "none", border: "1px solid var(--outline-variant)", padding: "2px 5px", fontSize: "12px", borderRadius: "var(--rounded)" }}
											>
												<option value="DEC">DEC</option>
												<option value="MD">MD</option>
												<option value="TF">TF</option>
												<option value="F">F</option>
												<option value="FF">FF</option>
												<option value="DEF">DEF</option>
												<option value="DQ">DQ</option>
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
													onChange={ e => handleWrestlerChange(mIdx, true, "name", false, e.target.value) }
													placeholder="Home Wrestler"
												/>
												<label className="winner-label" style={{ display: "flex", alignItems: "center", marginLeft: "10px", gap: "4px", cursor: "pointer" }}>
													<input
														type="radio"
														name={`winner-${mIdx}`}
														checked={ !!homeItem.isWinner }
														onChange={ e => handleWrestlerChange(mIdx, true, "isWinner", false, e.target.checked) }
													/>
													<span style={{ fontSize: "11px", fontWeight: "600", color: homeItem.isWinner ? "var(--primary)" : "var(--outline)" }}>Win</span>
												</label>
											</div>
											
											<div className="stat-boxes-group">
												{/* Takedowns Column */}
												<div className="stat-box">
													<span className="stat-label">T</span>
													<input 
														type="number" 
														className="stat-input" 
														value={ homeItem.scores?.takedowns || 0 } 
														onChange={ e => handleWrestlerChange(mIdx, true, "takedowns", true, e.target.value) }
													/>
												</div>
												
												{/* Nearfalls Column */}
												<div className="stat-box">
													<span className="stat-label">N</span>
													<input 
														type="number" 
														className="stat-input" 
														value={ homeItem.scores?.nearfalls || 0 } 
														onChange={ e => handleWrestlerChange(mIdx, true, "nearfalls", true, e.target.value) }
													/>
												</div>

												{/* Reversals Column */}
												<div className="stat-box">
													<span className="stat-label">R</span>
													<input 
														type="number" 
														className="stat-input" 
														value={ homeItem.scores?.reversals || 0 } 
														onChange={ e => handleWrestlerChange(mIdx, true, "reversals", true, e.target.value) }
													/>
												</div>
												
												{/* Escapes Column */}
												<div className="stat-box">
													<span className="stat-label">E</span>
													<input 
														type="number" 
														className="stat-input" 
														value={ homeItem.scores?.escapes || 0 } 
														onChange={ e => handleWrestlerChange(mIdx, true, "escapes", true, e.target.value) }
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
													onChange={ e => handleWrestlerChange(mIdx, false, "name", false, e.target.value) }
													placeholder="Visitor Wrestler"
												/>
												<label className="winner-label" style={{ display: "flex", alignItems: "center", marginLeft: "10px", gap: "4px", cursor: "pointer" }}>
													<input
														type="radio"
														name={`winner-${mIdx}`}
														checked={ !!visitorItem.isWinner }
														onChange={ e => handleWrestlerChange(mIdx, false, "isWinner", false, e.target.checked) }
													/>
													<span style={{ fontSize: "11px", fontWeight: "600", color: visitorItem.isWinner ? "var(--secondary)" : "var(--outline)" }}>Win</span>
												</label>
											</div>
											
											<div className="stat-boxes-group">
												{/* Takedowns Column */}
												<div className="stat-box">
													<span className="stat-label">T</span>
													<input 
														type="number" 
														className="stat-input visitor" 
														value={ visitorItem.scores?.takedowns || 0 } 
														onChange={ e => handleWrestlerChange(mIdx, false, "takedowns", true, e.target.value) }
													/>
												</div>
												
												{/* Nearfalls Column */}
												<div className="stat-box">
													<span className="stat-label">N</span>
													<input 
														type="number" 
														className="stat-input visitor" 
														value={ visitorItem.scores?.nearfalls || 0 } 
														onChange={ e => handleWrestlerChange(mIdx, false, "nearfalls", true, e.target.value) }
													/>
												</div>

												{/* Reversals Column */}
												<div className="stat-box">
													<span className="stat-label">R</span>
													<input 
														type="number" 
														className="stat-input visitor" 
														value={ visitorItem.scores?.reversals || 0 } 
														onChange={ e => handleWrestlerChange(mIdx, false, "reversals", true, e.target.value) }
													/>
												</div>

												{/* Escapes Column */}
												<div className="stat-box">
													<span className="stat-label">E</span>
													<input 
														type="number" 
														className="stat-input visitor" 
														value={ visitorItem.scores?.escapes || 0 } 
														onChange={ e => handleWrestlerChange(mIdx, false, "escapes", true, e.target.value) }
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
