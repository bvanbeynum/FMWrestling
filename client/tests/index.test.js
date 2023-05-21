/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Index from "../src/index.jsx";

beforeAll(() => {
	
});

describe("Index component", () => {

	it("Initializes the components", () => {
		render(<Index />);

		expect(screen.getByAltText("Fort Mill Wrestling" )).toBeInTheDocument();
	});

})