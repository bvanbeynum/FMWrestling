/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamCompareComponent from "../teamcompare.jsx";

describe("Team Compare Component", () => {

	const team = { id: "team1", name: "Team 1", wrestlers: [{ id: "wrestler1", firstName: "Test", lastName: "Wrestler 1", division: "Varsity", weightClass: "106" }] },
		opponents = [{ id: "team2", name: "Team 2", wrestlers: [{ id: "wrestler2", firstName: "Test", lastName: "Wrestler 2", division: "Varsity", weightClass: "106" }] }],
		divisions = ["Varsity"];

	it("renders the component", async () => {

		render(<TeamCompareComponent 
			team={ team }
			opponents={ opponents }
			compareData={ null }
			saveCompareData={ () => {} }
			selectedDivision={ divisions[0] } 
			setSelectedDivision={ () => {} } 
			divisions={ divisions }
			/>);
		expect(await screen.findByText(team.name)).toBeInTheDocument();

	});

});
