/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import FloEventComponent from "../floevent.jsx";

describe("Flo Event Component", () => {
	
	const floEvent = { 
			id: "test1", 
			name: "Test Event", 
			sqlId: 1234, 
			divisions: [{
				name: "division 1",
				weightClasses: [{
					name: "111",
					pools: [{
						matches: [{
							matchNumber: "1",
							round: "2",
							mat: "2",
							topWrestler: { name: "Wrestler 1", team: "Team 1", isWinner: true },
							bottomWrestler: { name: "Wrestler 2", team: "Team 2" },
							winType: "Dec"
						}]
					}]
				}]
			}],
			updates: [{
				dateTime: new Date(new Date(Date.now()).setMinutes(new Date().getMinutes() - 10)),
				updates: [
					{ updateType: "New Match", division: "division 1", weightClass: "106", round: "Round 1", teams: ["Team 1", "Team 2"], message: "Match 1: Wrestler 1 (Team 1) vs Wrestler 2 (Team 2)" },
					{ updateType: "Match Completed", division: "division 1", weightClass: "106", round: "Round 1", teams: ["Team 1", "Team 2"], message: "Wrestler 1 (Team 1) beat Wrestler 2 (Team 2) by Dec" }
				]
			}]
		},
		loggedInUser = {
			id: "user`",
			firstName: "Test",
			lastName: "User",
			devices: [],
			roles: [],
			created: new Date()
		};

	beforeEach(() => {
		jest.spyOn(URLSearchParams.prototype, "get").mockImplementation(key => floEvent.id);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				floEvent: floEvent,
				loggedInUser: loggedInUser
			})
		});

		jest.useFakeTimers();
	});

	it("initializes the component", async () => {

		await waitFor(() => {
			render(<FloEventComponent />);
		});

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/floeventload?id=${ floEvent.id }`));
		
	});

});
