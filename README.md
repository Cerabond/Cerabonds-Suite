# Cerabonds-Suite
A collection of various quality of life modules for PF2e in Foundry Vtt

## Icewind Dale 2 Compendiums
Cerabond's Suite Improved includes Icewind Dale 2 content converted to PF2e. Each document is a JSON file in `cerabonds-degrees-of-success/src/packs/<compendium>`.

| Compendium | Visible to | Contents |
|---|---|---|
| Icewind Dale 2 Items | GM only | Phaen's Robe of Rags, Houndstooth Collar, Whispering Staff, Blurring Draught, Heart of Porcupine Soup |
| Icewind Dale 2 Bestiary | GM only | Vghotan "Houndstooth", Ghotrag, Caballus, Vghotan's Hound, Goblin Elite, Goblin War Chanter |
| Icewind Dale 2 Effects | Everyone | Effects for the items and creatures above, so players can apply them from chat links |

The bestiary's portraits and tokens point at `tokenizer/npc-images/<name>.Avatar.webp` and `<name>.Token.webp` in your Foundry Data folder. That art is for private use, so it isn't stored in this repository.

## Releasing an update
1. Run `npm install` once from the repository root (requires [Node.js](https://nodejs.org)).
2. Bump `version` in `cerabonds-degrees-of-success/module.json`.
3. Run `cerabonds-degrees-of-success/build-zip.ps1`, which builds the compendium packs and rebuilds `module.zip`.
4. Push to master; Foundry will offer the update through the manifest link.
