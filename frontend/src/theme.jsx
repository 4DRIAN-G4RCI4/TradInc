import { useEffect, useState } from "react";
import { ThemeContext } from "./themeContext.js";

const STORAGE_KEY = "tradinc-theme";

function getInitialDark() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === "dark";
  } catch {
    // localStorage bloqueado (modo privado, políticas del navegador, etc.)
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function ThemeProvider({ children }) {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // Si no se puede persistir, la app sigue funcionando sin recordar el tema.
    }
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}
