"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { messagesFor, type Locale, type Messages } from "./messages";

export type ThemeName = "light" | "dark";

type DemoContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: ThemeName;
  toggleTheme: () => void;
  t: Messages;
};

const DemoContext = createContext<DemoContextValue>({
  locale: "en",
  setLocale: () => undefined,
  theme: "light",
  toggleTheme: () => undefined,
  t: messagesFor("en"),
});

function prefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [theme, setTheme] = useState<ThemeName>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedLocale = localStorage.getItem("locale");
    if (storedLocale === "es" || storedLocale === "en") {
      setLocaleState(storedLocale);
    }
    const attribute = document.documentElement.getAttribute("data-theme");
    const storedTheme = localStorage.getItem("theme");
    const nextTheme =
      attribute === "light" || attribute === "dark"
        ? attribute
        : storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : prefersDark()
            ? "dark"
            : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
  }, [locale, ready]);

  const value = useMemo<DemoContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      theme,
      toggleTheme: () => {
        const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
        setTheme(next);
      },
      t: messagesFor(locale),
    }),
    [locale, theme],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useLocale(): DemoContextValue {
  return useContext(DemoContext);
}
