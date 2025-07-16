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

  const content = `<form>
    <div class="form-group">
      <label>Choose Difficulty:</label>
      <select id="difficulty" name="difficulty">
        ${difficulties.map(d => `<option value="${d}" ${d === "Easy" ? "selected" : ""}>${d}</option>`).join("")}
      </select>
    </div>
  </form>`;

  const { result, form } = await Dialog.prompt({
    title: "Inspiring Marshal Stance",
    content,
    label: "Inspiring Marshal Stance",
    callback: html => ({ result: true, form: html[0] }),
    rejectClose: false
  });

  if (!result) return;

  const difficulty = form.querySelector("#difficulty").value;
  const dc = baseDC + (dcAdjustments[difficulty] || 0);

  const diplomacy = actor.system.skills.diplomacy;
  const modifiers = diplomacy.modifiers?.filter(m => m.enabled) || [];
  const totalMod = modifiers.reduce((sum, mod) => sum + (mod.modifier || 0), 0);

  const roll = await new Roll(`1d20 + ${totalMod}`).evaluate({ async: true });
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `Diplomacy Check vs ${difficulty} (DC ${dc})`
  });

  const total = roll.total;
  let degreeOfSuccess = 0;
  if (total >= dc + 10) degreeOfSuccess = 3;
  else if (total >= dc) degreeOfSuccess = 2;
  else if (total <= dc - 10) degreeOfSuccess = 0;
  else degreeOfSuccess = 1;

  let resultMessage = `<hr><p>Roll Total: <strong>${total}</strong> (${degreeOfSuccess >= 2 ? "Success" : "Failure"})</p>`;

  if (degreeOfSuccess >= 2) {
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
  } else {
    resultMessage += `<p><em>No effect applied.</em></p>`;
  }

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: resultMessage
  });
})();
