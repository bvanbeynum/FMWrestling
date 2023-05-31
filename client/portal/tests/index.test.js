/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Index from "../index.jsx";

describe("Index component", () => {
	
	beforeEach(() => {
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<Index />);

		// ******** Then ****************

		expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
		expect(await screen.findByText(/home/i)).toBeInTheDocument();
	});

	it("navigates to announcements", async () => {

		// ******** Given ***************

		render(<Index />);

		const announceButton = await screen.findByText(/announcements/i);

		// ******** When ****************
		
		fireEvent.click(announceButton);

		// ******** Then ****************

		expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/announcements/i);
	});

});