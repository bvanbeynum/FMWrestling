/**
 * @jest-environment jsdom
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Schedule from "../schedule.jsx";

describe("Schedule component", () => {

	const mockEvents = [{
			id: "testid",
			name: "Tuesday Night Dual vs. Fort Mill",
			date: new Date().toISOString(),
			location: "Test location",
			eventSystem: null
		},
		{
			id: "flo1",
			name: "Flo Tournament",
			date: new Date().toISOString(),
			location: "testing",
			eventSystem: "flo"
		},
		{
			id: "track1",
			name: "Track event",
			date: new Date().toISOString(),
			eventSystem: "track"
		}];

	const mockTeamEvents = [{
			id: "teamevent1",
			name: "Varsity Rebel Rumble",
			date: new Date().toISOString(),
			location: "Byrnes High School",
			division: "Varsity"
		},
		{
			id: "teamevent2",
			name: "JV Rebel Rumble",
			date: new Date().toISOString(),
			location: "Byrnes High School",
			division: "JV"
		}];

	const mockLoggedInUser = { id: "user1", privileges: ["scheduleView", "scheduleManage"] };

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				events: mockEvents,
				teamEvents: mockTeamEvents,
				loggedInUser: mockLoggedInUser
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the components in Team View and loads schedule data", async () => {
		render(<Schedule />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/scheduleload")));

		expect(await screen.findByRole("heading", { name: "SCHEDULE" })).toBeInTheDocument();
		expect(await screen.findByText("Varsity Rebel Rumble")).toBeInTheDocument();
		expect(await screen.findByText("JV Rebel Rumble")).toBeInTheDocument();
	});

	it("switches to All View and filters events by event type", async () => {
		render(<Schedule />);

		// Switch to All view via the bottom nav tab
		const allTabNavItem = screen.getByText("All");
		fireEvent.click(allTabNavItem);

		// Now general events should be visible
		await screen.findByTestId(mockEvents[0].id);

		const typeSelect = screen.getByLabelText("Filter Event Type");
		fireEvent.change(typeSelect, { target: { value: "Dual" } });

		expect(screen.getByTestId(mockEvents[0].id)).toBeInTheDocument();
		expect(screen.queryByTestId(mockEvents[1].id)).not.toBeInTheDocument();
		expect(screen.queryByTestId(mockEvents[2].id)).not.toBeInTheDocument();
	});

	it("filters team events by division in Team View", async () => {
		render(<Schedule />);

		await screen.findByText("Varsity Rebel Rumble");
		expect(screen.getByText("JV Rebel Rumble")).toBeInTheDocument();

		const divisionSelect = screen.getByLabelText("Filter Division");
		fireEvent.change(divisionSelect, { target: { value: "Varsity" } });

		expect(screen.getByText("Varsity Rebel Rumble")).toBeInTheDocument();
		expect(screen.queryByText("JV Rebel Rumble")).not.toBeInTheDocument();
	});

});