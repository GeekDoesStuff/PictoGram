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

// Theme helpers work on any store that has a `theme` field: null/undefined/'auto' follows the
// device's preference, otherwise 'light' or 'dark'.

// The device's own preference right now, regardless of what's saved.
function devicePreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// What the saved theme choice actually is: 'auto', 'light', or 'dark'.
export function themeMode(store) {
    const t = store.load().theme;
    return (t === 'light' || t === 'dark') ? t : 'auto';
}

// What theme is actually shown right now (resolves 'auto' against the device).
export function currentTheme(store) {
    const mode = themeMode(store);
    return mode === 'auto' ? devicePreference() : mode;
}

export function applyTheme(store) {
    document.documentElement.setAttribute('data-bs-theme', currentTheme(store));
}

// Wires a button that cycles Auto -> (the theme opposite the device's current preference) ->
// (back to the device's preference) -> Auto -> ... so every click visibly changes the page,
// even starting from Auto. onChange(theme) is called after each switch.
export function setupThemeButton(store, button, onChange = () => {}) {
    const label = () => {
        const mode = themeMode(store);
        const shown = currentTheme(store);
        const icon = shown === 'dark' ? '☾' : '☀';
        const name = mode === 'auto' ? `Auto (${shown})` : (shown === 'dark' ? 'Dark' : 'Light');
        button.textContent = `${icon} ${name} theme`;
    };
    label();
    button.addEventListener('click', () => {
        const mode = themeMode(store);
        const device = devicePreference();
        const opposite = device === 'dark' ? 'light' : 'dark';
        // auto -> opposite of the device's preference -> the device's own preference (explicit,
        // won't silently follow the device anymore) -> back to auto. Three clicks, three states.
        const next = mode === 'auto' ? opposite : (mode !== device ? device : 'auto');
        store.save({ theme: next === 'auto' ? null : next });
        applyTheme(store);
        label();
        onChange(currentTheme(store));
    });
}
