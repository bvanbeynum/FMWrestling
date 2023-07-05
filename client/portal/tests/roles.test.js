/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Roles from "../roles.jsx";

describe("Roles component", () => {

	const users = [{ id: "testuser1", firstName: "Test", lastName: "User 1" }],
		privileges = [{ id: "testprivilege1", name: "Test Privilege", token: "test" }],
		roles = [{
			id: "testid",
			name: "Test Role",
			users: users,
			privileges: privileges,
			created: new Date(new Date(Date.now()).setDate(new Date().getDate() - 10)),
			modified: new Date(new Date(Date.now()).setDate(new Date().getDate() - 5)),
		}];

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				roles: roles,
				users: users,
				privileges: privileges
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<Roles />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/roleload"));
		
		expect(await screen.findByText(/new role/i)).toBeInTheDocument();
		expect(await screen.findByTestId(roles[0].id)).toBeInTheDocument();
	});

	it("adds a new role", async () => {

		const roleId = "roleid",
			roleName = "New Role";

		render(<Roles />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				role: {
					id: roleId,
					name: roleName,
					isActive: true,
					created: new Date()
				}
			})
		});

		const expandButton = await screen.findByRole("button", { name: /add/i });
		fireEvent.click(expandButton);

		const nameInput = await screen.findByLabelText("name"),
			addButton = await screen.findByRole("button", { name: /save/i });

		fireEvent.change(nameInput, { target: { value: roleName }});
		fireEvent.click(addButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/rolesave", expect.objectContaining({
			body: expect.stringContaining(roleName)
		})));

		expect(await screen.findByTestId(roleId)).toBeInTheDocument();
	});

	it("edits role name", async () => {

		const roleName = "New name";

		render(<Roles />);

		const expandButton = await screen.findByRole("button", { name: /edit/i });
		fireEvent.click(expandButton);

		const nameInput = await screen.findByLabelText("name"),
			saveButton = await screen.findByRole("button", { name: /save/i });
		
		fireEvent.change(nameInput, { target: { value: roleName }});
		fireEvent.click(saveButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/rolesave", expect.objectContaining({
			body: expect.stringContaining(roleName)
		})));
	});

	it("deletes a role", async () => {

		render(<Roles />);
		
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({ status: "ok" })
		});
		
		const rolePanel = await screen.findByTestId(roles[0].id);
		expect(rolePanel).toBeInTheDocument();

		// Click the edit button for the role
		const expandButton = await screen.findByRole("button", { name: /^edit$/i });
		fireEvent.click(expandButton);

		// Click the delete button for the role
		const deleteRoleButton = await screen.findByRole("button", { name: /^delete role$/i });
		fireEvent.click(deleteRoleButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/rolesave", expect.objectContaining({
			body: expect.stringContaining(roles[0].id)
		})));

		await waitFor(() => {
			const rolePanel = screen.queryByTestId(roles[0].id);
			expect(rolePanel).toBeNull();
		});

	});

	it("adds a member to a role", async () => {

		render(<Roles />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				role: {
					id: roles[0].id,
					name: roles[0].name,
					isActive: true,
					created: new Date(),
					users: users
				}
			})
		});

		// Click the edit on the role
		const expandButton = await screen.findByRole("button", { name: /^expand role$/i });
		fireEvent.click(expandButton);

		// Click to add a new member to the role
		const addMemberButton = await screen.findByRole("button", { name: /^add member$/i });
		fireEvent.click(addMemberButton);

		// Select the member to add (add button will show up after member is selected)
		const memberSelect = await screen.findByLabelText(/^member$/i);
		fireEvent.change(memberSelect, { target: { value: users[0].id }});

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/rolesave", expect.objectContaining({
			body: expect.stringContaining(users[0].id)
		})));
	});

	it("removes a member from a role", async () => {

		render(<Roles />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				role: {
					id: roles[0].id,
					name: roles[0].name,
					isActive: true,
					created: new Date(),
					users: []
				}
			})
		});

		// Click the edit on the role
		const expandButton = await screen.findByRole("button", { name: /^expand role$/i });
		fireEvent.click(expandButton);

		// Remove member
		const removeMemberButton = await screen.findByRole("button", { name: /^remove member$/i });
		fireEvent.click(removeMemberButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/rolesave", expect.objectContaining({
			body: expect.stringContaining(users[0].id)
		})));
	});

	it("adds a privilege to a role", async () => {

		render(<Roles />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				role: {
					id: roles[0].id,
					name: roles[0].name,
					isActive: true,
					created: new Date(),
					privileges: privileges,
				}
			})
		});

		// Click the edit on the role
		const expandButton = await screen.findByRole("button", { name: /^expand role$/i });
		fireEvent.click(expandButton);

		// Click to add a new privilege to the role
		const addPrivilegeButton = await screen.findByRole("button", { name: /^add privilege$/i });
		fireEvent.click(addPrivilegeButton);

		// Select the privilege to add
		const privilegeSelect = await screen.findByLabelText(/^privilege$/i);
		fireEvent.change(privilegeSelect, { target: { value: privileges[0].id }});

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/rolesave", expect.objectContaining({
			body: expect.stringContaining(privileges[0].id)
		})));
	});

	it("removes a privilege from a role", async () => {

		render(<Roles />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				role: {
					id: roles[0].id,
					name: roles[0].name,
					isActive: true,
					created: new Date(),
					privileges: []
				}
			})
		});

		// Click the edit on the role
		const expandButton = await screen.findByRole("button", { name: /^expand role$/i });
		fireEvent.click(expandButton);

		// Remove privilege
		const removePrivilegeButton = await screen.findByRole("button", { name: /^remove privilege$/i });
		fireEvent.click(removePrivilegeButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/rolesave", expect.objectContaining({
			body: expect.stringContaining(privileges[0].id)
		})));
	});

});
