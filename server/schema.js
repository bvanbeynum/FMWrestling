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
		created: Date,
		modified: Date
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

	announcement: mongoose.model("announcement", {
		content: String,
		scope: String,
		created: Date,
		modified: Date,
		expires: Date
	})

};