/* ***************************************************************************
	Macro Title: Group Roll Macro for Foundry VTT PF2e
	Author: TheJoester (https://github.com/thejoester)
	Last updated 30-July-2025
  Foundry Version: v12+ / v13.346
  System: PF2e
	License: MIT License
	
	Description:
	Allows the GM to select one check (save, skill, or perception) 
	and rolls it blindly for all selected tokens (PC or NPC). 
	Results are shown in a dialog with clickable icons to ping and 
	select each token.
	
	Usage: Select one or many tokens, Run this macro as a GM
************************************************************************** */

(async () => {
	
	// Only the GM should be able to run this macro
	if (!game.user.isGM) {
		ui.notifications.warn("Only the GM can use this macro.");
		return;
	}

	// Get all selected tokens that have actors
	const tokens = canvas.tokens.controlled.filter(t => !!t.actor);
	if (tokens.length === 0) {
		ui.notifications.warn("Select at least one token.");
		return;
	}

	// Define available checks (grouped and color coded)
	const saves = {
		fortitude: "Fortitude",
		reflex: "Reflex",
		will: "Will"
	};

	const senses = {
		perception: "Perception"
	};

	const skills = {
		acrobatics: "Acrobatics",
		arcana: "Arcana",
		athletics: "Athletics",
		crafting: "Crafting",
		deception: "Deception",
		diplomacy: "Diplomacy",
		intimidation: "Intimidation",
		medicine: "Medicine",
		nature: "Nature",
		occultism: "Occultism",
		performance: "Performance",
		religion: "Religion",
		society: "Society",
		stealth: "Stealth",
		survival: "Survival",
		thievery: "Thievery"
	};

	const validChecks = new Map();

	// Check which entries are valid for at least one token
	for (const [key, label] of Object.entries({ ...saves, ...senses, ...skills })) {
		for (const token of tokens) {
			const actor = token.actor;
			const stat =
				actor.skills?.[key] ??
				actor.saves?.[key] ??
				(key === "perception" ? actor.perception : null);

			if (stat?.roll && typeof stat.roll === "function") {
				validChecks.set(key, label);
				break;
			}
		}
	}

	if (validChecks.size === 0) {
		ui.notifications.warn("No valid checks found.");
		return;
	}

	// Utility to build dropdown optgroups with color-coding
	const makeGroup = (group, name, color) => {
		const entries = Object.entries(group)
			.filter(([key]) => validChecks.has(key))
			.map(([key, label]) =>
				`<option value="${key}" style="color:${color};">${label}</option>`
			);
		return entries.length ? `<optgroup label="${name}">${entries.join("")}</optgroup>` : "";
	};
	
	// Generate dropdown HTML
	const optionsHTML = [
		makeGroup(saves, "Saving Throws", "#4CAF50"),   // green
		makeGroup(senses, "Senses", "#FFC107"),         // yellow
		makeGroup(skills, "Skills", "#2196F3")          // blue
	].join("");


	// Prompt the GM to choose a check from dropdown
	let selectedCheck;
	selectedCheck = await foundry.applications.api.DialogV2.prompt({
		window: { title: "Select a Check to Roll" },
		content: `
			<label>
				Check:
				<select name="check" style="margin-left: 1em; width: 200px;">
					${optionsHTML}
				</select>
			</label>
		`,
		ok: {
			label: "Roll",
			callback: (event, button, dialog) => button.form.check.value
		}
	});
	
	// User closed the dialog or didn't select a value
	if (!selectedCheck) {
		ui.notifications.warn("Group check canceled.");
		return;
	}

	// Get display label for the selected check
	const label =
		saves[selectedCheck] ??
		senses[selectedCheck] ??
		skills[selectedCheck] ??
		selectedCheck;

	// Roll for each token and store result
	const results = {};
	for (const token of tokens) {
		const actor = token.actor;
		const stat =
			actor.skills?.[selectedCheck] ??
			actor.saves?.[selectedCheck] ??
			(selectedCheck === "perception" ? actor.perception : null);

		if (!stat || typeof stat.roll !== "function") continue;

		const roll = await stat.roll({
			skipDialog: true,
			blind: true,
			createMessage: false
		});

		if (!roll) continue;
	
		// Check for nat 20 on any d20 rolled
		const rollData = roll.terms.find(t => t instanceof Die && t.faces === 20);
		const nat20 = rollData?.results?.some(r => r.result === 20) ?? false;

		results[actor.name] = {
			total: roll.total,
			nat20,
			tokenId: token.id
		};
	}

	// Build result table rows with ping buttons
	const headerRow = `<tr><th style="text-align:left;">Actor</th><th style="text-align:left;">Result</th></tr>`;
	const bodyRows = tokens.map(token => {
		const name = token.actor.name;
		const result = results[name];
		const tokenId = result?.tokenId;
		const color = result?.nat20 ? "#4CAF50" : "#fff";

		return `
			<tr>
				<td style="display: flex; align-items: center; gap: 0.5em;">
					<span data-token-id="${tokenId}" class="ping-token" title="Ping Token" style="cursor: pointer;">
						<i class="fas fa-eye"></i>
					</span>
					${name}
				</td>
				<td style="color: ${color}; text-align: center;">
					<strong>${result?.total ?? ""}</strong>
				</td>
			</tr>
		`;
	}).join("");

	// Assemble final dialog content
	const content = `
		<h3 style="margin-top: 0;">${label} ${saves[selectedCheck] ? "Save" : "Check"}</h3>
		<div style="overflow-x: auto; max-height: 70vh;">
			<table style="width: 100%; border-collapse: collapse;">
				<thead style="border-bottom: 1px solid #888;">${headerRow}</thead>
				<tbody>${bodyRows}</tbody>
			</table>
		</div>
	`;

	// Show results dialog
	new foundry.applications.api.DialogV2({
		window: { title: "Group Check Results" },
		content,
		buttons: [{
			action: "close",
			label: "Close",
			default: true
		}]
	}).render(true);
	
	// Handle token ping when eye icon is clicked (works in v12 and v13)
	Hooks.once("renderDialogV2", (app, html) => {
		html.querySelectorAll(".ping-token").forEach(el => {
			el.addEventListener("click", async event => {
				event.preventDefault();
				event.stopPropagation();

				const tokenId = el.dataset.tokenId;
				const token = canvas.tokens.placeables.find(t => t.id === tokenId);

				if (!token) {
					ui.notifications.warn("Token not found on canvas.");
					return;
				}

				canvas.tokens.releaseAll();
				await token.control({ releaseOthers: true });
				canvas.ping(token.center, { duration: 1000, icon: "icons/svg/eye.svg" });
			});
		});
	});

})();
