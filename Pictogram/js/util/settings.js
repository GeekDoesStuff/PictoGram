// Pictogram's own settings: wraps the shared Goblin Does Puzzles settings store with
// Pictogram's storage key and defaults (board style, mark symbol, timer visibility).
import { createSettingsStore, currentTheme as gdpCurrentTheme, applyTheme as gdpApplyTheme, setupThemeButton as gdpSetupThemeButton } from '../../../shared/gdp-settings.js';

const KEY = 'gdp-pictogram-settings';
const OLD_KEY = 'pictogram-settings'; // settings saved before the shared-module rename
const DEFAULTS = { theme: null, board: 'classic', mark: 'x', showTimer: true }; // theme null = follow the device

// One-time migration: if someone has settings saved under the old key and none yet under
// the new one, carry them over so switching to the shared module doesn't reset anyone's choices.
try {
    if (localStorage.getItem(OLD_KEY) !== null && localStorage.getItem(KEY) === null) {
        localStorage.setItem(KEY, localStorage.getItem(OLD_KEY));
    }
} catch (e) { /* storage blocked: ignore */ }

const store = createSettingsStore(KEY, DEFAULTS);

export const loadSettings = store.load;
export const saveSettings = store.save;
export const currentTheme = () => gdpCurrentTheme(store);
export const applyTheme = () => gdpApplyTheme(store);
export const setupThemeButton = (button, onChange) => gdpSetupThemeButton(store, button, onChange);
