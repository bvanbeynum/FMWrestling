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
			name: "Tuesday Night Dual vs. Fort Mill",
			date: new Date().toISOString(),
			location: "Test location",
			eventSystem: null
		}],
		floEvents = [{
			id: "flo1",
			name: "Flo Tournament",
			date: new Date().toISOString(),
			location: "testing",
			eventSystem: "flo"
		}],
		trackEvents = [{
			id: "track1",
			name: "Track event",
			date: new Date().toISOString(),
			eventSystem: "track"
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

	it("initializes the components and loads schedule data", async () => {
		render(<Schedule />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/scheduleload`));

		expect(await screen.findByRole("heading", { name: "Schedule" })).toBeInTheDocument();
		expect(await screen.findByTestId(events[0].id)).toBeInTheDocument();
		expect(await screen.findByTestId(floEvents[0].id)).toBeInTheDocument();
	});

	it("filters events by event type", async () => {
		render(<Schedule />);

		await screen.findByTestId(events[0].id);

		const typeSelect = screen.getByLabelText("Filter Event Type");
		fireEvent.change(typeSelect, { target: { value: "Dual" } });

		expect(screen.getByTestId(events[0].id)).toBeInTheDocument();
		expect(screen.queryByTestId(floEvents[0].id)).not.toBeInTheDocument();
	});

});