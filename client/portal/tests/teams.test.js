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

	it("filters external teams", async () => {

		const filterText = "fort", 
			externalTeams = [{
					id: "1",
					name: "Fort Mill",
					wrestlers: [],
					meets: []
				}, {
					id: "2",
					name: "Fort Other",
					wrestlers: [],
					meets: []
				}];

		render(<TeamsComponent />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				externalTeams: externalTeams
			})
		});

		const externalButton = await screen.findByRole("button", { name: /^external teams$/i });
		fireEvent.click(externalButton);

		const filterInput = await screen.findByLabelText(/^external filter$/i);
		fireEvent.change(filterInput, { target: { value: filterText }});

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/externalteamssearch?filter=${ filterText }`));
		
		expect(await screen.findByTestId(externalTeams[0].id)).toBeInTheDocument();
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

	it("adds an external team", async () => {

		const filterText = "test",
			newExternal = { id: "external2", name: "Test External", wrestlers: [], meets: [] };

		render(<TeamsComponent />);

		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({
					externalTeams: [newExternal]
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({
					team: {
						...team,
						externalTeams: team.externalTeams.concat(newExternal)
					}
				})
			});

		const externalButton = await screen.findByRole("button", { name: /^external teams$/i });
		fireEvent.click(externalButton);

		const filterInput = await screen.findByLabelText(/^external filter$/i);
		fireEvent.change(filterInput, { target: { value: filterText }});

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/externalteamssearch?filter=${ filterText }`));
		
		expect(await screen.findByTestId(newExternal.id)).toBeInTheDocument();

		// Click to add the external to the team
		const addButton = await screen.findByRole("button", { name: /^add external team$/i });
		fireEvent.click(addButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/teamssave", expect.objectContaining({
			body: expect.stringContaining(newExternal.id)
		})));

	});

	it("deletes a external team", async () => {

		render(<TeamsComponent />);

		global.fetch = jest.fn()
			.mockResolvedValue({
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({
					team: {
						...team,
						externalTeams: []
					}
				})
			});

		const externalButton = await screen.findByRole("button", { name: /^external teams$/i });
		fireEvent.click(externalButton);

		expect(await screen.findByTestId(team.externalTeams[0].id)).toBeInTheDocument();

		// Click to remove the external from the team
		const removeButton = await screen.findByRole("button", { name: /^delete external team$/i });
		fireEvent.click(removeButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/teamssave", expect.objectContaining({
			body: expect.stringContaining(team.externalTeams[0].id)
		})));

		await waitFor(() => {	
			const externalPill = screen.queryByTestId(team.externalTeams[0].id);
			expect(externalPill).toBeNull();
		});

	});

});
