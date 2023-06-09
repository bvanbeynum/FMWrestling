/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Roles from "../roles.jsx";

describe("Roles component", () => {

	const roles = [{
		id: "testid",
		name: "Test Role",
		users: [{ id: "testuserid", firstName: "Test", lastName: "User" }],
		privileges: [{ id: "testprivilegeid", name: "Test Privilege" }],
		created: new Date(new Date(Date.now()).setDate(new Date().getDate() - 10)),
		modified: new Date(new Date(Date.now()).setDate(new Date().getDate() - 5)),
	}],
	testId = "addedtestid";

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				roles: roles
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<Roles />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/rolesload"));
		
		expect(await screen.findByText(/new role/i)).toBeInTheDocument();
		expect(await screen.findByTestId(roles[0].id)).toBeInTheDocument();
	});

});