/* =====================================================
   ANNIVERSAIRE : COMPTE À REBOURS PUIS JOUR J

   L'accueil change tout seul selon la date (heure locale
   de l'appareil) :
     - avant le 8 décembre 2026 : compte à rebours ;
     - le 8 décembre, toute la journée : "Joyeux
       anniversaire" avec des confettis ;
     - à partir du 9 décembre : l'accueil habituel revient.

   Si la page reste ouverte à minuit, elle bascule d'elle-
   même d'une version à l'autre, sans rechargement.

   APERÇU : pour voir à l'avance ce qu'elle verra, ajoute
   ?simuler=2026-12-08T10:00 à la fin de l'adresse du site
   (n'importe quelle date et heure fonctionne).
===================================================== */

const BIRTHDAY_START = new Date(2026, 11, 8, 0, 0, 0);
const BIRTHDAY_END = new Date(2026, 11, 9, 0, 0, 0);

const DAY_MS = 24 * 60 * 60 * 1000;


/*
    DÉCALAGE D'HORLOGE POUR L'APERÇU (?simuler=...)
*/

function readSimulationOffset() {

    try {

        let value =
            new URLSearchParams(window.location.search).get("simuler");

        if (!value) {
            return 0;
        }

        // Une date seule ("2026-12-08") serait lue en heure UTC :
        // on la ramène à midi, heure locale.
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            value += "T12:00";
        }

        const simulated = new Date(value);

        return Number.isNaN(simulated.getTime())
            ? 0
            : simulated.getTime() - Date.now();

    } catch (error) {
        return 0;
    }

}

const birthdayClockOffset = readSimulationOffset();

function birthdayNow() {
    return new Date(Date.now() + birthdayClockOffset);
}


/*
    QUELLE VERSION DE L'ACCUEIL AFFICHER ?
*/

function getBirthdayMode(now) {

    if (now < BIRTHDAY_START) {
        return "countdown";
    }

    if (now < BIRTHDAY_END) {
        return "party";
    }

    return "default";

}

const heroModes = {
    default: document.getElementById("heroModeDefault"),
    countdown: document.getElementById("heroModeCountdown"),
    party: document.getElementById("heroModeParty")
};

let currentBirthdayMode = null;

function applyBirthdayMode(mode) {

    if (mode === currentBirthdayMode) {
        return;
    }

    const isFirstRender = currentBirthdayMode === null;

    currentBirthdayMode = mode;

    Object.entries(heroModes).forEach(([name, element]) => {

        if (element) {
            element.hidden = name !== mode;
        }

    });

    if (mode === "party") {

        // Laisse la page apparaître avant de lancer la fête ; si
        // l'animation d'ouverture (intro.js) joue, on attend sa fin.
        setTimeout(() => {

            if (document.body.classList.contains("intro-active")) {
                document.addEventListener("intro:done", launchBirthdayConfetti, { once: true });
            } else {
                launchBirthdayConfetti();
            }

        }, isFirstRender ? 900 : 0);

    }

}


/*
    COMPTE À REBOURS
*/

const birthdayEyebrow = document.getElementById("birthdayEyebrow");
const birthdayDays = document.getElementById("birthdayDays");
const birthdayHours = document.getElementById("birthdayHours");
const birthdayMinutes = document.getElementById("birthdayMinutes");
const birthdaySeconds = document.getElementById("birthdaySeconds");

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function birthdayCountdownParts(now) {

    const diff = Math.max(0, BIRTHDAY_START - now);
    const totalSeconds = Math.floor(diff / 1000);

    return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60
    };

}

function writeBirthdayCountdown(parts) {

    birthdayDays.textContent = parts.days;
    birthdayHours.textContent = String(parts.hours).padStart(2, "0");
    birthdayMinutes.textContent = String(parts.minutes).padStart(2, "0");
    birthdaySeconds.textContent = String(parts.seconds).padStart(2, "0");

}

// "J-n" en jours de calendrier (et non en tranches de 24 h).
function birthdayCalendarDaysLeft(now) {

    return Math.round(
        (startOfDay(BIRTHDAY_START) - startOfDay(now)) / DAY_MS
    );

}

function birthdayCountdownLabel(now) {

    const calendarDays = birthdayCalendarDaysLeft(now);

    return calendarDays <= 1
        ? "C'EST DEMAIN · 8 DÉCEMBRE"
        : `J-${calendarDays} · 8 DÉCEMBRE`;

}

function updateBirthdayCountdown(now) {

    writeBirthdayCountdown(birthdayCountdownParts(now));

    birthdayEyebrow.textContent = birthdayCountdownLabel(now);

}


/*
    DÉFILEMENT DES CHIFFRES (appelé par intro.js quand le site
    apparaît) : chaque case monte de 0 jusqu'à sa vraie valeur,
    comme un compteur.
*/

let birthdayRolling = false;

function rollBirthdayCountdown(duration = 1500) {

    if (currentBirthdayMode !== "countdown") {
        return;
    }

    birthdayRolling = true;

    const start = performance.now();

    function frame(time) {

        const progress = Math.min(1, (time - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);

        const target = birthdayCountdownParts(birthdayNow());

        writeBirthdayCountdown({
            days: Math.round(target.days * eased),
            hours: Math.round(target.hours * eased),
            minutes: Math.round(target.minutes * eased),
            seconds: Math.round(target.seconds * eased)
        });

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            birthdayRolling = false;
            updateBirthdayCountdown(birthdayNow());
        }

    }

    requestAnimationFrame(frame);

}


/*
    BOUCLE : une mise à jour par seconde, arrêtée une fois
    l'anniversaire passé (l'accueil habituel ne bouge plus).
*/

let birthdayInterval = null;

function birthdayTick() {

    const now = birthdayNow();
    const mode = getBirthdayMode(now);

    applyBirthdayMode(mode);

    if (mode === "countdown" && !birthdayRolling) {
        updateBirthdayCountdown(now);
    }

    if (mode === "default" && birthdayInterval) {
        clearInterval(birthdayInterval);
        birthdayInterval = null;
    }

}

birthdayTick();

if (currentBirthdayMode !== "default") {
    birthdayInterval = setInterval(birthdayTick, 1000);
}


/*
    LIENS "LIRE MA LETTRE" DES VERSIONS ANNIVERSAIRE :
    ils réutilisent le bouton d'origine (défilement +
    ouverture animée de l'enveloppe).
*/

document.querySelectorAll(".js-open-letter").forEach(link => {

    link.addEventListener("click", (event) => {

        const originalButton = document.getElementById("openLetterHero");

        if (originalButton) {
            event.preventDefault();
            originalButton.click();
        }

    });

});


/*
    CONFETTIS DU JOUR J
    (relancés en touchant le titre "Joyeux anniversaire")
*/

const BIRTHDAY_CONFETTI_EMOJIS = ["🎉", "🎂", "🎈", "💖", "🎁", "✨", "🌹"];
const BIRTHDAY_CONFETTI_COLORS = ["#d98798", "#9e304b", "#f3c77a", "#ffffff", "#c43f5e"];

function launchBirthdayConfetti() {

    if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        return;
    }

    const container = document.createElement("div");

    container.classList.add("birthday-confetti");
    container.setAttribute("aria-hidden", "true");

    document.body.appendChild(container);

    const pieceCount = 70;
    let longestFall = 0;

    for (let i = 0; i < pieceCount; i++) {

        const piece = document.createElement("span");
        const isEmoji = Math.random() < 0.35;

        piece.classList.add("birthday-confetti-piece");

        if (isEmoji) {

            piece.classList.add("is-emoji");
            piece.textContent =
                BIRTHDAY_CONFETTI_EMOJIS[
                    Math.floor(Math.random() * BIRTHDAY_CONFETTI_EMOJIS.length)
                ];
            piece.style.fontSize = `${18 + Math.random() * 16}px`;

        } else {

            piece.classList.add("is-paper");
            piece.style.background =
                BIRTHDAY_CONFETTI_COLORS[
                    Math.floor(Math.random() * BIRTHDAY_CONFETTI_COLORS.length)
                ];

        }

        const duration = 3.2 + Math.random() * 2.8;
        const delay = Math.random() * 1.6;

        longestFall = Math.max(longestFall, duration + delay);

        piece.style.left = `${Math.random() * 100}%`;
        piece.style.animationDuration = `${duration}s`;
        piece.style.animationDelay = `${delay}s`;
        piece.style.setProperty("--drift", `${Math.round(Math.random() * 160 - 80)}px`);
        piece.style.setProperty("--rot", `${Math.round(Math.random() * 900 - 450)}deg`);

        container.appendChild(piece);

    }

    setTimeout(() => container.remove(), (longestFall + 0.5) * 1000);

}

const birthdayPartyTitle = document.getElementById("birthdayPartyTitle");

if (birthdayPartyTitle) {
    birthdayPartyTitle.addEventListener("click", launchBirthdayConfetti);
}
