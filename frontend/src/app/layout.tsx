import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LitLens — AI Research Copilot",
  description: "Evidence-Grounded AI Research Copilot for Paper Discovery, Analysis, Multi-Paper Comparison, Research Gap Finding, and Synthesis.",
  icons: {
    icon: "/favicon.jpg",
    shortcut: "/favicon.jpg",
    apple: "/favicon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.jpg" type="image/jpeg" />
        <link rel="shortcut icon" href="/favicon.jpg" />
        <link rel="apple-touch-icon" href="/favicon.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#F7F4ED] text-[#2D372E] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
