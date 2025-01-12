/*
******************************************************************

	Macro Title: search-actor
	Author: TheJoester (https://github.com/thejoester)
	Description:
	Macro that will search selected token(s) for search term and 
	display results sorted by item type (Feat, spell, consumable, 
	equipment, etc.)

	Foundry Version: 12
	Last updated 12-Jan-2025

	Author: TheJoester (https://github.com/thejoester)
	License: MIT License

******************************************************************
*/
let searchDialog = new Dialog({
    title: "Search Actor Data",
    content: `
        <form style="display: inline-flex; align-items: center; gap: 5px;" onsubmit="return false;">
            <label for="search-term">Search:</label>
            <input type="text" id="search-term" name="search-term" style="width: 200px; height: 25px;">
            <button type="submit" id="search-button" style="width: 75px; height: 30px; padding: 0; display: flex; justify-content: center; align-items: center;">
                <i class="fas fa-search"></i> Search
            </button>
        </form>
    `,
    buttons: {},
    default: null,
    render: (html) => {
        html.find("form").on("submit", async (event) => {
            event.preventDefault();
            const searchTerm = html.find('[name="search-term"]').val().trim().toLowerCase();
            if (!searchTerm) {
                ui.notifications.warn("Please enter a search term.");
                return;
            }

            const selectedTokens = canvas.tokens.controlled;
            if (!selectedTokens.length) {
                ui.notifications.warn("No tokens selected! Please select one or more tokens to search.");
                return;
            }

            let results = [];

            for (const token of selectedTokens) {
                const actor = token.actor;
                if (!actor) continue;

                const actorName = actor.name;

                // Group items by type
                const itemsByType = {};
                actor.items
                    .filter(item => item.name.toLowerCase().includes(searchTerm))
                    .forEach(item => {
                        const type = item.type;
                        if (!itemsByType[type]) itemsByType[type] = [];
                        itemsByType[type].push(item.name);
                    });

                // Remove duplicates and format the output
                for (const [type, items] of Object.entries(itemsByType)) {
                    itemsByType[type] = [...new Set(items)].map(name => `    - ${name}`);
                }

                // Sort item types alphabetically
                const sortedTypes = Object.keys(itemsByType).sort();

                // Build actor results
                let actorResults = `Actor: ${actorName}\n`;
                for (const type of sortedTypes) {
                    actorResults += `  ${type.charAt(0).toUpperCase() + type.slice(1)}:\n${itemsByType[type].join("\n")}\n`;
                }

                if (sortedTypes.length > 0) {
                    results.push(actorResults.trim());
                }
            }

            if (results.length === 0) {
                ui.notifications.info("No matches found for the search term.");
                return;
            }

            const resultContent = results.join("\n\n");

            // Open results dialog and close the original search dialog
            new Dialog({
                title: "Search Results",
                content: `
                    <form style="display: inline-flex; align-items: center; gap: 5px;" onsubmit="return false;">
                        <label for="new-search-term">Search:</label>
                        <input type="text" id="new-search-term" name="new-search-term" style="height: 30px;">
                        <button type="submit" id="new-search-button" style="width: 75px; height: 30px; padding: 0; display: flex; justify-content: center; align-items: center;">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </form>
                    <textarea style="width:100%; height:300px;" readonly>${resultContent}</textarea>
                `,
                buttons: {},
                default: null,
                render: (html) => {
                    html.find("form").on("submit", async (event) => {
                        event.preventDefault();
                        const newSearchTerm = html.find('[name="new-search-term"]').val().trim().toLowerCase();
                        if (!newSearchTerm) {
                            ui.notifications.warn("Please enter a search term.");
                            return;
                        }

                        let newResults = [];

                        for (const token of canvas.tokens.controlled) {
                            const actor = token.actor;
                            if (!actor) continue;

                            const actorName = actor.name;

                            // Group items by type
                            const itemsByType = {};
                            actor.items
                                .filter(item => item.name.toLowerCase().includes(newSearchTerm))
                                .forEach(item => {
                                    const type = item.type;
                                    if (!itemsByType[type]) itemsByType[type] = [];
                                    itemsByType[type].push(item.name);
                                });

                            // Remove duplicates and format the output
                            for (const [type, items] of Object.entries(itemsByType)) {
                                itemsByType[type] = [...new Set(items)].map(name => `    - ${name}`);
                            }

                            // Sort item types alphabetically
                            const sortedTypes = Object.keys(itemsByType).sort();

                            // Build actor results
                            let actorResults = `Actor: ${actorName}\n`;
                            for (const type of sortedTypes) {
                                actorResults += `  ${type.charAt(0).toUpperCase() + type.slice(1)}:\n${itemsByType[type].join("\n")}\n`;
                            }

                            if (sortedTypes.length > 0) {
                                newResults.push(actorResults.trim());
                            }
                        }

                        const newResultContent = newResults.join("\n\n");
                        html.find('textarea').val(newResultContent);
                    });
                }
            }).render(true);

            searchDialog.close(); // Close the original search dialog
        });
    }
}).render(true);