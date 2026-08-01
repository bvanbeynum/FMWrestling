import mongoose from "mongoose";

export default {

	user: mongoose.model("user", {
		firstName: String,
		lastName: String,
		name: String,
		searchName: String,
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
		modified: Date,
		session: {
			team: [{
				weightClass: String,
				wrestlerId: String
			}],
			opponents: [{
				id: String,
				weightClasses: [{
					name: String,
					teamScore: Number,
					opponentScore: Number,
					opponentWrestlerId: String,
					teamWrestlerId: String
				}]
			}],
			matchSave: [{
				name: String,
				opponentId: String,
				startingWeightClass: String,
				lineup: [{
					weightClass: String,
					isStaticTeam: Boolean,
					teamWrestlerId: String,
					teamScore: Number,
					isStaticOpponent: Boolean,
					opponentWrestlerId: String,
					opponentScore: Number
				}]
			}]
		}
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
		isDev: Boolean,
		created: Date,
		modified: Date
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
		searchName: String,
		state: String,
		confrence: String,
		section: String,
		region: String,
		program: String,
		isMyTeam: Boolean,
		wrestlers: [{ id: String, firstName: String, lastName: String, division: String, weightClass: String, position: Number }],
		floTeams: [{ id: String, name: String }],
		scmatTeams: [{ id: String, name: String }],
		created: Date,
		modified: Date
	}),

	wrestler: mongoose.model("wrestler", {
		sqlId: Number,
		name: String,
		rating: Number,
		deviation: Number,
		grade: String,
		searchNames: [String],
		searchTeams: [String],
		lastWeightClass: String,
		lastTeam: String,
		lastEvent: { 
			name: String, 
			date: Date,
			state: String,
			sqlId: Number
		},
		schoolName: String,
		schoolDivision: String,
		schoolWeightClass: String,
		states: [String],
		events: [{
			sqlId: Number,
			date: Date,
			name: String,
			team: String,
			searchTeam: String,
			locationState: String,
			matches: [{
				division: String,
				weightClass: String,
				round: String,
				vs: String,
				vsTeam: String,
				vsSqlId: Number,
				vsRating: Number,
				vsDeviation: Number,
				isWinner: Boolean,
				winType: String,
				sort: Number
			}]
		}],
		ratingHistory: [{
			periodEndDate: Date,
			rating: Number,
			deviation: Number
		}],
		created: Date,
		modified: Date
	}),

	school: mongoose.model("school", {
		name: String,
		sqlId: Number,
		searchName: String,
		classification: String,
		region: String,
		lookupNames: [String],
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
		sqlId: Number,
		eventSystem: String,
		systemId: String,
		eventType: String,
		name: String,
		date: Date,
		endDate: Date,
		location: String,
		state: String,
		created: Date,
		modified: Date,
		matches: [{
			matchSqlId: Number,
			division: String,
			weightClass: String,
			roundName: String,
			videoUrl: String,
			winType: String,
			isUpset: Boolean, 
			sort: Number,
			wrestlers: [{
				wrestlerId: String,
				wrestlerSqlId: Number,
				name: String,
				team: String,
				rating: Number,
				deviation: Number,
				seed: Number,
				takedowns: Number,
				escapes: Number,
				nearfalls: Number,
				reversals: Number,
				isWinner: Boolean
			}]
		}]
	}),

	scmatTeam: mongoose.model("scmatteam", {
		name: String,
		confrence: String,
		rankings: [{ ranking: Number, date: Date }],
		wrestlers: [{
			firstName: String,
			lastName: String,
			rankings: [{
				grade: String,
				weightClass: Number,
				ranking: Number,
				date: Date
			}]
		}],
		created: Date,
		modified: Date
	}),

	dual: mongoose.model("dual", {
		dualDate: Date,
		opponent: String,
		imagePath: String,
		created: Date,
		modified: Date,
		division: String,
		matches: [{
			matchSqlId: Number,
			weightClass: String,
			winType: String,
			sort: Number,
			wrestlers: [{
				wrestlerId: String,
				name: String,
				team: String,
				isWinner: Boolean,
				scores: {
					takedowns: Number,
					escapes: Number,
					reversals: Number,
					nearfalls: Number
				}
			}]
		}]
	}),

	teamEvent: mongoose.model("teamevent", {
		name: String,
		date: Date,
		endDate: Date,
		startTime: String,
		eventId: mongoose.Schema.Types.ObjectId,
		dualId: mongoose.Schema.Types.ObjectId,
		division: String,
		location: String,
		eventType: String,
		created: Date,
		modified: Date
	}),

	parentEmail: mongoose.model("parentemail", {
		email: String,
		name: String,
		isCoach: Boolean,
		status: { type: String, default: "active" },
		wrestlers: [{
			name: String,
			grade: String,
			isVarsity: Boolean,
			isJV: Boolean,
			isMiddle: Boolean
		}],
		created: Date,
		modified: Date
	}),

	serverConfig: mongoose.model("serverconfig", {
		key: String,
		value: mongoose.Schema.Types.Mixed,
		created: Date,
		modified: Date
	}),

	wrestlerEvent: mongoose.model("wrestlerevent", {
		wrestlerId: String,
		wrestlerSqlId: Number,
		sqlId: Number,
		date: Date,
		name: String,
		team: String,
		searchTeam: String,
		locationState: String,
		seed: Number,
		division: String,
		weightClass: String,
		matches: [{
			sqlId: Number,
			division: String,
			weightClass: String,
			round: String,
			videoUrl: String,
			vs: String,
			vsTeam: String,
			vsSqlId: Number,
			vsRating: Number,
			vsDeviation: Number,
			isWinner: Boolean,
			winType: String,
			sort: Number,
			takedowns: Number,
			escapes: Number,
			nearfalls: Number,
			reversals: Number
		}],
		created: Date,
		modified: Date
	})
	
};