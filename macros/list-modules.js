/* ***************************************************************************
	Macro Title: List enabled modules in a world (with versions + links)
	Author: TheJoester (https://github.com/thejoester)
	Last updated: 23-Apr-2026
	License: MIT License

	Description:
	Displays a dialog with enabled and disabled modules in a sortable table,
	showing title, version, ID, and clickable website link if available.
	Includes an export button that saves the list as a .txt file in
	"module_name - module_url" format.
*************************************************************************** */

const allModules = Array.from(game.modules.values()).sort((a, b) => a.title.localeCompare(b.title));

function buildRows(modules) {
	return modules.map(m => {
		const version = m.version ?? "?";
		const urlCell = m.url
			? `<a href="${m.url}" target="_blank" rel="noopener noreferrer">${m.url}</a>`
			: "";
		return `<tr style="border-bottom:1px solid #ddd;">
			<td style="padding:3px 8px; vertical-align:top;">${m.title}</td>
			<td style="padding:3px 8px; vertical-align:top; white-space:nowrap;">v${version}</td>
			<td style="padding:3px 8px; vertical-align:top; font-family:monospace; font-size:0.85em;">${m.id}</td>
			<td style="padding:3px 8px; vertical-align:top;">${urlCell}</td>
		</tr>`;
	}).join("");
}

function buildSection(title, modules) {
	const rows = modules.length ? buildRows(modules) : `<tr><td colspan="4" style="padding:4px 8px; color:#888;">(none)</td></tr>`;
	return `
		<h3 style="margin:0.75em 0 0.25em; border-bottom:1px solid #ccc; padding-bottom:0.2em;">${title}</h3>
		<table style="width:100%; border-collapse:collapse; font-size:0.9em; margin-bottom:1em;">
			<thead>
				<tr style="background:#444; color:#fff;">
					<th style="text-align:left; padding:5px 8px;">Title</th>
					<th style="text-align:left; padding:5px 8px;">Version</th>
					<th style="text-align:left; padding:5px 8px;">ID</th>
					<th style="text-align:left; padding:5px 8px;">URL</th>
				</tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>
	`;
}

const enabled = allModules.filter(m => m.active);
const disabled = allModules.filter(m => !m.active);

const html = `
	<div style="min-width:700px; max-height:70vh; overflow-y:auto; padding-right:0.5em;">
		${buildSection("Enabled Modules", enabled)}
		${buildSection("Disabled Modules", disabled)}
	</div>
`;

function exportLine(m) {
	return m.url ? `${m.title} - ${m.url}` : m.title;
}

const exportContent = [
	"=== Enabled Modules ===",
	...(enabled.length ? enabled.map(exportLine) : ["(none)"]),
	"",
	"=== Disabled Modules ===",
	...(disabled.length ? disabled.map(exportLine) : ["(none)"])
].join("\n");

new foundry.applications.api.DialogV2({
	window: {
		title: "Modules (Enabled → Disabled)",
		width: 900,
		resizable: true
	},
	content: html,
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
		a.download = "modules.txt";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(blobUrl);
	}
}).render(true);
