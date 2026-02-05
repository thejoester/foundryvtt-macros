/*
******************************************************************

	Macro Title: Sort Inventory + Container Contents (PF2e)
	Author: TheJoester (https://github.com/thejoester)
	Description: Prompts for sorting mode (Alphabetical or By Level), 
    then sorts the selected actor's inventory and all container 
    contents accordingly.

	Foundry Version: v12 / v13 + PF2e System
	Last updated 04-February-2026   
	License: MIT

******************************************************************
*/

function getActorForMacro() {
	const token = canvas.tokens.controlled?.[0];
	if (token?.actor) return token.actor;

	if (game.user?.character) return game.user.character;

	ui.notifications.warn("Select a token with an actor, or assign yourself a character.");
	return null;
}

function getItemLevel(item) {
	const lvl = item?.system?.level?.value;
	return Number.isFinite(lvl) ? lvl : 0;
}

function getContainerId(item) {
	return item?.system?.containerId ?? null;
}

function normalizeName(name) {
	return (name ?? "").toString().trim().toLocaleLowerCase();
}

function buildGroupsByContainer(items) {
	const groups = new Map();
	for (const it of items) {
		const cid = getContainerId(it);
		if (!groups.has(cid)) groups.set(cid, []);
		groups.get(cid).push(it);
	}
	return groups;
}

function sortItems(items, mode) {
	const arr = [...items];

	if (mode === "alpha") {
		arr.sort((a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name)));
		return arr;
	}

	arr.sort((a, b) => {
		const la = getItemLevel(a);
		const lb = getItemLevel(b);
		if (la !== lb) return la - lb;
		return normalizeName(a.name).localeCompare(normalizeName(b.name));
	});
	return arr;
}

async function applySortOrder(actor, sortedItems, startingSort = 1000, step = 10) {
	const updates = [];
	let sortValue = startingSort;

	for (const it of sortedItems) {
		updates.push({
			_id: it.id,
			sort: sortValue
		});
		sortValue += step;
	}

	if (!updates.length) return 0;
	await actor.updateEmbeddedDocuments("Item", updates);
	return updates.length;
}

async function sortInventoryAndContainers(actor, mode) {
	const items = actor.items.contents;

	// Group items by containerId (null = top-level)
	const groups = buildGroupsByContainer(items);

	let totalUpdated = 0;

	// Top-level inventory
	const topLevel = groups.get(null) ?? groups.get(undefined) ?? [];
	const sortedTop = sortItems(topLevel, mode);
	totalUpdated += await applySortOrder(actor, sortedTop, 1000, 10);

	// Each container's contents
	for (const [containerId, groupItems] of groups.entries()) {
		if (containerId == null) continue;

		// Deterministic base per container so multiple containers don't fight over the same sort space
		let base = 200000;
		for (let i = 0; i < containerId.length; i++) base = (base + containerId.charCodeAt(i) * 17) % 900000;
		base += 100000;

		const sorted = sortItems(groupItems, mode);
		totalUpdated += await applySortOrder(actor, sorted, base, 10);
	}

	return totalUpdated;
}

(async () => {
	const actor = getActorForMacro();
	if (!actor) return;

	const content = `
        <div id="sort-dialog-container" style="display:flex; flex-direction:column; gap:12px;">
            <h3>Sort Inventory of <span style="color:#ff9f1c;">${actor.name}</span></h3>

            <form>
                <label style="display:flex; gap:8px; align-items:center;">
                    <input type="radio" name="mode" value="alpha" checked>
                    <span>Alphabetical (A → Z)</span>
                </label>

                <label style="display:flex; gap:8px; align-items:center;">
                    <input type="radio" name="mode" value="level">
                    <span>By Level (low → high), then Name</span>
                </label>
            </form>
        </div>
    `;

    const w = 500;
    const left = Math.max(0, (window.innerWidth - w) / 2);

	new foundry.applications.api.DialogV2({
        window: { title: "Sort Inventory" },
        position: { width: w, left, top: 80 },
        content,
        buttons: [{
            action: "sort",
            label: "Sort",
            default: true,
            callback: async (event, button, dialog) => {
                const mode = button.form.elements.mode.value;
                const updated = await sortInventoryAndContainers(actor, mode);
                return { mode, updated };
            }
        }, {
            action: "cancel",
            label: "Cancel"
        }],
        submit: async (result) => {
            if (!result || result === "cancel") return;
            const label = result.mode === "alpha" ? "Alphabetical" : "By Level";
            ui.notifications.info(`Sorted ${actor.name} (${label}). Updated ${result.updated} items.`);
        },
        rejectClose: false,
        modal: false
    }).render({ force: true, position: { width: 500 } });
})();