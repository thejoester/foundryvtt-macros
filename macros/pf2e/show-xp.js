/* ******************************************************************

	Macro Title: Show XP
	Author: TheJoester (https://github.com/thejoester)
	Last updated 2025-10-04
	Foundry Version: v12 - v13
	System: pf2e
	License: MIT License
	
	Description:
	Sends message to Chat showing all party actors and their current XP

****************************************************************** */
(async () => {
	if (!game.user.isGM) {  
		ui.notifications.warn("Only the GM can view party XP.");
		return;
	}

	const party = game.actors.party;
	if (!party) {
		ui.notifications.warn("No party actor found.");
		return;
	}

	const partyActors = party.members;
	if (!partyActors.length) {
		ui.notifications.warn("The party has no members.");
		return;
	}

	const results = partyActors.map(actor => {
		const xp = actor.system.details.xp?.value ?? 0;
		const level = actor.system.details.level?.value ?? 1;
		const xpUntilNextLevel = Math.max(0, 1000 - xp);
		const nextLevel = level + 1;
		return `<strong>${actor.name}</strong>: ${xpUntilNextLevel} XP to Level ${nextLevel}`;
	});

	const flavorText = `
        <div style="
            background-color:#1d1c1a;
            border: 2px solid #5f574e;
            box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            padding: 16px;
            color: #e4ddc7;
            font-family: 'serif';
            max-width: 500px;
            margin: auto;
        ">
            <!-- perfectly centered icon -->
            <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                <img src="icons/skills/social/diplomacy-handshake-yellow.webp"
                    width="72" height="72"
                    style="display:block; margin:auto; border:none; filter: drop-shadow(0 0 6px #c7b26f);" />
            </div>

            <div style="text-align: center; font-weight: bold; font-size: 16px; letter-spacing: 1px; color: #c7b26f; margin-bottom: 12px;">
                XP TO NEXT LEVEL
            </div>
            <div style="font-size: 14px; font-style: italic; margin-bottom: 12px; text-align: center;">
                How close are they to greatness?
            </div>
            <hr style="border: 1px solid #5f574e;">
            <div style="font-size: 15px; text-align: center; margin: 12px 0;">
                Progress Summary:
            </div>
            <div style="text-align: center; font-size: 14px; margin-bottom: 10px;">
                ${results.join("<br>")}
            </div>
            <hr style="border: 1px solid #5f574e;">
            <div style="font-size: 12px; font-style: italic; text-align: center; color: #a09888; margin-top: 6px;">
                Leveling is earned, not given.
            </div>
        </div>
    `;


	const gmUsers = game.users.filter(u => u.isGM && u.active);
	const whisperIds = gmUsers.map(u => u.id);

	await ChatMessage.create({
		user: game.user.id,
		content: flavorText,
		type: CONST.CHAT_MESSAGE_TYPES.OTHER
	});
})();