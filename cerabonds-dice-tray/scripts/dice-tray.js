// Cerabonds Dice Tray

const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
const TAG = 'Cerabonds Dice Tray |';

const FLAT_CHECKS = [5, 11, 15];

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
  tray.innerHTML = `
    <div class="dice-tray__buttons">
      ${DICE.map(d => `<button type="button" class="dice-tray__btn" data-die="${d}">${d}</button>`).join('')}
    </div>
    <div class="dice-tray__buttons dice-tray__flat-checks">
      ${FLAT_CHECKS.map(dc => `<button type="button" class="dice-tray__btn dice-tray__flat-btn" data-dc="${dc}">Flat DC ${dc}</button>`).join('')}
    </div>
  `;

  anchor.insertAdjacentElement('beforebegin', tray);
  console.log(TAG, 'Tray injected into DOM');

  // Use pointerdown on the capture phase — this fires before ApplicationV2's
  // click delegation can swallow the event.
  tray.addEventListener('pointerdown', (event) => {
    const dieBtn = event.target.closest('.dice-tray__btn[data-die]');
    const flatBtn = event.target.closest('.dice-tray__btn[data-dc]');
    if (!dieBtn && !flatBtn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (dieBtn) {
      const die = dieBtn.dataset.die;
      console.log(TAG, `Die button pressed: ${die}`);
      insertDieFormula(die, anchor);
    } else if (flatBtn) {
      const dc = parseInt(flatBtn.dataset.dc);
      console.log(TAG, `Flat check button pressed: DC ${dc}`);
      rollFlatCheck(dc);
    }
  }, true); // capture phase

  console.log(TAG, 'Event listeners attached to tray (delegated)');
});

// Track accumulated dice so clicks are additive.
// Resets when the chat box is submitted or cleared.
const dicePool = {};

function insertDieFormula(die, formAnchor) {
  // Add this die to the pool.
  dicePool[die] = (dicePool[die] || 0) + 1;
  console.log(TAG, `Pool updated:`, { ...dicePool });

  // Build the formula from the pool: /r 2d4 + 1d6 + ...
  const parts = [];
  for (const d of DICE) {
    if (dicePool[d]) parts.push(`${dicePool[d]}${d}`);
  }
  const formula = `/r ${parts.join(' + ')}`;
  console.log(TAG, `Formula: ${formula}`);

  // Find the editor and set its content.
  const pmEditor = formAnchor.querySelector('.ProseMirror') ??
    formAnchor.querySelector('[contenteditable="true"]') ??
    document.querySelector('.chat-form .ProseMirror') ??
    document.querySelector('.chat-form [contenteditable="true"]');

  if (pmEditor) {
    pmEditor.focus();
    pmEditor.innerHTML = `<p>${formula}</p>`;
    pmEditor.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(TAG, 'Formula inserted into ProseMirror editor');
    return;
  }

  // Fallback: plain textarea.
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

// Clear the pool when a chat message is sent.
Hooks.on('chatMessage', () => {
  console.log(TAG, 'Chat submitted, clearing dice pool');
  Object.keys(dicePool).forEach(k => delete dicePool[k]);
});

// --- Flat Check Logic ---

function getDegreeOfSuccess(total, dc, isNat1, isNat20) {
  // Calculate base degree: 0=crit fail, 1=fail, 2=success, 3=crit success
  let degree;
  if (total >= dc + 10) degree = 3;      // critical success
  else if (total >= dc) degree = 2;       // success
  else if (total <= dc - 10) degree = 0;  // critical failure
  else degree = 1;                        // failure

  // Natural 20 upgrades by one degree, natural 1 downgrades by one degree.
  if (isNat20) degree = Math.min(degree + 1, 3);
  if (isNat1) degree = Math.max(degree - 1, 0);

  return degree;
}

const DEGREE_LABELS = {
  0: { label: 'Critical Failure', color: '#ff4444' },
  1: { label: 'Failure', color: '#ff8800' },
  2: { label: 'Success', color: '#44cc44' },
  3: { label: 'Critical Success', color: '#4488ff' },
};

async function rollFlatCheck(dc) {
  console.log(TAG, `Rolling flat check vs DC ${dc}`);

  try {
    const roll = new Roll('1d20');
    await roll.evaluate();
    const total = roll.total;
    const die = roll.dice[0];
    const isNat1 = die?.results?.[0]?.result === 1;
    const isNat20 = die?.results?.[0]?.result === 20;
    const degree = getDegreeOfSuccess(total, dc, isNat1, isNat20);
    const { label, color } = DEGREE_LABELS[degree];

    console.log(TAG, `Flat check result: ${total} vs DC ${dc} = ${label}`);

    // Build a chat message with the roll and degree of success.
    const content = `
      <div class="cerabonds-flat-check">
        <h4>Flat Check <span style="opacity:0.7">(DC ${dc})</span></h4>
        <div style="font-size:1.1em; font-weight:bold; color:${color}; margin-top:4px;">
          ${label}
        </div>
      </div>
    `;

    await roll.toMessage({
      flavor: content,
      speaker: ChatMessage.getSpeaker(),
    });

    console.log(TAG, 'Flat check message sent');
  } catch (err) {
    console.error(TAG, 'Flat check failed:', err);
  }
}