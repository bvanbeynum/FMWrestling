/**
 * @jest-environment node
 */

import api from "../api.js";
import client from "superagent";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import nodemailer from "nodemailer";

const serverPath = "http://dev.beynum.com";

beforeEach(() => {
	jest.resetAllMocks();
});

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

	it("successfully passes API authentication", async () => {
		const referer = serverPath + "/index.html",
			cookie = "testcookie",
			token = "testtoken",
			roles = [{ id: "testrole", privileges: [] }],
			user = { id: "testuser", roles: roles };
	
		jwt.verify = jest.fn().mockReturnValue({
			token: token
		});

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { users: [user] }})
			.mockResolvedValueOnce({ body: { roles: roles }});
	
		const results = await api.authAPI(serverPath, referer, cookie);

		expect(client.get).toHaveBeenCalledTimes(2);
		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/user?devicetoken=${ token }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/role`);
		
		expect(results).toHaveProperty("isValid", true);
		expect(results).toHaveProperty("loggedInUser");
		
	});

	it("fails API authentication", async () => {
		const referer = "https://badurl.com/index.html",
			cookie = "testcookie";
		
		const results = await api.authAPI(serverPath, referer, cookie);

		expect(results).toHaveProperty("isValid", false);
	});

	it("skips portal authentication", async () => {
		const cookie = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6ImhmM3dpbDJmejAiLCJpYXQiOjE2ODQ5NTk4NDR9.HmOWSzP2XRN7R00gH7a2eQFX-sMa0qRnbsJxSeWhq-o",
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
			urlPath = "/portal/index.html",
			privileges = [{ id: "priv1", token: "myPriv" }],
			roles = [{ id: "role1", privileges: privileges }],
			users = [{
				"id": "646e6e9c439316107c5302d9",
				"roles": roles,
				"devices": [
					{
						"token": "hf3wil2fz0",
						"ip": "10.21.0.110",
						"_id": "646e733e0461883914f2fd31"
					}
				]
			}];

		jwt.verify = jest.fn().mockReturnValue({
			token: token
		});

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: {
				users: users
			}})
			.mockResolvedValueOnce({ body: { roles: roles }});

		client.post = jest.fn(() => ({
			send: () => ({
				then: () => {}
			})
		}));

		const results = await api.authPortal(cookie, urlPath, serverPath);

		expect(jwt.verify).toHaveBeenCalled();

		expect(client.get).toHaveBeenCalledTimes(2);
		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/user?devicetoken=${ token }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/role`);

		expect(client.post).toHaveBeenCalled();
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("user", expect.objectContaining({ privileges: privileges.map(privilege => privilege.token) }))
	});

	it("fails the portal authentication with invalid token", async () => {
		const cookie = "fakecookie",
			token = null,
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
			userAgent = "Jest";

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

describe("API Post functions", () => {

	it("loads the post data", async () => {
		// ********** Given

		const output = [
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
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("posts");

		// No expired posts
		expect(results.data.posts).toHaveLength(output.filter(post => !post.expires || post.expires < new Date()).length);

		// First post matches mock
		expect(results.data.posts[0]).toHaveProperty("content", output[0].content);
	});

	it("saves post", async () => {
		// ********** Given

		const expireDate = new Date();
		expireDate.setDate(expireDate.getDate() + 5);

		const body = { save: { content: "Test post", expires: expireDate }},
			returnId = "testid";

		const send = jest.fn().mockResolvedValue({
			body: { id: returnId }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn().mockResolvedValue({ body: {
			posts: [{ ...body.save, id: returnId, created: new Date() }]
		}});

		// ********** When

		const results = await api.postSave(body, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/post`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				post: expect.objectContaining({ content: body.save.content })
			})
		);
		
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/post?id=${ returnId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("post", expect.objectContaining({ id: returnId }));
	});

	it("deletes post", async () => {
		// ********** Given

		const deleteId = "testid",
			body = { delete: deleteId };

		client.delete = jest.fn(() => ({
			status: "ok"
		}));

		// ********** When

		const results = await api.postSave(body, serverPath);

		// ********** Then

		expect(client.delete).toHaveBeenCalledWith(`${ serverPath }/data/post?id=${ deleteId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("status", "ok");
	});

});

describe("API Schedule", () => {

	it("loads the schedule data", async () => {
		// ********** Given

		const events = [{ 
				id: "testid", 
				name: "test event", 
				location: "test location",
				created: new Date() 
			}],
			floEvents = [{
				id: "flo1",
				name: "Flo Event",
				sqlId: 1233
			}],
			trackEvents = [{
				id: "track1",
				name: "Track event",
				sqlId: 123
			}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { events: events }}) // Get events
			.mockResolvedValueOnce({ body: { floEvents: floEvents } }) // Get flo events
			.mockResolvedValueOnce({ body: { trackEvents: trackEvents } }); // Get track events

		// ********** When

		const results = await api.scheduleLoad(serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/event`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/floevent`);
		expect(client.get).toHaveBeenNthCalledWith(3, `${ serverPath }/data/trackevent`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("events");
		expect(results.data).toHaveProperty("floEvents", floEvents);
		expect(results.data).toHaveProperty("trackEvents", trackEvents);

		// No expired posts
		expect(results.data.events).toHaveLength(events.length);

		// First post matches mock
		expect(results.data.events[0]).toHaveProperty("id", events[0].id);
	});

	it("filters for only given dates", async () => {
		// ********** Given

		const floEvents = [
				{ id: "flo1", date: new Date(2023,8,12) }
			],
			startDate = new Date(2023,8,1),
			endDate = new Date(2023,9,1);
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { events: [] }}) // Get events
			.mockResolvedValueOnce({ body: { floEvents: floEvents } }) // Get flo events
			.mockResolvedValueOnce({ body: { trackEvents: [] } }); // Get track events

		// ********** When

		const results = await api.scheduleLoad(serverPath, startDate.toLocaleDateString(), endDate.toLocaleDateString());

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/event?startdate=${ startDate.toLocaleDateString() }&enddate=${ endDate.toLocaleDateString() }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/floevent?startdate=${ startDate.toLocaleDateString() }&enddate=${ endDate.toLocaleDateString() }`);
		expect(client.get).toHaveBeenNthCalledWith(3, `${ serverPath }/data/trackevent?startdate=${ startDate.toLocaleDateString() }&enddate=${ endDate.toLocaleDateString() }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("floEvents", floEvents);
		expect(results.data.floEvents).toHaveLength(1);

	});

	it("saves event", async () => {
		// ********** Given

		const body = { save: { name: "Test event", location: "Test location", date: new Date(new Date().setHours(0,0,0,0)) }},
			returnId = "testid";

		const send = jest.fn().mockResolvedValue({
			body: { id: returnId }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn().mockResolvedValue({ body: {
			events: [{ ...body.save, id: returnId, created: new Date() }]
		}});

		// ********** When

		const results = await api.scheduleSave(body, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/event`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				event: expect.objectContaining({ name: body.save.name })
			})
		);
		
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/event?id=${ returnId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("event", expect.objectContaining({ id: returnId }));
	});

	it("deletes event", async () => {
		// ********** Given

		const deleteId = "testid",
			body = { delete: deleteId };

		client.delete = jest.fn(() => ({
			status: "ok"
		}));

		// ********** When

		const results = await api.scheduleSave(body, serverPath);

		// ********** Then

		expect(client.delete).toHaveBeenCalledWith(`${ serverPath }/data/event?id=${ deleteId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("status", "ok");
	});

	it("saves favorite", async () => {
		// ********** Given

		const floEvent = { id: "event1", isFavorite: false },
			body = { addFavorite: { floEventId: floEvent.id }};

		const send = jest.fn().mockResolvedValue({
			body: { id: floEvent.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { floEvents: [{ ...floEvent }] }}); // get the event

		// ********** When

		const results = await api.scheduleSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/floevent?id=${ floEvent.id }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/floevent`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				floevent: expect.objectContaining({ isFavorite: true })
			})
		);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("floEvent", { ...floEvent, isFavorite: true });
	});

	it("removes favorite", async () => {
		// ********** Given

		const floEvent = { id: "event1", isFavorite: true },
			body = { removeFavorite: { floEventId: floEvent.id }};

		const send = jest.fn().mockResolvedValue({
			body: { id: floEvent.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { floEvents: [{ ...floEvent }] }}); // get the event

		// ********** When

		const results = await api.scheduleSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/floevent?id=${ floEvent.id }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/floevent`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				floevent: expect.objectContaining({ isFavorite: false })
			})
		);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("floEvent", { ...floEvent, isFavorite: false });
	});

});

describe("API Requests", () => {

	it("loads the requests data", async () => {
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
					id: "testuserid",
					firstName: "Test",
					lastName: "User"
				}]
			};
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { deviceRequests: output.deviceRequests }})
			.mockResolvedValueOnce({ body: { users: output.users } });

		// ********** When

		const results = await api.requestsLoad(serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledTimes(2);
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/devicerequest`);
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/user`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("deviceRequests");
		expect(results.data.deviceRequests).toHaveLength(output.deviceRequests.length);
		expect(results.data.deviceRequests[0]).toHaveProperty("id", output.deviceRequests[0].id);

		expect(results.data).toHaveProperty("users");
		expect(results.data.users).toHaveLength(output.users.length);
		expect(results.data.users[0]).toHaveProperty("id", output.users[0].id)
	});

	it("saves request to a new user", async () => {
		// ********** Given

		const body = { save: {
				request: { id: "reqeustid", created: new Date(), device: { browser: {}, ip: "testip", token: "testtoken" } },
				user: { firstName: "Test", lastName: "User", email: "test@nomail.com" }
			}},
			returnId = "testuserid";

		const send = jest.fn().mockResolvedValue({
			body: { id: returnId }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.delete = jest.fn(() => ({
			status: "ok"
		}));

		// ********** When

		const results = await api.requestsSave(body, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({ email: body.save.user.email })
			})
		);
		
		expect(client.delete).toHaveBeenCalledWith(`${ serverPath }/data/devicerequest?id=${ body.save.request.id }`);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("userId", returnId);
	});

	it("saves request to an existing user", async () => {
		// ********** Given

		const body = { save: {
				request: { id: "reqeustid", created: new Date(), device: { browser: {}, ip: "testip", token: "testtoken" } },
				userId: "testuserid"
			}},
			returnId = "testuserid";

		client.get = jest.fn().mockResolvedValue({ body: {
			users: [{ id: body.save.userId, devices: [] }]
		}});
	
		const send = jest.fn().mockResolvedValue({
			body: { id: returnId }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.delete = jest.fn(() => ({
			status: "ok"
		}));

		// ********** When

		const results = await api.requestsSave(body, serverPath);

		// ********** Then
		
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/user?id=${ body.save.userId }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({
					devices: expect.arrayContaining([
						expect.objectContaining({ token: body.save.request.device.token })
					])
				})
			})
		);
		
		expect(client.delete).toHaveBeenCalledWith(`${ serverPath }/data/devicerequest?id=${ body.save.request.id }`);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("userId", returnId);
	});

	it("deletes request", async () => {
		// ********** Given

		const deleteId = "testid",
			body = { delete: deleteId };

		client.delete = jest.fn(() => ({
			status: "ok"
		}));

		// ********** When

		const results = await api.requestsSave(body, serverPath);

		// ********** Then

		expect(client.delete).toHaveBeenCalledWith(`${ serverPath }/data/devicerequest?id=${ deleteId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("status", "ok");
	});

});

describe("Roles", () => {

	it("loads the role data", async () => {
		// ********** Given

		const output = {
				roles: [{
					id: "testid",
					name: "Test Role",
					isActive: true,
					users: [],
					privileges: [],
					created: new Date(new Date(Date.now()).setDate(new Date().getDate() - 10))
				}],
				users: [{
					id: "testuserid",
					firstName: "Test",
					lastName: "User",
					roles: [{ id: "testid" }]
				}, {
					id: "unassigneduserid",
					firstName: "Unassigned",
					lastName: "User",
					roles: []
				}],
				privileges: [
					{ id: "privilege1", name: "Test Privilege", token: "test1" }
				]
			};
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { roles: output.roles }})
			.mockResolvedValueOnce({ body: { users: output.users } })
			.mockResolvedValueOnce({ body: { privileges: output.privileges } });

		// ********** When

		const results = await api.roleLoad(serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledTimes(3);
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/role`);
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/privilege`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("roles");
		expect(results.data.roles).toHaveLength(output.roles.length);
		expect(results.data.roles[0]).toHaveProperty("id", output.roles[0].id);

		expect(results.data.roles[0]).toHaveProperty("users");
		expect(results.data.roles[0].users).toHaveLength(output.users.filter(user => user.roles.length == 0).length);
		expect(results.data.roles[0].users[0]).toHaveProperty("id", output.users[0].id);
		
		expect(results.data).toHaveProperty("users");
		expect(results.data.users).toHaveLength(output.users.length);
		
		expect(results.data).toHaveProperty("privileges");
		expect(results.data.privileges).toHaveLength(output.privileges.length);

	});

	it("saves a new role", async () => {
		// ********** Given

		const body = { 
				saveRole: { name: "Test role" }
			},
			returnId = "testuserid";

		const send = jest.fn().mockResolvedValue({
			body: { id: returnId }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn().mockResolvedValue({ body: {
			roles: [{ ...body.save, id: returnId, created: new Date() }]
		}});

		// ********** When

		const results = await api.roleSave(body, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/role`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				role: expect.objectContaining({ name: body.saveRole.name })
			})
		);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("role", expect.objectContaining({ id: returnId }));
	});

	it("deletes role", async () => {
		// ********** Given

		const deleteId = "testid",
			user = { id: "testuserid", roles: [{ id: deleteId }] },
			body = { delete: deleteId };

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { users: [user] }}) // Get users

		const send = jest.fn().mockResolvedValue({
			body: { id: user.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));
	
		client.delete = jest.fn(() => ({
			status: "ok"
		}));

		// ********** When

		const results = await api.roleSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/user?roleid=${ deleteId }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({ roles: [] })
			})
		);
		
		expect(client.delete).toHaveBeenCalledWith(`${ serverPath }/data/role?id=${ deleteId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("status", "ok");
	});

	it("adds member to a given role", async () => {

		// ********** Given

		const saveRoleId = "saveroleid",
			saveMemberId = "membertosaveid",
			body = {
				saveMember: { roleId: saveRoleId, memberId: saveMemberId }
			},
			user = { id: saveMemberId, firstName: "Test", lastName: "User", roles: [{ id: saveRoleId }] },
			role = { id: saveRoleId, name: "Save Role", members: [user] };

			const send = jest.fn().mockResolvedValue({ body: { user: user } });
			client.post = jest.fn(() => ({ send: send }));

			client.get = jest.fn()
				.mockResolvedValueOnce({ body: { roles: [role] } }) // Get the role informaiton
				.mockResolvedValueOnce({ body: { users: [user] }}) // Get the user to save the role to
				.mockResolvedValueOnce({ body: { users: [user] }}); // Get all users with the role

		// ********** When

		const results = await api.roleSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/role?id=${ saveRoleId }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/user?id=${ saveMemberId }`);
		expect(client.get).toHaveBeenNthCalledWith(3, `${ serverPath }/data/user?roleid=${ saveRoleId }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({
					roles: expect.arrayContaining([
						expect.objectContaining({ id: saveRoleId })
					])
				})
			})
		);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("role", expect.objectContaining({
			users: expect.arrayContaining([
				expect.objectContaining({ id: saveMemberId })
			])
		}));

	});

	it("removes member from a given role", async () => {

		// ********** Given

		const saveRoleId = "saveroleid",
			deleteUserId = "deleteuserid",
			body = {
				deleteMember: { roleId: saveRoleId, memberId: deleteUserId }
			},
			initialUser = { id: deleteUserId, roles: [{ id: saveRoleId }] },
			finalUser = { ...initialUser, roles: [] },
			role = { id: saveRoleId, members: [] };

		const send = jest.fn().mockResolvedValue({ body: { user: finalUser }});
		client.post = jest.fn(() => ({ send: send }));

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { users: [initialUser] }}) // Get the user to remove the role from
			.mockResolvedValueOnce({ body: { roles: [role] }}) // Get the role details
			.mockResolvedValueOnce({ body: { users: [] }}); // Get the users with the role

		// ********** When

		const results = await api.roleSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/user?id=${ initialUser.id }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({
					roles: []
				})
			})
		);
		
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/role?id=${ saveRoleId }`);
		expect(client.get).toHaveBeenNthCalledWith(3, `${ serverPath }/data/user?roleid=${ saveRoleId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("role", expect.objectContaining({
			users: []
		}));

	});

	it("adds privilege to a given role", async () => {

		// ********** Given

		const saveRoleId = "saveroleid",
			savePrivilegeId = "privilegetosaveid",
			body = {
				savePrivilege: { roleId: saveRoleId, privilegeId: savePrivilegeId }
			},
			privilege = { id: savePrivilegeId, name: "Test Privilege", token: "test" },
			user = { id: "testuserid", firstName: "Test", lastName: "User" },
			role = { id: saveRoleId, name: "Save Role", privileges: [privilege] };

			const send = jest.fn().mockResolvedValue({ body: { role: role } });
			client.post = jest.fn(() => ({ send: send }));

			client.get = jest.fn()
				.mockResolvedValueOnce({ body: { roles: [role] } }) // Get the role informaiton
				.mockResolvedValueOnce({ body: { privileges: [privilege] }}) // Get the privilege information
				.mockResolvedValueOnce({ body: { users: [user] }}); // Get the users for the role

		// ********** When

		const results = await api.roleSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/role?id=${ saveRoleId }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/privilege?id=${ savePrivilegeId }`);
		expect(client.get).toHaveBeenNthCalledWith(3, `${ serverPath }/data/user?roleid=${ saveRoleId }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/role`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				role: expect.objectContaining({
					privileges: expect.arrayContaining([
						expect.objectContaining({ id: savePrivilegeId })
					])
				})
			})
		);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("role", expect.objectContaining({
			privileges: expect.arrayContaining([
				expect.objectContaining({ id: savePrivilegeId })
			])
		}));

	});

	it("removes privilege from a given role", async () => {

		// ********** Given

		const saveRoleId = "saveroleid",
			deletePrivilegeId = "deleteprivilegeid",
			body = {
				deletePrivilege: { roleId: saveRoleId, privilegeId: deletePrivilegeId }
			},
			role = { id: saveRoleId, privileges: [{ id: deletePrivilegeId }] };

		const send = jest.fn().mockResolvedValue({ body: { role: role }});
		client.post = jest.fn(() => ({ send: send }));

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { roles: [role] }}) // Get the role
			.mockResolvedValueOnce({ body: { users: [] }}); // Get the users with the role

		// ********** When

		const results = await api.roleSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/role?id=${ role.id }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/role`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				role: expect.objectContaining({
					privileges: []
				})
			})
		);
		
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/user?roleid=${ saveRoleId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("role", expect.objectContaining({
			privileges: []
		}));

	});

});

describe("Users", () => {

	it("loads the data for users", async () => {

		// ********** Given

		const roles = [{ id: "role1", name: "Test Role 1" }, { id: "role2", name: "Test Role 2" }],
			users = [{ id: "testuserid", firstName: "Test", lastName: "User", roles: [roles[1]], devices: [] }];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { users: users }}) // Get the users
			.mockResolvedValueOnce({ body: { roles: roles } }); // Get all roles

		// ********** When

		const results = await api.usersLoad(serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/user`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/role`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("users");
		expect(results.data.users).toEqual(users);

		expect(results.data).toHaveProperty("roles");
		expect(results.data.roles).toEqual(roles);

	});

	it("saves a new user", async () => {

		// ********** Given

		const body = { 
				saveUser: { firstName: "Test", lastName: "User", email: "test@nomail.com", phone: "111-111-1111" }
			},
			returnId = "saveuserid";

		const send = jest.fn().mockResolvedValue({
			body: { id: returnId }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn()
			.mockResolvedValue({ body: { users: [{ ...body.saveUser, id: returnId, created: new Date() }] }});

		// ********** When

		const results = await api.usersSave(body, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({ email: body.saveUser.email })
			})
		);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("user", expect.objectContaining({ id: returnId }));

	});

	it("deletes user", async () => {
		// ********** Given

		const deleteId = "deleteuserid",
			body = { deleteUser: deleteId };

		client.delete = jest.fn(() => ({
			status: "ok"
		}));

		// ********** When

		const results = await api.usersSave(body, serverPath);

		// ********** Then

		expect(client.delete).toHaveBeenCalledWith(`${ serverPath }/data/user?id=${ deleteId }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("status", "ok");
	});

	it("removes device from a given user", async () => {

		// ********** Given

		const saveUserId = "user1",
			deleteDeviceToken = "deletetoken",
			body = {
				deleteDevice: { userId: saveUserId, token: deleteDeviceToken }
			},
			user = { id: saveUserId, devices: [{ token: deleteDeviceToken }] };

		const send = jest.fn().mockResolvedValue({ body: { id: saveUserId }});
		client.post = jest.fn(() => ({ send: send }));

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { users: [user] }}) // Get the user

		// ********** When

		const results = await api.usersSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/user?id=${ user.id }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({
					devices: []
				})
			})
		);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("user", expect.objectContaining({
			devices: []
		}));

	});

	it("adds a role to a given user", async () => {

		// ********** Given

		const saveUserId = "user1",
			saveRoleId = "role1",
			body = {
				saveRole: { userId: saveUserId, roleId: saveRoleId }
			},
			user = { id: saveUserId, firstName: "Test", lastName: "User", roles: [] },
			role = { id: saveRoleId, name: "Save Role" };

			const send = jest.fn().mockResolvedValue({ body: { id: saveUserId } });
			client.post = jest.fn(() => ({ send: send }));

			client.get = jest.fn()
				.mockResolvedValueOnce({ body: { users: [user] }}) // Get the user to save the role to
				.mockResolvedValueOnce({ body: { roles: [role] } }) // Get the role informaiton

		// ********** When

		const results = await api.usersSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/user?id=${ saveUserId }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/role?id=${ saveRoleId }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({
					roles: expect.arrayContaining([
						expect.objectContaining({ id: saveRoleId })
					])
				})
			})
		);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("user", expect.objectContaining({
			roles: expect.arrayContaining([
				expect.objectContaining({ id: saveRoleId })
			])
		}));

	});

	it("removes role from a given user", async () => {

		// ********** Given

		const saveUserId = "user1",
			deleteRoleId = "role1",
			body = {
				deleteRole: { userId: saveUserId, roleId: deleteRoleId }
			},
			user = { id: saveUserId, roles: [{ id: deleteRoleId }] };

		const send = jest.fn().mockResolvedValue({ body: { id: saveUserId }});
		client.post = jest.fn(() => ({ send: send }));

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { users: [user] }}) // Get the user

		// ********** When

		const results = await api.usersSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/user?id=${ user.id }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({
					roles: []
				})
			})
		);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("user", expect.objectContaining({
			roles: []
		}));

	});

	it("saves session data", async () => {

		// ********** Given

		const user = { id: "user1" },
			session = { 
				selectedDivision: "Varsity",
				selectedOpponentId: "team1",
				compare: { 
					division: "Varsity",
					opponentId: "team2", 
					weightClasses: [
						{ name: "106", teamScore: 0, opponentScore: 6 },
						{ name: "Bracket 5", teamScore: "", opponentScore: "" }
					]
				}
			};
		
		client.get = jest.fn().mockResolvedValue({ body: { users: [user] }});

		const send = jest.fn().mockResolvedValue({
			body: { status: "ok" }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		// ********** When

		const results = await api.userSessionSave(user, session, serverPath);

		if (results.status != 200) {
			console.log(results);
		}

		// ********** Then

		expect(results).toHaveProperty("status", 200);

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/user?id=${ user.id }`);

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/user`);
		expect(send).toHaveBeenCalledWith({
			user: expect.objectContaining({
				id: user.id,
				session: expect.objectContaining({ 
					selectedDivision: session.selectedDivision,
					selectedOpponentId: session.selectedOpponentId,
					compare: [expect.objectContaining({ opponentId: session.compare.opponentId })]
				})
			})
		});

		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("status", "ok");

	});

});

describe("Teams", () => {

	it("loads data for the team wrestlers", async () => {

		// ********** Given

		const teams = [
				{
					id: "team1",
					name: "Test Team",
					state: "TS",
					confrence: "5A",
					isMyTeam: true,
					wrestlers: [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler" }],
					floTeams: [{ id: "flo1", name: "Team 1" }],
					scmatTeams: [{ id: "mat1", name: "Team 1" }]
				}, 
				{ id: "team2", name: "Other Team", wrestlers: [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler", division: "Varsity", weightClass: "106" }]}
			];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { teams: teams }}); // get the other teams

		// ********** When

		const results = await api.teamWrestlersLoad(serverPath);

		if (results.status != 200) {
			console.log(results);
		}

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/team`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("team", { ...teams.filter(team => team.isMyTeam).find(() => true) });

	});

	it("loads data for the team compare", async () => {

		// ********** Given

		const teams = [
				{
					id: "team1",
					name: "Test Team",
					isMyTeam: true,
					wrestlers: [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler" }],
					floTeams: [{ id: "flo1", name: "Team 1" }],
					scmatTeams: [{ id: "mat1", name: "Team 1" }]
				}, 
				{ id: "team2", name: "Other Team", wrestlers: [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler", division: "Varsity", weightClass: "106" }]}
			],
			floTeams = [{ id: "flo1", name: "Team 1", events: [], wrestlers: [{ id: "wrestler1" }] }],
			scmatTeams = [
				{ id: "mat1", name: "Team 1", rankings: [{ id: "rank1", date: new Date(2023, 8, 29) }], wrestlers: [{ id: "wrestler1" }, { id: "wrestler2" }] },
				{ id: "mat2", name: "Team 1", rankings: [{ id: "rank1", date: new Date(2023, 8, 29) }], wrestlers: [{ id: "wrestler1" }, { id: "wrestler2" }] }
			];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { teams: teams }}) // get the other teams
			.mockResolvedValueOnce({ body: { scmatTeams: scmatTeams } })
			.mockResolvedValueOnce({ body: { externalTeams: floTeams } });

		// ********** When

		const results = await api.teamCompareLoad(serverPath);
		
		if (results.status != 200) {
			console.log(results);
		}

		// ********** Then
		expect(results).toHaveProperty("status", 200);

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/team`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/scmatteam`);
		expect(client.get).toHaveBeenNthCalledWith(3, `${ serverPath }/data/externalteam?ids=${ JSON.stringify([teams[0].floTeams[0].id]) }`);

		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("team", {...teams[0], floTeams: floTeams, scmatTeams: [scmatTeams[0]] });
		expect(results.data).toHaveProperty("scmatTeams", [scmatTeams[1]]);

	});

	it("gets the opponent's wrestlers to compare", async () => {

		// ********** Given

		const opponentSCMat = { 
				id: "opponent1", 
				name: "Test Team"
			},
			floTeams = [{ id: "flo1", name: "Test Team", events: [], wrestlers: [{ id: "wrestler1" }] }],
			floWrestlers = [{ 
				id: "wrestler1", 
				firstName: "Test", 
				lastName: "Wrestler",
				name: "Test Wrestler",
				events: [
					{ date: new Date(2023, 9, 10), team: "Test Team", name: "Test Event", matches: [{ division: "JV", weightClass: "120" }] },
					{ date: new Date(2023, 9, 20), team: "Test Team", name: "Test Event 1", matches: [{ division: "Varsity", weightClass: "106" }] },
					{ date: new Date(2023, 9, 25), team: "Other Team", name: "Test Event 2", matches: [{ division: "JV", weightClass: "113" }] }
				]
			}],
			expectedResult = [{ 
				id: "wrestler1", 
				name: "Test Wrestler",
				division: "Varsity",
				weightClass: "106",
				weightClasses: [
					{ lastDate: new Date(2023,9,10), weightClass: "120", division: "JV", lastEvent: "Test Event" },
					{ lastDate: new Date(2023,9,20), weightClass: "106", division: "Varsity", lastEvent: "Test Event 1" }
				]
			}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { scmatTeams: [opponentSCMat] }})
			.mockResolvedValueOnce({ body: { externalTeams: floTeams } })
			.mockResolvedValueOnce({ body: { externalWrestlers: floWrestlers } });

		// ********** When

		const results = await api.teamGetOpponentWrestlers(opponentSCMat.id, serverPath);
		
		if (results.status != 200) {
			console.log(results);
		}

		// ********** Then
		expect(results).toHaveProperty("status", 200);

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/scmatteam?id=${ opponentSCMat.id}`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/externalteam?name=${ opponentSCMat.name }`);
		expect(client.get).toHaveBeenNthCalledWith(3, `${ serverPath }/data/externalwrestler?externalteamid=${ floTeams[0].id }`);

		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("wrestlers", expectedResult);

	});

	it("gets the sc mat team data to compare", async () => {

		// ********** Given

		const team = {
				id: "team1", 
				name: "Test Team",
				rankings: [{ date: new Date(2023,9,4), ranking: 5 }],
				wrestlers: [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler", rankings: [{ date: new Date(2023, 9, 5), weightClass: 106 }, { date: new Date(2023, 8, 1), weightClass: 113 }] }]
			},
			opponent = {
				id: "team2", 
				name: "Opponent Team",
				rankings: [{ date: new Date(2023,9,4), ranking: 5 }],
				wrestlers: [{ id: "wrestler2", firstName: "Test", lastName: "Wrestler2", rankings: [{ date: new Date(2023, 9, 5), weightClass: 106 }, { date: new Date(2023, 8, 1), weightClass: 200 }] }]
			},
			expectedWeightClasses = [
				{ date: new Date(2023,9,5), weightClasses: [106] },
				{ date: new Date(2023,8,1), weightClasses: [113, 200] }
			];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { scmatTeams: [team, opponent] }});

		// ********** When

		const results = await api.teamGetSCMatCompare(team.id, opponent.id, serverPath);
		
		if (results.status != 200) {
			console.log(results);
		}

		// ********** Then
		expect(results).toHaveProperty("status", 200);

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/scmatteam`);

		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("team", team);
		expect(results.data).toHaveProperty("opponent", opponent);
		expect(results.data).toHaveProperty("weightClasses", expectedWeightClasses);

	});

	it("saves data from the team wrestlers page", async () => {
		
		// ********** Given

		const user = { id: "user1" },
			team = { id: "team1", name: "Test Team", wrestlers: [] },
			saveWrestlers = [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler", position: 0 }];

		const send = jest.fn().mockResolvedValue({
			body: { id: team.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn()
			.mockResolvedValue({ body: { teams: [team] }});

		// ********** When

		const results = await api.teamWrestlersSave({ teamId: team.id, saveWrestlers: saveWrestlers }, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/team`);
		expect(send).toHaveBeenCalledWith({
			team: expect.objectContaining({ 
				wrestlers: saveWrestlers
			})
		});

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/team?id=${ team.id }`);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("team", expect.objectContaining({ id: team.id, wrestlers: saveWrestlers }));

	});

});

describe("External Wrestler", () => {

	it("gets full details for a wrestler", async () => {

		const externalWrestler = {
				id: "wrestler1",
				name: "Test Wrestler",
				events: [
				{
					date: new Date(2023,10,3),
					name: "Test Event",
					matches: [
						{ division: "Varsity", weightClass: "106", round: "Finals", vs: "Wrestler 2", vsTeam: "Team Name", isWinner: false, sort: 99, winType: "F" }
					]
				},
				{ 
					date: new Date(2023, 9, 10), 
					name: "Test Event 1", 
					matches: [
						{ division: "JV", weightClass: "120", round: "1", vs: "Wrestler 3", vsTeam: "Team 2", isWinner: true, sort: 99, winType: "Dec" }
					] 
				}
				]
			},
			expected = {
				id: "wrestler1",
				name: "Test Wrestler",
				division: "Varsity",
				weightClass: "106",
				weightClasses: [
					{ lastDate: new Date(2023,10,3), weightClass: "106", division: "Varsity", lastEvent: "Test Event" },
					{ lastDate: new Date(2023,9,10), weightClass: "120", division: "JV", lastEvent: "Test Event 1" }
				],
				events: [{
					date: new Date(2023,10,3),
					name: "Test Event",
					division: "Varsity",
					weightClass: "106",
					matches: [
						{ round: "Finals", vs: "Wrestler 2", vsTeam: "Team Name", isWinner: false, sort: 99, winType: "F" }
					]
				},
				{
					date: new Date(2023,9,10),
					name: "Test Event 1",
					division: "JV",
					weightClass: "120",
					matches: [
						{ round: "1", vs: "Wrestler 3", vsTeam: "Team 2", isWinner: true, sort: 99, winType: "Dec" }
					]
				}
				]
			};

		client.get = jest.fn()
			.mockResolvedValue({ body: { externalWrestlers: [externalWrestler] }});

		const results = await api.externalWrestlerDetails(externalWrestler.id, null, serverPath);

		if (results.status != 200) {
			console.log(results);
		}

		expect(results).toHaveProperty("status", 200);
		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/externalwrestler?id=${ externalWrestler.id }`);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("wrestler", expected);
	
	});

});

describe("External Links", () => {

	it("gets all external wrestlers", async () => {

		const externalWrestlers = [{
			id: "external1",
			sqlId: 111,
			name: "Test Wrestler",
			matches: []
		}];

		client.get = jest.fn().mockResolvedValue({ body: { externalWrestlers: externalWrestlers }});

		const results = await api.externalWrestlersBulk(serverPath);

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/externalwrestler`);
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("externalWrestlers", externalWrestlers);

	});

	it("saves bulk wrestlers", async () => {

		const externalWrestlers = [{
				id: "external1",
				sqlId: 111,
				name: "Test Wrestler",
				events: [{ id: "event1", sqlId: 444, name: "Event 1", team: "Team 1", date: new Date() }]
			}, {
				id: "external2",
				sqlId: 222,
				name: "Test Wrestler 2",
				events: [{ id: "event2", sqlId: 333, name: "Event 2", team: "Team 1", date: new Date() }]
			}],
			externalTeam = { id: "team1", name: "Team 1", wrestlers: [], events: [] };

		const send = jest.fn()
			.mockResolvedValueOnce({ body: { id: externalWrestlers[0].id } })
			.mockResolvedValueOnce({ body: { id: externalWrestlers[1].id } })
			.mockResolvedValueOnce({ body: { id: externalTeam.id } });
		client.post = jest.fn(() => ({ send: send }));

		client.get = jest.fn().mockResolvedValue({ body: { externalTeams: [externalTeam] }});

		const results = await api.externalWrestlersBulkSave(externalWrestlers, serverPath);

		expect(client.post).toHaveBeenNthCalledWith(1, `${ serverPath }/data/externalwrestler`);
		expect(send).toHaveBeenNthCalledWith(1, { externalwrestler: externalWrestlers[0] });
		expect(send).toHaveBeenNthCalledWith(2, { externalwrestler: externalWrestlers[1] });

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/externalteam?exactname=${ externalTeam.name }`);

		expect(client.post).toHaveBeenNthCalledWith(3, `${ serverPath }/data/externalteam`);
		expect(send).toHaveBeenNthCalledWith(3, { 
			externalteam: expect.objectContaining({
				id: externalTeam.id,
				wrestlers: [ expect.objectContaining({ id: externalWrestlers[0].id}), expect.objectContaining({ id: externalWrestlers[1].id}) ],
				events: expect.arrayContaining([ expect.objectContaining({ sqlId: externalWrestlers[0].events[0].sqlId }) ])
			})
		});

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("externalWrestlers", externalWrestlers.map(wrestler => expect.objectContaining({ id: wrestler.id }) ));

	});

});

describe("Flo Events", () => {

	it("gets a flo event", async () => {

		// ********** Given

		const floEvents = [{
			id: "flo1",
			sqlId: 1234,
			isFavorite: true,
			lastUpdate: new Date(),
			divisions: []
		}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { floEvents: floEvents }}) // Get the teams

		// ********** When

		const results = await api.floEventLoad(floEvents[0].id, serverPath, new Date(new Date().setMinutes(0,0,0,0)));

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/floevent?id=${ floEvents[0].id }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("floEvent");
		expect(results.data.floEvent).toEqual(floEvents[0]);

	});

	it("gets favorite flo events", async () => {

		// ********** Given

		const floEvents = [{
			id: "flo1",
			sqlId: 1234,
			isFavorite: true
		},
		{
			id: "flo2",
			sqlId: 6789,
			isFavorite: false
		}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { floEvents: floEvents }}) // Get the teams

		// ********** When

		const results = await api.floEventFavorites(serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/floevent`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("floEvents");
		expect(results.data.floEvents).toHaveLength(floEvents.filter(event => event.isFavorite).length);

	});

	it("saves flo Event", async () => {
		
		// ********** Given

		const floEvent = { 
			id: "test1", 
			name: "Test Event", 
			sqlId: 1234, 
			divisions: [{
				name: "division 1",
				weightClasses: [{
					name: "111",
					pools: [{
						matches: [{
							matchNumber: "1",
							round: "2",
							mat: "2",
							topWrestler: { name: "Wrestler 1", team: "Team 1", isWinner: true },
							bottomWrestler: { name: "Wrestler 2", team: "Team 2" },
							winType: "Dec"
						}]
					}]
				}]
			}]
		};

		const send = jest.fn().mockResolvedValue({
			body: { id: floEvent.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { floEvents: [{ ...floEvent, divisions: [] }] }}) // Lookup the event

		// ********** When

		const results = await api.floEventSave(floEvent, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/floevent?sqlid=${ floEvent.sqlId }`);
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/floevent`);

		expect(send).toHaveBeenCalledWith({
			floevent: expect.objectContaining({
				updates: expect.arrayContaining([
					expect.objectContaining({
						updates: expect.arrayContaining([
							expect.objectContaining({ updateType: "New Match"}),
							expect.objectContaining({ updateType: "Wrestler Assignment"}),
							expect.objectContaining({ updateType: "Match Completed"})
						])
					})
				])
			})
		})

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("id", floEvent.id);

	});

});

describe("Track Events", () => {

	it("saves track event", async () => {
		
		// ********** Given

		const trackEvent = { id: "test1", name: "Test Event", sqlId: 1234 };

		const send = jest.fn().mockResolvedValue({
			body: { id: trackEvent.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { trackEvents: [] }}) // Lookup the event

		// ********** When

		const results = await api.trackEventSave(trackEvent, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/trackevent?sqlid=${ trackEvent.sqlId }`);
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/trackevent`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				trackevent: expect.objectContaining({ name: trackEvent.name })
			})
		);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("id", trackEvent.id);

	});

});

describe("SC Mat Teams", () => {

	it("saves bulk SC mat teams", async () => {

		const teams = [{ 
				confrence: "AA", 
				name: "Test Team", 
				rankings: [{ ranking: 5, date: new Date(2023, 8, 29) }], 
				wrestlers: [{ 
					firstName: "Test", 
					lastName: "Wrestler",
					rankings: [{ weightClass: "111", ranking: 1, date: new Date(2023, 8, 29) }]
				}] 
			}, { 
				confrence: "AA", 
				name: "Test Team 2", 
				rankings: [{ ranking: 2, date: new Date(2023, 8, 29) }], 
				wrestlers: [{ 
					firstName: "Test", 
					lastName: "Wrestler",
					rankings: [{ weightClass: "111", ranking: 1, date: new Date(2023, 8, 29) }]
				}] 
			}],
			teamIds = ["team1", "team2"];

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { scmatTeams: [{...teams[0], id: teamIds[0] }] }}) // Get an existing team
			.mockResolvedValueOnce({ body: { scmatTeams: [] }}); // Don't find a team

		const send = jest.fn()
			.mockResolvedValueOnce({ body: { id: teamIds[0] } })
			.mockResolvedValueOnce({ body: { id: teamIds[1] } });

		client.post = jest.fn(() => ({
			send: send
		}));
		
		const results = await api.scmatTeamBulkSave(teams, serverPath);

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/scmatteam?exactname=${ teams[0].name }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/scmatteam?exactname=${ teams[1].name }`);

		expect(client.post).toHaveBeenCalledTimes(2);
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/scmatteam`);
		expect(send).toHaveBeenNthCalledWith(1, { scmatteam: expect.objectContaining({ id: teamIds[0] }) });
		expect(send).toHaveBeenNthCalledWith(2, { scmatteam: expect.objectContaining({ name: teams[1].name }) });

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("teams", [{ index: 0, id: teamIds[0] }, { index: 1, id: teamIds[1] }]);

	});

	it("search SC Mat teams", async () => {

		const filter = "test",
			scmatTeams = [{ 
				id: "matteam1", 
				name: "Test Team", 
				rankings: [{ date: new Date(2023, 9, 1), ranking: 4 }],
				wrestlers: [{ firstName: "Test", lastName: "Wrestler" }]
			}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { scmatTeams: scmatTeams } })
			.mockResolvedValueOnce({ body: { teams: [{ id: "team1", scmatTeams: [] }] } });
		
		const results = await api.scmatTeamSearch(filter, serverPath);

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/scmatteam?name=${ filter }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/team`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("scmatTeams", expect.arrayContaining([expect.objectContaining({ id: scmatTeams[0].id })]));

	});

});

describe("Flo Matches", () => {
	
	it("Gets all flo Matches", async () => {

		const floMatches = [{ 
				id: "match1", 
				sqlId: 111,
				winnerSqlId: 222,
				loserSqlId: 333
			}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { floMatches: floMatches } })
		
		const results = await api.floMatchGetBulk(serverPath);

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/flomatch`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("floMatches", floMatches);

	});

	it("saves bulk flo Matches", async () => {

		const matches = [{ 
			id: "match1", 
			sqlId: 111,
			winnerSqlId: 222,
			loserSqlId: 333
		}, { 
			id: "match2", 
			sqlId: 999,
			winnerSqlId: 888,
			loserSqlId: 777
		}];

		const send = jest.fn()
			.mockResolvedValueOnce({ body: { id: matches[0].id } })
			.mockResolvedValueOnce({ body: { id: matches[1].id } });

		client.post = jest.fn(() => ({
			send: send
		}));
		
		const results = await api.floMatchSaveBulk(matches, serverPath);

		expect(client.post).toHaveBeenCalledTimes(2);
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/flomatch`);
		expect(send).toHaveBeenNthCalledWith(1, { flomatch: matches[0] });
		expect(send).toHaveBeenNthCalledWith(2, { flomatch: matches[1] });

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("floMatches", [{ index: 0, id: matches[0].id }, { index: 1, id: matches[1].id }]);

	});

});