import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Nav from "./nav.jsx";
import "./include/index.css";
import "./include/duplicates.css";

class SequenceMatcher {
	constructor(a = '', b = '', isjunk = null) {
		this.a = a;
		this.b = b;
		this.isjunk = isjunk;
		this.opcodes = [];
		this.matching_blocks = [];
		this.b2j = null;
		this.__chain_b();
	}

	getOpcodes() {
		if (this.opcodes.length > 0) {
			return this.opcodes;
		}
		let i = 0;
		let j = 0;
		for (const [ alo, blo, size ] of this.getMatchingBlocks()) {
			let tag = '';
			if (i < alo && j < blo) {
				tag = 'replace';
			} else if (i < alo) {
				tag = 'delete';
			} else if (j < blo) {
				tag = 'insert';
			}
			if (tag) {
				this.opcodes.push([ tag, i, alo, j, blo ]);
			}
			i = alo + size;
			j = blo + size;
			if (size) {
				this.opcodes.push([ 'equal', alo, i, blo, j ]);
			}
		}
		return this.opcodes;
	}

	getMatchingBlocks() {
		if (this.matching_blocks.length > 0) {
			return this.matching_blocks;
		}

		const la = this.a.length;
		const lb = this.b.length;

		const queue = [ [ 0, la, 0, lb ] ];
		const matching_blocks = [];

		while (queue.length > 0) {
			const [ alo, ahi, blo, bhi ] = queue.pop();
			const { i, j, k } = this.findLongestMatch(alo, ahi, blo, bhi);
			if (k > 0) {
				matching_blocks.push({ i, j, k });
				if (alo < i && blo < j) {
					queue.push([ alo, i, blo, j ]);
				}
				if (i + k < ahi && j + k < bhi) {
					queue.push([ i + k, ahi, j + k, bhi ]);
				}
			}
		}

		matching_blocks.sort((a, b) => {
			if (a.i < b.i) return -1;
			if (a.i > b.i) return 1;
			return 0;
		});

		let i1 = 0,
			j1 = 0,
			k1 = 0;
		const non_adjacent = [];
		for (const { i, j, k } of matching_blocks) {
			if (i1 + k1 === i && j1 + k1 === j) {
				k1 += k;
			} else {
				if (k1 > 0) {
					non_adjacent.push({ i: i1, j: j1, k: k1 });
				}
				i1 = i;
				j1 = j;
				k1 = k;
			}
		}
		if (k1 > 0) {
			non_adjacent.push({ i: i1, j: j1, k: k1 });
		}
		
		const filtered_blocks = [];
		for (const { i, j, k } of non_adjacent) {
			if (k > 0) {
				filtered_blocks.push([ i, j, k ]);
			}
		}

		this.matching_blocks = filtered_blocks;
		return this.matching_blocks;
	}

	findLongestMatch(alo, ahi, blo, bhi) {
		const a = this.a;
		const b = this.b;
		let besti = alo,
			bestj = blo,
			bestsize = 0;

		let j2len = {};
		
		for (let i = alo; i < ahi; i++) {
			let newj2len = {};
			const s = a[i];
			if(this.b2j[s]) {
				for (const j of this.b2j[s]) {
					if (j < blo) continue;
					if (j >= bhi) break;
					
					let k = (j2len[j-1] || 0) + 1;
					newj2len[j] = k;

					if (k > bestsize) {
						besti = i - k + 1;
						bestj = j - k + 1;
						bestsize = k;
					}
				}
			}
			j2len = newj2len;
		}

		return { i: besti, j: bestj, k: bestsize };
	}
	
	__chain_b() {
		const b = this.b;
		const n = b.length;
		this.b2j = {};
		for (let i = 0; i < n; i++) {
			const s = b[i];
			if (s in this.b2j) {
				this.b2j[s].push(i);
			} else {
				this.b2j[s] = [ i ];
			}
		}
	}
}

const DiffName = ({ groupName, duplicateName }) => {
	const matcher = new SequenceMatcher(groupName.toLowerCase(), duplicateName.toLowerCase());
	const opcodes = matcher.getOpcodes();
	
	const groupParts = [];
	const duplicateParts = [];

	opcodes.forEach(([tag, i1, i2, j1, j2], index) => {
		if (tag === 'replace') {
			groupParts.push(<span key={index} className="highlight">{groupName.substring(i1, i2)}</span>);
			duplicateParts.push(<span key={index} className="highlight">{duplicateName.substring(j1, j2)}</span>);
		} else if (tag === 'delete') {
			groupParts.push(<span key={index} className="highlight">{groupName.substring(i1, i2)}</span>);
		} else if (tag === 'insert') {
			duplicateParts.push(<span key={index} className="highlight">{duplicateName.substring(j1, j2)}</span>);
		} else if (tag === 'equal') {
			groupParts.push(groupName.substring(i1, i2));
			duplicateParts.push(duplicateName.substring(j1, j2));
		}
	});

	return (
		<>
			<div><>{groupParts.length > 0 ? groupParts : groupName}</></div>
			<div><>{duplicateParts.length > 0 ? duplicateParts : duplicateName}</></div>
		</>
	);
};

const Duplicates = () => {

	const [ pageActive, setPageActive ] = useState(false);
	const [ isLoading, setIsLoading ] = useState(true);
	const [ loggedInUser, setLoggedInUser ] = useState(null);
	const [ isFilterExpanded, setIsFilterExpanded ] = useState(false);

	const [ duplicateRange, setDuplicateRange ] = useState(7);
	const [ wrestlers, setWrestlers ] = useState([]);
	const [ selectedDuplicates, setSelectedDuplicates ] = useState([]);

	useEffect(() => {
		if (!pageActive) {

			fetch(`/api/duplicatesload`)
				.then(response => {
					if (response.ok) {
						return response.json();
					}
					else {
						throw Error(response.statusText);
					}
				})
				.then(data => {
					setLoggedInUser(data.loggedInUser);
					setPageActive(true);
					setIsLoading(false);
				})
				.catch(error => {
					console.warn(error);
				});
		}
	}, []);

	const filterDuplicates = () => {
		setIsLoading(true);

		fetch(`/api/duplicatessearch?dayspast=${ duplicateRange }`)
			.then(response => {
				if (response.ok) {
					return response.json();
				}
				else {
					throw Error(response.statusText);
				}
			})
			.then(data => {
				const duplicates = data.wrestlers.map(newWrestler => ({
					id: newWrestler.id,
					name: newWrestler.name,
					teams: [...new Set([...newWrestler.teams, ...newWrestler.duplicates.flatMap(duplicate => duplicate.teams)])],
					duplicates: newWrestler.duplicates
				}));

				setWrestlers(duplicates);
				setIsLoading(false);
			})
			.catch(error => {
				console.warn(error);
			});
	};

	const selectDuplicate = (newId, duplicateId) => {
		const mergeSet = [newId, duplicateId];

		if (selectedDuplicates.some(duplicateSet => duplicateSet.includes(duplicateId) && duplicateSet.includes(newId))) {
			setSelectedDuplicates(selectedDuplicates.filter(duplicateSet => !(duplicateSet.includes(duplicateId) && duplicateSet.includes(newId))));
		} 
		else if (selectedDuplicates.some(duplicateSet => duplicateSet.includes(duplicateId) || duplicateSet.includes(newId))) {
			setSelectedDuplicates(selectedDuplicates.map(duplicateSet => {
				if (duplicateSet.includes(duplicateId) || duplicateSet.includes(newId)) {
					return Array.from(new Set([...duplicateSet, ...mergeSet]));
				}
				return duplicateSet;
			}));
		}
		else {
			setSelectedDuplicates([...selectedDuplicates, mergeSet]);
		}
	};

	const mergeSelected = () => {
		if (selectedDuplicates.length === 0) {
			return;
		}

		fetch("/api/duplicatesmerge", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ duplicatesets: selectedDuplicates })
		})
		.then(response => {
			if (response.ok) {
				return response.json();
			}
			else {
				throw Error(response.statusText);
			}
		})
		.then(data => {
			if (data.error) {
				console.warn(`Error ${data.status}: ${data.error}`);
				return;
			}

			setSelectedDuplicates([]);
			filterDuplicates();
		})
		.catch(error => {
			console.warn(error);
		});
	};

	return (
<div className="page">
	<Nav loggedInUser={ loggedInUser } />

	<div>
		
		{
		isLoading ?

		<div className="pageLoading">
			<img src="/media/wrestlingloading.gif" />
		</div>

		: !loggedInUser  ?

		<div className="noAccess">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z"/></svg>
			<a>Unauthorized</a>
		</div>

		:

		<div className={`container ${ pageActive ? "active" : "" }`}>
			
			<header>
				<h1>Duplicate Management</h1>
			</header>
		
			<div className="panel filter">
				<div className="row">
					<h3>Filter</h3>

					<div className="filterExpand" onClick={ () => setIsFilterExpanded(isFilterExpanded => !isFilterExpanded) }>
						{
						isFilterExpanded ?
						// Close
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
						: 
						// Tune
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z"/></svg>
						}
					</div>
				</div>

				<div className={`filterContent ${ isFilterExpanded ? "active" : "" }`}>
					<label>
						Duplicate Range
						<input type="range" min="1" max="180" defaultValue="7" onChange={(event) => setDuplicateRange(event.target.value)} />
						<span>{ duplicateRange } days</span>
					</label>
					<button className="filterButton" onClick={ filterDuplicates }>Filter</button>
				</div>
			</div>

			{
			wrestlers.length > 0 &&
			<div className="panel duplicates">
				{wrestlers.map((group, groupIndex) => (
					<div key={groupIndex} className="duplicateGroup">
						<h3>{group.name}</h3>
						<div className="groupTeams">
							<strong>Teams:</strong> {group.teams.join(", ")}
						</div>
						<div className="duplicateItems">
							{group.duplicates.map((duplicate, duplicateIndex) => (
								<div key={duplicate.id || duplicateIndex} className="duplicateItem">
									<input
										type="checkbox"
										value={duplicate.id}
										onChange={ event => selectDuplicate(group.id, event.target.value) }
										checked={selectedDuplicates.some(duplicateSet => duplicateSet.includes(duplicate.id) && duplicateSet.includes(group.id))}
									/>
									<DiffName groupName={group.name} duplicateName={duplicate.name} />
								</div>
							))}
						</div>
					</div>
				))}
				
				<div className="mergeContainer">
					<button onClick={ () => mergeSelected() } disabled={ selectedDuplicates.length === 0 }>Merge Selected</button>
				</div>
			</div>
			}

		</div>

		}

	</div>

</div>

	);

}

ReactDOM.createRoot(document.getElementById("root") || document.createElement("div")).render(<Duplicates />);
export default Duplicates;
