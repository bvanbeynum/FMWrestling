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

	it("gets role", async () => {

		// ********** Given

		const output = { roles: [{ id: "testid" }]};

		data.roleGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/role")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("roles");
		expect(response.body.roles).toHaveLength(1);
	});

	it("saves event", async () => {
		// ********** Given

		const save = { event: { name: "test role" }},
			output = { id: "testid" };

		data.roleSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/role")
			.send({ role: save })
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes role", async () => {
		// ********** Given

		const roleId = "testid";

		data.roleDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/role?id=${ roleId }`)
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

	it("pulls requests", async () => {
		// ********** Given

		const output = { 
			deviceRequests: [{
				id: "testid",
				name: "Test User",
				email: "test@nomail.com",
				device: {
					ip: "134.252.22.65",
					browser: {
						platform: "Microsoft Windows",
						browser: "Chrome",
						isDesktop: true,
						isMobile: false,
						isAndroid: false,
						isiPhone: false
					}
				},
				created: new Date(new Date(Date.now()).setDate(new Date().getDate() - 10))
			}],
			users: [{
				id: "testuserid"
			}]
		};

		api.requestsLoad = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get("/api/requestsload")
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("deviceRequests");
		expect(response.body.deviceRequests).toHaveLength(output.deviceRequests.length);
		expect(response.body.deviceRequests).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: output.deviceRequests[0].id })
			])
		);

		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(output.users.length);
		expect(response.body.users).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: output.users[0].id })
			])
		);

	});

	it("saves request", async () => {
		// ********** Given

		const userId = "testuserid",
			data = { request: {}, userid: userId },
			output = { userId: userId };

		api.requestsSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post("/api/requestssave")
			.send({ save: data })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("userId", userId);
	});

	it("deletes request", async () => {
		// ********** Given

		const data = "testdeleteid",
			output = { status: "ok" };

		api.requestsSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post("/api/requestssave")
			.send({ delete: data })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

	it("pulls roles", async () => {
		// ********** Given

		const output = {
				roles: [{ 
					id: "testroleid", 
					name: "Test Role", 
					created: new Date() 
				}],
				users: [{
					id: "testuserid",
					firstName: "Test",
					lastName: "User"
				}]
			};

		api.roleLoad = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get("/api/roleload")
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("roles");
		expect(response.body.roles).toHaveLength(output.roles.length);
		expect(response.body.roles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: output.roles[0].id })
			])
		);

		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(output.users.length);
		expect(response.body.users).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: output.users[0].id })
			])
		);

	});

	it("saves role", async () => {
		// ********** Given

		const role = { 
				name: "Test event",
				privileges: [{ id: "testid", name: "testprivilege"}]
			},
			output = { role: { ...role, id: "1234" }};

		api.roleSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post("/api/rolesave")
			.send({ save: role })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("role");
		expect(response.body.role).toEqual(
			expect.objectContaining({ id: output.role.id })
		);

	});

});
