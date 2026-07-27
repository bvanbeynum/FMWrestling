import neo4j from "neo4j-driver";
import config from "./config.js";

let driver = null;

const getDriver = () => {
	if (!driver) {
		driver = neo4j.driver(
			config.memgraph.url,
			neo4j.auth.basic(config.memgraph.user, config.memgraph.password)
		);
	}
	return driver;
};

const extractVal = (val) => {
	if (val && typeof val === "object" && typeof val.toNumber === "function") {
		return val.toNumber();
	}
	return val;
};

export default {

	wrestlerFortMillPathsGet: async ({ sqlId }) => {
		const output = {};

		const numSqlId = parseInt(sqlId, 10);
		if (isNaN(numSqlId)) {
			output.status = 400;
			output.error = "Invalid wrestler sqlId parameter";
			return output;
		}

		let session = null;
		try {
			const memDriver = getDriver();
			session = memDriver.session();

			// Check if wrestler exists and if they are a Fort Mill wrestler
			const checkRes = await session.run(
				"MATCH (w:Wrestler { id: $sqlId }) RETURN w.IsFortMill as isFortMill, w.name as name LIMIT 1",
				{ sqlId: numSqlId }
			);

			if (checkRes.records.length === 0) {
				output.status = 200;
				output.data = {
					isFortMill: false,
					candidateWinningPaths: [],
					candidateLosingPaths: []
				};
				return output;
			}

			const isFortMillRaw = checkRes.records[0].get("isFortMill");
			const isFortMillVal = extractVal(isFortMillRaw) === 1;

			if (isFortMillVal) {
				output.status = 200;
				output.data = {
					isFortMill: true,
					candidateWinningPaths: [],
					candidateLosingPaths: []
				};
				return output;
			}

			const pathQuery = `
				MATCH p = (start:Wrestler { id: $sqlId })-[:Wrestled*1..3]->(target:Wrestler { IsFortMill: 1 })
				WHERE start <> target
				AND ALL(relationship IN relationships(p) WHERE relationship.IsWinner = $isWin)
				WITH p, [relationship IN relationships(p) | relationship.eventDate] as dateList
				WITH p, reduce(matchDate = dateList[0], date IN dateList | CASE WHEN date < matchDate THEN date ELSE matchDate END) as oldestDate
				RETURN p, oldestDate
				ORDER BY oldestDate DESC
				LIMIT 100
			`;

			const parsePathRecords = (records) => records.map(rec => {
				const pathObj = rec.get("p");
				const oldestDate = rec.get("oldestDate");
				const wrestlers = [];
				const matches = [];

				pathObj.segments.forEach((seg, index) => {
					if (index === 0) {
						wrestlers.push({
							id: extractVal(seg.start.properties.id),
							name: seg.start.properties.name,
							isFortMill: extractVal(seg.start.properties.IsFortMill) === 1
						});
					}
					wrestlers.push({
						id: extractVal(seg.end.properties.id),
						name: seg.end.properties.name,
						isFortMill: extractVal(seg.end.properties.IsFortMill) === 1
					});

					const rProps = seg.relationship.properties;
					matches.push({
						matchID: extractVal(rProps.matchID),
						eventDate: rProps.eventDate,
						winType: rProps.WinType,
						isWinner: rProps.IsWinner
					});
				});

				return {
					oldestDate,
					hops: matches.length,
					wrestlers,
					matches
				};
			});

			const winRes = await session.run(pathQuery, { sqlId: numSqlId, isWin: true });
			const loseRes = await session.run(pathQuery, { sqlId: numSqlId, isWin: false });

			const winningPaths = parsePathRecords(winRes.records);
			const losingPaths = parsePathRecords(loseRes.records);

			output.status = 200;
			output.data = {
				isFortMill: false,
				candidateWinningPaths: winningPaths,
				candidateLosingPaths: losingPaths
			};
		}
		catch (error) {
			output.status = 500;
			output.error = error.message;
		}
		finally {
			if (session) {
				await session.close();
			}
		}

		return output;
	},

	wrestlerOpponentsGraphGet: async ({ sqlId, timeframeMonths }) => {
		const output = {};

		const numericSqlId = parseInt(sqlId, 10);
		if (isNaN(numericSqlId)) {
			output.status = 400;
			output.error = "Invalid wrestler sqlId parameter";
			return output;
		}

		let startDate = null;
		const monthCount = parseInt(timeframeMonths, 10);
		if (!isNaN(monthCount) && monthCount > 0) {
			const calculatedDate = new Date();
			calculatedDate.setMonth(calculatedDate.getMonth() - monthCount);
			startDate = calculatedDate.toISOString().split("T")[0];
		}

		let session = null;
		try {
			const memDriver = getDriver();
			session = memDriver.session();

			const graphQuery = `
				MATCH (w:Wrestler { id: $sqlId })-[r:Wrestled]->(opp:Wrestler)
				WHERE ($startDate IS NULL OR r.eventDate >= $startDate)
				RETURN w.id as rootId, w.name as rootName, w.IsFortMill as rootFortMill,
				       r.matchID as matchID, r.eventDate as eventDate, r.IsWinner as isWinner, r.WinType as winType,
				       opp.id as oppId, opp.name as oppName, opp.IsFortMill as oppFortMill
				ORDER BY r.eventDate DESC
			`;

			const queryResponse = await session.run(graphQuery, { sqlId: numericSqlId, startDate });

			let rootWrestler = null;
			const connections = [];

			for (const recordItem of queryResponse.records) {
				if (!rootWrestler) {
					rootWrestler = {
						id: extractVal(recordItem.get("rootId")),
						name: recordItem.get("rootName"),
						isFortMill: extractVal(recordItem.get("rootFortMill")) === 1
					};
				}

				connections.push({
					opponent: {
						id: extractVal(recordItem.get("oppId")),
						name: recordItem.get("oppName"),
						isFortMill: extractVal(recordItem.get("oppFortMill")) === 1
					},
					match: {
						matchID: extractVal(recordItem.get("matchID")),
						eventDate: recordItem.get("eventDate"),
						isWinner: recordItem.get("isWinner"),
						winType: recordItem.get("winType")
					}
				});
			}

			if (!rootWrestler) {
				const rootQueryResponse = await session.run(
					"MATCH (w:Wrestler { id: $sqlId }) RETURN w.id as rootId, w.name as rootName, w.IsFortMill as rootFortMill LIMIT 1",
					{ sqlId: numericSqlId }
				);
				if (rootQueryResponse.records.length > 0) {
					const rootRecord = rootQueryResponse.records[0];
					rootWrestler = {
						id: extractVal(rootRecord.get("rootId")),
						name: rootRecord.get("rootName"),
						isFortMill: extractVal(rootRecord.get("rootFortMill")) === 1
					};
				}
			}

			output.status = 200;
			output.data = {
				root: rootWrestler,
				connections
			};
		}
		catch (error) {
			output.status = 500;
			output.error = error.message;
		}
		finally {
			if (session) {
				await session.close();
			}
		}

		return output;
	}

};
