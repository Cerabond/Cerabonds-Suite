Hooks.on("createCombatant", (combatant, options, userId) => {
  if (!game.user.isGM) return;
  // Check if the combatant is an NPC and belongs to the GM user
  if (combatant.actor && combatant.actor.hasPlayerOwner === false) {
    // Update the combatant's visibility to GM-only (hidden from players)
    combatant.update({ hidden: true });
  }
});