import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeScript() {
  const script = `
(function() {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "dark" ? "dark" : "light";
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    root.style.backgroundColor = theme === "dark" ? "#0f1117" : "#ffffff";
  } catch (e) {}
})();
`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
