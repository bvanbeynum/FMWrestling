/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Teams from "../teams.jsx";

describe("Users Component", () => {
	
	beforeEach(() => {
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the component", async () => {

		render(<Teams />);

		expect(await screen.findAllByText(/^teams$/i)).toHaveLength(2);
	});

});
