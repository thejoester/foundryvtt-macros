/* ***************************************************************************
	Macro Title: Light Orb Spell (Summon & Assign)
	Author: TheJoester (https://github.com/thejoester)
	Foundry VTT Version: 12+
	System: Pathfinder 2E

	Description:
	This macro automates the creation and placement of a glowing Light Orb
	when a token casts or uses the "Light" spell. It supports both GM and
	player usage and dynamically assigns ownership and color options.

	Features:
	- Ensures a token is selected before running.
	- Confirms that the selected actor has the "Light" spell available.
	- Checks for an existing Light Orb actor named `light-spell-<ActorName>`;
	  if it doesn't exist, clones it from the base `light-spell` actor.
	- Prompts for Light Orb color and player ownership:
		• GMs can select a player and a color from dropdown menus.
		• Players can only select a color (their user ID is automatically assigned).
	- Creates a new Light Orb token at the caster's current position with:
		• Light color matching the selected hue.
		• Friendly disposition and visible token state.
		• Slight elevation (5 feet) for visual distinction.
	- Assigns actor and token ownership to the chosen player.

	Usage:
	1. Select a token that has the "Light" spell.
	2. Run the macro.
	3. If GM:
		- Choose which player controls the orb and select its color.
	   If Player:
		- Choose a color (the orb is automatically assigned to you).
	4. A glowing Light Orb token appears near the selected token.

	Notes:
	- Requires a base world actor named "light-spell" to clone from.
    - Requires "create actor" permission to create new Light Orb actors.
	- Automatically creates persistent, uniquely named Light Orb actors
	- Designed for both GM and player execution in cooperative scenes.

*************************************************************************** */

(async () => {
    // Ensure a token is selected
    if (!canvas.tokens.controlled.length) {
        ui.notifications.warn("Please select a token.");
        return;
    }

    const selectedToken = canvas.tokens.controlled[0];
    const actor = selectedToken.actor;
    const actorName = actor.name;
    const lightOrbName = `light-spell-${actorName}`;
    const isGM = game.user.isGM; // Check if the user is a GM

    // Check if the selected token has the Light spell
    const hasLightSpell = actor.items.some(item => item.name === "Light" && item.type === "spell");
    if (!hasLightSpell) {
        ui.notifications.warn("The selected token does not have the Light spell.");
        return;
    }

    // Check if a Light Orb already exists for this actor
    let lightOrbActor = game.actors.getName(lightOrbName);

    if (!lightOrbActor) {
        // If no unique Light Orb exists, create one from the base "light-spell"
        const baseLightOrb = game.actors.getName("light-spell");
        if (!baseLightOrb) {
            ui.notifications.error("The base 'light-spell' actor was not found in the world.");
            return;
        }

        // Create a new Light Orb actor
        lightOrbActor = await Actor.create({
            name: lightOrbName,
            type: baseLightOrb.type,
            img: baseLightOrb.img,
            system: foundry.utils.deepClone(baseLightOrb.system),
            prototypeToken: foundry.utils.deepClone(baseLightOrb.prototypeToken),
            ownership: {}
        });

        ui.notifications.info(`Created new Light Orb for ${actorName}.`);
    }

    // Find the current owner of the Light Orb (if any)
    let currentOwner = Object.keys(lightOrbActor.ownership).find(userId => lightOrbActor.ownership[userId] === 3);

    // If no owner is found, default to the selected token's owner
    if (!currentOwner) {
        const tokenOwner = selectedToken.actor?.ownership;
        currentOwner = Object.keys(tokenOwner || {}).find(userId => tokenOwner[userId] === 3) || game.user.id;
    }

    // Define color options for the Light orb
    const colors = {
        "White": "#FFFFFF",
        "Blue": "#0000FF",
        "Green": "#00FF00",
        "Red": "#FF0000",
        "Purple": "#800080",
        "Yellow": "#FFFF00",
        "Cyan": "#00FFFF"
    };

    // Function to create and place the Light Orb
    const createLightOrb = async (selectedPlayer, selectedColor) => {
        // Set ownership to the selected player
        await lightOrbActor.update({
            "ownership": { [selectedPlayer]: 3 },
            "system.attributes.master": actor.id
        });

        // Clone token data from the Light Orb actor
        const tokenData = foundry.utils.deepClone(lightOrbActor.prototypeToken.toObject());
        tokenData.actorId = lightOrbActor.id;
        tokenData.light.color = selectedColor;
        tokenData.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
        tokenData.hidden = false; // Ensure it's visible
        tokenData.x = selectedToken.x;
        tokenData.y = selectedToken.y;
        tokenData.elevation = 5; // Set token height to 5 feet
        tokenData.ownership = { [selectedPlayer]: 3 }; // Set token ownership

        // Create the token at the selected position
        await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);

        ui.notifications.info(`Light Orb has been placed for ${actorName}, assigned to ${game.users.get(selectedPlayer).name}.`);
    };

    if (isGM) {
        // Get list of active players for the dropdown
        const players = game.users.filter(user => user.active && !user.isGM);
        const playerOptions = players.map(user => `<option value="${user.id}">${user.name}</option>`).join("");

        // Show player & color selection dialog (for GMs)
        new Dialog({
            title: "Assign Light Orb & Color",
            content: `
                <form>
                    <div class="form-group">
                        <label for="player">Assign to Player:</label>
                        <select id="player" name="player">
                            ${playerOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="color">Choose a color:</label>
                        <select id="color" name="color">
                            ${Object.entries(colors).map(([name, hex]) => `<option value="${hex}">${name}</option>`).join("")}
                        </select>
                    </div>
                </form>
            `,
            buttons: {
                ok: {
                    label: "OK",
                    callback: async (html) => {
                        const selectedPlayer = html.find("#player").val();
                        const selectedColor = html.find("#color").val();
                        await createLightOrb(selectedPlayer, selectedColor);
                    }
                },
                cancel: {
                    label: "Cancel"
                }
            },
            render: (html) => {
                // Set default selected player in dropdown
                html.find("#player").val(currentOwner);
            }
        }).render(true);
    } else {
        // If a player executes the macro, prompt only for color selection
        new Dialog({
            title: "Choose Light Orb Color",
            content: `
                <form>
                    <div class="form-group">
                        <label for="color">Choose a color:</label>
                        <select id="color" name="color">
                            ${Object.entries(colors).map(([name, hex]) => `<option value="${hex}">${name}</option>`).join("")}
                        </select>
                    </div>
                </form>
            `,
            buttons: {
                ok: {
                    label: "OK",
                    callback: async (html) => {
                        const selectedColor = html.find("#color").val();
                        await createLightOrb(game.user.id, selectedColor);
                    }
                },
                cancel: {
                    label: "Cancel"
                }
            }
        }).render(true);
    }
})();