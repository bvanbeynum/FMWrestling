/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import RequestsComponent from "../requests.jsx";

describe("Requests component", () => {

	const requests = [{
			id: "testid",
			name: "Test User",
			email: "test@nomail.com",
			device: {
				ip: "134.252.22.65",
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
			created: new Date(new Date(Date.now()).setDate(new Date().getDate() - 10))
		}],
		users = [{
			id: "testuserid",
			firstName: "Test",
			lastName: "User",
			email: "test@nomail.com"
		}];

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				deviceRequests: requests,
				users: users
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<RequestsComponent />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/requestsload"));
		
		expect(await screen.findByTestId(requests[0].id)).toBeInTheDocument();
	});

	it("edits a request", async () => {

		// ******** Given ***************

		const testId = "testaddid",
			firstName = "Test",
			lastName = "User",
			email = "test@nomail.com";

		render(<RequestsComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				id: testId
			})
		});

		const requestPanel = await screen.findByTestId(requests[0].id),
			editButton = await screen.findByRole("button", { name: /edit/i });

		fireEvent.click(editButton);

		const userSelect = await screen.findByLabelText(/user/i);
		fireEvent.change(userSelect, { target: { value: "new" }});

		const firstInput = await screen.findByLabelText(/first name/i),
			lastInput = await screen.findByLabelText(/last name/i),
			emailInput = await screen.findByLabelText(/email/i),
			submitButton = await screen.findByRole("button", { name: /save/i });

		fireEvent.change(firstInput, { target: { value: firstName }});
		fireEvent.change(lastInput, { target: { value: lastName }});
		fireEvent.change(emailInput, { target: { value: email }});

		// ******** When ****************

		fireEvent.click(submitButton);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/requestssave", expect.objectContaining({ 
			body: expect.stringMatching(email)
		})));

		// expect(requestPanel).not.toBeInTheDocument();
		expect(await screen.findByTestId(requests[0].id)).not.toBeInTheDocument();
	});

	it("deletes request", async () => {

		// ******** Given ***************

		render(<RequestsComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				status: "ok"
			})
		});

		const editButton = await screen.findByRole("button", { name: /edit/i });
			
		fireEvent.click(editButton);

		const deleteButton = await screen.findByRole("button", { name: /delete/i });

		// ******** When ****************

		fireEvent.click(deleteButton);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/requestssave", expect.objectContaining({ 
			body: expect.stringContaining(requests[0].id)
		})));

		expect(await screen.findByTestId(requests[0].id)).not.toBeInTheDocument();
	});

});