import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import Provider from "./provider";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "WhizBoard",
  description:
    "Turn your ideas into diagrams, notes, and visuals on an infinite canvas.",
};

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="m-0 min-h-screen p-0">
        {isClerkConfigured ? (
          <ClerkProvider>
            <Provider>{children}</Provider>
          </ClerkProvider>
        ) : (
          children
        )}

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
          expand={false}
        />
      </body>
    </html>
  );
}