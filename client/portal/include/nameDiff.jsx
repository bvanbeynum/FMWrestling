import React from "react";

class SequenceMatcher {
	constructor(primaryText, candidateText) {
		this.primaryText = primaryText;
		this.candidateText = candidateText;
	}

	findLongestMatch(primaryStartIndex, primaryEndIndex, candidateStartIndex, candidateEndIndex) {
		let bestPrimaryIndex = primaryStartIndex;
		let bestCandidateIndex = candidateStartIndex;
		let bestMatchLength = 0;

		const characterPositionLookup = {};
		for (let candidateOffset = candidateStartIndex; candidateOffset < candidateEndIndex; candidateOffset++) {
			const currentCharacter = this.candidateText[candidateOffset];
			if (!characterPositionLookup[currentCharacter]) {
				characterPositionLookup[currentCharacter] = [];
			}
			characterPositionLookup[currentCharacter].push(candidateOffset);
		}

		let previousMatchLengths = {};
		for (let primaryOffset = primaryStartIndex; primaryOffset < primaryEndIndex; primaryOffset++) {
			const currentMatchLengths = {};
			const currentCharacter = this.primaryText[primaryOffset];
			if (characterPositionLookup[currentCharacter]) {
				for (const candidateOffset of characterPositionLookup[currentCharacter]) {
					if (candidateOffset < candidateStartIndex || candidateOffset >= candidateEndIndex) {
						continue;
					}
					const matchLength = (previousMatchLengths[candidateOffset - 1] || 0) + 1;
					currentMatchLengths[candidateOffset] = matchLength;
					if (matchLength > bestMatchLength) {
						bestPrimaryIndex = primaryOffset - matchLength + 1;
						bestCandidateIndex = candidateOffset - matchLength + 1;
						bestMatchLength = matchLength;
					}
				}
			}
			previousMatchLengths = currentMatchLengths;
		}

		return [ bestPrimaryIndex, bestCandidateIndex, bestMatchLength ];
	}

	getMatchingBlocks() {
		const matchingBlockPairs = [];

		const findSubsequentMatches = (primaryStartIndex, primaryEndIndex, candidateStartIndex, candidateEndIndex) => {
			if (primaryStartIndex >= primaryEndIndex || candidateStartIndex >= candidateEndIndex) {
				return;
			}
			const [ matchPrimaryIndex, matchCandidateIndex, matchLength ] = this.findLongestMatch(
				primaryStartIndex,
				primaryEndIndex,
				candidateStartIndex,
				candidateEndIndex
			);

			if (matchLength > 0) {
				findSubsequentMatches(primaryStartIndex, matchPrimaryIndex, candidateStartIndex, matchCandidateIndex);
				matchingBlockPairs.push([ matchPrimaryIndex, matchCandidateIndex, matchLength ]);
				findSubsequentMatches(
					matchPrimaryIndex + matchLength,
					primaryEndIndex,
					matchCandidateIndex + matchLength,
					candidateEndIndex
				);
			}
		};

		findSubsequentMatches(0, this.primaryText.length, 0, this.candidateText.length);
		matchingBlockPairs.sort((firstBlock, secondBlock) => firstBlock[0] - secondBlock[0] || firstBlock[1] - secondBlock[1]);

		const combinedMatchingBlocks = [];
		let activePrimaryIndex = 0;
		let activeCandidateIndex = 0;
		let activeMatchLength = 0;

		for (const [ nextPrimaryIndex, nextCandidateIndex, nextMatchLength ] of matchingBlockPairs) {
			if (activePrimaryIndex + activeMatchLength === nextPrimaryIndex && activeCandidateIndex + activeMatchLength === nextCandidateIndex) {
				activeMatchLength += nextMatchLength;
			}
			else {
				if (activeMatchLength > 0) {
					combinedMatchingBlocks.push([ activePrimaryIndex, activeCandidateIndex, activeMatchLength ]);
				}
				activePrimaryIndex = nextPrimaryIndex;
				activeCandidateIndex = nextCandidateIndex;
				activeMatchLength = nextMatchLength;
			}
		}

		if (activeMatchLength > 0) {
			combinedMatchingBlocks.push([ activePrimaryIndex, activeCandidateIndex, activeMatchLength ]);
		}

		combinedMatchingBlocks.push([ this.primaryText.length, this.candidateText.length, 0 ]);
		return combinedMatchingBlocks;
	}

	getDiffOperations() {
		const matchingBlockPairs = this.getMatchingBlocks();
		const diffOperations = [];
		let currentPrimaryIndex = 0;
		let currentCandidateIndex = 0;

		for (const [ targetPrimaryIndex, targetCandidateIndex, matchLength ] of matchingBlockPairs) {
			let operationType = "";
			if (currentPrimaryIndex < targetPrimaryIndex && currentCandidateIndex < targetCandidateIndex) {
				operationType = "replace";
			}
			else if (currentPrimaryIndex < targetPrimaryIndex) {
				operationType = "delete";
			}
			else if (currentCandidateIndex < targetCandidateIndex) {
				operationType = "insert";
			}

			if (operationType) {
				diffOperations.push([ operationType, currentPrimaryIndex, targetPrimaryIndex, currentCandidateIndex, targetCandidateIndex ]);
			}

			currentPrimaryIndex = targetPrimaryIndex + matchLength;
			currentCandidateIndex = targetCandidateIndex + matchLength;

			if (matchLength > 0) {
				diffOperations.push([ "equal", targetPrimaryIndex, currentPrimaryIndex, targetCandidateIndex, currentCandidateIndex ]);
			}
		}

		return diffOperations;
	}
}

export function getNameDiffNodes(primaryWrestlerName = "", candidateWrestlerName = "") {
	const rawPrimaryName = String(primaryWrestlerName || "");
	const rawCandidateName = String(candidateWrestlerName || "");

	if (!rawPrimaryName || !rawCandidateName) {
		return {
			primaryHighlightedName: rawPrimaryName,
			candidateHighlightedName: rawCandidateName
		};
	}

	const lowerPrimaryName = rawPrimaryName.toLowerCase();
	const lowerCandidateName = rawCandidateName.toLowerCase();

	const sequenceMatcherInstance = new SequenceMatcher(lowerPrimaryName, lowerCandidateName);

	const primaryDifferenceNodes = [];
	const candidateDifferenceNodes = [];

	let primaryNodeSequenceCounter = 0;
	let candidateNodeSequenceCounter = 0;

	for (const [ operationType, primaryStart, primaryEnd, candidateStart, candidateEnd ] of sequenceMatcherInstance.getDiffOperations()) {
		if (operationType === "replace") {
			primaryDifferenceNodes.push(
				<span key={ primaryNodeSequenceCounter++ } className="diff">
					{ rawPrimaryName.slice(primaryStart, primaryEnd) }
				</span>
			);
			candidateDifferenceNodes.push(
				<span key={ candidateNodeSequenceCounter++ } className="diff">
					{ rawCandidateName.slice(candidateStart, candidateEnd) }
				</span>
			);
		}
		else if (operationType === "delete") {
			primaryDifferenceNodes.push(
				<span key={ primaryNodeSequenceCounter++ } className="diff">
					{ rawPrimaryName.slice(primaryStart, primaryEnd) }
				</span>
			);
		}
		else if (operationType === "insert") {
			candidateDifferenceNodes.push(
				<span key={ candidateNodeSequenceCounter++ } className="diff">
					{ rawCandidateName.slice(candidateStart, candidateEnd) }
				</span>
			);
		}
		else if (operationType === "equal") {
			primaryDifferenceNodes.push(rawPrimaryName.slice(primaryStart, primaryEnd));
			candidateDifferenceNodes.push(rawCandidateName.slice(candidateStart, candidateEnd));
		}
	}

	return {
		primaryHighlightedName: primaryDifferenceNodes,
		candidateHighlightedName: candidateDifferenceNodes
	};
}
