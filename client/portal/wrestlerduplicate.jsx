import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/wrestlerduplicate.css";

const WrestlerSearchManagement = () => {
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ isSearching, setIsSearching ] = useState(false);
	const [ errorMessage, setErrorMessage ] = useState("");

	// View mode: "search_results" or "candidate_duplicates"
	const [ activeViewMode, setActiveViewMode ] = useState("search_results");

	// Search inputs & options
	const [ schoolGroups, setSchoolGroups ] = useState([]);
	const [ searchNameInput, setSearchNameInput ] = useState("");
	const [ selectedTeamName, setSelectedTeamName ] = useState("");

	// Search results
	const [ searchWrestlerResults, setSearchWrestlerResults ] = useState(null);

	// Map of wrestlerId -> "loading" | "zero_candidates" | "has_candidates"
	const [ lookupStatusByWrestlerId, setLookupStatusByWrestlerId ] = useState({});

	// Currently selected wrestler candidate lookup object
	const [ activeDuplicateGroup, setActiveDuplicateGroup ] = useState(null);
	const [ selectedPrimary, setSelectedPrimary ] = useState(null);
	const [ selectedDuplicates, setSelectedDuplicates ] = useState([]);
	const [ isSubmittingGroup, setIsSubmittingGroup ] = useState(false);

	const fetchInitialData = async () => {
		setIsLoading(true);
		setErrorMessage("");

		try {
			const fetchResponse = await fetch("/api/wrestlerduplicateload");
			const responseData = await fetchResponse.json();

			if (responseData.error) {
				setErrorMessage(responseData.error);
			}
			else {
				setLoggedInUser(responseData.loggedInUser || null);

				const fetchedSchools = responseData.schools || [];
				const sortedGroupNames = [...new Set(fetchedSchools.sort((schoolA, schoolB) => 
					schoolA.classification !== schoolB.classification ?
						schoolA.classification > schoolB.classification ? -1 : 1
					: schoolA.region !== schoolB.region ?
						schoolA.region > schoolB.region ? 1 : -1
					: schoolA.name > schoolB.name ? 1 : -1
				).map(schoolItem => `${ schoolItem.classification || "NA" } - ${ schoolItem.region || "NA" }`))];

				const formattedGroups = sortedGroupNames.map(groupName => ({
					groupName: groupName,
					schools: fetchedSchools.filter(schoolItem => `${ schoolItem.classification || "NA" } - ${ schoolItem.region || "NA" }` === groupName)
				}));

				setSchoolGroups(formattedGroups);
			}
		}
		catch (error) {
			setErrorMessage(error.message || "Failed to load initial search options.");
		}
		finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchInitialData();
	}, []);

	const handleExecuteSearch = async (eventObject) => {
		if (eventObject) {
			eventObject.preventDefault();
		}

		if (!searchNameInput.trim() && !selectedTeamName) {
			alert("Please enter a wrestler name or select a team.");
			return;
		}

		setIsSearching(true);
		setErrorMessage("");
		setActiveViewMode("search_results");
		setActiveDuplicateGroup(null);
		setSelectedPrimary(null);
		setSelectedDuplicates([]);
		setLookupStatusByWrestlerId({});

		try {
			const searchPayload = {
				searchName: searchNameInput.trim(),
				teamName: selectedTeamName
			};

			const searchResponse = await fetch("/api/wrestlerduplicatesearch", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(searchPayload)
			});

			const responseData = await searchResponse.json();

			if (responseData.error) {
				setErrorMessage(responseData.error);
				setSearchWrestlerResults([]);
			}
			else {
				setSearchWrestlerResults(responseData.wrestlers || []);
			}
		}
		catch (error) {
			setErrorMessage(error.message || "Failed to perform wrestler search.");
			setSearchWrestlerResults([]);
		}
		finally {
			setIsSearching(false);
		}
	};

	const handleLookupDuplicatesForWrestler = async (wrestlerRecord) => {
		const targetWrestlerIdentifier = wrestlerRecord.id || wrestlerRecord._id || wrestlerRecord.sqlId;

		setLookupStatusByWrestlerId(previousState => ({
			...previousState,
			[targetWrestlerIdentifier]: "loading"
		}));
		setErrorMessage("");

		try {
			const lookupResponse = await fetch("/api/wrestlerduplicatelookup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ wrestlerId: targetWrestlerIdentifier })
			});

			const responseData = await lookupResponse.json();

			if (responseData.error) {
				setErrorMessage(responseData.error);
				setLookupStatusByWrestlerId(previousState => ({
					...previousState,
					[targetWrestlerIdentifier]: null
				}));
			}
			else {
				const fetchedWrestler = responseData.wrestler;
				const candidateDuplicatesList = (fetchedWrestler?.potentialDuplicates || fetchedWrestler?.candidates || []);

				if (candidateDuplicatesList.length === 0) {
					// 0 Candidates: stay on search results and update button to "0 Candidates" badge
					setLookupStatusByWrestlerId(previousState => ({
						...previousState,
						[targetWrestlerIdentifier]: "zero_candidates"
					}));
				}
				else {
					// Has Candidates: switch view mode to candidate duplicates
					setLookupStatusByWrestlerId(previousState => ({
						...previousState,
						[targetWrestlerIdentifier]: "has_candidates"
					}));
					setActiveDuplicateGroup(fetchedWrestler);
					setSelectedPrimary(null);
					setSelectedDuplicates([]);
					setActiveViewMode("candidate_duplicates");
				}
			}
		}
		catch (error) {
			setErrorMessage(error.message || "Failed to lookup candidate duplicates.");
			setLookupStatusByWrestlerId(previousState => ({
				...previousState,
				[targetWrestlerIdentifier]: null
			}));
		}
	};

	const handleBackToSearchResults = () => {
		setActiveViewMode("search_results");
		setActiveDuplicateGroup(null);
		setSelectedPrimary(null);
		setSelectedDuplicates([]);
	};

	const handlePrimarySelectionChange = (candidateRecord) => {
		setSelectedPrimary(candidateRecord);
		setSelectedDuplicates(previousDuplicates => previousDuplicates.filter(item => item.sqlId !== candidateRecord.sqlId));
	};

	const handleDuplicateSelectionToggle = (candidateRecord, isChecked) => {
		if (isChecked) {
			setSelectedDuplicates(previousDuplicates => {
				if (!previousDuplicates.some(item => item.sqlId === candidateRecord.sqlId)) {
					return [ ...previousDuplicates, candidateRecord ];
				}
				return previousDuplicates;
			});
		}
		else {
			setSelectedDuplicates(previousDuplicates => previousDuplicates.filter(item => item.sqlId !== candidateRecord.sqlId));
		}
	};

	const handleSubmitDuplicateGroup = async () => {
		if (!selectedPrimary) {
			alert("Please select a primary wrestler before submitting.");
			return;
		}

		if (selectedDuplicates.length === 0) {
			alert("Please select at least one duplicate wrestler to link.");
			return;
		}

		setIsSubmittingGroup(true);

		// Optimistically mark card as submitted
		setActiveDuplicateGroup(previousRecord => previousRecord ? { ...previousRecord, isSubmitted: true } : null);

		try {
			const savePayload = {
				status: "pending",
				primary: selectedPrimary,
				duplicates: selectedDuplicates
			};

			const saveResponse = await fetch("/api/newwrestlersave", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(savePayload)
			});

			const saveResultData = await saveResponse.json();

			if (saveResultData.error) {
				setActiveDuplicateGroup(previousRecord => previousRecord ? { ...previousRecord, isSubmitted: false } : null);
				alert(`Failed to save duplicate group: ${ saveResultData.error }`);
			}
		}
		catch (error) {
			setActiveDuplicateGroup(previousRecord => previousRecord ? { ...previousRecord, isSubmitted: false } : null);
			alert(`Error saving duplicate group: ${ error.message }`);
		}
		finally {
			setIsSubmittingGroup(false);
		}
	};

	const formatDateDisplay = (dateInput) => {
		if (!dateInput) return "N/A";
		const dateObject = new Date(dateInput);
		if (isNaN(dateObject.getTime())) return "N/A";
		return `${ String(dateObject.getMonth() + 1).padStart(2, "0") }/${ String(dateObject.getDate()).padStart(2, "0") }/${ dateObject.getFullYear() }`;
	};

	const isUserAuthorized = loggedInUser && loggedInUser.privileges && (
		loggedInUser.privileges.some(privilegeItem => privilegeItem.token === "dataManage" || privilegeItem.name === "dataManage") ||
		loggedInUser.privileges.includes("dataManage")
	);

	return (
		<div className="page">
			<Nav loggedInUser={ loggedInUser } />

			<div style={{ minWidth: 0 }}>
				{ isLoading ? (
					<div className="pageLoading">
						<img src="/media/wrestlingloading.gif" alt="Loading..." />
					</div>
				) : !isUserAuthorized ? (
					<div className="noAccess">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
						<a>Unauthorized Access</a>
					</div>
				) : (
					<div className="wrestlerduplicate-container">
						{/* Page Header */}
						<header>
							<h1>Duplicate Wrestler Search</h1>
						</header>

						{ errorMessage && (
							<div className="error-alert-banner">
								{ errorMessage }
							</div>
						)}

						{/* Search Controls Card */}
						<form className="search-controls-card" onSubmit={ handleExecuteSearch }>
							<div className="search-inputs-grid">
								<div className="input-field-wrapper">
									<label htmlFor="wrestlerNameInput" className="input-field-label">
										Wrestler Name:
									</label>
									<input
										id="wrestlerNameInput"
										type="text"
										className="search-form-input"
										placeholder="e.g. John Smith"
										value={ searchNameInput }
										onChange={ (eventObject) => setSearchNameInput(eventObject.target.value) }
									/>
								</div>

								<div className="input-field-wrapper">
									<label htmlFor="teamSelectDropdown" className="input-field-label">
										Team / School:
									</label>
									<select
										id="teamSelectDropdown"
										className="search-form-select"
										value={ selectedTeamName }
										onChange={ (eventObject) => setSelectedTeamName(eventObject.target.value) }
									>
										<option value="">Select a Team...</option>
										{ schoolGroups.map(groupItem => (
											<optgroup key={ groupItem.groupName } label={ groupItem.groupName }>
												{ groupItem.schools.map(schoolItem => (
													<option key={ schoolItem.id || schoolItem.name } value={ schoolItem.name }>
														{ schoolItem.name }
													</option>
												))}
											</optgroup>
										))}
									</select>
								</div>

								<div className="input-field-wrapper">
									<button
										type="submit"
										className="button-execute-search"
										disabled={ isSearching }
									>
										{ isSearching ? "Searching..." : "Search Wrestlers" }
									</button>
								</div>
							</div>
						</form>

						{/* VIEW MODE 1: Search Results List */}
						{ activeViewMode === "search_results" && searchWrestlerResults && (
							<div className="search-results-section">
								<h2 className="section-sub-heading">
									Search Results ({ searchWrestlerResults.length })
								</h2>

								{ searchWrestlerResults.length === 0 ? (
									<div className="no-records-message">No wrestlers found matching the search criteria.</div>
								) : (
									<table className="candidate-matrix-table">
										<thead>
											<tr>
												<th>Wrestler Name</th>
												<th>Last Team</th>
												<th>Last Event</th>
												<th>Action</th>
											</tr>
										</thead>
										<tbody>
											{ searchWrestlerResults.map(wrestlerItem => {
												const wrestlerIdentifier = wrestlerItem.id || wrestlerItem._id || wrestlerItem.sqlId;
												const currentLookupStatus = lookupStatusByWrestlerId[wrestlerIdentifier];
												const rawEventDate = wrestlerItem.lastEvent?.date || wrestlerItem.lastEvent || wrestlerItem.created;

												return (
													<tr key={ wrestlerIdentifier }>
														<td>
															<a
																href={`/portal/wrestler.html?sqlid=${ wrestlerItem.sqlId }`}
																target="_blank"
																rel="noreferrer"
																className="wrestler-link"
															>
																{ wrestlerItem.name }
															</a>
														</td>
														<td>{ wrestlerItem.lastTeam || wrestlerItem.team || "-" }</td>
														<td>{ formatDateDisplay(rawEventDate) }</td>
														<td>
															{ currentLookupStatus === "zero_candidates" ? (
																<span className="chip-zero-candidates">
																	0 Candidates
																</span>
															) : (
																<button
																	type="button"
																	className="button-lookup-candidate"
																	disabled={ currentLookupStatus === "loading" }
																	onClick={ () => handleLookupDuplicatesForWrestler(wrestlerItem) }
																>
																	{ currentLookupStatus === "loading" ? "Searching..." : "Find Duplicates" }
																</button>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								)}
							</div>
						)}

						{/* VIEW MODE 2: Candidate Duplicates View */}
						{ activeViewMode === "candidate_duplicates" && activeDuplicateGroup && (
							<div>
								<div className="back-button-wrapper">
									<button
										type="button"
										className="button-back-results"
										onClick={ handleBackToSearchResults }
									>
										← Back to Search Results
									</button>
								</div>

								<h2 className="section-sub-heading">
									Duplicate Candidates for { activeDuplicateGroup.wrestlerName }
								</h2>

								{ (activeDuplicateGroup.potentialDuplicates || activeDuplicateGroup.candidates || []).length === 0 ? (
									<div className="no-records-message">
										No candidate duplicate records found for { activeDuplicateGroup.wrestlerName }.
									</div>
								) : (() => {
									const groupSqlId = activeDuplicateGroup.sqlId;
									const isGroupSubmitted = activeDuplicateGroup.isSubmitted;

									const mainWrestlerCandidate = {
										wrestlerId: activeDuplicateGroup.wrestlerId || activeDuplicateGroup.id,
										sqlId: activeDuplicateGroup.sqlId,
										lastTeam: activeDuplicateGroup.lastTeam || "",
										wrestlerName: activeDuplicateGroup.wrestlerName || activeDuplicateGroup.name || `${ activeDuplicateGroup.firstName || "" } ${ activeDuplicateGroup.lastName || "" }`.trim(),
										isMainNewRecord: true
									};

									const allGroupCandidates = [
										mainWrestlerCandidate,
										...(activeDuplicateGroup.potentialDuplicates || activeDuplicateGroup.candidates || []).map(candidateItem => ({
											wrestlerId: candidateItem.wrestlerId || candidateItem.id,
											sqlId: candidateItem.sqlId,
											lastTeam: candidateItem.lastTeam || "",
											wrestlerName: candidateItem.name || `${ candidateItem.firstName || "" } ${ candidateItem.lastName || "" }`.trim(),
											isMainNewRecord: false
										}))
									];

									return (
										<div className={`wrestler-duplicate-group-card ${ isGroupSubmitted ? "submitted-card" : "" }`}>
											{/* Card Header */}
											<div className="group-card-header">
												<div className="wrestler-title-info">
													<span className="wrestler-main-name">{ activeDuplicateGroup.wrestlerName }</span>
													<span className="wrestler-sub-team">{ activeDuplicateGroup.lastTeam || "No Team Specified" }</span>
													<span className="wrestler-sql-id">
														SQL ID: { activeDuplicateGroup.sqlId } • Created: { formatDateDisplay(activeDuplicateGroup.created) }
													</span>
												</div>

												{ isGroupSubmitted && (
													<span className="submitted-status-badge">Submitted / Saved</span>
												)}
											</div>

											{/* Desktop Candidate Table */}
											<table className="candidate-matrix-table desktop-only">
												<thead>
													<tr>
														<th style={{ width: "90px" }}>Primary</th>
														<th style={{ width: "90px" }}>Duplicate</th>
														<th>Wrestler Name</th>
														<th>Last Team</th>
														<th>SQL ID</th>
														<th>Type</th>
													</tr>
												</thead>
												<tbody>
													{ allGroupCandidates.map((candidateRecord) => {
														const isCurrentPrimary = Boolean(selectedPrimary && selectedPrimary.sqlId === candidateRecord.sqlId);
														const isCurrentDuplicate = Boolean(selectedDuplicates && selectedDuplicates.some(item => item.sqlId === candidateRecord.sqlId));

														return (
															<tr
																key={ candidateRecord.sqlId }
																className={ isCurrentPrimary || isCurrentDuplicate ? "selected-row" : "" }
															>
																<td style={{ textAlign: "center" }}>
																	<input
																		type="radio"
																		name={`primary_radio_${ groupSqlId }`}
																		checked={ isCurrentPrimary }
																		disabled={ isGroupSubmitted }
																		onChange={ () => handlePrimarySelectionChange(candidateRecord) }
																	/>
																</td>
																<td style={{ textAlign: "center" }}>
																	<input
																		type="checkbox"
																		checked={ isCurrentDuplicate }
																		disabled={ isGroupSubmitted || isCurrentPrimary }
																		onChange={ (eventObject) => handleDuplicateSelectionToggle(candidateRecord, eventObject.target.checked) }
																	/>
																</td>
																<td>
																	<a
																		href={`/portal/wrestler.html?sqlid=${ candidateRecord.sqlId }`}
																		target="_blank"
																		rel="noreferrer"
																		className="wrestler-link"
																	>
																		{ candidateRecord.wrestlerName }
																	</a>
																</td>
																<td>{ candidateRecord.lastTeam || "-" }</td>
																<td>{ candidateRecord.sqlId }</td>
																<td>
																	{ candidateRecord.isMainNewRecord ? (
																		<span className="primary-badge-blue">Search Wrestler</span>
																	) : (
																		<span className="duplicate-chip">Candidate</span>
																	)}
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>

											{/* Mobile Candidate Cards */}
											<div className="candidate-cards-list mobile-only">
												{ allGroupCandidates.map((candidateRecord) => {
													const isCurrentPrimary = Boolean(selectedPrimary && selectedPrimary.sqlId === candidateRecord.sqlId);
													const isCurrentDuplicate = Boolean(selectedDuplicates && selectedDuplicates.some(item => item.sqlId === candidateRecord.sqlId));

													return (
														<div
															key={ candidateRecord.sqlId }
															className={`candidate-mobile-card ${ isCurrentPrimary || isCurrentDuplicate ? "selected-card" : "" }`}
														>
															<div className="mobile-card-top">
																<div className="mobile-card-info">
																	<a
																		href={`/portal/wrestler.html?sqlid=${ candidateRecord.sqlId }`}
																		target="_blank"
																		rel="noreferrer"
																		className="wrestler-link"
																	>
																		{ candidateRecord.wrestlerName }
																	</a>
																	<div className="mobile-card-meta">
																		<span>SQL ID: { candidateRecord.sqlId }</span>
																		{ candidateRecord.lastTeam && <span> • Team: { candidateRecord.lastTeam }</span> }
																	</div>
																</div>

																{ candidateRecord.isMainNewRecord ? (
																	<span className="primary-badge-blue">Search Wrestler</span>
																) : (
																	<span className="duplicate-chip">Candidate</span>
																)}
															</div>

															<div className="mobile-selection-controls">
																<label className="mobile-control-label">
																	<input
																		type="radio"
																		name={`primary_radio_mobile_${ groupSqlId }`}
																		checked={ isCurrentPrimary }
																		disabled={ isGroupSubmitted }
																		onChange={ () => handlePrimarySelectionChange(candidateRecord) }
																	/>
																	<span>Primary</span>
																</label>

																<label className="mobile-control-label">
																	<input
																		type="checkbox"
																		checked={ isCurrentDuplicate }
																		disabled={ isGroupSubmitted || isCurrentPrimary }
																		onChange={ (eventObject) => handleDuplicateSelectionToggle(candidateRecord, eventObject.target.checked) }
																	/>
																	<span>Duplicate</span>
																</label>
															</div>
														</div>
													);
												})}
											</div>

											{/* Submit Action */}
											<div className="submit-actions-row">
												<button
													type="button"
													className="button-submit-duplicate"
													disabled={ isGroupSubmitted || isSubmittingGroup }
													onClick={ handleSubmitDuplicateGroup }
												>
													{ isGroupSubmitted ? "Saved" : isSubmittingGroup ? "Submitting..." : "Submit Duplicates" }
												</button>
											</div>
										</div>
									);
								})()}
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
	const reactRoot = ReactDOM.createRoot(rootElement);
	reactRoot.render(<WrestlerSearchManagement />);
}

export default WrestlerSearchManagement;
