/*
******************************************************************

	Macro Title: toggle hex color
	Description:
	This macro is specific to the PF2E Kingmaker module. It will 
	toggle the "Show Colored Hexes" option.

	Foundry Version: 12
	Last updated 12-Nov-2024

	Use case: I personally use this macro to toggle hex colors 
	that show status (reconniotered, mapped, etc) on a user that 
	has the UI hidden because I am using it to record or stream 
	and the tool is not available.
 
******************************************************************
*/

game.coloredAndIconsLayer.visible=!game.coloredAndIconsLayer.visible;game.coloredAndIconsLayer.draw()
