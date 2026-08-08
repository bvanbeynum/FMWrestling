import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/newwrestler.css";

const NewWrestlerManagement = () => {
	const [ timespanDays, setTimespanDays ] = useState(3);
	const [ newWrestlers, setNewWrestlers ] = useState([]);
	const [ existingDuplicates, setExistingDuplicates ] = useState([]);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ errorMessage, setErrorMessage ] = useState("");
	
	// Map of new wrestler sqlId -> primary wrestler record object
	const [ primarySelections, setPrimarySelections ] = useState({});
	// Map of new wrestler sqlId -> array of selected duplicate wrestler record objects
	const [ duplicateSelections, setDuplicateSelections ] = useState({});
	// Set of sqlIds currently saving
	const [ submittingSqlIds, setSubmittingSqlIds ] = useState(new Set());

	const fetchNewWrestlersData = async (currentTimespan) => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			const fetchResponse = await fetch(`/api/newwrestlerload?timespan=${ currentTimespan }`);
			const responseData = await fetchResponse.json();

			if (responseData.error) {
				setErrorMessage(responseData.error);
			}
			else {
				setLoggedInUser(responseData.loggedInUser || null);
				setNewWrestlers(responseData.newWrestlers || []);
				setExistingDuplicates(responseData.existingDuplicates || []);

				// Initialize primary and duplicate selections as unselected
				const initialPrimaryMap = {};
				const initialDuplicateMap = {};

				(responseData.newWrestlers || []).forEach(wrestlerItem => {
					initialPrimaryMap[wrestlerItem.sqlId] = null;
					initialDuplicateMap[wrestlerItem.sqlId] = [];
				});

				setPrimarySelections(initialPrimaryMap);
				setDuplicateSelections(initialDuplicateMap);
			}
		}
		catch (error) {
			setErrorMessage(error.message || "Failed to load new wrestlers data");
		}
		finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchNewWrestlersData(timespanDays);
	}, [ timespanDays ]);

	const handlePrimaryChange = (groupSqlId, candidateRecord) => {
		setPrimarySelections(previousState => ({
			...previousState,
			[groupSqlId]: candidateRecord
		}));

		// If the chosen primary was previously checked as a duplicate, remove it from selected duplicates
		setDuplicateSelections(previousState => {
			const currentDuplicates = previousState[groupSqlId] || [];
			const filteredDuplicates = currentDuplicates.filter(item => item.sqlId !== candidateRecord.sqlId);
			return {
				...previousState,
				[groupSqlId]: filteredDuplicates
			};
		});
	};

	const handleDuplicateToggle = (groupSqlId, candidateRecord, isChecked) => {
		setDuplicateSelections(previousState => {
			const currentDuplicates = previousState[groupSqlId] || [];
			let updatedDuplicates = [];

			if (isChecked) {
				if (!currentDuplicates.some(item => item.sqlId === candidateRecord.sqlId)) {
					updatedDuplicates = [ ...currentDuplicates, candidateRecord ];
				}
				else {
					updatedDuplicates = currentDuplicates;
				}
			}
			else {
				updatedDuplicates = currentDuplicates.filter(item => item.sqlId !== candidateRecord.sqlId);
			}

			return {
				...previousState,
				[groupSqlId]: updatedDuplicates
			};
		});
	};

	const handleSubmitDuplicateGroup = async (groupSqlId) => {
		const targetPrimary = primarySelections[groupSqlId];
		const targetDuplicates = duplicateSelections[groupSqlId] || [];

		if (!targetPrimary) {
			alert("Please select a primary wrestler before submitting.");
			return;
		}

		if (targetDuplicates.length === 0) {
			alert("Please select at least one duplicate wrestler to link.");
			return;
		}

		// Optimistic UI update: Immediately mark card as submitted / greyed out
		setNewWrestlers(previousList => previousList.map(wrestlerItem => {
			if (wrestlerItem.sqlId === groupSqlId) {
				return { ...wrestlerItem, isSubmitted: true };
			}
			return wrestlerItem;
		}));

		setSubmittingSqlIds(previousState => new Set(previousState).add(groupSqlId));

		try {
			const savePayload = {
				status: "pending",
				primary: targetPrimary,
				duplicates: targetDuplicates
			};

			const saveResponse = await fetch("/api/newwrestlersave", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(savePayload)
			});

			const saveResultData = await saveResponse.json();

			if (saveResultData.error) {
				// Revert optimistic update on error
				setNewWrestlers(previousList => previousList.map(wrestlerItem => {
					if (wrestlerItem.sqlId === groupSqlId) {
						return { ...wrestlerItem, isSubmitted: false };
					}
					return wrestlerItem;
				}));
				alert(`Failed to save duplicate group: ${ saveResultData.error }`);
			}
			else {
				const newlySavedRecord = saveResultData.duplicate || {
					id: saveResultData.id,
					primary: targetPrimary,
					duplicates: targetDuplicates
				};

				setExistingDuplicates(previousList => [ newlySavedRecord, ...previousList ]);
			}
		}
		catch (error) {
			// Revert optimistic update on exception
			setNewWrestlers(previousList => previousList.map(wrestlerItem => {
				if (wrestlerItem.sqlId === groupSqlId) {
					return { ...wrestlerItem, isSubmitted: false };
				}
				return wrestlerItem;
			}));
			alert(`Error saving duplicate group: ${ error.message }`);
		}
		finally {
			setSubmittingSqlIds(previousState => {
				const nextState = new Set(previousState);
				nextState.delete(groupSqlId);
				return nextState;
			});
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
					<div className="newwrestler-container">
						{/* Page Header */}
						<header>
							<h1 className="page-title">New Wrestler</h1>

							<div className="timespan-selector-wrapper">
								<label htmlFor="timespanSelect" className="timespan-selector-label">Timespan:</label>
								<select
									id="timespanSelect"
									className="timespan-dropdown-select"
									value={ timespanDays }
									onChange={ (eventObject) => setTimespanDays(parseInt(eventObject.target.value, 10)) }
								>
									<option value={ 3 }>3 Days</option>
									<option value={ 7 }>7 Days</option>
									<option value={ 14 }>14 Days</option>
									<option value={ 30 }>30 Days</option>
								</select>
							</div>
						</header>

						{ errorMessage && (
							<div className="no-records-message" style={{ color: "#dc2626", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "4px", marginBottom: "20px" }}>
								{ errorMessage }
							</div>
						)}

						{/* New Wrestlers List */}
						{ newWrestlers.length === 0 ? (
							<div className="no-records-message">No new wrestlers added in the selected timespan ({ timespanDays } days).</div>
						) : (
							<div className="new-wrestlers-list">
								{ newWrestlers.map((wrestlerItem) => {
									const groupSqlId = wrestlerItem.sqlId;
									const isGroupSubmitted = wrestlerItem.isSubmitted;
									const isSubmittingCurrentGroup = submittingSqlIds.has(groupSqlId);

									const mainWrestlerCandidate = {
										id: wrestlerItem.id,
										sqlId: wrestlerItem.sqlId,
										lastTeam: wrestlerItem.lastTeam || "",
										wrestlerName: wrestlerItem.name,
										isMainNewRecord: true
									};

									const allGroupCandidates = [
										mainWrestlerCandidate,
										...(wrestlerItem.potentialDuplicates || []).map(candidateItem => ({
											id: candidateItem.id,
											sqlId: candidateItem.sqlId,
											lastTeam: candidateItem.lastTeam || "",
											wrestlerName: candidateItem.name,
											isMainNewRecord: false
										}))
									];

									const selectedPrimary = primarySelections[groupSqlId] || null;
									const selectedDuplicates = duplicateSelections[groupSqlId] || [];

									return (
										<div
											key={ groupSqlId }
											className={`wrestler-duplicate-group-card ${ isGroupSubmitted ? "submitted-card" : "" }`}
										>
											{/* Card Header */}
											<div className="group-card-header">
												<div className="wrestler-title-info">
													<span className="wrestler-main-name">{ wrestlerItem.wrestlerName }</span>
													<span className="wrestler-sub-team">{ wrestlerItem.lastTeam || "No Team Specified" }</span>
													<span className="wrestler-sql-id">
														SQL ID: { wrestlerItem.sqlId } • Created: { formatDateDisplay(wrestlerItem.created) }
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
																		onChange={ () => handlePrimaryChange(groupSqlId, candidateRecord) }
																	/>
																</td>
																<td style={{ textAlign: "center" }}>
																	<input
																		type="checkbox"
																		checked={ isCurrentDuplicate }
																		disabled={ isGroupSubmitted || isCurrentPrimary }
																		onChange={ (eventObject) => handleDuplicateToggle(groupSqlId, candidateRecord, eventObject.target.checked) }
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
																		<span className="primary-badge" style={{ backgroundColor: "#0284c7" }}>New Wrestler</span>
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
																	<span className="primary-badge" style={{ backgroundColor: "#0284c7" }}>New Wrestler</span>
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
																		onChange={ () => handlePrimaryChange(groupSqlId, candidateRecord) }
																	/>
																	<span>Primary</span>
																</label>

																<label className="mobile-control-label">
																	<input
																		type="checkbox"
																		checked={ isCurrentDuplicate }
																		disabled={ isGroupSubmitted || isCurrentPrimary }
																		onChange={ (eventObject) => handleDuplicateToggle(groupSqlId, candidateRecord, eventObject.target.checked) }
																	/>
																	<span>Duplicate</span>
																</label>
															</div>
														</div>
													);
												})}
											</div>

											{/* Action Footer */}
											<div className="submit-actions-row">
												<button
													type="button"
													className="button-submit-duplicate"
													disabled={ isGroupSubmitted || isSubmittingCurrentGroup }
													onClick={ () => handleSubmitDuplicateGroup(groupSqlId) }
												>
													{ isGroupSubmitted ? "Saved" : isSubmittingCurrentGroup ? "Submitting..." : "Submit Duplicates" }
												</button>
											</div>
										</div>
									);
								})}
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
	reactRoot.render(<NewWrestlerManagement />);
}

export default NewWrestlerManagement;
