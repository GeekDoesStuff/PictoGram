// Goblin Does Puzzles — small shared DOM/interaction helpers (behaviour, not data).
// These wrap Bootstrap components the way every project here uses them, so each puzzle
// doesn't have to re-figure out the same wiring.

// Makes a Bootstrap offcanvas behave as a non-modal "slide-out panel" instead of a dialog:
// no dark backdrop (pass data-bs-backdrop="false" on the element too), and a click outside the
// panel and outside its toggle button closes it, same as clicking the toggle again.
export function setupNonModalPanel(panelEl, toggleBtn) {
    if (!panelEl || !toggleBtn || !window.bootstrap) return;
    document.addEventListener('click', (e) => {
        if (!panelEl.classList.contains('show')) return;
        if (panelEl.contains(e.target) || toggleBtn.contains(e.target)) return;
        window.bootstrap.Offcanvas.getOrCreateInstance(panelEl).hide();
    });
}

// Initializes Bootstrap tooltips on every [data-bs-toggle="tooltip"] element currently on the
// page. Safe to call more than once; existing tooltips are left alone.
export function setupTooltips() {
    if (!window.bootstrap) return;
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        if (!window.bootstrap.Tooltip.getInstance(el)) new window.bootstrap.Tooltip(el);
    });
}
