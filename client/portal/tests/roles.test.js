/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Roles from "../roles.jsx";

describe("Roles component", () => {

	const roles = [{
		id: "testid",
		name: "Test Role",
		users: [{ id: "testuserid", firstName: "Test", lastName: "User" }],
		privileges: [{ id: "testprivilegeid", name: "Test Privilege" }],
		created: new Date(new Date(Date.now()).setDate(new Date().getDate() - 10)),
		modified: new Date(new Date(Date.now()).setDate(new Date().getDate() - 5)),
	}],
	testId = "addedtestid";

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				roles: roles
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

});