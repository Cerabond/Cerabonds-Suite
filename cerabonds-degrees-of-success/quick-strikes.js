// Cerabond's Quick Strikes
// When a weapon or unarmed attack roll against a targeted token results in a hit or
// critical hit, automatically rolls damage and applies it to the target immediately.
// The rolling client handles damage to prevent duplicate rolls from multiple connected users.

const TAG = "Cerabond's Quick Strikes |";

// True while we are auto-rolling damage — used to gate the modifier dialog hook.
let _quickStrikeRollingDamage = false;

// The target token UUID for the damage roll currently in progress.
// Set before strike.damage/critical is called; cleared in the finally block.
let _pendingQuickStrikeTarget = null;

// ─── Dialog: auto-confirm the DamageModifierDialog ───────────────────────────
// DamageDamageContext has no `skipDialog` field for NPC attacks, so the dialog
// always appears even when we pass skipDialog:true to strike.damage(). We
// dismiss it here by setting isRolled=true before calling close(), which causes
// the dialog's internal Promise to resolve with `true` (roll confirmed).
Hooks.on("renderDamageModifierDialog", (app) => {
    if (!_quickStrikeRollingDamage) return;
    console.log(TAG, "Auto-dismissing DamageModifierDialog");
    app.isRolled = true;
    app.close();
});

// ─── Tag: stamp the damage-roll chat message with our target UUID ─────────────
// For NPC attacks, PF2e may not populate context.target.token on the damage
// message even when we pass a target to strike.damage(). To work around this
// we stamp the message with our own flag before it reaches the database.
Hooks.on("preCreateChatMessage", (message, data, options, userId) => {
    if (!_quickStrikeRollingDamage || !_pendingQuickStrikeTarget) return;
    const pf2eContext = data.flags?.pf2e?.context;
    if (pf2eContext?.type !== "damage-roll") return;
    console.log(TAG, "Stamping damage-roll message → target:", _pendingQuickStrikeTarget);
    message.updateSource({ "flags.cerabonds.quickStrikes.targetUuid": _pendingQuickStrikeTarget });
});

// ─── Settings ─────────────────────────────────────────────────────────────────
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

// ─── Main hook ────────────────────────────────────────────────────────────────
Hooks.on("createChatMessage", async (message) => {
    // Only the rolling client acts to prevent duplicate actions across connected users.
    if (message.author?.id !== game.user.id) return;
    if (!game.settings.get("cerabonds-degrees-of-success", "quickStrikesEnabled")) return;

    const pf2eContext = message.flags?.pf2e?.context;

    // ── Damage-roll branch: apply damage if this message was stamped by us ──
    const targetUuid = message.flags?.cerabonds?.quickStrikes?.targetUuid;
    if (targetUuid && pf2eContext?.type === "damage-roll") {
        console.log(TAG, "Auto-applying damage → target:", targetUuid);

        const targetToken = await fromUuid(targetUuid);
        if (!targetToken) { console.warn(TAG, "Could not resolve target token:", targetUuid); return; }

        const targetActor = targetToken.actor;
        if (!targetActor) { console.warn(TAG, "Target token has no actor:", targetUuid); return; }

        const damageRoll = message.rolls[0];
        if (!damageRoll) { console.warn(TAG, "No damage roll in message"); return; }

        try {
            // ActorPF2e.applyDamage() accepts an already-evaluated DamageRoll,
            // applies IWR (immunities/resistances/weaknesses), and updates HP.
            // It does NOT re-calculate or show any new dialog.
            await targetActor.applyDamage({
                damage: damageRoll,
                token: targetToken,
                rollOptions: new Set(pf2eContext.options ?? []),
                outcome: pf2eContext.outcome ?? null,
            });
            console.log(TAG, "Damage applied successfully");
        } catch (err) {
            console.error(TAG, "Error applying damage:", err);
        }
        return;
    }

    // ── Attack-roll branch: detect hit/crit, then roll damage ──
    if (!pf2eContext) return;
    if (!message.isRoll) return;
    if (pf2eContext.type !== "attack-roll" || pf2eContext.action !== "strike") return;

    // degreeOfSuccess: 2 = hit, 3 = critical hit
    const degreeOfSuccess = message.rolls[0]?.options?.degreeOfSuccess;
    if (degreeOfSuccess !== 2 && degreeOfSuccess !== 3) return;

    const actorUuid = pf2eContext.origin?.actor;
    if (!actorUuid) return;
    const actor = await fromUuid(actorUuid);
    if (!actor) { console.warn(TAG, "Could not resolve actor:", actorUuid); return; }

    // Item ID is the first segment of the identifier ("itemId.slug.melee|ranged")
    const itemId = pf2eContext.identifier?.split(".")[0];
    if (!itemId) return;

    const strikes = actor.system.actions;
    if (!Array.isArray(strikes) || strikes.length === 0) { console.warn(TAG, "No actions on actor"); return; }

    const strike = strikes.find(s => s.item?.id === itemId);
    if (!strike) { console.warn(TAG, `No strike for item "${itemId}" on "${actor.name}"`); return; }

    const targetTokenUuid = pf2eContext.target?.token;
    let targetTokenDoc = null;
    if (targetTokenUuid) targetTokenDoc = await fromUuid(targetTokenUuid);

    const outcomeLabel = degreeOfSuccess === 3 ? "critical hit" : "hit";
    console.log(TAG,
        `${actor.name} scored a ${outcomeLabel} with "${strike.item?.name}"` +
        (targetTokenDoc ? ` against ${targetTokenDoc.name}` : "") +
        " — rolling and applying damage automatically."
    );

    _quickStrikeRollingDamage = true;
    _pendingQuickStrikeTarget = targetTokenUuid ?? null;
    try {
        if (degreeOfSuccess === 3) {
            await strike.critical({ target: targetTokenDoc, skipDialog: true });
        } else {
            await strike.damage({ target: targetTokenDoc, skipDialog: true });
        }
    } catch (err) {
        console.error(TAG, "Error during automatic damage roll:", err);
    } finally {
        _quickStrikeRollingDamage = false;
        _pendingQuickStrikeTarget = null;
    }
});
