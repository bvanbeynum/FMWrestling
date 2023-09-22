/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamViewComponent from "../teamview.jsx";

describe("Flo Event Component", () => {
	
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
		(await waitFor(() => expect(screen.getByTestId(team.wrestlers[0].id)))).toBeInTheDocument();
		
	});

	it("adds a new wrestler", async () => {

		const newWrestler = {
			id: "savewrestler",
			firstName: "Test",
			lastName: "Wrestler",
			division: "Varsity",
			weightClass: "111"
		}
		
		await waitFor(() => {
			render(<TeamViewComponent />);
		});

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/teamviewload?id=${ team.id }`));
		await waitFor(() => expect(screen.getByText(team.name)).toBeInTheDocument());
		
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				wrestler: newWrestler
			})
		});

		const addButton = await screen.findByRole("button", { name: /^add wrestler$/i });
		fireEvent.click(addButton);

		const firstNameInput = await screen.findByLabelText(/^first name$/i),
			lastNameInput = await screen.findByLabelText(/^last name$/i),
			divisionInput = await screen.findByLabelText(/^wrestler division$/i),
			weightClassInput = await screen.findByLabelText(/^wrestler weight class$/i),
			saveButton = await screen.findByRole("button", { name: /^save$/i });

		fireEvent.change(firstNameInput, { target: { value: newWrestler.firstName }});
		fireEvent.change(lastNameInput, { target: { value: newWrestler.lastName }});
		fireEvent.change(divisionInput, { target: { value: newWrestler.division }});
		fireEvent.change(weightClassInput, { target: { value: newWrestler.weightClass }});

		fireEvent.click(saveButton);

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/teamswrestlersave?teamid=${ team.id }`, expect.objectContaining({
			body: expect.stringContaining(newWrestler.firstName)
		})));
		expect(await screen.findByTestId(newWrestler.id)).toBeInTheDocument();

	});

});
