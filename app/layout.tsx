import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "./letterhead.css";

export const metadata: Metadata = {
  title: "VonWillingh Admin",
  description: "Invoices, quotes and credit notes for VonWillingh Online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-ZA"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
