/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamsComponent from "../teams.jsx";

describe("Teams Component", () => {
	
	const team = {
		id: "team1",
		name: "Test Team",
		state: "TS",
		confrence: "99",
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

		render(<TeamsComponent />);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/teamsload"));
		expect(await screen.findByTestId(team.id)).toBeInTheDocument();
		
	});

	it("adds a new team", async () => {

		const newTeamId = "saveid",
			name = "Test Save Team",
			confrence = "AA",
			state = "TS";

		render(<TeamsComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				team: {
					id: newTeamId,
					name: name,
					confrence: confrence,
					state: state,
					created: new Date()
				}
			})
		});

		const expandButton = await screen.findByRole("button", { name: /^add team$/i });
		fireEvent.click(expandButton);

		const nameInput = await screen.findByLabelText(/^team name$/i),
			confrenceInput = await screen.findByLabelText(/^team confrence$/i),
			stateInput = await screen.findByLabelText(/^team state$/i),
			addButton = await screen.findByRole("button", { name: /^save team$/i });

		fireEvent.change(nameInput, { target: { value: name }});
		fireEvent.change(confrenceInput, { target: { value: confrence }});
		fireEvent.change(stateInput, { target: { value: state }});
		fireEvent.click(addButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/teamssave", expect.objectContaining({
			body: expect.stringContaining(name)
		})));

		expect(await screen.findByTestId(newTeamId)).toBeInTheDocument();
	});

	it("edits a team", async () => {

		const newName = "New Team Name";

		render(<TeamsComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				team: {...team, name: newName }
			})
		});

		const expandButton = await screen.findByRole("button", { name: /^edit team$/i });
		fireEvent.click(expandButton);

		const nameInput = await screen.findByLabelText(/^team name$/i),
			saveButton = await screen.findByRole("button", { name: /^save team$/i });

		fireEvent.change(nameInput, { target: { value: newName }});
		fireEvent.click(saveButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/teamssave", expect.objectContaining({
			body: expect.stringContaining(newName)
		})));
	});

	it("deletes a team", async () => {

		render(<TeamsComponent />);
		
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({ status: "ok" })
		});
		
		const teamPanel = await screen.findByTestId(team.id);
		expect(teamPanel).toBeInTheDocument();

		const expandButton = await screen.findByRole("button", { name: /^edit team$/i });
		fireEvent.click(expandButton);

		// Click the delete button for the team
		const deleteButton = await screen.findByRole("button", { name: /^delete team$/i });
		fireEvent.click(deleteButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/teamssave", expect.objectContaining({
			body: expect.stringContaining(team.id)
		})));

		await waitFor(() => {
			const teamPanel = screen.queryByTestId(team.id);
			expect(teamPanel).toBeNull();
		});

	});

});
