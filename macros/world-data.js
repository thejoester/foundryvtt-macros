/*
******************************************************************

	Macro Title: World Data Usage Snapshot Macro
	Author: TheJoester (https://github.com/thejoester)
	Description:
	Shows document sizes and highlights "large" entries per type.
	
	- Supports Header row
	- Pick which column (for .csv with multiple columns)
 	- Specify name of Roll Table (defaults to file name)

	Foundry Version: v13
	Last updated 27-November-2025

	Author: TheJoester (https://github.com/thejoester)
	License: MIT License

******************************************************************
*/

/* ============================================================================
   EDITABLE SIZE THRESHOLDS (KB)
   Change these however you want
============================================================================ */

const SIZE_THRESHOLDS = {
	Actors: 100,
	Items: 50,
	Scenes: 500,
	Journals: 75,
	RollTables: 30,
	Playlists: 50,
	Macros: 25
};

function getSizeInKB(obj) {
	return (new Blob([JSON.stringify(obj)])).size / 1024;
}

function formatSizeKB(kb) {
	return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}


/* ============================================================================
   Collections
============================================================================ */

const collections = {
	Actors: game.actors,
	Items: game.items,
	Scenes: game.scenes,
	Journals: game.journal,
	RollTables: game.tables,
	Playlists: game.playlists,
	Macros: game.macros
};


/* ============================================================================
   Build UI data
============================================================================ */

const tabs = [];
const contents = [];

let totalWorldSize = 0;

let summaryHTML =
	"<table><thead><tr><th>Type</th><th>Count</th><th>Total Size</th><th>Warn @</th></tr></thead><tbody>";

for (const [label, collection] of Object.entries(collections)) {

	const threshold = SIZE_THRESHOLDS[label] ?? 100;

	const entries = [];
	let totalSize = 0;

	for (const doc of collection.contents) {
		const size = getSizeInKB(doc.toObject());
		totalSize += size;
		entries.push({ name: doc.name, size });
	}

	totalWorldSize += totalSize;

	entries.sort((a, b) => b.size - a.size);

	/* ---------- Summary row ---------- */

	summaryHTML += `
		<tr>
			<td>${label}</td>
			<td>${entries.length}</td>
			<td>${formatSizeKB(totalSize)}</td>
			<td>${threshold} KB</td>
		</tr>
	`;

	/* ---------- Tab content ---------- */

	const entryList = entries.map(e => {
		let style = "", title = "";

		if (e.size >= threshold) {
			style = "color:#d33;font-weight:bold;";
			title = "Above threshold";
		} else if (e.size >= threshold * 0.85) {
			style = "color:#e67e22;font-weight:bold;";
			title = "Near threshold";
		}

		const attr = style ? ` style="${style}" title="${title}"` : "";

		return `<li${attr}><strong>${e.name}</strong>: ${formatSizeKB(e.size)}</li>`;
	}).join("");

	const sectionHTML = `
		<div class="tab-content" data-group="perf-tabs" data-tab="${label}" style="display:none;">
			<p><strong>Large threshold:</strong> ${threshold} KB</p>
			<ul>${entryList}</ul>
			<p><em>Total size for ${label}: ${formatSizeKB(totalSize)}</em></p>
		</div>
	`;

	tabs.push(`<a class="item" data-tab="${label}">[ ${label} ]</a>`);
	contents.push(sectionHTML);
}


/* ============================================================================
   Summary tab
============================================================================ */

summaryHTML += `
	</tbody></table>
	<p><strong>Total World Size:</strong> ${formatSizeKB(totalWorldSize)}</p>
`;

tabs.unshift(`<a class="item active" data-tab="Summary">[ Summary ]</a>`);
contents.unshift(`
	<div class="tab-content" data-group="perf-tabs" data-tab="Summary" style="display:block;">
		${summaryHTML}
	</div>
`);


/* ============================================================================
   Dialog
============================================================================ */

new Dialog({
	title: "World Data Usage Snapshot",
	content: `
		<style>
			#world-usage-container {
				display:flex;
				flex-direction:column;
				height:600px;
			}
			#world-usage-tabs {
				flex:0 0 auto;
				margin-bottom:0.5em;
			}
			#world-usage-wrapper {
				flex:1 1 auto;
				overflow-y:auto;
			}
			nav.tabs a.item {
				margin-right:0.5em;
			}
		</style>

		<div id="world-usage-container">
			<nav id="world-usage-tabs" class="tabs" data-group="perf-tabs">
				${tabs.join("")}
			</nav>
			<div id="world-usage-wrapper">
				${contents.join("")}
			</div>
		</div>
	`,
	buttons: {
		close: { label: "Close" }
	},
	render: html => {
		const tabNav = html.find("nav.tabs");
		const contents = html.find(".tab-content");

		tabNav.on("click", "a.item", event => {
			const tabId = event.currentTarget.dataset.tab;

			tabNav.find("a.item").removeClass("active");
			contents.hide();

			event.currentTarget.classList.add("active");
			html.find(`.tab-content[data-tab="${tabId}"]`).show();
		});
	}
}).render(true, {
	width: 900,
	resizable: true
});
