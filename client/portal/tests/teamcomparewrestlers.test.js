/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamCompareWrestlersComponent from "../teamcomparewrestlers.jsx";

describe("Team Compare Wrestlers Component", () => {

	const teamId = "team1",
		opponents = [{ id: "team2", name: "Team 2", wrestlers: [{ id: "wrestler2", firstName: "Test", lastName: "Wrestler 2", division: "Varsity", weightClass: "106" }] }];

	it("renders the component", async () => {

		render(<TeamCompareWrestlersComponent 
			opponents={ opponents }
			teamId={ teamId }
			selectedOpponentId={ null }
			setSelectedOpponentId={ () => {} }
			/>);
		expect(await screen.findByText(team.name)).toBeInTheDocument();

	});

});