/**
 * @jest-environment jsdom
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import WrestlerSearchComponent from "../wrestlersearch.jsx";

describe("Wrestler Search Component", () => {

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

	it("initializes the component", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<WrestlerSearchComponent />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/wrestlersearchload`));

	});

});