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
			privileges = [{ id: "priv1" }],
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
		expect(results).toHaveProperty("user", expect.objectContaining({ privileges: privileges }))
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
		expect(results.data).toHaveProperty("floEvents", trackEvents);

		// No expired posts
		expect(results.data.events).toHaveLength(events.length);

		// First post matches mock
		expect(results.data.events[0]).toHaveProperty("id", events[0].id);
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

});

describe("Teams", () => {

	it("loads the data for teams", async () => {

		// ********** Given

		const teams = [{
			id: "testuserid",
			name: "Test Team",
			state: "TS",
			confrence: "5A",
			externalTeams: [{
				id: "testexternalid", 
				name: "External Team" 
			}]
		}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { teams: teams }}) // Get the teams

		// ********** When

		const results = await api.teamsLoad(serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/team`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("teams");
		expect(results.data.teams).toEqual(teams);

	});

	it("saves a new team", async () => {

		// ********** Given

		const body = { 
				saveTeam: { name: "Test Team", confrence: "AA", state: "TS" }
			},
			returnId = "saveid";

		const send = jest.fn().mockResolvedValue({
			body: { id: returnId }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn()
			.mockResolvedValue({ body: { teams: [{ ...body.saveTeam, id: returnId, created: new Date() }] }});

		// ********** When

		const results = await api.teamsSave(body, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/team`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				team: expect.objectContaining({ name: body.saveTeam.name })
			})
		);

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/team?id=${ returnId }`);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("team", expect.objectContaining({ id: returnId }));

	});

	it("deletes team", async () => {

		// ********** Given

		const body = { deleteTeam: "deleteteam" };

		client.delete = jest.fn()
			.mockResolvedValue({ body: { status: "ok" }});

		// ********** When

		const results = await api.teamsSave(body, serverPath);

		// ********** Then

		expect(client.delete).toHaveBeenCalledWith(`${ serverPath }/data/team?id=${ body.deleteTeam }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("status", "ok");

	});

	it("adds external team", async () => {

		// ********** Given

		const team = { id: "team1", externalTeams: [] },
			externalTeam = { id: "external1", name: "Test External" },
			body = { 
				saveExternal: { teamId: team.id, externalId: externalTeam.id }
			};

		const send = jest.fn().mockResolvedValue({
			body: { id: team.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { teams: [team] }})
			.mockResolvedValueOnce({ body: { externalTeams: [externalTeam] }})
			.mockResolvedValueOnce({ body: { teams: [{...team, externalTeams: team.externalTeams.concat(externalTeam) }] }});

		// ********** When

		const results = await api.teamsSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/team?id=${ team.id }`);
		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/externalteam?id=${ externalTeam.id }`);
		
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/team`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				team: expect.objectContaining({ 
					externalTeams: expect.arrayContaining([externalTeam])
				})
			})
		);

		expect(client.get).toHaveBeenNthCalledWith(3, `${ serverPath }/data/team?id=${ team.id }`);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("team", expect.objectContaining({ externalTeams: expect.arrayContaining([externalTeam]) }));

	});

	it("deletes external team", async () => {

		// ********** Given

		const externalTeam = { id: "external1", name: "Test External" },
			team = { id: "team1", externalTeams: [externalTeam] },
			body = { 
				deleteExternal: { teamId: team.id, externalId: externalTeam.id }
			};

		const send = jest.fn().mockResolvedValue({
			body: { id: team.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { teams: [team] }})
			.mockResolvedValueOnce({ body: { teams: [{...team, externalTeams: [] }] }});

		// ********** When

		const results = await api.teamsSave(body, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenNthCalledWith(1, `${ serverPath }/data/team?id=${ team.id }`);
		
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/team`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				team: expect.objectContaining({ 
					externalTeams: []
				})
			})
		);

		expect(client.get).toHaveBeenNthCalledWith(2, `${ serverPath }/data/team?id=${ team.id }`);
		
		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("team", expect.objectContaining({ externalTeams: [] }));

	});

});

describe("External Teams", () => {

	it("gets all external teams", async () => {

		// ********** Given

		const externalTeams = [{
			id: "testteamid",
			name: "Test Team",
			meets: [ "meet 1", "meet 2" ],
			wrestlers: [ "Wrestler 1" ]
		}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { externalTeams: externalTeams }}) // Get the teams

		// ********** When

		const results = await api.externalTeamsGet(serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/externalteam`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("externalTeams");
		expect(results.data.externalTeams).toEqual(externalTeams);

	});

	it("saves batch external teams", async () => {
		
		// ********** Given

		const body = { 
			updateTeams: [{ id: "test1", name: "test team", wrestlers: [], meets: [] }],
			deleteTeams: [ "test2", "test3" ]
		};

		const send = jest.fn().mockResolvedValue({
			body: { id: body.updateTeams[0].id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));

		client.delete = jest.fn(() => ({
			status: "ok"
		}));

		// ********** When

		const results = await api.externalTeamsSave(body, serverPath);

		// ********** Then

		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/externalteam`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				externalteam: expect.objectContaining({ id: body.updateTeams[0].id })
			})
		);

		expect(client.delete).toHaveBeenCalledTimes(2);
		expect(client.delete).toHaveBeenNthCalledWith(1, `${ serverPath }/data/externalteam?id=${ body.deleteTeams[0] }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");
		expect(results.data).toHaveProperty("status", "ok");

	});

	it("filters for external teams", async () => {

		// ********** Given

		const filter = "test",
			externalTeams = [{
				id: "testteamid",
				name: "Test Team",
				meets: [ "meet 1", "meet 2" ],
				wrestlers: [ "Wrestler 1" ]
			}];
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { externalTeams: externalTeams }}) // Get the teams

		// ********** When

		const results = await api.externalTeamsSearch(filter, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/externalteam?name=${ filter }`);

		expect(results).toHaveProperty("status", 200);
		expect(results).toHaveProperty("data");

		expect(results.data).toHaveProperty("externalTeams");
		expect(results.data.externalTeams).toEqual(externalTeams);

	})

});

describe("Flo Events", () => {

	it("saves flo Event", async () => {
		
		// ********** Given

		const floEvent = { id: "test1", name: "Test Event", sqlId: 1234 };

		const send = jest.fn().mockResolvedValue({
			body: { id: floEvent.id }
		});
		client.post = jest.fn(() => ({
			send: send
		}));
		
		client.get = jest.fn()
			.mockResolvedValueOnce({ body: { floEvents: [] }}) // Lookup the event

		// ********** When

		const results = await api.floEventSave(floEvent, serverPath);

		// ********** Then

		expect(client.get).toHaveBeenCalledWith(`${ serverPath }/data/floevent?sqlid=${ floEvent.sqlId }`);
		expect(client.post).toHaveBeenCalledWith(`${ serverPath }/data/floevent`);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				floevent: expect.objectContaining({ name: floEvent.name })
			})
		);

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
