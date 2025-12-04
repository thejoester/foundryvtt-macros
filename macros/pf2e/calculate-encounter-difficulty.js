/* ***************************************************************************
	Macro Title: PF2e Calculate Encounter Difficulty from Selected Tokens
	Author: TheJoester
	Last updated: 28-NOV-2025
	License: MIT License

	Description:
  - Select your PARTY (PC tokens) and the ENEMIES (NPC/Hazard tokens).
  - Run Macro.
  - Party Level = average of selected PCs (round .5 up).
  - Ignores minions/familiars/companions (minion trait or type=familiar).
  - Calculates total encounter XP and difficulty (Trivial/Low/Moderate/Severe/Extreme).
  - Shows a DialogV2 summary; 
  - Optional saves a journal page to 'Saved Encounters' journal
*************************************************************************** */
(() => {
	if (!canvas?.ready) return ui.notifications.warn("Open a scene and select tokens first.");

	const esc  = foundry.utils.escapeHTML;
	const sign = (n) => (n > 0 ? `+${n}` : `${n}`);

	// Creature XP by level difference vs Party Level (budget values)
	function xpForDiff(diff) {
		if (diff <= -5) return 0;
		if (diff === -4) return 10;
		if (diff === -3) return 15;
		if (diff === -2) return 20;
		if (diff === -1) return 30;
		if (diff === 0)  return 40;
		if (diff === 1)  return 60;
		if (diff === 2)  return 80;
		if (diff === 3)  return 120;
		return 160; // +4 or higher
	}

	// Ignore familiars and anything with the "minion" trait (covers animal companions, summons, etc.)
	function isIgnoredCompanion(actor) {
		if (!actor) return true;
		if (actor.type === "familiar") return true;
		const traits = actor.system?.traits?.traits?.value ?? actor.system?.traits?.value ?? [];
		return Array.isArray(traits) && traits.includes("minion");
	}

	// Selection
	const selected = canvas.tokens.controlled ?? [];
	if (!selected.length) return ui.notifications.warn("Select your PCs and the enemies, then run the macro.");

	const pcTokens = [];
	const foeTokens = [];

	for (const t of selected) {
		const a = t.actor;
		if (!a) continue;

		if (a.type === "character") {
			if (!isIgnoredCompanion(a)) pcTokens.push(t);
			continue;
		}

		if ((a.type === "npc" || a.type === "hazard") && !isIgnoredCompanion(a)) {
			foeTokens.push(t);
			continue;
		}
	}

	if (!pcTokens.length) return ui.notifications.warn("No valid PCs selected. Select at least one PC token.");

	// Party Level & size from selected PCs
	const pcLvls = pcTokens
		.map(t => Number(t.actor?.system?.details?.level?.value ?? 0))
		.filter(Number.isFinite);

	const avg = pcLvls.reduce((a, b) => a + b, 0) / Math.max(1, pcLvls.length);
	const partyLevel = Math.round(avg);
	const partySize  = pcTokens.length;

	// Foes → rows and total budget XP
	const rows = [];
	let baseTotalXP = 0;

	for (const t of foeTokens) {
		const a = t.actor;
		const cl = Number(a?.system?.details?.level?.value ?? 0);
		const diff = cl - partyLevel;
		const xp = xpForDiff(diff);
		baseTotalXP += xp;
		rows.push({
			name: t.name || a?.name || "(Unnamed)",
			type: a?.type ?? "npc",
			level: cl,
			diff,
			xp
		});
	}

	// If no foes, this is just a sad staring contest
	if (!rows.length) {
		return ui.notifications.warn("No valid enemies (NPCs/Hazards) selected.");
	}

	// Party-size–adjusted difficulty thresholds (4-PC baseline 40/60/80/120/160; shift ±10 per PC from 4)
	const delta = (partySize - 4) * 10;
	const thresholds = {
		trivial: Math.max(0, 40 + delta),
		low:     Math.max(0, 60 + delta),
		moderate:Math.max(0, 80 + delta),
		severe:  Math.max(0,120 + delta),
		extreme: Math.max(0,160 + delta)
	};

	function difficultyLabel(total) {
		if (total <= thresholds.trivial)  return "Trivial";
		if (total <= thresholds.low)      return "Low";
		if (total <= thresholds.moderate) return "Moderate";
		if (total <= thresholds.severe)   return "Severe";
		return "Extreme";
	}

	const difficulty = difficultyLabel(baseTotalXP);

	// Prebuild enemy rows HTML for reuse (dialog + journal)
	const enemyRowsHTML = rows.map(r => `
		<tr>
			<td style="padding:.3rem .5rem;border-top:1px solid #00000011;">${esc(r.name)}</td>
			<td style="padding:.3rem .5rem;border-top:1px solid #00000011;opacity:.8;">${esc(r.type)}</td>
			<td style="padding:.3rem .5rem;border-top:1px solid #00000011;text-align:right;">${r.level}</td>
			<td style="padding:.3rem .5rem;border-top:1px solid #00000011;text-align:right;">${sign(r.diff)}</td>
			<td style="padding:.3rem .5rem;border-top:1px solid #00000011;text-align:right;font-weight:600;">${r.xp}</td>
		</tr>
	`).join("");

	// Dialog content
	const content = `
		<section style="display:flex;flex-direction:column;gap:.75rem;">
			<div style="opacity:.9">
				<div><strong>Party Level:</strong> ${partyLevel} (${pcLvls.length} PC${pcLvls.length !== 1 ? "s" : ""})</div>
				<div><strong>Party Size:</strong> ${partySize}</div>
				<div><strong>Enemies counted:</strong> ${rows.length}</div>
				<div style="margin-top:.25rem;font-size:12px;opacity:.8;">
					Thresholds (party size adjusted): 
					Trivial ${thresholds.trivial} • Low ${thresholds.low} • Moderate ${thresholds.moderate} • Severe ${thresholds.severe} • Extreme ${thresholds.extreme}
				</div>
			</div>
			<div style="max-height:260px;overflow:auto;border:1px solid #00000022;border-radius:.25rem;">
				<table style="width:100%;border-collapse:collapse;font-size:13px;">
					<thead>
						<tr style="background:#00000014;">
							<th style="text-align:left;padding:.35rem .5rem;">Enemy</th>
							<th style="text-align:left;padding:.35rem .5rem;">Type</th>
							<th style="text-align:right;padding:.35rem .5rem;">Level</th>
							<th style="text-align:right;padding:.35rem .5rem;">vs PL</th>
							<th style="text-align:right;padding:.35rem .5rem;">XP</th>
						</tr>
					</thead>
					<tbody>
						${enemyRowsHTML}
					</tbody>
					<tfoot>
						<tr style="background:#00000008;">
							<td colspan="3" style="padding:.35rem .5rem;text-align:right;font-weight:700;">Total XP (budget):</td>
							<td colspan="2" style="padding:.35rem .5rem;text-align:right;font-weight:800;">${baseTotalXP}</td>
						</tr>
						<tr style="background:#00000014;">
							<td colspan="3" style="padding:.35rem .5rem;text-align:right;font-weight:700;">Difficulty:</td>
							<td colspan="2" style="padding:.35rem .5rem;text-align:right;font-weight:900;">${difficulty}</td>
						</tr>
					</tfoot>
				</table>
			</div>
			<div style="display:flex;flex-direction:column;gap:.25rem;">
				<label for="enc-name" style="font-weight:600;">Encounter Name (for journal page)</label>
				<input id="enc-name" name="enc-name" type="text" placeholder="e.g. Bandit Ambush at the Ford" style="width:100%;" />
			</div>
		</section>
	`;

	new foundry.applications.api.DialogV2({
		window: {
			title: "Encounter Difficulty (Selected Tokens)",
			modal: false,
			width: 680
		},
		content,
		buttons: [{
			action: "save",
			label: "Save to Journal",
			default: false,
			callback: async (event, button, dialog) => {
				const form = button.form;
				const nameField = form?.elements?.["enc-name"];
				const encName = nameField?.value?.trim();

				if (!encName) {
					return ui.notifications.warn("Enter an Encounter Name before saving.");
				}

				try {
					const entryName = "Saved Encounters";
					let journal = game.journal?.getName?.(entryName) ?? game.journal?.find?.(j => j.name === entryName);
					if (!journal) {
						journal = await JournalEntry.create({ name: entryName });
					}

					// Build encounter HTML block for the page
					const now = new Date();
					const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
					const block = `
						<div style="border:1px solid #bbb;padding:8px;border-radius:8px;margin-bottom:.5rem;">
							<div style="font-weight:700;">${esc(encName)}</div>
							<div style="font-size:12px;opacity:.85;">
								Saved at <strong>${esc(timeStr)}</strong> • Party Lvl <strong>${partyLevel}</strong> • Size <strong>${partySize}</strong>
							</div>
							<div style="margin-top:4px;font-size:12px;">
								Difficulty: <strong>${difficulty}</strong> • Total XP: <strong>${baseTotalXP}</strong>
							</div>
							<div style="margin-top:6px;max-height:260px;overflow:auto;border:1px solid #ddd;border-radius:4px;">
								<table style="width:100%;border-collapse:collapse;font-size:12px;">
									<thead>
										<tr style="background:#00000014;">
											<th style="text-align:left;padding:.25rem .4rem;">Enemy</th>
											<th style="text-align:left;padding:.25rem .4rem;">Type</th>
											<th style="text-align:right;padding:.25rem .4rem;">Lvl</th>
											<th style="text-align:right;padding:.25rem .4rem;">vs PL</th>
											<th style="text-align:right;padding:.25rem .4rem;">XP</th>
										</tr>
									</thead>
									<tbody>
										${enemyRowsHTML}
									</tbody>
									<tfoot>
										<tr style="background:#00000008;">
											<td colspan="3" style="padding:.35rem .5rem;text-align:right;font-weight:700;">Total XP:</td>
											<td colspan="2" style="padding:.35rem .5rem;text-align:right;font-weight:800;">${baseTotalXP}</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>
					`.trim();

					// Page is named exactly as the Encounter Name
					let page = journal.pages?.getName?.(encName) ?? journal.pages?.find?.(p => p.name === encName);

					if (!page) {
						const created = await journal.createEmbeddedDocuments("JournalEntryPage", [{
							name: encName,
							type: "text",
							text: { content: block, format: 1 } // 1 = HTML
						}]);
						page = created?.[0];
					} else {
						const current = page.text?.content ?? "";
						const joiner = current.trim().length ? "<hr>" : "";
						await page.update({ "text.content": current + joiner + block });
					}

					ui.notifications.info(`Encounter saved to Journal → "Saved Encounter" › "${encName}"`);
				} catch (err) {
					console.error("Encounter save failed:", err);
					ui.notifications.error("Could not save encounter to journal (see console).");
				}
			}
		}, {
			action: "close",
			label: "Close",
			default: true
		}]
	}).render(true);
})();
