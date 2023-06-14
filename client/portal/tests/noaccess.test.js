/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import NoAccess from "../noaccess.jsx";

beforeEach(() => {
	global.fetch = jest.fn(() => Promise.resolve({
		ok: true,
		text: () => Promise.resolve()
	}));
	
	render(<NoAccess />);
});

afterEach(() => {
	jest.restoreAllMocks();
	cleanup();
});

describe("No access component", () => {

	it("Has the required elements", () => {
		expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
		expect(screen.getByText(/request access/i)).toBeInTheDocument();
	});

	it("Submits the request and gets a success response", async () => {
		const nameInput = screen.getByPlaceholderText(/name/i);
		const emailInput = screen.getByPlaceholderText(/email/i);
		const submit = screen.getByText(/request access/i);

		fireEvent.change(nameInput, { target: { value: "Test User" }});
		fireEvent.change(emailInput, { target: { value: "testuser@test.com" }});
		fireEvent.click(submit);

		const submitMessage = await screen.findByText(/your request has been forwarded to an administrator/i);
		expect(submitMessage).toBeInTheDocument();
	});

});