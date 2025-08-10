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

	scoreCallGet: async (id) => {
		const filter = {},
			output = {};

		if (id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(id) ? id : null;
		}

		try {
			const records = await data.scoreCall.find(filter).lean().exec();
			output.status = 200;
			output.data = { scoreCalls: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	scoreCallSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.scoreCall.findById(saveObject.id).exec();
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
				record = await (new data.scoreCall({ ...saveObject, created: new Date(), modified: new Date() })).save();
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

	scoreCallDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.scoreCall.deleteOne({ _id: id });
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

	wrestlerGet: async (id) => {
		const filter = {},
			output = {};

		if (id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(id) ? id : null;
		}

		try {
			const records = await data.wrestler.find(filter).lean().exec();
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
		if (userFilter.externalTeamId) {
			const externalTeams = await data.externalTeam.find({ _id: userFilter.externalTeamId }).lean().select({ wrestlers: 1 }).exec();
			filter["_id"] = { $in: externalTeams.flatMap(team => (team.wrestlers || []).map(wrestler => wrestler["id"])) };
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

	floEventGet: async (userFilter = {}) => {
		let filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.sqlId) {
			filter.sqlId = userFilter.sqlId;
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
			const records = await data.floEvent.find(filter).lean().exec();
			output.status = 200;
			output.data = { floEvents: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	floEventSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.floEvent.findById(saveObject.id).exec();
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
				record = await (new data.floEvent({ ...saveObject, created: new Date(), modified: new Date() })).save();
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

	floEventDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.floEvent.deleteOne({ _id: id });
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

	trackEventGet: async (userFilter = {}) => {
		let filter = {},
			output = {};

		if (userFilter.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(userFilter.id) ? userFilter.id : null;
		}
		if (userFilter.sqlId) {
			filter.sqlId = userFilter.sqlId;
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
			const records = await data.trackEvent.find(filter).lean().exec();
			output.status = 200;
			output.data = { trackEvents: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
		}
		catch (error) {
			output.status = 560;
			output.error = error.message;
		}

		return output;
	},

	trackEventSave: async (saveObject) => {
		const output = {};

		if (!saveObject) {
			output.status = 550;
			output.error = "Missing object to save";
			return output;
		}

		if (saveObject.id) {
			let record = null;
			try {
				record = await data.trackEvent.findById(saveObject.id).exec();
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
				record = await (new data.trackEvent({ ...saveObject, created: new Date(), modified: new Date() })).save();
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

	trackEventDelete: async (id) => {
		const output = {};

		if (!id || !mongoose.Types.ObjectId.isValid(id)) {
			output.status = 550;
			output.error = "Missing ID to delete";
			return output;
		}

		try {
			await data.trackEvent.deleteOne({ _id: id });
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
	}

};