/* =====================================================
   GALERIE PARTAGÉE (FIRESTORE + CLOUDINARY)

   Les fichiers sont envoyés à Cloudinary (stockage
   gratuit de photos/vidéos) et seule l'URL renvoyée
   est enregistrée dans Firestore.
===================================================== */

const galerieCollection = db.collection("galerie");

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo

const galerieForm =
    document.getElementById("galerieForm");

const galerieStatus =
    document.getElementById("galerieStatus");

const galerieSubmit =
    document.getElementById("galerieSubmit");

const galerieGrid =
    document.getElementById("galerieGrid");

const galerieEmpty =
    document.getElementById("galerieEmpty");


/*
    ENVOI DU FICHIER VERS CLOUDINARY
*/

async function uploadToCloudinary(file) {

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        throw new Error("Échec de l'envoi à Cloudinary");
    }

    return response.json();

}


/*
    AJOUT D'UNE PHOTO OU VIDÉO
*/

galerieForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const author = document.getElementById("galerieAuthor").value.trim();
    const file = document.getElementById("galerieFile").files[0];
    const caption = document.getElementById("galerieCaption").value.trim();

    if (!file) {
        return;
    }

    if (file.size > MAX_FILE_SIZE) {

        galerieStatus.textContent =
            "Ce fichier est trop lourd (20 Mo maximum).";

        galerieStatus.classList.add("error");

        return;

    }

    galerieSubmit.disabled = true;
    galerieStatus.classList.remove("error");
    galerieStatus.textContent = "Envoi en cours...";

    try {

        const type =
            file.type.startsWith("video") ? "video" : "photo";

        const uploadResult = await uploadToCloudinary(file);

        await galerieCollection.add({
            url: uploadResult.secure_url,
            type,
            author,
            caption,
            createdAt:
                firebase.firestore.FieldValue.serverTimestamp()
        });

        saveName(author);

        galerieForm.reset();
        prefillAuthorInputs();

        galerieStatus.textContent =
            "Ajouté à la galerie !";

    } catch (error) {

        console.error(error);

        galerieStatus.textContent =
            "Une erreur est survenue, réessaie.";

        galerieStatus.classList.add("error");

    } finally {

        galerieSubmit.disabled = false;

        setTimeout(() => {
            galerieStatus.textContent = "";
        }, 4000);

    }

});


/*
    SUPPRESSION D'UN SOUVENIR

    Ne supprime que l'entrée dans la liste : le fichier
    reste hébergé chez Cloudinary (sa suppression demande
    une clé secrète, à faire depuis leur console si besoin).
*/

function deleteGalerieItem(id) {

    galerieCollection.doc(id).delete();

}


/*
    AFFICHAGE EN TEMPS RÉEL DE LA GRILLE
*/

galerieCollection
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {

        galerieGrid.innerHTML = "";

        if (snapshot.empty) {

            galerieGrid.appendChild(galerieEmpty);

            return;

        }

        snapshot.forEach(doc => {

            const item = doc.data();

            const card =
                document.createElement("div");

            card.classList.add("galerie-card");

            const media =
                item.type === "video"
                    ? `<video src="${item.url}" controls></video>`
                    : `<img src="${item.url}" alt="Souvenir ajouté par ${escapeHtml(item.author)}">`;

            card.innerHTML = `
                ${media}
                <div class="galerie-card-info">
                    <strong>${escapeHtml(item.author) || "Quelqu'un"}</strong>
                    ${
                        item.caption
                            ? `<p>${escapeHtml(item.caption)}</p>`
                            : ""
                    }
                </div>

                <button
                    class="galerie-delete"
                    aria-label="Supprimer ce souvenir"
                >
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            card
                .querySelector(".galerie-delete")
                .addEventListener(
                    "click",
                    () => deleteGalerieItem(doc.id)
                );

            galerieGrid.appendChild(card);

        });

        if (window.lucide) {
            lucide.createIcons();
        }

    }, error => {

        console.error(error);

        galerieGrid.innerHTML =
            `<p class="galerie-empty">
                Impossible de charger la galerie pour le moment.
            </p>`;

    });
