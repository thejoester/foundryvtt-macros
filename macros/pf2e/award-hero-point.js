/* ***************************************************************************
	Macro Title: Award Hero Points
	Author: TheJoester (https://github.com/thejoester)
  	Last updated 04-OCT-2025
	License: MIT License
  	Foundry Version: v12+ / v13
  	System: PF2e
  
	Description:
  	Award all actors in party hero points. 
  	- Choose to Add or Set value
  	- Outputs message to chat
*************************************************************************** */

(async () => {
	
	if (!game.user.isGM) {
		ui.notifications.warn("Only the GM can award Hero Points.");
		return;
	}

	let formData;
	try {
		formData = await foundry.applications.api.DialogV2.prompt({
			window: { title: "Award Hero Points" },
			content: `
				<div style="display: flex; align-items: center; gap: 1em;">
					<input id="hero-amount" name="hero-amount" type="number" min="0" max="3" step="1" value="1" style="width: 60px;" />
					<label><input type="radio" name="mode" value="add" checked> Add</label>
					<label><input type="radio" name="mode" value="set"> Set</label>
				</div>
			`,
			ok: {
				label: "Apply",
				callback: (event, button) => {
					const val = button.form.elements["hero-amount"].valueAsNumber;
					const mode = button.form.elements["mode"].value;
					if (val < 0 || val > 3) throw new Error("Enter a number between 0 and 3.");
					return { amount: val, mode };
				}
			}
		});
	} catch {
		console.log("Hero Point award canceled.");
		return;
	}

	const { amount, mode } = formData;
	const awarded = [];
	const updatedActorIds = new Set();
	const partyActors = game.actors.party?.members ?? [];

	if (partyActors.length === 0) {
		ui.notifications.warn("No party members found in the Party group.");
		return;
	}

	for (const actor of partyActors) {
		if (!actor || updatedActorIds.has(actor.id)) continue;
		const heroPoints = actor.system?.resources?.heroPoints;
		if (!heroPoints) continue;

		const current = heroPoints.value ?? 0;
		const max = heroPoints.max ?? 3;
		const newTotal = mode === "set" ? Math.min(amount, max) : Math.min(current + amount, max);

		await actor.update({ "system.resources.heroPoints.value": newTotal });
		awarded.push(`<strong>${actor.name}</strong>: ${current} → ${newTotal}`);
		updatedActorIds.add(actor.id);
	}

	if (awarded.length === 0) {
		ui.notifications.info("No eligible actors were updated.");
		return;
	}

	const flavorText = `
		<div style="
			background-color:#1d1c1a;
			border: 2px solid #5f574e;
			box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.6);
			border-radius: 12px;
			padding: 16px;
			color: #e4ddc7;
			font-family: 'serif';
			max-width: 500px;
			margin: auto;
			text-align: center;
		">

			<div style="display: flex; justify-content: center; margin-bottom: 10px;">
				<img src="systems/pf2e/icons/features/feats/heroic-recovery.webp"
					width="80" height="80"
					style="display:block; margin:auto; border:none; filter: drop-shadow(0 0 6px #c7b26f);" />
			</div>

			<div style="font-weight: bold; font-size: 18px; letter-spacing: 1px; color: #c7b26f; margin-bottom: 12px;">
				HEROIC INSPIRATION
			</div>

			<div style="font-size: 14px; font-style: italic; margin-bottom: 12px;">
				Fortune favors the bold.<br>The tale shifts, a second chance emerges...
			</div>

			<hr style="border: 1px solid #5f574e;">

			<div style="font-size: 15px; margin: 12px 0;">
				${mode === "set"
					? `Set Hero Points to <strong>${amount}</strong> for each:`
					: `Awarded <strong>${amount}</strong> Hero Point${amount > 1 ? "s" : ""} to each:`}
			</div>

			<div style="font-size: 14px; margin-bottom: 10px;">
				${awarded.join("<br>")}
			</div>

			<hr style="border: 1px solid #5f574e;">

			<div style="font-size: 12px; font-style: italic; color: #a09888; margin-top: 6px;">
				Their destinies are not yet sealed.
			</div>
		</div>
	`;


	await ChatMessage.create({ content: flavorText, speaker: { alias: "GM" } });
})();
