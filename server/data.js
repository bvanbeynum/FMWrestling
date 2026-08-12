import data from "./schema.js";
import mongoose from "mongoose";

const dataFunctionsObject = {

	userGet: async (userFilter = {}) => {
		const filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.deviceToken) {
			filter["devices.token"] = userFilter.deviceToken;
		}
		if (userFilter.roleId) {
			filter["roles.id"] = userFilter.roleId;
		}
		if (userFilter.email) {
			const escapedEmail = userFilter.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			filter["email"] = new RegExp(`^${escapedEmail}$`, "i");
		}

		try {
			const records = await data.user.find(filter).lean().exec();
			output.status = 200;
			output.data = { users: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	userSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.user.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.user({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	userDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.user.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	deviceRequestGet: async (id) => {
		const filter = {},
			output = {};

		if (id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(id) ? id : null;
		}

		try {
			const records = await data.deviceRequest.find(filter).lean().exec();
			output.status = 200;
			output.data = { deviceRequests: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	deviceRequestSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.deviceRequest.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.deviceRequest({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	deviceRequestDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.deviceRequest.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	wrestlerGet: async (userFilter = {}) => {
		let filter = {},
			select = {},
			sort = {},
			limit = 0,
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.ids) {
			filter["_id"] = { $in: userFilter.ids.map(id => mongoose.Types.ObjectId.isValid(id) ? id : null) };
		}
		if (userFilter.name) {
			const searchName = userFilter.name.toLowerCase();
			filter.searchName = { $regex: new RegExp(searchName) };
		}
		if (userFilter.teamPartial) {
			const searchTeam = userFilter.teamPartial.toLowerCase();
			filter["searchTeams"] = { $regex: new RegExp("^" + searchTeam) };
		}
		if (userFilter.teamName) {
			const searchTeam = userFilter.teamName.toLowerCase();
			filter["searchTeams"] = searchTeam;
		}
		if (userFilter.state) {
			filter.states = userFilter.state.toUpperCase();
		}
		if (userFilter.lastWeightClass) {
			filter.lastWeightClass = { $regex: new RegExp("^" + userFilter.lastWeightClass) };
		}
		if (userFilter.wrestledSince) {
			filter["lastEvent.date"] = { $gte: new Date(userFilter.wrestledSince) };
		}
		if (userFilter.sqlId) {
			filter.sqlId = userFilter.sqlId;
		}
		if (userFilter.sqlIds) {
			filter.sqlId = { $in: userFilter.sqlIds };
		}
		if (userFilter.select) {
			select = userFilter.select.reduce((output, current) => ({...output, [current]: 1 }), {});
		}
		if (userFilter.createdSince) {
			filter.created = { $gte: new Date(userFilter.createdSince) };
		}
		if (userFilter.ratingSort) {
			sort = { rating: -1 };
			limit = 20;
		}

		try {
			const records = await data.wrestler.find(filter).select(select).sort(sort).limit(limit).lean().exec();
			output.status = 200;
			output.data = { wrestlers: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	wrestlerSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.name) {
			saveObject.searchName = saveObject.name.toLowerCase();
			const trimmedName = saveObject.name.toLowerCase().trim();
			const spaceIndex = trimmedName.indexOf(' ');

			let firstName = "";
			let lastName = "";

			if (spaceIndex === -1) {
				// Handle single-word names
				firstName = trimmedName;
				lastName = "";
			} else {
				// Everything before the first space
				firstName = trimmedName.substring(0, spaceIndex);
				// Everything after the first space
				lastName = trimmedName.substring(spaceIndex + 1);
			}

			const firstInitial = firstName.length > 0 ? firstName.charAt(0) : "";
			const lastInitial = lastName.length > 0 ? lastName.charAt(0) : "";

			saveObject.searchName = trimmedName;
			saveObject.searchFirstName = firstName;
			saveObject.searchLastName = lastName;
			saveObject.searchFirstInitial = firstInitial;
			saveObject.searchLastInitial = lastInitial;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.wrestler.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.wrestler({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	wrestlerDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.wrestler.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	wrestlerBulkSave: async (wrestlers) => {
		const output = {};

		if (!wrestlers || !Array.isArray(wrestlers) || wrestlers.length === 0) {
			output.status = 550;
			output.error = "Missing or empty wrestlers array for bulk save";
			return output;
		}

		const operations = [];

		for (const wrestler of wrestlers) {
			if (!wrestler || typeof wrestler !== "object") continue;

			const { id, _id, created, modified, ...updateFields } = wrestler;

			if (updateFields.name) {
				updateFields.searchName = updateFields.name.toLowerCase();
			}

			let filter = null;
			if (id && mongoose.Types.ObjectId.isValid(id)) {
				filter = { _id: id };
			}
			else if (_id && mongoose.Types.ObjectId.isValid(_id)) {
				filter = { _id: _id };
			}
			else if (updateFields.sqlId !== undefined && updateFields.sqlId !== null) {
				filter = { sqlId: updateFields.sqlId };
			}

			if (filter) {
				operations.push({
					updateOne: {
						filter: filter,
						update: {
							$set: {
								...updateFields,
								modified: new Date()
							},
							$setOnInsert: {
								created: new Date()
							}
						},
						upsert: true
					}
				});
			}
			else {
				operations.push({
					insertOne: {
						document: {
							...updateFields,
							created: new Date(),
							modified: new Date()
						}
					}
				});
			}
		}

		if (operations.length === 0) {
			output.status = 550;
			output.error = "No valid wrestler operations to execute";
			return output;
		}

		try {
			const result = await data.wrestler.bulkWrite(operations, { ordered: false });

			output.status = 200;
			output.data = {
				status: "ok",
				matchedCount: result.matchedCount,
				modifiedCount: result.modifiedCount,
				upsertedCount: result.upsertedCount,
				insertedCount: result.insertedCount
			};
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	wrestlerDuplicates: async (wrestlerIds = []) => {
		const startTimeMs = Date.now();
		const outputResults = {};

		try {
			let targetWrestlerIdsList = [];
			if (wrestlerIds && Array.isArray(wrestlerIds)) {
				targetWrestlerIdsList = wrestlerIds;
			}

			if (targetWrestlerIdsList.length === 0) {
				outputResults.status = 200;
				outputResults.data = { wrestlers: [] };
				return outputResults;
			}

			// Query 1: Fetch target wrestler records for the requested IDs
			const objectIdList = targetWrestlerIdsList
				.filter(idValue => mongoose.Types.ObjectId.isValid(idValue))
				.map(idValue => new mongoose.Types.ObjectId(idValue));

			const records = await data.wrestler
				.find({ _id: { $in: objectIdList } })
				.lean()
				.exec();
			const wrestlers = records.map(({ _id, __v, ...data }) => ({ id: _id, ...data }));

			if (wrestlers.length === 0) {
				outputResults.status = 200;
				outputResults.data = { wrestlers: [] };
				return outputResults;
			}

			let query = {},
				searchTeams = [];
			if (wrestlers.length === 1) {
				const firstName = (wrestlers[0].firstName || "").toLowerCase().trim();
				const firstInitial = (wrestlers[0].firstInitial || firstName.charAt(0) || "").toLowerCase().trim();
				const lastName = (wrestlers[0].lastName || "").toLowerCase().trim();
				const lastInitial = (wrestlers[0].lastInitial || lastName.charAt(0) || "").toLowerCase().trim();
				const sqlId = wrestlers[0].sqlId;

				query["sqlId"] = { $ne: sqlId };
				query["$or"] = [
					{ firstInitial: firstInitial, lastName: lastName },
					{ firstName: firstName, lastInitial: lastInitial }
				];
			}
			else {
				searchTeams = [...new Set(wrestlers.flatMap(wrestler => wrestler.searchTeams || []))];
				query["searchTeams"] = { $in: searchTeams };
			}

			// Fetch all candidate duplicate records sharing any search team in 1 bulk query
			const candidatePoolRecords = await data.wrestler
					.find(query)
					.select({ _id: 1, sqlId: 1, name: 1, firstName: 1, firstInitial: 1, lastName: 1, lastInitial: 1, lastTeam: 1, created: 1, searchTeams: 1 })
					.lean()
					.exec();

			// In-Memory Matching loop
			const processedWrestlers = [];
			if (wrestlers.length === 1) {
				processedWrestlers.push({
					...wrestlers[0],
					potentialDuplicates: candidatePoolRecords.map(candidateRecord => ({
						id: candidateRecord._id ? candidateRecord._id.toString() : null,
						sqlId: candidateRecord.sqlId,
						name: candidateRecord.name,
						lastTeam: candidateRecord.lastTeam,
						created: candidateRecord.created,
						searchTeams: candidateRecord.searchTeams
					}))
				});
			}
			else {
				// Index candidate pool by team for fast in-memory lookup
				const candidateMapByTeam = new Map();
				for (const candidateRecord of candidatePoolRecords) {
					for (const teamName of candidateRecord.searchTeams || []) {
						if (!candidateMapByTeam.has(teamName)) {
							candidateMapByTeam.set(teamName, []);
						}
						candidateMapByTeam.get(teamName).push(candidateRecord);
					}
				}

				for (const wrestler of wrestlers) {
					const wrestlerSqlId = wrestler.sqlId;
					const firstName = (wrestler.firstName || "").toLowerCase().trim();
					const firstInitial = (wrestler.firstInitial || firstName.charAt(0) || "").toLowerCase().trim();
					const lastName = (wrestler.lastName || "").toLowerCase().trim();
					const lastInitial = (wrestler.lastInitial || lastName.charAt(0) || "").toLowerCase().trim();

					// Gather candidate pool for this wrestler's teams
					const candidateCandidatesSet = new Map();
					for (const teamName of wrestler.searchTeams || []) {
						const matchingTeamCandidates = candidateMapByTeam.get(teamName) || [];
						for (const candidateRecord of matchingTeamCandidates) {
							if (candidateRecord.sqlId !== wrestlerSqlId) {
								candidateCandidatesSet.set(candidateRecord.sqlId, candidateRecord);
							}
						}
					}

					// Filter candidates by name criteria
					const matchingCandidateDuplicates = [];
					for (const candidateRecord of candidateCandidatesSet.values()) {
						const candidateFirstName = (candidateRecord.firstName || "").toLowerCase().trim();
						const candidateFirstInitial = (candidateRecord.firstInitial || candidateFirstName.charAt(0) || "").toLowerCase().trim();
						const candidateLastName = (candidateRecord.lastName || "").toLowerCase().trim();
						const candidateLastInitial = (candidateRecord.lastInitial || candidateLastName.charAt(0) || "").toLowerCase().trim();

						const isFirstNameAndLastInitialMatch = (firstName && candidateFirstName && firstName === candidateFirstName) &&
							(lastInitial && candidateLastInitial && lastInitial === candidateLastInitial);

						const isFirstInitialAndLastNameMatch = (firstInitial && candidateFirstInitial && firstInitial === candidateFirstInitial) &&
							(lastName && candidateLastName && lastName === candidateLastName);

						if (isFirstNameAndLastInitialMatch || isFirstInitialAndLastNameMatch) {
							matchingCandidateDuplicates.push({
								id: candidateRecord._id ? candidateRecord._id.toString() : null,
								sqlId: candidateRecord.sqlId,
								name: candidateRecord.name,
								lastTeam: candidateRecord.lastTeam,
								created: candidateRecord.created,
								searchTeams: candidateRecord.searchTeams
							});
						}
					}

					processedWrestlers.push({
						...wrestler,
						potentialDuplicates: matchingCandidateDuplicates
					});
				}
			}

			outputResults.status = 200;
			outputResults.data = {
				wrestlers: processedWrestlers
			};
		}
		catch (error) {
			outputResults.status = 560;
			outputResults.error = error.message;
		}

		return outputResults;
	},

	schoolGet: async (userFilter = {}) => {
		let filter = {},
			select = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.name) {
			const searchName = userFilter.name.toLowerCase();
			filter.searchName = { $regex: new RegExp(searchName) };
		}
		if (userFilter.names) {
			const regexes = userFilter.names.map(name => new RegExp("^" + name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i"));
			filter["$or"] = [
				{ name: { $in: regexes } },
				{ lookupNames: { $in: regexes } }
			];
		}
		if (userFilter.select) {
			select = userFilter.select.reduce((output, current) => ({...output, [current]: 1 }), {});
		}

		try {
			const records = await data.school.find(filter).select(select).lean().exec();
			output.status = 200;
			output.data = { schools: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	schoolSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.name) {
			saveObject.searchName = saveObject.name.toLowerCase();
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.school.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.school({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	schoolDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.school.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	roleGet: async (id, all) => {
		let filter = {},
			output = {};

		if (id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(id) ? id : null;
		}
		if (!all) {
			filter.isActive = true;
		}

		try {
			const records = await data.role.find(filter).lean().exec();
			output.status = 200;
			output.data = { roles: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	roleSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.role.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.role({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	roleDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.role.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	privilegeGet: async (userFilter = {}) => {
		let filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.token) {
			filter.token = userFilter.token;
		}

		try {
			const records = await data.privilege.find(filter).lean().exec();
			output.status = 200;
			output.data = { privileges: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	privilegeSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.privilege.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.privilege({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	privilegeDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.privilege.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	eventGet: async (userFilter = {}) => {
		let filter = {},
			select = {},
			output = {},
			filterInclude = [];

		if (userFilter.id) {
			filterInclude.push({ _id: mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null });
		}
		if (userFilter.sqlId) {
			filterInclude.push({ sqlId: userFilter.sqlId });
		}
		if (userFilter.sqlIds) {
			filterInclude.push({ sqlId: { $in: userFilter.sqlIds } });
		}
		if (userFilter.eventSystem) {
			filterInclude.push({ eventSystem: userFilter.eventSystem });
		}
		if (userFilter.eventType) {
			filterInclude.push({ eventType: userFilter.eventType });
		}
		if (userFilter.state) {
			filterInclude.push({ state: userFilter.state.toUpperCase() });
		}
		if (userFilter.modifiedSince) {
			filterInclude.push({ modified: { $gte: new Date(userFilter.modifiedSince) } });
		}
		if (userFilter.select) {
			select = userFilter.select.reduce((output, current) => ({...output, [current]: 1 }), {});
			if (userFilter.select.includes("hasMatches")) {
				select["matches"] = { $slice: 1 };
			}
		}
		if (userFilter.team) {
			filterInclude.push({ searchTeams: userFilter.team.toLowerCase() });
		}
		if (userFilter.startDate && userFilter.endDate) {
			const startDate = new Date(Date.parse(userFilter.startDate)),
				endDate = new Date(Date.parse(userFilter.endDate));

			filterInclude.push({ date: { $gte: startDate } });
			filterInclude.push({ date: { $lte: endDate } });
		}
		filter = { $and: filterInclude }

		try {
			const records = await data.event.find(filter).select(select).lean().exec();
			output.status = 200;
			output.data = { 
				events: records.map(({ _id, __v, ...data }) => ({ 
					id: _id,
					...data,
					hasMatches: userFilter.select && userFilter.select.includes("hasMatches") ?
						!!(data.matches && data.matches.length > 0) 
						: null
				})) 
			};
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	eventSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.matches) {
			saveObject.searchTeams = [...new Set(saveObject.matches
					.filter(match => match.wrestlers)
					.flatMap(match => match.wrestlers.map(wrestler => wrestler.team?.toLowerCase()))
				)];
			
			saveObject.matches = saveObject.matches.map(match => ({
				...match,
				divisionConvert:
					/^jv/i.test(match.division) ? "JV" :
					/girl/i.test(match.division) ? "Girls" :
					/women/i.test(match.division) ? "Girls" :
					/woman/i.test(match.division) ? "Girls" :
					/ms/i.test(match.division) ? "Middle School" :
					/middle/i.test(match.division) ? "Middle School" :
					/10U/i.test(match.division) ? "Middle School" :
					/8U/i.test(match.division) ? "Middle School" :
					/12U/i.test(match.division) ? "Middle School" :
					/14U/i.test(match.division) ? "Middle School" :
					/7[ &]*8/i.test(match.division) ? "Middle School" :
					/9[ &]*10/i.test(match.division) ? "JV" :
					/11[ &]*12/i.test(match.division) ? "Middle School" :
					/jv/i.test(saveObject.name) ? "JV" :
					/^hs/i.test(match.division) ? "Varsity" :
					/high/i.test(match.division) ? "Varsity" :
					/state tournament/i.test(match.division) ? "Varsity" :
					/varsity/i.test(match.division) ? "Varsity"
					: "Other"
			}));
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.event.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.event({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	eventBulkSave: async (events) => {
		const output = {};

		if (!events || !Array.isArray(events) || events.length === 0) {
			output.status = 550;
			output.error = "Missing or empty events array for bulk save";
			return output;
		}

		const operations = [];

		for (const event of events) {
			if (!event || typeof event !== "object") continue;

			// Clean payload to prevent schema validation/immutability errors
			const { id, _id, created, modified, ...updateFields } = event;

			let filter = null;
			if (id && mongoose.Types.ObjectId.isValid(id)) {
				filter = { _id: id };
			}
			else if (_id && mongoose.Types.ObjectId.isValid(_id)) {
				filter = { _id: _id };
			}
			else if (updateFields.sqlId !== undefined && updateFields.sqlId !== null) {
				filter = { sqlId: updateFields.sqlId };
			}

			if (filter) {
				operations.push({
					updateOne: {
						filter: filter,
						update: {
							$set: {
								...updateFields,
								modified: new Date()
							},
							$setOnInsert: {
								created: new Date()
							}
						},
						upsert: true
					}
				});
			}
			else {
				operations.push({
					insertOne: {
						document: {
							...updateFields,
							created: new Date(),
							modified: new Date()
						}
					}
				});
			}
		}

		if (operations.length === 0) {
			output.status = 550;
			output.error = "No valid event operations to execute";
			return output;
		}

		try {
			// ordered: false lets operations continue even if one fails
			const result = await data.event.bulkWrite(operations, { ordered: false });

			output.status = 200;
			output.data = {
				status: "ok",
				matchedCount: result.matchedCount,
				modifiedCount: result.modifiedCount,
				upsertedCount: result.upsertedCount,
				insertedCount: result.insertedCount
			};
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	eventDelete: async (id, sqlId) => {
		const output = {};

		if (sqlId) {
			try {
				const record = await data.event.findOne({ sqlId: sqlId });
				id = record["_id"]
			}
			catch (error) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}
		}

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.event.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	teamGet: async (userFilter = {}) => {
		let filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}

		try {
			const records = await data.team.find(filter).lean().exec();
			output.status = 200;
			output.data = { teams: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	teamSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.team.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.team({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	teamDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.team.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	externalWrestlerGet: async (userFilter = {}) => {
		let filter = {},
			select = {},
			output = {};
		
		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.name) {
			filter.name = { $regex: new RegExp(userFilter.name, "i") };
		}
		if (userFilter.teamPartial) {
			filter["events.team"] = { $regex: new RegExp("^" + userFilter.teamPartial, "i") };
		}
		if (userFilter.teamName) {
			filter["events.team"] = { $regex: new RegExp("^" + userFilter.teamName + "$", "i") };
		}
		if (userFilter.ids) {
			filter["_id"] = { $in: userFilter.ids.filter(id => mongoose.Types.ObjectId.isValid(id)) };
		}
		if (userFilter.sqlId) {
			filter.sqlId = userFilter.sqlId;
		}
		if (userFilter.sqlIds) {
			filter.sqlId = { $in: userFilter.sqlIds };
		}
		if (userFilter.select) {
			select = userFilter.select.reduce((output, current) => ({...output, [current]: 1 }), {});
		}

		try {
			const records = await data.externalWrestler.find(filter).select(select).lean().limit(userFilter.max).exec();
			output.status = 200;
			output.data = { externalWrestlers: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	externalWrestlerSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.externalWrestler.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});

				if (record.firstName && record.lastName) {
					record.name = record.firstName + " " + record.lastName;
					record.searchName = record.name.toLowerCase()
				}
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.externalWrestler({ 
					...saveObject, 
					name: saveObject.firstName + " " + saveObject.lastName, 
					searchName: saveObject.firstName.toLowerCase() + " " + saveObject.lastName.toLowerCase(), 
					created: new Date(), 
					modified: new Date() 
				})).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	externalWrestlerDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.externalWrestler.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	scmatTeamGet: async (userFilter = {}) => {
		let filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.name) {
			filter.name = { $regex: new RegExp(userFilter.name, "i") }
		}
		if (userFilter.exactName) {
			filter.name = { $regex: new RegExp("^" + userFilter.exactName + "$", "i") }
		}
		if (userFilter.ids) {
			filter["_id"] = { $in: userFilter.ids.filter(id => mongoose.Types.ObjectId.isValid(id)) }
		}

		try {
			const records = await data.scmatTeam.find(filter).lean().exec();
			output.status = 200;
			output.data = { scmatTeams: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	scmatTeamSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.scmatTeam.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.scmatTeam({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	scmatTeamDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.scmatTeam.deleteOne({ _id: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	dualGet: async (userFilter = {}) => {
		const filter = {},
			select = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.startDate && userFilter.endDate) {
			const startDate = new Date(Date.parse(userFilter.startDate)),
				endDate = new Date(Date.parse(userFilter.endDate));
			filter.dualDate = {
				$gte: startDate,
				$lte: endDate
			};
		}
		if (userFilter.select) {
			select = userFilter.select.reduce((output, current) => ({...output, [current]: 1 }), {});
		}

		try {
			const records = await data.dual.find(filter).select(select).lean().exec();
			output.status = 200;
			output.data = { duals: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	dualSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.dual.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();

				// Update corresponding event if it exists
				await data.event.updateOne(
					{ systemId: record._id.toString(), eventSystem: "WrestlingPortal" },
					{
						$set: {
							date: record.dualDate,
							modified: new Date()
						}
					}
				).exec();

				// Sync updates to corresponding teamEvent if it exists
				await data.teamEvent.updateMany(
					{ dualId: record._id },
					{
						$set: {
							date: record.dualDate,
							modified: new Date()
						}
					}
				).exec();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.dual({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	dualDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.dual.deleteOne({ _id: id });
			await data.event.deleteOne({ systemId: id.toString(), eventSystem: "WrestlingPortal" });
			await data.teamEvent.deleteMany({ dualId: id });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	teamEventGet: async (userFilter = {}) => {
		let filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.startDate && userFilter.endDate) {
			const startDate = new Date(Date.parse(userFilter.startDate)),
				endDate = new Date(Date.parse(userFilter.endDate));
			
			filter.date = {
				$gte: startDate,
				$lte: endDate
			};
		}
		if (userFilter.eventId) {
			filter.eventId = userFilter.eventId;
		}
		if (userFilter.division && userFilter.division !== "All") {
			filter.division = userFilter.division;
		}

		try {
			const records = await data.teamEvent.find(filter).lean().exec();
			output.status = 200;
			output.data = { teamEvents: records.map(({ _id, __v, ...remainingFields }) => ({ id: _id, ...remainingFields })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	teamEventSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.teamEvent.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field !== "id" && field !== "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();
				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				const toSave = { ...saveObject, created: new Date(), modified: new Date() };
				if (toSave.eventId) toSave.eventId = mongoose.Types.ObjectId.isValid(toSave.eventId) ? new mongoose.Types.ObjectId(toSave.eventId) : null;
				if (toSave.dualId) toSave.dualId = mongoose.Types.ObjectId.isValid(toSave.dualId) ? new mongoose.Types.ObjectId(toSave.dualId) : null;
				record = await (new data.teamEvent(toSave)).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	teamEventDelete: async (recordId) => {
		const output = {};

		if (!recordId || !mongoose.Types.ObjectId.isValid(recordId)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.teamEvent.deleteOne({ _id: recordId });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	parentEmailGet: async (parentEmailFilter = {}) => {
		const filterObject = {},
			outputObject = {};

		if (parentEmailFilter.id) {
			filterObject["_id"] = mongoose.Types.ObjectId.isValid(parentEmailFilter.id) ? parentEmailFilter.id : null;
		}
		if (parentEmailFilter.status) {
			filterObject.status = parentEmailFilter.status;
		}
		if (parentEmailFilter.searchQuery) {
			const searchRegex = new RegExp(parentEmailFilter.searchQuery, "i");
			filterObject["$or"] = [
				{ name: searchRegex },
				{ email: searchRegex },
				{ "wrestlers.name": searchRegex }
			];
		}

		try {
			const recordsList = await data.parentEmail.find(filterObject).lean().exec();
			outputObject.status = 200;
			outputObject.data = { parentEmails: recordsList.map(({ _id, __v, ...recordData }) => ({ id: _id, ...recordData })) };
		}
		catch (errorObject) {
			outputObject.status = 560;
			outputObject.error = errorObject.message;
		}

		return outputObject;
	},

	parentEmailSave: async (saveObject) => {
		const outputObject = {};

		if (!saveObject) {
			outputObject.status = 550;
			outputObject.error = "Missing object to save";
			return outputObject;
		}

		if (saveObject.id) {
			let existingRecord = null;
			try {
				existingRecord = await data.parentEmail.findById(saveObject.id).exec();
			}
			catch (errorObject) {
				outputObject.status = 560;
				outputObject.error = errorObject.message;
				return outputObject;
			}

			if (!existingRecord) {
				outputObject.status = 561;
				outputObject.error = "Record not found";
				return outputObject;
			}

			try {
				Object.keys(saveObject).forEach(fieldKey => {
					if (fieldKey !== "id" && fieldKey !== "_id") {
						existingRecord[fieldKey] = saveObject[fieldKey];
					}
				});
				existingRecord.modified = new Date();

				const savedRecord = await existingRecord.save();
				outputObject.status = 200;
				outputObject.data = { id: savedRecord._id };
			}
			catch (errorObject) {
				outputObject.status = 562;
				outputObject.error = errorObject.message;
				return outputObject;
			}
		}
		else {
			let createdRecord = null;
			try {
				createdRecord = await (new data.parentEmail({
					status: "active",
					...saveObject,
					created: new Date(),
					modified: new Date()
				})).save();
			}
			catch (errorObject) {
				outputObject.status = 563;
				outputObject.error = errorObject.message;
				return outputObject;
			}

			outputObject.status = 200;
			outputObject.data = { id: createdRecord._id };
		}

		return outputObject;
	},

	parentEmailDelete: async (recordId) => {
		const outputObject = {};

		if (!recordId || !mongoose.Types.ObjectId.isValid(recordId)) {
			outputObject.status = 550;
			outputObject.error = "Missing ID to delete";
			return outputObject;
		}

		try {
			await data.parentEmail.deleteOne({ _id: recordId });
		}
		catch (errorObject) {
			outputObject.status = 560;
			outputObject.error = errorObject.message;
			return outputObject;
		}

		outputObject.status = 200;
		outputObject.data = { status: "ok" };
		return outputObject;
	},

	parentEmailBulkSave: async (recordsArray) => {
		const outputObject = {};

		if (!recordsArray || !Array.isArray(recordsArray) || recordsArray.length === 0) {
			outputObject.status = 550;
			outputObject.error = "Missing records to save";
			return outputObject;
		}

		try {
			const operationsArray = recordsArray.map(recordItem => {
				const recordPayload = {
					...recordItem,
					status: recordItem.status || "active",
					modified: new Date()
				};

				if (recordItem.id && mongoose.Types.ObjectId.isValid(recordItem.id)) {
					return {
						updateOne: {
							filter: { _id: recordItem.id },
							update: { $set: recordPayload }
						}
					};
				}
				else {
					return {
						insertOne: {
							document: {
								...recordPayload,
								created: new Date()
							}
						}
					};
				}
			});

			await data.parentEmail.bulkWrite(operationsArray);
			outputObject.status = 200;
			outputObject.data = { status: "ok", count: recordsArray.length };
		}
		catch (errorObject) {
			outputObject.status = 560;
			outputObject.error = errorObject.message;
		}

		return outputObject;
	},

	parentEmailBulkStatus: async (recordIdsArray, targetStatusValue) => {
		const outputObject = {};

		if (!recordIdsArray || !Array.isArray(recordIdsArray) || recordIdsArray.length === 0) {
			outputObject.status = 550;
			outputObject.error = "Missing record IDs";
			return outputObject;
		}

		try {
			const validObjectIds = recordIdsArray
				.filter(recordId => mongoose.Types.ObjectId.isValid(recordId))
				.map(recordId => new mongoose.Types.ObjectId(recordId));

			await data.parentEmail.updateMany(
				{ _id: { $in: validObjectIds } },
				{ $set: { status: targetStatusValue, modified: new Date() } }
			);

			outputObject.status = 200;
			outputObject.data = { status: "ok" };
		}
		catch (errorObject) {
			outputObject.status = 560;
			outputObject.error = errorObject.message;
		}

		return outputObject;
	},

	serverConfigGet: async (filterObject = {}) => {
		const filter = {};
		const output = {};

		if (filterObject.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(filterObject.id) ? filterObject.id : null;
		}
		if (filterObject.key) {
			filter.key = filterObject.key;
		}

		try {
			const records = await data.serverConfig.find(filter).lean().exec();
			output.status = 200;
			output.data = { serverConfigs: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	serverConfigSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id || saveObject.key) {
			let record = null;
			try {
				if (saveObject.id) {
					record = await data.serverConfig.findById(saveObject.id).exec();
				} else if (saveObject.key) {
					record = await data.serverConfig.findOne({ key: saveObject.key }).exec();
				}
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (record) {
				try {
					Object.keys(saveObject).forEach(field => {
						if (field !== "id" && field !== "_id") {
							record[field] = saveObject[field];
						}
					});
					record.modified = new Date();

					record = await record.save();
					output.status = 200;
					output.data = { id: record._id, key: record.key };
					return output;
				}
				catch (error) {
					output.status = 562;
					output.error = error.message;
					return output;
				}
			}
		}

		let record = null;
		try {
			record = await (new data.serverConfig({ ...saveObject, created: new Date(), modified: new Date() })).save();
		}
		catch (error) {
			output.status = 563;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { id: record._id, key: record.key };
		return output;
	},

	serverConfigDelete: async (idOrKey) => {
		const output = {};

		if (!idOrKey) {
			output.status = 550;
			output.error = "Missing ID or Key to delete";
			return output;
		}

		const filter = {};
		if (mongoose.Types.ObjectId.isValid(idOrKey)) {
			filter._id = idOrKey;
		} else {
			filter.key = idOrKey;
		}

		try {
			await data.serverConfig.deleteOne(filter);
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	wrestlerEventGet: async (userFilter = {}) => {
		let filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.ids) {
			filter["_id"] = { $in: userFilter.ids.map(id => mongoose.Types.ObjectId.isValid(id) ? id : null) };
		}
		if (userFilter.wrestlerId) {
			filter.wrestlerId = mongoose.Types.ObjectId.isValid(userFilter.wrestlerId) ? userFilter.wrestlerId : null;
		}
		if (userFilter.wrestlerSqlId) {
			filter.wrestlerSqlId = userFilter.wrestlerSqlId;
		}
		if (userFilter.sqlId) {
			filter.sqlId = userFilter.sqlId;
		}
		if (userFilter.wrestlerIds) {
			filter.wrestlerId = { $in: userFilter.wrestlerIds };
		}
		if (userFilter.team) {
			filter.searchTeam = userFilter.team.toLowerCase();
		}
		if (userFilter.startDate && userFilter.endDate) {
			const startDate = new Date(Date.parse(userFilter.startDate)),
				endDate = new Date(Date.parse(userFilter.endDate));

			filter.date = {
				$gte: startDate,
				$lte: endDate
			};
		}

		if (Object.keys(filter).length == 0) {
			output.status = 562;
			output.error = "No filter provided";
		}

		try {
			const records = await data.wrestlerEvent.find(filter).lean().exec();
			output.status = 200;
			output.data = { wrestlerEvents: records.map(({ _id, __v, ...remainingFields }) => ({ id: _id, ...remainingFields })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	wrestlerEventSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.team) {
			saveObject.searchTeam = saveObject.team.toLowerCase();
		}

		if (saveObject.matches) {
			saveObject.matches = saveObject.matches.map(match => ({
				...match,
				divisionConvert:
					/^jv/i.test(match.division) ? "JV" :
					/girl/i.test(match.division) ? "Girls" :
					/women/i.test(match.division) ? "Girls" :
					/woman/i.test(match.division) ? "Girls" :
					/ms/i.test(match.division) ? "Middle School" :
					/middle/i.test(match.division) ? "Middle School" :
					/10U/i.test(match.division) ? "Middle School" :
					/8U/i.test(match.division) ? "Middle School" :
					/12U/i.test(match.division) ? "Middle School" :
					/14U/i.test(match.division) ? "Middle School" :
					/7[ &]*8/i.test(match.division) ? "Middle School" :
					/9[ &]*10/i.test(match.division) ? "JV" :
					/11[ &]*12/i.test(match.division) ? "Middle School" :
					/jv/i.test(saveObject.name) ? "JV" :
					/^hs/i.test(match.division) ? "Varsity" :
					/high/i.test(match.division) ? "Varsity" :
					/state tournament/i.test(match.division) ? "Varsity" :
					/varsity/i.test(match.division) ? "Varsity"
					: "Other"
			}));
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.wrestlerEvent.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field !== "id" && field !== "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();
				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				const toSave = { ...saveObject, created: new Date(), modified: new Date() };
				record = await (new data.wrestlerEvent(toSave)).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	wrestlerEventDelete: async (recordId) => {
		const output = {};

		if (!recordId || !mongoose.Types.ObjectId.isValid(recordId)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.wrestlerEvent.deleteOne({ _id: recordId });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	wrestlerEventBulkSave: async (wrestlerEvents) => {
		const output = {};

		if (!wrestlerEvents || !Array.isArray(wrestlerEvents) || wrestlerEvents.length === 0) {
			output.status = 550;
			output.error = "Missing or empty wrestlerEvents array for bulk save";
			return output;
		}

		try {
			const missingWrestlerIds = [...new Set(wrestlerEvents.filter(wrestlerEvent => !wrestlerEvent.wrestlerId).map(wrestlerEvent => wrestlerEvent.wrestlerSqlId))];
			if (missingWrestlerIds.length > 0) {
				const wrestlers = await data.wrestler.find({ sqlId: { $in: missingWrestlerIds } }).select({ _id: 1, sqlId: 1 }).exec();

				wrestlerEvents.forEach(wrestlerEvent => {
					if (!wrestlerEvent.wrestlerId && wrestlerEvent.wrestlerSqlId) {
						wrestlerEvent.wrestlerId = wrestlers.filter(wrestler => wrestler.sqlId === wrestlerEvent.wrestlerSqlId)
							.map(wrestler => wrestler._id)
							.find(() => true);
					}
				});
			}
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		const operations = [];

		for (const wrestlerEvent of wrestlerEvents) {
			if (!wrestlerEvent || typeof wrestlerEvent !== "object") continue;

			const { id, _id, created, modified, ...updateFields } = wrestlerEvent;

			if (updateFields.team) {
				updateFields.searchTeam = updateFields.team.toLowerCase();
			}

			let filter = null;
			if (id && mongoose.Types.ObjectId.isValid(id)) {
				filter = { _id: id };
			}
			else if (_id && mongoose.Types.ObjectId.isValid(_id)) {
				filter = { _id: _id };
			}
			else if (updateFields.wrestlerSqlId !== undefined && updateFields.wrestlerSqlId !== null && updateFields.sqlId !== undefined && updateFields.sqlId !== null) {
				filter = { wrestlerSqlId: updateFields.wrestlerSqlId, sqlId: updateFields.sqlId };
			}
			else if (updateFields.wrestlerId && updateFields.sqlId !== undefined && updateFields.sqlId !== null) {
				filter = { wrestlerId: updateFields.wrestlerId, sqlId: updateFields.sqlId };
			}

			if (filter) {
				operations.push({
					updateOne: {
						filter: filter,
						update: {
							$set: {
								...updateFields,
								modified: new Date()
							},
							$setOnInsert: {
								created: new Date()
							}
						},
						upsert: true
					}
				});
			}
			else {
				operations.push({
					insertOne: {
						document: {
							...updateFields,
							created: new Date(),
							modified: new Date()
						}
					}
				});
			}
		}

		if (operations.length === 0) {
			output.status = 550;
			output.error = "No valid wrestler event operations to execute";
			return output;
		}

		try {
			const result = await data.wrestlerEvent.bulkWrite(operations, { ordered: false });

			output.status = 200;
			output.data = {
				status: "ok",
				matchedCount: result.matchedCount,
				modifiedCount: result.modifiedCount,
				upsertedCount: result.upsertedCount,
				insertedCount: result.insertedCount
			};
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	wrestlerEventCleanup: async () => {
		const output = {};

		const batchSize = 5000;
		let deletedTotal = 0,
			iteration = 0;

		while (true) {
			const batch = db.wrestlerevents.aggregate([{
				$addFields: {
					wrestlerObjectId: {
						$cond: {
							if: {
								$and: [
									{ $ne: ["$wrestlerId", null] },
									{ $eq: [{ $strLenCP: { $toString: "$wrestlerId" } }, 24] }
								]
							},
							then: { $toObjectId: "$wrestlerId" },
							else: null
						}
					}
				}
				},
				{
					$lookup: {
						from: "wrestlers",
						localField: "wrestlerObjectId",
						foreignField: "_id",
						as: "matchedWrestler"
					}
				},
				{
					$match: { matchedWrestler: { $size: 0 } }
				},
				{ $limit: batchSize },
				{ $project: { _id: 1 } }
			]).toArray().map(doc => doc._id); // <--- Added .toArray() here

			if (batch.length === 0) break;

			try {
				const res = db.wrestlerevents.deleteMany({ _id: { $in: batch } });
				deletedTotal += res.deletedCount;
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				output.errorList = (output.errorList || []).concat(error.message);
				continue;
			}

			iteration++;
			if (iteration > 20) {
				break;
			}
		}

		output.status = 200;
		output.data = {
			status: "ok",
			deleted: deletedTotal
		};
		return output;
	},

	wrestlerRatingGet: async (userFilter = {}) => {
		let filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.ids) {
			filter["_id"] = { $in: userFilter.ids.map(id => mongoose.Types.ObjectId.isValid(id) ? id : null) };
		}
		if (userFilter.wrestlerId) {
			filter.wrestlerId = mongoose.Types.ObjectId.isValid(userFilter.wrestlerId) ? userFilter.wrestlerId : null;
		}
		if (userFilter.wrestlerSqlId) {
			filter.wrestlerSqlId = userFilter.wrestlerSqlId;
		}
		if (userFilter.wrestlerIds) {
			filter.wrestlerId = { $in: userFilter.wrestlerIds };
		}

		if (Object.keys(filter).length == 0) {
			output.status = 562;
			output.error = "No filter provided";
		}

		try {
			const records = await data.wrestlerRating.find(filter).lean().exec();
			output.status = 200;
			output.data = { wrestlerRatings: records.map(({ _id, __v, ...remainingFields }) => ({ id: _id, ...remainingFields })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	wrestlerRatingSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.wrestlerRating.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field !== "id" && field !== "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();
				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				const toSave = { ...saveObject, created: new Date(), modified: new Date() };
				record = await (new data.wrestlerRating(toSave)).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	wrestlerRatingDelete: async (recordId) => {
		const output = {};

		if (!recordId || !mongoose.Types.ObjectId.isValid(recordId)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.wrestlerRating.deleteOne({ _id: recordId });
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	},

	wrestlerRatingBulkSave: async (wrestlerRatings) => {
		const output = {};

		if (!wrestlerRatings || !Array.isArray(wrestlerRatings) || wrestlerRatings.length === 0) {
			output.status = 550;
			output.error = "Missing or empty wrestlerRatings array for bulk save";
			return output;
		}

		try {
			const missingWrestlerIds = [...new Set(wrestlerRatings.filter(wrestlerRating => !wrestlerRating.wrestlerId).map(wrestlerRating => wrestlerRating.wrestlerSqlId))];
			if (missingWrestlerIds.length > 0) {
				const wrestlers = await data.wrestler.find({ sqlId: { $in: missingWrestlerIds } }).select({ _id: 1, sqlId: 1 }).exec();

				wrestlerRatings.forEach(wrestlerRating => {
					if (!wrestlerRating.wrestlerId && wrestlerRating.wrestlerSqlId) {
						wrestlerRating.wrestlerId = wrestlers.filter(wrestler => wrestler.sqlId === wrestlerRating.wrestlerSqlId)
							.map(wrestler => wrestler._id)
							.find(() => true);
					}
				});
			}
		}
		catch (error) {
			output.status = 562;
			output.error = error.message;
			return output;
		}

		const operations = [];

		for (const wrestlerRating of wrestlerRatings) {
			if (!wrestlerRating || typeof wrestlerRating !== "object") continue;

			const { id, _id, created, modified, ...updateFields } = wrestlerRating;

			let filter = null;
			if (id && mongoose.Types.ObjectId.isValid(id)) {
				filter = { _id: id };
			}
			else if (_id && mongoose.Types.ObjectId.isValid(_id)) {
				filter = { _id: _id };
			}
			else if (updateFields.wrestlerSqlId !== undefined && updateFields.wrestlerSqlId !== null && updateFields.sqlId !== undefined && updateFields.sqlId !== null) {
				filter = { wrestlerSqlId: updateFields.wrestlerSqlId, sqlId: updateFields.sqlId };
			}
			else if (updateFields.wrestlerId && updateFields.sqlId !== undefined && updateFields.sqlId !== null) {
				filter = { wrestlerId: updateFields.wrestlerId, sqlId: updateFields.sqlId };
			}

			if (filter) {
				operations.push({
					updateOne: {
						filter: filter,
						update: {
							$set: {
								...updateFields,
								modified: new Date()
							},
							$setOnInsert: {
								created: new Date()
							}
						},
						upsert: true
					}
				});
			}
			else {
				operations.push({
					insertOne: {
						document: {
							...updateFields,
							created: new Date(),
							modified: new Date()
						}
					}
				});
			}
		}

		if (operations.length === 0) {
			output.status = 550;
			output.error = "No valid wrestler event operations to execute";
			return output;
		}

		try {
			const result = await data.wrestlerRating.bulkWrite(operations, { ordered: false });

			output.status = 200;
			output.data = {
				status: "ok",
				matchedCount: result.matchedCount,
				modifiedCount: result.modifiedCount,
				upsertedCount: result.upsertedCount,
				insertedCount: result.insertedCount
			};
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	wrestlerRatingCleanup: async () => {
		const output = {};

		const batchSize = 5000;
		let deletedTotal = 0,
			iteration = 0;

		while (true) {
			const batch = db.wrestlerRatings.aggregate([{
				$addFields: {
					wrestlerObjectId: {
						$cond: {
							if: {
								$and: [
									{ $ne: ["$wrestlerId", null] },
									{ $eq: [{ $strLenCP: { $toString: "$wrestlerId" } }, 24] }
								]
							},
							then: { $toObjectId: "$wrestlerId" },
							else: null
						}
					}
				}
				},
				{
					$lookup: {
						from: "wrestlers",
						localField: "wrestlerObjectId",
						foreignField: "_id",
						as: "matchedWrestler"
					}
				},
				{
					$match: { matchedWrestler: { $size: 0 } }
				},
				{ $limit: batchSize },
				{ $project: { _id: 1 } }
			]).toArray().map(doc => doc._id);

			if (batch.length === 0) break;

			try {
				const res = db.wrestlerRatings.deleteMany({ _id: { $in: batch } });
				deletedTotal += res.deletedCount;
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				output.errorList = (output.errorList || []).concat(error.message);
				continue;
			}

			iteration++;
			if (iteration > 20) {
				break;
			}
		}

		output.status = 200;
		output.data = {
			status: "ok",
			deleted: deletedTotal
		};
		return output;
	},

	duplicateGet: async (filterParameters = {}) => {
		const outputResults = {};
		const queryFilter = {};

		if (filterParameters.id) {
			queryFilter["_id"] = mongoose.Types.ObjectId.isValid(filterParameters.id) ? filterParameters.id : null;
		}
		if (filterParameters.status) {
			queryFilter.status = filterParameters.status;
		}

		try {
			const duplicateRecords = await data.duplicate.find(queryFilter).lean().exec();
			outputResults.status = 200;
			outputResults.data = {
				duplicates: duplicateRecords.map(({ _id, __v, ...remainingFields }) => ({ id: _id ? _id.toString() : null, ...remainingFields }))
			};
		}
		catch (error) {
			outputResults.status = 560;
			outputResults.error = error.message;
		}

		return outputResults;
	},

	duplicateSave: async (saveObject = {}) => {
		const output = {};

		if (!saveObject || !saveObject.primary) {
			output.status = 550;
			output.error = "Missing record or primary wrestler details to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.duplicate.findById(saveObject.id).exec();
			}
			catch (error) {
				output.status = 560;
				output.error = error.message;
				return output;
			}

			if (!record) {
				output.status = 561;
				output.error = "Record not found";
				return output;
			}

			try {
				Object.keys(saveObject).forEach(field => {
					if (field != "id" && field != "_id") {
						record[field] = saveObject[field];
					}
				});
				record.modified = new Date();

				record = await record.save();
			}
			catch (error) {
				output.status = 562;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}
		else {
			let record = null;
			try {
				record = await (new data.duplicate({ ...saveObject, created: new Date(), modified: new Date() })).save();
			}
			catch (error) {
				output.status = 563;
				output.error = error.message;
				return output;
			}

			output.status = 200;
			output.data = { id: record._id };
		}

		return output;
	},

	duplicateDelete: async (recordId) => {
		const outputResults = {};

		if (!recordId) {
			outputResults.status = 550;
			outputResults.error = "Missing duplicate record ID to delete";
			return outputResults;
		}

		try {
			await data.duplicate.deleteOne({ _id: recordId });
			outputResults.status = 200;
			outputResults.data = { status: "deleted", id: recordId };
		}
		catch (error) {
			outputResults.status = 560;
			outputResults.error = error.message;
		}

		return outputResults;
	}

};

export default dataFunctionsObject;