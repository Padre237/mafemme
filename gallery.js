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
    COMPRESSION DES PHOTOS AVANT ENVOI

    Réduit les photos (souvent 10-15 Mo depuis un
    téléphone) à une taille raisonnable pour le web,
    afin d'économiser le quota Cloudinary et d'accélérer
    l'envoi. Les vidéos et GIF ne sont pas touchés.
*/

function compressImage(file, maxDimension = 1600, quality = 0.82) {

    return new Promise(resolve => {

        if (!file.type.startsWith("image") || file.type === "image/gif") {
            resolve(file);
            return;
        }

        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {

            URL.revokeObjectURL(objectUrl);

            let { width, height } = image;

            if (width > maxDimension || height > maxDimension) {

                const ratio =
                    Math.min(maxDimension / width, maxDimension / height);

                width = Math.round(width * ratio);
                height = Math.round(height * ratio);

            }

            const canvas = document.createElement("canvas");

            canvas.width = width;
            canvas.height = height;

            canvas.getContext("2d").drawImage(image, 0, 0, width, height);

            canvas.toBlob(blob => {

                resolve(
                    blob
                        ? new File([blob], file.name, { type: "image/jpeg" })
                        : file
                );

            }, "image/jpeg", quality);

        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };

        image.src = objectUrl;

    });

}


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

        const fileToUpload = await compressImage(file);

        const uploadResult = await uploadToCloudinary(fileToUpload);

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

        closeModal(document.getElementById("galerieModal"));

    } catch (error) {

        console.error(error);

        galerieStatus.textContent =
            getSubmitErrorMessage();

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

        const items =
            snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt:
                    doc.data().createdAt
                        ? doc.data().createdAt.toDate()
                        : null
            }));

        checkForNewContent(items, "galerie", "galerie");

        if (snapshot.empty) {

            galerieGrid.appendChild(galerieEmpty);

            return;

        }

        items.forEach(item => {

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
                    ${renderReactionButton("galerie", item.id, item.reactions)}
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
                    () => deleteGalerieItem(item.id)
                );

            bindReactionButton(
                card.querySelector(".reaction-button")
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
