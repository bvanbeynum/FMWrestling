import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/parentemail.css";

const parseCsvClientText = (csvRawTextContent) => {
	const parsedRowsList = [];
	let currentRowFieldsList = [];
	let currentFieldText = "";
	let isInsideQuotesBoolean = false;

	for (let characterIndex = 0; characterIndex < csvRawTextContent.length; characterIndex++) {
		const currentCharacter = csvRawTextContent[characterIndex];
		const nextCharacter = csvRawTextContent[characterIndex + 1];

		if (currentCharacter === '"') {
			if (isInsideQuotesBoolean && nextCharacter === '"') {
				currentFieldText += '"';
				characterIndex++;
			} else {
				isInsideQuotesBoolean = !isInsideQuotesBoolean;
			}
		} else if (currentCharacter === ',' && !isInsideQuotesBoolean) {
			currentRowFieldsList.push(currentFieldText.trim());
			currentFieldText = "";
		} else if ((currentCharacter === '\r' || currentCharacter === '\n') && !isInsideQuotesBoolean) {
			if (currentCharacter === '\r' && nextCharacter === '\n') {
				characterIndex++;
			}
			currentRowFieldsList.push(currentFieldText.trim());
			if (currentRowFieldsList.some(fieldValueText => fieldValueText.length > 0)) {
				parsedRowsList.push(currentRowFieldsList);
			}
			currentRowFieldsList = [];
			currentFieldText = "";
		} else {
			currentFieldText += currentCharacter;
		}
	}

	if (currentFieldText.length > 0 || currentRowFieldsList.length > 0) {
		currentRowFieldsList.push(currentFieldText.trim());
		if (currentRowFieldsList.some(fieldValueText => fieldValueText.length > 0)) {
			parsedRowsList.push(currentRowFieldsList);
		}
	}

	return parsedRowsList;
};

const escapeCsvCellValue = (cellValueText) => {
	const stringValueText = cellValueText == null ? "" : String(cellValueText);
	if (stringValueText.includes('"') || stringValueText.includes(',') || stringValueText.includes('\n') || stringValueText.includes('\r')) {
		return `"${stringValueText.replace(/"/g, '""')}"`;
	}
	return stringValueText;
};

const ParentEmailManagementPage = () => {
	const [ isLoadingBoolean, setIsLoadingBoolean ] = useState(true);
	const [ loggedInUserObject, setLoggedInUserObject ] = useState(null);
	const [ parentEmailsList, setParentEmailsList ] = useState([]);
	
	const [ activeFilterTabString, setActiveFilterTabString ] = useState("active");
	const [ selectedGradesList, setSelectedGradesList ] = useState([]);
	const [ isGradeFilterDropdownOpenBoolean, setIsGradeFilterDropdownOpenBoolean ] = useState(false);
	const [ selectedFlagFilterString, setSelectedFlagFilterString ] = useState("All");
	const [ searchQueryText, setSearchQueryText ] = useState("");
	
	const [ selectedRowIdsList, setSelectedRowIdsList ] = useState([]);
	
	const [ isAddEditModalOpenBoolean, setIsAddEditModalOpenBoolean ] = useState(false);
	const [ editingRecordObject, setEditingRecordObject ] = useState(null);
	
	const [ isBulkUploadModalOpenBoolean, setIsBulkUploadModalOpenBoolean ] = useState(false);
	const [ isDragOverBoolean, setIsDragOverBoolean ] = useState(false);
	const [ parsedCsvPreviewList, setParsedCsvPreviewList ] = useState([]);

	const fetchParentEmailsList = () => {
		setIsLoadingBoolean(true);
		fetch("/api/parentemailload")
			.then(apiResponseObject => {
				if (apiResponseObject.ok) {
					return apiResponseObject.json();
				} else {
					throw new Error(apiResponseObject.statusText);
				}
			})
			.then(responseDataObject => {
				setLoggedInUserObject(responseDataObject.loggedInUser || null);
				setParentEmailsList(responseDataObject.parentEmails || []);
				setIsLoadingBoolean(false);
			})
			.catch(fetchErrorObject => {
				console.warn("Error loading parent emails:", fetchErrorObject);
				setIsLoadingBoolean(false);
			});
	};

	useEffect(() => {
		fetchParentEmailsList();
	}, []);

	const hasParentManagePrivilegeBoolean = loggedInUserObject && loggedInUserObject.privileges && (
		loggedInUserObject.privileges.includes("parentManage") || 
		loggedInUserObject.privileges.includes("parentmanage") ||
		loggedInUserObject.privileges.some(privilegeItem => (privilegeItem.token === "parentManage" || privilegeItem.name === "parentManage"))
	);

	const handleOpenAddModal = () => {
		setEditingRecordObject({
			email: "",
			name: "",
			isCoach: false,
			status: "active",
			wrestlers: [{ name: "", grade: "", isVarsity: false, isJV: false, isMiddle: false }]
		});
		setIsAddEditModalOpenBoolean(true);
	};

	const handleOpenEditModal = (targetRecordObject) => {
		setEditingRecordObject({
			...targetRecordObject,
			wrestlers: targetRecordObject.wrestlers && targetRecordObject.wrestlers.length > 0 ? targetRecordObject.wrestlers : [{ name: "", grade: "", isVarsity: false, isJV: false, isMiddle: false }]
		});
		setIsAddEditModalOpenBoolean(true);
	};

	const handleSaveRecord = () => {
		if (!editingRecordObject || !editingRecordObject.email) {
			alert("Email address is required.");
			return;
		}

		fetch("/api/parentemailsave", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ saveRecord: editingRecordObject })
		})
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				if (responseDataObject.error) {
					alert(`Error saving record: ${responseDataObject.error}`);
				} else {
					setIsAddEditModalOpenBoolean(false);
					setEditingRecordObject(null);
					fetchParentEmailsList();
				}
			})
			.catch(saveErrorObject => {
				alert(`Failed to save: ${saveErrorObject.message}`);
			});
	};

	const handleDeleteRecord = (targetRecordIdString) => {
		if (!confirm("Are you sure you want to delete this parent contact?")) return;

		fetch("/api/parentemaildelete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: targetRecordIdString })
		})
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				if (responseDataObject.error) {
					alert(`Error deleting record: ${responseDataObject.error}`);
				} else {
					setSelectedRowIdsList(previousList => previousList.filter(idItem => idItem !== targetRecordIdString));
					fetchParentEmailsList();
				}
			})
			.catch(deleteErrorObject => {
				alert(`Delete failed: ${deleteErrorObject.message}`);
			});
	};

	const handleBulkStatusChange = (targetStatusValueString) => {
		if (selectedRowIdsList.length === 0) return;

		fetch("/api/parentemailbulkstatus", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids: selectedRowIdsList, status: targetStatusValueString })
		})
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				if (responseDataObject.error) {
					alert(`Bulk status update error: ${responseDataObject.error}`);
				} else {
					setSelectedRowIdsList([]);
					fetchParentEmailsList();
				}
			})
			.catch(bulkErrorObject => {
				alert(`Bulk action failed: ${bulkErrorObject.message}`);
			});
	};

	const handleBulkDelete = () => {
		if (selectedRowIdsList.length === 0) return;
		if (!confirm(`Are you sure you want to delete ${selectedRowIdsList.length} selected records?`)) return;

		const deletePromisesList = selectedRowIdsList.map(recordIdItem => (
			fetch("/api/parentemaildelete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: recordIdItem })
			})
		));

		Promise.all(deletePromisesList)
			.then(() => {
				setSelectedRowIdsList([]);
				fetchParentEmailsList();
			})
			.catch(bulkDeleteErrorObject => {
				alert(`Bulk delete error: ${bulkDeleteErrorObject.message}`);
			});
	};

	const handleExportSelectedCsv = () => {
		if (selectedRowIdsList.length === 0) return;

		const selectedRecordsList = parentEmailsList.filter(parentRecordItem => selectedRowIdsList.includes(parentRecordItem.id));
		if (selectedRecordsList.length === 0) return;

		const csvHeaderColumnsList = ["Parent Name", "Email Address", "Wrestlers", "Varsity", "JV", "Middle"];

		const csvRowsList = selectedRecordsList.map(parentRecordItem => {
			const parentNameText = parentRecordItem.name || "";
			const emailAddressText = parentRecordItem.email || "";

			const wrestlersFormattedText = (parentRecordItem.wrestlers || []).map(wrestlerItem => {
				const wrestlerNameText = (wrestlerItem.name || "").trim();
				const wrestlerGradeText = (wrestlerItem.grade || "").trim();
				if (!wrestlerNameText) return "";
				return wrestlerGradeText ? `${wrestlerNameText} (Gr ${wrestlerGradeText})` : wrestlerNameText;
			}).filter(Boolean).join(", ");

			const isVarsityText = (parentRecordItem.wrestlers || []).some(wrestlerItem => wrestlerItem.isVarsity === true) ? "Y" : "N";
			const isJvText = (parentRecordItem.wrestlers || []).some(wrestlerItem => wrestlerItem.isJV === true) ? "Y" : "N";
			const isMiddleText = (parentRecordItem.wrestlers || []).some(wrestlerItem => wrestlerItem.isMiddle === true) ? "Y" : "N";

			return [
				parentNameText,
				emailAddressText,
				wrestlersFormattedText,
				isVarsityText,
				isJvText,
				isMiddleText
			];
		});

		const fullCsvContentText = [csvHeaderColumnsList, ...csvRowsList]
			.map(rowCellsList => rowCellsList.map(escapeCsvCellValue).join(","))
			.join("\r\n");

		const blobInstance = new Blob([fullCsvContentText], { type: "text/csv;charset=utf-8;" });
		const downloadObjectUrl = URL.createObjectURL(blobInstance);
		const anchorElement = document.createElement("a");
		anchorElement.href = downloadObjectUrl;
		anchorElement.setAttribute("download", `parent_contacts_export_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(anchorElement);
		anchorElement.click();
		document.body.removeChild(anchorElement);
		URL.revokeObjectURL(downloadObjectUrl);
	};

	const handleProcessFileContent = (rawCsvFileContentString) => {
		const parsedRowsArrayList = parseCsvClientText(rawCsvFileContentString);
		if (parsedRowsArrayList.length <= 1) {
			alert("CSV file does not contain header or row data.");
			return;
		}

		const headerRowList = parsedRowsArrayList[0].map(headerNameString => headerNameString.trim().toLowerCase());
		const findColumnIndexNumber = (searchColumnNameString) => headerRowList.findIndex(headerItem => headerItem.includes(searchColumnNameString.toLowerCase()));

		const emailColumnIndexNumber = findColumnIndexNumber("emails");
		const nameColumnIndexNumber = findColumnIndexNumber("name");
		const wrestlersColumnIndexNumber = findColumnIndexNumber("wrestlers");
		const coachColumnIndexNumber = findColumnIndexNumber("coach");
		const varsityColumnIndexNumber = findColumnIndexNumber("varsity");
		const jvColumnIndexNumber = findColumnIndexNumber("jv");
		const middleColumnIndexNumber = findColumnIndexNumber("middle");
		const gradeColumnIndexNumber = findColumnIndexNumber("grade");

		const previewRecordsList = [];

		for (let rowIdxNumber = 1; rowIdxNumber < parsedRowsArrayList.length; rowIdxNumber++) {
			const currentRowFieldsList = parsedRowsArrayList[rowIdxNumber];
			if (!currentRowFieldsList || currentRowFieldsList.length === 0) continue;

			const parsedEmailText = emailColumnIndexNumber !== -1 && currentRowFieldsList[emailColumnIndexNumber] ? currentRowFieldsList[emailColumnIndexNumber].trim() : "";
			const parsedNameText = nameColumnIndexNumber !== -1 && currentRowFieldsList[nameColumnIndexNumber] ? currentRowFieldsList[nameColumnIndexNumber].trim() : "";

			if (!parsedEmailText && !parsedNameText) continue;

			const isCoachBoolean = coachColumnIndexNumber !== -1 && (currentRowFieldsList[coachColumnIndexNumber] || "").trim().toUpperCase() === "Y";

			const rawWrestlersText = wrestlersColumnIndexNumber !== -1 ? (currentRowFieldsList[wrestlersColumnIndexNumber] || "").trim() : "";
			const rawGradesText = gradeColumnIndexNumber !== -1 ? (currentRowFieldsList[gradeColumnIndexNumber] || "").trim() : "";

			const wrestlerNamesList = rawWrestlersText ? rawWrestlersText.split(/;|,/).map(nameItem => nameItem.trim()).filter(Boolean) : [];
			const gradeValuesList = rawGradesText ? rawGradesText.split(/;|,/).map(gradeItem => gradeItem.trim()).filter(Boolean) : [];

			const isVarsityBoolean = varsityColumnIndexNumber !== -1 && (currentRowFieldsList[varsityColumnIndexNumber] || "").trim().toUpperCase() === "Y";
			const isJvBoolean = jvColumnIndexNumber !== -1 && (currentRowFieldsList[jvColumnIndexNumber] || "").trim().toUpperCase() === "Y";
			const isMiddleBoolean = middleColumnIndexNumber !== -1 && (currentRowFieldsList[middleColumnIndexNumber] || "").trim().toUpperCase() === "Y";

			const wrestlersSubDocumentsList = wrestlerNamesList.map((wrestlerNameText, wrestlerIndexNumber) => {
				const assignedGradeText = gradeValuesList[wrestlerIndexNumber] || gradeValuesList[0] || "";
				return {
					name: wrestlerNameText,
					grade: assignedGradeText,
					isVarsity: isVarsityBoolean,
					isJV: isJvBoolean,
					isMiddle: isMiddleBoolean
				};
			});

			previewRecordsList.push({
				email: parsedEmailText,
				name: parsedNameText,
				isCoach: isCoachBoolean,
				status: "active",
				wrestlers: wrestlersSubDocumentsList
			});
		}

		setParsedCsvPreviewList(previewRecordsList);
	};

	const handleFileInputChange = (eventObject) => {
		const selectedFileObject = eventObject.target.files && eventObject.target.files[0];
		if (selectedFileObject) {
			const fileReaderInstance = new FileReader();
			fileReaderInstance.onload = (fileEventObject) => {
				handleProcessFileContent(fileEventObject.target.result);
			};
			fileReaderInstance.readAsText(selectedFileObject);
		}
	};

	const handleDropFile = (eventObject) => {
		eventObject.preventDefault();
		setIsDragOverBoolean(false);
		if (eventObject.dataTransfer.files && eventObject.dataTransfer.files.length > 0) {
			const droppedFileObject = eventObject.dataTransfer.files[0];
			const fileReaderInstance = new FileReader();
			fileReaderInstance.onload = (fileEventObject) => {
				handleProcessFileContent(fileEventObject.target.result);
			};
			fileReaderInstance.readAsText(droppedFileObject);
		}
	};

	const handleConfirmBulkUpload = () => {
		if (parsedCsvPreviewList.length === 0) return;

		fetch("/api/parentemailbulkupload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ records: parsedCsvPreviewList })
		})
			.then(responseObject => responseObject.json())
			.then(responseDataObject => {
				if (responseDataObject.error) {
					alert(`Bulk upload error: ${responseDataObject.error}`);
				} else {
					setIsBulkUploadModalOpenBoolean(false);
					setParsedCsvPreviewList([]);
					fetchParentEmailsList();
				}
			})
			.catch(uploadErrorObject => {
				alert(`Upload failed: ${uploadErrorObject.message}`);
			});
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

	// Filtering Logic
	const filteredRecordsList = parentEmailsList.filter(parentRecordItem => {
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

		// Flag / Level Filter check (matches if at least one wrestler has selected level flag)
		if (selectedFlagFilterString !== "All") {
			const hasMatchingFlagWrestlerBoolean = (parentRecordItem.wrestlers || []).some(wrestlerItem => {
				if (selectedFlagFilterString === "varsity") return wrestlerItem.isVarsity === true;
				if (selectedFlagFilterString === "jv") return wrestlerItem.isJV === true;
				if (selectedFlagFilterString === "middle") return wrestlerItem.isMiddle === true;
				return true;
			});
			if (!hasMatchingFlagWrestlerBoolean) return false;
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

	// Checkbox Selection
	const allFilteredIdsList = filteredRecordsList.map(recordItem => recordItem.id);
	const isAllSelectedBoolean = allFilteredIdsList.length > 0 && allFilteredIdsList.every(idItem => selectedRowIdsList.includes(idItem));

	const handleToggleSelectAll = () => {
		if (isAllSelectedBoolean) {
			setSelectedRowIdsList(previousList => previousList.filter(idItem => !allFilteredIdsList.includes(idItem)));
		} else {
			setSelectedRowIdsList(previousList => [...new Set([...previousList, ...allFilteredIdsList])]);
		}
	};

	const handleToggleSelectRow = (targetRecordIdString) => {
		setSelectedRowIdsList(previousList => (
			previousList.includes(targetRecordIdString)
				? previousList.filter(idItem => idItem !== targetRecordIdString)
				: [...previousList, targetRecordIdString]
		));
	};

	// KPI Metrics Calculations
	const totalContactsCount = parentEmailsList.length;
	const activeContactsCount = parentEmailsList.filter(recordItem => recordItem.status === "active").length;
	const alumniContactsCount = parentEmailsList.filter(recordItem => recordItem.status === "alumni").length;

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
					<div className="parentemail-container">
						{/* Page Header matching schedule.jsx */}
						<header>
							<h1>Parent Email Directory</h1>
						</header>

						{/* Action Buttons Bar directly under Header */}
						<div className="header-actions-bar">
							<button className="btn-secondary" onClick={() => { setParsedCsvPreviewList([]); setIsBulkUploadModalOpenBoolean(true); }}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
								Bulk Upload CSV
							</button>

							<button className="lineupButton addDual" onClick={handleOpenAddModal}>
								+ Add Contact
							</button>
						</div>

						{/* 3 KPI Summary Cards */}
						<div className="parentemail-kpi-grid">
							<div className="kpi-card">
								<span className="kpi-label">Total Parent Contacts</span>
								<span className="kpi-value">{totalContactsCount}</span>
								<span className="kpi-subtext">All registered records</span>
							</div>

							<div className="kpi-card active-type">
								<span className="kpi-label">Active Records</span>
								<span className="kpi-value">{activeContactsCount}</span>
								<span className="kpi-subtext">Current wrestler parents</span>
							</div>

							<div className="kpi-card alumni-type">
								<span className="kpi-label">Alumni Records</span>
								<span className="kpi-value">{alumniContactsCount}</span>
								<span className="kpi-subtext">Former wrestler parents</span>
							</div>
						</div>

						{/* Controls Bar (Filter Tabs, Grade/Level Selects & Search Box) */}
						<div className="controls-bar">
							<div className="filter-tabs">
								<button className={`tab-btn ${activeFilterTabString === "active" ? "active" : ""}`} onClick={() => setActiveFilterTabString("active")}>Active</button>
								<button className={`tab-btn ${activeFilterTabString === "alumni" ? "active" : ""}`} onClick={() => setActiveFilterTabString("alumni")}>Alumni</button>
								<button className={`tab-btn ${activeFilterTabString === "archived" ? "active" : ""}`} onClick={() => setActiveFilterTabString("archived")}>Archived</button>
								<button className={`tab-btn ${activeFilterTabString === "all" ? "active" : ""}`} onClick={() => setActiveFilterTabString("all")}>All Records</button>
							</div>

							<div className="filter-selects-group">
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
									onChange={(eventObject) => setSelectedFlagFilterString(eventObject.target.value)}
									aria-label="Filter Level Flag"
								>
									<option value="All">All Levels</option>
									<option value="varsity">Varsity (V)</option>
									<option value="jv">Junior Varsity (JV)</option>
									<option value="middle">Middle School (MS)</option>
								</select>
							</div>

							<div className="search-box">
								<svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
								<input
									type="text"
									className="search-input"
									placeholder="Search name, email, wrestler..."
									value={searchQueryText}
									onChange={(eventObject) => setSearchQueryText(eventObject.target.value)}
								/>
							</div>
						</div>

						{/* Batch Actions Toolbar */}
						{selectedRowIdsList.length > 0 && (
							<div className="batch-toolbar">
								<span className="batch-info">{selectedRowIdsList.length} contact(s) selected</span>
								<div className="batch-buttons">
									<button className="btn-batch-action export" onClick={handleExportSelectedCsv}>Export CSV</button>
									<button className="btn-batch-action alumni" onClick={() => handleBulkStatusChange("alumni")}>Set as Alumni</button>
									<button className="btn-batch-action archive" onClick={() => handleBulkStatusChange("archived")}>Archive Selected</button>
									<button className="btn-batch-action activate" onClick={() => handleBulkStatusChange("active")}>Restore Active</button>
									<button className="btn-batch-action delete" onClick={handleBulkDelete}>Delete Selected</button>
								</div>
							</div>
						)}

						{/* Contact List */}
						<div className="list-container">
							<div className="parentemail-list-header">
								<div className="col-check">
									<input
										type="checkbox"
										checked={isAllSelectedBoolean}
										onChange={handleToggleSelectAll}
									/>
								</div>
								<div className="col-name">Parent Name</div>
								<div className="col-email">Email Address</div>
								<div className="col-wrestlers">Wrestlers & Levels</div>
								<div className="col-status">Status</div>
								<div className="col-actions">Actions</div>
							</div>

							<div className="parentemail-list-body">
								{filteredRecordsList.length === 0 ? (
									<div className="no-records-message">
										No parent email records found matching current criteria.
									</div>
								) : (
									filteredRecordsList.map((parentRecordItem) => {
										const isRowSelectedBoolean = selectedRowIdsList.includes(parentRecordItem.id);

										return (
											<div key={parentRecordItem.id} className={`parentemail-list-row ${isRowSelectedBoolean ? "selected" : ""}`}>
												<div className="col-check">
													<input
														type="checkbox"
														checked={isRowSelectedBoolean}
														onChange={() => handleToggleSelectRow(parentRecordItem.id)}
													/>
												</div>

												<div className="col-name">
													<span className="mobile-col-label">Parent:</span>
													<strong className="parent-name-text">{parentRecordItem.name || "N/A"}</strong>
													{parentRecordItem.isCoach && <span className="badge-coach">COACH</span>}
												</div>

												<div className="col-email">
													<span className="mobile-col-label">Email:</span>
													<a href={`mailto:${parentRecordItem.email}`} className="parent-email-link">
														{parentRecordItem.email}
													</a>
												</div>

												<div className="col-wrestlers">
													<span className="mobile-col-label">Wrestlers:</span>
													<div className="wrestler-tag-list">
														{(parentRecordItem.wrestlers || []).length === 0 ? (
															<span className="no-wrestlers-text">No wrestlers listed</span>
														) : (
															(parentRecordItem.wrestlers || []).map((wrestlerItem, wrestlerIndexNumber) => (
																<span key={wrestlerIndexNumber} className="wrestler-chip">
																	<span>{wrestlerItem.name}</span>
																	{wrestlerItem.grade && <span className="grade-badge">Gr {wrestlerItem.grade}</span>}
																	{wrestlerItem.isVarsity && <span className="level-badge varsity">V</span>}
																	{wrestlerItem.isJV && <span className="level-badge jv">JV</span>}
																	{wrestlerItem.isMiddle && <span className="level-badge middle">MS</span>}
																</span>
															))
														)}
													</div>
												</div>

												<div className="col-status">
													<span className="mobile-col-label">Status:</span>
													<span className={`badge-status ${parentRecordItem.status || "active"}`}>
														{parentRecordItem.status || "active"}
													</span>
												</div>

												<div className="col-actions">
													<div className="row-actions">
														<button className="action-btn-icon" title="Edit Contact" onClick={() => handleOpenEditModal(parentRecordItem)}>
															<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
														</button>
														<button className="action-btn-icon" title="Delete Contact" onClick={() => handleDeleteRecord(parentRecordItem.id)}>
															<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
														</button>
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Add / Edit Record Modal */}
			{isAddEditModalOpenBoolean && editingRecordObject && (
				<div className="modal-overlay">
					<div className="modal-card">
						<header className="modal-header">
							<h3 className="modal-title">{editingRecordObject.id ? "Edit Parent Contact" : "Add Parent Contact"}</h3>
							<button className="modal-close" onClick={() => setIsAddEditModalOpenBoolean(false)}>&times;</button>
						</header>
						<div className="modal-body">
							<div className="form-group">
								<label className="form-label">Parent Name</label>
								<input
									type="text"
									className="form-control"
									value={editingRecordObject.name || ""}
									onChange={(eventObject) => setEditingRecordObject({ ...editingRecordObject, name: eventObject.target.value })}
									placeholder="e.g. Tanya Coughenour"
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Email Address</label>
								<input
									type="email"
									className="form-control"
									value={editingRecordObject.email || ""}
									onChange={(eventObject) => setEditingRecordObject({ ...editingRecordObject, email: eventObject.target.value })}
									placeholder="e.g. tanya@example.com"
								/>
							</div>

							<div className="form-row" style={{ marginBottom: "16px" }}>
								<div style={{ flex: 1 }}>
									<label className="form-label">Status</label>
									<select
										className="form-control"
										value={editingRecordObject.status || "active"}
										onChange={(eventObject) => setEditingRecordObject({ ...editingRecordObject, status: eventObject.target.value })}
									>
										<option value="active">Active</option>
										<option value="alumni">Alumni</option>
										<option value="archived">Archived</option>
									</select>
								</div>

								<div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
									<label className="checkbox-label" style={{ marginBottom: "8px" }}>
										<input
											type="checkbox"
											checked={editingRecordObject.isCoach || false}
											onChange={(eventObject) => setEditingRecordObject({ ...editingRecordObject, isCoach: eventObject.target.checked })}
										/>
										<span>Is Coach</span>
									</label>
								</div>
							</div>

							<div className="form-group">
								<label className="form-label">Wrestlers List</label>
								<div className="wrestlers-editor-box">
									{(editingRecordObject.wrestlers || []).map((wrestlerItem, wrestlerIndexNumber) => (
										<div key={wrestlerIndexNumber} className="wrestler-edit-row">
											<input
												type="text"
												className="form-control"
												placeholder="Wrestler Name"
												style={{ flex: 2 }}
												value={wrestlerItem.name || ""}
												onChange={(eventObject) => {
													const updatedWrestlersList = [...editingRecordObject.wrestlers];
													updatedWrestlersList[wrestlerIndexNumber].name = eventObject.target.value;
													setEditingRecordObject({ ...editingRecordObject, wrestlers: updatedWrestlersList });
												}}
											/>
											<input
												type="text"
												className="form-control"
												placeholder="Grade"
												style={{ width: "70px" }}
												value={wrestlerItem.grade || ""}
												onChange={(eventObject) => {
													const updatedWrestlersList = [...editingRecordObject.wrestlers];
													updatedWrestlersList[wrestlerIndexNumber].grade = eventObject.target.value;
													setEditingRecordObject({ ...editingRecordObject, wrestlers: updatedWrestlersList });
												}}
											/>
											<label className="checkbox-label">
												<input
													type="checkbox"
													checked={wrestlerItem.isVarsity || false}
													onChange={(eventObject) => {
														const updatedWrestlersList = [...editingRecordObject.wrestlers];
														updatedWrestlersList[wrestlerIndexNumber].isVarsity = eventObject.target.checked;
														setEditingRecordObject({ ...editingRecordObject, wrestlers: updatedWrestlersList });
													}}
												/>
												V
											</label>
											<label className="checkbox-label">
												<input
													type="checkbox"
													checked={wrestlerItem.isJV || false}
													onChange={(eventObject) => {
														const updatedWrestlersList = [...editingRecordObject.wrestlers];
														updatedWrestlersList[wrestlerIndexNumber].isJV = eventObject.target.checked;
														setEditingRecordObject({ ...editingRecordObject, wrestlers: updatedWrestlersList });
													}}
												/>
												JV
											</label>
											<label className="checkbox-label">
												<input
													type="checkbox"
													checked={wrestlerItem.isMiddle || false}
													onChange={(eventObject) => {
														const updatedWrestlersList = [...editingRecordObject.wrestlers];
														updatedWrestlersList[wrestlerIndexNumber].isMiddle = eventObject.target.checked;
														setEditingRecordObject({ ...editingRecordObject, wrestlers: updatedWrestlersList });
													}}
												/>
												MS
											</label>
											<button
												className="action-btn-icon"
												style={{ color: "#ef4444", borderColor: "#fca5a5" }}
												onClick={() => {
													const updatedWrestlersList = editingRecordObject.wrestlers.filter((_, idxNumber) => idxNumber !== wrestlerIndexNumber);
													setEditingRecordObject({ ...editingRecordObject, wrestlers: updatedWrestlersList });
												}}
											>
												&times;
											</button>
										</div>
									))}
									<button
										className="btn-secondary"
										style={{ marginTop: "10px", fontSize: "12px", padding: "6px 12px" }}
										onClick={() => {
											const updatedWrestlersList = [...(editingRecordObject.wrestlers || []), { name: "", grade: "", isVarsity: false, isJV: false, isMiddle: false }];
											setEditingRecordObject({ ...editingRecordObject, wrestlers: updatedWrestlersList });
										}}
									>
										+ Add Wrestler
									</button>
								</div>
							</div>
						</div>
						<footer className="modal-footer">
							<button className="btn-secondary" onClick={() => setIsAddEditModalOpenBoolean(false)}>Cancel</button>
							<button className="btn-primary" onClick={handleSaveRecord}>Save Contact</button>
						</footer>
					</div>
				</div>
			)}

			{/* Drag & Drop Bulk Upload Modal */}
			{isBulkUploadModalOpenBoolean && (
				<div className="modal-overlay">
					<div className="modal-card">
						<header className="modal-header">
							<h3 className="modal-title">Bulk Upload Parent CSV</h3>
							<button className="modal-close" onClick={() => setIsBulkUploadModalOpenBoolean(false)}>&times;</button>
						</header>
						<div className="modal-body">
							{parsedCsvPreviewList.length === 0 ? (
								<div
									className={`dropzone-area ${isDragOverBoolean ? "dragging" : ""}`}
									onDragOver={(eventObject) => { eventObject.preventDefault(); setIsDragOverBoolean(true); }}
									onDragLeave={() => setIsDragOverBoolean(false)}
									onDrop={handleDropFile}
									onClick={() => document.getElementById("csv-file-input").click()}
								>
									<svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
									<div className="dropzone-text">Drag and drop your Team Email CSV file here</div>
									<div className="dropzone-subtext">or click to browse local files</div>
									<input
										id="csv-file-input"
										type="file"
										accept=".csv"
										style={{ display: "none" }}
										onChange={handleFileInputChange}
									/>
								</div>
							) : (
								<div>
									<div style={{ marginBottom: "12px", fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--on-surface)" }}>
										Parsed {parsedCsvPreviewList.length} parent record(s) from CSV:
									</div>
									<div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--outline)", borderRadius: "var(--rounded-sm)" }}>
										<table className="parentemail-table">
											<thead>
												<tr>
													<th>Name</th>
													<th>Email</th>
													<th>Coach</th>
													<th>Wrestlers</th>
												</tr>
											</thead>
											<tbody>
												{parsedCsvPreviewList.slice(0, 15).map((previewItem, idxNumber) => (
													<tr key={idxNumber}>
														<td>{previewItem.name || "-"}</td>
														<td>{previewItem.email || "-"}</td>
														<td>{previewItem.isCoach ? "Yes" : "No"}</td>
														<td>
															{(previewItem.wrestlers || []).map(w => `${w.name} (${w.grade || "N/A"})`).join(", ")}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									{parsedCsvPreviewList.length > 15 && (
										<div style={{ fontSize: "12px", color: "var(--on-surface-variant)", marginTop: "8px", textAlign: "center" }}>
											... and {parsedCsvPreviewList.length - 15} more records
										</div>
									)}
								</div>
							)}
						</div>
						<footer className="modal-footer">
							<button className="btn-secondary" onClick={() => setIsBulkUploadModalOpenBoolean(false)}>Cancel</button>
							{parsedCsvPreviewList.length > 0 && (
								<button className="btn-primary" onClick={handleConfirmBulkUpload}>
									Confirm Import ({parsedCsvPreviewList.length} records)
								</button>
							)}
						</footer>
					</div>
				</div>
			)}
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<ParentEmailManagementPage />);
