Hooks.on("createCombatant", (combatant, options, userId) => {
  if (!game.user.isGM) return;
  // Check if the combatant is an NPC
  if (combatant.actor && combatant.actor.hasPlayerOwner === false) {
    // Update the combatant's display name to "Unknown Creature"
    combatant.update({ name: "Unknown Creature" });
    // Get the token associated with this combatant
    const token = combatant.token?.object;

    // Update the token's display name to "Unknown Creature"
    if (token) {
      console.log(token);
      token.document.update({ name: "Unknown Creature" });
      // token.update({ name: "Unknown Creature" });
    }
  }
});