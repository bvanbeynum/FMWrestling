/**
 * @jest-environment jsdom
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Schedule from "../schedule.jsx";

describe("Schedule component", () => {

	const events = [{
		id: "testid",
		name: "Event test name",
		date: new Date(new Date().setHours(0,0,0,0)).toISOString(),
		location: "Test location"
	}];

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				events: events
			})
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		cleanup();
	});

	it("initializes the components", async () => {

		// ******** Given ***************

		const monthLookup = null,
			dateLookup = new Date(events[0].date).getDate();

		// ******** When ****************

		render(<Schedule />);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/scheduleload"));

		expect(await screen.findByText(new RegExp(new Date().toLocaleDateString("en-us", { month: "long" }), "i"))).toBeInTheDocument();
		const dateListItem = await screen.findByText(dateLookup, { selector: "li" });

		expect(await screen.findByTestId(events[0].id)).toBeInTheDocument();
	});

	it("changes the month", async () => {

		// ******** Given ***************

		render(<Schedule />);

		const nextMonthButton = await screen.findByRole("button", { name: "▶" }),
			nextMonth = new Date(new Date().setMonth((new Date().getMonth() + 1) % 12)),
			nextMonthLookup = new RegExp(nextMonth.toLocaleDateString("en-us", { month: "long" }), "i");

		// ******** When ****************

		fireEvent.click(nextMonthButton);

		// ******** Then ****************

		expect(await screen.findByText(nextMonthLookup)).toBeInTheDocument();
	});

	it("sets edit mode", async () => {

		// ******** Given ***************

		const newDate = new Date(new Date().setDate(new Date().getDate() + 5)),
			newName = "Name Test",
			newLocation = "Location Test";

		render(<Schedule />);

		const addButton = await screen.findByRole("button", { name: /add/i });
		fireEvent.click(addButton);
		
		expect(await screen.findByLabelText("name")).toBeInTheDocument();

		const dateInput = await screen.findByLabelText("date"),
			nameInput = await screen.findByLabelText("name"),
			locationInput = await screen.findByLabelText("location");

		// ******** When ****************

		fireEvent.change(dateInput, { target: { value: newDate.toLocaleDateString("fr-ca") }});
		fireEvent.change(nameInput, { target: { value: newName }});
		fireEvent.change(locationInput, { target: { value: newLocation}})

		// ******** Then ****************

		expect(dateInput.value).toBe(newDate.toLocaleDateString("fr-ca"));
		expect(nameInput.value).toBe(newName);
		expect(locationInput.value).toBe(newLocation);
	});

	it("adds new item", async () => {

		// ******** Given ***************

		const testId = "testeventid",
			newDate = new Date(new Date().setDate(new Date().getDate())),
			newName = "Name Test",
			newLocation = "Location Test";

		render(<Schedule />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				event: { 
					id: testId,
					name: newName,
					date: newDate,
					location: newLocation,
					created: new Date()
				}
			})
		});

		const addButton = await screen.findByRole("button", { name: /add/i });
		fireEvent.click(addButton);

		const dateInput = await screen.findByLabelText("date"),
			nameInput = await screen.findByLabelText("name"),
			locationInput = await screen.findByLabelText("location"),
			saveButton = await screen.findByRole("button", { name: /save/i });

		// ******** When ****************

		fireEvent.change(dateInput, { target: { value: newDate.toLocaleDateString("fr-ca") }});
		fireEvent.change(nameInput, { target: { value: newName }});
		fireEvent.change(locationInput, { target: { value: newLocation}})

		fireEvent.click(saveButton);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/schedulesave", expect.objectContaining({ 
			body: expect.stringMatching(newName)
		})));

		expect(await screen.findByTestId(testId)).toBeInTheDocument();
	});

	it("edits existing item", async () => {

		// ******** Given ***************

		const changedName = "Changed event name";

		render(<Schedule />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				event: { ...events[0], name: changedName }
			})
		});

		const editButton = await screen.findByRole("button", { name: /edit/i });
		fireEvent.click(editButton);

		const nameInput = await screen.findByLabelText("name"),
			saveButton = await screen.findByRole("button", { name: /save/i });

		// ******** When ****************

		fireEvent.change(nameInput, { target: { value: changedName }});
		fireEvent.click(saveButton);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/schedulesave", expect.objectContaining({ 
			body: expect.stringMatching(changedName)
		})));

		expect(await screen.findByText(changedName)).toBeInTheDocument();
	});

	it("deletes event", async () => {

		// ******** Given ***************

		render(<Schedule />);

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: jest.fn().mockResolvedValue({
				status: "ok"
			})
		});

		const editButton = await screen.findByRole("button", { name: /edit/i });
			
		fireEvent.click(editButton);

		const deleteButton = await screen.findByRole("button", { name: /delete/i });

		// ******** When ****************

		fireEvent.click(deleteButton);

		// ******** Then ****************

		await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/schedulesave", expect.objectContaining({ 
			body: expect.stringContaining(events[0].id)
		})));

		expect(screen.queryByTestId(events[0].id)).toBeNull();
	});

});