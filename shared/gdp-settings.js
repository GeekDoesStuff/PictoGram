// Goblin Does Puzzles — shared, generic per-site settings storage + theme helpers.
// Knows nothing about any particular puzzle; a project wraps this with its own
// storage key and default values (see Pictogram's js/util/settings.js for an example).

// Creates a small JSON-in-localStorage store. `defaults` is merged under whatever is saved.
export function createSettingsStore(key, defaults) {
    function load() {
        try {
            return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') };
        } catch (e) {
            return { ...defaults };
        }
    }
    function save(patch) {
        const merged = { ...load(), ...patch };
        try { localStorage.setItem(key, JSON.stringify(merged)); } catch (e) { /* storage blocked: ignore */ }
        return merged;
    }
    return { load, save };
}

// Theme helpers work on any store that has a `theme` field: null/undefined follows the
// device's preference, otherwise 'light' or 'dark'.

export function currentTheme(store) {
    const s = store.load();
    if (s.theme === 'light' || s.theme === 'dark') return s.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(store) {
    document.documentElement.setAttribute('data-bs-theme', currentTheme(store));
}

// Wires a button that switches between light and dark. onChange(theme) is called after each switch.
export function setupThemeButton(store, button, onChange = () => {}) {
    const label = () => { button.textContent = currentTheme(store) === 'dark' ? '☾ Dark theme' : '☀ Light theme'; };
    label();
    button.addEventListener('click', () => {
        store.save({ theme: currentTheme(store) === 'dark' ? 'light' : 'dark' });
        applyTheme(store);
        label();
        onChange(currentTheme(store));
    });
}
