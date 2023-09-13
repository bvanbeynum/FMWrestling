/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Nav from "../nav.jsx";

describe("Index component", () => {

	const user = {
		id: "user1",
		firstName: "Test",
		lastName: "User",
		privileges: ["userAdmin"]
	};
	
	beforeEach(() => {
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<Nav loggedInUser={ user } />);

		// ******** Then ****************

		expect(await screen.findByRole("heading")).toHaveTextContent(user.lastName);
		
		await waitFor(() => {
			const teamsNav = screen.queryByRole("button", { name: /^team management$/i }),
				userNav = screen.queryByRole("button", { name: /^user management$/i });
			
			expect(userNav).toBeInTheDocument();
			expect(teamsNav).toBeNull();
		});
	});

});