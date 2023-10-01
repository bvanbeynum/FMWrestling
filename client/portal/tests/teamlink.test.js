/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamLinkComponent from "../teamlink.jsx";

describe("Team Externals Component", () => {

	const scmatTeams = [{ id: "mat1", name: "Test Team", rankings: [], wrestlers: [] }],
		floTeams = [{ id: "flo1", name: "Test Team", events: [], wrestlers: [] }]

	beforeEach(() => {
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});
	
	it("renders the component", () => {

		render(<TeamLinkComponent 
			scmatTeams={ scmatTeams } 
			floTeams={ floTeams }
			linkFlo={ () => {} }
			unlinkFlo={ () => {} }
			linkSCMat={ () => {} }
			unlinkSCMat={ () => {} } />);

	});

	it("searches flo teams", async () => {

		const searchTerm = "test",
			searchTeams = [
				{ id: "team1", name: "Test Team", wrestlers: [], events: [] },
				{ id: "team2", name: "Testing Team", wrestlers: [{ id: "wrestler1", name: "Test Wrestler" }], events: [{ id: "event1", name: "Test Event", date: new Date(2023, 8, 29)}] }
			]

		render(<TeamLinkComponent 
			scmatTeams={ scmatTeams } 
			floTeams={ floTeams }
			linkFlo={ () => {} }
			unlinkFlo={ () => {} }
			linkSCMat={ () => {} }
			unlinkSCMat={ () => {} } />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				floTeams: searchTeams
			})
		});

		const searchInput = await screen.findByLabelText(/^search teams$/i),
			searchButton = await screen.findByRole("button", { name: /^search$/i });

		fireEvent.change(searchInput, { target: { value: searchTerm } });
		fireEvent.click(searchButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/externalteamssearch?name=${ searchTerm }`));

		expect(await screen.findByTestId(searchTeams[0].id)).toBeInTheDocument();

	});

});
