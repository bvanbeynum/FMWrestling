/**
 * @jest-environment jsdom
 */

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Index from "../index.jsx";

describe("Index component", () => {

	const userGlobal = { id: "user1", firstName: "Test", lastName: "User", privileges: [{ id: "priv1", token: "userAdmin" }]};
	
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				loggedInUser: userGlobal
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

		render(<Index />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/homeload"));

		expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
		expect(await screen.findByText(/home/i)).toBeInTheDocument();
		
	});

});