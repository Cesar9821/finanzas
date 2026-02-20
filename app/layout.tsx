import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Configuración de la fuente Inter para mantener el estilo limpio y moderno
const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Vault Elite | Private Banking Dashboard",
  description: "Sistema de gestión financiera inteligente y privada",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#05070a] text-slate-400 selection:bg-emerald-500/30`}
      >
        {/* Envoltorio principal */}
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}