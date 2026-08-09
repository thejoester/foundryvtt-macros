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
		• Dropdown is grouped by folder, with "---- Folder Name ----" header rows.
		• Long table names are truncated to 50 characters (full name on hover).
	- Cleans up each entry by:
		• Removing Foundry-style inline links (@UUID[…]{Label})
		• Ignoring leading numeric prefixes (e.g., "01 Goblin" → "Goblin")
		• Extracting any HTTP/HTTPS URLs from text or description
		• Comparing case-insensitively
	- Sorts entries alphabetically by cleaned text, then by description.
	- Displays the sorted list in a scrollable table with clickable URL links.
	- Export button saves results as a .txt file in "name - url" format.
	- Useful for quickly checking or organizing table data in a readable order.

	Usage:
	1. Run the macro.
	2. Choose a RollTable from the list.
	3. Browse the sorted table preview; click URLs to open in a new tab.
	4. Optionally click "Export to .txt" to save the list.

*************************************************************************** */


// Sort entries alphabetically ignoring leading numbers by name (or text), then description
function compareLabels(a, b) {
	const clean = str => (str || "")
		.replace(/@\w+\[([^\]]+)\]\{([^}]+)\}/g, "$2")
		.replace(/^\d+\s*/, "")
		.trim()
		.toLowerCase();

	const textCompare = clean(a.text).localeCompare(clean(b.text));
	if (textCompare !== 0) return textCompare;
	return clean(a.description).localeCompare(clean(b.description));
}

// Extract display name and first URL from a table entry
function extractEntryInfo(e) {
	const rawText = e.text || "";
	const rawDesc = e.description || "";

	const url = (rawText.match(/https?:\/\/[^\s<>"]+/) ||
	             rawDesc.match(/https?:\/\/[^\s<>"]+/) || [])[0] || null;

	const name = rawText
		.replace(/@\w+\[([^\]]+)\]\{([^}]+)\}/g, "$2")
		.replace(/https?:\/\/[^\s<>"]+/g, "")
		.replace(/^\d+\s*/, "")
		.trim()
		|| rawDesc
			.replace(/@\w+\[([^\]]+)\]\{([^}]+)\}/g, "$2")
			.replace(/https?:\/\/[^\s<>"]+/g, "")
			.trim()
		|| "(no text)";

	return { name, url };
}

// Build dropdown options grouped by folder (title = full name for hover; label truncated at 50 chars)
const truncate = (str, max = 50) => (str.length > max ? `${str.slice(0, max)}...` : str);
const NO_FOLDER = "(No Folder)";

// Group tables by their immediate folder name
const groups = new Map();
for (const t of game.tables) {
	const key = t.folder?.name ?? NO_FOLDER;
	if (!groups.has(key)) groups.set(key, []);
	groups.get(key).push(t);
}

// Foldered groups alphabetically, unfoldered tables last
const byName = (a, b) => a.localeCompare(b, game.i18n.lang);
const folderNames = Array.from(groups.keys()).sort((a, b) => {
	if (a === NO_FOLDER) return 1;
	if (b === NO_FOLDER) return -1;
	return byName(a, b);
});
const hasFolders = folderNames.some(n => n !== NO_FOLDER);

const tableOptions = folderNames.map(folderName => {
	const opts = groups.get(folderName)
		.sort((a, b) => byName(a.name, b.name))
		.map(t => {
			const full = foundry.utils.escapeHTML(t.name);
			const label = foundry.utils.escapeHTML(truncate(t.name));
			return `<option value="${t.uuid}" title="${full}">${label}</option>`;
		}).join("");
	// Show a header for real folders; only show the "(No Folder)" header when folders also exist
	const showHeader = (folderName !== NO_FOLDER) || hasFolders;
	const header = showHeader
		? `<option disabled>---- ${foundry.utils.escapeHTML(folderName)} ----</option>`
		: "";
	return header + opts;
}).join("");

new foundry.applications.api.DialogV2({
	window: { title: "Select RollTable to Preview" },
	position: { width: 400 },
	content: `
		<label for="table">Choose a table:</label><br>
		<select name="table" style="width:100%; max-width:100%; box-sizing:border-box; margin-top:0.5em; text-overflow:ellipsis;">${tableOptions}</select>
	`,
	buttons: [{
		action: "preview",
		label: "Show Sorted Preview",
		default: true,
		callback: (event, button, dialog) => button.form.elements.table?.value || null
	}],
	submit: async (uuid) => {
		if (!uuid) return;

		const table = await fromUuid(uuid);
		if (!table) return ui.notifications.error("Table not found.");

		const entries = Array.from(table.getEmbeddedCollection("TableResult"));
		entries.sort(compareLabels);

		const infos = entries.map(extractEntryInfo);

		const rows = infos.map(({ name }) => {
			return `<tr style="border-bottom:1px solid #ddd;"><td style="padding:3px 8px; vertical-align:top;">${name}</td></tr>`;
		}).join("");

		const tableHtml = `
			<table style="width:100%; border-collapse:collapse; font-size:0.9em;">
				<thead>
					<tr style="background:#444; color:#fff;">
						<th style="text-align:left; padding:5px 8px;">Name</th>
					</tr>
				</thead>
				<tbody>${rows}</tbody>
			</table>
		`;

		const exportContent = infos
			.map(({ name, url }) => url ? `${name} - ${url}` : name)
			.join("\n");

		new foundry.applications.api.DialogV2({
			window: { title: `Sorted Preview: ${table.name}` },
			content: `
				<div style="min-width:640px; max-height:70vh; overflow-y:auto; padding-right:0.5em;">
					${tableHtml}
				</div>
			`,
			buttons: [
				{
					action: "export",
					label: "Export to .txt",
					callback: () => "export"
				},
				{
					action: "close",
					label: "Close",
					default: true,
					callback: () => "close"
				}
			],
			submit: (result) => {
				if (result !== "export") return;
				const blob = new Blob([exportContent], { type: "application/octet-stream" });
				const blobUrl = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = blobUrl;
				a.download = `${table.name}.txt`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(blobUrl);
			}
		}).render(true);
	}
}).render(true);
