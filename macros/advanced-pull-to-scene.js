/*
******************************************************************
	Macro Title: Change Wall Type
	Author: TheJoester (https://github.com/thejoester)
	Description:
	This macro opens a dialog that lets you quickly change
 	wall type of selected walls. 
	Foundry Version: 12
	Last updated 25-Jan-2025
	Author: TheJoester (https://github.com/thejoester)
	License: MIT License
******************************************************************
*/
const updateWalls = (updates) => {
  const selectedWalls = canvas.walls.controlled;
  if (selectedWalls.length === 0) {
    return ui.notifications.warn("No walls selected.");
  }

  const changes = selectedWalls.map((wall) => ({
    _id: wall.id,
    ...updates,
  }));
  return canvas.scene.updateEmbeddedDocuments("Wall", changes);
};

// Dialog for Wall Settings
new Dialog({
  title: "Wall Settings",
  content: `
    <h3>Wall</h3>
    <div style="display: flex; gap: 5px;">
      <button id="normal">Normal</button>
      <button id="invisible">Invisible</button>
		<button id="ethereal">Ethereal</button>
      <button id="terrain">Terrain</button>
    </div>
	 <br>
    <h3>Wall Direction</h3>
    <div style="display: flex; gap: 5px;">
      <button id="both">Both</button>
      <button id="left">Left</button>
      <button id="right">Right</button>
    </div>
    <br>
    <h3>Doors</h3>
    <div style="display: flex; gap: 5px;">
      <button id="closed_door">Closed</button>
      <button id="open_door">Open</button>
      <button id="locked">Locked</button>
      <button id="secret">Secret</button>
      <button id="window">Window</button>
    </div>
  `,
  buttons: {},
  render: (html) => {
    // Wall types
    html.find("#normal").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.NONE,
        move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
        light: CONST.WALL_RESTRICTION_TYPES.NORMAL,
        sight: CONST.WALL_RESTRICTION_TYPES.NORMAL,
        sound: CONST.WALL_RESTRICTION_TYPES.NORMAL,
        dir: CONST.WALL_DIRECTIONS.BOTH,
        ds: CONST.WALL_DOOR_STATES.CLOSED,
      })
    );

    html.find("#invisible").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.NONE,
        move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
        light: CONST.WALL_SENSE_TYPES.NONE,
        sight: CONST.WALL_SENSE_TYPES.NONE,
        sound: CONST.WALL_SENSE_TYPES.NONE,
        dir: CONST.WALL_DIRECTIONS.BOTH,
        ds: CONST.WALL_DOOR_STATES.CLOSED,
      })
    );

   html.find("#ethereal").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.NONE,
        move: CONST.WALL_MOVEMENT_TYPES.NONE,
        light: CONST.WALL_SENSE_TYPES.NORMAL,
        sight: CONST.WALL_SENSE_TYPES.NORMAL,
        sound: CONST.WALL_SENSE_TYPES.NONE,
        dir: CONST.WALL_DIRECTIONS.BOTH,
        ds: CONST.WALL_DOOR_STATES.CLOSED,
      })
    );

    html.find("#terrain").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.NONE,
        move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
        light: CONST.WALL_SENSE_TYPES.LIMITED,
        sight: CONST.WALL_SENSE_TYPES.LIMITED,
        sound: CONST.WALL_SENSE_TYPES.LIMITED,
        dir: CONST.WALL_DIRECTIONS.BOTH,
        ds: CONST.WALL_DOOR_STATES.CLOSED,
      })
    );

    // Wall directions
    html.find("#left").click(() =>
      updateWalls({ dir: CONST.WALL_DIRECTIONS.LEFT })
    );
    html.find("#right").click(() =>
      updateWalls({ dir: CONST.WALL_DIRECTIONS.RIGHT })
    );
    html.find("#both").click(() =>
      updateWalls({ dir: CONST.WALL_DIRECTIONS.BOTH })
    );

    // Door types
    html.find("#closed_door").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.DOOR,
        ds: CONST.WALL_DOOR_STATES.CLOSED,
        move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
        light: CONST.WALL_SENSE_TYPES.NORMAL,
        sight: CONST.WALL_SENSE_TYPES.NORMAL,
        sound: CONST.WALL_SENSE_TYPES.NORMAL,
      })
    );

	html.find("#open_door").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.DOOR,
        ds: CONST.WALL_DOOR_STATES.OPEN,
        move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
        light: CONST.WALL_SENSE_TYPES.NORMAL,
        sight: CONST.WALL_SENSE_TYPES.NORMAL,
        sound: CONST.WALL_SENSE_TYPES.NORMAL,
      })
    );

    html.find("#locked").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.DOOR,
        ds: CONST.WALL_DOOR_STATES.LOCKED,
        move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
        light: CONST.WALL_SENSE_TYPES.NORMAL,
        sight: CONST.WALL_SENSE_TYPES.NORMAL,
        sound: CONST.WALL_SENSE_TYPES.NORMAL,
      })
    );

    html.find("#secret").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.SECRET,
        ds: CONST.WALL_DOOR_STATES.CLOSED,
        move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
        light: CONST.WALL_SENSE_TYPES.NORMAL,
        sight: CONST.WALL_SENSE_TYPES.NORMAL,
        sound: CONST.WALL_SENSE_TYPES.NORMAL,
      })
    );

    html.find("#window").click(() =>
      updateWalls({
        door: CONST.WALL_DOOR_TYPES.NONE,
        ds: CONST.WALL_DOOR_STATES.CLOSED,
        light: CONST.WALL_SENSE_TYPES.PROXIMITY,
        move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
        sight: CONST.WALL_SENSE_TYPES.PROXIMITY,
        sound: CONST.WALL_SENSE_TYPES.NORMAL,
        threshold: { light: 10, sight: 10, sound: 1, attenuation: true },
      })
    );
  },
}).render(true);
