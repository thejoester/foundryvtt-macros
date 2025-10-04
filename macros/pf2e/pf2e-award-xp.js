/* ***************************************************************************
	Macro Title: PF2e v13 — Award Encounter XP from Selected Tokens (RAW + Journal)
	Author: TheJoester (https://github.com/thejoester)
	Last updated: 27-Sep-2025
	License: MIT License
	
	Description:
  - Select your PARTY (PC tokens) and the ENEMIES (NPC/Hazard tokens).
  - Party Level = average of selected PCs (round .5 up).
  - Ignores minions/familiars/companions (minion trait or type=familiar).
  - RAW: Award per PC = sum of creature XP (no party-size scaling).
  - Optional Custom XP + description.
  - Sends a pretty chat message.
  - Also logs to Journal "XP Log" with one page per date; creates if missing.
*************************************************************************** */
(async () => {
	if (!game.user.isGM) return ui.notifications.warn("Only the GM can award XP.");
	if (!canvas?.ready)   return ui.notifications.warn("Open a scene and select tokens first.");

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

	const pcTokens = [], foeTokens = [];
	for (const t of selected) {
		const a = t.actor; if (!a) continue;
		if (a.type === "character") { if (!isIgnoredCompanion(a)) pcTokens.push(t); continue; }
		if ((a.type === "npc" || a.type === "hazard") && !isIgnoredCompanion(a)) { foeTokens.push(t); continue; }
	}
	if (!pcTokens.length) return ui.notifications.warn("No valid PCs selected. Select at least one PC token.");

	// Party Level & size from selected PCs
	const pcLvls = pcTokens.map(t => Number(t.actor?.system?.details?.level?.value ?? 0)).filter(Number.isFinite);
	const avg = pcLvls.reduce((a,b)=>a+b,0) / Math.max(1, pcLvls.length);
	const partyLevel = Math.round(avg);
	const partySize  = pcTokens.length;

	// Foes → rows and total budget XP (RAW award per PC is this sum)
	const rows = [];
	let baseTotalXP = 0;
	for (const t of foeTokens) {
		const a = t.actor;
		const cl = Number(a?.system?.details?.level?.value ?? 0);
		const diff = cl - partyLevel;
		const xp = xpForDiff(diff);
		baseTotalXP += xp;
		rows.push({ name: t.name || a?.name || "(Unnamed)", type: a?.type ?? "npc", level: cl, diff, xp });
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

	// RAW per-PC award = sum of creature XP
	const autoAward = baseTotalXP;

	// Dialog 
	let result;
	try {
		result = await foundry.applications.api.DialogV2.prompt({
			window: { title: "Award XP", modal: true, width: 640 },
			content: `
				<section style="display:flex;flex-direction:column;gap:.75rem;">
					<div style="opacity:.9">
						<div><strong>Party Level:</strong> ${partyLevel} (${pcLvls.length} PC${pcLvls.length!==1?"s":""})</div>
						<div><strong>Party Size:</strong> ${partySize}</div>
						<div><strong>Enemies counted:</strong> ${rows.length}</div>
					</div>
					<div style="max-height:220px;overflow:auto;border:1px solid #00000022;border-radius:.25rem;">
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
								${rows.map(r => `
									<tr>
										<td style="padding:.3rem .5rem;border-top:1px solid #00000011;">${esc(r.name)}</td>
										<td style="padding:.3rem .5rem;border-top:1px solid #00000011;opacity:.8;">${esc(r.type)}</td>
										<td style="padding:.3rem .5rem;border-top:1px solid #00000011;text-align:right;">${r.level}</td>
										<td style="padding:.3rem .5rem;border-top:1px solid #00000011;text-align:right;">${sign(r.diff)}</td>
										<td style="padding:.3rem .5rem;border-top:1px solid #00000011;text-align:right;font-weight:600;">${r.xp}</td>
									</tr>
								`).join("")}
							</tbody>
							<tfoot>
								<tr style="background:#00000008;">
									<td colspan="3" style="padding:.35rem .5rem;text-align:right;font-weight:700;">Total XP (RAW per PC):</td>
									<td colspan="2" style="padding:.35rem .5rem;text-align:right;font-weight:800;">${baseTotalXP}</td>
								</tr>
								<tr style="background:#00000014;">
									<td colspan="3" style="padding:.35rem .5rem;text-align:right;font-weight:700;">Difficulty:</td>
									<td colspan="2" style="padding:.35rem .5rem;text-align:right;font-weight:900;">${difficulty}</td>
								</tr>
							</tfoot>
						</table>
					</div>
					<div style="display:flex;gap:1rem;align-items:center;">
						<label style="display:flex;align-items:center;gap:.4rem;">
							<input type="radio" name="mode" value="auto" checked>
							<span>${autoAward} XP</span>
						</label>
						<label style="display:flex;align-items:center;gap:.4rem;">
							<input type="radio" name="mode" value="custom">
							<span>Custom XP</span>
						</label>
						<input name="custom-xp" type="number" min="0" max="99999" value="${autoAward}" style="width:8rem;" />
					</div>
					<div>
						<label style="display:block;font-weight:600;margin-bottom:.25rem;">Note (optional)</label>
						<textarea name="note" rows="2" placeholder="What was this XP for?" style="width:100%;"></textarea>
					</div>
				</section>
			`,
			ok: {
				label: "Award XP to Party",
				callback: (ev, btn) => {
					const mode = btn.form?.elements?.mode?.value ?? "auto";
					let amount = autoAward;
					if (mode === "custom") {
						const val = btn.form?.elements?.["custom-xp"]?.valueAsNumber;
						if (!Number.isFinite(val) || val < 0 || val > 99999) throw new Error("Enter a valid Custom XP amount.");
						amount = Math.trunc(val);
					}
					const note = btn.form?.elements?.note?.value?.trim() ?? "";
					return { amount, note };
				}
			},
			cancel: { label: "Cancel" }
		});
	} catch { return console.log("XP award canceled."); }

	// Award to Party sheet (fallback to selected PCs)
	const { amount, note } = result ?? {};
	if (!Number.isFinite(amount)) return ui.notifications.error("No XP amount to award.");

	let recipients = game.actors.party?.members ?? [];
	if (!recipients.length) {
		ui.notifications.warn("No actors on the Party sheet; awarding to selected PCs instead.");
		const seen = new Set();
		recipients = pcTokens.map(t => t.actor).filter(a => a && !seen.has(a.id) && (seen.add(a.id) || true));
	}

	const changes = [];
	for (const actor of recipients) {
		const curr = Number(actor.system?.details?.xp?.value ?? 0);
		const next = curr + amount;
		await actor.update({ "system.details.xp.value": next });
		changes.push(`<strong>${esc(actor.name)}</strong>: ${curr} → ${next}`);
	}

	// Chat card
	const descriptionLine = note
		? `<div style="font-size:14px;font-style:italic;margin-bottom:12px;text-align:center;"><em>${esc(note)}</em></div>`
		: `<div style="font-size:14px;font-style:italic;margin-bottom:12px;text-align:center;">Difficulty (for party size): <strong>${difficulty}</strong>.</div>`;

	const flavor = `
		<div style="background:#1d1c1a;border:2px solid #5f574e;box-shadow:3px 3px 10px rgba(0,0,0,.6);border-radius:12px;padding:16px;color:#e4ddc7;max-width:680px;margin:auto;">
			<div style="text-align:center;font-weight:bold;font-size:16px;letter-spacing:1px;color:#c7b26f;margin-bottom:12px;">EXPERIENCE GAINED</div>
			${descriptionLine}
			<hr style="border:1px solid #5f574e;">
			<div style="font-size:14px;margin:8px 0;text-align:center;">
				Party Level <strong>${partyLevel}</strong> • Party Size <strong>${partySize}</strong> • Award <strong>${amount}</strong> XP each
			</div>
			<div style="max-height:180px;overflow:auto;margin-top:.5rem;">
				<table style="width:100%;border-collapse:collapse;font-size:12px;">
					<thead>
						<tr style="background:#00000014;">
							<th style="text-align:left;padding:.25rem .4rem;">Name</th>
							<th style="text-align:right;padding:.25rem .4rem;">Lvl</th>
							<th style="text-align:right;padding:.25rem .4rem;">Δ</th>
							<th style="text-align:right;padding:.25rem .4rem;">XP</th>
						</tr>
					</thead>
					<tbody>
						${rows.map(r => `
							<tr>
								<td style="padding:.25rem .4rem;border-top:1px solid #00000011;">${esc(r.name)}</td>
								<td style="padding:.25rem .4rem;border-top:1px solid #00000011;text-align:right;">${r.level}</td>
								<td style="padding:.25rem .4rem;border-top:1px solid #00000011;text-align:right;">${sign(r.diff)}</td>
								<td style="padding:.25rem .4rem;border-top:1px solid #00000011;text-align:right;font-weight:600;">${r.xp}</td>
							</tr>
						`).join("")}
					</tbody>
					<tfoot>
						<tr style="background:#00000008;">
							<td colspan="2" style="padding:.35rem .5rem;text-align:right;font-weight:700;">Total XP (RAW per PC):</td>
							<td colspan="2" style="padding:.35rem .5rem;text-align:right;font-weight:800;">${baseTotalXP}</td>
						</tr>
					</tfoot>
				</table>
			</div>
			<hr style="border:1px solid #5f574e;">
			<div style="font-size:15px;text-align:center;margin:12px 0;">Awarded <strong>${amount}</strong> XP to each party member:</div>
			<div style="text-align:center;font-size:14px;margin-bottom:10px;">${changes.join("<br>")}</div>
			<div style="font-size:12px;font-style:italic;text-align:center;color:#a09888;margin-top:6px;">The journey continues...</div>
		</div>
	`;
	ChatMessage.create({ content: flavor });

	// Journal Logging ("XP Log" → one page per date, create if missing)
	try {
		const entryName = "XP Log";
		let xpEntry = game.journal?.getName?.(entryName) ?? game.journal?.find?.(j => j.name === entryName);
		if (!xpEntry) xpEntry = await JournalEntry.create({ name: entryName });

		// Date page (local date, stable name like "Sep 27, 2025")
		const now = new Date();
		const pageName = now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
		let page = xpEntry.pages?.getName?.(pageName) ?? xpEntry.pages?.find?.(p => p.name === pageName);

		// Log block (compact; includes timestamp + recipients; enemies breakdown collapsible)
		const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
		const enemyRows = rows.map(r => `
			<tr>
				<td>${esc(r.name)}</td>
				<td style="text-align:right;">${r.level}</td>
				<td style="text-align:right;">${sign(r.diff)}</td>
				<td style="text-align:right;font-weight:600;">${r.xp}</td>
			</tr>
		`).join("");
		const logBlock = `
			<div style="border:1px solid #bbb;padding:8px;border-radius:8px;">
				<div style="font-weight:700;">${esc(timeStr)} — Awarded <strong>${amount}</strong> XP each</div>
				<div style="font-size:12px;opacity:.85;">Party Lvl <strong>${partyLevel}</strong> • Size <strong>${partySize}</strong> • Difficulty <strong>${difficulty}</strong></div>
				${note ? `<div style="font-style:italic;margin-top:4px;">${esc(note)}</div>` : ""}
				<div style="margin-top:6px;"><strong>Recipients</strong><br>${changes.join("<br>")}</div>
				<details style="margin-top:6px;">
					<summary style="cursor:pointer;">Encounter breakdown</summary>
					<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;">
						<thead>
							<tr>
								<th style="text-align:left;">Name</th>
								<th style="text-align:right;">Lvl</th>
								<th style="text-align:right;">vs PL</th>
								<th style="text-align:right;">XP</th>
							</tr>
						</thead>
						<tbody>${enemyRows}</tbody>
						<tfoot>
							<tr>
								<td colspan="3" style="text-align:right;font-weight:700;">Total</td>
								<td style="text-align:right;font-weight:700;">${baseTotalXP}</td>
							</tr>
						</tfoot>
					</table>
				</details>
			</div>`.trim();

		if (!page) {
			// Create new page for today
			const created = await xpEntry.createEmbeddedDocuments("JournalEntryPage", [{
				name: pageName,
				type: "text",
				text: { content: logBlock, format: 1 } // 1 = HTML
			}]);
			page = created?.[0];
		} else {
			// Append to existing page with a separator
			const current = page.text?.content ?? "";
			const joiner = current.trim().length ? "<hr>" : "";
			await page.update({ "text.content": current + joiner + logBlock });
		}

		ui.notifications.info(`XP logged to Journal → "${entryName}" › "${pageName}"`);
	} catch (err) {
		console.error("XP Log write failed:", err);
		ui.notifications.warn("Could not write XP Log journal entry (see console).");
	}
})();
