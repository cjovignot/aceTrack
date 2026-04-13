import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "aceTrack",
  description: "Starter Kit NextJS 15 : Start Now !",
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
