/*
******************************************************************

	Macro Title: Inspiring Marshal Stance
	Author: TheJoester (https://github.com/thejoester)
	Description:
	This macro is for players with the Inspiring Marshal Stance from 
	the Marshall Dedication. 
	
	- Prompt for difficulty, defaults to easy
	- Rolls Diplomacy check based on difficulty for level 
 	- If the roll is a success, it will apply the "Inspiring 
	Marshal Stance" Aura on the player. 

	Foundry Version: v12 - v13
	Last updated 16-July-2025

	Author: TheJoester (https://github.com/thejoester)
	License: MIT License

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

	// ── DialogV2 (await via Promise) ──────────────────────────────
	const chosenDifficulty = await new Promise((resolve, reject) => {
		new foundry.applications.api.DialogV2({
			window: { title: "Inspiring Marshal Stance" },
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
				// Return the selected difficulty; DialogV2 will pass this to submit(result)
				callback: (event, button) => button.form.elements.difficulty.value
			}, {
				action: "cancel",
				label: "Cancel"
			}],
			submit: (result) => {
				if (!result || result === "cancel") return reject(new Error("cancelled"));
				resolve(result); // result is the value returned by the "roll" button callback
			}
		}).render(true);
	}).catch(() => null);

	if (!chosenDifficulty) return; // user cancelled

	const dc = baseDC + (dcAdjustments[chosenDifficulty] ?? 0);

	// ── PF2e skill check roll (enables right-click reroll on chat card) ──
	const flavor = `Diplomacy Check vs ${chosenDifficulty} (DC ${dc}) — Inspiring Marshal Stance`;
	let outcomeLabel = null;

	await actor.skills.diplomacy.check.roll({
		dc: { value: dc },
		flavor,
		skipDialog: true,
		extraRollOptions: ["action:inspiring-marshal-stance"],
		traits: ["auditory", "emotion", "mental"],
		callback: (roll, outcome/* "criticalSuccess"|"success"|"failure"|"criticalFailure" */, message) => {
			outcomeLabel = outcome;
		}
	});

	// Fallback: infer outcome from the last PF2e check card if callback didn't supply it
	if (!outcomeLabel) {
		const last = [...game.messages].reverse().find(m =>
			m.speaker?.actor === actor.id &&
			m.flags?.pf2e?.context?.type === "check" &&
			typeof m.flags?.pf2e?.context?.dc?.value === "number" &&
			String(m.flavor || m.content || "").includes("Inspiring Marshal Stance")
		);
		outcomeLabel = last?.flags?.pf2e?.context?.outcome ?? null;
	}

	// ── Apply the aura on success (same behavior as before) ──
	let resultMessage = `<hr><p>Result: <strong>${outcomeLabel ?? "—"}</strong></p>`;
	if (outcomeLabel === "success" || outcomeLabel === "criticalSuccess") {
		const auraUUID = "Compendium.pf2e.feat-effects.Item.er5tvDNvpbcnlbHQ";
		const existingAura = actor.items.find(item => item.system?.slug === "marshals-aura");
		if (!existingAura) {
			const compendiumItem = await fromUuid(auraUUID);
			if (compendiumItem) {
				await actor.createEmbeddedDocuments("Item", [compendiumItem.toObject()]);
				resultMessage += `<p><strong>Marshal's Aura has been added to the actor.</strong></p>`;
			} else {
				resultMessage += `<p><strong style="color:red;">Failed to find Marshal's Aura in the compendium.</strong></p>`;
			}
		} else {
			resultMessage += `<p><em>Marshal's Aura is already active.</em></p>`;
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
