Hooks.on("createCombatant", (combatant, options, userId) => {
    // Only proceed for players (if needed)
    if (game.user.role === CONST.USER_ROLES.PLAYER) {
        // Switch to the Chat Messages tab
        const chatTab = document.querySelector(".fa-comments").parentElement;
        if (chatTab) {
            chatTab.click();  // Programmatically click the Chat Messages tab
        }
        
        const combatPopout = document.querySelector("#combat-popout");
        if (combatPopout) {
            if (!combatPopout.hidden) {            
                combatPopout.hidden = true;
            }

            setTimeout(() => {
                combatPopout.hidden = false;
            }, 2000);  // Delay in milliseconds
        }
    }
});