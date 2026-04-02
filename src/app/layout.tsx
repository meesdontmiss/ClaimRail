import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "ClaimRail - Find Your Lost Royalties",
  description: "Import your catalog, detect missing publishing setup, and claim the royalties you're owed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#0a0a0f] text-[#e8e8ed]">
        <SessionProvider>
          <AppProvider>
            <Navbar />
            {children}
          </AppProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
