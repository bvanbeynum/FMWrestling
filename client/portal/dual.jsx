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

const parseEventDate = (dateInput) => {
	if (!dateInput) return null;
	if (dateInput instanceof Date) return dateInput;

	const str = String(dateInput).trim();
	const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
	if (isoMatch) {
		const year = parseInt(isoMatch[1], 10);
		const month = parseInt(isoMatch[2], 10) - 1;
		const day = parseInt(isoMatch[3], 10);
		const hours = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
		const minutes = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
		const seconds = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

		return new Date(year, month, day, hours, minutes, seconds);
	}

	return new Date(dateInput);
};

const formatDate = (dateStr) => {
	if (!dateStr) return "";
	const date = parseEventDate(dateStr);
	if (!date || isNaN(date.getTime())) return "";
	return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
};

const Dual = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ isUploading, setIsUploading ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);

	// Setup / Filtering State
	const [ opponent, setOpponent ] = useState("");
	const [ dualDate, setDualDate ] = useState("");
	const [ dualTime, setDualTime ] = useState("");
	const [ fortMillWrestlers, setFortMillWrestlers ] = useState([]);
	const [ opponentWrestlers, setOpponentWrestlers ] = useState([]);
	const [ activeSearch, setActiveSearch ] = useState({ matchIndex: null, isHome: null, query: "" });

	// Workflow state flag: true when scoresheet is active
	const [ isStarted, setIsStarted ] = useState(false);
	const [ viewMode, setViewMode ] = useState(() => {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get("mode") !== "edit";
	});

	// Data & Upload State
	const [ dual, setDual ] = useState(null);
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
			const urlParams = new URLSearchParams(window.location.search);
			const targetId = urlParams.get("id");
			
			fetch(`/api/dualload?id=${targetId}`)
				.then(res => res.ok ? res.json() : Promise.reject(res.statusText))
				.then(dualData => {
					const loadedDual = dualData.dual;
					loadedDual.dualDateObj = parseEventDate(loadedDual.dualDate);

					setDual(loadedDual);
					setLoggedInUser(dualData.loggedInUser);
					setFortMillWrestlers(dualData.fortMillWrestlers || []);
					setOpponentWrestlers(dualData.opponentWrestlers || []);

					loadDualData(loadedDual);

					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn("Initialization error:", error);
					setIsLoading(false);
				});
		}
	}, []);

	const loadDualData = (eventRecord) => {
		setDualId(eventRecord.id || eventRecord._id);
		
		const nonFortMillWrestler = (eventRecord.matches || [])
			.flatMap(matchItem => matchItem.wrestlers || [])
			.find(wrestlerItem => wrestlerItem.team && !/fort mill/i.test(wrestlerItem.team.trim()));
		let opponentName = nonFortMillWrestler ? nonFortMillWrestler.team.trim() : (eventRecord.opponent || "");
		if (!opponentName && eventRecord.name && eventRecord.name.includes(" vs ")) {
			const candidateOpponent = eventRecord.name.split(" vs ")[1]?.trim();
			if (candidateOpponent && !/fort mill/i.test(candidateOpponent)) {
				opponentName = candidateOpponent;
			}
		}
		setOpponent(opponentName);
		
		const extractTime = (dateObject) => {
			const minutes = dateObject.getMinutes();
			const roundedMinutes = minutes < 15 ? '00' : (minutes < 45 ? '30' : '00');
			let hours = dateObject.getHours();
			if (minutes >= 45) hours = (hours + 1) % 24;
			return `${String(hours).padStart(2, '0')}:${roundedMinutes}`;
		};

		const targetDate = parseEventDate(eventRecord.date || eventRecord.dualDate);
		if (targetDate && !isNaN(targetDate.getTime())) {
			setDualDate(targetDate.toISOString().split("T")[0]);
			setDualTime(extractTime(targetDate));
		}

		setMatches(eventRecord.matches || []);
		const firstMatchDivision = (eventRecord.matches && eventRecord.matches[0] && eventRecord.matches[0].division) ? eventRecord.matches[0].division : (eventRecord.division || "Varsity");
		setDivision(firstMatchDivision);
		setImagePath(eventRecord.imagePath ? `/media/temp/${eventRecord.imagePath}` : null);
		setIsStarted(true);
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
						const parsedMatches = (data.stats && data.stats.matches) || [];
						const fileName = data.fileName || "";

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
								team: wrestler.team.toLowerCase() === "fort mill" ? "Fort Mill" : (opponent || "Visitor")
							}))
						}));

						const dualData = {
							id: dualId,
							opponent: opponent,
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
				{ name: "", team: "Fort Mill", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 },
				{ name: "", team: opponent || "Visitor", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 }
			];
		} else if (match.wrestlers.length === 1) {
			const existing = match.wrestlers[0];
			if (existing.team.toLowerCase() === "fort mill") {
				match.wrestlers.push({ name: "", team: opponent || "Visitor", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 });
			} else {
				match.wrestlers.unshift({ name: "", team: "Fort Mill", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 });
			}
		}

		const wrestlerIndex = isHome ? 
			match.wrestlers.findIndex(wrestler => wrestler.team.toLowerCase() === "fort mill") : 
			match.wrestlers.findIndex(wrestler => wrestler.team.toLowerCase() !== "fort mill");
			
		if (wrestlerIndex === -1) return;
		
		if (field === "isWinner") {
			// Select winner and reset the other wrestler's winner status
			match.wrestlers.forEach((wrestler, wrestlerItemIndex) => {
				wrestler.isWinner = (wrestlerItemIndex === wrestlerIndex) ? !!value : false;
			});
		} else {
			match.wrestlers[wrestlerIndex][field] = value;
			if (field === "name") {
				match.wrestlers[wrestlerIndex].wrestlerId = null;
			}
		}
		
		setMatches(updatedMatches);
	};

	const handleSelectWrestler = (matchIndex, isHome, wrestler) => {
		const updatedMatches = [...matches];
		const match = updatedMatches[matchIndex];
		
		if (!match.wrestlers || match.wrestlers.length === 0) {
			match.wrestlers = [
				{ name: "", team: "Fort Mill", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 },
				{ name: "", team: opponent || "Visitor", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 }
			];
		} else if (match.wrestlers.length === 1) {
			const existing = match.wrestlers[0];
			if (existing.team.toLowerCase() === "fort mill") {
				match.wrestlers.push({ name: "", team: opponent || "Visitor", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 });
			} else {
				match.wrestlers.unshift({ name: "", team: "Fort Mill", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 });
			}
		}

		const wrestlerIndex = isHome ? 
			match.wrestlers.findIndex(item => item.team.toLowerCase() === "fort mill") : 
			match.wrestlers.findIndex(item => item.team.toLowerCase() !== "fort mill");
			
		if (wrestlerIndex !== -1) {
			match.wrestlers[wrestlerIndex].name = wrestler.name;
			match.wrestlers[wrestlerIndex].wrestlerId = wrestler.id || wrestler._id;
			setMatches(updatedMatches);
		}

		setActiveSearch({ matchIndex: null, isHome: null, query: "" });
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
		if (matches.length >= 14) return;
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
					takedowns: 0,
					escapes: 0,
					reversals: 0,
					nearfalls: 0
				},
				{
					name: "",
					team: opponent || "Visitor",
					isWinner: false,
					takedowns: 0,
					escapes: 0,
					reversals: 0,
					nearfalls: 0
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

		const cleanedMatches = matches.map(matchItem => ({
			...matchItem,
			division: matchItem.division || division || "Varsity",
			wrestlers: (matchItem.wrestlers || [])
		}));

		const eventRecordPayload = {
			id: dualId,
			eventType: "Dual",
			eventSystem: "WrestlingPortal",
			name: `Fort Mill vs ${opponent}`,
			date: combinedDateTime,
			imagePath: imagePath ? imagePath.replace("/media/temp/", "") : null,
			matches: cleanedMatches
		};

		fetch("/api/dualsave", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ dual: eventRecordPayload })
		})
			.then(response => response.json())
			.then(responseData => {
				if (responseData.error) {
					console.error("Save error:", responseData.error);
					alert("Failed to save dual meet.");
				} else {
					window.location.href = "/portal/teamschedule.html";
				}
			})
			.catch(error => console.error("Save catch error:", error));
	};

	const handleCancel = () => {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			window.location.href = "/portal/teamschedule.html";
		}
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
					window.location.href = "/portal/teamschedule.html";
				}
			})
			.catch(err => console.error("Delete catch error:", err));
		}
	};

	// Calculate overall team scores and win results
	let homeTotalScore = 0;
	let visitorTotalScore = 0;
	const winStats = { pins: 0, techs: 0, majors: 0, decs: 0 };

	matches.forEach(match => {
		const winType = (match.winType || "").toUpperCase();
		let pts = 0;
		if (winType === "DEC") pts = 3;
		else if (winType === "MD") pts = 4;
		else if (winType === "TF") pts = 5;
		else if (["F", "FALL", "PIN", "FF", "FOR", "DQ", "DEF"].includes(winType)) pts = 6;
		else pts = 3; // fallback default to decision points

		const homeWrestler = (match.wrestlers || []).find(w => w.team.toLowerCase() === "fort mill");
		const visitorWrestler = (match.wrestlers || []).find(w => w.team.toLowerCase() !== "fort mill");

		if (homeWrestler && homeWrestler.isWinner) {
			homeTotalScore += pts;
			if (["F", "FALL", "PIN"].includes(winType)) winStats.pins++;
			else if (winType === "TF") winStats.techs++;
			else if (winType === "MD") winStats.majors++;
			else winStats.decs++;
		} else if (visitorWrestler && visitorWrestler.isWinner) {
			visitorTotalScore += pts;
		}
	});

	const formatMatchResult = (match, homeWrestler, visitorWrestler) => {
		const winType = (match.winType || "DEC").toUpperCase();
		let label = winType;
		if (["F", "FALL", "PIN"].includes(winType)) label = "Pin";
		else if (winType === "TF") label = "TF";
		else if (winType === "MD") label = "MD";
		else if (["DEC", "D"].includes(winType)) label = "Dec";

		let pts = 3;
		if (label === "Dec") pts = 3;
		else if (label === "MD") pts = 4;
		else if (label === "TF") pts = 5;
		else if (["F", "FALL", "PIN", "FF", "FOR", "DQ", "DEF"].includes(winType) || label === "Pin") pts = 6;

		const homeIsWinner = !!homeWrestler?.isWinner;
		const visitorIsWinner = !!visitorWrestler?.isWinner;

		let pointsStr = "";
		if (homeIsWinner) {
			pointsStr = `(+${pts})`;
		} else if (visitorIsWinner) {
			pointsStr = `(-${pts})`;
		}

		return pointsStr ? `${label} ${pointsStr}` : label;
	};

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
			{/* Shared Top Action Bar for both modes */}
			<div className="dual-top-action-bar">
				{ viewMode ? (
					loggedInUser?.privileges?.includes("scheduleManage") && (
						<button 
							type="button"
							className="dual-action-btn btn-toggle" 
							onClick={ () => setViewMode(false) }
						>
							Edit Dual
						</button>
					)
				) : (
					<button 
						type="button"
						className="dual-action-btn btn-toggle" 
						onClick={ () => setViewMode(true) }
					>
						View Report
					</button>
				)}
			</div>

			{ viewMode ? (
				<div className="dual-report-view">
					{/* Top Blue Hero Card (matching working/dual.png) */}
					<div className="report-hero-card">
						<div className="report-hero-left">
							<div className="report-hero-team">
								<span className="score-val">{ homeTotalScore }</span>
								<span className="team-name home">FORT MILL</span>
							</div>
							<div className="score-num-wrap">
								<span className="score-vs">vs</span>
							</div>
							<div className="report-hero-team">
								<span className="score-val">{ visitorTotalScore }</span>
								<span className="team-name visitor">{ (opponent || "VISITOR").toUpperCase() }</span>
							</div>
						</div>

						<div className="report-hero-right">
							<h3 className="win-results-title">Win Results</h3>
							<div className="win-results-boxes">
								<div className="win-box">
									<div className="win-box-num">{ winStats.pins }</div>
									<div className="win-box-lbl">PINS</div>
								</div>
								<div className="win-box">
									<div className="win-box-num">{ winStats.techs }</div>
									<div className="win-box-lbl">TECHS</div>
								</div>
								<div className="win-box">
									<div className="win-box-num">{ winStats.majors }</div>
									<div className="win-box-lbl">MAJORS</div>
								</div>
								<div className="win-box">
									<div className="win-box-num">{ winStats.decs }</div>
									<div className="win-box-lbl">DECS</div>
								</div>
							</div>
						</div>
					</div>

					{/* Match Details Header */}
					<div className="report-details-header-row">
						<h2 className="report-details-title">Match Details</h2>
						<div className="report-legend">
							<span className="legend-item"><span className="legend-dot win">●</span> Win</span>
							<span className="legend-item"><span className="legend-dot loss">●</span> Loss</span>
						</div>
					</div>

					{/* Match Details Table Card */}
					<div className="report-matches-card">
						<div className="report-table-header">
							<div className="report-th home">FORT MILL STATS</div>
							<div className="report-th match">MATCH INFO</div>
							<div className="report-th visitor">OPPONENT STATS</div>
						</div>

						<div className="report-table-body">
							{ matches.length === 0 ? (
								<div className="report-no-data">No match data available.</div>
							) : (
								matches.map((match, mIdx) => {
									const wt = match.weightClass || "—";
									const homeWrestler = (match.wrestlers || []).find(wrestler => wrestler.team.toLowerCase() === "fort mill") || {};
									const visitorWrestler = (match.wrestlers || []).find(wrestler => wrestler.team.toLowerCase() !== "fort mill") || {};

									const homeIsWinner = !!homeWrestler.isWinner;
									const visitorIsWinner = !!visitorWrestler.isWinner;
									const resultText = formatMatchResult(match, homeWrestler, visitorWrestler);

									return (
										<div className="report-match-row" key={ mIdx }>
											{/* Left: Home Wrestler Stats */}
											<div className="report-cell home">
												<div className={`wrestler-name ${ homeIsWinner ? "win" : visitorIsWinner ? "loss" : "" }`}>
													<span>{ homeWrestler.name || "—" }</span>
													{ homeWrestler.wrestlerId && (
														<svg className="wrestler-status-icon linked report-check" viewBox="0 0 24 24" fill="currentColor" title="Associated with roster">
															<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
														</svg>
													)}
												</div>
												<div className="wrestler-stats-line">
													TD: { homeWrestler.takedowns || 0 } &nbsp;&nbsp; NF: { homeWrestler.nearfalls || 0 } &nbsp;&nbsp; REV: { homeWrestler.reversals || 0 } &nbsp;&nbsp; ESC: { homeWrestler.escapes || 0 }
												</div>
											</div>

											{/* Center: Weight Class & Result */}
											<div className="report-cell match">
												<div className="match-wt-class">{ wt }</div>
												<div className={`match-res-type ${ homeIsWinner ? "win" : visitorIsWinner ? "loss" : "" }`}>
													{ resultText }
												</div>
											</div>

											{/* Right: Opponent Wrestler Stats */}
											<div className="report-cell visitor">
												<div className={`wrestler-name ${ visitorIsWinner ? "win" : homeIsWinner ? "loss" : "" }`}>
													{ visitorWrestler.wrestlerId && (
														<svg className="wrestler-status-icon linked report-check" viewBox="0 0 24 24" fill="currentColor" title="Associated with roster">
															<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
														</svg>
													)}
													<span>{ visitorWrestler.name || "—" }</span>
												</div>
												<div className="wrestler-stats-line">
													TD: { visitorWrestler.takedowns || 0 } &nbsp;&nbsp; NF: { visitorWrestler.nearfalls || 0 } &nbsp;&nbsp; REV: { visitorWrestler.reversals || 0 } &nbsp;&nbsp; ESC: { visitorWrestler.escapes || 0 }
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>

					{ imagePath && (
						<div className="report-scorecard-action">
							<button 
								type="button"
								className="btn-secondary"
								onClick={ () => window.open(imagePath, "_blank") }
							>
								View Scorecard Image
							</button>
						</div>
					)}
				</div>
			) : (
				<>
					{/* Whiteboard Mockup Header Card (Dual Details Edit Box) */}
					<div className="whiteboard-header-card">
						<form onSubmit={ handleStartScoresheet }>
							{/* Opponent, Date, Time & Division Row */}
							<div className="whiteboard-datetime-row">
								<div className="whiteboard-field">
									<label>Opponent</label>
									<input 
										type="text" 
										value={ opponent } 
										onChange={ e => setOpponent(e.target.value) } 
										placeholder="Opponent School Name"
										required
									/>
								</div>

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
									{matches.length < 14 && (
										<button 
											type="button"
											className="btn-add-row" 
											onClick={ handleAddWeightClass }
										>
											+ Add Weight Class
										</button>
									)}
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
								<div className="dt-col-wrestlers">Wrestlers (Home vs Visitor)</div>
								<div className="dt-col-win">Winner?</div>
								<div className="dt-col-wintype">Win Type</div>
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
									const homeItem = (match.wrestlers || []).find(w => w.team.toLowerCase() === "fort mill") || { name: "", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 };
									const visitorItem = (match.wrestlers || []).find(w => w.team.toLowerCase() !== "fort mill") || { name: "", isWinner: false, takedowns: 0, escapes: 0, reversals: 0, nearfalls: 0 };

									return (
										<div className="weight-card" key={ mIdx }>
											{/* Weight Card Header (WT select) */}
											<div className="weight-card-header">
												<div className="weight-label-group">
													<span className="mobile-weight-title">WEIGHT</span>
													<select 
														className="weight-select"
														value={ wt }
														onChange={ event => handleWeightClassChange(wt, event.target.value) }
													>
														{ WEIGHT_CLASSES.map(weightClassOption => (
															<option key={ weightClassOption } value={ weightClassOption }>{ weightClassOption }</option>
														))}
													</select>
												</div>
											</div>

											{/* Win Type Column (rendered separately) */}
											<div className="wintype-card-col">
												<span className="mobile-wintype-title" style={{ fontSize: "10px", color: "var(--outline)", display: "block" }}>WIN TYPE</span>
												<select 
													className="wintype-select"
													value={ match.winType || "DEC" }
													onChange={ event => handleMatchChange(mIdx, "winType", event.target.value) }
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

											{/* Wrestler Blocks Container */}
											<div className="weight-card-body">
												<div className="wrestler-row">
													<div className="wrestler-name-row">
														<div className="wrestler-name-col">
															<span className="small-badge home">FM</span>
															<div className="wrestler-input-wrapper">
																<input 
																	type="text" 
																	className={`edit-input-text ${homeItem.name && homeItem.name.trim() ? (homeItem.wrestlerId ? "input-linked" : "input-freeform") : ""}`}
																	value={ homeItem.name }
																	onChange={ event => {
																		const value = event.target.value;
																		handleWrestlerChange(mIdx, true, "name", false, value);
																		setActiveSearch({ matchIndex: mIdx, isHome: true, query: value });
																	}}
																	onFocus={ event => {
																		setActiveSearch({ matchIndex: mIdx, isHome: true, query: event.target.value });
																	}}
																	onBlur={ () => setTimeout(() => setActiveSearch({ matchIndex: null, isHome: null, query: "" }), 200) }
																	placeholder="Home Wrestler"
																/>
																{homeItem.name && homeItem.name.trim() && (
																	<span 
																		className="wrestler-status-indicator" 
																		title={homeItem.wrestlerId ? "Associated with roster" : "Free form entry"}
																	>
																		{homeItem.wrestlerId ? (
																			<svg className="wrestler-status-icon linked" viewBox="0 0 24 24" fill="currentColor">
																				<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
																			</svg>
																		) : (
																			<svg className="wrestler-status-icon freeform" viewBox="0 0 24 24" fill="currentColor">
																				<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
																			</svg>
																		)}
																	</span>
																)}
																{ activeSearch.matchIndex === mIdx && activeSearch.isHome === true && activeSearch.query.length >= 1 && (
																	<ul className="wrestler-autocomplete-list">
																		{ fortMillWrestlers
																			.filter(wrestler => wrestler.name.toLowerCase().includes(activeSearch.query.toLowerCase()))
																			.map(wrestler => (
																				<li 
																					key={ wrestler.id || wrestler._id }
																					onMouseDown={ () => handleSelectWrestler(mIdx, true, wrestler) }
																					className="autocomplete-item"
																				>
																					<div className="autocomplete-name">{ wrestler.name }</div>
																					{(wrestler.weightClass || wrestler.division || wrestler.rating || wrestler.lastEventDate) && (
																						<div className="autocomplete-details">
																							{wrestler.weightClass ? `${wrestler.weightClass} lbs` : ""}
																							{wrestler.division ? ` • ${wrestler.division}` : ""}
																							{wrestler.rating ? ` • Rating: ${wrestler.rating}` : ""}
																							{wrestler.lastEventDate ? ` • Last Event: ${formatDate(wrestler.lastEventDate)}` : ""}
																						</div>
																					)}
																				</li>
																			))
																		}
																	</ul>
																)}
															</div>
														</div>
														<div className="winner-col">
															<label className="winner-label" style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
																<input
																	type="radio"
																	name={`winner-${mIdx}`}
																	checked={ !!homeItem.isWinner }
																	onChange={ event => handleWrestlerChange(mIdx, true, "isWinner", false, event.target.checked) }
																/>
																<span style={{ fontSize: "11px", fontWeight: "600", color: homeItem.isWinner ? "var(--primary)" : "var(--outline)" }}>Win</span>
															</label>
														</div>
													</div>
													
													<div className="stats-col">
														<div className="stat-boxes-group">
															{/* Takedowns Column */}
															<div className="stat-box">
																<span className="stat-label">T</span>
																<input 
																	type="number" 
																	className="stat-input" 
																	value={ homeItem.takedowns || 0 } 
																	onChange={ event => handleWrestlerChange(mIdx, true, "takedowns", true, event.target.value) }
																/>
															</div>
															
															{/* Nearfalls Column */}
															<div className="stat-box">
																<span className="stat-label">N</span>
																<input 
																	type="number" 
																	className="stat-input" 
																	value={ homeItem.nearfalls || 0 } 
																	onChange={ event => handleWrestlerChange(mIdx, true, "nearfalls", true, event.target.value) }
																/>
															</div>

															{/* Reversals Column */}
															<div className="stat-box">
																<span className="stat-label">R</span>
																<input 
																	type="number" 
																	className="stat-input" 
																	value={ homeItem.reversals || 0 } 
																	onChange={ event => handleWrestlerChange(mIdx, true, "reversals", true, event.target.value) }
																/>
															</div>
															
															{/* Escapes Column */}
															<div className="stat-box">
																<span className="stat-label">E</span>
																<input 
																	type="number" 
																	className="stat-input" 
																	value={ homeItem.escapes || 0 } 
																	onChange={ event => handleWrestlerChange(mIdx, true, "escapes", true, event.target.value) }
																/>
															</div>
														</div>
													</div>
												</div>

												<div className="wrestler-row">
													<div className="wrestler-name-row">
														<div className="wrestler-name-col">
															<span className="small-badge visitor">{ visitorInitial }</span>
															<div className="wrestler-input-wrapper">
																<input 
																	type="text" 
																	className={`edit-input-text ${visitorItem.name && visitorItem.name.trim() ? (visitorItem.wrestlerId ? "input-linked" : "input-freeform") : ""}`}
																	value={ visitorItem.name }
																	onChange={ event => {
																		const value = event.target.value;
																		handleWrestlerChange(mIdx, false, "name", false, value);
																		setActiveSearch({ matchIndex: mIdx, isHome: false, query: value });
																	}}
																	onFocus={ event => {
																		setActiveSearch({ matchIndex: mIdx, isHome: false, query: event.target.value });
																	}}
																	onBlur={ () => setTimeout(() => setActiveSearch({ matchIndex: null, isHome: null, query: "" }), 200) }
																	placeholder="Visitor Wrestler"
																/>
																{visitorItem.name && visitorItem.name.trim() && (
																	<span 
																		className="wrestler-status-indicator" 
																		title={visitorItem.wrestlerId ? "Associated with roster" : "Free form entry"}
																	>
																		{visitorItem.wrestlerId ? (
																			<svg className="wrestler-status-icon linked" viewBox="0 0 24 24" fill="currentColor">
																				<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
																			</svg>
																		) : (
																			<svg className="wrestler-status-icon freeform" viewBox="0 0 24 24" fill="currentColor">
																				<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
																			</svg>
																		)}
																	</span>
																)}
																{ activeSearch.matchIndex === mIdx && activeSearch.isHome === false && activeSearch.query.length >= 1 && (
																	<ul className="wrestler-autocomplete-list">
																		{ opponentWrestlers
																			.filter(wrestler => wrestler.name.toLowerCase().includes(activeSearch.query.toLowerCase()))
																			.map(wrestler => (
																				<li 
																					key={ wrestler.id || wrestler._id }
																					onMouseDown={ () => handleSelectWrestler(mIdx, false, wrestler) }
																					className="autocomplete-item"
																				>
																					<div className="autocomplete-name">{ wrestler.name }</div>
																					{(wrestler.weightClass || wrestler.division || wrestler.rating || wrestler.lastEventDate) && (
																						<div className="autocomplete-details">
																							{wrestler.weightClass ? `${wrestler.weightClass} lbs` : ""}
																							{wrestler.division ? ` • ${wrestler.division}` : ""}
																							{wrestler.rating ? ` • Rating: ${wrestler.rating}` : ""}
																							{wrestler.lastEventDate ? ` • Last Event: ${formatDate(wrestler.lastEventDate)}` : ""}
																						</div>
																					)}
																				</li>
																			))
																		}
																	</ul>
																)}
															</div>
														</div>
														<div className="winner-col">
															<label className="winner-label" style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
																<input
																	type="radio"
																	name={`winner-${mIdx}`}
																	checked={ !!visitorItem.isWinner }
																	onChange={ event => handleWrestlerChange(mIdx, false, "isWinner", false, event.target.checked) }
																/>
																<span style={{ fontSize: "11px", fontWeight: "600", color: visitorItem.isWinner ? "var(--secondary)" : "var(--outline)" }}>Win</span>
															</label>
														</div>
													</div>
													
													<div className="stats-col">
														<div className="stat-boxes-group">
															{/* Takedowns Column */}
															<div className="stat-box">
																<span className="stat-label">T</span>
																<input 
																	type="number" 
																	className="stat-input visitor" 
																	value={ visitorItem.takedowns || 0 } 
																	onChange={ event => handleWrestlerChange(mIdx, false, "takedowns", true, event.target.value) }
																/>
															</div>
															
															{/* Nearfalls Column */}
															<div className="stat-box">
																<span className="stat-label">N</span>
																<input 
																	type="number" 
																	className="stat-input visitor" 
																	value={ visitorItem.nearfalls || 0 } 
																	onChange={ event => handleWrestlerChange(mIdx, false, "nearfalls", true, event.target.value) }
																/>
															</div>

															{/* Reversals Column */}
															<div className="stat-box">
																<span className="stat-label">R</span>
																<input 
																	type="number" 
																	className="stat-input visitor" 
																	value={ visitorItem.reversals || 0 } 
																	onChange={ event => handleWrestlerChange(mIdx, false, "reversals", true, event.target.value) }
																/>
															</div>

															{/* Escapes Column */}
															<div className="stat-box">
																<span className="stat-label">E</span>
																<input 
																	type="number" 
																	className="stat-input visitor" 
																	value={ visitorItem.escapes || 0 } 
																	onChange={ event => handleWrestlerChange(mIdx, false, "escapes", true, event.target.value) }
																/>
															</div>
														</div>
													</div>
												</div>

											</div>
											
											{/* Responsive Unified Delete Column */}
											<div className="btn-delete-row-wrap">
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

							
							<div className="scoresheet-header">
								<div className="scoresheet-actions">
									{matches.length < 14 && (
										<button 
											type="button"
											className="btn-add-row" 
											onClick={ handleAddWeightClass }
										>
											+ Add Weight Class
										</button>
									)}
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
