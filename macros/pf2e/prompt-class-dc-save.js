/* 
******************************************************************
    Macro Title: Prompt Class DC Save [PF2E]
    Foundry Version: 12
    System: PF2E
    Last updated 12-Nov-2024
    
    Description:
    This macro allows a GM or player to prompt a selected target 
	to make a saving throw (Will, Reflex, or Fortitude) against 
	the Class DC of a selected token’s actor. When the macro is 
	executed, a dialog box appears allowing the user to choose the 
	save type (Will, Reflex, or Fortitude) that the target must 
	attempt. A clickable message is then generated in the chat, 
	which, when clicked, rolls the selected save against the 
	Class DC.
    
    Usage:
    - Select a token representing the actor initiating the save.
    - Target another token to act as the defender who will roll 
	the save.
    - Run this macro to open a dialog box prompting you to select 
	the save type.
    - A clickable message appears in the chat, allowing the target 
	to roll the specified save.
    - The roll result, along with a comparison against the 
	initiating actor’s Class DC, will appear in the chat.
    
    Requirements:
    - A token must be selected as the initiating actor.
    - A target token must be selected as the defender.
    - The initiating actor must have a Class DC defined.
    
    Author: TheJoester (https://github.com/thejoester)
    License: MIT License
    
    Example Use Case:
    Useful for Game Masters or players running a combat or 
	encounter where one character’s ability prompts another 
	character to make a save against their Class DC (e.g., spells, 
    abilities that prompt saving throws).
******************************************************************
*/

// Ensure a token is selected
if (!canvas.tokens.controlled.length) {
    ui.notifications.warn("Please select a token.");
    return;
}

// Get the selected token and actor
const token = canvas.tokens.controlled[0];
const actor = token.actor;

// Ensure a target is selected
if (!game.user.targets.size) {
    ui.notifications.warn("Please select a target.");
    return;
}

// Get the target token and actor
const targetToken = game.user.targets.values().next().value;
const targetActor = targetToken.actor;

// Get the Class DC
const classDC = actor.system.attributes.classDC?.value;

// Ensure Class DC exists
if (classDC === undefined) {
    ui.notifications.warn("This actor does not have a Class DC.");
    return;
}

// Prompt for the type of save
new Dialog({
    title: "Choose Save Type",
    content: `
        <p>Select the type of save:</p>
        <form>
            <div class="form-group">
                <label for="save-type">Save Type:</label>
                <select id="save-type" name="save-type">
                    <option value="will">Will</option>
                    <option value="reflex">Reflex</option>
                    <option value="fortitude">Fortitude</option>
                </select>
            </div>
        </form>
        <br />`,
    buttons: {
        roll: {
            label: "Prompt Save",
            callback: (html) => {
                const saveType = html.find('[name="save-type"]').val();
                const saveName = saveType.charAt(0).toUpperCase() + saveType.slice(1);
                const saveModifier = targetActor.system.saves[saveType]?.value;

                // Ensure the target's save modifier exists
                if (saveModifier === undefined) {
                    ui.notifications.warn(`${targetActor.name} does not have a ${saveName} save.`);
                    return;
                }

                // Create a clickable message to trigger the roll
                ChatMessage.create({
                    content: `Target ${targetActor.name}, please attempt a ${saveName} Save against DC ${classDC}: 
                              <button class="save-roll" style="background-color:#d4af37; color:white; border:none; padding:5px; cursor:pointer;">
                              Roll ${saveName} Save</button>`,
                    speaker: ChatMessage.getSpeaker({ actor })
                });

                // Event listener for the roll button
                Hooks.once("renderChatMessage", (chatMessage, html) => {
                    html.find(".save-roll").click(async () => {
                        const roll = new Roll(`1d20 + ${saveModifier}`);
                        await roll.roll({ async: true });
                        roll.toMessage({
                            speaker: ChatMessage.getSpeaker({ actor }),
                            flavor: `${targetActor.name}'s ${saveName} Save vs. DC ${classDC}`,
                        });
                    });
                });
            }
        },
        cancel: {
            label: "Cancel"
        }
    },
    default: "roll"
}).render(true);
