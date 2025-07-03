import dotenv from "dotenv";

dotenv.config({ path: "./env" });

// Environment setup for browser compatibility

// Prevent wallet extension conflicts
if (typeof window !== "undefined") {
  // Store reference to existing ethereum object if it exists
  const existingEthereum = (window as any).ethereum;

  // Handle ethereum property conflicts gracefully
  if (existingEthereum) {
    // Define a getter/setter that preserves the original ethereum object
    // while allowing Privy to work alongside it
    try {
      Object.defineProperty(window, "ethereum", {
        get: () => existingEthereum,
        set: (newValue) => {
          // Allow setting if it's different from existing value
          if (newValue !== existingEthereum) {
            console.log(
              "Multiple ethereum providers detected, using existing one"
            );
          }
        },
        configurable: true,
        enumerable: true,
      });
    } catch (error) {
      // If property is already non-configurable, log and continue
      console.log(
        "Ethereum provider conflict detected, continuing with existing provider"
      );
    }
  }

  // Suppress ethereum provider warnings in development
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0]?.toString() || "";
    if (message.includes("ethereum") && message.includes("property")) {
      // Suppress wallet provider property warnings
      return;
    }
    originalWarn.apply(console, args);
  };
}
