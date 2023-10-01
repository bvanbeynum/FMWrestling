/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamViewComponent from "../teamview.jsx";

describe("Team View Component", () => {
	
	const team = { 
			id: "teamid",
			name: "Test Team",
			wrestlers: [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler", division: "Varsity" }]
		},
		loggedInUser = {
			id: "user`",
			firstName: "Test",
			lastName: "User",
			privileges: ["teamManage", "teamView"],
			created: new Date()
		};

	beforeEach(() => {
		jest.spyOn(URLSearchParams.prototype, "get").mockImplementation(key => team.id);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				team: team,
				loggedInUser: loggedInUser
			})
		});
		
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the component", async () => {

		await waitFor(() => {
			render(<TeamViewComponent />);
		});

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/teamviewload?id=${ team.id }`));
		await waitFor(() => expect(screen.getByText(team.name)).toBeInTheDocument());
		
	});

});
