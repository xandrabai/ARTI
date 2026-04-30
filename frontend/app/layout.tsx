import type { Metadata } from "next";
import MainLayout from "../components/MainLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARTI",
  description: "Emotion-driven art discovery and sketching",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
