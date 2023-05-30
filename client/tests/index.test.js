/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Index from "../src/index.jsx";

describe("Index component", () => {
	
	beforeEach(() => {
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("Initializes the components", async () => {

		// ******** Given ***************

		const posts = [{ date: new Date(2021,2,8), post: "Reminder... Varsity and JV yearbook  pictures will be done Wednesday morning, March 10th at 8:15. Wrestlers should bring ALL gear to be turned in." }],
			images = ["/media/instagram/2023-02-07_23-42-13_UTC.jpg", "/media/instagram/2023-02-23_23-29-48_UTC.jpg"];

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				posts: posts,
				images: images
			})
		});

		// ******** When ****************

		render(<Index />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/indexload"));
		expect(await screen.findByText(/fort mill wrestling/i)).toBeInTheDocument();
		expect(await screen.findByText(new RegExp(posts[0].post.substring(0, 20)))).toBeInTheDocument();
		expect(document.querySelector(`img[src="${ images[0] }"]`)).toBeInTheDocument();
		
		await waitFor(() => expect(document.querySelector(`img[src="${ images[1] }"]`)).toBeInTheDocument(), { timeout: 5000});
	});

});