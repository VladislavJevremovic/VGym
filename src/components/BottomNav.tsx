"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil, ListOrdered, Calendar, BarChart3, Settings } from "lucide-react";

const tabs = [
  { label: "Log", href: "/log", icon: Pencil },
  { label: "Routines", href: "/routines", icon: ListOrdered },
  { label: "History", href: "/history", icon: Calendar },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50 safe-area-bottom">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href === "/log" && pathname === "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => {
                if (window.__vgym_dirty && !window.confirm("Unsaved workout data will be lost. Leave?")) {
                  e.preventDefault();
                }
              }}
              className={`flex flex-col items-center py-2 px-4 text-xs gap-1 transition-colors ${
                active ? "text-emerald-400" : "text-zinc-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
