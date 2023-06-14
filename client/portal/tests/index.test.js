/**
 * @jest-environment jsdom
 */

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Index from "../index.jsx";

describe("Index component", () => {
	
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({ })
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

		expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
		expect(await screen.findByText(/home/i)).toBeInTheDocument();
	});

});