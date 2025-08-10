/**
 * @jest-environment jsdom
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Schedule from "../schedule.jsx";

describe("Schedule component", () => {

	const events = [{
			id: "testid",
			name: "Event test name",
			date: new Date(new Date().setHours(0,0,0,0)).toISOString(),
			location: "Test location"
		}],
		floEvents = [{
			id: "flo1",
			name: "Flo Event",
			date: new Date(new Date().setHours(0,0,0,0)).toISOString(),
			location: "testing"
		}],
		trackEvents = [{
			id: "track1",
			name: "Track event",
			date: new Date()
		}],
		loggedInUser = { id: "user1", privileges: ["scheduleView", "scheduleManage"] };

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				events: events,
				floEvents: floEvents,
				trackEvents: trackEvents,
				loggedInUser: loggedInUser
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the components", async () => {

		const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
			endDate = new Date(startDate.getFullYear(), startDate.getMonth(), new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate());

		// ******** Given ***************

		// ******** When ****************

		render(<Schedule />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/scheduleload?startdate=${ startDate.toLocaleDateString() }&enddate=${ endDate.toLocaleDateString() }`));

		expect(await screen.findByText(new RegExp(new Date().toLocaleDateString("en-us", { month: "long" }), "i"))).toBeInTheDocument();

		expect(await screen.findByTestId(events[0].id)).toBeInTheDocument();
		expect(await screen.findByTestId(floEvents[0].id)).toBeInTheDocument();
	});

	it("changes the month", async () => {

		// ******** Given ***************

		render(<Schedule />);

		const nextMonthButton = await screen.findByRole("button", { name: "▶" }),
			nextMonth = new Date(new Date().setMonth((new Date().getMonth() + 1) % 12)),
			nextMonthLookup = new RegExp(nextMonth.toLocaleDateString("en-us", { month: "long" }), "i"),
			filteredEvents = [{ id: "flo1", date: nextMonth } ],
			startDate = new Date(nextMonth.getFullYear(),nextMonth.getMonth(),1),
			endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate());

		global.fetch = jest.fn()
			.mockResolvedValue({
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({
					events: [],
					floEvents: filteredEvents,
					trackEvents: []
				})
			});

		// ******** When ****************

		fireEvent.click(nextMonthButton);

		// ******** Then ****************

		expect(await screen.findByText(nextMonthLookup)).toBeInTheDocument();
		
		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/scheduleload?startdate=${ startDate.toLocaleDateString() }&enddate=${ endDate.toLocaleDateString() }`));
		expect(await screen.findByTestId(filteredEvents[0].id)).toBeInTheDocument();

	});

});