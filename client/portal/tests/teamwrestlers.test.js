/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamWrestlersComponent from "../teamwrestlers.jsx";

describe("Team Wrestler Component", () => {

	const wrestlers = [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler", division: "Varsity", weightClass: "111", position: 1 }];

	const updateWrestlers = wrestlers => {};
	const addWrestler = wrestler => {};

	it("Initializes the component", async () => {

		render(<TeamWrestlersComponent wrestlers={ wrestlers } updateWrestlers={ updateWrestlers } addWrestler={ addWrestler } savingError={ "" } />)
		expect(screen.getByTestId(wrestlers[0].id)).toBeInTheDocument();

	});

	it("adds a new wrestler", async () => {

		const newWrestler = {
			id: "savewrestler",
			firstName: "Test",
			lastName: "Wrestler",
			division: "Varsity",
			weightClass: "111",
			position: 2
		};
		
		const {rerender} = render(<TeamWrestlersComponent wrestlers={ wrestlers } updateWrestlers={ updateWrestlers } addWrestler={ addWrestler } savingError={ "" } />);

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

		rerender(<TeamWrestlersComponent wrestlers={ wrestlers.concat(newWrestler) } updateWrestlers={ updateWrestlers } addWrestler={ addWrestler } savingError={ "" } />)
		
		expect(await screen.findByTestId(newWrestler.id)).toBeInTheDocument();

	});

});
