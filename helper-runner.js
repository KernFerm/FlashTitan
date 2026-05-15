const { runFlashWorkflow } = require("./flash-engine");

process.on("message", async (message) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type !== "flash:start") {
    process.send?.({
      type: "flash:error",
      id: message.id,
      error: "Unsupported helper command."
    });
    return;
  }

  try {
    const result = await runFlashWorkflow(message.payload, (event) => {
      process.send?.({
        type: "flash:event",
        id: message.id,
        event
      });
    });

    process.send?.({
      type: "flash:result",
      id: message.id,
      result
    });
  } catch (error) {
    process.send?.({
      type: "flash:error",
      id: message.id,
      error: error instanceof Error ? error.message : "Helper flash operation failed."
    });
  }
});
