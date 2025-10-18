/*
******************************************************************

	Macro Title: Strategist Marshal Stance
	Author: TheJoester (https://github.com/thejoester)
	Description:
	- Prompt for difficulty (default Easy)
	- Roll Society or Warfare Lore (whichever is better) vs level DC
	- On success, apply Strategist's Aura

	Foundry Version: v12 - v13
	Last updated 16-July-2025
	License: MIT

******************************************************************
*/

(async () => {
	if (!token) {
		ui.notifications.warn("Please select a token.");
		return;
	}
	const actor = token.actor;
	if (!actor) {
		ui.notifications.error("No actor found for the selected token.");
		return;
	}

	// Level-based DC table (GMG / PF2e standard)
	const level = actor.system.details.level.value;
	const dcTable = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40];
	const baseDC = dcTable[level] || 10;

	const dcAdjustments = {
		"Incredibly easy": -10,
		"Very easy": -5,
		"Easy": -2,
		"Hard": 2,
		"Very hard": 5,
		"Incredibly hard": 10
	};
	const difficulties = Object.keys(dcAdjustments);

	// ── DialogV2: await user choice ───────────────────────────────
	const chosenDifficulty = await new Promise((resolve, reject) => {
		new foundry.applications.api.DialogV2({
			window: { title: "Strategist Marshal Stance" },
			content: `
				<form>
					<div class="form-group">
						<label>Choose Difficulty:</label>
						<select name="difficulty" autofocus>
							${difficulties.map(d => `<option value="${d}" ${d === "Easy" ? "selected" : ""}>${d}</option>`).join("")}
						</select>
					</div>
				</form>
			`,
			buttons: [{
				action: "roll",
				label: "Roll",
				default: true,
				callback: (event, button) => button.form.elements.difficulty.value
			}, {
				action: "cancel",
				label: "Cancel"
			}],
			submit: (result) => {
				if (!result || result === "cancel") return reject(new Error("cancelled"));
				resolve(result);
			}
		}).render(true);
	}).catch(() => null);

	if (!chosenDifficulty) return; // user cancelled

	const dc = baseDC + (dcAdjustments[chosenDifficulty] ?? 0);

	// ── Choose the better skill: Society vs Warfare Lore ──────────
	// Use PF2e's skill objects so we can call check.roll()
	const skills = actor.skills ?? actor.system.skills ?? {};
	const society = skills.society ?? null;

	// Warfare Lore key is typically "warfare-lore"
	const warfare = skills["warfare-lore"] ?? skills["warfare_lore"] ?? null;

	// Helper to get total modifier in a tolerant way
	const getMod = (s) => {
		if (!s) return -9999;
		// Prefer .totalModifier (newer PF2e), else .mod, else sum modifiers
		if (typeof s.totalModifier === "number") return s.totalModifier;
		if (typeof s.mod === "number") return s.mod;
		const mods = s.modifiers?.filter?.(m => m.enabled) ?? [];
		return mods.reduce((sum, m) => sum + (m.modifier || 0), 0);
	};

	const socMod = getMod(society);
	const warMod = getMod(warfare);

	// Pick the better; if Warfare Lore doesn't exist, Society wins by default
	const chosenSkill = warMod > socMod ? warfare : society;
	const chosenLabel = (chosenSkill === warfare) ? "Warfare Lore" : "Society";

	if (!chosenSkill?.check?.roll) {
		ui.notifications.error(`Could not find a rollable ${chosenLabel} skill on this actor.`);
		return;
	}

	// ── PF2e check roll (proper chat card => right-click reroll) ──
	const flavor = `${chosenLabel} Check vs ${chosenDifficulty} (DC ${dc}) — Strategist Marshal Stance`;
	let outcomeLabel = null;

	await chosenSkill.check.roll({
		dc: { value: dc },
		flavor,
		skipDialog: true,
		extraRollOptions: ["action:strategist-marshal-stance"],
		traits: ["auditory", "mental"], // tweak if you like
		callback: (roll, outcome /* "criticalSuccess"|"success"|"failure"|"criticalFailure" */, message) => {
			outcomeLabel = outcome;
		}
	});

	// Fallback if outcome wasn't provided by callback (API version variance)
	if (!outcomeLabel) {
		const last = [...game.messages].reverse().find(m =>
			m.speaker?.actor === actor.id &&
			m.flags?.pf2e?.context?.type === "check" &&
			typeof m.flags?.pf2e?.context?.dc?.value === "number" &&
			String(m.flavor || m.content || "").includes("Strategist Marshal Stance")
		);
		outcomeLabel = last?.flags?.pf2e?.context?.outcome ?? null;
	}

	// ── Apply Strategist's Aura on success ────────────────────────
	let resultMessage = `<hr><p>${chosenLabel} Result: <strong>${outcomeLabel ?? "—"}</strong></p>`;
	if (outcomeLabel === "success" || outcomeLabel === "criticalSuccess") {
		const auraUUID = "Compendium.pf2e.feat-effects.Item.z6oLNlBs724PCcR6"; // Strategist's Aura
		const existingAura = actor.items.find(i => i.system?.slug === "strategists-aura");
		if (!existingAura) {
			const compendiumItem = await fromUuid(auraUUID);
			if (compendiumItem) {
				await actor.createEmbeddedDocuments("Item", [compendiumItem.toObject()]);
				resultMessage += `<p><strong>Strategist's Aura has been added to the actor.</strong></p>`;
			} else {
				resultMessage += `<p><strong style="color:red;">Failed to find Strategist's Aura in the compendium.</strong></p>`;
			}
		} else {
			resultMessage += `<p><em>Strategist's Aura is already active.</em></p>`;
		}
	} else if (outcomeLabel) {
		resultMessage += `<p><em>No effect applied.</em></p>`;
	} else {
		resultMessage += `<p><em>Could not determine outcome from the chat card.</em></p>`;
	}

	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor }),
		content: resultMessage
	});
})();
