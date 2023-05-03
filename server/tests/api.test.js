import request from "superagent";
import mongoose from "mongoose";
import app from "../app.js";
import config from "../config.js";

beforeEach(async () => {
	await mongoose.connect(`mongodb://${config.db.user}:${config.db.pass}@${config.db.servers.join(",")}/${config.db.db}?authSource=${config.db.authDB}`, {useNewUrlParser: true, useUnifiedTopology: true });
});

afterEach(async () => {
	await mongoose.connection.close();
});

describe("Authentication", () => {

	it("requests access", async () => {
		const response = await request(app)
			.get("/api/requestaccess?name=test%20user&email=test@nomail.com")
			.set({ "x-forwarded-for": "185.27.158.231" })
			.set({ "host": "dev.beynum.com" })
	});

});