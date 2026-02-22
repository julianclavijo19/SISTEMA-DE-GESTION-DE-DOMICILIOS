import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, DM_Serif_Display, Tangerine } from "next/font/google";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({
  variable: "--font-ibm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const tangerine = Tangerine({
  variable: "--font-tangerine",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "delivery — Sistema de Domicilios",
  description: "Panel de gestión de domicilios — Ocaña, Norte de Santander",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${ibmSans.variable} ${ibmMono.variable} ${dmSerif.variable} ${tangerine.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
