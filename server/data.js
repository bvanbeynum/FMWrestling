import data from "./schema.js";
import client from "superagent";
import mongoose from "mongoose";

export default {

	userGet: (request, response) => {
		const filter = {};

		if (request.query.id) {
			filter["_id"] = mongoose.Types.ObjectId.isValid(request.query.id) ? request.query.id : null;
		}
		if (request.query.devicetoken) {
			filter["devices.token"] = request.query.devicetoken;
		}

		data.user.find(filter)
			.lean()
			.exec()
			.then(records => {
				const output = { users: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
				response.status(200).json(output);
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223ce638baa8f160a2dc45", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	userSave: (request, response) => {
		if (!request.body.user) {
			response.status(550).json({ error: "Missing object to save" });
			return;
		}
		
		const save = request.body.user;

		if (save.id) {
			data.user.findById(save.id)
				.exec()
				.then(data => {
					if (!data) {
						throw new Error("Record not found");
					}

					Object.keys(save).forEach(field => {
						if (field != "id") {
							data[field] = save[field];
						}
					});
					data.modified = new Date();

					return data.save();
				})
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223d1d38baa8f160a2dc48", message: `570: ${error.message}` }}).then();
					response.status(570).json({ error: error.message });
				});
		}
		else {
			new data.user({ ...save, created: new Date(), modified: new Date() })
				.save()
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223d1d38baa8f160a2dc48", message: `571: ${error.message}` }}).then();
					response.status(571).json({ error: error.message });
				});
		}
	},

	userDelete: (request, response) => {
		if (!request.query.id || !mongoose.Types.ObjectId.isValid(request.query.id)) {
			response.status(550).json({ error: "Missing ID to delete" });
			return;
		}

		data.user.deleteOne({ _id: request.query.id })
			.then(() => {
				response.status(200).json({ status: "ok" });
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223d3f38baa8f160a2dc4a", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	deviceRequestGet: (request, response) => {
		const filter = {};

		if (request.query.id && mongoose.Types.ObjectId.isValid(request.query.id)) {
			filter["_id"] = request.query.id
		}

		data.deviceRequest.find(filter)
			.lean()
			.exec()
			.then(records => {
				const output = { deviceRequests: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
				response.status(200).json(output);
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e5d38baa8f160a2dcd4", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	deviceRequestSave: (request, response) => {
		if (!request.body.devicerequest) {
			response.status(550).json({ error: "Missing object to save" });
			return;
		}
		
		const save = request.body.devicerequest;

		if (save.id) {
			data.deviceRequest.findById(save.id)
				.exec()
				.then(data => {
					if (!data) {
						throw new Error("Record not found");
					}

					Object.keys(save).forEach(field => {
						if (field != "id") {
							data[field] = save[field];
						}
					});
					data.modified = new Date();

					return data.save();
				})
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e7238baa8f160a2dcd7", message: `570: ${error.message}` }}).then();
					response.status(570).json({ error: error.message });
				});
		}
		else {
			new data.deviceRequest({ ...save, created: new Date(), modified: new Date() })
				.save()
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e7238baa8f160a2dcd7", message: `571: ${error.message}` }}).then();
					response.status(571).json({ error: error.message });
				});
		}
	},

	deviceRequestDelete: (request, response) => {
		if (!request.query.id || ~mongoose.Types.ObjectId.isValid(request.query.id)) {
			response.status(550).json({ error: "Missing ID to delete" });
			return;
		}

		data.deviceRequest.deleteOne({ _id: request.query.id })
			.then(() => {
				response.status(200).json({ status: "ok" });
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "64223e8838baa8f160a2dcd9", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	scoreCallGet: (request, response) => {
		const filter = {};

		if (request.query.id && mongoose.Types.ObjectId.isValid(request.query.id)) {
			filter["_id"] = request.query.id;
		}

		data.scoreCall.find(filter)
			.lean()
			.exec()
			.then(records => {
				const output = { scoreCalls: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
				response.status(200).json(output);
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641effd497f3b068a56265d9", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	scoreCallSave: (request, response) => {
		if (!request.body.scorecall) {
			response.status(550).json({ error: "Missing object to save" });
			return;
		}
		
		const save = request.body.scorecall;

		if (save.id) {
			data.scoreCall.findById(save.id)
				.exec()
				.then(data => {
					if (!data) {
						throw new Error("Record not found");
					}

					Object.keys(save).forEach(field => {
						if (field != "id") {
							data[field] = save[field];
						}
					});
					data.modified = new Date();

					return data.save();
				})
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f007897f3b068a5626649", message: `570: ${error.message}` }}).then();
					response.status(570).json({ error: error.message });
				});
		}
		else {
			new data.scoreCall({ ...save, created: new Date(), modified: new Date() })
				.save()
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f007897f3b068a5626649", message: `571: ${error.message}` }}).then();
					response.status(571).json({ error: error.message });
				});
		}
	},

	scoreCallDelete: (request, response) => {
		if (!request.query.id || !mongoose.Types.ObjectId.isValid(request.query.id)) {
			response.status(550).json({ error: "Missing ID to delete" });
			return;
		}

		data.scoreCall.deleteOne({ _id: request.query.id })
			.then(() => {
				response.status(200).json({ status: "ok" });
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f008897f3b068a562664b", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	wrestlerGet: (request, response) => {
		const filter = {};

		if (request.query.id && mongoose.Types.ObjectId.isValid(request.query.id)) {
			filter["_id"] = request.query.id;
		}

		data.wrestler.find(filter)
			.lean()
			.exec()
			.then(records => {
				const output = { wrestlers: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
				response.status(200).json(output);
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00fb97f3b068a5626653", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	wrestlerSave: (request, response) => {
		if (!request.body.wrestler) {
			response.status(550).json({ error: "Missing object to save" });
			return;
		}
		
		const save = request.body.wrestler;

		if (save.id) {
			data.wrestler.findById(save.id)
				.exec()
				.then(data => {
					if (!data) {
						throw new Error("Record not found");
					}

					Object.keys(save).forEach(field => {
						if (field != "id") {
							data[field] = save[field];
						}
					});
					data.modified = new Date();

					return data.save();
				})
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00ec97f3b068a5626651", message: `570: ${error.message}` }}).then();
					response.status(570).json({ error: error.message });
				});
		}
		else {
			new data.wrestler({ ...save, created: new Date(), modified: new Date() })
				.save()
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00ec97f3b068a5626651", message: `571: ${error.message}` }}).then();
					response.status(571).json({ error: error.message });
				});
		}
	},

	wrestlerDelete: (request, response) => {
		if (!request.query.id || !mongoose.Types.ObjectId.isValid(request.query.id)) {
			response.status(550).json({ error: "Missing ID to delete" });
			return;
		}

		data.wrestler.deleteOne({ _id: request.query.id })
			.then(() => {
				response.status(200).json({ status: "ok" });
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f00df97f3b068a562664e", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	dualGet: (request, response) => {
		const filter = {};

		if (request.query.id && mongoose.Types.ObjectId.isValid(request.query.id)) {
			filter["_id"] = request.query.id;
		}

		data.dual.find(filter)
			.lean()
			.exec()
			.then(records => {
				const output = { duals: records.map(({ _id, __v, ...data }) => ({ id: _id, ...data })) };
				response.status(200).json(output);
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f016097f3b068a56266c6", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	},

	dualSave: (request, response) => {
		if (!request.body.dual) {
			response.status(550).json({ error: "Missing object to save" });
			return;
		}
		
		const save = request.body.dual;

		if (save.id) {
			data.dual.findById(save.id)
				.exec()
				.then(data => {
					if (!data) {
						throw new Error("Record not found");
					}

					Object.keys(save).forEach(field => {
						if (field != "id") {
							data[field] = save[field];
						}
					});
					data.modified = new Date();

					return data.save();
				})
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f014f97f3b068a5626658", message: `570: ${error.message}` }}).then();
					response.status(570).json({ error: error.message });
				});
		}
		else {
			new data.dual({ ...save, created: new Date(), modified: new Date() })
				.save()
				.then(data => {
					response.status(200).json({ id: data._id });
				})
				.catch(error => {
					client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f014f97f3b068a5626658", message: `571: ${error.message}` }}).then();
					response.status(571).json({ error: error.message });
				});
		}
	},

	dualDelete: (request, response) => {
		if (!request.query.id || !mongoose.Types.ObjectId.isValid(request.query.id)) {
			response.status(550).json({ error: "Missing ID to delete" });
			return;
		}

		data.dual.deleteOne({ _id: request.query.id })
			.then(() => {
				response.status(200).json({ status: "ok" });
			})
			.catch(error => {
				client.post(request.logUrl).send({ log: { logTime: new Date(), logTypeId: "641f014097f3b068a5626656", message: `560: ${error.message}` }}).then();
				response.status(560).json({ error: error.message });
			});
	}

};