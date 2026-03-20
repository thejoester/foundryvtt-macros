/* ============================================================================
	Macro Title: "Expert Only" Check
	Author: TheJoester (https://github.com/thejoester)
	Last updated 20-March-2026
	License: MIT License
	
	Description: 
		Will prompt only the player character who has the best bonus for the
		selected check/save. If two or more player characters have the same
		bonus, GM can select to be prompted or randomly choose. 
	- Select PC tokens
	- Pick a check (skill/perception/save)
	- Chat prompts the top-mod actor with a Roll link
	
	Foundry Version: v13.346+
		
============================================================================ */

(async () => {
	// --- Helpers ---
	function esc(s) {
		return foundry.utils.escapeHTML(String(s ?? ""));
	}

	function randomPick(arr) {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	function getSelectedPCActors() {
		const tokens = canvas?.tokens?.controlled ?? [];
		const actors = tokens
			.map(t => t.actor)
			.filter(a =>
				a &&
				a.type === "character" &&
				a.hasPlayerOwner === true
			);

		// de-dupe by id
		const seen = new Set();
		return actors.filter(a => (seen.has(a.id) ? false : (seen.add(a.id), true)));
	}

	function getCheckOptions() {
		// PF2e standard skill slugs
		const skillSlugs = [
			"acrobatics", "arcana", "athletics", "crafting", "deception", "diplomacy",
			"intimidation", "medicine", "nature", "occultism", "performance", "religion",
			"society", "stealth", "survival", "thievery"
		];

		const saves = ["fortitude", "reflex", "will"];

		const options = [];
		options.push({ type: "perception", slug: "perception", label: "Perception" });

		for (const s of saves) {
			const label = s.charAt(0).toUpperCase() + s.slice(1);
			options.push({ type: "save", slug: s, label: `${label} Save` });
		}

		for (const sk of skillSlugs) {
			const label = sk.charAt(0).toUpperCase() + sk.slice(1);
			options.push({ type: "skill", slug: sk, label });
		}

		return options;
	}

	function getModifier(actor, check) {
		try {
			if (!actor) return 0;

			// Perception is a Statistic on the actor in PF2e (not a skill)
			if (check.type === "perception") {
				const p = actor.perception;
				return Number(
					p?.mod
					?? p?.modifier
					?? actor?.system?.attributes?.perception?.mod
					?? actor?.system?.attributes?.perception?.value
					?? 0
				);
			}

			// Saves are typically Statistics too
			if (check.type === "save") {
				const s = actor.saves?.[check.slug];
				return Number(
					s?.mod
					?? s?.modifier
					?? actor?.system?.saves?.[check.slug]?.mod
					?? actor?.system?.saves?.[check.slug]?.value
					?? 0
				);
			}

			// Skills
			const sk = actor.skills?.[check.slug];
			return Number(
				sk?.mod
				?? sk?.modifier
				?? actor?.system?.skills?.[check.slug]?.mod
				?? actor?.system?.skills?.[check.slug]?.modifier
				?? actor?.system?.skills?.[check.slug]?.value
				?? 0
			);
		} catch {
			return 0;
		}
	}

	// --- Main ---
	const actors = getSelectedPCActors();
	if (!actors.length) {
		return ui.notifications.warn("Select one or more PLAYER CHARACTER tokens first.");
	}

	const checkOptions = getCheckOptions();
	const checkSelectHTML = `
		<div class="form-group">
			<label>Check</label>
			<select name="check" style="width: 100%;">
				${checkOptions.map((o, i) => `<option value="${i}">${esc(o.label)}</option>`).join("")}
			</select>
			<p class="hint">Finds the highest modifier from selected PCs and posts an inline @Check in chat.</p>
		</div>
		<hr/>
		<div class="form-group">
			<label>Tie handling</label>
			<select name="tieMode" style="width: 100%;">
				<option value="prompt" selected>Prompt me to choose</option>
				<option value="random">Randomly choose among tied</option>
			</select>
		</div>
	`;

	let selection;
	try {
		selection = await new Promise((resolve, reject) => {
			new foundry.applications.api.DialogV2({
				window: { title: "Expert Only Check" },
				content: checkSelectHTML,
				buttons: [
					{
						action: "go",
						label: "Continue",
						default: true,
						callback: (event, button, dialog) => {
							const form = button.form;
							const idx = Number(form.elements.check.value);
							const tieMode = form.elements.tieMode.value;
							resolve({ check: checkOptions[idx], tieMode });
						}
					},
					{
						action: "cancel",
						label: "Cancel",
						callback: () => reject(new Error("cancel"))
					}
				]
			}).render(true);
		});
	} catch {
		return;
	}

	const chosenCheck = selection.check;

	// Score actors
	const scored = actors.map(a => ({
		actor: a,
		mod: getModifier(a, chosenCheck)
	}));

	const bestMod = Math.max(...scored.map(s => s.mod));
	const tied = scored.filter(s => s.mod === bestMod);

	let winner = tied[0];

	if (tied.length > 1) {
		if (selection.tieMode === "random") {
			winner = randomPick(tied);
		} else {
			// Prompt tie-break
			const tieHTML = `
				<div style="margin-bottom: 0.5rem;">
					Tie detected for <b>${esc(chosenCheck.label)}</b> at <b>${bestMod >= 0 ? "+" : ""}${bestMod}</b>.
					Choose who rolls:
				</div>
				<div class="form-group">
					<select name="who" style="width: 100%;">
						${tied.map((t, i) => `<option value="${i}">${esc(t.actor.name)} (${bestMod >= 0 ? "+" : ""}${bestMod})</option>`).join("")}
					</select>
				</div>
			`;

			try {
				winner = await new Promise((resolve, reject) => {
					new foundry.applications.api.DialogV2({
						window: { title: "Tie Breaker" },
						content: tieHTML,
						buttons: [
							{
								action: "pick",
								label: "Select",
								default: true,
								callback: (event, button, dialog) => {
									const idx = Number(button.form.elements.who.value);
									resolve(tied[idx]);
								}
							},
							{
								action: "cancel",
								label: "Cancel",
								callback: () => reject(new Error("cancel"))
							}
						]
					}).render(true);
				});
			} catch {
				return;
			}
		}
	}

	const winnerActor = winner.actor;
	const modText = `${bestMod >= 0 ? "+" : ""}${bestMod}`;

	// PF2e inline check syntax: @Check[type:acrobatics|dc:18]{Acrobatics}
	// Here we omit DC on purpose; user can set DCs as they like.
	const inlineCheck = `@Check[type:${chosenCheck.slug}]{${chosenCheck.label}}`;

	const content = `
		<div class="pf2e-expert-only">
			<p>
				<b>Expert Only Check:</b> ${esc(chosenCheck.label)}<br/>
				Highest modifier: <b>${esc(winnerActor.name)}</b> (${esc(modText)})
			</p>
			<p>
				${esc(winnerActor.name)}: click to roll → ${inlineCheck}
			</p>
		</div>
	`;

	await ChatMessage.create({
		content,
		speaker: ChatMessage.getSpeaker({ actor: winnerActor })
	});
})();
