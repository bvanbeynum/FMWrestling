import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import { getNameDiffNodes } from "./include/nameDiff.jsx";
import "./include/index.css";
import "./include/wrestlerduplicate.css";

const WrestlerSearchManagement = () => {
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ isSearching, setIsSearching ] = useState(false);
	const [ errorMessage, setErrorMessage ] = useState("");

	// Search inputs
	const [ searchNameInput, setSearchNameInput ] = useState("");

	// Search results
	const [ searchWrestlerResults, setSearchWrestlerResults ] = useState(null);

	// Duplicate selection state
	const [ selectedPrimary, setSelectedPrimary ] = useState(null);
	const [ selectedDuplicates, setSelectedDuplicates ] = useState([]);
	const [ isSubmittingGroup, setIsSubmittingGroup ] = useState(false);
	const [ isSubmitted, setIsSubmitted ] = useState(false);

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
			}
		}
		catch (error) {
			setErrorMessage(error.message || "Failed to load initial user data.");
		}
		finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchInitialData();
	}, []);

	const handleExecuteSearch = async (submitEvent) => {
		if (submitEvent) {
			submitEvent.preventDefault();
		}

		if (!searchNameInput.trim()) {
			alert("Please enter a wrestler name.");
			return;
		}

		setIsSearching(true);
		setErrorMessage("");
		setSelectedPrimary(null);
		setSelectedDuplicates([]);
		setIsSubmitted(false);

		try {
			const searchPayload = {
				searchName: searchNameInput.trim()
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
				const fetchedWrestlers = responseData.wrestlers || [];
				fetchedWrestlers.sort((wrestlerA, wrestlerB) => {
					const getLastName = (wrestlerRecord) => {
						if (wrestlerRecord.lastName) return wrestlerRecord.lastName.toLowerCase().trim();
						const fullName = (wrestlerRecord.name || "").toLowerCase().trim();
						const spaceIndex = fullName.indexOf(' ');
						return spaceIndex === -1 ? "" : fullName.substring(spaceIndex + 1);
					};

					const getFirstName = (wrestlerRecord) => {
						if (wrestlerRecord.firstName) return wrestlerRecord.firstName.toLowerCase().trim();
						const fullName = (wrestlerRecord.name || "").toLowerCase().trim();
						const spaceIndex = fullName.indexOf(' ');
						return spaceIndex === -1 ? fullName : fullName.substring(0, spaceIndex);
					};

					const lastNameA = getLastName(wrestlerA);
					const lastNameB = getLastName(wrestlerB);

					if (lastNameA !== lastNameB) {
						return lastNameA > lastNameB ? 1 : -1;
					}

					const firstNameA = getFirstName(wrestlerA);
					const firstNameB = getFirstName(wrestlerB);

					if (firstNameA !== firstNameB) {
						return firstNameA > firstNameB ? 1 : -1;
					}

					return 0;
				});

				setSearchWrestlerResults(fetchedWrestlers);
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

	const handlePrimarySelectionChange = (candidateRecord) => {
		setSelectedPrimary(candidateRecord);
		setSelectedDuplicates(previousDuplicates => previousDuplicates.filter(duplicateItem => duplicateItem.sqlId !== candidateRecord.sqlId));
	};

	const handleDuplicateSelectionToggle = (candidateRecord, isChecked) => {
		if (isChecked) {
			setSelectedDuplicates(previousDuplicates => {
				if (!previousDuplicates.some(duplicateItem => duplicateItem.sqlId === candidateRecord.sqlId)) {
					return [ ...previousDuplicates, candidateRecord ];
				}
				return previousDuplicates;
			});
		}
		else {
			setSelectedDuplicates(previousDuplicates => previousDuplicates.filter(duplicateItem => duplicateItem.sqlId !== candidateRecord.sqlId));
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
		setIsSubmitted(true);

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
				setIsSubmitted(false);
				alert(`Failed to save duplicate group: ${ saveResultData.error }`);
			}
		}
		catch (error) {
			setIsSubmitted(false);
			alert(`Error saving duplicate group: ${ error.message }`);
		}
		finally {
			setIsSubmittingGroup(false);
		}
	};

	const formatDateDisplay = (dateInput) => {
		if (!dateInput) return "N/A";
		const parsedDate = new Date(dateInput);
		if (isNaN(parsedDate.getTime())) return "N/A";
		return `${ String(parsedDate.getMonth() + 1).padStart(2, "0") }/${ String(parsedDate.getDate()).padStart(2, "0") }/${ parsedDate.getFullYear() }`;
	};

	const isUserAuthorized = loggedInUser && loggedInUser.privileges && (
		loggedInUser.privileges.some(privilegeItem => privilegeItem.token === "dataManage" || privilegeItem.name === "dataManage") ||
		loggedInUser.privileges.includes("dataManage")
	);

	const activePrimaryWrestlerName = selectedPrimary?.name || "";

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
						<header>
							<h1>Duplicate Wrestler Search</h1>
						</header>

						{ errorMessage && (
							<div className="error-alert-banner">
								{ errorMessage }
							</div>
						)}

						{/* Wrestler Name Search Controls Card */}
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
										onChange={ (changeEvent) => setSearchNameInput(changeEvent.target.value) }
									/>
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

						{/* Direct Selection Matrix from Search Results */}
						{ searchWrestlerResults && (
							<div className="search-results-section">
								<h2 className="section-sub-heading">
									Search Results ({ searchWrestlerResults.length })
								</h2>

								{ searchWrestlerResults.length === 0 ? (
									<div className="no-records-message">No wrestlers found matching "{ searchNameInput }".</div>
								) : (
									<div className={`wrestler-duplicate-group-card ${ isSubmitted ? "submitted-card" : "" }`}>
										{ isSubmitted && (
											<div className="group-card-header">
												<span className="submitted-status-badge">Submitted / Saved</span>
											</div>
										)}

										{/* Desktop Matrix Table */}
										<table className="candidate-matrix-table desktop-only">
											<thead>
												<tr>
													<th style={{ width: "90px" }}>Primary</th>
													<th style={{ width: "90px" }}>Duplicate</th>
													<th>Wrestler Name</th>
													<th>Last Team</th>
													<th>Last Event</th>
													<th>SQL ID</th>
												</tr>
											</thead>
											<tbody>
												{ searchWrestlerResults.map((wrestlerCandidate, candidateIndex) => {
													const isCurrentPrimary = Boolean(selectedPrimary && selectedPrimary.sqlId === wrestlerCandidate.sqlId);
													const isCurrentDuplicate = Boolean(selectedDuplicates && selectedDuplicates.some(duplicateItem => duplicateItem.sqlId === wrestlerCandidate.sqlId));
													const { candidateHighlightedName } = getNameDiffNodes(activePrimaryWrestlerName, wrestlerCandidate.name);
													const rawEventDate = wrestlerCandidate.lastEvent?.date || wrestlerCandidate.lastEvent || wrestlerCandidate.created;

													return (
														<tr
															key={ wrestlerCandidate.id || candidateIndex }
															className={ isCurrentPrimary || isCurrentDuplicate ? "selected-row" : "" }
														>
															<td style={{ textAlign: "center" }}>
																<input
																	type="radio"
																	name="primary_wrestler_radio"
																	checked={ isCurrentPrimary }
																	disabled={ isSubmitted }
																	onChange={ () => handlePrimarySelectionChange(wrestlerCandidate) }
																/>
															</td>
															<td style={{ textAlign: "center" }}>
																<input
																	type="checkbox"
																	checked={ isCurrentDuplicate }
																	disabled={ isSubmitted || isCurrentPrimary }
																	onChange={ (changeEvent) => handleDuplicateSelectionToggle(wrestlerCandidate, changeEvent.target.checked) }
																/>
															</td>
															<td>
																<a
																	href={`/portal/wrestler.html?sqlid=${ wrestlerCandidate.sqlId }`}
																	target="_blank"
																	rel="noreferrer"
																	className="wrestler-link"
																>
																	{ candidateHighlightedName }
																</a>
															</td>
															<td>{ wrestlerCandidate.lastTeam || wrestlerCandidate.team || "-" }</td>
															<td>{ formatDateDisplay(rawEventDate) }</td>
															<td>{ wrestlerCandidate.sqlId }</td>
														</tr>
													);
												})}
											</tbody>
										</table>

										{/* Mobile Cards List */}
										<div className="candidate-cards-list mobile-only">
											{ searchWrestlerResults.map((wrestlerCandidate, candidateIndex) => {
												const isCurrentPrimary = Boolean(selectedPrimary && selectedPrimary.sqlId === wrestlerCandidate.sqlId);
												const isCurrentDuplicate = Boolean(selectedDuplicates && selectedDuplicates.some(duplicateItem => duplicateItem.sqlId === wrestlerCandidate.sqlId));
												const { candidateHighlightedName } = getNameDiffNodes(activePrimaryWrestlerName, wrestlerCandidate.name);
												const rawEventDate = wrestlerCandidate.lastEvent?.date || wrestlerCandidate.lastEvent || wrestlerCandidate.created;

												return (
													<div
														key={ wrestlerCandidate.id || candidateIndex }
														className={`candidate-mobile-card ${ isCurrentPrimary || isCurrentDuplicate ? "selected-card" : "" }`}
													>
														<div className="mobile-card-top">
															<div className="mobile-card-info">
																<a
																	href={`/portal/wrestler.html?sqlid=${ wrestlerCandidate.sqlId }`}
																	target="_blank"
																	rel="noreferrer"
																	className="wrestler-link"
																>
																	{ candidateHighlightedName }
																</a>
																<div className="mobile-card-meta">
																	<span>SQL ID: { wrestlerCandidate.sqlId }</span>
																	{ wrestlerCandidate.lastTeam && <span> • Team: { wrestlerCandidate.lastTeam }</span> }
																	<span> • Last Event: { formatDateDisplay(rawEventDate) }</span>
																</div>
															</div>
														</div>

														<div className="mobile-selection-controls">
															<label className="mobile-control-label">
																<input
																	type="radio"
																	name="primary_wrestler_radio_mobile"
																	checked={ isCurrentPrimary }
																	disabled={ isSubmitted }
																	onChange={ () => handlePrimarySelectionChange(wrestlerCandidate) }
																/>
																<span>Primary</span>
															</label>

															<label className="mobile-control-label">
																<input
																	type="checkbox"
																	checked={ isCurrentDuplicate }
																	disabled={ isSubmitted || isCurrentPrimary }
																	onChange={ (changeEvent) => handleDuplicateSelectionToggle(wrestlerCandidate, changeEvent.target.checked) }
																/>
																<span>Duplicate</span>
															</label>
														</div>
													</div>
												);
											})}
										</div>

										{/* Submit Duplicate Group Action Row */}
										<div className="submit-actions-row">
											<button
												type="button"
												className="button-submit-duplicate"
												disabled={ isSubmitted || isSubmittingGroup }
												onClick={ handleSubmitDuplicateGroup }
											>
												{ isSubmitted ? "Saved" : isSubmittingGroup ? "Submitting..." : "Submit Duplicates" }
											</button>
										</div>
									</div>
								)}
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
