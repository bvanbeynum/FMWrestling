import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/aiemail.css";

const AIEmailPage = () => {
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	
	// Google OAuth Connection State
	const [ isGoogleConnected, setIsGoogleConnected ] = useState(false);
	const [ googleAccountEmail, setGoogleAccountEmail ] = useState("");
	const [ isConnectingGoogle, setIsConnectingGoogle ] = useState(false);

	// Inbox Messages State
	const [ inboxMessages, setInboxMessages ] = useState([]);
	const [ isInboxLoading, setIsInboxLoading ] = useState(false);
	const [ inboxError, setInboxError ] = useState("");
	const [ expandedEmailIds, setExpandedEmailIds ] = useState([]);
	const [ archivingEmailId, setArchivingEmailId ] = useState(null);

	// Parent Emails Directory List (for recipient selection)
	const [ parentEmails, setParentEmails ] = useState([]);

	// Selected Email & AI Composer Modal State
	const [ selectedEmail, setSelectedEmail ] = useState(null);
	const [ isComposerOpen, setIsComposerOpen ] = useState(false);
	const [ isModalEmailExpanded, setIsModalEmailExpanded ] = useState(false);
	const [ isGeneratingAi, setIsGeneratingAi ] = useState(false);
	const [ generatedResponseText, setGeneratedResponseText ] = useState("");
	const [ replySubject, setReplySubject ] = useState("");
	const [ isSendingEmail, setIsSendingEmail ] = useState(false);
	const [ statusMessage, setStatusMessage ] = useState("");
	const editorRef = useRef(null);

	useEffect(() => {
		if (editorRef.current && generatedResponseText !== editorRef.current.innerHTML) {
			editorRef.current.innerHTML = generatedResponseText;
		}
	}, [generatedResponseText]);

	const handleExecCommand = (command, value = null) => {
		document.execCommand(command, false, value);
		if (editorRef.current) {
			setGeneratedResponseText(editorRef.current.innerHTML);
		}
	};

	// Additive Recipient Filter State
	const [ activeFilterTab, setActiveFilterTab ] = useState("active");
	const [ selectedGrades, setSelectedGrades ] = useState([]);
	const [ isGradeFilterDropdownOpen, setIsGradeFilterDropdownOpen ] = useState(false);
	const [ selectedFlagFilter, setSelectedFlagFilter ] = useState("All");
	const [ searchQuery, setSearchQuery ] = useState("");
	const [ selectedRecipientEmails, setSelectedRecipientEmails ] = useState([]);

	// Initial data loading
	const fetchGoogleStatus = () => {
		fetch("/api/aiemailstatus")
			.then(response => response.json())
			.then(responseData => {
				if (responseData.connected) {
					setIsGoogleConnected(true);
					setGoogleAccountEmail(responseData.googleEmail || "Connected Google Account");
					fetchInboxMessages();
				} else {
					setIsGoogleConnected(false);
				}
			})
			.catch(error => {
				console.warn("Error fetching Google status:", error);
			});
	};

	const fetchParentEmailsDirectory = () => {
		fetch("/api/parentemailload")
			.then(response => response.json())
			.then(responseData => {
				setLoggedInUser(responseData.loggedInUser || null);
				setParentEmails(responseData.parentEmails || []);
				setIsLoading(false);
			})
			.catch(error => {
				console.warn("Error loading parent emails:", error);
				setIsLoading(false);
			});
	};

	const fetchInboxMessages = () => {
		setIsInboxLoading(true);
		setInboxError("");
		fetch("/api/aiemailinbox")
			.then(response => response.json())
			.then(responseData => {
				if (responseData.error) {
					setInboxError(responseData.error);
				} else {
					setInboxMessages(responseData.messages || []);
				}
				setIsInboxLoading(false);
			})
			.catch(error => {
				setInboxError(error.message);
				setIsInboxLoading(false);
			});
	};

	const handleToggleExpandEmail = (emailId) => {
		setExpandedEmailIds(previousIds => (
			previousIds.includes(emailId)
				? previousIds.filter(idItem => idItem !== emailId)
				: [...previousIds, emailId]
		));
	};

	const handleArchiveEmail = (targetEmailId) => {
		if (!confirm("Are you sure you want to archive this email?")) {
			return;
		}

		setArchivingEmailId(targetEmailId);
		fetch("/api/aiemailarchive", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ messageId: targetEmailId })
		})
			.then(response => response.json())
			.then(responseData => {
				setArchivingEmailId(null);
				if (responseData.error) {
					alert(`Archive error: ${responseData.error}`);
				} else {
					setStatusMessage("Email archived successfully!");
					fetchInboxMessages();
					setTimeout(() => setStatusMessage(""), 4000);
				}
			})
			.catch(error => {
				setArchivingEmailId(null);
				alert(`Failed to archive email: ${error.message}`);
			});
	};

	useEffect(() => {
		fetchParentEmailsDirectory();
		fetchGoogleStatus();

		const handleAuthMessage = (event) => {
			if (event.data && (event.data.success || event.data.googleEmail)) {
				setIsGoogleConnected(true);
				setGoogleAccountEmail(event.data.googleEmail || "Connected Google Account");
				setIsConnectingGoogle(false);
				fetchInboxMessages();
			} else if (event.data && event.data.error) {
				alert(`Google Authentication error: ${event.data.error}`);
				setIsConnectingGoogle(false);
			}
		};

		window.addEventListener("message", handleAuthMessage);
		return () => {
			window.removeEventListener("message", handleAuthMessage);
		};
	}, []);

	const hasParentManagePrivilege = loggedInUser && loggedInUser.privileges && (
		loggedInUser.privileges.includes("parentManage") || 
		loggedInUser.privileges.includes("parentmanage") ||
		loggedInUser.privileges.some(privilegeItem => (privilegeItem.token === "parentManage" || privilegeItem.name === "parentManage"))
	);

	const handleOpenGoogleLogin = () => {
		setIsConnectingGoogle(true);
		window.open("/api/aiemailgoogleauth", "Google OAuth Login", "width=800,height=600");
	};

	const handleOpenAiComposer = (targetEmail) => {
		setSelectedEmail(targetEmail);
		setReplySubject(targetEmail.subject.toLowerCase().startsWith("re:") ? targetEmail.subject : `Re: ${targetEmail.subject}`);
		setGeneratedResponseText("");
		setSelectedRecipientEmails([]);
		setIsComposerOpen(true);
		setIsModalEmailExpanded(false);
		setIsGeneratingAi(false);
	};

	const handleTriggerAiGeneration = () => {
		if (!selectedEmail) return;
		setIsGeneratingAi(true);
		fetch("/api/aiemailgenerate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				subject: selectedEmail.subject,
				body: selectedEmail.body,
				from: selectedEmail.from
			})
		})
			.then(response => response.json())
			.then(responseData => {
				if (responseData.error) {
					alert(`AI Generation error: ${responseData.error}`);
				} else {
					setGeneratedResponseText(responseData.text || "");
				}
				setIsGeneratingAi(false);
			})
			.catch(error => {
				alert(`AI Generation failed: ${error.message}`);
				setIsGeneratingAi(false);
			});
	};

	// Additive Recipient Filtering Logic
	const filteredParentRecords = parentEmails.filter(parentRecord => {
		// Filter Tab check (Status)
		if (activeFilterTab !== "all" && parentRecord.status !== activeFilterTab) {
			return false;
		}

		// Grade Multi-Select Filter check (6th through 12th)
		if (selectedGrades.length > 0) {
			const hasMatchingGradeWrestler = (parentRecord.wrestlers || []).some(wrestler => {
				const gradeString = String(wrestler.grade || "").trim();
				return selectedGrades.some(targetGrade => (
					gradeString === targetGrade ||
					gradeString.toLowerCase() === targetGrade.toLowerCase() ||
					gradeString === `${targetGrade}th` ||
					gradeString.toLowerCase() === `${targetGrade}th`
				));
			});
			if (!hasMatchingGradeWrestler) return false;
		}

		// Flag / Level Filter check
		if (selectedFlagFilter !== "All") {
			if (selectedFlagFilter === "coach") {
				if (parentRecord.isCoach !== true) return false;
			} else {
				const hasMatchingFlagWrestler = (parentRecord.wrestlers || []).some(wrestler => {
					if (selectedFlagFilter === "varsity") return wrestler.isVarsity === true;
					if (selectedFlagFilter === "jv") return wrestler.isJV === true;
					if (selectedFlagFilter === "middle") return wrestler.isMiddle === true;
					return true;
				});
				if (!hasMatchingFlagWrestler) return false;
			}
		}

		// Search Query check
		if (searchQuery.trim().length > 0) {
			const searchLower = searchQuery.toLowerCase();
			const nameMatch = (parentRecord.name || "").toLowerCase().includes(searchLower);
			const emailMatch = (parentRecord.email || "").toLowerCase().includes(searchLower);
			const wrestlerMatch = (parentRecord.wrestlers || []).some(wrestler => (wrestler.name || "").toLowerCase().includes(searchLower));
			return nameMatch || emailMatch || wrestlerMatch;
		}

		return true;
	});

	const allFilteredEmails = filteredParentRecords.map(record => record.email).filter(Boolean);
	const isAllFilteredSelected = allFilteredEmails.length > 0 && allFilteredEmails.every(emailItem => selectedRecipientEmails.includes(emailItem));

	const handleToggleSelectAllRecipients = () => {
		if (isAllFilteredSelected) {
			setSelectedRecipientEmails(previousRecipients => previousRecipients.filter(emailItem => !allFilteredEmails.includes(emailItem)));
		} else {
			setSelectedRecipientEmails(previousRecipients => [...new Set([...previousRecipients, ...allFilteredEmails])]);
		}
	};

	const handleToggleRecipientEmail = (targetEmail) => {
		setSelectedRecipientEmails(previousRecipients => (
			previousRecipients.includes(targetEmail)
				? previousRecipients.filter(emailItem => emailItem !== targetEmail)
				: [...previousRecipients, targetEmail]
		));
	};

	const handleToggleGradeFilter = (targetGrade) => {
		setSelectedGrades(previousGrades => (
			previousGrades.includes(targetGrade)
				? previousGrades.filter(gradeItem => gradeItem !== targetGrade)
				: [...previousGrades, targetGrade]
		));
	};

	const handleClearGradeFilters = () => {
		setSelectedGrades([]);
	};

	const handleSendAndArchiveEmail = () => {
		if (!selectedEmail || !selectedEmail.id) {
			alert("No target email selected.");
			return;
		}
		if (selectedRecipientEmails.length === 0) {
			alert("Please select at least one parent email recipient.");
			return;
		}
		if (!generatedResponseText.trim()) {
			alert("Response text body cannot be empty.");
			return;
		}

		setIsSendingEmail(true);
		fetch("/api/aiemailsend", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messageId: selectedEmail.id,
				recipients: selectedRecipientEmails,
				subject: replySubject,
				body: generatedResponseText
			})
		})
			.then(response => response.json())
			.then(responseData => {
				setIsSendingEmail(false);
				if (responseData.error) {
					alert(`Send error: ${responseData.error}`);
				} else {
					setStatusMessage("Email sent via BCC and source email archived!");
					setIsComposerOpen(false);
					setSelectedEmail(null);
					fetchInboxMessages();
					setTimeout(() => setStatusMessage(""), 5000);
				}
			})
			.catch(error => {
				setIsSendingEmail(false);
				alert(`Failed to send email: ${error.message}`);
			});
	};

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
					<div className="aiemail-container">
						<header>
							<h1>AI Email Coordinator</h1>
						</header>

						{statusMessage && (
							<div style={{ backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0", padding: "12px 16px", borderRadius: "4px", marginBottom: "16px", fontWeight: "600" }}>
								{statusMessage}
							</div>
						)}

						{/* Google Auth Banner */}
						<div className="connection-status-card">
							<div className="connection-info">
								<div className={`status-indicator-dot ${isGoogleConnected ? "connected" : ""}`}></div>
								<div className="connection-text">
									<strong>Google Account:</strong>
									<span>{isGoogleConnected ? googleAccountEmail : "Not Connected"}</span>
								</div>
							</div>

							<div>
								<button className="btn-google-connect" onClick={handleOpenGoogleLogin} disabled={isConnectingGoogle}>
									<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
									{isGoogleConnected ? "Reconnect Google Account" : "Connect Google Account"}
								</button>
							</div>
						</div>

						{/* Inbox Messages Section */}
						<div className="inbox-section">
							<div className="inbox-header">
								<h2>Gmail Team Inbox ({inboxMessages.length})</h2>
								<button className="inbox-refresh-btn" onClick={fetchInboxMessages} disabled={!isGoogleConnected || isInboxLoading}>
									🔄 Refresh Inbox
								</button>
							</div>

							{!isGoogleConnected ? (
								<div className="empty-box">
									Please connect your Google Account above to view and process inbox messages.
								</div>
							) : isInboxLoading ? (
								<div className="loading-box">
									Loading emails from Gmail inbox...
								</div>
							) : inboxError ? (
								<div style={{ color: "#ba1a1a", padding: "20px", textAlign: "center" }}>
									Error: {inboxError}
								</div>
							) : inboxMessages.length === 0 ? (
								<div className="empty-box">
									🎉 No active emails in your Gmail INBOX. All caught up!
								</div>
							) : (
								<div className="email-cards-list">
									{inboxMessages.map(emailItem => {
										const isExpanded = expandedEmailIds.includes(emailItem.id);
										return (
											<div key={emailItem.id} className="email-card">
												<div className="email-main-info">
													<div className="email-sender">{emailItem.from}</div>
													<div className="email-subject">{emailItem.subject}</div>
													{isExpanded ? (
														<div className="email-body">
															{emailItem.body || emailItem.snippet}
														</div>
													) : (
														<div className="email-snippet">{emailItem.snippet}</div>
													)}
													<button
														type="button"
														className="email-more-btn"
														onClick={() => handleToggleExpandEmail(emailItem.id)}
													>
														{isExpanded ? "less" : "more"}
													</button>
													<div className="email-date">{emailItem.date}</div>
												</div>
												<div className="email-card-actions">
													<button
														className="btn-accent-sm"
														onClick={() => handleOpenAiComposer(emailItem)}
													>
														Respond
													</button>
													<button
														className="btn-archive-sm"
														onClick={() => handleArchiveEmail(emailItem.id)}
														disabled={archivingEmailId === emailItem.id}
													>
														{archivingEmailId === emailItem.id ? "Archiving..." : "📥 Archive"}
													</button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* AI Response & Recipient Selector Modal */}
			{isComposerOpen && selectedEmail && (
				<div className="composer-modal-overlay">
					<div className="composer-modal-card">
						<header className="composer-header">
							<h3>AI Response & Email Coordinator</h3>
							<button className="composer-close-btn" onClick={() => setIsComposerOpen(false)}>&times;</button>
						</header>

						<div className="composer-body">
							{/* Original Email Card */}
							<div className="original-email-box">
								<div><strong>Original Sender:</strong> {selectedEmail.from}</div>
								<div><strong>Subject:</strong> {selectedEmail.subject}</div>
								<div style={{ marginTop: "6px" }}>
									<strong>Message:</strong>{" "}
									{isModalEmailExpanded ? (
										<span style={{ whiteSpace: "pre-wrap" }}>
											{selectedEmail.body || selectedEmail.snippet}
										</span>
									) : (
										<span>{selectedEmail.snippet}</span>
									)}
									<button
										type="button"
										className="email-more-btn"
										style={{ marginLeft: "6px" }}
										onClick={() => setIsModalEmailExpanded(!isModalEmailExpanded)}
									>
										{isModalEmailExpanded ? "less" : "more"}
									</button>
								</div>
							</div>

							{/* AI Response Rich Text Editor */}
							<div className="response-editor-group">
								<label>Subject Line</label>
								<input
									type="text"
									className="form-control"
									style={{ width: "100%", padding: "8px 12px", border: "1px solid #c5c5d8", borderRadius: "4px", fontSize: "14px" }}
									value={replySubject}
									onChange={(event) => setReplySubject(event.target.value)}
								/>

								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", marginBottom: "6px" }}>
									<label style={{ margin: 0 }}>
										Response Draft {isGeneratingAi && "(Generating with Gemini...)"}
									</label>
									<button
										type="button"
										className="btn-accent-sm"
										onClick={handleTriggerAiGeneration}
										disabled={isGeneratingAi}
									>
										{isGeneratingAi ? "Generating..." : "⚡ Generate AI Response"}
									</button>
								</div>

								<div className="editor-toolbar">
									<button type="button" className="toolbar-btn" onClick={() => handleExecCommand('bold')} title="Bold"><b>B</b></button>
									<button type="button" className="toolbar-btn" onClick={() => handleExecCommand('italic')} title="Italic"><i>I</i></button>
									<button type="button" className="toolbar-btn" onClick={() => handleExecCommand('insertUnorderedList')} title="Bullet List">• List</button>
									<button type="button" className="toolbar-btn" onClick={() => handleExecCommand('insertOrderedList')} title="Numbered List">1. List</button>
								</div>

								<div
									ref={editorRef}
									contentEditable={!isGeneratingAi}
									className="response-editor-contenteditable"
									onInput={(event) => setGeneratedResponseText(event.currentTarget.innerHTML)}
									onBlur={(event) => setGeneratedResponseText(event.currentTarget.innerHTML)}
								/>
							</div>

							{/* Additive Parent Recipient Selection Section */}
							<div className="recipients-selection-section">
								<h4>Select Parent Recipients to Email</h4>

								{/* Controls Bar (Tabs, Grade Select popover, Level select, Search input) */}
								<div className="controls-bar">
									<div className="filter-tabs">
										<button className={`tab-btn ${activeFilterTab === "active" ? "active" : ""}`} onClick={() => setActiveFilterTab("active")}>Active</button>
										<button className={`tab-btn ${activeFilterTab === "alumni" ? "active" : ""}`} onClick={() => setActiveFilterTab("alumni")}>Alumni</button>
										<button className={`tab-btn ${activeFilterTab === "archived" ? "active" : ""}`} onClick={() => setActiveFilterTab("archived")}>Archived</button>
										<button className={`tab-btn ${activeFilterTab === "all" ? "active" : ""}`} onClick={() => setActiveFilterTab("all")}>All Records</button>
									</div>

									<div className="filter-selects-group">
										{/* Grade Multi-Select Dropdown */}
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
															<button type="button" className="btn-clear-link" onClick={handleClearGradeFilters}>Clear</button>
														)}
													</div>
													<div className="multi-select-popover-options">
														{["6", "7", "8", "9", "10", "11", "12"].map(gradeOption => {
															const isChecked = selectedGrades.includes(gradeOption);
															return (
																<label key={gradeOption} className="multi-select-option-item">
																	<input
																		type="checkbox"
																		checked={isChecked}
																		onChange={() => handleToggleGradeFilter(gradeOption)}
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
											onChange={(event) => setSelectedFlagFilter(event.target.value)}
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
											onChange={(event) => setSearchQuery(event.target.value)}
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
														checked={isAllFilteredSelected}
														onChange={handleToggleSelectAllRecipients}
													/>
												</th>
												<th>Parent Name</th>
												<th>Email Address</th>
												<th>Wrestlers & Levels</th>
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
													const isSelected = selectedRecipientEmails.includes(parentRecord.email);
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
																{(parentRecord.wrestlers || []).map((wrestlerItem, wrestlerIndex) => (
																	<span key={wrestlerIndex} style={{ fontSize: "11px", backgroundColor: "#e1e3e4", padding: "2px 6px", borderRadius: "3px", marginRight: "4px" }}>
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
						</div>

						<footer className="composer-footer">
							<div className="recipients-summary-count">
								{selectedRecipientEmails.length} recipient(s) selected (BCC)
							</div>
							<div className="composer-action-btns">
								<button className="btn-secondary" onClick={() => setIsComposerOpen(false)}>Cancel</button>
								<button className="btn-primary" onClick={handleSendAndArchiveEmail} disabled={isSendingEmail || isGeneratingAi || selectedRecipientEmails.length === 0}>
									{isSendingEmail ? "Sending & Archiving..." : "🚀 Send Email & Archive"}
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
