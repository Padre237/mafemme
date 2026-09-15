/* =====================================================
   PHOTOS MASQUÉES (CODE D'ACCÈS)

   Une photo marquée "locked" dans Firestore n'est visible
   qu'après avoir tapé le bon code. Le code n'est jamais
   écrit en clair ici : seule son empreinte (SHA-256) est
   comparée, et cette empreinte est stockée dans Firestore
   plutôt que dans le code source.

   Important : ce site n'a ni serveur ni compte utilisateur,
   donc ce verrou reste un simple filtre de discrétion, pas
   une vraie protection contre quelqu'un de déterminé qui
   lirait le code ou la base Firestore.
===================================================== */

const GALLERY_DEFAULT_CODE_HASH =
    "c7c1b4da9b9f745dff12aca04605cb7fb33baf4ba84c5b473b16ef1ed16f9c25";

const gallerySecurityDoc =
    db.collection("settings").doc("gallerySecurity");

let galleryCodeHash = GALLERY_DEFAULT_CODE_HASH;

gallerySecurityDoc.get().then(doc => {

    if (doc.exists && doc.data().codeHash) {

        galleryCodeHash = doc.data().codeHash;

    } else {

        gallerySecurityDoc
            .set({ codeHash: GALLERY_DEFAULT_CODE_HASH })
            .catch(error => console.error(error));

    }

}).catch(error => console.error(error));


/*
    EMPREINTE SHA-256 (Web Crypto, natif au navigateur)
*/

async function hashGalleryCode(code) {

    const data = new TextEncoder().encode(code);
    const digestBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(digestBuffer))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

}

async function verifyGalleryCode(code) {

    const hash = await hashGalleryCode(code);

    return hash === galleryCodeHash;

}


/*
    PHOTOS DÉVERROUILLÉES POUR CETTE SESSION UNIQUEMENT
    (remis à zéro à chaque fermeture d'onglet)
*/

const unlockedPhotoIds = new Set();

function isPhotoUnlocked(id) {
    return unlockedPhotoIds.has(id);
}

function unlockPhoto(id) {
    unlockedPhotoIds.add(id);
}

function relockPhoto(id) {
    unlockedPhotoIds.delete(id);
}


/*
    MASQUER / DÉMASQUER DÉFINITIVEMENT UNE PHOTO
*/

function setGaleriePhotoLocked(id, locked) {

    return db.collection("galerie").doc(id).update({ locked });

}
