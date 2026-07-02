/**
 * @jest-environment jsdom
 */

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TournamentSummary from "../tournamentsummary.jsx";

describe("TournamentSummary component", () => {
	const mockEvent = {
		id: "event123",
		sqlId: 1045,
		name: "Palmetto State Classic",
		date: "2026-01-15T00:00:00.000Z",
		endDate: "2026-01-15T00:00:00.000Z",
		location: "Columbia, SC",
		summaryStats: {
			totalMatches: 450,
			averageGlicko: 1545.2,
			upsetPercentage: 14.2,
			bonusPointPercentage: 52.8
		},
		matches: [
			{
				matchSqlId: 558902,
				weightClass: "138",
				roundName: "Quarter-Finals",
				winType: "F",
				isUpset: true,
				winner: {
					wrestlerSqlId: 88492,
					name: "Leo Thompson",
					team: "Fort Mill",
					rating: 1420.5,
					deviation: 65.2
				},
				loser: {
					wrestlerSqlId: 11203,
					name: "Marcus Wright",
					team: "Catawba Ridge",
					rating: 1650.0,
					deviation: 35.1
				}
			}
		]
	};

	const loggedInUser = { id: "user1", privileges: ["scheduleView"] };

	beforeEach(() => {
		// Mock window.location.search to return ?id=event123
		delete window.location;
		window.location = new URL("http://localhost/portal/tournamentsummary.html?id=event123");

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				event: mockEvent,
				loggedInUser: loggedInUser
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes and displays event header and KPI card metrics", async () => {
		render(<TournamentSummary />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/eventdetailsload?id=event123"));

		// Verify event title
		expect(await screen.findByRole("heading", { name: "Palmetto State Classic" })).toBeInTheDocument();

		// Verify KPI numeric content
		expect(screen.getByText("450")).toBeInTheDocument();
		expect(screen.getByText("1545.2")).toBeInTheDocument();
		expect(screen.getByText("14.2%")).toBeInTheDocument();
		expect(screen.getByText("52.8%")).toBeInTheDocument();
	});

	it("verifies scatter plot rendering for upsets", async () => {
		render(<TournamentSummary />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalled());

		// Verify "The Upset Radar" heading
		expect(screen.getByRole("heading", { name: "The Upset Radar" })).toBeInTheDocument();

		// Verify presence of elements (SVG container and differential chart details)
		const diffText = screen.getByText("Upset Differential");
		expect(diffText).toBeInTheDocument();
	});

	it("verifies box plot rendering for weight spread", async () => {
		render(<TournamentSummary />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalled());

		// Verify Weight Class list labels
		expect(screen.getByText("138 lbs")).toBeInTheDocument();
		expect(screen.getByText("1650")).toBeInTheDocument(); // Median text value overlay
	});

	it("verifies team matrix wins tally", async () => {
		render(<TournamentSummary />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalled());

		// Verify Team vs Weight Class list
		expect(screen.getByText("Team Name")).toBeInTheDocument();
		expect(screen.getByText("Fort Mill")).toBeInTheDocument();
	});
});
