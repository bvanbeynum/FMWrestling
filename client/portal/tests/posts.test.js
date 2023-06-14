/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Posts from "../posts.jsx";

describe("Posts component", () => {
	
	const posts = [{
		id: "initialpostid",
		expires: new Date(new Date(Date.now()).setDate(new Date().getDate() + 5)),
		created: new Date(new Date(Date.now()).setDate(new Date().getDate() - 10)),
		modified: new Date(new Date(Date.now()).setDate(new Date().getDate() - 5)),
		content: "Sample post" 
	}],
	testId = "addedpostid";

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				posts: posts
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		// ******** When ****************

		render(<Posts />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/postload"));

		expect(await screen.findByRole("textbox")).toBeInTheDocument();
		expect(await screen.findByText(/add/i)).toBeInTheDocument();

		expect(await screen.findByText(posts[0].content)).toBeInTheDocument();

		const post = await screen.findByTestId(posts[0].id);
		const options = await within(post).findAllByRole("option");

		expect(options.length).toBe(3);
	});

	it("creates a post", async () => {

		// ******** Given ***************
		
		render(<Posts />);

		const contentBox = screen.getByPlaceholderText(/enter content/i),
			addButton = screen.getByText(/add/i),
			postContent = "Test post";

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				post: { 
					id: testId,
					content: postContent,
					expires: null,
					created: new Date()
				}
			})
		});

		// ******** When ****************

		fireEvent.change(contentBox, { target: { value: postContent }});
		fireEvent.click(addButton);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/postsave", expect.objectContaining({ 
			body: expect.stringMatching(postContent)
		})));

		expect(await screen.findByTestId(testId)).toBeInTheDocument();
	});

	it("edits a post", async () => {

		// ******** Given ***************

		const postUpdate = "Updated Content";

		render(<Posts />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				post: {
					...posts[0],
					contents: postUpdate
				}
			})
		});

		const post = await screen.findByTestId(posts[0].id);
		const postInput = post.querySelector("textarea");
		const submitButton = within(post).getByText(/save/i);

		// ******** When ****************
		
		fireEvent.change(postInput, { target: { value: postUpdate }});
		fireEvent.click(submitButton);
		
		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/postsave", expect.objectContaining({ 
			body: expect.stringMatching(postUpdate)
		})));

	});

	it("deletes a post", async () => {

		// ******** Given ***************

		render(<Posts />);

		const post = await screen.findByTestId(posts[0].id);
		const deleteButton = within(post).getByText(/delete/i)

		// ******** When ****************
		
		fireEvent.click(deleteButton);
		
		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(`/api/postsave`, expect.objectContaining({ 
			body: expect.stringContaining(posts[0].id)
		})));
		expect(await screen.findByTestId(posts[0].id)).not.toBeInTheDocument();

	});

});