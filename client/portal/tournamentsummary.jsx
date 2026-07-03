import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/tournamentsummary.css";

const TournamentSummary = () => {
	const [pageActive, setPageActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loggedInUser, setLoggedInUser] = useState(null);
	const [event, setEvent] = useState(null);
	const [selectedDivision, setSelectedDivision] = useState("");

	// Read event ID from query parameters
	const queryParams = new URLSearchParams(window.location.search);
	const eventId = queryParams.get("id");

	useEffect(() => {
		if (eventId) {
			fetch(`/api/eventdetailsload?id=${eventId}`)
				.then(response => {
					if (response.ok) {
						return response.json();
					} else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setEvent(data.event);
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);

					// Determine available divisions and set default selected
					const matches = data.event?.matches || [];
					const uniqueDivs = Array.from(new Set(matches.map(m => m.division || "Varsity"))).filter(Boolean);
					setSelectedDivision(uniqueDivs.includes("Varsity") ? "Varsity" : (uniqueDivs[0] || "Varsity"));
				})
				.catch(error => {
					console.warn(error);
					setIsLoading(false);
				});
		} else {
			setIsLoading(false);
		}
	}, [eventId]);

	if (isLoading) {
		return (
			<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", width: "100vw", backgroundColor: "#ffffff" }}>
				<img src="/media/wrestlingloading.gif" alt="Loading..." />
			</div>
		);
	}

	if (!loggedInUser || !loggedInUser.privileges || (!loggedInUser.privileges.includes("scheduleView") && !loggedInUser.privileges.includes("scheduleManage"))) {
		return (
			<div className="page">
				<Nav loggedInUser={loggedInUser} />
				<div className="noAccess">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
						<path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/>
					</svg>
					<a>Unauthorized</a>
				</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="page">
				<Nav loggedInUser={loggedInUser} />
				<div className="container">
					<div className="emptyState">
						<h3>No event details could be found.</h3>
						<a href="/portal/schedule.html">Return to Schedule</a>
					</div>
				</div>
			</div>
		);
	}

	const matches = event.matches || [];

	// Get all unique divisions in matches list
	const uniqueDivisions = Array.from(new Set(matches.map(m => m.division || "Varsity"))).filter(Boolean);

	// Filter matches based on selected division
	const filteredMatches = matches.filter(m => (m.division || "Varsity") === selectedDivision);

	// Calculate counts for KPI summary
	const uniqueWtClasses = Array.from(new Set(filteredMatches.map(m => m.weightClass))).filter(Boolean);
	const wtClassesCount = uniqueWtClasses.length;

	const teamsSet = new Set();
	filteredMatches.forEach(m => {
		if (m.winner?.team) teamsSet.add(m.winner.team);
		if (m.loser?.team) teamsSet.add(m.loser.team);
	});
	const teamsCount = teamsSet.size;

	const wrestlersSet = new Set();
	filteredMatches.forEach(m => {
		if (m.winner?.wrestlerSqlId) wrestlersSet.add(m.winner.wrestlerSqlId);
		if (m.loser?.wrestlerSqlId) wrestlersSet.add(m.loser.wrestlerSqlId);
	});
	const wrestlersCount = wrestlersSet.size;

	// Calculate ratings for Intensity Curve
	const ratings = [];
	filteredMatches.forEach(m => {
		if (m.winner && typeof m.winner.rating === "number" && m.winner.rating > 0) ratings.push(m.winner.rating);
		if (m.loser && typeof m.loser.rating === "number" && m.loser.rating > 0) ratings.push(m.loser.rating);
	});

	const minGlicko = ratings.length > 0 ? Math.min(...ratings) : 800;
	const maxGlicko = ratings.length > 0 ? Math.max(...ratings) : 2100;
	const avgGlicko = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 1450;

	// Generate SVG normal distribution curve (separate open line and closed area paths)
	const range = maxGlicko - minGlicko || 1;
	const stdDev = range / 6 || 100;
	const points = [];
	for (let i = 0; i <= 50; i++) {
		const xVal = i * 6; // 0 to 300
		const rating = minGlicko + (i / 50) * range;
		const exponent = -Math.pow(rating - avgGlicko, 2) / (2 * Math.pow(stdDev, 2));
		const yVal = Math.exp(exponent);
		const yPos = 110 - yVal * 80; // peak height 80, baseline 110
		points.push(`${xVal},${yPos}`);
	}
	const lineD = `M ${points.join(" L ")}`;
	const areaD = `M 0,110 L ${points.join(" L ")} L 300,110 Z`;
	const avgPct = (avgGlicko - minGlicko) / range;
	const peakX = avgPct * 300;
	const peakY = 110 - 80;

	// Calculate top 10% threshold of ratings for the overall event
	const allEventRatings = [];
	matches.forEach(m => {
		if (m.winner && typeof m.winner.rating === "number" && m.winner.rating > 0) allEventRatings.push(m.winner.rating);
		if (m.loser && typeof m.loser.rating === "number" && m.loser.rating > 0) allEventRatings.push(m.loser.rating);
	});
	allEventRatings.sort((a, b) => b - a);
	const top10Index = Math.floor(allEventRatings.length * 0.1);
	const top10PercentThreshold = allEventRatings.length > 0 ? allEventRatings[top10Index] : 0;

	// Calculate Insights
	// 1. Upsets: Winner rating < Loser rating - Loser deviation, sorted by Glicko difference descending, limited to top 5 (excludes forfeits/NC)
	const upsets = filteredMatches.filter(m => 
		m.winner?.rating && 
		m.loser?.rating && 
		m.winner.rating < m.loser.rating - (m.loser.deviation || 0) &&
		!(m.winType && (m.winType.toLowerCase().includes("for") || m.winType.toLowerCase() === "nc"))
	);
	upsets.sort((a, b) => (b.loser.rating - b.winner.rating) - (a.loser.rating - a.winner.rating));
	const topUpsets = upsets.slice(0, 5);

	// 2. Key Matches: Both wrestlers in top 10% rating for event, sorted by rating sum descending, limited to top 5 (excludes forfeits/NC)
	const keyMatches = filteredMatches.filter(m => 
		m.winner?.rating && 
		m.loser?.rating && 
		m.winner.rating >= top10PercentThreshold && 
		m.loser.rating >= top10PercentThreshold &&
		!upsets.includes(m) &&
		!(m.winType && (m.winType.toLowerCase().includes("for") || m.winType.toLowerCase() === "nc"))
	);
	keyMatches.sort((a, b) => (b.winner.rating + b.loser.rating) - (a.winner.rating + a.loser.rating));
	const topKeyMatches = keyMatches.slice(0, 5);

	// Calculate Familiar Faces (teams in filtered matches that exist in event.familiarTeams schools collection)
	const teamWrestlers = {};
	filteredMatches.forEach(m => {
		if (m.winner?.team && m.winner?.wrestlerSqlId) {
			if (!teamWrestlers[m.winner.team]) teamWrestlers[m.winner.team] = new Set();
			teamWrestlers[m.winner.team].add(m.winner.wrestlerSqlId);
		}
		if (m.loser?.team && m.loser?.wrestlerSqlId) {
			if (!teamWrestlers[m.loser.team]) teamWrestlers[m.loser.team] = new Set();
			teamWrestlers[m.loser.team].add(m.loser.wrestlerSqlId);
		}
	});

	const familiarTeamsSet = new Set((event.familiarTeams || []).map(t => t.toLowerCase().trim()));

	const familiarFaces = Object.entries(teamWrestlers)
		.map(([team, wrestlerSet]) => ({ team, count: wrestlerSet.size }))
		.filter(face => familiarTeamsSet.has(face.team.toLowerCase().trim()))
		.sort((a, b) => b.count - a.count);

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUser} />

			<div className={`container ${pageActive ? "active" : ""}`}>
				{/* Header */}
				<header className="header">
					<h1 className="title">{event.name}</h1>
					{uniqueDivisions.length > 1 && (
						<div className="selectorContainer">
							<select
								className="divisionDropdown"
								value={selectedDivision}
								onChange={(e) => setSelectedDivision(e.target.value)}
							>
								{uniqueDivisions.map((div, idx) => (
									<option key={idx} value={div}>{div}</option>
								))}
							</select>
						</div>
					)}
				</header>

				{/* KPI summary cards */}
				<section className="kpis">
					<div className="kpiCard">
						<div className="kpiIcon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polygon points="12 2 22 8.5 2 8.5" />
								<rect x="3" y="14" width="7" height="7" />
								<circle cx="17.5" cy="17.5" r="3.5" />
							</svg>
						</div>
						<div className="kpiBody">
							<span className="kpiVal">{uniqueDivisions.length}</span>
							<span className="kpiLbl">DIVISIONS</span>
						</div>
					</div>
					<div className="kpiCard">
						<div className="kpiIcon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M12 3v18M12 7l-8-2M12 7l8-2M4 5v4a4 4 0 0 0 8 0V5M20 5v4a4 4 0 0 1-8 0V5M4 19h16" />
							</svg>
						</div>
						<div className="kpiBody">
							<span className="kpiVal">{wtClassesCount}</span>
							<span className="kpiLbl">WT CLASSES</span>
						</div>
					</div>
					<div className="kpiCard">
						<div className="kpiIcon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						</div>
						<div className="kpiBody">
							<span className="kpiVal">{teamsCount}</span>
							<span className="kpiLbl">TEAMS</span>
						</div>
					</div>
					<div className="kpiCard">
						<div className="kpiIcon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
								<circle cx="12" cy="7" r="4" />
							</svg>
						</div>
						<div className="kpiBody">
							<span className="kpiVal">{wrestlersCount}</span>
							<span className="kpiLbl">WRESTLERS</span>
						</div>
					</div>
				</section>

				{/* Tournament Intensity Card */}
				<section className="intensitySection">
					<div className="intensityCard">
						<h3 className="intensityTitle">Tournament Intensity</h3>
						<div className="intensityStats">
							<span className="intensityVal">{avgGlicko.toFixed(0)}</span>
							<span className="intensityLbl">AVG GLICKO</span>
						</div>
						<div className="curveContainer">
							<svg viewBox="0 0 300 120" className="curveSvg">
								<defs>
									<linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="#fd8b00" stopOpacity="0.4" />
										<stop offset="100%" stopColor="#fd8b00" stopOpacity="0.0" />
									</linearGradient>
								</defs>
								{/* Shaded Area under Curve (closed path) */}
								<path d={areaD} fill="url(#curveGradient)" />
								{/* Curve Path (open path without bottom baseline stroke) */}
								<path d={lineD} fill="none" stroke="#fd8b00" strokeWidth="2.5" />
								{/* Average Marker dashed line */}
								<line
									x1={peakX}
									y1="110"
									x2={peakX}
									y2={peakY}
									stroke="#3c5c93"
									strokeWidth="1.5"
									strokeDasharray="3 3"
								/>
								{/* Axis labels */}
								<text x="5" y="118" fontSize="8" fill="#757687" textAnchor="start">
									{minGlicko.toFixed(0)} (Min)
								</text>
								<text x={peakX} y="118" fontSize="8" fill="#3c5c93" textAnchor="middle" fontWeight="bold">
									{avgGlicko.toFixed(0)} (Avg)
								</text>
								<text x="295" y="118" fontSize="8" fill="#757687" textAnchor="end">
									{maxGlicko.toFixed(0)} (Max)
								</text>
							</svg>
						</div>
					</div>
				</section>

				{/* Insights section */}
				<section className="insightsSection">
					<h2 className="sectionTitle">Insights</h2>
					{topUpsets.length === 0 && topKeyMatches.length === 0 ? (
						<div className="emptyState">No insights found for this division.</div>
					) : (
						<div className="insightsList">
							{topUpsets.map((match, idx) => (
								<div className="insightCard upset" key={`upset-${idx}`}>
									<div className="insightHeader">
										<span className="insightTag upset">MAJOR UPSET</span>
									</div>
									<div className="insightMatchup">
										<div className="wrestler win">
											<span className="wrestlerName">W: {match.winner.name}</span>
											<span className="wrestlerGlicko">Glicko: {match.winner.rating?.toFixed(0)}</span>
										</div>
										<span className="vs">{match.winType}</span>
										<div className="wrestler">
											<span className="wrestlerName">{match.loser.name}</span>
											<span className="wrestlerGlicko">Glicko: {match.loser.rating?.toFixed(0)}</span>
										</div>
									</div>
									<div className="matchMeta">
										{match.division || "Varsity"} • {isNaN(match.weightClass) ? match.weightClass : `${match.weightClass} lbs`} • {match.roundName || "N/A"}
									</div>
								</div>
							))}
							{topKeyMatches.map((match, idx) => (
								<div className="insightCard keyMatchup" key={`key-${idx}`}>
									<div className="insightHeader">
										<span className="insightTag matchup">KEY MATCHUP</span>
									</div>
									<div className="insightMatchup">
										<div className="wrestler win">
											<span className="wrestlerName">W: {match.winner.name}</span>
											<span className="wrestlerGlicko">Glicko: {match.winner.rating?.toFixed(0)}</span>
										</div>
										<span className="vs">{match.winType}</span>
										<div className="wrestler">
											<span className="wrestlerName">{match.loser.name}</span>
											<span className="wrestlerGlicko">Glicko: {match.loser.rating?.toFixed(0)}</span>
										</div>
									</div>
									<div className="matchMeta">
										{match.division || "Varsity"} • {isNaN(match.weightClass) ? match.weightClass : `${match.weightClass} lbs`} • {match.roundName || "N/A"}
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				{/* Familiar Faces section */}
				<section className="facesSection">
					<h2 className="sectionTitle">Familiar Faces</h2>
					{familiarFaces.length === 0 ? (
						<div className="emptyState">No matching school teams found in this division.</div>
					) : (
						<div className="facesList">
							{familiarFaces.map((face, idx) => (
								<div className="faceRow" key={idx}>
									<div className="faceInfo">
										<span className="faceSchool">{face.team}</span>
										<span className="faceWrestlers">{face.count} Wrestlers</span>
									</div>
									<div className="faceIcon">
										<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
											<path d="M22 10v6M2 10l10-5 10 5-10 5z" />
											<path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
										</svg>
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			</div>

			{/* Sticky Bottom Navigation Bar */}
			<div className="bottomNav">
				<div className="navItem active">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<line x1="9" y1="3" x2="9" y2="21" />
						<line x1="15" y1="3" x2="15" y2="21" />
						<line x1="3" y1="9" x2="21" y2="9" />
						<line x1="3" y1="15" x2="21" y2="15" />
					</svg>
					<span>Overview</span>
				</div>
				<div className="navItem">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
					<span>Teams</span>
				</div>
				<div className="navItem">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M12 3v18M12 7l-8-2M12 7l8-2M4 5v4a4 4 0 0 0 8 0V5M20 5v4a4 4 0 0 1-8 0V5M4 19h16" />
					</svg>
					<span>Weight Classes</span>
				</div>
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<TournamentSummary />);
export default TournamentSummary;
