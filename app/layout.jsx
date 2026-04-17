import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "aceTrack",
  description: "Score en direct",

  // ✅ PWA
  manifest: "/manifest.json",
  themeColor: "#000000",

  // ✅ iOS support
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "aceTrack",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr"
    >
        <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icons/icon-180.png">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}