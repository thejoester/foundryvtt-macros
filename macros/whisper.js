/* *********************************************************************
    FoundryVTT Whisper Macro (v12+)
    Author: TheJoester
    Description:
    Opens a dialog to send a private whisper to a selected active user.
    Uses DialogV2. 
********************************************************************* */

const players = game.users.filter(u => u.active && u.id !== game.user.id);

const escapeHtml = (unsafe = "") =>
	String(unsafe).replace(/[&<"']/g, m => ({ "&":"&amp;", "<":"&lt;", '"':"&quot;", "'":"&#039;" }[m]));

if (!foundry?.applications?.api?.DialogV2) {
	ui.notifications.error("This macro requires Foundry VTT v12 or later.");
	return;
}

const optionsHtml = players.length
	? players.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")
	: `<option value="" disabled selected>(No active recipients)</option>`;

const dlg = new foundry.applications.api.DialogV2({
	window: { title: "Send Private Whisper" },
	position: { width: 500 },   // ⬅️ wider window (~400px more)
	content: `
		<div class="form-group">
			<label for="recipient">Select Recipient:</label>
			<select id="recipient" name="recipient" class="w-full">
				${optionsHtml}
			</select>
		</div>
		<div class="form-group">
			<label for="whisper-message">Message:</label>
			<textarea id="whisper-message" name="message" rows="4" class="w-full"></textarea>
		</div>
	`,
	buttons: [{
		action: "send",
		label: "Send Whisper",
		default: true,
		callback: async (event, button, dialog) => {
			const form = button.form;
			if (!form) return;

			const recipientId = form.querySelector("#recipient")?.value;
			const message = form.querySelector("#whisper-message")?.value?.trim();

			if (recipientId && message) {
				await ChatMessage.create({
					content: escapeHtml(message),
					type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
					whisper: [recipientId]
				});
			} else {
				ui.notifications.warn("Please select a recipient and type a message.");
				return false;
			}
			return true;
		}
	}, {
		action: "cancel",
		label: "Cancel"
	}]
});

dlg.render({ force: true });
