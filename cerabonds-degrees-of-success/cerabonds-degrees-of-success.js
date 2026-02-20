Hooks.on("createChatMessage", async (message) => {
    if (!message.isRoll || !message.flags.pf2e) return;
    
    const rollType = message.flags.pf2e.context?.type;
    if (rollType !== "saving-throw") return;
    
    const token = canvas.tokens.placeables.find(t => t.id === message.speaker.token);
    if (!token) return;
    
    const degreeOfSuccess = message.rolls[0].options.degreeOfSuccess;
    let tint = "#FFFFFF";
    switch (degreeOfSuccess) {
      case 0: tint = "#8B0000"; break; // Critical Failure - Dark Red
      case 1: tint = "#ffe600"; break; // Failure - Yellow
      case 2: tint = "#008000"; break; // Success - Green
      case 3: tint = "#0000FF"; break; // Critical Success - Blue
    }
    
    await token.document.update({ "texture.tint": tint });
  });