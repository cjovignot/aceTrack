import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "aceTrack",
  description: "Score en direct",

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "aceTrack",
  },

  icons: {
    apple: "/icons/icon-512.png",
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
