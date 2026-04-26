// Cerabond's Quick Strikes
// When a weapon or unarmed attack roll against a targeted token results in a hit or
// critical hit, automatically triggers the appropriate damage roll immediately.
// The rolling client handles damage to prevent duplicate rolls from multiple connected users.

const TAG = "Cerabond's Quick Strikes |";

Hooks.once("init", () => {
    game.settings.register("cerabonds-degrees-of-success", "quickStrikesEnabled", {
        name: "Quick Strikes: Auto-Roll Damage",
        hint: "Automatically roll damage when your attack roll results in a hit or critical hit.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });
});

Hooks.on("createChatMessage", async (message) => {
    // Only the client who made the roll triggers damage to prevent duplicate applications
    if (message.author?.id !== game.user.id) return;

    // Respect the per-client toggle
    if (!game.settings.get("cerabonds-degrees-of-success", "quickStrikesEnabled")) return;

    // Require a roll message with PF2e context flags
    if (!message.isRoll || !message.flags?.pf2e) return;

    const context = message.flags.pf2e.context;
    if (context?.type !== "strike-attack-roll") return;

    // Degree of success: 2 = Success (hit), 3 = Critical Success (critical hit)
    const degreeOfSuccess = message.rolls[0]?.options?.degreeOfSuccess;
    if (degreeOfSuccess !== 2 && degreeOfSuccess !== 3) return;

    // Resolve the attacking actor from its UUID
    const actorUuid = context.actor;
    if (!actorUuid) return;
    const actor = await fromUuid(actorUuid);
    if (!actor) return;

    // Resolve the weapon / unarmed attack item from its UUID
    const itemUuid = context.item;
    if (!itemUuid) return;
    const item = await fromUuid(itemUuid);
    if (!item) return;

    // Find the matching strike action on the actor
    const strikes = actor.system.actions;
    if (!Array.isArray(strikes) || strikes.length === 0) return;

    const strike = strikes.find(s => s.item?.id === item.id);
    if (!strike) {
        console.warn(TAG, `No strike action found for item "${item.name}" on actor "${actor.name}"`);
        return;
    }

    // Resolve the target token document for IWR (immunity/weakness/resistance) calculations
    const targetTokenUuid = context.target?.token;
    let targetTokenDoc = null;
    if (targetTokenUuid) {
        targetTokenDoc = await fromUuid(targetTokenUuid);
    }

    const outcomeLabel = degreeOfSuccess === 3 ? "critical hit" : "hit";
    console.log(
        TAG,
        `${actor.name} scored a ${outcomeLabel} with "${item.name}"` +
        (targetTokenDoc ? ` against ${targetTokenDoc.name}` : "") +
        " — rolling damage automatically."
    );

    try {
        if (degreeOfSuccess === 3) {
            await strike.critical({ target: targetTokenDoc });
        } else {
            await strike.damage({ target: targetTokenDoc });
        }
    } catch (err) {
        console.error(TAG, "Error during automatic damage roll:", err);
    }
});
