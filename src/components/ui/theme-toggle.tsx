"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // On initialise depuis localStorage, défaut : mode sombre
    const stored = localStorage.getItem("theme");
    const isDark = stored !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.setProperty(
      "color-scheme",
      next ? "dark" : "light",
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="grid size-9 place-items-center rounded-full border border-[var(--line)]
        text-muted transition-colors hover:text-cloud focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <span className="text-[16px] leading-none select-none" aria-hidden>
        {dark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
