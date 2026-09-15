/* =====================================================
   IDENTITÉ (SIGNATURE DES ACTIONS)

   Le site n'a pas de compte utilisateur : chacun tape
   simplement son prénom une fois, il est ensuite
   mémorisé sur son appareil et pré-rempli partout.
===================================================== */

function getSavedName() {

    try {
        return localStorage.getItem("siteAuthorName") || "";
    } catch (error) {
        return "";
    }

}

function saveName(name) {

    if (!name) {
        return;
    }

    try {
        localStorage.setItem("siteAuthorName", name);
    } catch (error) {
        // Stockage indisponible (navigation privée, etc.) : on ignore.
    }

}

function prefillAuthorInputs() {

    const saved = getSavedName();

    if (!saved) {
        return;
    }

    document
        .querySelectorAll(".author-name-input")
        .forEach(input => {

            if (!input.value) {
                input.value = saved;
            }

        });

}

document.addEventListener(
    "DOMContentLoaded",
    prefillAuthorInputs
);


/*
    ÉCHAPPEMENT HTML

    Tout le contenu affiché sur le site vient de
    formulaires ouverts à qui a le lien : on échappe
    systématiquement avant d'insérer dans le DOM.
*/

function escapeHtml(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
