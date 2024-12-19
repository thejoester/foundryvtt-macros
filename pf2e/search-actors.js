/*
  Simple search tool that will open a search dialog, enter any term for example "magic" and it will search selected token actors for items and spells that match.

*/

new Dialog({
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
                return ui.notifications.warn("Please enter a search term.");
            }

            const selectedTokens = canvas.tokens.controlled;
            if (!selectedTokens.length) {
                return ui.notifications.warn("No tokens selected! Please select one or more tokens to search.");
            }

            let results = [];

            for (const token of selectedTokens) {
                const actor = token.actor;
                if (!actor) continue;

                const actorName = actor.name;
                const items = actor.items.map(item => item.name).filter(name => name.toLowerCase().includes(searchTerm));
                const spells = actor.items.filter(item => item.type === 'spell').map(spell => spell.name).filter(name => name.toLowerCase().includes(searchTerm));

                const combinedResults = [...items, ...spells];
                if (combinedResults.length > 0) {
                    results.push(`${actorName}: ${combinedResults.join(", ")}`);
                }
            }

            if (results.length === 0) {
                return ui.notifications.info("No matches found for the search term.");
            }

            const resultContent = results.join('\n');

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
                            return ui.notifications.warn("Please enter a search term.");
                        }

                        let newResults = [];

                        for (const token of canvas.tokens.controlled) {
                            const actor = token.actor;
                            if (!actor) continue;

                            const actorName = actor.name;
                            const items = actor.items.map(item => item.name).filter(name => name.toLowerCase().includes(newSearchTerm));
                            const spells = actor.items.filter(item => item.type === 'spell').map(spell => spell.name).filter(name => name.toLowerCase().includes(newSearchTerm));

                            const combinedResults = [...items, ...spells];
                            if (combinedResults.length > 0) {
                                newResults.push(`${actorName}: ${combinedResults.join(", ")}`);
                            }
                        }

                        const newResultContent = newResults.join('\n');
                        html.find('textarea').val(newResultContent);
                    });
                }
            }).render(true);

            const parentDialog = html.closest('.dialog');
            parentDialog.remove();
        });
    }
}).render(true);
