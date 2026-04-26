// Cerabond's Quick Strikes
// When a weapon or unarmed attack roll against a targeted token results in a hit or
// critical hit, automatically rolls damage and applies it to the target immediately.
// The rolling client handles damage to prevent duplicate rolls from multiple connected users.

const TAG = "Cerabond's Quick Strikes |";

// Tracks target token UUIDs whose next incoming damage-roll message should be auto-applied.
const _quickStrikesPendingApply = new Set();

// Set to true while we are auto-rolling damage so the modifier dialog is auto-submitted.
let _quickStrikeRollingDamage = false;

// Auto-submit the damage modifier dialog (situational bonuses) when triggered by a quick-strike.
Hooks.on("renderDamageModifierDialog", (app) => {
    if (!_quickStrikeRollingDamage) return;
    // Call the Application's own submit() rather than touching the HTML,
    // which avoids any risk of triggering native browser form navigation.
    app.submit();
});

Hooks.once("init", () => {
    game.settings.register("cerabonds-degrees-of-success", "quickStrikesEnabled", {
        name: "Quick Strikes: Auto-Roll Damage",
        hint: "Automatically roll and apply damage when your attack roll results in a hit or critical hit.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });
});

Hooks.on("createChatMessage", async (message) => {
    // Only the client who made the roll handles this to prevent duplicates
    if (message.author?.id !== game.user.id) return;

    // Respect the per-client toggle
    if (!game.settings.get("cerabonds-degrees-of-success", "quickStrikesEnabled")) return;

    const context = message.flags?.pf2e?.context;
    if (!context) return;

    // === DAMAGE ROLL: auto-apply if queued by a quick-strike attack ===
    if (context.type === "damage-roll") {
        const targetUuid = context.target?.token;
        if (!targetUuid || !_quickStrikesPendingApply.has(targetUuid)) return;
        _quickStrikesPendingApply.delete(targetUuid);

        const targetToken = await fromUuid(targetUuid);
        if (!targetToken) { console.warn(TAG, "Could not resolve target for damage application:", targetUuid); return; }

        try {
            if (game.pf2e?.Damage?.applyDamage) {
                await game.pf2e.Damage.applyDamage({ message, token: targetToken, multiplier: 1 });
            } else if (typeof message.applyDamage === "function") {
                await message.applyDamage({ token: targetToken, multiplier: 1 });
            } else {
                console.warn(TAG, "Could not find a damage application method on this version of PF2e.");
                console.log(TAG, "Available game.pf2e keys:", Object.keys(game.pf2e ?? {}));
            }
        } catch (err) {
            console.error(TAG, "Error applying damage:", err);
        }
        return;
    }

    // === ATTACK ROLL: check for hit/crit and trigger damage ===
    if (!message.isRoll) return;
    if (context.type !== "attack-roll" || context.action !== "strike") return;

    // Degree of success: 2 = Success (hit), 3 = Critical Success (critical hit)
    const degreeOfSuccess = message.rolls[0]?.options?.degreeOfSuccess;
    if (degreeOfSuccess !== 2 && degreeOfSuccess !== 3) return;

    // Resolve the attacking actor via the full origin UUID (Scene.x.Token.x.Actor.x)
    const actorUuid = context.origin?.actor;
    if (!actorUuid) return;
    const actor = await fromUuid(actorUuid);
    if (!actor) { console.warn(TAG, "Could not resolve actor from UUID:", actorUuid); return; }

    // Extract item ID from identifier (format: "itemId.slug.attackType")
    const itemId = context.identifier?.split(".")[0];
    if (!itemId) return;

    // Find the matching strike action on the actor
    const strikes = actor.system.actions;
    if (!Array.isArray(strikes) || strikes.length === 0) { console.warn(TAG, "No actions array found on actor"); return; }

    const strike = strikes.find(s => s.item?.id === itemId);
    if (!strike) {
        console.warn(TAG, `No strike action found for item id "${itemId}" on actor "${actor.name}"`);
        return;
    }

    const targetTokenUuid = context.target?.token;
    let targetTokenDoc = null;
    if (targetTokenUuid) {
        targetTokenDoc = await fromUuid(targetTokenUuid);
    }

    // Queue the target for auto-apply when the damage message arrives
    if (targetTokenUuid) _quickStrikesPendingApply.add(targetTokenUuid);

    const outcomeLabel = degreeOfSuccess === 3 ? "critical hit" : "hit";
    console.log(
        TAG,
        `${actor.name} scored a ${outcomeLabel} with "${strike.item?.name}"` +
        (targetTokenDoc ? ` against ${targetTokenDoc.name}` : "") +
        " — rolling and applying damage automatically."
    );

    _quickStrikeRollingDamage = true;
    try {
        if (degreeOfSuccess === 3) {
            await strike.critical({ target: targetTokenDoc, skipDialog: true });
        } else {
            await strike.damage({ target: targetTokenDoc, skipDialog: true });
        }
    } catch (err) {
        // If the roll itself fails, clean up the pending entry
        if (targetTokenUuid) _quickStrikesPendingApply.delete(targetTokenUuid);
        console.error(TAG, "Error during automatic damage roll:", err);
    } finally {
        _quickStrikeRollingDamage = false;
    }
});
