import request from "supertest";
import app from "../app.js";
import api from "../api.js";
import data from "../data.js";

describe("Data service", () => {

	beforeEach(() => {
		api.authInternal = jest.fn().mockReturnValue(true);
		api.authPortal = jest.fn().mockResolvedValue({ status: 200, user: {} });
		api.authAPI = jest.fn().mockReturnValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("gets users", async () => {
		// ********** Given

		const output = { users: [{ id: "testid" }]};

		data.userGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/user")
			// .set("Cookie", ['wm=12345667'])
			.set({ "x-forwarded-for": "185.27.158.231" })
			.set({ "host": "dev.beynum.com" })
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(1);
	});

	it("gets event", async () => {
		// ********** Given

		const output = { events: [{ id: "testid" }]};

		data.eventGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/event")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("events");
		expect(response.body.events).toHaveLength(1);
	});

	it("saves event", async () => {
		// ********** Given

		const save = { event: { name: "test event" }},
			output = { id: "testid" };

		data.eventSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/event")
			.send({ event: save })
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes event", async () => {
		// ********** Given

		const eventId = "testid";

		data.eventDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/event?id=${ eventId }`)
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

});

describe("API service", () => {

	beforeEach(() => {
		api.authInternal = jest.fn().mockReturnValue(true);
		api.authPortal = jest.fn().mockResolvedValue({ status: 200, user: {} });
		api.authAPI = jest.fn().mockReturnValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("pulls schedule events", async () => {
		// ********** Given

		const output = { events: [{ id: "1234", name: "Test event", location: "test location", date: new Date(new Date().setHours(0,0,0,0)) }]};

		api.scheduleLoad = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get("/api/scheduleload")
			// .set({ "x-forwarded-for": "185.27.158.231" })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("events");
		expect(response.body.events).toHaveLength(output.events.length);
		expect(response.body.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: output.events[0].id })
			])
		);

	});

	it("saves schedule event", async () => {
		// ********** Given

		const event = { name: "Test event", location: "test location", date: new Date(new Date().setHours(0,0,0,0)) },
			output = { event: { ...event, id: "1234" }};

		api.scheduleSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post("/api/schedulesave")
			.send({ save: event })
			// .set({ "x-forwarded-for": "185.27.158.231" })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("event");
		expect(response.body.event).toEqual(
			expect.objectContaining({ id: output.event.id })
		);

	});

});