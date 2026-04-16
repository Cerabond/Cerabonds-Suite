Hooks.on("updateCombat", (combat, changed, options, userId) => {
    // Only run if the current user is a Game Master
    if (!game.user.isGM) return;

    // Only proceed if the turn has changed
    if (!changed.turn) return;
    console.log(changed);

    // Get the current combatant
    const currentCombatant = combat.combatant;
    if (!currentCombatant || !currentCombatant.actor) return;

    // Iterate through all combatants and re-render their character sheets
    combat.combatants.forEach(guy => {
        if (!guy.actor.hasPlayerOwner) {
            guy.actor.sheet.render(true);
        }
    });

    setTimeout(() => {
        combat.combatants.forEach(guy => {
            if (!guy.actor.hasPlayerOwner && guy.tokenId != currentCombatant.tokenId) {
                guy.actor.sheet.close();
            }
        })
    }, 200);  // Delay in milliseconds
});
