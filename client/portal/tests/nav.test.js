/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Nav from "../nav.jsx";

describe("Index component", () => {
	
	beforeEach(() => {
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<Nav />);

		// ******** Then ****************

		expect(await screen.findByText(/Home/i)).toBeInTheDocument();
	});

});