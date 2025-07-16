/*
******************************************************************

	Macro Title: Import .CSV into Roll Table
	Author: TheJoester (https://github.com/thejoester)
	Description:
	Upload a .csv file into a roll table 
	
	- Supports Header row
	- Pick which column (for .csv with multiple columns)
 	- Specify name of Roll Table (defaults to file name)

	Foundry Version: v12 - v13
	Last updated 16-July-2025

	Author: TheJoester (https://github.com/thejoester)
	License: MIT License

******************************************************************
*/

(async () => {
	// Step 1: Initial info dialog (still fine to use confirm here)
	const firstDialogResult = await new Promise(resolve => {
		new foundry.applications.api.DialogV2({
			window: { title: "RollTable CSV Importer", resizable: false },
			content: `
				<p>This macro lets you import a <strong>.csv file</strong> to create a new <strong>RollTable</strong>.</p>
				<ul>
					<li>You choose which column becomes the result text.</li>
					<li>Each row becomes a RollTable result.</li>
					<li>Weights and ranges are auto-generated.</li>
				</ul>
				<p>Click <strong>Import .CSV</strong> to continue.</p>
			`,
			buttons: [{
				action: "import",
				label: "Import .CSV",
				default: true,
				callback: () => resolve(true)
			}],
			submit: () => resolve(false) // fallback if user closes dialog
		}).render(true);
	});

	if (!firstDialogResult) return;

	// Step 2: File picker
	const fileInput = document.createElement("input");
	fileInput.type = "file";
	fileInput.accept = ".csv";
	fileInput.click();

	const file = await new Promise(resolve => {
		fileInput.addEventListener("change", () => resolve(fileInput.files[0]));
	});
	if (!file) {
		ui.notifications.warn("No file selected.");
		return;
	}

	// Step 3: Read file
	const text = await file.text();
	const lines = text.split(/\r?\n/).filter(l => l.trim().length);
	if (lines.length === 0) {
		ui.notifications.error("CSV appears empty.");
		return;
	}

	// Step 4: Prepare preview
	const sampleLines = lines.slice(0, 3).map(l => l.split(","));
	const maxCols = Math.max(...sampleLines.map(row => row.length));
	const headerRow = sampleLines[0];

	// Step 5: Build content HTML
	const previewHTML = `
		<div style="min-width: 600px; max-height: 70vh; overflow-y: auto; padding-right: 1em;">
			<p><strong>CSV Preview (first 3 rows):</strong></p>
			<div style="overflow-x: auto;">
				<table class="pf2e" style="width:100%">
					${sampleLines.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
				</table>
			</div>
			<div class="form-group">
				<label><input type="checkbox" name="hasHeader" checked> First row is a header</label>
			</div>
			<div class="form-group" style="display: flex; align-items: center; gap: 0.5em;">
				<label for="columnSelect" style="white-space: nowrap; width: 140px;">Select Column:</label>
				<select name="columnSelect" style="flex: 1;">
					${Array.from({ length: maxCols }).map((_, i) => {
						const name = headerRow[i]?.trim() || `Column ${i + 1}`;
						return `<option value="${i}">${name}</option>`;
					}).join("")}
				</select>
			</div>
			<div class="form-group" style="display: flex; align-items: center; gap: 0.5em;">
				<label for="tableName" style="white-space: nowrap; width: 140px;">RollTable Name:</label>
				<input type="text" name="tableName" value="${file.name.replace(/\.csv$/i, '')}" style="flex: 1;">
			</div>
		</div>
	`;

	// Step 6: Build DialogV2 with full control
	let selectedColumn, hasHeader, tableName;
	const dialog = new foundry.applications.api.DialogV2({
		window: {
			title: "Import RollTable from CSV",
			resizable: true
		},
		content: previewHTML,
		buttons: [{
			action: "create",
			label: "Create RollTable",
			default: true,
			callback: (event, button, dialog) => {
				const form = button.form;
				selectedColumn = parseInt(form.columnSelect.value);
				hasHeader = form.hasHeader.checked;
				tableName = form.tableName.value.trim();

				if (!tableName) {
					ui.notifications.warn("Please enter a name for the RollTable.");
					return false;
				}
				return "create";
			}
		}, {
			action: "cancel",
			label: "Cancel"
		}],

		submit: async result => {
			if (result !== "create") {
				ui.notifications.info("RollTable creation cancelled.");
				return;
			}

			const dataRows = lines.map(l => l.split(","));
			if (hasHeader) dataRows.shift();

			const rollResults = dataRows
				.map(row => row[selectedColumn]?.trim())
				.filter(text => text?.length > 0)
				.map((text, idx) => ({
					_id: foundry.utils.randomID(),
					type: 0,
					text,
					img: "icons/svg/d20.svg",
					weight: 1,
					range: [idx + 1, idx + 1],
					drawn: false
				}));

			if (rollResults.length === 0) {
				ui.notifications.error("No valid rows found to import.");
				return;
			}

			await RollTable.create({
				name: tableName,
				results: rollResults,
				formula: `1d${rollResults.length}`
			});

			ui.notifications.info(`Created RollTable "${tableName}" with ${rollResults.length} results.`);
		}
	});

	dialog.render(true);
})();
