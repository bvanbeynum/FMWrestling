import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/newwrestler.css";

const DuplicatesManagement = () => {
	const [ existingDuplicates, setExistingDuplicates ] = useState([]);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ errorMessage, setErrorMessage ] = useState("");

	const fetchDuplicatesData = async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			const fetchResponse = await fetch("/api/newwrestlerload?timespan=3");
			const responseData = await fetchResponse.json();

			if (responseData.error) {
				setErrorMessage(responseData.error);
			}
			else {
				setLoggedInUser(responseData.loggedInUser || null);
				setExistingDuplicates(responseData.existingDuplicates || []);
			}
		}
		catch (error) {
			setErrorMessage(error.message || "Failed to load duplicates data");
		}
		finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchDuplicatesData();
	}, []);

	const handleRemoveExistingDuplicate = async (duplicateRecordId) => {
		if (!confirm("Are you sure you want to remove this duplicate grouping?")) {
			return;
		}

		const targetRecord = existingDuplicates.find(item => item.id === duplicateRecordId);

		// Optimistically remove from state
		setExistingDuplicates(previousList => previousList.filter(item => item.id !== duplicateRecordId));

		try {
			const deleteResponse = await fetch("/api/newwrestlerdelete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: duplicateRecordId })
			});

			const deleteResultData = await deleteResponse.json();

			if (deleteResultData.error) {
				if (targetRecord) {
					setExistingDuplicates(previousList => [ targetRecord, ...previousList ]);
				}
				alert(`Failed to delete duplicate grouping: ${ deleteResultData.error }`);
			}
		}
		catch (error) {
			if (targetRecord) {
				setExistingDuplicates(previousList => [ targetRecord, ...previousList ]);
			}
			alert(`Error deleting duplicate grouping: ${ error.message }`);
		}
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
							<h1>Selected Duplicates</h1>
						</header>

						{ errorMessage && (
							<div className="no-records-message" style={{ color: "#dc2626", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "4px", marginBottom: "20px" }}>
								{ errorMessage }
							</div>
						)}

						{/* Existing Selected Duplicates Section */}
						<div className="existing-duplicates-container">
							{ existingDuplicates.length === 0 ? (
								<div className="no-records-message">
									No saved duplicate groupings found.
								</div>
							) : (
								<div className="existing-duplicates-list">
									{ existingDuplicates.map((duplicateRecord) => {
										const primaryWrestler = duplicateRecord.primary || {};
										const linkedDuplicates = duplicateRecord.duplicates || [];

										return (
											<div key={ duplicateRecord.id } className="existing-duplicate-card">
												<div className="existing-duplicate-details">
													<div className="primary-wrestler-info">
														<a
															href={`/portal/wrestler.html?sqlid=${ primaryWrestler.sqlId }`}
															target="_blank"
															rel="noreferrer"
															className="wrestler-link"
														>
															{ primaryWrestler.wrestlerName }
														</a>
														<span>(SQL ID: { primaryWrestler.sqlId })</span>
														{ primaryWrestler.lastTeam && <span>Team: { primaryWrestler.lastTeam }</span> }
													</div>

													<div className="duplicates-linked-list">
														<span className="kpi-sub-text" style={{ fontWeight: 600 }}>Linked Duplicates:</span>
														{ linkedDuplicates.map((duplicateItem) => (
															<span key={ duplicateItem.sqlId } className="duplicate-chip">
																<a
																	href={`/portal/wrestler.html?sqlid=${ duplicateItem.sqlId }`}
																	target="_blank"
																	rel="noreferrer"
																	className="wrestler-link"
																>
																	{ duplicateItem.wrestlerName }
																</a>
																{` (SQL ID: ${ duplicateItem.sqlId })`}
																{ duplicateItem.lastTeam ? ` • ${ duplicateItem.lastTeam }` : "" }
															</span>
														))}
													</div>
												</div>

												<button
													type="button"
													className="button-remove-duplicate"
													onClick={ () => handleRemoveExistingDuplicate(duplicateRecord.id) }
												>
													Remove
												</button>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const rootElement = document.getElementById("root");
if (rootElement) {
	const reactRoot = ReactDOM.createRoot(rootElement);
	reactRoot.render(<DuplicatesManagement />);
}

export default DuplicatesManagement;
