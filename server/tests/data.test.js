/**
 * @jest-environment node
 */

import mongoose from "mongoose";
import config from "../config.js";
import data from "../data.js";

beforeAll(async () => {
	await mongoose.connect(`mongodb://${config.db.user}:${config.db.pass}@${config.db.servers.join(",")}/${config.db.db}?authSource=${config.db.authDB}`, {useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe("User data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const results = await data.userGet();
		
		expect(results.status).toEqual(200);
		expect(results.data).toHaveProperty("users");
	});

	it("should return users filtered by role", async () => {
		const roles = await data.roleGet();

		if (roles.data.length > 0) {
			const results = await data.userGet({ roleId: roles.data[0].id });

			expect(results.status).toEqual(200);
			expect(results.data).toHaveProperty("users");

			if (results.data.users.length > 0) {
				const userRoles = [...new Set(results.data.users.flatMap(user => user.roles.flatMap(role => role.id))) ];

				expect(userRoles).toHaveLength(1);
				expect(userRoles[0]).toBe(roles[0].id);
			}
		}
	});

	it("should create a new object", async () => {
		const response = await data.userSave({
			firstName: "test",
			lastName: "user",
			email: "test@nomail.com"
		});

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		const response = await data.userGet({ id: createdId });

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("users");
		expect(response.data.users).toHaveLength(1);

		expect(response.data.users).toEqual(
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
		const response = await data.userGet({ id: "abcd" });

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("users");
		expect(response.data.users).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await data.userDelete(createdId);;
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.userGet(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("users");
		expect(response.data.users).toHaveLength(0);
	});

});

describe("Device request data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await data.deviceRequestGet();

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("deviceRequests");
	});

	it("should create a new object", async () => {
		const response = await data.deviceRequestSave({
			name: "test",
			email: "test@nomail.com"
		});

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		const response = await data.deviceRequestGet(createdId);

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("deviceRequests");
		expect(response.data.deviceRequests).toHaveLength(1);

		expect(response.data.deviceRequests).toEqual(
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
		const response = await data.deviceRequestGet("abcd");

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("deviceRequests");
		expect(response.data.deviceRequests).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await data.deviceRequestDelete(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.deviceRequestGet(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("deviceRequests");
		expect(response.data.deviceRequests).toHaveLength(0);
	});

});

describe("Score call data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await data.scoreCallGet();

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("scoreCalls");
	});

	it("should create a new object", async () => {
		const response = await data.scoreCallSave({
			abbreviation: "TST",
			points: 0,
			description: "Test call"
		});

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		const response = await data.scoreCallGet(createdId);

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("scoreCalls");
		expect(response.data.scoreCalls).toHaveLength(1);

		expect(response.data.scoreCalls).toEqual(
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
		const response = await data.scoreCallGet("abcd");

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("scoreCalls");
		expect(response.data.scoreCalls).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await data.scoreCallDelete(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.scoreCallGet(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("scoreCalls");
		expect(response.data.scoreCalls).toHaveLength(0);
	});

});

describe("Wrestler data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await data.wrestlerGet();

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("wrestlers");
	});

	it("should create a new object", async () => {
		const response = await data.wrestlerSave({
			firstName: "test",
			lastName: "user",
			team: "test team",
			division: "Test division",
			weightClass: "test weight"
		});

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		const response = await data.wrestlerGet(createdId);

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("wrestlers");
		expect(response.data.wrestlers).toHaveLength(1);

		expect(response.data.wrestlers).toEqual(
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
		const response = await data.wrestlerGet("abcd");

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("wrestlers");
		expect(response.data.wrestlers).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await data.wrestlerDelete(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.wrestlerGet(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("wrestlers");
		expect(response.data.wrestlers).toHaveLength(0);
	});

});

describe("Dual data test", () => {
	let createdId;

	it("should return return an array of items", async () => {
		const response = await data.dualGet();

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("duals");
	});

	it("should create a new object", async () => {
		const response = await data.dualSave({
			name: "Test dual",
			division: "test division"
		});

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		const response = await data.dualGet(createdId);

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("duals");
		expect(response.data.duals).toHaveLength(1);

		expect(response.data.duals).toEqual(
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
		const response = await data.dualGet("abcd");

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("duals");
		expect(response.data.duals).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		const response = await data.dualDelete(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.dualGet(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("duals");
		expect(response.data.duals).toHaveLength(0);
	});

});

describe("Post data", () => {
	let createdId,
		newData = {
			content: "Test post",
			scope: "internal",
			expires: new Date(new Date(Date.now()).setDate(new Date().getDate() + 5))
		},
		expiredData = {
			content: "Test post",
			scope: "internal",
			expires: new Date(new Date(Date.now()).setDate(new Date().getDate() - 5))
		};

	it("should return return an array of items", async () => {
		// ********** Given

		// ********** When
		const response = await data.postGet(null);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("posts");
	});

	it("should create a new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.postSave(newData);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		// ********** Given

		// ********** When
		const response = await data.postGet(createdId);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("posts");
		expect(response.data.posts).toHaveLength(1);

		expect(response.data.posts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId,
					content: newData.content,
					scope: newData.scope,
					expires: newData.expires
				})
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		// ********** Given

		// ********** When
		const response = await data.postGet("abcd");

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("posts");
		expect(response.data.posts).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.postDelete(createdId);
		
		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.postGet(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("posts");
		expect(response.data.posts).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId
				})
			])
		);
	});

	it("should not return expired results", async () => {
		// ********** Given
		let response = await data.postSave(expiredData);

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;

		// ********** When
		response = await data.postGet();

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("posts");
		expect(response.data.posts.filter(post => post.expires && post.expires < new Date())).toHaveLength(0);

		response = await data.postDelete(createdId);

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});
	
	it("should return expired results", async () => {
		// ********** Given
		let response = await data.postSave(expiredData);

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;

		// ********** When
		response = await data.postGet(null, true);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("posts");
		expect(response.data.posts.filter(post => post.expires < new Date())).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: createdId })
			])
		);

		response = await data.postDelete(createdId);

		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

});

describe("Role data", () => {
	let createdId,
		newData = {
			name: "Test role",
			isActive: true
		};

	it("should return return an array of items", async () => {
		// ********** Given

		// ********** When
		const response = await data.roleGet(null);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("roles");
	});

	it("should create a new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.roleSave(newData);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		// ********** Given

		// ********** When
		const response = await data.roleGet(createdId);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("roles");
		expect(response.data.roles).toHaveLength(1);

		expect(response.data.roles).toEqual(
			expect.arrayContaining([
				expect.objectContaining(newData)
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		// ********** Given

		// ********** When
		const response = await data.roleGet("abcd");

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("roles");
		expect(response.data.roles).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.roleDelete(createdId);
		
		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.roleGet(createdId);
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("roles");
		expect(response.data.roles).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId
				})
			])
		);
	});

});

describe("Privilege data", () => {
	let createdId,
		newData = {
			name: "Test privilege",
			token: "test"
		};

	it("should return return an array of items", async () => {
		// ********** Given

		// ********** When
		const response = await data.privilegeGet();

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("privileges");
	});

	it("should create a new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.privilegeSave(newData);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		// ********** Given

		// ********** When
		const response = await data.privilegeGet({ id: createdId });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("privileges");
		expect(response.data.privileges).toHaveLength(1);

		expect(response.data.privileges).toEqual(
			expect.arrayContaining([
				expect.objectContaining(newData)
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		// ********** Given

		// ********** When
		const response = await data.privilegeGet({ id: "abcd" });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("privileges");
		expect(response.data.privileges).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.privilegeDelete(createdId);
		
		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.privilegeGet({ id: createdId });
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("privileges");
		expect(response.data.privileges).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId
				})
			])
		);
	});

});

describe("Event data", () => {
	let createdId,
		newData = {
			date: new Date(new Date().setHours(0,0,0,0)),
			name: "Test Event",
			location: "Test location"
		};

	it("should return return an array of items", async () => {
		// ********** Given

		// ********** When
		const response = await data.eventGet();

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("events");
	});

	it("should create a new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.eventSave(newData);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		// ********** Given

		// ********** When
		const response = await data.eventGet({id: createdId});

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("events");
		expect(response.data.events).toHaveLength(1);

		expect(response.data.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining(newData)
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		// ********** Given

		// ********** When
		const response = await data.eventGet({id: "abcd"});

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("events");
		expect(response.data.events).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.eventDelete(createdId);
		
		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.eventGet({id: createdId});
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("events");
		expect(response.data.events).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId
				})
			])
		);
	});

});

describe("Team data", () => {
	let createdId,
		newData = {
			name: "Test Team"
		};

	it("should return return an array of items", async () => {
		// ********** Given

		// ********** When
		const response = await data.teamGet();

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("teams");
	});

	it("should create a new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.teamSave(newData);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		// ********** Given

		// ********** When
		const response = await data.teamGet({ id: createdId });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("teams");
		expect(response.data.teams).toHaveLength(1);

		expect(response.data.teams).toEqual(
			expect.arrayContaining([
				expect.objectContaining(newData)
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		// ********** Given

		// ********** When
		const response = await data.teamGet({ id: "abcd" });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("teams");
		expect(response.data.teams).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.teamDelete(createdId);
		
		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.teamGet({ id: createdId });
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("teams");
		expect(response.data.teams).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId
				})
			])
		);
	});

});

describe("External team data", () => {
	let createdId,
		newData = {
			name: "Test Team",
			meets: [ "match 1", "match 2" ]
		};

	it("should return return an array of items", async () => {
		// ********** Given

		// ********** When
		const response = await data.externalTeamGet();

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("externalTeams");
	});

	it("should create a new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.externalTeamSave(newData);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		// ********** Given

		// ********** When
		const response = await data.externalTeamGet({ id: createdId });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("externalTeams");
		expect(response.data.externalTeams).toHaveLength(1);

		expect(response.data.externalTeams).toEqual(
			expect.arrayContaining([
				expect.objectContaining(newData)
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		// ********** Given

		// ********** When
		const response = await data.externalTeamGet({ id: "abcd" });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("externalTeams");
		expect(response.data.externalTeams).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.externalTeamDelete(createdId);
		
		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.externalTeamGet({ id: createdId });
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("externalTeams");
		expect(response.data.externalTeams).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId
				})
			])
		);
	});

});

describe("Flo Event Data", () => {
	let createdId,
		newData = {
			name: "Test Event"
		};

	it("should return return an array of items", async () => {
		// ********** Given

		// ********** When
		const response = await data.floEventGet();

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("floEvents");
	});

	it("should create a new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.floEventSave(newData);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		// ********** Given

		// ********** When
		const response = await data.floEventGet({ id: createdId });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("floEvents");
		expect(response.data.floEvents).toHaveLength(1);

		expect(response.data.floEvents).toEqual(
			expect.arrayContaining([
				expect.objectContaining(newData)
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		// ********** Given

		// ********** When
		const response = await data.floEventGet({ id: "abcd" });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("floEvents");
		expect(response.data.floEvents).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.floEventDelete(createdId);
		
		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.floEventGet({ id: createdId });
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("floEvents");
		expect(response.data.floEvents).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId
				})
			])
		);
	});

});

describe("Track Event Data", () => {
	let createdId,
		newData = {
			sqlId: 1234,
			trackId: "track1",
			name: "Test Event"
		};

	it("should return return an array of items", async () => {
		// ********** Given

		// ********** When
		const response = await data.trackEventGet();

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("trackEvents");
	});

	it("should create a new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.trackEventSave(newData);

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("id");

		createdId = response.data.id;
	});

	it("should get the new object by id", async () => {
		// ********** Given

		// ********** When
		const response = await data.trackEventGet({ id: createdId });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("trackEvents");
		expect(response.data.trackEvents).toHaveLength(1);

		expect(response.data.trackEvents).toEqual(
			expect.arrayContaining([
				expect.objectContaining(newData)
			])
		);
	});

	it("should return an empty array for non-existant object", async () => {
		// ********** Given

		// ********** When
		const response = await data.trackEventGet({ id: "abcd" });

		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("trackEvents");
		expect(response.data.trackEvents).toHaveLength(0);
	});

	it("should delete the new object", async () => {
		// ********** Given

		// ********** When
		const response = await data.trackEventDelete(createdId);
		
		// ********** Then
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("status", "ok");
	});

	it("should return an empty array after deleting the new object", async () => {
		const response = await data.trackEventGet({ id: createdId });
		
		expect(response.status).toEqual(200);
		expect(response.data).toHaveProperty("trackEvents");
		expect(response.data.trackEvents).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId
				})
			])
		);
	});

});
