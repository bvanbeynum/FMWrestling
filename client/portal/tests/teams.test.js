/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Teams from "../teams.jsx";

describe("Users Component", () => {
	
	const team = {
		id: "team1",
		name: "Test Team",
		state: "TS",
		confrence: "99",
		program: "Test",
		externalTeams: [{ id: "externalid", name: "Test External Team" }]
	};

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				teams: [team],
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the component", async () => {

		render(<Teams />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/teamsload"));
		expect(await screen.findByTestId(team.id)).toBeInTheDocument();
		
	});

});
