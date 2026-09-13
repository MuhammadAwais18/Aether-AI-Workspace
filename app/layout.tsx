import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aether AI Workspace",
  description: "A focused, intelligent workspace for teams that build with AI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}