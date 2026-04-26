import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "aceTrack",
  description: "Score en direct",
  manifest: "/manifest.json",

  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/icon-512.png",
    shortcut: "/icons/icon-512.png",
    other: [
      {
        rel: "apple-touch-icon",
        url: "/icons/icon-512.png",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "aceTrack",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
