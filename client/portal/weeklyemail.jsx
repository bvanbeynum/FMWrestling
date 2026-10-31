import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/weeklyemail.css";

const WeeklyEmailPage = () => {
	const [ isLoading, setIsLoading ] = useState(true);
	const [ isWeekReloading, setIsWeekReloading ] = useState(false);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ loadErrorMessage, setLoadErrorMessage ] = useState("");
	const [ statusBannerMessage, setStatusBannerMessage ] = useState("");

	// Google OAuth Connection State
	const [ isGoogleConnected, setIsGoogleConnected ] = useState(false);
	const [ googleAccountEmail, setGoogleAccountEmail ] = useState("");
	const [ isConnectingGoogle, setIsConnectingGoogle ] = useState(false);

	// Loaded Weekly Stats & Contacts
	const [ parentEmails, setParentEmails ] = useState([]);
	const [ selectedWeekEndDate, setSelectedWeekEndDate ] = useState("");
	const [ loadDateFormatted, setLoadDateFormatted ] = useState("");
	const [ loadDateLongFormatted, setLoadDateLongFormatted ] = useState("");
	const [ coachStats, setCoachStats ] = useState({
		rivalry: [],
		toughTournaments: [],
		showdowns: [],
		upsets: [],
		heatMap: [],
		breakout: [],
		bonus: [],
		forgedFire: [],
		grinder: [],
		ironman: []
	});
	const [ parentStats, setParentStats ] = useState({
		upcomingEvents: {
			varsity: [],
			jv: [],
			ms: [],
			girls: []
		},
		dualResults: [],
		placers: [],
		ironman: [],
		forgedFire: [],
		grinder: [],
		breakout: [],
		bonus: []
	});

	// View Navigation State
	const [ mainStatsTab, setMainStatsTab ] = useState("parent");
	const [ activeEmailAudience, setActiveEmailAudience ] = useState(null);

	// Recipient Selection State
	const [ activeFilterTab, setActiveFilterTab ] = useState("active");
	const [ selectedGrades, setSelectedGrades ] = useState([]);
	const [ isGradeFilterDropdownOpen, setIsGradeFilterDropdownOpen ] = useState(false);
	const [ selectedFlagFilter, setSelectedFlagFilter ] = useState("All");
	const [ searchQuery, setSearchQuery ] = useState("");
	const [ selectedRecipientEmails, setSelectedRecipientEmails ] = useState([]);

	// Additional Inputs State (Title + Text Block items)
	const [ additionalInputs, setAdditionalInputs ] = useState([
		{ title: "", content: "" }
	]);

	// AI Email Generation & Editor State
	const [ isGeneratingEmail, setIsGeneratingEmail ] = useState(false);
	const [ hasGeneratedEmail, setHasGeneratedEmail ] = useState(false);
	const [ emailSubject, setEmailSubject ] = useState("");
	const [ emailHtmlContent, setEmailHtmlContent ] = useState("");
	const [ emailTemplateCss, setEmailTemplateCss ] = useState("");
	const [ isSendingEmail, setIsSendingEmail ] = useState(false);
	const editorContainerRef = useRef(null);

	// Build selectable week options up to 1 year (52 weeks) previous
	const currentTodayDate = new Date();
	const selectableWeekOptions = [];

	const currentYearText = String(currentTodayDate.getFullYear());
	const currentMonthText = String(currentTodayDate.getMonth() + 1).padStart(2, "0");
	const currentDayText = String(currentTodayDate.getDate()).padStart(2, "0");
	const todayIsoValue = `${currentYearText}-${currentMonthText}-${currentDayText}`;

	if (currentTodayDate.getDay() !== 0) {
		const rollingStartDate = new Date(
			currentTodayDate.getFullYear(),
			currentTodayDate.getMonth(),
			currentTodayDate.getDate() - 6
		);
		const rollingStartLabel = `${String(rollingStartDate.getMonth() + 1).padStart(2, "0")}/${String(rollingStartDate.getDate()).padStart(2, "0")}/${rollingStartDate.getFullYear()}`;
		const rollingEndLabel = `${currentMonthText}/${currentDayText}/${currentYearText}`;
		selectableWeekOptions.push({
			value: todayIsoValue,
			label: `Current 7 Days (${rollingStartLabel} – ${rollingEndLabel})`
		});
	}

	const mostRecentSunday = new Date(
		currentTodayDate.getFullYear(),
		currentTodayDate.getMonth(),
		currentTodayDate.getDate() - currentTodayDate.getDay()
	);

	for (let weekOffset = 0; weekOffset <= 52; weekOffset++) {
		const weekEndSunday = new Date(
			mostRecentSunday.getFullYear(),
			mostRecentSunday.getMonth(),
			mostRecentSunday.getDate() - (weekOffset * 7)
		);
		const weekStartMonday = new Date(
			weekEndSunday.getFullYear(),
			weekEndSunday.getMonth(),
			weekEndSunday.getDate() - 6
		);

		const endYearValue = String(weekEndSunday.getFullYear());
		const endMonthValue = String(weekEndSunday.getMonth() + 1).padStart(2, "0");
		const endDayValue = String(weekEndSunday.getDate()).padStart(2, "0");
		const weekEndIso = `${endYearValue}-${endMonthValue}-${endDayValue}`;

		const startMonthValue = String(weekStartMonday.getMonth() + 1).padStart(2, "0");
		const startDayValue = String(weekStartMonday.getDate()).padStart(2, "0");
		const startYearValue = String(weekStartMonday.getFullYear());

		selectableWeekOptions.push({
			value: weekEndIso,
			label: `Week of ${startMonthValue}/${startDayValue}/${startYearValue} – ${endMonthValue}/${endDayValue}/${endYearValue}`
		});
	}

	// Shared de-duplicated loader for initial load and week selection changes
	const loadWeeklyStatsForDate = (targetWeekEndDate, isInitialLoad) => {
		if (isInitialLoad) {
			setIsLoading(true);
		} else {
			setIsWeekReloading(true);
		}
		setLoadErrorMessage("");

		const requestUrl = targetWeekEndDate
			? `/api/weeklyemailload?weekenddate=${encodeURIComponent(targetWeekEndDate)}`
			: "/api/weeklyemailload";

		fetch(requestUrl)
			.then(response => response.json())
			.then(responseData => {
				if (responseData.error) {
					setLoadErrorMessage(responseData.error);
				} else {
					setLoggedInUser(responseData.loggedInUser || null);
					setParentEmails(responseData.parentEmails || []);
					setIsGoogleConnected(Boolean(responseData.googleConnected));
					setGoogleAccountEmail(responseData.googleEmail || "");
					setSelectedWeekEndDate(responseData.selectedWeekEndDate || targetWeekEndDate || todayIsoValue);
					setLoadDateFormatted(responseData.loadDateFormatted || "");
					setLoadDateLongFormatted(responseData.loadDateLongFormatted || "");
					if (responseData.coachStats) {
						setCoachStats(responseData.coachStats);
					}
					if (responseData.parentStats) {
						setParentStats(responseData.parentStats);
					}
				}
				setIsLoading(false);
				setIsWeekReloading(false);
			})
			.catch(error => {
				setLoadErrorMessage(error.message);
				setIsLoading(false);
				setIsWeekReloading(false);
			});
	};

	useEffect(() => {
		loadWeeklyStatsForDate("", true);

		const handleAuthWindowMessage = (messageEvent) => {
			if (messageEvent.data && (messageEvent.data.success || messageEvent.data.googleEmail)) {
				setIsGoogleConnected(true);
				setGoogleAccountEmail(messageEvent.data.googleEmail || "Connected Google Account");
				setIsConnectingGoogle(false);
			} else if (messageEvent.data && messageEvent.data.error) {
				alert(`Google Authentication error: ${messageEvent.data.error}`);
				setIsConnectingGoogle(false);
			}
		};

		window.addEventListener("message", handleAuthWindowMessage);
		return () => {
			window.removeEventListener("message", handleAuthWindowMessage);
		};
	}, []);

	useEffect(() => {
		if (hasGeneratedEmail && editorContainerRef.current && emailHtmlContent !== editorContainerRef.current.innerHTML) {
			editorContainerRef.current.innerHTML = emailHtmlContent;
		}
	}, [ hasGeneratedEmail, emailHtmlContent ]);

	const hasParentManagePrivilege = loggedInUser && loggedInUser.privileges && (
		loggedInUser.privileges.includes("parentManage") ||
		loggedInUser.privileges.includes("parentmanage") ||
		loggedInUser.privileges.some(privilegeItem => (privilegeItem.token === "parentManage" || privilegeItem.name === "parentManage"))
	);

	// Shared de-duplicated helper to open the email management view for either audience
	const openAudienceEmailView = (audienceChoice) => {
		setActiveEmailAudience(audienceChoice);
		setSelectedRecipientEmails([]);
		setActiveFilterTab("active");
		setSelectedGrades([]);
		setIsGradeFilterDropdownOpen(false);
		setSelectedFlagFilter("All");
		setSearchQuery("");
		setAdditionalInputs([ { title: "", content: "" } ]);
		setHasGeneratedEmail(false);
		setIsGeneratingEmail(false);
		setEmailHtmlContent("");
		setEmailTemplateCss("");
		setEmailSubject(
			audienceChoice === "coach"
				? `Weekly Email Analysis - ${loadDateFormatted}`
				: `FM Wrestling Weekly Email - ${loadDateFormatted}`
		);
	};

	// Shared de-duplicated CSS inliner using native DOMParser + querySelectorAll
	const applyInlineStylesToEmailHtml = (rawHtmlInput, fallbackCssContent) => {
		if (!rawHtmlInput) return "";
		try {
			const htmlParser = new DOMParser();
			const parsedDocument = htmlParser.parseFromString(rawHtmlInput, "text/html");

			const extractedCssBlocks = [];
			const styleElements = parsedDocument.querySelectorAll("style");
			styleElements.forEach(styleElement => {
				if (styleElement.textContent && styleElement.textContent.trim()) {
					extractedCssBlocks.push(styleElement.textContent.trim());
				}
				styleElement.remove();
			});

			if (fallbackCssContent && fallbackCssContent.trim() && extractedCssBlocks.length === 0) {
				extractedCssBlocks.push(fallbackCssContent.trim());
			} else if (fallbackCssContent && fallbackCssContent.trim() && !extractedCssBlocks.join("\n").includes(fallbackCssContent.trim().slice(0, 40))) {
				extractedCssBlocks.unshift(fallbackCssContent.trim());
			}

			const fullCssContent = extractedCssBlocks.join("\n\n");
			const cssWithoutComments = fullCssContent.replace(/\/\*[\s\S]*?\*\//g, "");
			const cssWithoutMediaQueries = cssWithoutComments.replace(/@media[^{]+\{([\s\S]*?\})\s*\}/gi, "");

			let bodyWrapperDeclarations = "";
			const cssRulePattern = /([^{}]+)\{([^{}]+)\}/g;
			let matchedRule = cssRulePattern.exec(cssWithoutMediaQueries);

			while (matchedRule !== null) {
				const rawSelectorsGroup = matchedRule[1].trim();
				const ruleDeclarations = matchedRule[2].trim().replace(/\s+/g, " ");

				if (rawSelectorsGroup && ruleDeclarations && !rawSelectorsGroup.startsWith("@")) {
					const individualSelectors = rawSelectorsGroup.split(",").map(selectorPart => selectorPart.trim()).filter(Boolean);

					for (const singleSelector of individualSelectors) {
						if (singleSelector.toLowerCase() === "body") {
							bodyWrapperDeclarations = bodyWrapperDeclarations
								? `${bodyWrapperDeclarations}; ${ruleDeclarations}`
								: ruleDeclarations;
							continue;
						}

						if (singleSelector.includes(":hover")) {
							continue;
						}

						try {
							const matchingNodes = parsedDocument.body.querySelectorAll(singleSelector);
							matchingNodes.forEach(targetElement => {
								const existingInlineStyle = (targetElement.getAttribute("style") || "").trim();
								const mergedProperties = {};

								ruleDeclarations.split(";").forEach(declarationItem => {
									const colonIndex = declarationItem.indexOf(":");
									if (colonIndex > 0) {
										const propertyName = declarationItem.slice(0, colonIndex).trim().toLowerCase();
										const propertyValue = declarationItem.slice(colonIndex + 1).trim();
										if (propertyName && propertyValue) {
											mergedProperties[propertyName] = propertyValue;
										}
									}
								});

								existingInlineStyle.split(";").forEach(declarationItem => {
									const colonIndex = declarationItem.indexOf(":");
									if (colonIndex > 0) {
										const propertyName = declarationItem.slice(0, colonIndex).trim().toLowerCase();
										const propertyValue = declarationItem.slice(colonIndex + 1).trim();
										if (propertyName && propertyValue) {
											mergedProperties[propertyName] = propertyValue;
										}
									}
								});

								const serializedStyle = Object.entries(mergedProperties)
									.map(([ propertyName, propertyValue ]) => `${propertyName}: ${propertyValue}`)
									.join("; ");

								if (serializedStyle) {
									targetElement.setAttribute("style", `${serializedStyle};`);
								}
							});
						} catch (selectorError) {
							// Ignore unsupported pseudo-selectors
						}
					}
				}

				matchedRule = cssRulePattern.exec(cssWithoutMediaQueries);
			}

			const existingRootWrapper = parsedDocument.body.querySelector(".weekly-email-body-root");
			if (existingRootWrapper && bodyWrapperDeclarations) {
				const currentWrapperStyle = (existingRootWrapper.getAttribute("style") || "").trim();
				if (!currentWrapperStyle) {
					existingRootWrapper.setAttribute("style", bodyWrapperDeclarations);
				}
			}

			const bodyInnerMarkup = existingRootWrapper
				? parsedDocument.body.innerHTML
				: `<div class="weekly-email-body-root" style="${bodyWrapperDeclarations}">${parsedDocument.body.innerHTML}</div>`;

			const preservedStyleBlock = fullCssContent
				? `<style>${fullCssContent}</style>`
				: "";

			return `${preservedStyleBlock}${bodyInnerMarkup}`;
		} catch (inlineError) {
			return rawHtmlInput;
		}
	};

	// Shared de-duplicated rich text command handler
	const executeEditorFormatting = (commandName) => {
		document.execCommand(commandName, false, null);
		if (editorContainerRef.current) {
			setEmailHtmlContent(editorContainerRef.current.innerHTML);
		}
	};

	// Shared de-duplicated handler to generate or regenerate the email via Gemini AI
	const triggerEmailGeneration = () => {
		setIsGeneratingEmail(true);
		fetch("/api/weeklyemailgenerate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				audienceType: activeEmailAudience,
				stats: {
					coachStats: coachStats,
					parentStats: parentStats,
					loadDateFormatted: loadDateFormatted,
					loadDateLongFormatted: loadDateLongFormatted
				},
				additionalInputs: additionalInputs
			})
		})
			.then(response => response.json())
			.then(responseData => {
				setIsGeneratingEmail(false);
				if (responseData.error) {
					alert(`AI Generation error: ${responseData.error}`);
				} else {
					const activeCss = responseData.css || "";
					setEmailTemplateCss(activeCss);
					const inlinedHtml = applyInlineStylesToEmailHtml(responseData.html || "", activeCss);
					setEmailHtmlContent(inlinedHtml);
					if (responseData.subject) {
						setEmailSubject(responseData.subject);
					}
					setHasGeneratedEmail(true);
				}
			})
			.catch(error => {
				setIsGeneratingEmail(false);
				alert(`AI Generation failed: ${error.message}`);
			});
	};

	// Shared de-duplicated stat table renderer used across all Parent & Coach stat datasets
	const renderStatTable = (tableRows, tableColumns, emptyMessageText) => {
		if (!tableRows || tableRows.length === 0) {
			return <div className="stat-empty-note">{emptyMessageText || "No records for the past week."}</div>;
		}
		return (
			<div className="stat-table-wrapper">
				<table className="stat-table">
					<thead>
						<tr>
							{tableColumns.map(columnDefinition => (
								<th key={columnDefinition.key}>{columnDefinition.label}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{tableRows.map((rowRecord, rowIndex) => (
							<tr key={rowIndex}>
								{tableColumns.map(columnDefinition => (
									<td key={columnDefinition.key}>
										{rowRecord[columnDefinition.key] !== undefined && rowRecord[columnDefinition.key] !== null
											? rowRecord[columnDefinition.key]
											: ""}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	// Additive Recipient Filtering Logic (matching aiemail.jsx)
	const filteredParentRecords = parentEmails.filter(parentRecord => {
		if (activeFilterTab !== "all" && parentRecord.status !== activeFilterTab) {
			return false;
		}

		if (selectedGrades.length > 0) {
			const hasMatchingGradeWrestler = (parentRecord.wrestlers || []).some(wrestlerItem => {
				const gradeText = String(wrestlerItem.grade || "").trim();
				return selectedGrades.some(targetGrade => (
					gradeText === targetGrade ||
					gradeText.toLowerCase() === targetGrade.toLowerCase() ||
					gradeText === `${targetGrade}th` ||
					gradeText.toLowerCase() === `${targetGrade}th`
				));
			});
			if (!hasMatchingGradeWrestler) return false;
		}

		if (selectedFlagFilter !== "All") {
			if (selectedFlagFilter === "coach") {
				if (parentRecord.isCoach !== true) return false;
			} else {
				const hasMatchingFlagWrestler = (parentRecord.wrestlers || []).some(wrestlerItem => {
					if (selectedFlagFilter === "varsity") return wrestlerItem.isVarsity === true;
					if (selectedFlagFilter === "jv") return wrestlerItem.isJV === true;
					if (selectedFlagFilter === "middle") return wrestlerItem.isMiddle === true;
					return true;
				});
				if (!hasMatchingFlagWrestler) return false;
			}
		}

		if (searchQuery.trim().length > 0) {
			const searchLower = searchQuery.toLowerCase();
			const matchesParentName = (parentRecord.name || "").toLowerCase().includes(searchLower);
			const matchesEmailAddress = (parentRecord.email || "").toLowerCase().includes(searchLower);
			const matchesWrestlerName = (parentRecord.wrestlers || []).some(
				wrestlerItem => (wrestlerItem.name || "").toLowerCase().includes(searchLower)
			);
			return matchesParentName || matchesEmailAddress || matchesWrestlerName;
		}

		return true;
	});

	const allFilteredEmails = filteredParentRecords.map(parentRecord => parentRecord.email).filter(Boolean);
	const isAllFilteredSelected = allFilteredEmails.length > 0 && allFilteredEmails.every(
		emailAddress => selectedRecipientEmails.includes(emailAddress)
	);

	const upcomingScheduleColumns = [
		{ key: "date", label: "Date" },
		{ key: "time", label: "Time" },
		{ key: "event", label: "Event" },
		{ key: "location", label: "Location" }
	];

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUser} />

			<div style={{ minWidth: 0 }}>
				{isLoading ? (
					<div className="pageLoading">
						<img src="/media/wrestlingloading.gif" alt="Loading..." />
					</div>
				) : !hasParentManagePrivilege ? (
					<div className="noAccess">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
						<a>Unauthorized Access</a>
					</div>
				) : (
					<div className="weeklyemail-container">
						<header className="weeklyemail-header">
							<div>
								<h1>
									{activeEmailAudience === "parent"
										? "Weekly Email — Parent Email"
										: activeEmailAudience === "coach"
										? "Weekly Email — Coach Email"
										: "Weekly Email Coordinator"}
								</h1>
								<div className="weeklyemail-header-subtitle">
									Previous Week Wrestling Stats &bull; {loadDateLongFormatted || loadDateFormatted}
								</div>
							</div>

							{activeEmailAudience === null && (
								<div className="weeklyemail-audience-actions">
									<button
										type="button"
										className="btn-audience-parent"
										onClick={() => openAudienceEmailView("parent")}
									>
										📧 Parent Email
									</button>
									<button
										type="button"
										className="btn-audience-coach"
										onClick={() => openAudienceEmailView("coach")}
									>
										📋 Coach Email
									</button>
								</div>
							)}
						</header>

						{statusBannerMessage && (
							<div className="weeklyemail-status-banner">
								{statusBannerMessage}
							</div>
						)}

						{loadErrorMessage && (
							<div style={{ color: "#ba1a1a", backgroundColor: "#fee2e2", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px" }}>
								Error loading weekly stats: {loadErrorMessage}
							</div>
						)}

						{/* Google Account Status Card */}
						<div className="connection-status-card">
							<div className="connection-info">
								<div className={`status-indicator-dot ${isGoogleConnected ? "connected" : ""}`}></div>
								<div className="connection-text">
									<strong>Google Account:</strong>
									<span>{isGoogleConnected ? googleAccountEmail : "Not Connected"}</span>
								</div>
							</div>

							<div>
								<button
									type="button"
									className="btn-google-connect"
									onClick={() => {
										setIsConnectingGoogle(true);
										window.open("/api/aiemailgoogleauth", "Google OAuth Login", "width=800,height=600");
									}}
									disabled={isConnectingGoogle}
								>
									<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
									{isGoogleConnected ? "Reconnect Google Account" : "Connect Google Account"}
								</button>
							</div>
						</div>

						{activeEmailAudience === null ? (
							/* MAIN VIEW: Display Selected Week Stats */
							<div>
								<div className="stats-view-toolbar">
									<div className="stats-view-tabs">
										<button
											type="button"
											className={`stats-tab-btn ${mainStatsTab === "parent" ? "active" : ""}`}
											onClick={() => setMainStatsTab("parent")}
										>
											Parent Weekly Stats
										</button>
										<button
											type="button"
											className={`stats-tab-btn ${mainStatsTab === "coach" ? "active" : ""}`}
											onClick={() => setMainStatsTab("coach")}
										>
											Coach Weekly Stats
										</button>
									</div>

									<div className="week-selector-group">
										<label htmlFor="weekly-email-week-select" className="week-selector-label">
											Select Week:
										</label>
										<select
											id="weekly-email-week-select"
											className="week-selector-dropdown"
											value={selectedWeekEndDate}
											disabled={isWeekReloading}
											onChange={(changeEvent) => {
												const chosenWeekEndDate = changeEvent.target.value;
												setSelectedWeekEndDate(chosenWeekEndDate);
												loadWeeklyStatsForDate(chosenWeekEndDate, false);
											}}
										>
											{selectableWeekOptions.map(weekOption => (
												<option key={weekOption.value} value={weekOption.value}>
													{weekOption.label}
												</option>
											))}
										</select>
									</div>
								</div>

								{isWeekReloading ? (
									<div className="week-reloading-box">
										Loading wrestling stats for selected week...
									</div>
								) : mainStatsTab === "parent" ? (
									<div className="stats-grid">
										<div className="stat-card full-width">
											<h3>Upcoming Events (Next 7 Days)</h3>
											<h4>Varsity</h4>
											{renderStatTable(parentStats.upcomingEvents?.varsity, upcomingScheduleColumns, "No upcoming Varsity events scheduled.")}

											<h4>JV</h4>
											{renderStatTable(parentStats.upcomingEvents?.jv, upcomingScheduleColumns, "No upcoming JV events scheduled.")}

											<h4>Middle School</h4>
											{renderStatTable(parentStats.upcomingEvents?.ms, upcomingScheduleColumns, "No upcoming Middle School events scheduled.")}

											<h4>Girls</h4>
											{renderStatTable(parentStats.upcomingEvents?.girls, upcomingScheduleColumns, "No upcoming Girls events scheduled.")}
										</div>

										<div className="stat-card">
											<h3>Dual Results</h3>
											{renderStatTable(
												parentStats.dualResults,
												[
													{ key: "team", label: "Team" },
													{ key: "eventDate", label: "Date" },
													{ key: "opponentName", label: "Opponent" },
													{ key: "fmScore", label: "FM Score" },
													{ key: "oppScore", label: "Opp Score" }
												],
												"No dual results from the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Tournament Placers</h3>
											{renderStatTable(
												parentStats.placers,
												[
													{ key: "division", label: "Division" },
													{ key: "place", label: "Place" },
													{ key: "wrestler", label: "Wrestler" }
												],
												"No tournament placers recorded in the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Ironman (Most Matches)</h3>
											{renderStatTable(
												parentStats.ironman,
												[
													{ key: "division", label: "Division" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "matches", label: "Matches" }
												],
												"No Ironman stats for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Forged in Fire (Toughest Opponents)</h3>
											{renderStatTable(
												parentStats.forgedFire,
												[
													{ key: "division", label: "Division" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "opponents", label: "Opponents" }
												],
												"No Forged in Fire stats for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Grinder (Consolation Matches)</h3>
											{renderStatTable(
												parentStats.grinder,
												[
													{ key: "division", label: "Division" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "consiMatches", label: "Consi Matches" }
												],
												"No Grinder stats for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Breakout Wrestler</h3>
											{renderStatTable(
												parentStats.breakout,
												[
													{ key: "division", label: "Division" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "keyWins", label: "Key Wins" }
												],
												"No Breakout Wrestler stats for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Bonus Points</h3>
											{renderStatTable(
												parentStats.bonus,
												[
													{ key: "division", label: "Division" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "bonusPoints", label: "Bonus Points" }
												],
												"No Bonus Points stats for the past week."
											)}
										</div>
									</div>
								) : (
									<div className="stats-grid">
										<div className="stat-card full-width">
											<h3>Rivalry Watch (5A Regions 1–4)</h3>
											{renderStatTable(
												coachStats.rivalry,
												[
													{ key: "region", label: "Region" },
													{ key: "school", label: "School" },
													{ key: "details", label: "Details" }
												],
												"No 5A rivalry activity recorded in the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Toughest Tournaments</h3>
											{renderStatTable(
												coachStats.toughTournaments,
												[
													{ key: "event", label: "Event" },
													{ key: "wrestlers", label: "Wrestlers" },
													{ key: "topWrestlers", label: "Top Wrestlers" }
												],
												"No tournament data for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Weight Class Heat Map</h3>
											{renderStatTable(
												coachStats.heatMap,
												[
													{ key: "rank", label: "Rank" },
													{ key: "weightClass", label: "Weight Class" },
													{ key: "wrestlers", label: "Wrestlers" },
													{ key: "topRating", label: "Top Rating (80th Pct)" }
												],
												"No weight class heat map data for the past week."
											)}
										</div>

										<div className="stat-card full-width">
											<h3>Showdown Matches</h3>
											{renderStatTable(
												coachStats.showdowns,
												[
													{ key: "rank", label: "Rank" },
													{ key: "weightClass", label: "Weight Class" },
													{ key: "round", label: "Round" },
													{ key: "winner", label: "Winner" },
													{ key: "loser", label: "Loser" },
													{ key: "winType", label: "Win Type" },
													{ key: "event", label: "Event" }
												],
												"No showdown matches recorded in the past week."
											)}
										</div>

										<div className="stat-card full-width">
											<h3>Upset Matches</h3>
											{renderStatTable(
												coachStats.upsets,
												[
													{ key: "rank", label: "Rank" },
													{ key: "weightClass", label: "Weight Class" },
													{ key: "round", label: "Round" },
													{ key: "winner", label: "Winner" },
													{ key: "loser", label: "Loser" },
													{ key: "winType", label: "Win Type" },
													{ key: "event", label: "Event" }
												],
												"No upset matches recorded in the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Breakout Wrestler</h3>
											{renderStatTable(
												coachStats.breakout,
												[
													{ key: "division", label: "Division" },
													{ key: "rank", label: "Rank" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "keyWins", label: "Key Wins" }
												],
												"No Breakout Wrestler stats for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Bonus Points</h3>
											{renderStatTable(
												coachStats.bonus,
												[
													{ key: "division", label: "Division" },
													{ key: "rank", label: "Rank" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "bonusPoints", label: "Bonus Points" }
												],
												"No Bonus Points stats for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Forged in Fire</h3>
											{renderStatTable(
												coachStats.forgedFire,
												[
													{ key: "division", label: "Division" },
													{ key: "rank", label: "Rank" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "opponents", label: "Opponents" }
												],
												"No Forged in Fire stats for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Grinder</h3>
											{renderStatTable(
												coachStats.grinder,
												[
													{ key: "division", label: "Division" },
													{ key: "rank", label: "Rank" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "consiMatches", label: "Consi Matches" }
												],
												"No Grinder stats for the past week."
											)}
										</div>

										<div className="stat-card">
											<h3>Ironman</h3>
											{renderStatTable(
												coachStats.ironman,
												[
													{ key: "division", label: "Division" },
													{ key: "rank", label: "Rank" },
													{ key: "wrestler", label: "Wrestler" },
													{ key: "matches", label: "Matches" }
												],
												"No Ironman stats for the past week."
											)}
										</div>
									</div>
								)}
							</div>
						) : (
							/* EMAIL MANAGEMENT VIEW */
							<div className="email-manager-card">
								{/* 1. Select Recipients Section */}
								<div className="email-section-card">
									<div className="email-section-header">
										<h2>1. Select Recipients</h2>
										<span className="recipients-summary-count">
											{selectedRecipientEmails.length} recipient(s) selected (BCC)
										</span>
									</div>

									<div className="controls-bar">
										<div className="filter-tabs">
											<button
												type="button"
												className={`tab-btn ${activeFilterTab === "active" ? "active" : ""}`}
												onClick={() => setActiveFilterTab("active")}
											>
												Active
											</button>
											<button
												type="button"
												className={`tab-btn ${activeFilterTab === "alumni" ? "active" : ""}`}
												onClick={() => setActiveFilterTab("alumni")}
											>
												Alumni
											</button>
											<button
												type="button"
												className={`tab-btn ${activeFilterTab === "archived" ? "active" : ""}`}
												onClick={() => setActiveFilterTab("archived")}
											>
												Archived
											</button>
											<button
												type="button"
												className={`tab-btn ${activeFilterTab === "all" ? "active" : ""}`}
												onClick={() => setActiveFilterTab("all")}
											>
												All Records
											</button>
										</div>

										<div className="filter-selects-group">
											<div className="multi-select-dropdown-container">
												<button
													type="button"
													className={`multi-select-trigger-btn ${selectedGrades.length > 0 ? "active" : ""}`}
													onClick={() => setIsGradeFilterDropdownOpen(!isGradeFilterDropdownOpen)}
												>
													<span>
														{selectedGrades.length === 0
															? "All Grades"
															: selectedGrades.length === 1
															? `${selectedGrades[0]}th Grade`
															: `${selectedGrades.length} Grades Selected`}
													</span>
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
												</button>

												{isGradeFilterDropdownOpen && (
													<div className="multi-select-popover">
														<div className="multi-select-popover-header">
															<span>Grades (6-12)</span>
															{selectedGrades.length > 0 && (
																<button
																	type="button"
																	className="btn-clear-link"
																	onClick={() => setSelectedGrades([])}
																>
																	Clear
																</button>
															)}
														</div>
														<div className="multi-select-popover-options">
															{[ "6", "7", "8", "9", "10", "11", "12" ].map(gradeOption => {
																const isGradeChecked = selectedGrades.includes(gradeOption);
																return (
																	<label key={gradeOption} className="multi-select-option-item">
																		<input
																			type="checkbox"
																			checked={isGradeChecked}
																			onChange={() => {
																				setSelectedGrades(previousGrades => (
																					previousGrades.includes(gradeOption)
																						? previousGrades.filter(existingGrade => existingGrade !== gradeOption)
																						: [ ...previousGrades, gradeOption ]
																				));
																			}}
																		/>
																		<span>{gradeOption}th Grade</span>
																	</label>
																);
															})}
														</div>
													</div>
												)}
											</div>

											<select
												className="filter-select"
												value={selectedFlagFilter}
												onChange={(changeEvent) => setSelectedFlagFilter(changeEvent.target.value)}
											>
												<option value="All">All Levels</option>
												<option value="coach">Coaches</option>
												<option value="varsity">Varsity (V)</option>
												<option value="jv">Junior Varsity (JV)</option>
												<option value="middle">Middle School (MS)</option>
											</select>
										</div>

										<div className="search-box">
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
											<input
												type="text"
												className="search-input"
												placeholder="Search parent/wrestler name..."
												value={searchQuery}
												onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
											/>
										</div>
									</div>

									<div className="recipients-table-container">
										<table className="recipients-table">
											<thead>
												<tr>
													<th style={{ width: "40px" }}>
														<input
															type="checkbox"
															checked={isAllFilteredSelected}
															onChange={() => {
																if (isAllFilteredSelected) {
																	setSelectedRecipientEmails(previousRecipients =>
																		previousRecipients.filter(emailItem => !allFilteredEmails.includes(emailItem))
																	);
																} else {
																	setSelectedRecipientEmails(previousRecipients => [
																		...new Set([ ...previousRecipients, ...allFilteredEmails ])
																	]);
																}
															}}
														/>
													</th>
													<th>Parent Name</th>
													<th>Email Address</th>
													<th>Wrestlers &amp; Levels</th>
												</tr>
											</thead>
											<tbody>
												{filteredParentRecords.length === 0 ? (
													<tr>
														<td colSpan="4" style={{ textAlign: "center", color: "#757687", padding: "16px" }}>
															No parent records match the current filters.
														</td>
													</tr>
												) : (
													filteredParentRecords.map(parentRecord => {
														const isSelectedRecipient = selectedRecipientEmails.includes(parentRecord.email);
														return (
															<tr key={parentRecord.id || parentRecord.email} className={isSelectedRecipient ? "selected" : ""}>
																<td>
																	<input
																		type="checkbox"
																		checked={isSelectedRecipient}
																		onChange={() => {
																			setSelectedRecipientEmails(previousRecipients => (
																				previousRecipients.includes(parentRecord.email)
																					? previousRecipients.filter(emailItem => emailItem !== parentRecord.email)
																					: [ ...previousRecipients, parentRecord.email ]
																			));
																		}}
																	/>
																</td>
																<td>
																	<strong>{parentRecord.name}</strong>
																	{parentRecord.isCoach && <span className="badge-coach">COACH</span>}
																</td>
																<td>{parentRecord.email}</td>
																<td>
																	{(parentRecord.wrestlers || []).map((wrestlerItem, wrestlerIndex) => (
																		<span key={wrestlerIndex} className="wrestler-pill">
																			{wrestlerItem.name} {wrestlerItem.grade && `(Gr ${wrestlerItem.grade})`}
																		</span>
																	))}
																</td>
															</tr>
														);
													})
												)}
											</tbody>
										</table>
									</div>
								</div>

								{/* 2. Additional Inputs Section */}
								<div className="email-section-card">
									<div className="email-section-header">
										<h2>2. Additional Inputs for AI Prompt</h2>
										<button
											type="button"
											className="btn-add-input"
											onClick={() => setAdditionalInputs(previousInputs => [
												...previousInputs,
												{ title: "", content: "" }
											])}
										>
											+ Add Section
										</button>
									</div>

									<div className="additional-inputs-container">
										{additionalInputs.map((inputEntry, inputIndex) => (
											<div key={inputIndex} className="additional-input-item">
												<div className="additional-input-row-header">
													<input
														type="text"
														className="additional-input-title"
														placeholder="Section Title (e.g. Coach's Corner, Announcements, Volunteer Needs)"
														value={inputEntry.title}
														onChange={(changeEvent) => {
															const updatedTitle = changeEvent.target.value;
															setAdditionalInputs(previousInputs =>
																previousInputs.map((existingEntry, existingIndex) =>
																	existingIndex === inputIndex
																		? { ...existingEntry, title: updatedTitle }
																		: existingEntry
																)
															);
														}}
													/>
													{additionalInputs.length > 1 && (
														<button
															type="button"
															className="btn-remove-input"
															onClick={() => {
																setAdditionalInputs(previousInputs =>
																	previousInputs.filter((_, existingIndex) => existingIndex !== inputIndex)
																);
															}}
														>
															Remove
														</button>
													)}
												</div>

												<textarea
													className="additional-input-textarea"
													placeholder="Enter details or announcements to include in the AI generated email..."
													value={inputEntry.content}
													onChange={(changeEvent) => {
														const updatedContent = changeEvent.target.value;
														setAdditionalInputs(previousInputs =>
															previousInputs.map((existingEntry, existingIndex) =>
																existingIndex === inputIndex
																	? { ...existingEntry, content: updatedContent }
																	: existingEntry
															)
														);
													}}
												/>
											</div>
										))}
									</div>
								</div>

								{/* 3. View / Edit Email Section */}
								<div className="email-section-card">
									<div className="email-section-header">
										<h2>3. View / Edit Email</h2>
										{hasGeneratedEmail && (
											<button
												type="button"
												className="btn-generate-email"
												style={{ padding: "7px 14px", fontSize: "13px" }}
												disabled={isGeneratingEmail}
												onClick={triggerEmailGeneration}
											>
												{isGeneratingEmail ? "Regenerating with Gemini..." : "⚡ Regenerate Email"}
											</button>
										)}
									</div>

									{!hasGeneratedEmail ? (
										<div className="generate-initial-box">
											<p>
												Click below to send the previous week&apos;s {activeEmailAudience === "coach" ? "Coach" : "Parent"} stats
												and your additional inputs to Gemini AI to generate the formatted HTML email.
											</p>
											<button
												type="button"
												className="btn-generate-email"
												disabled={isGeneratingEmail}
												onClick={triggerEmailGeneration}
											>
												{isGeneratingEmail ? "⏳ Generating Email with Gemini AI..." : "⚡ Generate Email"}
											</button>
										</div>
									) : (
										<div className="response-editor-group">
											<label>Subject Line</label>
											<input
												type="text"
												className="subject-input"
												value={emailSubject}
												onChange={(changeEvent) => {
													const cleanedSubject = changeEvent.target.value
														.replace(/[•–—]/g, "-")
														.replace(/[^\x20-\x7E]/g, "");
													setEmailSubject(cleanedSubject);
												}}
											/>

											<label style={{ marginTop: "10px" }}>
												Email Content {isGeneratingEmail && "(Generating with Gemini...)"}
											</label>

											<div className="editor-toolbar">
												<button type="button" className="toolbar-btn" onClick={() => executeEditorFormatting("bold")} title="Bold"><b>B</b></button>
												<button type="button" className="toolbar-btn" onClick={() => executeEditorFormatting("italic")} title="Italic"><i>I</i></button>
												<button type="button" className="toolbar-btn" onClick={() => executeEditorFormatting("insertUnorderedList")} title="Bullet List">&bull; List</button>
												<button type="button" className="toolbar-btn" onClick={() => executeEditorFormatting("insertOrderedList")} title="Numbered List">1. List</button>
											</div>

											<div
												ref={editorContainerRef}
												contentEditable={!isGeneratingEmail}
												className="response-editor-contenteditable"
												onInput={(inputEvent) => setEmailHtmlContent(inputEvent.currentTarget.innerHTML)}
												onBlur={(blurEvent) => setEmailHtmlContent(blurEvent.currentTarget.innerHTML)}
											/>
										</div>
									)}
								</div>

								{/* Footer with Cancel and Send Email Buttons */}
								<footer className="weeklyemail-footer">
									<div className="recipients-summary-count">
										{selectedRecipientEmails.length} recipient(s) selected (BCC)
									</div>

									<div className="footer-action-buttons">
										<button
											type="button"
											className="btn-secondary"
											onClick={() => setActiveEmailAudience(null)}
											disabled={isSendingEmail}
										>
											Cancel
										</button>

										<button
											type="button"
											className="btn-primary"
											disabled={isSendingEmail || isGeneratingEmail || !hasGeneratedEmail || selectedRecipientEmails.length === 0}
											onClick={() => {
												if (selectedRecipientEmails.length === 0) {
													alert("Please select at least one recipient.");
													return;
												}
												const rawCurrentBodyHtml = editorContainerRef.current
													? editorContainerRef.current.innerHTML
													: emailHtmlContent;
												if (!rawCurrentBodyHtml || !rawCurrentBodyHtml.trim()) {
													alert("Please generate or enter an email body before sending.");
													return;
												}
												const styledBodyHtml = applyInlineStylesToEmailHtml(rawCurrentBodyHtml, emailTemplateCss);

												setIsSendingEmail(true);
												fetch("/api/weeklyemailsend", {
													method: "POST",
													headers: { "Content-Type": "application/json" },
													body: JSON.stringify({
														recipients: selectedRecipientEmails,
														subject: emailSubject,
														body: styledBodyHtml
													})
												})
													.then(response => response.json())
													.then(responseData => {
														setIsSendingEmail(false);
														if (responseData.error) {
															alert(`Send error: ${responseData.error}`);
														} else {
															setStatusBannerMessage(
																`Weekly ${activeEmailAudience === "coach" ? "Coach" : "Parent"} email sent to ${selectedRecipientEmails.length} recipient(s)!`
															);
															setActiveEmailAudience(null);
															setTimeout(() => setStatusBannerMessage(""), 6000);
														}
													})
													.catch(error => {
														setIsSendingEmail(false);
														alert(`Failed to send email: ${error.message}`);
													});
											}}
										>
											{isSendingEmail ? "Sending Email..." : "🚀 Send Email"}
										</button>
									</div>
								</footer>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

const rootElement = document.getElementById("root");
if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<WeeklyEmailPage />);
}

export default WeeklyEmailPage;
