import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import Provider from "./provider";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

// ==========================================
// FONT CONFIGURATION
// ==========================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// ==========================================
// APPLICATION METADATA
// ==========================================

export const metadata: Metadata = {
  title: "WhizBoard",
  description:
    "Turn your ideas into diagrams, notes, and visuals on an infinite canvas.",
};

// ==========================================
// CLERK CONFIGURATION
// ==========================================

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

// ==========================================
// ROOT LAYOUT
// ==========================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="m-0 min-h-screen p-0">
        {/* Authentication and application providers */}
        {isClerkConfigured ? (
          <ClerkProvider>
            <Provider>{children}</Provider>
          </ClerkProvider>
        ) : (
          children
        )}

        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
          expand={false}
          visibleToasts={4}
          toastOptions={{
            classNames: {
              toast: "rounded-xl shadow-lg",
              title: "font-semibold",
              description: "text-sm",
            },
          }}
        />
      </body>
    </html>
  );
}