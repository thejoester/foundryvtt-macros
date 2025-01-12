 /* 
******************************************************************
    Macro Title: Everlight Crystal Toggle Macro
    Foundry Version: 12
    System: PF2E
    Last updated 12-Nov-2024
    
    Description: 
	This macro toggles the equipped state of the "Everlight Crystal" 
	item in the inventory of the currently selected token's actor. 

******************************************************************
*/

(async () => {
  // Get the selected token
  const token = canvas.tokens.controlled[0];
  if (!token) {
    ui.notifications.error("No token selected.");
    return;
  }

  const actor = token.actor;
  if (!actor) {
    ui.notifications.error("No actor associated with the selected token.");
    return;
  }

  // Find the item with the specified slug
  const item = actor.items.find(i => i.slug === "everlight-crystal");
  if (!item) {
    ui.notifications.error("Everlight Crystal not found in inventory.");
    return;
  }

  // Get the current equipped state
  const isEquipped = item.system.equipped?.inSlot;

  // Toggle the equipped state
  const newEquippedState = !isEquipped;

  // Update the item's equipped state
  await item.update({ "system.equipped.inSlot": newEquippedState });

  // Notify the user
  // Prepare chat message content
  const message = newEquippedState
    ? `<strong>${actor.name}</strong> pulls out the <strong>${item.name}.</strong>.`
    : `<strong>${actor.name}</strong> tucks the <strong>${item.name} away.</strong>.`;

  // Send the message to chat
  ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: message,
  });

  console.log(message);
})();
