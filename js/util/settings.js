// Player/creator settings saved in the browser (theme, board style, mark symbol).
const KEY = 'pictogram-settings';
const DEFAULTS = { theme: null, board: 'classic', mark: 'x' }; // theme null = follow the device

export function loadSettings() {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch (e) {
        return { ...DEFAULTS };
    }
}

export function saveSettings(patch) {
    const merged = { ...loadSettings(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch (e) { /* storage blocked: ignore */ }
    return merged;
}

export function currentTheme() {
    const s = loadSettings();
    if (s.theme === 'light' || s.theme === 'dark') return s.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme() {
    document.documentElement.setAttribute('data-bs-theme', currentTheme());
}

// Wires a button that switches between light and dark. onChange(theme) is called after each switch.
export function setupThemeButton(button, onChange = () => {}) {
    const label = () => { button.textContent = currentTheme() === 'dark' ? '☾ Dark theme' : '☀ Light theme'; };
    label();
    button.addEventListener('click', () => {
        saveSettings({ theme: currentTheme() === 'dark' ? 'light' : 'dark' });
        applyTheme();
        label();
        onChange(currentTheme());
    });
}
