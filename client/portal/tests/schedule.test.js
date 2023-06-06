/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Schedule from "../schedule.jsx";

describe("Schedule component", () => {

	const events = [{
		id: "testid",
		name: "Event test name",
		date: new Date(new Date().setHours(0,0,0,0)).toISOString(),
		location: "Test location"
	}];

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				events: events
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<Schedule />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/scheduleload"));
		
		expect(await screen.findByText(new RegExp(new Date().toLocaleDateString("en-us", { month: "long" }), "i"))).toBeInTheDocument();
		expect(await screen.findByText(new Date(events[0].date).getDate(), { selector: "li" })).toHaveClass("dayEvent");
	});

	it("changes the month", async () => {

		// ******** Given ***************

		render(<Schedule />);

		const nextMonthButton = await screen.findByRole("button", { name: "▶" }),
			nextMonth = new Date(new Date().setMonth((new Date().getMonth() + 1) % 12));

		// ******** When ****************

		fireEvent.click(nextMonthButton);

		// ******** Then ****************

		expect(await screen.findByText(new RegExp(nextMonth.toLocaleDateString("en-us", { month: "long" }), "i"))).toBeInTheDocument();
	});

});