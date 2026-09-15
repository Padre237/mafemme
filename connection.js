/* =====================================================
   MODE HORS-LIGNE GRACIEUX
===================================================== */

const connectionBanner =
    document.getElementById("connectionBanner");

function updateConnectionBanner() {

    connectionBanner.hidden = navigator.onLine;

    if (!connectionBanner.hidden && window.lucide) {
        lucide.createIcons();
    }

}

window.addEventListener("online", updateConnectionBanner);
window.addEventListener("offline", updateConnectionBanner);

updateConnectionBanner();


/*
    MESSAGE D'ERREUR ADAPTÉ AU RÉSEAU

    Utilisé par les formulaires (rendez-vous, galerie,
    petit mot) pour distinguer une vraie coupure réseau
    d'une autre erreur.
*/

function getSubmitErrorMessage() {

    return navigator.onLine
        ? "Une erreur est survenue, réessaie."
        : "Tu sembles hors ligne — réessaie une fois connecté(e).";

}
