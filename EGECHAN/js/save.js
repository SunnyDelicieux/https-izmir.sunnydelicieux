/* ==========================================================
   SAUVEGARDE — localStorage
   Ajoute ?reset à l'URL pour tout effacer.
   ========================================================== */

const Save = (() => {

    const fresh = () => ({
        scene: "intro",      // intro | forum | inbox
        flags: {}            // ex : { act1_login: true }
    });

    let data = fresh();

    function load() {
        try {
            if (location.search.includes("reset")) {
                localStorage.removeItem(CONFIG.saveKey);
                history.replaceState(null, "", location.pathname);
            }
            const raw = localStorage.getItem(CONFIG.saveKey);
            if (raw) data = Object.assign(fresh(), JSON.parse(raw));
        } catch (e) { /* navigation privée : on joue sans sauvegarde */ }
        return data;
    }

    function write() {
        try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(data)); } catch (e) {}
    }

    return {
        load,
        get scene() { return data.scene; },
        set scene(s) { data.scene = s; write(); },
        flag(name, value) {
            if (value === undefined) return !!data.flags[name];
            data.flags[name] = value; write();
        },
        get(name, fallback) {
            return data.flags[name] !== undefined ? data.flags[name] : fallback;
        },
        set(name, value) { data.flags[name] = value; write(); }
    };
})();
