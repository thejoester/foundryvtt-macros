/*
***************************************************************************
	Macro Title: Configure Scene for TotM
	Author: TheJoester (https://github.com/thejoester)
	Last updated: 23-Aug-2025
	License: MIT License
	
	Description:
  Macro will display list of scenes in world, select which scenes you want
  to adjust settings for, then which settings you want changed to the 
  below settings:
  
  === Default Values applied === 
  - Background Color → #000000
  - Grid Type → Gridless
  - Padding % → 0
  - Token Vision → off
  - Fog Exploration → off
  - Global Illumination → on
  - Darkness level → 0
***************************************************************************
*/

// ================== CONFIGURATION DEFAULTS ==================
// Set background color to hex code (https://htmlcolorcodes.com/)
const CONFIG_BACKGROUND_COLOR = "#000000";

// Set Grid Type
//  0 = GRIDLESS
//  1 = SQUARE
//  2 = HEX ODD ROW
//  3 = HEX EVEN ROW
//  4 = HEX ODD COLUMN
//  5 = HEX EVEN COLUMN
const CONFIG_GRID_TYPE = 0;

// Set Padding ratio (0 = none, 0.5 = max) — corresponds to 0–50%
const CONFIG_PADDING = 0;

// Token Vision: true = enabled, false = disabled
const CONFIG_TOKEN_VISION = false;

// Fog Exploration: true = enabled, false = disabled
const CONFIG_FOG_EXPLORATION = false;

// Global Illumination: true = enabled, false = disabled
const CONFIG_GLOBAL_LIGHT = true;

// Darkness level (0–1 | 0 = fully lit, 1 = fully dark)
const CONFIG_DARKNESS = 0;

// ============================================================

(async () => {
	try {
		const currentScene = canvas?.scene ?? game.scenes.current ?? null;
		const currentId = currentScene?.id ?? null;

		const allScenes = game.scenes.contents.slice();
		const others = allScenes
			.filter(s => s.id !== currentId)
			.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

		const curHtml = currentScene ? `
			<div class="current-scene">
				<label class="scene-chip">
					<input type="checkbox" name="sceneIds" value="${currentScene.id}" checked>
					<span class="scene-name" title="${currentScene.uuid}">${foundry.utils.escapeHTML(currentScene.name)} (current)</span>
				</label>
			</div>
		` : "";

		const otherHtml = others.map(s => `
			<label class="scene-chip">
				<input type="checkbox" name="sceneIds" value="${s.id}">
				<span class="scene-name" title="${s.uuid}">${foundry.utils.escapeHTML(s.name)}</span>
			</label>
		`).join("");

		const content = `
		<form class="bulk-scene-form">
			<!-- SCENE PICKER -->
			<div class="section">
				<h3 class="sect-title">Scenes</h3>
				<div class="row controls">
					<label class="select-all">
						<input type="checkbox" name="selectAll" />
						<span>Select All</span>
					</label>
				</div>
				${curHtml ? `<div class="row"><div class="scene-list current">${curHtml}</div></div>
				<hr class="divider">` : ""}
				<div class="row">
					<div class="scene-list other">
						${otherHtml || `<em>No other scenes.</em>`}
					</div>
				</div>
			</div>
			<!-- SETTINGS AT BOTTOM (TABLE WITH 2 COLS) -->
			<div class="section">
				<h3 class="sect-title">Settings to Apply</h3>
				<table class="settings-table">
					<tbody>
						<tr>
							<td><label><input type="checkbox" name="applyBackgroundColor" checked> Background Color</label></td>
							<td><label><input type="checkbox" name="applyGridType" checked> Grid Type</label></td>
						</tr>
						<tr>
							<td><label><input type="checkbox" name="applyPadding" checked> Padding %</label></td>
							<td><label><input type="checkbox" name="applyTokenVision" checked> Token Vision</label></td>
						</tr>
						<tr>
							<td><label><input type="checkbox" name="applyFog" checked> Fog Exploration</label></td>
							<td><label><input type="checkbox" name="applyGlobalLight" checked> Global Illumination</label></td>
						</tr>
						<tr>
							<td><label><input type="checkbox" name="applyDarkness" checked> Darkness level</label></td>
							<td></td>
						</tr>
					</tbody>
				</table>
			</div>
		</form>
		<style>
			/* Clamp the window width */
			.window-app#bulk-scene-editor { width: 720px !important; max-width: 720px !important; }
			.window-app#bulk-scene-editor .window-content { overflow: hidden; }
			.bulk-scene-form { padding:.25rem .25rem .5rem; }
			.section { margin-bottom:.5rem; }
			.sect-title { margin:.1rem 0 .35rem 0; }
			.controls { margin-bottom:.35rem; }
			.select-all { display:flex; align-items:center; gap:.4rem; }
			.divider { border:none; border-top:1px solid var(--color-border-light-tertiary, #4444); margin:.35rem 0; }
			/* Wrapping "chips" for scenes */
			.scene-list {
				display:flex; flex-wrap:wrap; gap:.35rem;
				max-height: 320px; overflow:auto;
				padding:.25rem; border:1px solid var(--color-border-light-tertiary, #4444); border-radius:6px;
				background: var(--app-bg, transparent);
				min-width: 0;
			}
			.scene-list.current { max-height: unset; overflow: visible; }
			.scene-chip {
				display:flex; align-items:center; gap:.4rem;
				padding:.2rem .4rem;
				border-radius: 999px;
				border:1px solid var(--color-border-light-tertiary, #4444);
				background: var(--color-bg-option, #00000010);
				max-width: 100%;
			}
			.scene-chip input { margin:0; }
			.scene-name { max-width: 24ch; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
			/* Settings table (force 2 columns) */
			.settings-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
			.settings-table td { width: 50%; padding:.2rem .3rem; vertical-align: top; }
			.settings-table label { display:flex; align-items:center; gap:.4rem; }
		</style>
		`;

		new foundry.applications.api.DialogV2({
			id: "bulk-scene-editor",
			window: { title: "Bulk Edit Scenes" },
			position: { width: 720, height: "auto" },
			resizable: true,
			content,
			buttons: [
				{
					action: "apply",
					label: "Apply",
					default: true,
					callback: async (event, button, dialog) => {
						const form = button.form;
						const selectedIds = Array.from(form.querySelectorAll('input[name="sceneIds"]:checked')).map(i => i.value);
						if (!selectedIds.length) return ui.notifications?.warn("No scenes selected.");

						const apply = {
							background: form.elements.applyBackgroundColor?.checked,
							gridType: form.elements.applyGridType?.checked,
							padding: form.elements.applyPadding?.checked,
							tokenVision: form.elements.applyTokenVision?.checked,
							fog: form.elements.applyFog?.checked,
							globalLight: form.elements.applyGlobalLight?.checked,
							darkness: form.elements.applyDarkness?.checked
						};
						if (!Object.values(apply).some(Boolean)) return ui.notifications?.warn("No settings were chosen to apply.");

						const updates = [];
						for (const id of selectedIds) {
							const scn = allScenes.find(s => s.id === id);
							const u = { _id: id };

							// Background color — handle both schemas
							if (apply.background) {
								if (scn?.background && typeof scn.background === "object" && "color" in scn.background) {
									u["background.color"] = CONFIG_BACKGROUND_COLOR;
								} else {
									u["backgroundColor"] = CONFIG_BACKGROUND_COLOR;
								}
							}

							if (apply.gridType) u["grid.type"] = CONFIG_GRID_TYPE;
							if (apply.padding) u["padding"] = CONFIG_PADDING;
							if (apply.tokenVision) u["tokenVision"] = CONFIG_TOKEN_VISION;
							if (apply.fog) u["fogExploration"] = CONFIG_FOG_EXPLORATION;
							if (apply.globalLight) u["globalLight"] = CONFIG_GLOBAL_LIGHT;
							if (apply.darkness) u["darkness"] = CONFIG_DARKNESS;

							updates.push(u);
						}

						await Scene.updateDocuments(updates);
						ui.notifications?.info(`Updated ${updates.length} scene(s).`);
					}
				},
				{ action: "cancel", label: "Cancel" }
			],
			render: (html, dialog) => {
				const form = html[0].querySelector("form");
				const selectAll = form?.elements?.selectAll;
				if (selectAll) {
					selectAll.addEventListener("change", ev => {
						const checked = ev.currentTarget.checked;
						form.querySelectorAll('input[name="sceneIds"]').forEach(cb => { cb.checked = checked; });
					});
				}
			}
		}).render({ force: true });

	} catch (err) {
		console.error(err);
		ui.notifications?.error(`Error opening Bulk Scene Settings: ${err.message}`);
	}
})();
