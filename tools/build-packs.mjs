import { compilePack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

// Compile each module's src/packs/<pack> JSON folder into the packs/<pack> database Foundry loads
for (const moduleDir of fs.readdirSync(root, { withFileTypes: true })) {
    const srcPacks = path.join(root, moduleDir.name, "src", "packs");
    if (!moduleDir.isDirectory() || !fs.existsSync(srcPacks)) continue;

    for (const pack of fs.readdirSync(srcPacks, { withFileTypes: true })) {
        if (!pack.isDirectory()) continue;
        const dest = path.join(root, moduleDir.name, "packs", pack.name);
        await compilePack(path.join(srcPacks, pack.name), dest, { log: true });
    }
}
