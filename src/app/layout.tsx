import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Toaster } from "react-hot-toast";

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
      <body className="antialiased bg-white min-h-screen">
        <Navigation />
        <main className="relative">
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '0.75rem',
                background: 'var(--dark-blue)',
                color: 'white',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
                fontSize: '0.95rem',
              },
              success: {
                style: {
                  background: 'green',
                  color: 'white',
                },
              },
              error: {
                style: {
                  background: 'red',
                  color: 'white',
                },
              },
            }}
          />
        </main>
      </body>
    </html>
  );
}
