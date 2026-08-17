import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power BI Theme Studio",
  description: "A local visual editor for Power BI JSON themes.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
