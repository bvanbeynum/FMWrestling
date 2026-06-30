import data from "./schema.js";
import mongoose from "mongoose";

export default {

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
			filter["events.searchTeam"] = { $regex: new RegExp("^" + searchTeam) };
		}
		if (userFilter.teamName) {
			const searchTeam = userFilter.teamName.toLowerCase();
			filter["events.searchTeam"] = searchTeam;
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
		if (userFilter.initialSearch && userFilter.teams) {
			const escapeRegExp = (str) => {
				// $& means the whole matched string
				return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			};
			
			const searchParts = userFilter.initialSearch.toLowerCase().split(" ");
			if (searchParts.length >= 2) {
				const firstName = searchParts[0];
				const lastName = searchParts.slice(1).join(" ");
				filter.searchName = {
					$regex: new RegExp(`(^${escapeRegExp(firstName[0])}[\\w ]* ${escapeRegExp(lastName)}$)|(^${escapeRegExp(firstName)} ${escapeRegExp(lastName[0])}[\\w ]*$)`, "i")
				};
			}
			else {
				filter.searchName = { $regex: new RegExp(`^${escapeRegExp(userFilter.initialSearch)}`, "i") };
			}

			filter["events.searchTeam"] = { $in: userFilter.teams.map(team => team.toLowerCase()) };
		}

		try {
			const records = await data.wrestler.find(filter).select(select).lean().exec();
			output.status = 200;
			output.data = { wrestlers: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	wrestlerRankingGet: async (rankingFilter = {}) => {
		const output = {};

		try {
			const seasonStart = new Date() > new Date(new Date().getFullYear(), 11, 1) ?
				new Date(new Date().getFullYear(), 8, 1)
				: new Date(new Date().getFullYear() - 1, 8, 1);
		
			const elemMatchFilter = {
				"matches.division": { $in: [/high school/i, /hs/i] },
				date: { $gte: seasonStart }
			};

			if (rankingFilter.state) {
				elemMatchFilter.locationState = rankingFilter.state.toUpperCase();
			}
			if (rankingFilter.team) {
				elemMatchFilter.searchTeam = rankingFilter.team.toLowerCase();
			}
			if (rankingFilter.weightClass) {
				elemMatchFilter["matches.weightClass"] = { $regex: new RegExp("^" + rankingFilter.weightClass) };
			}
			if (rankingFilter.classification) {
				const schools = await data.school.find().select({lookupNames: 1, classification: 1}).lean().exec();
				const schoolNames = schools
					.filter(school => school.classification == rankingFilter.classification)
					.flatMap(school => school.lookupNames.map(name => name.toLowerCase()));
				elemMatchFilter.searchTeam = { $in: schoolNames };
			}

			const pipeline = [
				{
					$match: {
						events: {
							$elemMatch: elemMatchFilter
						}
					}
				},
				{
					$sort: {
						rating: -1
					}
				},
				{
					$limit: 20
				},
				{
					$project: {
						_id: 1,
						name: 1,
						rating: 1,
						deviation: 1,
						events: {
							$map: {
								input: "$events",
								as: "event",
								in: {
									date: "$$event.date",
									team: "$$event.team",
									locationState: "$$event.locationState",
									matches: {
										$let: {
											vars: {
												firstMatch: { $arrayElemAt: ["$$event.matches", 0] }
											},
											in: [{
												division: "$$firstMatch.division",
												weightClass: "$$firstMatch.weightClass"
											}]
										}
									}
								}
							}
						}
					}
				}
			];

			const records = await data.wrestler.aggregate(pipeline).exec();
			output.status = 200;
			output.data = { wrestlers: records.map(({ _id, ...data }) => ({ id: _id, ...data })) };
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
		}

		if (saveObject.events) {
			saveObject.events = saveObject.events.map(event => ({
				...event,
				searchTeam: event.team ? event.team.toLowerCase() : null
			}));
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

	postGet: async (id, includeExpired) => {
		let filter = {},
			output = {};

		if (id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(id) ? id : null;
		}
		else if (!includeExpired) {
			filter = { $or: [ { expires: null }, { expires: { $gt: new Date() }} ] };
		}

		try {
			const records = await data.post.find(filter).lean().exec();
			output.status = 200;
			output.data = { posts: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	postSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.post.findById(saveObject.id).exec();
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
				record = await (new data.post({ ...saveObject, created: new Date(), modified: new Date() })).save();
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

	postDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.post.deleteOne({ _id: id });
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
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		else if (!userFilter.includeExpired) {
			filter = { $or: [ { expires: null }, { expires: { $gt: new Date() }} ] };
		}
		if (userFilter.startDate && userFilter.endDate) {
			const startDate = new Date(Date.parse(userFilter.startDate)),
				endDate = new Date(Date.parse(userFilter.endDate));

			filter = {
				$or: [
					{
						$and: [
							{ date: { $gte: startDate } },
							{ date: { $lte: endDate } },
						]
					},
					{
						$and: [
							{ endDate: { $lte: endDate } },
							{ endDate: { $gte: startDate } }
						]
					}
				]
			}
		}

		try {
			const records = await data.event.find(filter).lean().exec();
			output.status = 200;
			output.data = { events: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
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

	eventDelete: async (id) => {
		const output = {};

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

	eventGet: async (userFilter = {}) => {
		let filter = {},
			select = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.startDate && userFilter.endDate) {
			const startDate = new Date(Date.parse(userFilter.startDate)),
				endDate = new Date(Date.parse(userFilter.endDate));

			filter = {
				$or: [
					{
						$and: [
							{ date: { $gte: startDate } },
							{ date: { $lte: endDate } },
						]
					},
					{
						$and: [
							{ endDate: { $lte: endDate } },
							{ endDate: { $gte: startDate } }
						]
					}
				]
			}
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
			const records = await data.event.find(filter).select(select).lean().exec();
			output.status = 200;
			output.data = { events: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
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

	eventsBulkSave: async (events) => {
		const output = {};

		if (!events || !Array.isArray(events) || events.length === 0) {
			output.status = 400;
			output.error = "Missing or empty events array for bulk save";
			return output;
		}

		const operations = [];

		for (const event of events) {
			if (event.sqlId === undefined || event.sqlId === null) {
				output.status = 400;
				output.error = "All events in bulk save must have a sqlId";
				return output;
			}

			// Clean payload to prevent schema validation/immutability errors
			const { id, _id, created, modified, ...updateFields } = event;

			operations.push({
				updateOne: {
					filter: { sqlId: event.sqlId },
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

		try {
			// ordered: false lets operations continue even if one fails
			const result = await data.event.bulkWrite(operations, { ordered: false });

			output.status = 200;
			output.data = {
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
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}

		try {
			const records = await data.dual.find(filter).lean().exec();
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
							name: "Fort Mill vs " + (record.opponent || ""),
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

				// Create the associated event object
				await (new data.event({
					sqlId: null,
					eventSystem: "WrestlingPortal",
					systemId: record._id.toString(),
					eventType: "Dual",
					name: "Fort Mill vs " + (record.opponent || ""),
					date: record.dualDate,
					location: null,
					state: "SC",
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
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
			return output;
		}

		output.status = 200;
		output.data = { status: "ok" };
		return output;
	}

};