/*
******************************************************************

	Macro Title: Inspiring Marshal Stance
	Author: TheJoester (https://github.com/thejoester)
	Description:
	This macro is for players with the Inspiring Marshal Stance from 
	the Marshall Dedication. 
	
	Will roll an easy Diplomacy check for character level of selected
	token. If the roll is a success, it will apply the "Inspiring 
	Marshal Stance" Aura on the player. 
	
	- Will check that token was selected and that the character has 
	Inspiring Marshal Stance feat.

	Foundry Version: 12
	Last updated 12-Jan-2025

	Author: TheJoester (https://github.com/thejoester)
	License: MIT License

******************************************************************
*/

(async () => {
    // Check if a token is selected
    if (!token) {
        ui.notifications.warn("Please select a token.");
        return;
    }

    // Get the actor from the selected token
    const actor = token.actor;

    if (!actor) {
        ui.notifications.error("No actor found for the selected token.");
        return;
    }

	// Make sure actor has Inspiring Marshal Stance feat
	hasFeat = actor.itemTypes.feat.some((feat) => feat.slug === 'inspiring-marshal-stance');
	if (!hasFeat) {
		ui.notifications.warn(`Actor ${actor.name} does not have Inspiring Marshal Stance feat`);
		return;
	}
	
    // Get the actor's level
    const level = actor.system.details.level.value;

    // Pathfinder 2E DC progression table for standard checks
    const standardDCs = [
        14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40
    ];

    // Determine the DC for the actor's level, adjusted for an "easy" check
    const standardDC = standardDCs[level] || 10; // Default to 10 if level is out of bounds
    const easyDC = standardDC - 2;

    // Get the Diplomacy skill modifier
    const totalModifier = actor.system.skills.diplomacy.totalModifier;

    // Roll a d20 and add the totalModifier
    const roll = new Roll(`1d20 + ${totalModifier}`);
    await roll.evaluate({ async: true });

    // Check if the roll was a success
    const success = roll.total >= easyDC;

    // Display the roll result in chat
    roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: `
            <strong>Diplomacy Check (Easy DC: ${easyDC})</strong><br>
            Rolled: ${roll.total} (Modifier: ${totalModifier})<br>
            ${success ? "<strong>Success!</strong>" : "<strong>Failure.</strong>"}
        `
    });

    // If the check fails, stop the macro
    if (!success) {
        ui.notifications.warn("The Diplomacy check failed. Marshal's Aura was not added.");
        return;
    }

    // Define the UUID for Marshal's Aura in the compendium
    const auraUUID = "Compendium.pf2e.feat-effects.Item.er5tvDNvpbcnlbHQ";

    // Check if Marshal's Aura is already present in actor.collections.items
    const existingAura = Array.from(actor.items.values()).some(item => item.system.slug === "marshals-aura");
    if (existingAura) {
        ui.notifications.warn("Marshal's Aura is already active.");
        return;
    }

    // Fetch the item from the compendium
    const compendiumItem = await fromUuid(auraUUID);
    if (!compendiumItem) {
        ui.notifications.error("Failed to find Marshal's Aura in the compendium.");
        return;
    }

    // Add the item to the actor
    await actor.createEmbeddedDocuments("Item", [compendiumItem.toObject()]);
    ui.notifications.info("Marshal's Aura has been added to the actor.");
})();