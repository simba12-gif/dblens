import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DBLens — See Your Database Think",
  description:
    "Turn SQL schemas into interactive, animated ER diagrams in seconds. Drag, zoom, and explore your database visually — Figma for databases.",
  keywords: [
    "database",
    "ER diagram",
    "schema visualization",
    "SQL",
    "developer tools",
  ],
  openGraph: {
    title: "DBLens — See Your Database Think",
    description:
      "Turn SQL schemas into interactive, animated ER diagrams in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${pressStart2P.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
