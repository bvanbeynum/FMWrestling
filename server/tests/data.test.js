import request from "supertest";
import app from "../app.js";
import mongoose from "mongoose";
import config from "../config.js";

beforeEach(async () => {
	await mongoose.connect(`mongodb://${config.db.user}:${config.db.pass}@${config.db.servers.join(",")}/${config.db.db}?authSource=${config.db.authDB}`, {useNewUrlParser: true, useUnifiedTopology: true });
});

afterEach(async () => {
	await mongoose.connection.close();
});

describe("User data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await request(app).get("/data/user");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("users");
	});

	it("should create a new object", async () => {
		const response = await request(app).post("/data/user").send({
			user: {
			firstName: "test",
			lastName: "user",
			email: "test@nomail.com"
			}
		});

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("id");

		createdId = response.body.id;
	});

	it("should get the new object by id", async () => {
		const response = await request(app).get(`/data/user?id=${createdId}`);

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(1);

		expect(response.body.users).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId,
					firstName: "test",
					lastName: "user",
					email: "test@nomail.com"
				})
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		const response = await request(app).get("/data/user?id=abcd");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await request(app).delete(`/data/user?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await request(app).get(`/data/user?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(0);
	});

});

describe("Device request data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await request(app).get("/data/devicerequest");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("deviceRequests");
	});

	it("should create a new object", async () => {
		const response = await request(app).post("/data/devicerequest").send({
			devicerequest: {
				name: "test",
				email: "test@nomail.com",
			}
		});

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("id");

		createdId = response.body.id;
	});

	it("should get the new object by id", async () => {
		const response = await request(app).get(`/data/devicerequest?id=${createdId}`);

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("deviceRequests");
		expect(response.body.deviceRequests).toHaveLength(1);

		expect(response.body.deviceRequests).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId,
					name: "test",
					email: "test@nomail.com"
				})
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		const response = await request(app).get("/data/devicerequest?id=abcd");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("deviceRequests");
		expect(response.body.deviceRequests).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await request(app).delete(`/data/devicerequest?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await request(app).get(`/data/devicerequest?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("deviceRequests");
		expect(response.body.deviceRequests).toHaveLength(0);
	});

});

describe("Score call data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await request(app).get("/data/scorecall");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("scoreCalls");
	});

	it("should create a new object", async () => {
		const response = await request(app).post("/data/scorecall").send({
			scorecall: {
				abbreviation: "TST",
				points: 0,
				description: "Test call"
			}
		});

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("id");

		createdId = response.body.id;
	});

	it("should get the new object by id", async () => {
		const response = await request(app).get(`/data/scorecall?id=${createdId}`);

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("scoreCalls");
		expect(response.body.scoreCalls).toHaveLength(1);

		expect(response.body.scoreCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId,
					abbreviation: "TST",
					points: 0,
					description: "Test call"
				})
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		const response = await request(app).get("/data/scorecall?id=abcd");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("scoreCalls");
		expect(response.body.scoreCalls).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await request(app).delete(`/data/scorecall?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await request(app).get(`/data/scorecall?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("scoreCalls");
		expect(response.body.scoreCalls).toHaveLength(0);
	});

});

describe("Wrestler data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await request(app).get("/data/wrestler");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("wrestlers");
	});

	it("should create a new object", async () => {
		const response = await request(app).post("/data/wrestler").send({
			wrestler: {
				firstName: "test",
				lastName: "user",
				team: "test team",
				division: "Test division",
				weightClass: "test weight"
			}
		});

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("id");

		createdId = response.body.id;
	});

	it("should get the new object by id", async () => {
		const response = await request(app).get(`/data/wrestler?id=${createdId}`);

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("wrestlers");
		expect(response.body.wrestlers).toHaveLength(1);

		expect(response.body.wrestlers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId,
					firstName: "test",
					lastName: "user",
					team: "test team",
					division: "Test division",
					weightClass: "test weight"
				})
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		const response = await request(app).get("/data/wrestler?id=abcd");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("wrestlers");
		expect(response.body.wrestlers).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await request(app).delete(`/data/wrestler?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await request(app).get(`/data/wrestler?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("wrestlers");
		expect(response.body.wrestlers).toHaveLength(0);
	});

});

describe("Dual data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await request(app).get("/data/dual");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("duals");
	});

	it("should create a new object", async () => {
		const response = await request(app).post("/data/dual").send({
			dual: {
				name: "Test dual",
				division: "test division"
			}
		});

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("id");

		createdId = response.body.id;
	});

	it("should get the new object by id", async () => {
		const response = await request(app).get(`/data/dual?id=${createdId}`);

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("duals");
		expect(response.body.duals).toHaveLength(1);

		expect(response.body.duals).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId,
					name: "Test dual",
					division: "test division"
				})
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		const response = await request(app).get("/data/dual?id=abcd");

		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("duals");
		expect(response.body.duals).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await request(app).delete(`/data/dual?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await request(app).get(`/data/dual?id=${createdId}`);
		
		expect(response.statusCode).toEqual(200);
		expect(response.body).toHaveProperty("duals");
		expect(response.body.duals).toHaveLength(0);
	});

});
