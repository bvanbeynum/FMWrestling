/**
 * @jest-environment node
 */

jest.mock("jsonwebtoken")

import api from "../api.js";
import client from "superagent";
import jwt from "jsonwebtoken";

describe("Middleware", () => {

	it("sets initial varables", () => {
		const protocol = "https",
			host = "thewrestlingmill.com";

		const result = api.setRequestVars(protocol, host);

		expect(result).toHaveProperty("serverPath", `${ protocol }://${ host }`);
		expect(result).toHaveProperty("logUrl", `${ protocol }://beynum.com/sys/api/addlog`);
	});

	it("successfully passes internal authentication", () => {
		const clientIP = "10.21.0.123";

		const result = api.authInternal(clientIP);

		expect(result).toBe(true);
	});

	it("failes internal authentication", () => {
		const clientIP = "185.244.2.52";

		const result = api.authInternal(clientIP);

		expect(result).toBe(false);
	});

	it("successfully passes API authentication", () => {
		const serverPath = "https://thewrestlingmill.com",
			referer = "https://thewrestlingmill.com/index.html";
		
		const result = api.authAPI(serverPath, referer);

		expect(result).toBe(true);
	});

	it("fails API authentication", () => {
		const serverPath = "https://thewrestlingmill.com",
			referer = "https://badurl.com/index.html";
		
		const result = api.authAPI(serverPath, referer);

		expect(result).toBe(false);
	});

	it("skips portal authentication", async () => {
		const cookie = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6ImhmM3dpbDJmejAiLCJpYXQiOjE2ODQ5NTk4NDR9.HmOWSzP2XRN7R00gH7a2eQFX-sMa0qRnbsJxSeWhq-o",
			token = "hf3wil2fz0",
			serverPath = "http://dev.beynum.com",
			urlPath = "/index.html";

		jwt.verify = jest.fn();
		client.get = jest.fn();
		client.post = jest.fn();

		const result = await api.authPortal(cookie, urlPath, serverPath);

		expect(result).toHaveProperty("status", 200);

		expect(jwt.verify).toHaveBeenCalledTimes(0);
		expect(client.get).toHaveBeenCalledTimes(0);
		expect(client.post).toHaveBeenCalledTimes(0);
	});

	it("successfully passes portal authentication", async () => {
		const cookie = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6ImhmM3dpbDJmejAiLCJpYXQiOjE2ODQ5NTk4NDR9.HmOWSzP2XRN7R00gH7a2eQFX-sMa0qRnbsJxSeWhq-o",
			token = "hf3wil2fz0",
			serverPath = "http://dev.beynum.com",
			urlPath = "/portal/index.html";

		jwt.verify = jest.fn().mockReturnValue({
			token: token
		});

		client.get = jest.fn().mockResolvedValue({ body: {
			users: [{
				"id": "646e6e9c439316107c5302d9",
				"devices": [
					{
						"token": "hf3wil2fz0",
						"ip": "10.21.0.110",
						"_id": "646e733e0461883914f2fd31"
					}
				]
			}]
		}});

		client.post = jest.fn(() => ({
			send: () => ({
				then: () => {}
			})
		}));

		const result = await api.authPortal(cookie, urlPath, serverPath);

		expect(result).toHaveProperty("status", 200);
		
		expect(jwt.verify).toHaveBeenCalledTimes(1);

		expect(client.get).toHaveBeenCalledTimes(1);
		expect(client.get).toHaveBeenLastCalledWith(`${ serverPath }/data/user?devicetoken=${ token }`);

		expect(client.post).toHaveBeenCalledTimes(1);
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
	});

	it("test the client mock", async () => {
		client.get = jest.fn().mockResolvedValue({
			body: {
				scoreCalls: [{
					id: '641f0b2f2566f64ce0241b00',
					abbreviation: 'ZZ',
					points: 2,
					description: 'Takedown',
					created: '2023-03-25T14:54:39.186Z',
					modified: '2023-03-25T15:34:29.571Z',
					isLostPoints: false,
					isTeamPoint: false,
					isComplete: false
				}]
			}
		});

		const result = await api.apiTest("http://dev.beynum.com");
		
		expect(result).toHaveProperty("abbreviation", "ZZ");
	});

});