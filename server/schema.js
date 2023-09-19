import mongoose from "mongoose";

export default {

	user: mongoose.model("user", {
		firstName: String,
		lastName: String,
		email: String,
		phone: String,
		tokens: [String],
		devices: [{
			token: String,
			ip: String,
			domain: String,
			browser: Object,
			created: Date,
			lastAccess: Date
		}],
		roles: [{
			id: String,
			name: String
		}],
		privileges: [{
			id: String,
			name: String,
			token: String
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
			token: String
		}],
		created: Date,
		modified: Date
	}),

	privilege: mongoose.model("privilege", {
		name: String,
		token: String,
		url: String,
		isDev: Boolean
	}),

	deviceRequest: mongoose.model("devicerequest", {
		name: String,
		email: String,
		device: {
			token: String,
			ip: String,
			domain: String,
			browser: Object
		},
		created: Date
	}),

	team: mongoose.model("team", {
		name: String,
		state: String,
		confrence: String,
		program: String,
		isMyTeam: Boolean,
		wrestlers: [{ id: String, firstName: String, lastName: String }],
		externalTeams: [{ id: String, name: String }]
	}),

	externalTeam: mongoose.model("externalTeam", {
		name: String,
		meets: [ String ],
		wrestlers: [ String ]
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
	}),

	floEvent: mongoose.model("floevent", {
		sqlId: Number,
		floGUID: String,
		name: String,
		lastUpdate: Date,
		location: String,
		city: String,
		state: String,
		date: Date,
		endDate: Date,
		hasBrackets: Boolean,
		isFavorite: Boolean,
		isComplete: Boolean,
		divisions: [{
			name: String,
			weightClasses: [{
				name: String,
				pools: [{
					name: String,
					matches: [{
						guid: String,
						round: String,
						matchNumber: String,
						sort: Number,
						mat: String,
						roundNumber: Number,
						roundSpot: Number,
						topWrestler: {
							guid: String,
							name: String,
							team: String,
							isWinner: Boolean
						},
						bottomWrestler: {
							guid: String,
							name: String,
							team: String,
							isWinner: Boolean
						},
						winType: String,
						results: String,
						completeTime: Date,
						nextMatch: {
							winnerGUID: String,
							isWinnerTop: Boolean,
							loserGUID: String,
							isLoserTop: Boolean
						}
					}]
				}]
			}]
		}],
		updates: [{
			dateTime: Date,
			updates: [{
				updateType: String,
				division: String,
				weightClass: String,
				round: String,
				teams: [ String ],
				message: String
			}]
		}]
	}),

	trackEvent: mongoose.model("trackevent", {
		sqlId: Number,
		trackId: String,
		name: String,
		date: Date,
		endDate: Date,
		location: String,
		state: String
	})
	
};