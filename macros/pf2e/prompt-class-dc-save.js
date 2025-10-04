/* ***************************************************************************
	Macro Title: Prompt Save/Check vs Class DC 
	Author: TheJoester
	Last updated: 04-Oct-2025
	License: MIT

	Notes:
	- Uses PF2e inline checks so ANY player can click to roll.
	- Includes plain target names (no UUID links) in the chat message.
*************************************************************************** */

if (!canvas.tokens.controlled.length) {
	ui.notifications.warn("Please select your token first.");
	return;
}

const token = canvas.tokens.controlled[0];
const actor = token.actor;

const classDC = actor.system?.attributes?.classDC?.value;
if (classDC == null) {
	ui.notifications.warn("This actor does not have a Class DC.");
	return;
}

// Collect current targets
const targets = Array.from(game.user.targets ?? []);
const targetList = targets.length
	? targets.map(t => t.name).join(", ")
	: "<em>None</em>";

// Define available checks
const saves = { fortitude: "Fortitude", reflex: "Reflex", will: "Will" };
const senses = { perception: "Perception" };
const skills = {
	acrobatics: "Acrobatics", arcana: "Arcana", athletics: "Athletics", crafting: "Crafting",
	deception: "Deception", diplomacy: "Diplomacy", intimidation: "Intimidation", medicine: "Medicine",
	nature: "Nature", occultism: "Occultism", performance: "Performance", religion: "Religion",
	society: "Society", stealth: "Stealth", survival: "Survival", thievery: "Thievery"
};

// Restrict dropdown to what THIS actor can roll
const valid = new Map();
for (const [key, label] of Object.entries({ ...saves, ...senses, ...skills })) {
	const stat = actor?.skills?.[key] ?? actor?.saves?.[key] ?? (key === "perception" ? actor?.perception : null);
	if (stat?.roll && typeof stat.roll === "function") valid.set(key, label);
}
if (valid.size === 0) {
	ui.notifications.warn("No valid checks available for this actor.");
	return;
}

// Build dropdown HTML
const makeGroup = (group, name, color) => {
	const entries = Object.entries(group)
		.filter(([k]) => valid.has(k))
		.map(([k, lbl]) => `<option value="${k}" style="color:${color};">${lbl}</option>`);
	return entries.length ? `<optgroup label="${name}">${entries.join("")}</optgroup>` : "";
};

const optionsHTML = [
	makeGroup(saves, "Saving Throws", "#4CAF50"),
	makeGroup(senses, "Senses", "#FFC107"),
	makeGroup(skills, "Skills", "#2196F3")
].join("");

// Create DialogV2 prompt
new foundry.applications.api.DialogV2({
	window: { title: "Choose Save or Check" },
	content: `
		<form>
			<div class="form-group">
				<label for="check-type">Type:</label>
				<select id="check-type" name="check-type" style="margin-left: 1em; width: 220px;">
					${optionsHTML}
				</select>
			</div>
			<p style="margin:0.5em 0 0;"><strong>DC:</strong> ${classDC} (Class DC)</p>
			<p style="margin:0.25em 0 0;"><strong>Targets:</strong> ${targetList}</p>
		</form>
	`,
	buttons: [{
		action: "post",
		label: "Post to Chat",
		default: true,
		callback: (event, button) => {
			const key = button.form.elements["check-type"].value;
			if (!key) return;

			const label =
				saves[key] ??
				senses[key] ??
				skills[key] ??
				key;

			const isSave = key in saves;
			const typeWord = isSave ? "Save" : "Check";

			// Inline check link (clickable by anyone)
			const inline = `@Check[type:${key}|dc:${classDC}]{Roll ${label} ${typeWord}}`;

			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				content: `
					<p><strong>${actor.name}</strong> requests a ${label} ${typeWord} vs DC <strong>${classDC}</strong>.</p>
					<p><strong>Targets:</strong> ${targetList}</p>
					<p>${inline}</p>
				`.trim()
			});
		}
	}, {
		action: "cancel",
		label: "Cancel"
	}]
}).render({ force: true });
