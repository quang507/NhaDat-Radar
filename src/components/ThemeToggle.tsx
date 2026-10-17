"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-md border border-[var(--line)] bg-[var(--surface-2)] shrink-0" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      aria-label="Đổi giao diện sáng/tối"
      className="btn !p-2 text-slate-700 dark:text-slate-200 hover:text-brand hover:border-slate-300 transition-colors shrink-0 rounded-md"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 stroke-[2.2]" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 stroke-[2.2]" />
      )}
    </button>
  );
}
