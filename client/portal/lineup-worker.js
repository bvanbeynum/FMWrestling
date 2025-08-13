const findBestLineup = (weightClassIndex, usedWrestlers, memo, allMatchups, timesCalled) => {
	if (weightClassIndex >= allMatchups.length) {
		return { wins: 0, lineup: [] };
	}
	timesCalled = (timesCalled || 0) + 1;

	const usedWrestlersKey = Array.from(usedWrestlers).sort().join(',');
	const memoKey = `${weightClassIndex}:${usedWrestlersKey}`;
	
	if (memo.has(memoKey)) {
		return memo.get(memoKey);
	}

	const currentWeightClass = allMatchups[weightClassIndex];
	console.log(`${ new Date().toLocaleString() }: ${timesCalled} - W: ${currentWeightClass.name}`)

	let bestSubResult = findBestLineup(weightClassIndex + 1, usedWrestlers, memo, allMatchups, timesCalled);
	let lineup = [{ ...currentWeightClass, selectedWrestler: null }, ...bestSubResult.lineup];
	let maxWins = bestSubResult.wins;

	const eligibleWrestlers = currentWeightClass.team
		.filter(w => !usedWrestlers.has(w.id))
		.sort((a, b) => b.rating - a.rating);

	for (const wrestler of eligibleWrestlers) {
		const isWin = wrestler.rating > currentWeightClass.opponentRating;
		const bestPossibleWins = (isWin ? 1 : 0) + (allMatchups.length - (weightClassIndex + 1));

		if (bestPossibleWins < maxWins) {
			continue;
		}

		const newUsedWrestlers = new Set(usedWrestlers);
		newUsedWrestlers.add(wrestler.id);

		const subResult = findBestLineup(weightClassIndex + 1, newUsedWrestlers, memo, allMatchups, timesCalled);
		const currentWins = (isWin ? 1 : 0) + subResult.wins;

		if (currentWins > maxWins) {
			maxWins = currentWins;
			lineup = [{ ...currentWeightClass, selectedWrestler: wrestler }, ...subResult.lineup];
			// console.log(`${new Date().toLocaleString()}: Level ${weightClassIndex} / ${timesCalled}: Picked ${wrestler.name} for weight ${currentWeightClass.name}`);
		}
	}

	const result = { wins: maxWins, lineup: lineup };
	memo.set(memoKey, result);
	return result;
};

self.onmessage = function(e) {
	const { matchups } = e.data;
	const memo = new Map();
	const { lineup } = findBestLineup(0, new Set(), memo, matchups);
	self.postMessage({ lineup });
};