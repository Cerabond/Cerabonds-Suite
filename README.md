# Cerabonds-Suite
A collection of various quality of life modules for PF2e in Foundry Vtt

## Icewind Dale 2 Items
Cerabond's Suite Improved includes a GM-only **Icewind Dale 2 Items** compendium of Icewind Dale 2 items converted to PF2e. Each item is a JSON file in `cerabonds-degrees-of-success/src/packs/icewind-dale-2-items`.

## Releasing an update
1. Run `npm install` once from the repository root (requires [Node.js](https://nodejs.org)).
2. Bump `version` in `cerabonds-degrees-of-success/module.json`.
3. Run `cerabonds-degrees-of-success/build-zip.ps1`, which builds the compendium packs and rebuilds `module.zip`.
4. Push to master; Foundry will offer the update through the manifest link.
