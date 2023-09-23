/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamLinkComponent from "../teamlink.jsx";

describe("Team Externals Component", () => {

	it("renders the component", () => {

		render(<TeamLinkComponent />);

	});

});
