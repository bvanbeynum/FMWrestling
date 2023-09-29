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

	it("saves Role", async () => {
		// ********** Given

		const save = { role: { name: "test role" }},
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

	it("gets privilege", async () => {

		// ********** Given

		const output = { privileges: [{ id: "testid" }]};

		data.privilegeGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/privilege")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("privileges");
		expect(response.body.privileges).toHaveLength(1);
	});

	it("saves privilege", async () => {
		// ********** Given

		const save = { name: "test privilege" },
			output = { id: "testid" };

		data.privilegeSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/privilege")
			.send({ privilege: save })
			.expect(200);
		
		// ********** Then

		expect(data.privilegeSave).toHaveBeenCalledWith(save);
		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes privilege", async () => {
		// ********** Given

		const privilegeId = "testid";

		data.privilegeDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/privilege?id=${ privilegeId }`)
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

	it("gets team", async () => {

		// ********** Given

		const output = { teams: [{ id: "testid" }]};

		data.teamGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/team")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("teams");
		expect(response.body.teams).toHaveLength(1);
	});

	it("saves team", async () => {
		// ********** Given

		const save = { name: "test team" },
			output = { id: "testid" };

		data.teamSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/team")
			.send({ team: save })
			.expect(200);
		
		// ********** Then

		expect(data.teamSave).toHaveBeenCalledWith(save);
		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes team", async () => {
		// ********** Given

		const teamId = "testid";

		data.teamDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/team?id=${ teamId }`)
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

	it("gets external team", async () => {

		// ********** Given

		const output = { externalTeams: [{ id: "testid" }]};

		data.externalTeamGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/externalteam")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("externalTeams");
		expect(response.body.externalTeams).toHaveLength(1);
	});

	it("saves external team", async () => {
		// ********** Given

		const save = { name: "test team" },
			output = { id: "testid" };

		data.externalTeamSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/externalteam")
			.send({ externalteam: save })
			.expect(200);
		
		// ********** Then

		expect(data.externalTeamSave).toHaveBeenCalledWith(save);
		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes external team", async () => {
		// ********** Given

		const externalTeamId = "testid";

		data.externalTeamDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/externalteam?id=${ externalTeamId }`)
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

	it("gets external wrestler", async () => {

		// ********** Given

		const output = { externalWrestlers: [{ id: "testid" }]};

		data.externalWrestlerGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/externalwrestler")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("externalWrestlers");
		expect(response.body.externalWrestlers).toHaveLength(1);
	});

	it("saves external wrestler", async () => {
		// ********** Given

		const save = { name: "test wrestler" },
			output = { id: "testid" };

		data.externalWrestlerSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/externalwrestler")
			.send({ externalwrestler: save })
			.expect(200);
		
		// ********** Then

		expect(data.externalWrestlerSave).toHaveBeenCalledWith(save);
		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes external wrestler", async () => {
		// ********** Given

		const externalWrestlerId = "testid";

		data.externalWrestlerDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/externalwrestler?id=${ externalWrestlerId }`)
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

	it("gets flo event", async () => {

		// ********** Given

		const output = { floEvents: [{ id: "testid" }]};

		data.floEventGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/floevent")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("floEvents");
		expect(response.body.floEvents).toHaveLength(1);
	});

	it("saves flo event", async () => {
		// ********** Given

		const save = { name: "test event" },
			output = { id: "testid" };

		data.floEventSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/floevent")
			.send({ floevent: save })
			.expect(200);
		
		// ********** Then

		expect(data.floEventSave).toHaveBeenCalledWith(save);
		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes flo event", async () => {
		// ********** Given

		const floEventId = "testid";

		data.floEventDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/floevent?id=${ floEventId }`)
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

	it("gets track event", async () => {

		// ********** Given

		const output = { trackEvents: [{ id: "testid" }]};

		data.trackEventGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/trackevent")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("trackEvents");
		expect(response.body.trackEvents).toHaveLength(1);
	});

	it("saves track event", async () => {
		// ********** Given

		const save = { name: "test event" },
			output = { id: "testid" };

		data.trackEventSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/trackevent")
			.send({ trackevent: save })
			.expect(200);
		
		// ********** Then

		expect(data.trackEventSave).toHaveBeenCalledWith(save);
		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes track event", async () => {
		// ********** Given

		const trackEventId = "testid";

		data.trackEventDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/trackevent?id=${ trackEventId }`)
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

	it("gets SC Mat team", async () => {

		// ********** Given

		const output = { scmatTeams: [{ id: "testid" }]};

		data.scmatTeamGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.get("/data/scmatteam")
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("scmatTeams");
		expect(response.body.scmatTeams).toHaveLength(1);
	});

	it("saves SC Mat team", async () => {
		// ********** Given

		const save = { name: "Test Team" },
			output = { id: "testid" };

		data.scmatTeamSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When
		
		const response = await request(app)
			.post("/data/scmatteam")
			.send({ scmatteam: save })
			.expect(200);
		
		// ********** Then

		expect(data.scmatTeamSave).toHaveBeenCalledWith(save);
		expect(response.body).toHaveProperty("id", output.id);
	});

	it("deletes SC Mat team", async () => {
		// ********** Given

		const scmatTeamId = "testid";

		data.scmatTeamDelete = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When
		
		const response = await request(app)
			.delete(`/data/scmatteam?id=${ scmatTeamId }`)
			.expect(200);
		
		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");
	});

});

describe("API service", () => {

	const privilegesGlobal = [{ id: "priv1", token: "testPriv" }],
		rolesGlobal = [{ id: "role1", privileges: privilegesGlobal }],
		userGlobal = {
			id: "globaluser1",
			firstName: "Global",
			lastName: "Test",
			roles: rolesGlobal
		};

	beforeEach(() => {
		api.authInternal = jest.fn().mockReturnValue(true);
		api.authPortal = jest.fn().mockResolvedValue({ status: 200, user: userGlobal });
		api.authAPI = jest.fn().mockReturnValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("loads home data", async () => {

		// ********** Given

		// ********** When

		const response = await request(app)
			.get("/api/homeload")
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("loggedInUser", userGlobal);

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

	it("pulls users", async () => {

		// ********** Given

		const output = {
				users: [{ id: "user1",  firstName: "Test", lastName: "User", devices: [], roles: [] }],
				roles: [{ id: "role1", name: "Test Role 1" }]
			};

		api.usersLoad = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get("/api/usersload")
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("users");
		expect(response.body.users).toEqual(output.users);

		expect(response.body).toHaveProperty("roles");
		expect(response.body.roles).toEqual(output.roles);

	});

	it("saves user", async () => {
		// ********** Given

		const user = { firstName: "Test", lastName: "User", email: "test@nomail.com", phone: null },
			output = { user: { ...user, id: "user1" }};

		api.usersSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post("/api/userssave")
			.send({ saveUser: user })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("user");
		expect(response.body.user).toEqual(
			expect.objectContaining({ id: output.user.id })
		);

	});

	it("pulls teams", async () => {

		// ********** Given

		const output = {
				teams: [{ id: "team1",  name: "Test Team", externalTeams: [] }]
			};

		api.teamsLoad = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get("/api/teamsload")
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("teams");
		expect(response.body.teams).toEqual(output.teams);

		expect(response.body).toHaveProperty("loggedInUser");

	});

	it("saves team", async () => {
		// ********** Given

		const team = { name: "Test Team", confrence: "AA", externalTeams: [{ id: "externalid", name: "Test External" }] },
			output = { team: { ...team, id: "savedteamid" }};

		api.teamsSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post("/api/teamssave")
			.send({ saveTeam: team })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("team");
		expect(response.body.team).toEqual(
			expect.objectContaining({ id: output.team.id })
		);

	});

	it("loads the team view data", async () => {
		
		// ********** Given

		const output = {
			team: { id: "team1",  name: "Test Team", externalTeams: [] }
		};

		api.teamViewLoad = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get(`/api/teamviewload?id=${ output.team.id }`)
			.expect(200);

		// ********** Then

		expect(api.teamViewLoad).toHaveBeenCalledWith(output.team.id, expect.anything());
		expect(response.body).toHaveProperty("team", output.team);
		expect(response.body).toHaveProperty("loggedInUser");

	});

	it("saves team session data", async () => {
		// ********** Given

		const packet = { teamId: "team1", selectedDivision: "Varsity", compare: { opponentId: "team2" } };

		api.teamViewSave = jest.fn().mockResolvedValue({
			status: 200,
			data: { status: "ok" }
		});

		// ********** When

		const response = await request(app)
			.post("/api/teamviewsave")
			.send({ savepacket: packet })
			.expect(200);

		// ********** Then

		expect(api.teamViewSave).toHaveBeenCalledWith(packet, expect.anything(), expect.anything());

	});

	it("gets external teams", async () => {

		// ********** Given

		const output = {
				externalTeams: [{ id: "team1",  name: "Test Team", meets: [], wrestlers: [ "Wrestler 1" ] }]
			};

		api.externalTeamsGet = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get("/api/externalteamsget")
			.expect(200);

		// ********** Then

		expect(api.externalTeamsGet).toHaveBeenCalled();
		expect(response.body).toHaveProperty("externalTeams");
		expect(response.body.externalTeams).toEqual(output.externalTeams);

	});

	it("saves batch external teams", async () => {
		// ********** Given

		const updateTeams = [{ name: "test team", wrestlers: [], meets: [] }],
			deleteTeams = [ "test1", "test2" ],
			output = { status: "ok" };

		api.externalTeamsSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post("/api/externalteamssave")
			.send({ updateTeams: updateTeams, deleteTeams: deleteTeams })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("status", "ok");

	});

	it("searches external teams", async () => {

		// ********** Given

		const output = {
				externalTeams: [{ id: "team1",  name: "Test Team", meets: [], wrestlers: [ "Wrestler 1" ] }]
			};

		api.externalTeamsSearch = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get("/api/externalteamssearch")
			.expect(200);

		// ********** Then

		expect(api.externalTeamsSearch).toHaveBeenCalled();
		expect(response.body).toHaveProperty("externalTeams");
		expect(response.body.externalTeams).toEqual(output.externalTeams);

	});

	it("adds a wrestler to the team", async () => {

		// ********** Given

		const teamId = "team1",
			output = { wrestler: { id: "wrestler1", firstName: "Test", lastName: "Wrestler" } };

		api.teamsWrestlerSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post(`/api/teamswrestlersave?teamid=${ teamId }`)
			.send({ wrestler: output.wrestler })
			.expect(200);

		// ********** Then

		expect(api.teamsWrestlerSave).toHaveBeenCalledWith(teamId, output.wrestler, expect.anything());
		expect(response.body).toHaveProperty("wrestler", output.wrestler);

	});

	it("loads bulk external wrestlers", async () => {

		// ********** Given

		const output = { externalWrestlers: [{ name: "Test Wrestler", sqlId: 111 }] };

		api.externalWrestlersBulk = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.get(`/api/externalwrestlersbulk`)
			.expect(200);

		// ********** Then

		expect(api.externalWrestlersBulk).toHaveBeenCalled();
		expect(response.body).toHaveProperty("externalWrestlers", output.externalWrestlers);

	});

	it("saves bulk external wrestlers", async () => {

		// ********** Given

		const save = [{ id: "wrestler1", name: "TestWrestler" }],
			output = { externalWrestlers: [{ index: 0, id: "wrestler1 "}] };

		api.externalWrestlersBulkSave = jest.fn().mockResolvedValue({
			status: 200,
			data: output
		});

		// ********** When

		const response = await request(app)
			.post(`/api/externalwrestlersbulksave`)
			.send({ externalwrestlers: save })
			.expect(200);

		// ********** Then

		expect(api.externalWrestlersBulkSave).toHaveBeenCalledWith(save, expect.anything());
		expect(response.body).toHaveProperty("externalWrestlers", output.externalWrestlers);

	});

	it("gets flo event", async () => {
		// ********** Given

		const floEvent = { id: "test1", name: "Test flo Event", isFavorite: true };

		api.floEventLoad = jest.fn().mockResolvedValue({
			status: 200,
			data: { floEvent: floEvent }
		});

		// ********** When

		const response = await request(app)
			.get(`/api/floeventload?id=${ floEvent.id }`)
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("floEvent", floEvent);

	});

	it("gets flo favorites", async () => {
		// ********** Given

		const floEvents = [{ id: "test1", name: "Test flo Event", isFavorite: true }];

		api.floEventFavorites = jest.fn().mockResolvedValue({
			status: 200,
			data: { floEvents: floEvents }
		});

		// ********** When

		const response = await request(app)
			.get("/api/floeventfavorites")
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("floEvents", floEvents);

	});

	it("saves flo event", async () => {
		// ********** Given

		const floEvent = { id: "test1", name: "Test flo Event" };

		api.floEventSave = jest.fn().mockResolvedValue({
			status: 200,
			data: { id: floEvent.id }
		});

		// ********** When

		const response = await request(app)
			.post("/api/floeventsave")
			.send({ floEvent: floEvent })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("id", floEvent.id);

	});

	it("saves track event", async () => {
		// ********** Given

		const trackEvent = { id: "test1", name: "Test track event" };

		api.trackEventSave = jest.fn().mockResolvedValue({
			status: 200,
			data: { id: trackEvent.id }
		});

		// ********** When

		const response = await request(app)
			.post("/api/trackeventsave")
			.send({ trackEvent: trackEvent })
			.expect(200);

		// ********** Then

		expect(response.body).toHaveProperty("id", trackEvent.id);

	});

});
