"use client";

import type { Metadata } from "next";
import "./globals.css";
import "./lib/envSetup";
import { PrivyProvider } from "@privy-io/react-auth";

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
      </head>
      <body className={`antialiased`}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={{
            // Customize login methods
            loginMethods: ["email", "google", "twitter"],
            // Configure embedded wallets
            embeddedWallets: {
              createOnLogin: "users-without-wallets", // Auto-create wallets
            },
            // Add appearance customization
            appearance: {
              theme: "light",
              accentColor: "#676FFF",
            },
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
