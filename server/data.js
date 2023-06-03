import data from "./schema.js";
import client from "superagent";
import mongoose from "mongoose";

export default {

	userGet: async (id, deviceToken) => {
		const filter = {},
			output = {};

		if (id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(id) ? id : null;
		}
		if (deviceToken) {
			filter["devices.token"] = deviceToken;
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
					if (field != "id") {
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
					if (field != "id") {
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
					if (field != "id") {
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
					if (field != "id") {
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

	dualGet: async (id) => {
		const filter = {},
			output = {};

		if (id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(id) ? id : null;
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
					if (field != "id") {
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
		const filter = {},
			output = {};

		if (id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(id) ? id : null;
		}
		if (!includeExpired) {
			filter.expires = { $gt: new Date() };
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
					if (field != "id") {
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
	}


};