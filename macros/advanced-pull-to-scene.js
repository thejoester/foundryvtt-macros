// Get the list of available scenes and connected users
const scenes = game.scenes.contents;
const connectedUsers = game.users.contents.filter(user => user.active && user.id !== game.user.id);

// Check for no active users
if (connectedUsers.length === 0) {
    new Dialog({
        title: "No Connected Users",
        content: "<p>No other users are currently connected.</p>",
        buttons: {
            ok: { icon: '<i class="fas fa-check"></i>', label: "OK" }
        }
    }).render(true);
    return;
}

// Generate HTML for user checkboxes
let userOptions = connectedUsers.map(user => `
    <div>
        <input type="checkbox" id="${user.id}" name="${user.id}" />
        <label for="${user.id}">${user.name}</label>
    </div>
`).join("");

// Generate HTML for the scene dropdown menu
let sceneOptions = scenes.map(scene => `
    <option value="${scene.id}">${scene.name}</option>
`).join("");

// Create a dialog to display user options, scene dropdown, and pull button
new Dialog({
    title: "Pull Users to Scene",
    content: `
        <form>
            <p>Select scene to pull users to:</p>
            <select id="scene-select">${sceneOptions}</select>
            <br /><br />
            <p>Select users to pull:</p>
            ${userOptions}
            <br />
        </form>
    `,
    buttons: {
        pull: {
            icon: '<i class="fas fa-arrows-alt"></i>',
            label: "Pull to Scene",
            callback: (html) => {
                // Get selected users
                const selectedUserIds = connectedUsers
                    .filter(user => html.find(`input[name="${user.id}"]`).is(":checked"))
                    .map(user => user.id);

                // Get selected scene ID
                const sceneId = html.find("#scene-select").val();
                const selectedScene = game.scenes.get(sceneId);

                // Check if the scene ID is valid
                if (!selectedScene) {
                    ui.notifications.error("Selected scene not found.");
                    return;
                }

                // Pull each selected user to the selected scene
                selectedUserIds.forEach(userId => {
                    game.socket.emit("pullToScene", sceneId, userId);
                });

                ui.notifications.info("Selected users pulled to the scene.");
            }
        },
        cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
        }
    },
    default: "pull"
}).render(true);
