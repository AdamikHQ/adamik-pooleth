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
        <title>Adamik Agent</title>
        <meta name="description" content="A demo app from Adamik." />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Handle wallet extension conflicts before app loads
              (function() {
                if (typeof window !== 'undefined' && window.ethereum) {
                  const originalEthereum = window.ethereum;
                  
                  // Prevent redefinition errors
                  try {
                    Object.defineProperty(window, 'ethereum', {
                      value: originalEthereum,
                      writable: false,
                      configurable: false
                    });
                  } catch (e) {
                    // Property already defined, continue gracefully
                    console.log('Ethereum provider already configured');
                  }
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
