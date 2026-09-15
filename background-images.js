/* =====================================================
   IMAGES DE FOND PARTAGÉES (HERO + NOTRE HISTOIRE)

   Chaque emplacement garde une photo et un réglage de
   recadrage (zoom, position, rotation), stockés dans
   Firestore et modifiables depuis la galerie.
===================================================== */

const backgroundSettingsCollection = db.collection("settings");

const DEFAULT_BACKGROUNDS = {

    hero: {
        imageUrl:
            "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1800&q=90",
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0
    },

    histoire: {
        imageUrl: "mafemme.jpg",
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0
    }

};

const backgroundElements = {

    hero: {
        container: document.querySelector(".hero-image"),
        img: document.getElementById("heroBackgroundImage")
    },

    histoire: {
        container: document.querySelector(".story-image"),
        img: document.getElementById("storyImage")
    }

};

const currentBackgrounds = {
    hero: null,
    histoire: null
};


/*
    APPLIQUE UN RÉGLAGE DE RECADRAGE SUR UNE IMAGE
    (utilisé pour les vraies sections ET l'aperçu de l'éditeur)
*/

function applyCrop(imgEl, containerEl, crop) {

    if (!imgEl || !containerEl || !crop || !crop.imageUrl) {
        return;
    }

    const render = () => {

        const containerWidth = containerEl.clientWidth;
        const containerHeight = containerEl.clientHeight;

        const rotated = (crop.rotation % 180) !== 0;

        const naturalWidth =
            rotated ? imgEl.naturalHeight : imgEl.naturalWidth;

        const naturalHeight =
            rotated ? imgEl.naturalWidth : imgEl.naturalHeight;

        if (!naturalWidth || !naturalHeight || !containerWidth || !containerHeight) {
            return;
        }

        const baseScale =
            Math.max(
                containerWidth / naturalWidth,
                containerHeight / naturalHeight
            );

        const finalScale = baseScale * (crop.scale || 1);

        const offsetXpx = (crop.offsetX || 0) * containerWidth;
        const offsetYpx = (crop.offsetY || 0) * containerHeight;

        imgEl.style.transform =
            `translate(-50%, -50%) ` +
            `translate(${offsetXpx}px, ${offsetYpx}px) ` +
            `rotate(${crop.rotation || 0}deg) ` +
            `scale(${finalScale})`;

    };

    if (imgEl.getAttribute("src") !== crop.imageUrl) {

        imgEl.onload = render;
        imgEl.src = crop.imageUrl;

    } else {

        render();

    }

}

function applyBackground(target) {

    const elements = backgroundElements[target];

    if (!elements || !elements.img) {
        return;
    }

    const crop = currentBackgrounds[target] || DEFAULT_BACKGROUNDS[target];

    applyCrop(elements.img, elements.container, crop);

}

function isBackgroundImage(target, url) {

    const crop = currentBackgrounds[target];

    return Boolean(crop) && crop.imageUrl === url;

}

function refreshBackgroundBadges() {

    document
        .querySelectorAll(".galerie-card[data-url]")
        .forEach(card => {

            ["hero", "histoire"].forEach(target => {

                const badge =
                    card.querySelector(`.hero-current-badge[data-badge-target="${target}"]`);

                if (badge) {
                    badge.hidden = !isBackgroundImage(target, card.dataset.url);
                }

            });

            const setHeroButton =
                card.querySelector(".galerie-set-hero");

            if (setHeroButton) {

                setHeroButton.classList.toggle(
                    "active",
                    isBackgroundImage("hero", card.dataset.url) ||
                    isBackgroundImage("histoire", card.dataset.url)
                );

            }

        });

}

async function saveBackgroundCrop(target, crop) {

    await backgroundSettingsCollection.doc(target).set({
        ...crop,
        updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
    });

}

["hero", "histoire"].forEach(target => {

    backgroundSettingsCollection.doc(target).onSnapshot(doc => {

        currentBackgrounds[target] =
            doc.exists ? doc.data() : null;

        applyBackground(target);
        refreshBackgroundBadges();

    });

});

window.addEventListener("resize", () => {

    applyBackground("hero");
    applyBackground("histoire");

});
