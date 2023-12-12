/**
 * @jest-environment jsdom
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DualComponent from "../dual.jsx";

describe("Dual component", () => {

	const event = {
			id: "testid",
			name: "Event test name",
			date: new Date(new Date().setHours(0,0,0,0)).toISOString(),
			location: "Test location"
		},
		loggedInUser = { id: "user1", privileges: ["scheduleManage"] };

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				event: event,
				loggedInUser: loggedInUser
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

		render(<DualComponent />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/dualload?id=${ event.id }`));

		expect(await screen.findByText(event.name)).toBeInTheDocument();
		expect(await screen.findByTestId(floEvents[0].id)).toBeInTheDocument();
		
	});

});
