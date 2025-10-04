/*
***************************************************************************
	Macro Title: Party Recall Knowledge
	Author: TheJoester (https://github.com/thejoester)
	Last updated: 1-Aug-2025
  Foundry Version: v12-v13
  System: pf2e
	License: MIT License
	
	Description:
	GM macro for FoundryVTT PF2e that rolls Recall Knowledge across all 
	party members. One d20 roll is used per actor, and skill-specific 
	modifiers are applied to compute totals. Results are color-coded and 
	shown in a compact dialog with tooltips displaying roll breakdowns.
	Usage:
	- Must be run by a GM
	- Uses the current party members (not selected tokens)
	- Hover over results to see dice breakdown
	- Save to Journal "RK History"
***************************************************************************
*/

(async () => {
	if (!game.user.isGM) {
		ui.notifications.warn("Only the GM can use this macro.");
		return;
	}

	// Use the party actors & Only include player characters (not NPCs, animals, etc.)
	const party = game.actors.party;
	if (!party || !party.members.length) {
		ui.notifications.warn("No party or party members found.");
		return;
	}
	const actors = party.members.filter(a => a.type === "character");

	// Prompt for Recall Knowledge DC
	let dc;
	try {
		dc = await foundry.applications.api.DialogV2.prompt({
			window: { title: "Recall Knowledge" },
			content: `
				<div style="display: flex; flex-direction: column; gap: 0.5em;">
					<label>Target DC:
						<input name="dc" type="number" min="0" step="1" value="20" autofocus style="margin-left: 1em; width: 80px;">
					</label>
				</div>
			`,
			ok: {
				label: "Recall Knowledge",
				callback: (event, button, dialog) => {
					const val = button.form.elements.dc.valueAsNumber;
					if (!val || val <= 0) throw new Error("Invalid DC");
					return val;
				}
			},
		});
	} catch {
		ui.notifications.warn("Recall Knowledge canceled.");
		return;
	}

	// Core RK skills
	const rkSkills = [
		"arcana", "crafting", "medicine", "nature", "occultism",
		"religion", "society", "survival", "thievery",
		"deception", "diplomacy", "intimidation"
	];
	const results = {}; // skillLabel -> { actorName -> { total, tag, breakdown, outcome } }
	const loreLabels = new Set();
	const actorRolls = {}; // Store each actor's single d20 roll

	// Loop over actors
	for (const actor of actors) {
		const actorName = actor.name;

		// Roll one d20 per actor
		const d20Roll = await new Roll("1d20").evaluate({ async: false });
		const dieResult = d20Roll.total;
		actorRolls[actorName] = dieResult;

		// Standard skills
		for (const skillKey of rkSkills) {
			const skill = actor.skills[skillKey];
			if (!skill) continue;

			const modifier = skill.mod ?? 0;
			const total = dieResult + modifier;
			const rank = skill.rank ?? 0;
			const tag = ["T", "E", "M", "L", "L"][rank] ?? "U";

			// Determine outcome based on result and nat 20/1 rules
			let outcome = "fail";
			if (total >= dc + 10) outcome = "crit";
			else if (total >= dc) outcome = "success";
			else if (total < dc - 10) outcome = "critfail";

			if (dieResult === 20) {
				if (outcome === "fail") outcome = "success";
				else if (outcome === "success") outcome = "crit";
			} else if (dieResult === 1) {
				if (outcome === "crit") outcome = "success";
				else if (outcome === "success") outcome = "fail";
				else if (outcome === "fail") outcome = "critfail";
			}

			results[skill.label] ??= {};
			results[skill.label][actorName] = {
				total,
				tag,
				outcome,
				breakdown: `${dieResult} + ${modifier} = ${total}`
			};
		}

		// Lore skills
		for (const [_, lore] of Object.entries(actor.skills).filter(([_, s]) => s?.lore)) {
			const modifier = lore.mod ?? 0;
			const total = dieResult + modifier;
			const rank = lore.rank ?? 0;
			const tag = ["T", "E", "M", "L", "L"][rank] ?? "U";
			const cleanLabel = lore.label.replace(/lore/gi, "").trim();

			// Determine outcome based on result and nat 20/1 rules
			let outcome = "fail";
			if (total >= dc + 10) outcome = "crit";
			else if (total >= dc) outcome = "success";
			else if (total < dc - 10) outcome = "critfail";

			if (dieResult === 20) {
				if (outcome === "fail") outcome = "success";
				else if (outcome === "success") outcome = "crit";
			} else if (dieResult === 1) {
				if (outcome === "crit") outcome = "success";
				else if (outcome === "success") outcome = "fail";
				else if (outcome === "fail") outcome = "critfail";
			}

			results[cleanLabel] ??= {};
			results[cleanLabel][actorName] = {
				total,
				tag,
				outcome,
				breakdown: `${dieResult} + ${modifier} = ${total}`
			};
			loreLabels.add(cleanLabel);
		}
	}

	const allLabels = Object.keys(results);
	const sortedLabels = [
		...allLabels.filter(label => !loreLabels.has(label)).sort(),
		...[...loreLabels].sort()
	];

	// Build list of actor names (shortened if long)
	const actorNames = actors.map(actor =>
		actor.name.length > 15 ? actor.name.split(" ")[0] : actor.name
	);

	// Build table HTML
	const headerRow = `<tr><th style="text-align:left;">Skill</th>${actorNames.map(n => `<th style="text-align:left;">${n}</th>`).join("")}</tr>`;
	const rollRow = `<tr><td><strong>Roll</strong></td>${actors.map(a => `<td style="text-align:center;">${actorRolls[a.name]}</td>`).join("")}</tr>`;
	const bodyRows = sortedLabels.map(skill => {
		const rowCells = actors.map(actor => {
			const result = results[skill]?.[actor.name];
			if (!result) return `<td></td>`;
			const { total, tag, outcome, breakdown } = result;

			const color = {
				crit: "#4CAF50",
				success: "#2196F3",
				fail: "#FF9800",
				critfail: "#F44336"
			}[outcome];

			return `<td style="text-align: center;" title="${breakdown}">
				<strong style="color: ${color};">${total} (${tag})</strong>
			</td>`;
		}).join("");

		return `<tr><td><strong>${skill}</strong></td>${rowCells}</tr>`;
	}).join("");

	const content = `
		<h3 style="margin: 0 0 0.5em 0;">Recall Knowledge Check (DC ${dc})</h3>
		<div style="overflow-x: auto; max-height: 70vh;">
			<table style="width: 100%; border-collapse: collapse;">
				<thead style="border-bottom: 1px solid #888;">${headerRow}</thead>
				<tbody>
					${rollRow}
					${bodyRows}
				</tbody>
			</table>
		</div>
	`;

	// Show final dialog with results
	new foundry.applications.api.DialogV2({
		window: { title: "Group Recall Knowledge Results" },
		content,
		buttons: [
			{
				action: "save",
				label: "Save",
				callback: async () => {
					const description = await foundry.applications.api.DialogV2.prompt({
						window: { title: "Optional Description" },
						content: `
							<div style="min-width: 300px; max-height: 70vh; overflow-y: auto; padding-right: 1em;">
								<div style="display: flex; flex-direction: column; gap: 0.5em;">
									<label>Enter a description (optional):</label>
									<textarea name="desc" rows="3" style="width: 100%;" placeholder="e.g. Creatures from ruined watchtower, southeast of Thorn Ford."></textarea>
								</div>
							</div>
						`,
						ok: {
							label: "Save to Journal",
							callback: (event, button, dialog) => button.form.elements.desc.value
						}
					}).catch(() => null);

					let journal = game.journal.getName("RK History");
					if (!journal) {
						journal = await JournalEntry.create({ name: "RK History", pages: [] });
					}

					const timestamp = new Date().toLocaleString();
					const fullContent = `
						
						${description ? `<p><em>${description}</em></p>` : ""}
						${content}
					`;

					const page = await journal.createEmbeddedDocuments("JournalEntryPage", [{
						name: `RK ${timestamp}`,
						type: "text",
						text: { content: fullContent, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML }
					}]);

					const chatContent = `
						<div class="chat-card">
							<header class="card-header flexrow">
								<!-- <img src="icons/skills/trades/academics-book-study-runes.webp"
									 style="width: 36px; height: 36px; object-fit: contain;" alt="Book Icon"> -->
								<h3>DC ${dc} RK Results Saved</h3>
							</header>
							<section class="card-content">
								<p>@UUID[${page[0].uuid}]{Recall Knowledge Check (DC ${dc})}</p>
							</section>
						</div>
					`;

					ChatMessage.create({
						user: game.user.id,
						content: chatContent,
						whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
					});

					ui.notifications.info(`Saved to RK History journal.`);
				}
			},
			{
				action: "close",
				label: "Close",
				default: true
			}
		]
	}).render(true);
})();
