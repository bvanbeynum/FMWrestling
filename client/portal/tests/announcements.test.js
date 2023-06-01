/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Announcements from "../announcements";

describe("Announcements component", () => {
	
	beforeEach(() => {
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<Announcements />);

		// ******** Then ****************

		expect(await screen.findByRole("textbox")).toBeInTheDocument();
		expect(await screen.findByText(/add post/i)).toBeInTheDocument();
	});

	it("creates a post", async () => {

		// ******** Given ***************
		
		render(<Announcements />);

		const contentBox = screen.getByPlaceholderText(/enter content/i),
			addButton = screen.getByText(/add post/i),
			postContent = "Test post",
			testId = "testid";

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				id: testId
			})
		});

		// ******** When ****************

		fireEvent.change(contentBox, { target: { value: postContent }});
		fireEvent.click(addButton);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/announcementsave", expect.objectContaining({ 
			body: expect.stringMatching(postContent)
		})));
	});

});