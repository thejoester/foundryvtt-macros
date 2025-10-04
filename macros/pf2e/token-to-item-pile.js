/* ***************************************************************************
  Macro Title: Make Loot Pile (PF2e, no Item Piles)
  Author: TheJoester (https://github.com/thejoester)
  Last updated: 08-Sep-2025
  License: MIT License
  Description:
  Select multiple non-character tokens and run the macro; 
  - moves inventories (and coins) into a single Loot actor/token 
	for players to loot.
*************************************************************************** */

(async () => {
  // Guards
  if (!game.user.isGM) return ui.notifications.warn("GM only.");
  if (!canvas?.scene) return ui.notifications.error("No active scene.");

  // Selected tokens with actors
  const tokens = canvas.tokens.controlled.filter(t => !!t.actor);
  if (!tokens.length) return ui.notifications.warn("Select one or more tokens with inventories.");

  // Exclude PCs and ignore already-loot piles
  const excludedCharacters = tokens.filter(t => t.actor?.type === "character");
  const sourceTokens = tokens.filter(t => t.actor?.type !== "character" && t.actor?.type !== "loot");
  if (!sourceTokens.length) {
    if (excludedCharacters.length) ui.notifications.warn("Only characters/loot tokens selected; characters are excluded from piling.");
    else ui.notifications.warn("Only loot tokens are selected; nothing to transfer.");
    return;
  }

  // Dialog
  let includeEquipped = true;   // default ON
  let includeCoins    = true;   // default ON
  let hideToken       = true;   // default ON

  const firstName = sourceTokens[0]?.name ?? "Item";
  let pileName = `${firstName} pile (${new Date().toLocaleDateString()})`;

  const chip = (n, extra = "") => `<span style="display:inline-block; margin:2px 4px; padding:2px 6px; font-size:.85em; background: rgba(255,255,255,0.05); border: 1px solid var(--color-border, #555); border-radius:4px; white-space:nowrap; ${extra}">${foundry.utils.escapeHTML(n)}</span>`;
  const fromListHTML = sourceTokens.map(t => chip(t.name)).join("");
  const excludedChipsHTML = excludedCharacters.length ? `
    <div style="margin-top:.5rem; opacity:.9;">
      <div style="font-weight:600; margin-bottom:.25rem; color: var(--color-text-hyperlink, #ffb3b3);">Excluded (characters):</div>
      <div style="max-height: 200px; overflow-y: auto; border: 1px dashed var(--color-border, #555); border-radius: 6px; padding:4px;">
        ${excludedCharacters.map(t => chip(t.name, "background: rgba(255,0,0,0.07); border-color: rgba(255,0,0,0.35);")).join("")}
      </div>
    </div>` : "";

  const content = `
    <div style="width: 520px; max-height: 70vh; overflow-y: auto;">
      <p>Transfer items from the selected tokens into a new <strong>Loot</strong> pile.</p>
      <div style="display:grid; grid-template-columns: 1fr; gap:.5rem; margin-top:.5rem;">
        <label style="display:flex; align-items:center; gap:.5rem;">
          <input type="checkbox" name="includeCoins" checked>
          <span>Include coins</span>
        </label>
        <label style="display:flex; align-items:center; gap:.5rem;">
          <input type="checkbox" name="includeEquipped" checked>
          <span>Include equipped/worn items</span>
        </label>
        <label style="display:flex; align-items:center; gap:.5rem;">
          <input type="checkbox" name="hideToken" checked>
          <span>Hide loot token</span>
        </label>
        <label style="display:flex; flex-direction:column; gap:.25rem; margin-top:.25rem;">
          <span>Pile name</span>
          <input type="text" name="pileName" value="${pileName}">
        </label>
      </div>
      <hr style="margin:.75rem 0;">
      <div style="opacity:.85;">
        <div style="font-weight:600; margin-bottom:.25rem;">From:</div>
        <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--color-border, #555); border-radius: 6px; padding:4px;">
          ${fromListHTML}
        </div>
        ${excludedChipsHTML}
      </div>
    </div>
  `;

  let madeChoice = false;
  new foundry.applications.api.DialogV2({
    window: { title: "Make Loot Pile" },
    content,
    buttons: [{
      action: "make",
      label: "Make Pile",
      default: true,
      callback: (event, button) => {
        const f = button.form;
        includeCoins = f.elements.includeCoins.checked;
        includeEquipped = f.elements.includeEquipped.checked;
        hideToken = f.elements.hideToken.checked;
        pileName = f.elements.pileName.value?.trim() || pileName;
        madeChoice = true;
        return true;
      }
    }, { action: "cancel", label: "Cancel" }],
    submit: () => {}
  }).render({ force: true });

  while (!madeChoice && ui.windows) await new Promise(r => setTimeout(r, 50));
  if (!madeChoice) return;

  // Create Loot actor + token
  const avg = sourceTokens.reduce((a, t) => ({ x: a.x + t.x, y: a.y + t.y }), { x: 0, y: 0 });
  avg.x = Math.round(avg.x / sourceTokens.length);
  avg.y = Math.round(avg.y / sourceTokens.length);

  const CRATE_IMG = "icons/containers/boxes/crates-wooden-stacked.webp";

  const lootActor = await Actor.create({
    name: pileName,
    type: "loot",
    img: CRATE_IMG,
    // Let players open/loot the sheet
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }
  });
  if (!lootActor) return ui.notifications.error("Failed to create loot actor.");

  const tokenData = lootActor.prototypeToken?.toObject() ?? {};
  Object.assign(tokenData, {
    x: avg.x, y: avg.y,
    name: pileName,
    actorId: lootActor.id,
    actorLink: false,
    disposition: 0,
    hidden: !!hideToken,
    texture: { src: CRATE_IMG }
  });

  const [tokenDoc] = await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);
  if (!tokenDoc) return ui.notifications.error("Failed to create loot token.");

  // Move items (PF2e)
  const transferErrors = [];
  const isCoin = (it) => it?.type === "treasure" && it?.system?.stackGroup === "coins";
  const physicalTypes = new Set(["weapon", "armor", "equipment", "consumable", "treasure", "backpack"]);

  for (const t of sourceTokens) {
    const actor = t.actor;
    if (!actor?.items?.size && !includeCoins) continue;

    try {
      const items = actor.items.filter(it => {
        if (!physicalTypes.has(it.type)) return false;
        if (!includeCoins && isCoin(it)) return false;
        const equipped = it?.system?.equipped?.carryType === "worn" || it?.system?.equipped?.equipped === true;
        if (!includeEquipped && equipped) return false;
        const qty = Number(it?.system?.quantity ?? 0);
        return qty > 0;
      });

      for (const it of items) {
        const qty = Number(it.system?.quantity ?? 0);
        if (!qty) continue;
        await actor.transferItemToActor(lootActor, it, qty, { checkStack: true });
      }
    } catch (err) {
      console.error(err);
      transferErrors.push(actor.name);
    }
  }

  // Ping it (even if hidden) so you can find it
  const td = tokenDoc.object ?? tokenDoc;
  if (td?.center) canvas.ping(td.center);

  // GM-only report
  const movedFrom = sourceTokens.map(t => `<li>${foundry.utils.escapeHTML(t.name)}</li>`).join("");
  const errList = transferErrors.length
    ? `<p><b>Some transfers failed from:</b></p><ul>${transferErrors.map(s => `<li>${foundry.utils.escapeHTML(s)}</li>`).join("")}</ul>`
    : "";
  const excludedMsg = excludedCharacters.length
    ? `<p style="margin-top:.5rem;"><b>Excluded (characters):</b></p>
       <ul>${excludedCharacters.map(t => `<li>${foundry.utils.escapeHTML(t.name)}</li>`).join("")}</ul>`
    : "";

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Loot Pile" }),
    content: `
      <h3>Created Loot Pile: ${foundry.utils.escapeHTML(pileName)}</h3>
      <p>@UUID[${lootActor.uuid}]{Open Pile Actor}</p>
      <p>Dropped at the average position of selected tokens.${hideToken ? " <em>(Token is hidden)</em>" : ""}</p>
      <p><b>Transferred from:</b></p>
      <ul>${movedFrom}</ul>
      ${excludedMsg}
      ${errList}
    `,
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
  });

  ui.notifications.info(`Loot pile "${pileName}" created.${hideToken ? " (hidden)" : ""}`);
})();
