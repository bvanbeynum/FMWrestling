import mongoose from "mongoose";
import config from "./config.js";

const cn = mongoose.createConnection(`mongodb://${config.db.user}:${config.db.pass}@${config.db.servers.join(",")}/${config.db.db}?authSource=${config.db.authDB}`, {useNewUrlParser: true, useUnifiedTopology: true });

export default {

	wrestler: cn.model("wrestler", {
		firstName: String,
		lastName: String,
		team: String,
		division: String,
		weightClass: String,
		created: Date,
		modified: Date
	}),

	dual: cn.model("dual", {
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

	scoreCall: cn.model("scorecall", {
		abbreviation: String,
		points: Number,
		description: String,
		created: Date,
		modified: Date
	})

};