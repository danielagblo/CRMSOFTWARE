import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "CRM Pro - Sales Management System",
  description: "Professional CRM application for managing leads and sales pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="anitaliased bg-white min-h-screen">
        <Navigation />
        <main className="relative">
          {children}
        </main>
      </body>
    </html>
  );
}
