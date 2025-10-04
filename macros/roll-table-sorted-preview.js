/* ***************************************************************************
	Macro Title: RollTable Sorted Preview
	Author: TheJoester (https://github.com/thejoester)
	Foundry VTT Version: 12+

	Description:
	This macro allows a user to preview the contents of any RollTable in
	the world, sorted alphabetically by result text (ignoring leading
	numbers and Foundry link syntax).

	Features:
	- Prompts the user to select a RollTable from a dropdown list of all tables.
	- Cleans up each entry by:
		• Removing Foundry-style inline links (@UUID[…]{Label})
		• Ignoring leading numeric prefixes (e.g., "01 Goblin" → "Goblin")
		• Comparing case-insensitively
	- Sorts entries alphabetically by cleaned text, then by description.
	- Displays the sorted list in a scrollable, read-only preview window.
	- Useful for quickly checking or organizing table data in a readable order.

	Usage:
	1. Run the macro.
	2. Choose a RollTable from the list.
	3. The macro displays a scrollable text preview of the sorted results.

*************************************************************************** */


const LINK_REMOVER = /@\w+\[([^\]]+)\]\{([^}]+)\}/g;

// Sort entries alphabetically ignoring numbers by name (or text), then description
function compareLabels(a, b) {
	const clean = str => (str || "")
		.replaceAll(LINK_REMOVER, "$2")    // Strip Foundry links
		.replace(/^\d+\s*/, "")            // Remove leading numbers + optional space
		.trim()
		.toLowerCase();                    // Optional: ignore case

	const textA = clean(a.text);
	const textB = clean(b.text);

	const textCompare = textA.localeCompare(textB);
	if (textCompare !== 0) return textCompare;

	const descA = clean(a.description);
	const descB = clean(b.description);
	return descA.localeCompare(descB);
}

// Build dropdown options
const tableOptions = game.tables.map(t => 
	`<option value="${t.uuid}">${t.name}</option>`
).join("");

new foundry.applications.api.DialogV2({
	window: { title: "Select RollTable to Preview" },
	content: `
		<label for="table">Choose a table:</label><br>
		<select name="table" style="width: 100%; margin-top: 0.5em;">${tableOptions}</select>
	`,
	buttons: [{
		action: "preview",
		label: "Show Sorted Preview",
		default: true,
		callback: (event, button, dialog) => {
			const select = button.form.elements.table;
			return select?.value || null;
		}
	}],
	submit: async (uuid) => {
		if (!uuid) return;

		const table = await fromUuid(uuid);
		if (!table) return ui.notifications.error("Table not found.");

		const entries = Array.from(table.getEmbeddedCollection("TableResult"));
		entries.sort(compareLabels);

		const contentText = entries.map((e, i) => {
			// Clean both text and description
			const cleanedText = (e.text || "").replaceAll(LINK_REMOVER, "$2");
			const cleanedDesc = (e.description || "").replaceAll(LINK_REMOVER, "$2");

			// Prefer cleanedText if available, otherwise fallback to cleanedDesc
			return cleanedText || cleanedDesc || "(no text)";
		}).join("\n");

		new foundry.applications.api.DialogV2({
			window: { title: `Sorted Preview: ${table.name}` },
			content: `
				<div style="min-width: 500px; max-height: 70vh; overflow-y: auto; padding-right: 1em;">
					<textarea readonly style="width: 100%; height: 400px; font-family: monospace;">${contentText}</textarea>
				</div>
			`,
			buttons: [{
				action: "close",
				label: "Close",
				default: true
			}]
		}).render(true);
	}
}).render(true);
