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
    console.log(TAG, `Button pressed: ${die}`);
    insertDieFormula(die, anchor);
  }, true); // capture phase

  console.log(TAG, 'Event listeners attached to tray (delegated)');
});

function insertDieFormula(die, formAnchor) {
  const formula = `/r 1${die}`;
  console.log(TAG, `Inserting formula into chat: ${formula}`);

  // v14 uses ProseMirror for the chat input. Find the editor element.
  const pmEditor = formAnchor.querySelector('.ProseMirror') ??
    formAnchor.querySelector('[contenteditable="true"]') ??
    document.querySelector('.chat-form .ProseMirror') ??
    document.querySelector('.chat-form [contenteditable="true"]');

  if (pmEditor) {
    // ProseMirror contenteditable div — set its text content and dispatch
    // an input event so ProseMirror picks up the change.
    pmEditor.focus();
    pmEditor.innerHTML = `<p>${formula}</p>`;
    pmEditor.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(TAG, 'Formula inserted into ProseMirror editor');
    return;
  }

  // Fallback: look for a plain textarea (older Foundry or custom setups).
  const textarea = formAnchor.querySelector('textarea') ??
    document.querySelector('.chat-form textarea');

  if (textarea) {
    textarea.focus();
    textarea.value = formula;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(TAG, 'Formula inserted into textarea');
    return;
  }

  console.warn(TAG, 'Could not find chat input element to insert formula.');
}