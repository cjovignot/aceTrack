"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Watch, Radio, User } from "lucide-react";

const nav = [
  { path: "/dashboard", icon: Home, label: "Accueil" },
  { path: "/live-score", icon: Watch, label: "Match" },
  { path: "/stream", icon: Radio, label: "Live" },
  { path: "/profile", icon: User, label: "Profil" },
];

export default function ProtectedLayout({ children }) {
  const appName = "aceTrack";
  const pathname = usePathname();
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-20 md:pb-0 md:pl-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-gray-100 md:top-0 md:bottom-0 md:right-auto md:w-20 md:border-t-0 md:border-r md:h-auto">
        <div className="flex items-center justify-around h-full md:flex-col md:h-full md:py-6 md:justify-start md:gap-2 md:px-2">
          <div className="items-center justify-center hidden w-12 h-12 mb-4 text-lg font-bold text-white bg-green-600 md:flex rounded-xl">
            {appName.charAt(0).toUpperCase()}
          </div>
          {nav.map((item) => {
            const active =
              pathname === item.path || pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                href={item.path}
                className={
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 md:w-full md:py-3 md:px-0 rounded-xl transition " +
                  (active
                    ? "text-green-600 bg-green-50"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50")
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
