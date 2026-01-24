/* ============================================================================
	Macro Title: Void Healing Cleaner (PF2e)
	Author: TheJoester (https://github.com/thejoester)
	Last updated 24-January-2026
	License: MIT License
	
	Description:
    - Scans world Actors + Scene Tokens for the "Void Healing" ability item by source UUID
    - Shows a list with checkboxes (default selected)
    - "Remove Void Healing" removes the item from selected entries
	
	Foundry Version: v13.346
============================================================================ */

(async () => {
	"use strict";

	const VOID_HEALING_SOURCE_UUID = "Compendium.pf2e.bestiary-ability-glossary-srd.Item.TTCw5NusiSSkJU1x";

	// -----------------------------
	// Helpers
	// -----------------------------
	function escapeHTML(str) {
		return foundry.utils.escapeHTML(String(str ?? ""));
	}

	function folderPath(folder) {
		if (!folder) return "(No Folder)";
		const parts = [];
		let f = folder;
		while (f) {
			parts.unshift(f.name);
			f = f.parent ?? null;
		}
		return parts.join(" / ");
	}

	function hasVoidHealing(doc) {

		// Fall back to flags.core.sourceId if needed.
		return doc?.items?.some(i => (i?.sourceId === VOID_HEALING_SOURCE_UUID) || (i?.flags?.core?.sourceId === VOID_HEALING_SOURCE_UUID)) ?? false;
	}

	async function removeVoidHealingFrom(actorLike) {
		const items = actorLike.items?.filter(i => (i?.sourceId === VOID_HEALING_SOURCE_UUID) || (i?.flags?.core?.sourceId === VOID_HEALING_SOURCE_UUID)) ?? [];
		if (!items.length) return { removed: 0 };

		const ids = items.map(i => i.id).filter(Boolean);
		if (!ids.length) return { removed: 0 };

		await actorLike.deleteEmbeddedDocuments("Item", ids);
		return { removed: ids.length };
	}

	// -----------------------------
	// Gather targets
	// -----------------------------
	const entries = [];

	// World Actors
	for (const a of game.actors) {
		if (!a) continue;
		if (!hasVoidHealing(a)) continue;

		entries.push({
			key: `actor:${a.uuid}`,
			type: "Actor",
			name: a.name,
			location: folderPath(a.folder),
			targetKind: "actor",
			actorUuid: a.uuid,
			sceneId: null,
			tokenId: null,
			linked: null
		});
	}

	// Scene Tokens
	for (const s of game.scenes) {
		if (!s) continue;

		for (const td of s.tokens) {
			if (!td) continue;

			// TokenDocument#actor gives the synthetic actor for unlinked, and the base actor for linked.
			const ta = td.actor;
			if (!ta) continue;
			if (!hasVoidHealing(ta)) continue;

			entries.push({
				key: `token:${s.id}:${td.id}`,
				type: "Token",
				name: td.name ?? ta.name ?? "(Unnamed Token)",
				location: s.name ?? "(Unnamed Scene)",
				targetKind: "token",
				actorUuid: ta.uuid,     // for linked tokens this is the world actor uuid; for unlinked it's synthetic
				sceneId: s.id,
				tokenId: td.id,
				linked: td.actorLink ?? false
			});
		}
	}

	if (!entries.length) {
		ui.notifications.info("No Actors or Scene Tokens found with Void Healing.");
		return;
	}

	// -----------------------------
	// ApplicationV2 UI
	// -----------------------------
	class VoidHealingCleanerApp extends foundry.applications.api.ApplicationV2 {
		static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
			id: "void-healing-cleaner",
			window: {
				title: "Void Healing Cleaner",
				resizable: true
			},
			position: {
				width: 780,
				height: "auto"
			}
		});

		constructor(entries, options = {}) {
			super(options);
			this.entries = entries;

			// default: all selected
			this.selection = new Map();
			for (const e of this.entries) this.selection.set(e.key, true);
		}

		_renderHTML(_context, _options) {
			const rows = this.entries.map(e => {
				const checked = this.selection.get(e.key) ? "checked" : "";
				const linkedInfo = (e.type === "Token")
					? (e.linked ? "Linked" : "Unlinked")
					: "";

				return `
					<tr>
						<td style="width: 2.25rem; text-align: center;">
							<input type="checkbox" class="vhc-select" data-key="${escapeHTML(e.key)}" ${checked}>
						</td>
						<td style="white-space: nowrap;">${escapeHTML(e.type)}</td>
						<td>${escapeHTML(e.name)}</td>
						<td>${escapeHTML(e.location)}</td>
						<td style="white-space: nowrap;">${escapeHTML(linkedInfo)}</td>
					</tr>
				`;
			}).join("");

			return `
				<form class="vhc-form" style="display:flex; flex-direction:column; gap:0.75rem;">
					<div class="hint" style="opacity:0.85;">
						Found <b>${this.entries.length}</b> matching entries. All are selected by default.
					</div>

					<div style="overflow:auto; max-height: 60vh;">
						<table style="width:100%; border-collapse: collapse;">
							<thead>
								<tr>
									<th style="width:2.25rem;"></th>
									<th style="text-align:left;">Type</th>
									<th style="text-align:left;">Name</th>
									<th style="text-align:left;">Scene / Folder</th>
									<th style="text-align:left;">Token</th>
								</tr>
							</thead>
							<tbody>
								${rows}
							</tbody>
						</table>
					</div>

					<footer class="form-footer" style="display:flex; gap:0.5rem; justify-content:flex-end; flex-wrap: wrap;">
						<button type="button" class="vhc-clear">
							<i class="fa-solid fa-broom"></i> Remove Void Healing
						</button>
						
						<button type="button" class="vhc-select-none">
							<i class="fa-regular fa-square"></i> Select None
						</button>
						<button type="button" class="vhc-select-all">
							<i class="fa-regular fa-square-check"></i> Select All
						</button>

						<button type="button" class="vhc-cancel">
							<i class="fa-solid fa-xmark"></i> Cancel
						</button>
						
					</footer>
				</form>
			`;
		}

		_replaceHTML(html, _element, { renderContext, renderOptions } = {}) {
			// Standard V2 pattern: replace inner content
			const el = this.element;
			if (!el) return;

			el.innerHTML = html;
			this._activateListeners(el);

			return el;
		}

		_activateListeners(root) {
			// Checkbox toggles
			root.querySelectorAll(".vhc-select").forEach(cb => {
				cb.addEventListener("change", ev => {
					const key = ev.currentTarget?.dataset?.key;
					if (!key) return;
					this.selection.set(key, !!ev.currentTarget.checked);
				});
			});
			
			// Clear
			root.querySelector(".vhc-clear")?.addEventListener("click", async () => {
				const selected = this.entries.filter(e => this.selection.get(e.key));
				if (!selected.length) {
					ui.notifications.warn("Nothing selected.");
					return;
				}

				// De-dupe operations:
				// - World actor entries: operate on that actor
				// - Token entries:
				//    - if linked -> operate on the base actor (same as actor entry)
				//    - if unlinked -> operate on the synthetic token actor
				//
				// Key by operation target:
				// - linked token uses actor uuid
				// - unlinked token uses sceneId:tokenId
				const ops = new Map();

				for (const e of selected) {
					if (e.type === "Actor") {
						ops.set(`actor:${e.actorUuid}`, e);
					} else {
						if (e.linked) {
							ops.set(`actor:${e.actorUuid}`, e);
						} else {
							ops.set(`token:${e.sceneId}:${e.tokenId}`, e);
						}
					}
				}

				let removedTotal = 0;
				let failed = 0;

				for (const [opKey, e] of ops.entries()) {
					try {
						if (opKey.startsWith("actor:")) {
							const a = fromUuidSync(e.actorUuid);
							if (!a) throw new Error(`Actor not found for ${e.actorUuid}`);
							const r = await removeVoidHealingFrom(a);
							removedTotal += r.removed;
						} else {
							const scene = game.scenes.get(e.sceneId);
							const td = scene?.tokens?.get(e.tokenId);
							const ta = td?.actor;
							if (!scene || !td || !ta) throw new Error(`Token actor not found for ${e.sceneId}:${e.tokenId}`);
							const r = await removeVoidHealingFrom(ta);
							removedTotal += r.removed;
						}
					} catch (err) {
						failed++;
						console.error("Void Healing Cleaner | Failed operation:", opKey, e, err);
					}
				}

				if (failed) {
					ui.notifications.warn(`Clear finished with some failures. Removed ${removedTotal} item(s). Failures: ${failed}. Check console.`);
				} else {
					ui.notifications.info(`Clear complete. Removed ${removedTotal} item(s).`);
				}

				this.close();
			});
			
			// Select None
			root.querySelector(".vhc-select-none")?.addEventListener("click", () => {
				for (const e of this.entries) this.selection.set(e.key, false);
				root.querySelectorAll(".vhc-select").forEach(cb => cb.checked = false);
			});

			// Select All
			root.querySelector(".vhc-select-all")?.addEventListener("click", () => {
				for (const e of this.entries) this.selection.set(e.key, true);
				root.querySelectorAll(".vhc-select").forEach(cb => cb.checked = true);
			});

			// Cancel
			root.querySelector(".vhc-cancel")?.addEventListener("click", () => {
				this.close();
			});
		}
	}

	new VoidHealingCleanerApp(entries).render({ force: true });
})();
