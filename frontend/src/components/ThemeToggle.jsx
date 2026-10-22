import { useTheme } from "../useTheme.js";

export function ThemeToggle() {
  const { dark, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
      className="theme-toggle"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
