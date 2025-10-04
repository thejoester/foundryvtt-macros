/*
********************************************
	Macro Title: Advanced Pull to Scene
	Author: TheJoester (https://github.com/thejoester)
	Description:
	This macro allows a FoundryVTT GM to pull selected connected users to a chosen scene.
	It presents a dialog box listing all connected users with checkboxes, allowing the GM
	to select specific users. The dialog also includes a dropdown menu listing all available
	scenes, from which the GM can choose the target scene to pull users to.
	When the "Pull to Scene" button is clicked, the selected users are transported to the
	selected scene.
	Usage: Run this macro as a GM in FoundryVTT.
	Foundry Version: v12+ / v13
	Last updated 18-July-2025
	Author: TheJoester (https://github.com/thejoester)
	License: MIT License
********************************************
*/


// Require GM
if (!game.user.isGM) {
	ui.notifications.warn("You must be a GM to use this macro.");
	return;
}

// Get available scenes and connected users (excluding yourself)
const scenes = game.scenes.contents;
const connectedUsers = game.users.contents.filter(user => user.active && user.id !== game.user.id);

// Show a basic dialog if no other users are connected
if (connectedUsers.length === 0) {
	await new foundry.applications.api.DialogV2({
		window: { title: "No Connected Users" },
		content: `
			<div style="min-width: 400px;">
				<p>No other users are currently connected.</p>
			</div>
		`,
		buttons: [
			{
				action: "ok",
				label: "OK",
				icon: "fas fa-check"
			}
		],
		defaultAction: "ok"
	}).render(true);
	return;
}

// HTML for user checkboxes
const userOptions = connectedUsers.map(user => `
	<div>
		<input type="checkbox" id="${user.id}" name="${user.id}" />
		<label for="${user.id}">${user.name}</label>
	</div>
`).join("");

// HTML for scene dropdown
const sceneOptions = scenes.map(scene => `
	<option value="${scene.id}">${scene.name}</option>
`).join("");

// Build and render DialogV2
new foundry.applications.api.DialogV2({
	window: { title: "Pull Users to Scene" },
	content: `
		<div style="min-width: 300px; max-height: 70vh; overflow-y: auto; padding-right: 1em;">	
			<form>
				<p>Select scene to pull users to:</p>
				<select id="scene-select">${sceneOptions}</select>
				<br /><br />
				<p>Select users to pull:</p>
				${userOptions}
				<br />
			</form>
		</div>
	`,
	buttons: [
		{
			action: "pull",
			label: "Pull to Scene",
			icon: "fas fa-arrows-alt",
			callback: (event, button, dialog) => {
				const form = button.form;

				// Get selected users
				const selectedUserIds = connectedUsers
					.filter(user => form.querySelector(`input[name="${user.id}"]`)?.checked)
					.map(user => user.id);

				// Get selected scene
				const sceneId = form.querySelector("#scene-select")?.value;
				const selectedScene = game.scenes.get(sceneId);

				if (!selectedScene) {
					ui.notifications.error("Selected scene not found.");
					return;
				}

				// Pull each selected user to the scene
				for (const userId of selectedUserIds) {
					game.socket.emit("pullToScene", sceneId, userId);
				}

				ui.notifications.info("Selected users pulled to the scene.");
			}
		},
		{
			action: "cancel",
			label: "Cancel",
			icon: "fas fa-times"
		}
	],
	defaultAction: "pull"
}).render(true);
