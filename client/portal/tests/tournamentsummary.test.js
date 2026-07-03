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
		familiarTeams: ["Fort Mill", "Catawba Ridge"],
		matches: [
			{
				matchSqlId: 558902,
				weightClass: "138",
				roundName: "Quarter-Finals",
				winType: "F",
				isUpset: true,
				division: "Varsity",
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

		// Verify KPI numeric content for Varsity division
		expect(screen.getByText("DIVISIONS")).toBeInTheDocument();
		expect(screen.getByText("WT CLASSES")).toBeInTheDocument();
		expect(screen.getByText("TEAMS")).toBeInTheDocument();
		expect(screen.getByText("WRESTLERS")).toBeInTheDocument();
	});

	it("verifies tournament intensity curve rendering", async () => {
		render(<TournamentSummary />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalled());

		// Verify "Tournament Intensity" heading
		expect(screen.getByRole("heading", { name: "Tournament Intensity" })).toBeInTheDocument();

		// Verify presence of Average Glicko metric (avg of 1420.5 and 1650 is 1535.25, rounded to 1535)
		expect(screen.getByText("1535")).toBeInTheDocument();
		expect(screen.getByText("AVG GLICKO")).toBeInTheDocument();
	});

	it("verifies insights section rendering for upsets", async () => {
		render(<TournamentSummary />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalled());

		// Verify "Insights" heading
		expect(screen.getByRole("heading", { name: "Insights" })).toBeInTheDocument();

		// Verify Upset details
		expect(screen.getByText("MAJOR UPSET")).toBeInTheDocument();
		expect(screen.getByText("W: Leo Thompson")).toBeInTheDocument();
		expect(screen.getByText("Marcus Wright")).toBeInTheDocument();
	});

	it("verifies familiar faces section rendering", async () => {
		render(<TournamentSummary />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalled());

		// Verify "Familiar Faces" heading
		expect(screen.getByRole("heading", { name: "Familiar Faces" })).toBeInTheDocument();

		// Verify presence of school names
		expect(screen.getByText("Fort Mill")).toBeInTheDocument();
		expect(screen.getByText("Catawba Ridge")).toBeInTheDocument();
	});

	it("verifies division dropdown behavior based on division count", async () => {
		// Mock with 1 division (Varsity)
		const { rerender } = render(<TournamentSummary />);
		await waitFor(() => expect(global.fetch).toHaveBeenCalled());
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

		// Rerender with multiple divisions
		const mockEventMultiDivs = {
			...mockEvent,
			matches: [
				...mockEvent.matches,
				{
					...mockEvent.matches[0],
					matchSqlId: 999999,
					division: "JV"
				}
			]
		};
		global.fetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				event: mockEventMultiDivs,
				loggedInUser: loggedInUser
			})
		});

		rerender(<TournamentSummary />);
		await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());
	});
});
