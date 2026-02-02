import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nouvelle App",
  description: "Généré par Firebase Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
