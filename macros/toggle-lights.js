/*
***************************************************************************
	Macro Title: Toggle Lights
	Author: TheJoester (https://github.com/thejoester)
	Last updated: 12-DEC-2025
	License: MIT License
	
	Description:
  Macro will toggle lights on/off
  
***************************************************************************
*/

//  =================== CONFIGUREATION ===================
// Change these ids:
const LIGHT_UUIDS = [
	"Scene.xEBFNVU0qmKDM1wg.AmbientLight.dAYRfqMnz9S7JDtH",
	"Scene.xEBFNVU0qmKDM1wg.AmbientLight.fOxacgk6QYYrrJNe",
  "Scene.xEBFNVU0qmKDM1wg.AmbientLight.DWvZELDvJQEdHjF4"
];

(async () => {
	if (!LIGHT_UUIDS.length) {
		ui.notifications.warn("No light UUIDs configured in the macro.");
		return;
	}

	let successCount = 0;
	let failCount = 0;

	for (const uuid of LIGHT_UUIDS) {
		if (!uuid || typeof uuid !== "string") continue;

		try {
			const doc = await fromUuid(uuid);

			if (!doc) {
				console.warn(`ToggleLightsByUUID | UUID not found: ${uuid}`);
				failCount++;
				continue;
			}
      
			if (doc.documentName !== "AmbientLight" && doc.constructor?.name !== "AmbientLightDocument") {
				console.warn(`ToggleLightsByUUID | UUID is not an AmbientLight: ${uuid}`);
				failCount++;
				continue;
			}

			const currentHidden = doc.hidden ?? doc.data?.hidden;
			await doc.update({ hidden: !currentHidden });
			successCount++;
		} catch (err) {
			console.error(`ToggleLightsByUUID | Error toggling ${uuid}`, err);
			failCount++;
		}
	}

	if (successCount) {
		console.log(`Toggled ${successCount} light(s): `, LIGHT_UUIDS);
	}
	if (failCount) {
		ui.notifications.warn(`${failCount} UUID(s) could not be processed. Check console for details.`);
	}
})();
