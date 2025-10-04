/*
******************************************************************

	Macro Title: Search Actors (v2)
	Author: TheJoester (https://github.com/thejoester)
	Description:
	Search selected tokens, shows report of items, spells, featc, etc. 
	
	- Supports Header row
	- Pick which column (for .csv with multiple columns)
 	- Specify name of Roll Table (defaults to file name)

	Foundry Version: v12 - v13
	Last updated 2025-10-04

	Author: TheJoester (https://github.com/thejoester)
	License: MIT License

******************************************************************
*/
(async () => {
	// Guards
	const selected = canvas?.tokens?.controlled ?? [];
	if (!selected.length) return ui.notifications.warn("Select one or more tokens to search.");
	const ACTORS = selected.map(t => t.actor).filter(Boolean);
	if (!ACTORS.length) return ui.notifications.warn("Selected tokens have no actors.");

	const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
	const titleCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

	function buildSections(termRaw) {
		const term = String(termRaw ?? "").trim().toLowerCase();
		const sections = [];

		for (const actor of ACTORS) {
			const byType = new Map();
			for (const item of actor.items) {
				const name = item?.name ?? "";
				if (!name || !name.toLowerCase().includes(term)) continue;
				const type = item?.type ?? "other";
				if (!byType.has(type)) byType.set(type, new Set());
				byType.get(type).add(name);
			}
			if (!byType.size) continue;

			const typeKeys = Array.from(byType.keys()).sort((a, b) => a.localeCompare(b));
			const rows = typeKeys.map(typeKey => {
				const items = Array.from(byType.get(typeKey)).sort((a, b) => a.localeCompare(b));
				const list = items.map(n => `<li>${esc(n)}</li>`).join("");
				return `
					<tr class="sa-row">
						<td class="sa-type"><strong>${esc(titleCase(typeKey))}</strong></td>
						<td class="sa-items"><ul class="sa-list">${list}</ul></td>
					</tr>`;
			}).join("");

			sections.push(`
				<tr class="sa-actor">
					<th class="sa-actor-h" colspan="2">${esc(actor.name)}</th>
				</tr>
				${rows}`);
		}
		return sections;
	}

	function buildResultsHTML(term) {
		const sections = buildSections(term);
		const any = sections.length > 0;
		const body = any
			? sections.join("")
			: `<tr><td colspan="2" class="sa-empty"><em>No matches found.</em></td></tr>`;

		return `
			<style>
				#search-actor-app .window-content {
					display:flex; flex-direction:column; height:100%; min-height:0; padding:.75rem;
				}
				.sa-root {
					display:flex; flex-direction:column; gap:.6rem; flex:1 1 auto; min-height:0;
					background:rgba(20,20,25,.96); border-radius:8px; padding:.6rem; 
					box-shadow:0 0 10px rgba(0,0,0,.5);
				}

				/* Scrollable results panel */
				.sa-scroll {
					flex:1 1 auto; min-height:0; overflow:auto;
					border:1px solid rgba(255,255,255,.14);
					border-radius:8px;
					background:#000;
				}
				.sa-table { width:100%; border-collapse:separate; border-spacing:0; }

				/* Actor header row — darker gray background */
				.sa-actor-h {
					text-align:left;
					background:#444;
					color:#fff;
					padding:10px 14px;
					font-weight:800;
					font-size:1.2rem;
					border-bottom:1px solid #333;
					position:sticky; top:0; z-index:1;
				}

				/* Result rows — black background */
				.sa-row td {
					background:#0b0b0b;
					color:#ddd;
					padding:8px 14px;
					vertical-align:top;
					border-bottom:1px dashed rgba(255,255,255,.08);
				}
				.sa-empty {
					background:#0b0b0b;
					color:#bbb;
					padding:12px;
				}

				.sa-type { width:32%; white-space:nowrap; color:#fff; }
				.sa-items { width:68%; }
				.sa-list { margin:0; padding-left:1.1em; }
			</style>

			<div class="sa-root">
				<div class="sa-scroll">
					<table class="sa-table"><tbody>${body}</tbody></table>
				</div>
			</div>`;
	}

	class SearchActorApp extends foundry.applications.api.ApplicationV2 {
    	constructor(term) {
    		super({
    			id: "search-actor-app",
    			window: { title: `Search Actors for '${term}''` },
    			position: { width: 600, height: 470 },  // ⬅️ reduced height
    			resizable: true
    		});
    		this.term = String(term ?? "");
    	}
  
    	async _renderHTML() { return buildResultsHTML(this.term); }
  
    	async _replaceHTML(result) {
    		const content = this.element.querySelector(".window-content") || this.element;
    		content.innerHTML = result;
    
    		// enforce dimensions even with theme overrides
    		try { this.setPosition({ width: 600, height: 470 }); } catch {}
    	}
    }
  
	// Prompt once for the term, then open the results app
	new foundry.applications.api.DialogV2({
		window: { title: "Search Actor Data" },
		content: `
			<form style="min-width:420px;display:flex;gap:.6rem;align-items:center" onsubmit="return false;">
				<label style="flex:1;">Search:
					<input type="text" name="term" autofocus style="width:100%;">
				</label>
			</form>
		`,
		buttons: [
			{
				action: "search",
				label: "Search",
				default: true,
				callback: (_ev, btn) => (btn.form?.elements?.term?.value ?? "").trim()
			},
			{ action: "cancel", label: "Cancel" }
		],
		submit: (result) => {
			if (!result || result === "cancel") return;
			const term = String(result).trim();
			if (!term) return ui.notifications.warn("Please enter a search term.");
			new SearchActorApp(term).render(true);
		}
	}).render(true);
})();
