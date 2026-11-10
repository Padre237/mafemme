/* =====================================================
   ANIMATION D'OUVERTURE DU SITE

   1. LA BOUGIE — une fois par jour, jusqu'au 8 décembre inclus.
      À la première ouverture de la journée : un gâteau et une
      bougie. Elle fait un vœu, puis souffle dans le micro (ou
      touche la flamme). La bougie revient le lendemain, après
      minuit (heure du téléphone). Le 8 décembre : "Joyeux
      anniversaire" et des confettis.

   2. LE CŒUR — à chaque ouverture du site, tous les jours.
      Un cœur se dessine, bat deux fois, "Armelle" s'écrit, puis
      le cœur s'ouvre en deux comme un rideau sur le site.

   La première ouverture du jour enchaîne les deux : bougie,
   puis cœur. Si le téléphone demande de réduire les animations,
   le cœur ne se joue pas (la bougie reste, sans effets).

   TESTER : ajoute ?bougie à l'adresse pour revoir la bougie même
   si elle a déjà été soufflée aujourd'hui. Combinable avec la
   simulation de date : ?bougie&simuler=2026-12-08T10:00
===================================================== */


/* ===== RÉGLAGE DU SOUFFLE (MICRO) =====

   BOUGIE_SENSIBILITE : de 1 à 10.
     1  = il faut souffler très fort, tout près du micro ;
     6  = réglage conseillé : un vrai souffle, à 5-10 cm ;
     10 = un petit souffle suffit (mais une voix forte risque
          alors d'éteindre la bougie).

   BOUGIE_DUREE_SOUFFLE : pendant combien de temps il faut
     souffler, en millisecondes (350 = un tiers de seconde).
     Plus le nombre est grand, plus c'est difficile.
*/

const BOUGIE_SENSIBILITE = 6;
const BOUGIE_DUREE_SOUFFLE = 350;


/* ===== Le reste n'a pas besoin d'être modifié ===== */

const BOUGIE_SEUIL =
    0.035 * (11 - Math.min(10, Math.max(1, BOUGIE_SENSIBILITE)));

const BOUGIE_STORAGE_KEY = "bougieSouffleeLe";

const INTRO_HEART_DURATION = 2700;
const INTRO_OPEN_DURATION = 1500;


/*
    LA BOUGIE A-T-ELLE DÉJÀ ÉTÉ SOUFFLÉE AUJOURD'HUI ?
    (mémorisé sur l'appareil, avec la date du jour)
*/

function introDayKey(date) {

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");

}

function candleBlownToday() {

    try {
        return localStorage.getItem(BOUGIE_STORAGE_KEY) === introDayKey(birthdayNow());
    } catch (error) {
        return false;
    }

}

function rememberCandleBlown() {

    try {
        localStorage.setItem(BOUGIE_STORAGE_KEY, introDayKey(birthdayNow()));
    } catch (error) {
        // Stockage indisponible : la bougie reviendra, tant pis.
    }

}


/*
    QUE FAUT-IL JOUER ?
*/

const introParams = new URLSearchParams(window.location.search);

const introReduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const introNow = birthdayNow();
const introMode = getBirthdayMode(introNow);

const introShowCandle =
    introParams.has("bougie") ||
    (introNow < BIRTHDAY_END && !candleBlownToday());

const introShowHeart = !introReduceMotion;


/*
    CONSTRUCTION DE L'ÉCRAN D'OUVERTURE
*/

function introHeartStageHtml() {

    // Le cœur est tracé en deux moitiés qui partent de la pointe,
    // pour qu'il se dessine de façon symétrique.
    return `
        <div class="intro-heart-stage">
            <svg class="intro-heart" viewBox="0 0 24 24" aria-hidden="true">
                <path class="fill" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                <path class="stroke" pathLength="1" d="M12 21 5 14C3.5 12.55 2 10.8 2 8.5A5.5 5.5 0 0 1 7.5 3C9.26 3 10.5 3.5 12 5"/>
                <path class="stroke" pathLength="1" d="M12 21 19 14C20.49 12.54 22 10.79 22 8.5A5.5 5.5 0 0 0 16.5 3C14.74 3 13.5 3.5 12 5"/>
            </svg>
            <p class="intro-name">Armelle</p>
        </div>
    `;

}

function introCandleTexts() {

    if (introMode === "party") {

        return {
            eyebrow: "8 DÉCEMBRE · C'EST TON JOUR",
            title: "Joyeux <em>anniversaire</em>",
            help: "Ferme les yeux, fais un vœu… puis souffle ta bougie.",
            done: "Ton vœu est fait ✨ Joyeux anniversaire, mon amour."
        };

    }

    return {
        eyebrow:
            introMode === "countdown"
                ? birthdayCountdownLabel(introNow)
                : "UN VŒU RIEN QUE POUR TOI",
        title: "Fais <em>un vœu…</em>",
        help: "Ferme les yeux, fais un vœu… puis souffle la bougie.",
        done: "Ton vœu est fait ✨"
    };

}

function introCandleStageHtml(texts) {

    return `
        <div class="intro-candle-stage">

            <p class="intro-eyebrow">${texts.eyebrow}</p>

            <h2 class="intro-candle-title">${texts.title}</h2>

            <button type="button" class="intro-cake" aria-label="Souffler la bougie">
                <span class="intro-glow"></span>
                <span class="intro-flame-wrap"><span class="intro-flame"></span></span>
                <span class="intro-smoke"><i></i><i></i><i></i></span>
                <span class="intro-wick"></span>
                <span class="intro-candle-stick"></span>
                <span class="intro-cake-top"></span>
                <span class="intro-cake-body"></span>
                <span class="intro-cake-plate"></span>
            </button>

            <div class="intro-blow-meter" hidden><span></span></div>

            <p class="intro-candle-help">${texts.help}</p>

            <button type="button" class="intro-mic-button">
                <i data-lucide="mic"></i>
                <span>Souffler dans le micro</span>
            </button>

            <p class="intro-mic-hint">
                Appuie sur le bouton, autorise le micro, puis souffle
                bien fort dans le micro de ton téléphone (en bas, près
                de la prise de charge) 🌬️ Tu peux aussi toucher la flamme.
            </p>

        </div>
    `;

}

let introElement = null;
let introOpened = false;
let introOpenTimer = null;

function startIntro() {

    introElement = document.createElement("div");

    introElement.className = "intro";
    introElement.setAttribute("role", "dialog");
    introElement.setAttribute("aria-label", "Animation d'ouverture");

    introElement.innerHTML = `
        <div class="intro-half intro-half-left" aria-hidden="true">${introHeartStageHtml()}</div>
        <div class="intro-half intro-half-right" aria-hidden="true">${introHeartStageHtml()}</div>
        <div class="intro-seam" aria-hidden="true"></div>
        ${introShowCandle ? introCandleStageHtml(introCandleTexts()) : ""}
        <button type="button" class="intro-skip" hidden>Passer</button>
    `;

    document.body.appendChild(introElement);

    // Le site est caché sous l'écran d'ouverture : on peut le
    // rendre visible sans attendre la fin du chargement.
    document.body.classList.add("intro-active", "page-loaded");

    if (window.lucide) {
        lucide.createIcons();
    }

    introElement
        .querySelector(".intro-skip")
        .addEventListener("click", (event) => {
            event.stopPropagation();
            skipIntroStep();
        });

    // Pendant le cœur, toucher l'écran ouvre le site tout de suite.
    introElement.addEventListener("click", () => {

        if (!introElement.querySelector(".intro-candle-stage")) {
            openIntro();
        }

    });

    if (introShowCandle) {
        setupCandle();
    } else {
        startHeart();
    }

}

function skipIntroStep() {

    if (introElement.querySelector(".intro-candle-stage")) {
        blowOutCandle({ skipped: true });
    } else {
        openIntro();
    }

}


/*
    ÉTAPE 1 : LA BOUGIE
*/

let candleOut = false;
let micStream = null;
let micAudioContext = null;
let micFrame = null;

function setupCandle() {

    const stage = introElement.querySelector(".intro-candle-stage");
    const cake = stage.querySelector(".intro-cake");
    const micButton = stage.querySelector(".intro-mic-button");
    const micHint = stage.querySelector(".intro-mic-hint");
    const help = stage.querySelector(".intro-candle-help");

    cake.addEventListener("click", () => blowOutCandle());

    const micSupported =
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        (window.AudioContext || window.webkitAudioContext);

    if (!micSupported) {

        micButton.hidden = true;
        micHint.hidden = true;
        help.textContent += " Touche la flamme pour l'éteindre.";

    } else {

        micButton.addEventListener("click", () => startMic(stage));

    }

    // Porte de sortie discrète, au cas où.
    setTimeout(() => {

        const skip = introElement && introElement.querySelector(".intro-skip");

        if (skip && !candleOut) {
            skip.hidden = false;
        }

    }, 6000);

}

async function startMic(stage) {

    const cake = stage.querySelector(".intro-cake");
    const micButton = stage.querySelector(".intro-mic-button");
    const micHint = stage.querySelector(".intro-mic-hint");
    const help = stage.querySelector(".intro-candle-help");
    const meter = stage.querySelector(".intro-blow-meter");
    const meterFill = meter.querySelector("span");

    micButton.disabled = true;
    help.textContent = "Autorise le micro…";

    // Créé pendant le toucher, sinon l'iPhone garde le son coupé.
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    micAudioContext = new AudioContextClass();
    micAudioContext.resume().catch(() => {});

    try {

        // Sans les filtres du téléphone : la "suppression de bruit"
        // effacerait justement le souffle.
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

    } catch (error) {

        stopMic();

        micButton.hidden = true;
        micHint.hidden = true;
        help.textContent =
            "Le micro n'est pas disponible… touche simplement la flamme pour l'éteindre.";

        return;

    }

    if (candleOut) {
        stopMic();
        return;
    }

    const source = micAudioContext.createMediaStreamSource(micStream);
    const analyser = micAudioContext.createAnalyser();

    analyser.fftSize = 1024;
    source.connect(analyser);

    const samples = new Float32Array(analyser.fftSize);

    let smoothed = 0;
    let blowTime = 0;
    let lastTime = performance.now();

    micButton.hidden = true;
    micHint.hidden = true;
    meter.hidden = false;
    help.textContent = "Souffle maintenant dans le micro 🌬️";

    function listen(time) {

        if (candleOut) {
            return;
        }

        const delta = Math.min(100, time - lastTime);
        lastTime = time;

        analyser.getFloatTimeDomainData(samples);

        let sum = 0;

        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }

        const volume = Math.sqrt(sum / samples.length);

        smoothed = smoothed * 0.6 + volume * 0.4;

        // La flamme se couche au rythme du souffle.
        cake.style.setProperty(
            "--souffle",
            Math.min(1, smoothed / BOUGIE_SEUIL).toFixed(3)
        );

        // Il faut un souffle continu : une parole (syllabes
        // courtes) ne remplit pas la jauge.
        if (smoothed >= BOUGIE_SEUIL) {
            blowTime += delta;
        } else {
            blowTime = Math.max(0, blowTime - delta * 1.5);
        }

        meterFill.style.transform =
            `scaleX(${Math.min(1, blowTime / BOUGIE_DUREE_SOUFFLE)})`;

        if (blowTime >= BOUGIE_DUREE_SOUFFLE) {
            blowOutCandle();
            return;
        }

        micFrame = requestAnimationFrame(listen);

    }

    micFrame = requestAnimationFrame(listen);

}

function stopMic() {

    if (micFrame) {
        cancelAnimationFrame(micFrame);
        micFrame = null;
    }

    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }

    if (micAudioContext) {
        micAudioContext.close().catch(() => {});
        micAudioContext = null;
    }

}

function blowOutCandle({ skipped = false } = {}) {

    if (candleOut) {
        return;
    }

    candleOut = true;

    stopMic();
    rememberCandleBlown();

    const stage = introElement.querySelector(".intro-candle-stage");
    const texts = introCandleTexts();

    introElement.querySelector(".intro-skip").hidden = true;

    const leave = () => {

        stage.classList.add("is-leaving");

        setTimeout(() => {
            stage.remove();
            startHeart();
        }, 700);

    };

    if (skipped) {
        leave();
        return;
    }

    stage.classList.add("is-out");
    stage.querySelector(".intro-blow-meter").hidden = true;
    stage.querySelector(".intro-mic-button").hidden = true;
    stage.querySelector(".intro-mic-hint").hidden = true;
    stage.querySelector(".intro-candle-help").textContent = texts.done;

    if (introMode === "party") {
        launchBirthdayConfetti();
    }

    setTimeout(leave, introMode === "party" ? 3000 : 2000);

}


/*
    ÉTAPE 2 : LE CŒUR QUI S'OUVRE
*/

function waitForScriptFont(maxWait) {

    const timeout = new Promise(resolve => setTimeout(resolve, maxWait));

    if (!document.fonts || !document.fonts.load) {
        return timeout;
    }

    return Promise.race([
        document.fonts.load('400 64px "Great Vibes"').catch(() => {}),
        timeout
    ]);

}

async function startHeart() {

    if (!introShowHeart) {
        fadeOutIntro();
        return;
    }

    // "Armelle" doit s'écrire avec la bonne police.
    await waitForScriptFont(1500);

    if (introOpened) {
        return;
    }

    introElement.classList.add("is-playing");
    introElement.querySelector(".intro-skip").hidden = false;

    introOpenTimer = setTimeout(openIntro, INTRO_HEART_DURATION);

}

function openIntro() {

    if (introOpened) {
        return;
    }

    introOpened = true;

    clearTimeout(introOpenTimer);

    introElement.querySelector(".intro-skip").hidden = true;
    introElement.classList.add("is-opening");

    revealSite();

    setTimeout(removeIntro, INTRO_OPEN_DURATION);

}

function fadeOutIntro() {

    introOpened = true;

    introElement.classList.add("is-fading");

    revealSite();

    setTimeout(removeIntro, 800);

}

function revealSite() {

    // Les éléments de l'accueil arrivent en cascade.
    document.body.classList.add("intro-reveal");

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.remove("intro-active");
        });
    });

    setTimeout(() => {
        document.body.classList.remove("intro-reveal");
    }, 3000);

    rollBirthdayCountdown();

    document.dispatchEvent(new Event("intro:done"));

}

function removeIntro() {

    if (introElement) {
        introElement.remove();
        introElement = null;
    }

}


/*
    DÉMARRAGE (en dernier : toutes les fonctions et variables
    ci-dessus doivent exister avant)
*/

if (introShowCandle || introShowHeart) {
    startIntro();
}
