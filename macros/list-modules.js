/* ***************************************************************************
	Macro Title: List enabled modules in a world (with versions + links)
	Author: TheJoester (https://github.com/thejoester)
	Last updated: 23-Aug-2025
	License: MIT License
	
	Description:
	Displays dialog with list of enabled and disabled modules, showing
	title, version, ID, and website link if available.
*************************************************************************** */

const allModules = Array.from(game.modules.values()).sort((a, b) => a.title.localeCompare(b.title));

function formatModule(m) {
	const version = m.version ?? "v?";
	const link = m.url ? ` [${m.url}]` : "";
	return `${m.title} v${version} (${m.id})${link}`;
}

const enabled = allModules.filter(m => m.active).map(formatModule);
const disabled = allModules.filter(m => !m.active).map(formatModule);

const enabledBlock = enabled.length ? enabled.join('\n') : '(none)';
const disabledBlock = disabled.length ? disabled.join('\n') : '(none)';

const listText = [
	'======= Enabled Modules =======',
	enabledBlock,
	'',
	'======= Disabled Modules =======',
	disabledBlock
].join('\n');

const html = `
  <div style="min-width: 700px; min-height: 500px; padding-right: 1em;">
    <textarea id="module-list-textarea"
      style="width: 680px; height: 450px; font-family: monospace; resize: none; box-sizing: border-box;"
      readonly
      autofocus
    >${listText}</textarea>
  </div>
`;

const dialog = new foundry.applications.api.DialogV2({
	window: {
		title: "Modules (Enabled → Disabled)",
		width: 800,
		height: 600,
		resizable: true
	},
	content: html,
	buttons: [
		{
			action: "close",
			label: "Close",
			default: true
		}
	]
});

dialog.render(true);
