/* Applies the saved theme before first paint (only the theme name is stored, nothing personal). */
(function () { try { document.documentElement.setAttribute('data-theme', localStorage.getItem('los:theme') || 'system'); } catch (e) { /* ignore */ } })();
