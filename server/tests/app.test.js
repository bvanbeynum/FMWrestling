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
			.set("Cookie", ['wm=12345667'])
			.set({ "x-forwarded-for": "185.27.158.231" })
			.set({ "host": "dev.beynum.com" })
			.expect(200);
		
		// ********** Then

		console.log(response.body);

		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toHaveLength(1);
	});

});