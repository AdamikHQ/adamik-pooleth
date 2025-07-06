"use client";

import "./globals.css";
import "./lib/envSetup";
import { PrivyProvider } from "@privy-io/react-auth";
import { allSupportedChains, defaultChain } from "@/app/config/privyChains";

// Move metadata to a separate file or handle it differently since this is now a client component
// export const metadata: Metadata = {
//   title: "Realtime API Agents",
//   description: "A demo app from OpenAI.",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Pooleth - Your Egg-celent Crypto CFO</title>
        <meta
          name="description"
          content="Voice-powered crypto portfolio management for ETH Global Cannes 2025."
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Silence wallet extension conflicts - Privy will handle provider selection
              (function() {
                if (typeof window !== 'undefined') {
                  // Catch all wallet extension errors and silence them
                  const originalError = window.onerror;
                  window.onerror = function(message, source, lineno, colno, error) {
                    // Silence common wallet extension conflicts
                    if (typeof message === 'string' && (
                      message.includes('Cannot redefine property: ethereum') ||
                      message.includes('Cannot set property ethereum') ||
                      message.includes('which has only a getter') ||
                      source.includes('chrome-extension://') && message.includes('ethereum')
                    )) {
                      console.log('Wallet extension conflict silenced - Privy will handle provider selection');
                      return true; // Prevents the error from showing in console
                    }
                    // Call original error handler for other errors
                    if (originalError) {
                      return originalError.call(this, message, source, lineno, colno, error);
                    }
                    return false;
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`antialiased`}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={{
            // Simple authentication methods - Tier 2 approach
            loginMethods: ["google", "twitter"],
            // Configure embedded wallets (Privy handles keypair generation)
            embeddedWallets: {
              createOnLogin: "users-without-wallets", // Auto-create wallets
              requireUserPasswordOnCreate: false, // Simplify wallet creation
              showWalletUIs: false, // Disable Privy's default transaction modals - we use our custom modal
            },
            // EVM chains configuration using viem/chains (recommended by Privy)
            defaultChain: defaultChain,
            supportedChains: allSupportedChains,
            // Clean appearance settings
            appearance: {
              theme: "light",
              accentColor: "#676FFF",
              showWalletLoginFirst: false, // Prioritize social login
            },
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
