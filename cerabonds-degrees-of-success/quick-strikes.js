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

    // --- DIAGNOSTIC: log every attack-adjacent message so we can inspect the shape ---
    if (message.flags?.pf2e?.context) {
        console.log(TAG, "PF2e roll message received — context type:", context?.type);
        console.log(TAG, "Full flags.pf2e.context:", JSON.parse(JSON.stringify(context)));
        console.log(TAG, "rolls[0] options:", JSON.parse(JSON.stringify(message.rolls[0]?.options ?? {})));
    }
    // ---------------------------------------------------------------------------------

    if (context?.type !== "strike-attack-roll") return;

    // Degree of success: 2 = Success (hit), 3 = Critical Success (critical hit)
    const degreeOfSuccess = message.rolls[0]?.options?.degreeOfSuccess;
    console.log(TAG, "degreeOfSuccess:", degreeOfSuccess);
    if (degreeOfSuccess !== 2 && degreeOfSuccess !== 3) return;

    // Resolve the attacking actor from its UUID
    const actorUuid = context.actor;
    console.log(TAG, "actorUuid:", actorUuid);
    if (!actorUuid) return;
    const actor = await fromUuid(actorUuid);
    if (!actor) { console.warn(TAG, "Could not resolve actor from UUID:", actorUuid); return; }

    // Resolve the weapon / unarmed attack item from its UUID
    const itemUuid = context.item;
    console.log(TAG, "itemUuid:", itemUuid);
    if (!itemUuid) return;
    const item = await fromUuid(itemUuid);
    if (!item) { console.warn(TAG, "Could not resolve item from UUID:", itemUuid); return; }

    // Find the matching strike action on the actor
    const strikes = actor.system.actions;
    console.log(TAG, "actor.system.actions:", strikes);
    if (!Array.isArray(strikes) || strikes.length === 0) { console.warn(TAG, "No actions array found on actor"); return; }

    const strike = strikes.find(s => s.item?.id === item.id);
    if (!strike) {
        console.warn(TAG, `No strike action found for item "${item.name}" (id: ${item.id}) on actor "${actor.name}"`);
        console.log(TAG, "Available strike item ids:", strikes.map(s => s.item?.id));
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
