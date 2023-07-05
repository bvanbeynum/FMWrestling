/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import UsersComponent from "../users.jsx";

describe("Users Component", () => {

	const role = { id: "role1", name: "Test Role" },
		newRole = { id: "testnewroleid", name: "New Role" },
		device = {
			_id: "device1", 
			token: "uniquetoken",
			created: new Date(new Date(Date.now()).setDate(new Date().getDate() - 30)), 
			lastAccess: new Date(new Date(Date.now()).setDate(new Date().getDate() - 2)),
			browser: {
				platform: "Microsoft Windows",
				browser: "Chrome",
				os: "Windows 10.0",
				isDesktop: true,
				isMobile: false,
				isAndroid: false,
				isiPhone: false
			}
		},
		user = { id: "user1", firstName: "Test", lastName: "User", email: "test@nomail.com", phone: "111-111-1111", roles: [role], devices: [device] };

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				users: [user],
				roles: [role, newRole]
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the component", async () => {

		render(<UsersComponent />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/usersload"));
		expect(await screen.findByTestId(user.id)).toBeInTheDocument();
		
	});

	it("adds a new user", async () => {

		const newUserId = "newuserid",
			firstName = "Test",
			lastName = "User",
			email = "test@nomail.com",
			phone = "111-111-1111";

		render(<UsersComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				user: {
					id: newUserId,
					firstName: firstName,
					lastName: lastName,
					email: email,
					phone: phone,
					devices: [],
					roles: [],
					created: new Date()
				}
			})
		});

		const expandButton = await screen.findByRole("button", { name: /^add user$/i });
		fireEvent.click(expandButton);

		const firstInput = await screen.findByLabelText(/^first name$/i),
			lastInput = await screen.findByLabelText(/^last name$/i),
			emailInput = await screen.findByLabelText(/^email$/i),
			phoneInput = await screen.findByLabelText(/^phone$/i),
			addButton = await screen.findByRole("button", { name: /save/i });

		fireEvent.change(firstInput, { target: { value: firstName }});
		fireEvent.change(lastInput, { target: { value: lastName }});
		fireEvent.change(emailInput, { target: { value: email }});
		fireEvent.change(phoneInput, { target: { value: phone }});
		fireEvent.click(addButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/userssave", expect.objectContaining({
			body: expect.stringContaining(email)
		})));

		expect(await screen.findByTestId(newUserId)).toBeInTheDocument();
	});

	it("edits a user", async () => {

		const newEmail = "new@nomail.com";

		render(<UsersComponent />);

		const expandButton = await screen.findByRole("button", { name: /^edit user$/i });
		fireEvent.click(expandButton);

		const emailInput = await screen.findByLabelText(/^email$/i),
			saveButton = await screen.findByRole("button", { name: /save/i });
		
		fireEvent.change(emailInput, { target: { value: newEmail }});
		fireEvent.click(saveButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/userssave", expect.objectContaining({
			body: expect.stringContaining(newEmail)
		})));
	});

	it("deletes user", async () => {

		render(<UsersComponent />);
		
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({ status: "ok" })
		});
		
		const userPanel = await screen.findByTestId(user.id);
		expect(userPanel).toBeInTheDocument();

		// Click the edit button for the user
		const expandButton = await screen.findByRole("button", { name: /^edit user$/i });
		fireEvent.click(expandButton);

		// Click the delete button for the user
		const deleteUserButton = await screen.findByRole("button", { name: /^delete user$/i });
		fireEvent.click(deleteUserButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/userssave", expect.objectContaining({
			body: expect.stringContaining(user.id)
		})));

		await waitFor(() => {
			const userPanel = screen.queryByTestId(user.id);
			expect(userPanel).toBeNull();
		});

	});

	it("removes a device from a user", async () => {

		render(<UsersComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				user: {
					...user,
					devices: []
				}
			})
		});

		// Click to expand the user
		const expandButton = await screen.findByRole("button", { name: /^expand user$/i });
		fireEvent.click(expandButton);

		// Remove device
		const removeDeviceButton = await screen.findByRole("button", { name: /^remove device$/i });
		fireEvent.click(removeDeviceButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/userssave", expect.objectContaining({
			body: expect.stringContaining(device.token)
		})));
	});
	
	it("adds role to a user", async () => {

		render(<UsersComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				user: {
					...user,
					roles: [role, newRole]
				}
			})
		});

		// Click to expand the user
		const expandButton = await screen.findByRole("button", { name: /^expand user$/i });
		fireEvent.click(expandButton);

		// Click to add a new member to the user
		const addRoleButton = await screen.findByRole("button", { name: /^add role$/i });
		fireEvent.click(addRoleButton);

		// Select the role to add
		const roleSelect = await screen.findByLabelText(/^new role$/i);
		fireEvent.change(roleSelect, { target: { value: newRole.id }});

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/userssave", expect.objectContaining({
			body: expect.stringContaining(newRole.id)
		})));
	});

	it("removes a role from a user", async () => {

		render(<UsersComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				user: {
					...user,
					roles: []
				}
			})
		});

		// Click to expand the user
		const expandButton = await screen.findByRole("button", { name: /^expand user$/i });
		fireEvent.click(expandButton);

		// Remove role
		const removeRoleButton = await screen.findByRole("button", { name: /^remove role$/i });
		fireEvent.click(removeRoleButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/userssave", expect.objectContaining({
			body: expect.stringContaining(role.id)
		})));
	});
	
});
