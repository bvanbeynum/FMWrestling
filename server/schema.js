import mongoose from "mongoose";

export default {

	user: mongoose.model("user", {
		firstName: String,
		lastName: String,
		email: String,
		tokens: [String],
		devices: [{
			token: String,
			ip: String,
			browser: Object,
			created: Date,
			lastAccess: Date
		}],
		roles: [{
			id: String,
			name: String
		}],
		created: Date,
		modified: Date
	}),

	role: mongoose.model("role", {
		name: String,
		isActive: Boolean,
		privileges: [{
			id: String,
			name: String,
			code: String
		}],
		created: Date,
		modified: Date
	}),

	privilege: mongoose.model("privilege", {
		name: String,
		token: String
	}),

	deviceRequest: mongoose.model("devicerequest", {
		name: String,
		email: String,
		device: {
			token: String,
			ip: String,
			browser: Object
		},
		created: Date
	}),

	wrestler: mongoose.model("wrestler", {
		firstName: String,
		lastName: String,
		team: String,
		division: String,
		weightClass: String,
		created: Date,
		modified: Date
	}),

	dual: mongoose.model("dual", {
		name: String,
		location: { name: String, city: String, state: String },
		dateTime: Date,
		division: String,
		weightClass: {
			wrestlers: [{
				wrestlerId: String,
				firstName: String,
				lastName: String,
				isHome: Boolean,
				isWinner: Boolean,
				winType: String,
				points: Number
			}],
			timeline: [{
				period: Number,
				periodSeconds: Number,
				wrestlerId: String,
				call: String,
				points: Number
			}]
		},
		created: Date,
		modified: Date
	}),

	scoreCall: mongoose.model("scorecall", {
		abbreviation: String,
		points: Number,
		description: String,
		isLostPoints: Boolean,
		isTeamPoint: Boolean,
		isComplete: Boolean,
		created: Date,
		modified: Date
	}),

	post: mongoose.model("post", {
		content: String,
		scope: String,
		created: Date,
		modified: Date,
		expires: Date
	}),

	event: mongoose.model("event", {
		date: Date,
		endDate: Date,
		name: String,
		location: String,
		created: Date,
		modified: Date
	})
	
};