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
              // Handle wallet extension conflicts gracefully
              (function() {
                // Allow extensions to compete naturally, Privy will handle provider selection
                if (typeof window !== 'undefined') {
                  // Just log conflicts without preventing them
                  const originalDefineProperty = Object.defineProperty;
                  Object.defineProperty = function(obj, prop, descriptor) {
                    if (obj === window && prop === 'ethereum') {
                      try {
                        return originalDefineProperty.call(this, obj, prop, descriptor);
                      } catch (e) {
                        console.log('Multiple wallet extensions detected - Privy will handle provider selection');
                        return obj[prop]; // Return existing value
                      }
                    }
                    return originalDefineProperty.call(this, obj, prop, descriptor);
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
