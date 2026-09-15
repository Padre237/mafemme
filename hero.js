/* =====================================================
   IMAGE DE FOND DE LA SECTION HERO (PARTAGÉE)

   N'importe qui peut choisir une photo de la galerie
   comme fond de la section d'accueil : le choix est
   stocké dans Firestore et visible par tout le monde.
===================================================== */

const heroSettingsDoc = db.collection("settings").doc("hero");

const heroImageElement =
    document.querySelector(".hero-image");

let currentHeroImageUrl = null;


function applyHeroImage() {

    if (!heroImageElement || !currentHeroImageUrl) {
        return;
    }

    heroImageElement.style.backgroundImage =
        `url("${currentHeroImageUrl}")`;

}

function isCurrentHeroImage(url) {

    return Boolean(url) && url === currentHeroImageUrl;

}

async function setAsHeroBackground(url) {

    await heroSettingsDoc.set({
        imageUrl: url,
        updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
    });

}

function refreshHeroBadges() {

    document
        .querySelectorAll(".galerie-card[data-url]")
        .forEach(card => {

            const active = isCurrentHeroImage(card.dataset.url);

            card.classList.toggle("hero-current", active);

            const button =
                card.querySelector(".galerie-set-hero");

            if (button) {

                button.classList.toggle("active", active);

                button.setAttribute(
                    "aria-label",
                    active
                        ? "Image de fond actuelle"
                        : "Définir comme image de fond"
                );

            }

        });

}

heroSettingsDoc.onSnapshot(doc => {

    const data = doc.data();

    currentHeroImageUrl =
        data && data.imageUrl ? data.imageUrl : null;

    applyHeroImage();
    refreshHeroBadges();

});
