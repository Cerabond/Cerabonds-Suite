// Cerabonds Dice Tray

const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const TAG = 'Cerabonds Dice Tray |';

Hooks.on('renderChatLog', (app, element) => {
  console.log(TAG, 'renderChatLog fired');

  const root = element instanceof HTMLElement ? element : element[0];

  // Clean up any previous tray.
  document.getElementById('cerabonds-dice-tray')?.remove();

  // Find the input part.
  const anchor =
    root.querySelector('[data-application-part="input"]') ??
    root.querySelector('.chat-form') ??
    root.querySelector('form') ??
    document.querySelector('#chat [data-application-part="input"]') ??
    document.querySelector('.chat-form');

  if (!anchor) {
    console.warn(TAG, 'Could not find the chat input section.');
    console.log(TAG, 'Root element:', root);
    console.log(TAG, 'Root innerHTML preview:', root.innerHTML.substring(0, 500));
    return;
  }

  console.log(TAG, 'Found anchor element:', anchor.tagName, anchor.className);

  const tray = document.createElement('div');
  tray.id = 'cerabonds-dice-tray';
  tray.innerHTML = `<div class="dice-tray__buttons">${
    DICE.map(d => `<button type="button" class="dice-tray__btn" data-die="${d}">${d}</button>`).join('')
  }</div>`;

  anchor.insertAdjacentElement('beforebegin', tray);
  console.log(TAG, 'Tray injected into DOM');

  // Use pointerdown on the capture phase — this fires before ApplicationV2's
  // click delegation can swallow the event.
  tray.addEventListener('pointerdown', (event) => {
    const btn = event.target.closest('.dice-tray__btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const die = btn.dataset.die;
    console.log(TAG, `Button pointerdown: ${die}`);
    rollDie(die);
  }, true); // capture phase

  // Also add click as a fallback, in case pointerdown is also blocked.
  tray.addEventListener('click', (event) => {
    const btn = event.target.closest('.dice-tray__btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const die = btn.dataset.die;
    console.log(TAG, `Button click fallback: ${die}`);
    rollDie(die);
  }, true); // capture phase

  console.log(TAG, 'Event listeners attached to tray (delegated)');
});

async function rollDie(die) {
  const formula = `1${die}`;
  console.log(TAG, `Rolling: ${formula}`);

  try {
    // Use ui.chat.processMessage which handles everything including /r commands.
    // This is the same path as typing "/r 1d20" in the chat box.
    await ui.chat.processMessage(`/r ${formula}`);
    console.log(TAG, `Roll sent to chat: ${formula}`);
  } catch (err) {
    console.error(TAG, 'Roll via processMessage failed:', err);

    // Fallback: try direct Roll API
    try {
      console.log(TAG, 'Trying direct Roll API fallback...');
      const RollClass = CONFIG.Dice?.rolls?.[0] ?? Roll;
      console.log(TAG, 'Using Roll class:', RollClass.name);
      const roll = new RollClass(formula);
      await roll.evaluate();
      console.log(TAG, 'Roll evaluated:', roll.total);
      await roll.toMessage();
      console.log(TAG, 'Roll message sent');
    } catch (err2) {
      console.error(TAG, 'Direct Roll API also failed:', err2);
    }
  }
}