import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/aiemail.css";

const AIEmailPage = () => {
	const [ isLoadingBoolean, setIsLoadingBoolean ] = useState(true);
	const [ loggedInUserObject, setLoggedInUserObject ] = useState(null);
	
	// Google OAuth Connection State
	const [ isGoogleConnectedBoolean, setIsGoogleConnectedBoolean ] = useState(false);
	const [ googleAccountEmailString, setGoogleAccountEmailString ] = useState("");
	const [ isConnectingGoogleBoolean, setIsConnectingGoogleBoolean ] = useState(false);

	// Inbox Messages State
	const [ inboxMessagesList, setInboxMessagesList ] = useState([]);
	const [ isInboxLoadingBoolean, setIsInboxLoadingBoolean ] = useState(false);
	const [ inboxErrorString, setInboxErrorString ] = useState("");

	// Parent Emails Directory List (for recipient selection)
	const [ parentEmailsList, setParentEmailsList ] = useState([]);

	// Selected Email & AI Composer Modal State
	const [ selectedEmailObject, setSelectedEmailObject ] = useState(null);
	const [ isComposerOpenBoolean, setIsComposerOpenBoolean ] = useState(false);
	const [ isGeneratingAiBoolean, setIsGeneratingAiBoolean ] = useState(false);
	const [ generatedResponseText, setGeneratedResponseText ] = useState("");
	const [ replySubjectText, setReplySubjectText ] = useState("");
	const [ isSendingEmailBoolean, setIsSendingEmailBoolean ] = useState(false);
	const [ statusMessageString, setStatusMessageString ] = useState("");

	// Additive Recipient Filter State
	const [ activeFilterTabString, setActiveFilterTabString ] = useState("active");
	const [ selectedGradesList, setSelectedGradesList ] = useState([]);
	const [ isGradeFilterDropdownOpenBoolean, setIsGradeFilterDropdownOpenBoolean ] = useState(false);
	const [ selectedFlagFilterString, setSelectedFlagFilterString ] = useState("All");
	const [ searchQueryText, setSearchQueryText ] = useState("");
	const [ selectedRecipientEmailsList, setSelectedRecipientEmailsList ] = useState([]);

	// Initial data loading
	const fetchGoogleStatus = () => {
		fetch("/api/aiemailstatus")
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				if (responseDataObject.connected) {
					setIsGoogleConnectedBoolean(true);
					setGoogleAccountEmailString(responseDataObject.googleEmail || "Connected Google Account");
					fetchInboxMessages();
				} else {
					setIsGoogleConnectedBoolean(false);
				}
			})
			.catch(errorObject => {
				console.warn("Error fetching Google status:", errorObject);
			});
	};

	const fetchParentEmailsDirectory = () => {
		fetch("/api/parentemailload")
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				setLoggedInUserObject(responseDataObject.loggedInUser || null);
				setParentEmailsList(responseDataObject.parentEmails || []);
				setIsLoadingBoolean(false);
			})
			.catch(errorObject => {
				console.warn("Error loading parent emails:", errorObject);
				setIsLoadingBoolean(false);
			});
	};

	const fetchInboxMessages = () => {
		setIsInboxLoadingBoolean(true);
		setInboxErrorString("");
		fetch("/api/aiemailinbox")
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				if (responseDataObject.error) {
					setInboxErrorString(responseDataObject.error);
				} else {
					setInboxMessagesList(responseDataObject.messages || []);
				}
				setIsInboxLoadingBoolean(false);
			})
			.catch(errorObject => {
				setInboxErrorString(errorObject.message);
				setIsInboxLoadingBoolean(false);
			});
	};

	useEffect(() => {
		fetchParentEmailsDirectory();
		fetchGoogleStatus();

		const handleAuthMessage = (eventObject) => {
			if (eventObject.data && (eventObject.data.success || eventObject.data.googleEmail)) {
				setIsGoogleConnectedBoolean(true);
				setGoogleAccountEmailString(eventObject.data.googleEmail || "Connected Google Account");
				setIsConnectingGoogleBoolean(false);
				fetchInboxMessages();
			} else if (eventObject.data && eventObject.data.error) {
				alert(`Google Authentication error: ${eventObject.data.error}`);
				setIsConnectingGoogleBoolean(false);
			}
		};

		window.addEventListener("message", handleAuthMessage);
		return () => {
			window.removeEventListener("message", handleAuthMessage);
		};
	}, []);

	const hasParentManagePrivilegeBoolean = loggedInUserObject && loggedInUserObject.privileges && (
		loggedInUserObject.privileges.includes("parentManage") || 
		loggedInUserObject.privileges.includes("parentmanage") ||
		loggedInUserObject.privileges.some(privilegeItem => (privilegeItem.token === "parentManage" || privilegeItem.name === "parentManage"))
	);

	const handleOpenGoogleLogin = () => {
		setIsConnectingGoogleBoolean(true);
		window.open("/api/aiemailgoogleauth", "Google OAuth Login", "width=800,height=600");
	};

	const handleOpenAiComposer = (targetEmailObject) => {
		setSelectedEmailObject(targetEmailObject);
		setReplySubjectText(targetEmailObject.subject.toLowerCase().startsWith("re:") ? targetEmailObject.subject : `Re: ${targetEmailObject.subject}`);
		setGeneratedResponseText("");
		setSelectedRecipientEmailsList([]);
		setIsComposerOpenBoolean(true);
		setIsGeneratingAiBoolean(true);

		// Trigger AI generation
		fetch("/api/aiemailgenerate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				subject: targetEmailObject.subject,
				body: targetEmailObject.body,
				from: targetEmailObject.from
			})
		})
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				if (responseDataObject.error) {
					alert(`AI Generation error: ${responseDataObject.error}`);
				} else {
					setGeneratedResponseText(responseDataObject.text || "");
				}
				setIsGeneratingAiBoolean(false);
			})
			.catch(errorObject => {
				alert(`AI Generation failed: ${errorObject.message}`);
				setIsGeneratingAiBoolean(false);
			});
	};

	// Additive Recipient Filtering Logic
	const filteredParentRecordsList = parentEmailsList.filter(parentRecordItem => {
		// Filter Tab check (Status)
		if (activeFilterTabString !== "all" && parentRecordItem.status !== activeFilterTabString) {
			return false;
		}

		// Grade Multi-Select Filter check (6th through 12th)
		if (selectedGradesList.length > 0) {
			const hasMatchingGradeWrestlerBoolean = (parentRecordItem.wrestlers || []).some(wrestlerItem => {
				const gradeString = String(wrestlerItem.grade || "").trim();
				return selectedGradesList.some(targetGrade => (
					gradeString === targetGrade ||
					gradeString.toLowerCase() === targetGrade.toLowerCase() ||
					gradeString === `${targetGrade}th` ||
					gradeString.toLowerCase() === `${targetGrade}th`
				));
			});
			if (!hasMatchingGradeWrestlerBoolean) return false;
		}

		// Flag / Level Filter check
		if (selectedFlagFilterString !== "All") {
			if (selectedFlagFilterString === "coach") {
				if (parentRecordItem.isCoach !== true) return false;
			} else {
				const hasMatchingFlagWrestlerBoolean = (parentRecordItem.wrestlers || []).some(wrestlerItem => {
					if (selectedFlagFilterString === "varsity") return wrestlerItem.isVarsity === true;
					if (selectedFlagFilterString === "jv") return wrestlerItem.isJV === true;
					if (selectedFlagFilterString === "middle") return wrestlerItem.isMiddle === true;
					return true;
				});
				if (!hasMatchingFlagWrestlerBoolean) return false;
			}
		}

		// Search Query check
		if (searchQueryText.trim().length > 0) {
			const searchLowerText = searchQueryText.toLowerCase();
			const nameMatchBoolean = (parentRecordItem.name || "").toLowerCase().includes(searchLowerText);
			const emailMatchBoolean = (parentRecordItem.email || "").toLowerCase().includes(searchLowerText);
			const wrestlerMatchBoolean = (parentRecordItem.wrestlers || []).some(wrestlerItem => (wrestlerItem.name || "").toLowerCase().includes(searchLowerText));
			return nameMatchBoolean || emailMatchBoolean || wrestlerMatchBoolean;
		}

		return true;
	});

	const allFilteredEmailsList = filteredParentRecordsList.map(recordItem => recordItem.email).filter(Boolean);
	const isAllFilteredSelectedBoolean = allFilteredEmailsList.length > 0 && allFilteredEmailsList.every(emailItem => selectedRecipientEmailsList.includes(emailItem));

	const handleToggleSelectAllRecipients = () => {
		if (isAllFilteredSelectedBoolean) {
			setSelectedRecipientEmailsList(previousList => previousList.filter(emailItem => !allFilteredEmailsList.includes(emailItem)));
		} else {
			setSelectedRecipientEmailsList(previousList => [...new Set([...previousList, ...allFilteredEmailsList])]);
		}
	};

	const handleToggleRecipientEmail = (targetEmailString) => {
		setSelectedRecipientEmailsList(previousList => (
			previousList.includes(targetEmailString)
				? previousList.filter(emailItem => emailItem !== targetEmailString)
				: [...previousList, targetEmailString]
		));
	};

	const handleToggleGradeFilter = (targetGradeString) => {
		setSelectedGradesList(previousGradesList => (
			previousGradesList.includes(targetGradeString)
				? previousGradesList.filter(gradeItem => gradeItem !== targetGradeString)
				: [...previousGradesList, targetGradeString]
		));
	};

	const handleClearGradeFilters = () => {
		setSelectedGradesList([]);
	};

	const handleSendAndArchiveEmail = () => {
		if (!selectedEmailObject || !selectedEmailObject.id) {
			alert("No target email selected.");
			return;
		}
		if (selectedRecipientEmailsList.length === 0) {
			alert("Please select at least one parent email recipient.");
			return;
		}
		if (!generatedResponseText.trim()) {
			alert("Response text body cannot be empty.");
			return;
		}

		setIsSendingEmailBoolean(true);
		fetch("/api/aiemailsend", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messageId: selectedEmailObject.id,
				recipients: selectedRecipientEmailsList,
				subject: replySubjectText,
				body: generatedResponseText.replace(/\n/g, '<br/>')
			})
		})
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				setIsSendingEmailBoolean(false);
				if (responseDataObject.error) {
					alert(`Send error: ${responseDataObject.error}`);
				} else {
					setStatusMessageString("Email sent via BCC and source email archived!");
					setIsComposerOpenBoolean(false);
					setSelectedEmailObject(null);
					fetchInboxMessages();
					setTimeout(() => setStatusMessageString(""), 5000);
				}
			})
			.catch(errorObject => {
				setIsSendingEmailBoolean(false);
				alert(`Failed to send email: ${errorObject.message}`);
			});
	};

	return (
		<div className="page">
			<Nav loggedInUser={loggedInUserObject} />

			<div style={{ minWidth: 0 }}>
				{isLoadingBoolean ? (
					<div className="pageLoading">
						<img src="/media/wrestlingloading.gif" alt="Loading..." />
					</div>
				) : !hasParentManagePrivilegeBoolean ? (
					<div className="noAccess">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
						<a>Unauthorized Access</a>
					</div>
				) : (
					<div className="aiemail-container">
						<header>
							<h1>AI Email Coordinator</h1>
						</header>

						{statusMessageString && (
							<div style={{ backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0", padding: "12px 16px", borderRadius: "4px", marginBottom: "16px", fontWeight: "600" }}>
								{statusMessageString}
							</div>
						)}

						{/* Google Auth Banner */}
						<div className="connection-status-card">
							<div className="connection-info">
								<div className={`status-indicator-dot ${isGoogleConnectedBoolean ? "connected" : ""}`}></div>
								<div className="connection-text">
									<strong>Google Account:</strong>
									<span>{isGoogleConnectedBoolean ? googleAccountEmailString : "Not Connected"}</span>
								</div>
							</div>

							<div>
								<button className="btn-google-connect" onClick={handleOpenGoogleLogin} disabled={isConnectingGoogleBoolean}>
									<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
									{isGoogleConnectedBoolean ? "Reconnect Google Account" : "Connect Google Account"}
								</button>
							</div>
						</div>

						{/* Inbox Messages Section */}
						<div className="inbox-section">
							<div className="inbox-header">
								<h2>Gmail Team Inbox ({inboxMessagesList.length})</h2>
								<button className="inbox-refresh-btn" onClick={fetchInboxMessages} disabled={!isGoogleConnectedBoolean || isInboxLoadingBoolean}>
									🔄 Refresh Inbox
								</button>
							</div>

							{!isGoogleConnectedBoolean ? (
								<div className="empty-box">
									Please connect your Google Account above to view and process inbox messages.
								</div>
							) : isInboxLoadingBoolean ? (
								<div className="loading-box">
									Loading emails from Gmail inbox...
								</div>
							) : inboxErrorString ? (
								<div style={{ color: "#ba1a1a", padding: "20px", textAlign: "center" }}>
									Error: {inboxErrorString}
								</div>
							) : inboxMessagesList.length === 0 ? (
								<div className="empty-box">
									🎉 No active emails in your Gmail INBOX. All caught up!
								</div>
							) : (
								<div className="email-cards-list">
									{inboxMessagesList.map(emailItem => (
										<div key={emailItem.id} className="email-card">
											<div className="email-main-info">
												<div className="email-sender">{emailItem.from}</div>
												<div className="email-subject">{emailItem.subject}</div>
												<div className="email-snippet">{emailItem.snippet}</div>
												<div className="email-date">{emailItem.date}</div>
											</div>
											<div>
												<button className="btn-accent" onClick={() => handleOpenAiComposer(emailItem)}>
													⚡ Generate AI Response
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* AI Response & Recipient Selector Modal */}
			{isComposerOpenBoolean && selectedEmailObject && (
				<div className="composer-modal-overlay">
					<div className="composer-modal-card">
						<header className="composer-header">
							<h3>AI Response & Email Coordinator</h3>
							<button className="composer-close-btn" onClick={() => setIsComposerOpenBoolean(false)}>&times;</button>
						</header>

						<div className="composer-body">
							{/* Original Email Card */}
							<div className="original-email-box">
								<div><strong>Original Sender:</strong> {selectedEmailObject.from}</div>
								<div><strong>Subject:</strong> {selectedEmailObject.subject}</div>
								<div style={{ marginTop: "6px" }}><strong>Snippet:</strong> {selectedEmailObject.snippet}</div>
							</div>

							{/* AI Response Textarea */}
							<div className="response-editor-group">
								<label>Subject Line</label>
								<input
									type="text"
									className="form-control"
									style={{ width: "100%", padding: "8px 12px", border: "1px solid #c5c5d8", borderRadius: "4px", fontSize: "14px" }}
									value={replySubjectText}
									onChange={(e) => setReplySubjectText(e.target.value)}
								/>

								<label style={{ marginTop: "12px" }}>
									AI Generated Response Draft {isGeneratingAiBoolean && "(Generating with Gemini...)"}
								</label>
								<textarea
									className="response-textarea"
									value={generatedResponseText}
									onChange={(e) => setGeneratedResponseText(e.target.value)}
									placeholder={isGeneratingAiBoolean ? "Gemini is writing the draft response..." : "Draft text will appear here..."}
									disabled={isGeneratingAiBoolean}
								/>
							</div>

							{/* Additive Parent Recipient Selection Section */}
							<div className="recipients-selection-section">
								<h4>Select Parent Recipients to Email</h4>

								{/* Controls Bar (Tabs, Grade Select popover, Level select, Search input) */}
								<div className="controls-bar">
									<div className="filter-tabs">
										<button className={`tab-btn ${activeFilterTabString === "active" ? "active" : ""}`} onClick={() => setActiveFilterTabString("active")}>Active</button>
										<button className={`tab-btn ${activeFilterTabString === "alumni" ? "active" : ""}`} onClick={() => setActiveFilterTabString("alumni")}>Alumni</button>
										<button className={`tab-btn ${activeFilterTabString === "archived" ? "active" : ""}`} onClick={() => setActiveFilterTabString("archived")}>Archived</button>
										<button className={`tab-btn ${activeFilterTabString === "all" ? "active" : ""}`} onClick={() => setActiveFilterTabString("all")}>All Records</button>
									</div>

									<div className="filter-selects-group">
										{/* Grade Multi-Select Dropdown */}
										<div className="multi-select-dropdown-container">
											<button
												type="button"
												className={`multi-select-trigger-btn ${selectedGradesList.length > 0 ? "active" : ""}`}
												onClick={() => setIsGradeFilterDropdownOpenBoolean(!isGradeFilterDropdownOpenBoolean)}
											>
												<span>
													{selectedGradesList.length === 0
														? "All Grades"
														: selectedGradesList.length === 1
														? `${selectedGradesList[0]}th Grade`
														: `${selectedGradesList.length} Grades Selected`}
												</span>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
											</button>

											{isGradeFilterDropdownOpenBoolean && (
												<div className="multi-select-popover">
													<div className="multi-select-popover-header">
														<span>Grades (6-12)</span>
														{selectedGradesList.length > 0 && (
															<button type="button" className="btn-clear-link" onClick={handleClearGradeFilters}>Clear</button>
														)}
													</div>
													<div className="multi-select-popover-options">
														{["6", "7", "8", "9", "10", "11", "12"].map(gradeOptionString => {
															const isCheckedBoolean = selectedGradesList.includes(gradeOptionString);
															return (
																<label key={gradeOptionString} className="multi-select-option-item">
																	<input
																		type="checkbox"
																		checked={isCheckedBoolean}
																		onChange={() => handleToggleGradeFilter(gradeOptionString)}
																	/>
																	<span>{gradeOptionString}th Grade</span>
																</label>
															);
														})}
													</div>
												</div>
											)}
										</div>

										<select
											className="filter-select"
											value={selectedFlagFilterString}
											onChange={(e) => setSelectedFlagFilterString(e.target.value)}
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
											value={searchQueryText}
											onChange={(e) => setSearchQueryText(e.target.value)}
										/>
									</div>
								</div>

								{/* Recipients Table */}
								<div className="recipients-table-container">
									<table className="recipients-table">
										<thead>
											<tr>
												<th style={{ width: "40px" }}>
													<input
														type="checkbox"
														checked={isAllFilteredSelectedBoolean}
														onChange={handleToggleSelectAllRecipients}
													/>
												</th>
												<th>Parent Name</th>
												<th>Email Address</th>
												<th>Wrestlers & Levels</th>
											</tr>
										</thead>
										<tbody>
											{filteredParentRecordsList.length === 0 ? (
												<tr>
													<td colSpan="4" style={{ textAlign: "center", color: "#757687", padding: "16px" }}>
														No parent records match the current filters.
													</td>
												</tr>
											) : (
												filteredParentRecordsList.map(parentRecord => {
													const isSelected = selectedRecipientEmailsList.includes(parentRecord.email);
													return (
														<tr key={parentRecord.id} className={isSelected ? "selected" : ""}>
															<td>
																<input
																	type="checkbox"
																	checked={isSelected}
																	onChange={() => handleToggleRecipientEmail(parentRecord.email)}
																/>
															</td>
															<td>
																<strong>{parentRecord.name}</strong>
																{parentRecord.isCoach && <span className="badge-coach">COACH</span>}
															</td>
															<td>{parentRecord.email}</td>
															<td>
																{(parentRecord.wrestlers || []).map((w, idx) => (
																	<span key={idx} style={{ fontSize: "11px", backgroundColor: "#e1e3e4", padding: "2px 6px", borderRadius: "3px", marginRight: "4px" }}>
																		{w.name} {w.grade && `(Gr ${w.grade})`}
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
						</div>

						<footer className="composer-footer">
							<div className="recipients-summary-count">
								{selectedRecipientEmailsList.length} recipient(s) selected (BCC)
							</div>
							<div className="composer-action-btns">
								<button className="btn-secondary" onClick={() => setIsComposerOpenBoolean(false)}>Cancel</button>
								<button className="btn-primary" onClick={handleSendAndArchiveEmail} disabled={isSendingEmailBoolean || isGeneratingAiBoolean || selectedRecipientEmailsList.length === 0}>
									{isSendingEmailBoolean ? "Sending & Archiving..." : "🚀 Send Email & Archive"}
								</button>
							</div>
						</footer>
					</div>
				</div>
			)}
		</div>
	);
};

const rootElement = document.getElementById("root");
if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<AIEmailPage />);
}

export default AIEmailPage;
