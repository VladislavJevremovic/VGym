"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function AccordionSection({
  title, count, defaultOpen, children,
}: {
  title: string;
  count?: number | string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
        <span className="text-sm font-semibold text-white">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-zinc-500 ml-1">({count})</span>
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
