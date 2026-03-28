import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dice4.me - Roll Real Dice",
  description: "Roll physical dice remotely and see the result on camera!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
