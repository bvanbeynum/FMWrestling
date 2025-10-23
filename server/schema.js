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
				opponent: String,
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
		searchName: String,
		state: String,
		confrence: String,
		section: String,
		region: String,
		program: String,
		isMyTeam: Boolean,
		wrestlers: [{ id: String, firstName: String, lastName: String, division: String, weightClass: String, position: Number }],
		floTeams: [{ id: String, name: String }],
		scmatTeams: [{ id: String, name: String }]
	}),

	externalWrestler: mongoose.model("externalWrestler", {
		sqlId: Number,
		firstName: String,
		lastName: String,
		name: String,
		eventCount: Number,
		gRating: Number,
		gDeviation: Number,
		events: [{
			sqlId: Number,
			date: Date,
			name: String,
			team: String,
			locationState: String,
			matches: [{
				division: String,
				weightClass: String,
				round: String,
				vs: String,
				vsTeam: String,
				vsSqlId: Number,
				isWinner: Boolean,
				winType: String,
				sort: Number
			}]
		}],
		lineage: [[{ 
			wrestler1SqlId: Number,
			wrestler1Name: String,
			wrestler1Team: String,
			wrestler2SqlId: Number,
			wrestler2Name: String,
			wrestler2Team: String,
			isWinner: Boolean,
			sort: Number,
			eventDate: Date
		}]],
		lastSQLUpdate: Date
	}),

	wrestler: mongoose.model("wrestler", {
		sqlId: Number,
		name: String,
		division: String,
		weightClass: String,
		rating: Number,
		deviation: Number,
		events: [{
			sqlId: Number,
			date: Date,
			name: String,
			team: String,
			locationState: String,
			matches: [{
				division: String,
				weightClass: String,
				round: String,
				vs: String,
				vsTeam: String,
				vsSqlId: Number,
				isWinner: Boolean,
				winType: String,
				sort: Number
			}]
		}],
		lineage: [[{ 
			wrestler1SqlId: Number,
			wrestler1Name: String,
			wrestler1Team: String,
			wrestler2SqlId: Number,
			wrestler2Name: String,
			wrestler2Team: String,
			isWinner: Boolean,
			sort: Number,
			eventDate: Date
		}]],
		ratingHistory: [{
			periodEndDate: Date,
			rating: Number,
			deviation: Number
		}]
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
		sqlId: Number,
		eventSystem: String,
		systemId: String,
		eventType: String,
		name: String,
		date: Date,
		endDate: Date,
		location: String,
		state: String
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
		}]
	})
	
};