/**
 * @jest-environment node
 */

import api from "../api.js";
import client from "superagent";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import nodemailer from "nodemailer";

beforeEach(() => {
	jest.resetAllMocks();
})

describe("Middleware", () => {

	it("sets initial varables", () => {
		const protocol = "https",
			host = "thewrestlingmill.com";

		const results = api.setRequestVars(protocol, host);

		expect(results).toHaveProperty("serverPath", `${ protocol }://${ host }`);
		expect(results).toHaveProperty("logUrl", `${ protocol }://beynum.com/sys/api/addlog`);
	});

	it("successfully passes internal authentication", () => {
		const clientIP = "10.21.0.123";

		const results = api.authInternal(clientIP);

		expect(results).toBe(true);
	});

	it("failes internal authentication", () => {
		const clientIP = "185.244.2.52";

		const results = api.authInternal(clientIP);

		expect(results).toBe(false);
	});

	it("successfully passes API authentication", () => {
		const serverPath = "https://thewrestlingmill.com",
			referer = "https://thewrestlingmill.com/index.html";
		
		const results = api.authAPI(serverPath, referer);

		expect(results).toBe(true);
	});

	it("fails API authentication", () => {
		const serverPath = "https://thewrestlingmill.com",
			referer = "https://badurl.com/index.html";
		
		const results = api.authAPI(serverPath, referer);

		expect(results).toBe(false);
	});

	it("skips portal authentication", async () => {
		const cookie = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6ImhmM3dpbDJmejAiLCJpYXQiOjE2ODQ5NTk4NDR9.HmOWSzP2XRN7R00gH7a2eQFX-sMa0qRnbsJxSeWhq-o",
			token = "hf3wil2fz0",
			serverPath = "http://dev.beynum.com",
			urlPath = "/index.html";

		jwt.verify = jest.fn();
		client.get = jest.fn();
		client.post = jest.fn();

		const results = await api.authPortal(cookie, urlPath, serverPath);

		expect(results).toHaveProperty("status", 200);

		expect(jwt.verify).not.toHaveBeenCalled();
		expect(client.get).not.toHaveBeenCalled();
		expect(client.post).not.toHaveBeenCalled();
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

		const results = await api.authPortal(cookie, urlPath, serverPath);

		expect(results).toHaveProperty("status", 200);
		
		expect(jwt.verify).toHaveBeenCalled();

		expect(client.get).toHaveBeenCalled();
		expect(client.get).toHaveBeenLastCalledWith(`${ serverPath }/data/user?devicetoken=${ token }`);

		expect(client.post).toHaveBeenCalled();
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
	});

	it("fails the portal authentication with invalid token", async () => {
		const cookie = "fakecookie",
			token = null,
			serverPath = "http://dev.beynum.com",
			urlPath = "/portal/index.html";

		jwt.verify = jest.fn().mockReturnValue({
			token: token
		});

		const results = await api.authPortal(cookie, urlPath, serverPath);

		expect(results).toHaveProperty("status", 561);
		expect(results).toHaveProperty("error", "Invalid token");
		expect(jwt.verify).toHaveBeenCalled();
	});

	it("fails the portal authentication when token not found", async () => {
		const cookie = "fakecookie",
			token = "badtoken",
			serverPath = "http://dev.beynum.com",
			urlPath = "/portal/index.html";

		jwt.verify = jest.fn().mockReturnValue({
			token: token
		});

		client.get = jest.fn().mockResolvedValue({ body: {
			users: []
		}});

		const results = await api.authPortal(cookie, urlPath, serverPath);

		expect(results).toHaveProperty("status", 563);
		expect(results).toMatchObject({
			error: expect.stringMatching(/^user not found/i)
		  });
		expect(jwt.verify).toHaveBeenCalled();
	});

	it("requests access to portal", async () => {
		// ********** Given

		const ipAddress = "10.21.0.144",
			domain = "thewrestlingmill.com",
			userName = "Test App",
			userEmail = "test@nomail.com",
			userAgent = "Jest",
			serverPath = "http://dev.beynum.com";

		// Mocks

		jwt.sign = jest.fn().mockReturnValue("can'treadmetoken");

		const setCredentials = jest.fn();
		const getAccessToken = jest.fn().mockReturnValue("gmailtoken");
		const oauth = jest.fn().mockImplementation(() => ({
			setCredentials: setCredentials,
			getAccessToken: getAccessToken
		}));
		google.auth = { OAuth2: oauth }; 

		const send = jest.fn(() => ({
			then: () => {}
		}));
		client.post = jest.fn(() => ({
			send: send
		}));

		const sendMail = jest.fn((email, callback) => callback(null));
		const close = jest.fn();
		nodemailer.createTransport = jest.fn().mockImplementation(() => ({
			sendMail: sendMail,
			close: close
		}));

		// ********** When
	
		const results = await api.requestAccess(ipAddress, domain, userName, userEmail, userAgent, serverPath);

		// ********** Then

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("cookie");

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/devicerequest`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				devicerequest: expect.objectContaining({ name: userName })
			})
		);

		expect(google.auth.OAuth2).toHaveBeenCalled();
		expect(setCredentials).toHaveBeenCalled();
		expect(getAccessToken).toHaveBeenCalled();
		expect(getAccessToken).toHaveReturnedWith("gmailtoken");

		expect(nodemailer.createTransport).toHaveBeenCalled();
		expect(sendMail).toHaveBeenCalled();
		expect(close).toHaveBeenCalled();
	});

});

describe("API functions", () => {

	it("loads the post data", async () => {
		// ********** Given

		const serverPath = "http://dev.beynum.com",
			output = [
				{ content: "Test2", expires: null },
				{ content: "unexpired content", expires: new Date(new Date(Date.now()).setDate(new Date().getDate() + 5)) },
				{ content: "expired content", expires: new Date(new Date(Date.now()).setDate(new Date().getDate() - 5)) }
			];
		
		client.get = jest.fn().mockResolvedValue({ body: {
			posts: output
		}});

		// ********** When

		const results = await api.postLoad(serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/post`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("posts");

		// No expired posts
		expect(results.posts).toHaveLength(output.filter(post => !post.expires || post.expires < new Date()).length);

		// First post matches mock
		expect(results.posts[0]).toHaveProperty("content", output[0].content);
	});

	it("saves post", async () => {
		// ********** Given

		const expireDate = new Date();
		expireDate.setDate(expireDate.getDate() + 5);

		const save = { content: "Test post", expires: expireDate },
			serverPath = "http://dev.beynum.com",
			returnId = "testid";

		const send = jest.fn().mockResolvedValue({
			body: { id: returnId }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		// ********** When

		const results = await api.postSave(save, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/post`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				post: expect.objectContaining({ content: save.content })
			})
		);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("id", returnId);
	});

});