/* =====================================================
   MODE NUIT ROMANTIQUE
===================================================== */

const themeToggle =
    document.getElementById("themeToggle");

const themeToggleIcon =
    themeToggle.querySelector("i");

function applyTheme(theme) {

    if (theme === "night") {
        document.documentElement.setAttribute("data-theme", "night");
        themeToggleIcon.setAttribute("data-lucide", "sun");
    } else {
        document.documentElement.removeAttribute("data-theme");
        themeToggleIcon.setAttribute("data-lucide", "moon");
    }

    if (window.lucide) {
        lucide.createIcons();
    }

}

function getSavedTheme() {

    try {
        return localStorage.getItem("siteTheme");
    } catch (error) {
        return null;
    }

}

function saveTheme(theme) {

    try {
        localStorage.setItem("siteTheme", theme);
    } catch (error) {
        // Stockage indisponible : on ignore simplement.
    }

}

function getDefaultThemeByTime() {

    const hour = new Date().getHours();

    return (hour >= 19 || hour < 7) ? "night" : "light";

}

applyTheme(getSavedTheme() || getDefaultThemeByTime());

themeToggle.addEventListener("click", () => {

    const isNight =
        document.documentElement.getAttribute("data-theme") === "night";

    const newTheme = isNight ? "light" : "night";

    applyTheme(newTheme);
    saveTheme(newTheme);

});
