import request from "supertest";
import app from "../../app.js";
import mongoose from "mongoose";
import config from "../../server/config.js";

/* Connecting to the database before each test. */
beforeEach(async () => {
	await mongoose.connect(`mongodb://${config.db.user}:${config.db.pass}@${config.db.servers.join(",")}/${config.db.db}?authSource=${config.db.authDB}`, {useNewUrlParser: true, useUnifiedTopology: true });
});

/* Closing database connection after each test. */
afterEach(async () => {
	await mongoose.connection.close();
});

describe("User test", () => {
	let createdUserId;

	it("should return return an array of users", async () => {
		const response = await request(app).get("/data/user");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("users");
	});

	it("should create a new user", async () => {
		const response = await request(app).post("/data/user").send({
			user: {
			firstName: "test",
			lastName: "user",
			email: "test@nomail.com"
			}
		});

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("id");

		createdUserId = response.body.id;
	});

	it("should get a user by id", async () => {
		const response = await request(app).get(`/data/user?id=${createdUserId}`);

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(1);

		expect(response.body.users).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdUserId,
					firstName: "test",
					lastName: "user",
					email: "test@nomail.com"
				})
			])
		);
	});

	it("should return an empty array for non-existant user", async () => {
		const response = await request(app).get("/data/user?id=abcd");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(0);
	});

	it("should delete a user", async () => {
		const response = await request(app).delete(`/data/user?id=${createdUserId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting a user", async () => {
		const response = await request(app).get(`/data/user?id=${createdUserId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(0);
	});

});
