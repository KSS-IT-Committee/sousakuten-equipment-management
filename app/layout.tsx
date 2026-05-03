import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "創作展　貸出備品管理サイト",
  description: "創作展中の備品貸出管理サイト",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

/**
 * Root layout component that applies global fonts, page-level HTML attributes, and renders app content.
 *
 * Renders an `<html lang="en">` element with font-related CSS variables and utility classes, and a `<body>` that wraps the provided children.
 *
 * @param children - The React nodes to render inside the application's body
 * @returns The root HTML structure containing the rendered children
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
