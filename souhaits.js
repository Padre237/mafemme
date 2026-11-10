/* =====================================================
   LISTE DE SOUHAITS (FIRESTORE)

   Chaque souhait : un titre, une priorité (1 = indispensable,
   2 = j'aimerais beaucoup, 3 = si possible), un lien et un
   petit mot facultatifs. La liste est partagée en temps réel
   et regroupée par priorité, la plus forte en premier.
===================================================== */

const souhaitsCollection = db.collection("souhaits");

const SOUHAIT_PRIORITIES = {
    1: { label: "Indispensable", hearts: 3 },
    2: { label: "J'aimerais beaucoup", hearts: 2 },
    3: { label: "Si possible", hearts: 1 }
};

const SOUHAIT_DEFAULT_PRIORITY = 2;

const SOUHAIT_MAX_PHOTOS = 6;

const souhaitsList = document.getElementById("souhaitsList");
const souhaitsEmpty = document.getElementById("souhaitsEmpty");
const souhaitModal = document.getElementById("souhaitModal");
const souhaitForm = document.getElementById("souhaitForm");
const souhaitStatus = document.getElementById("souhaitStatus");
const souhaitSubmit = document.getElementById("souhaitSubmit");


/*
    OUTILS
*/

function normalizeSouhaitPriority(value) {

    const priority = Number(value);

    return SOUHAIT_PRIORITIES[priority]
        ? priority
        : SOUHAIT_DEFAULT_PRIORITY;

}

function souhaitPriorityLabel(value) {

    return SOUHAIT_PRIORITIES[normalizeSouhaitPriority(value)].label;

}

function priorityHeartsHtml(priority) {

    const count = SOUHAIT_PRIORITIES[priority].hearts;

    return `<span class="priority-hearts">${
        '<i data-lucide="heart"></i>'.repeat(count)
    }</span>`;

}

/*
    Un lien tapé sans "https://" (ex : amazon.fr/...) est
    complété ; tout ce qui n'est pas un lien web classique
    est refusé, pour ne jamais insérer de lien dangereux.
*/

function normalizeSouhaitLink(value) {

    const trimmed = (value || "").trim();

    if (!trimmed) {
        return "";
    }

    const withProtocol =
        /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {

        const url = new URL(withProtocol);

        return url.protocol === "http:" || url.protocol === "https:"
            ? url.href
            : "";

    } catch (error) {
        return "";
    }

}

function souhaitLinkHost(link) {

    try {
        return new URL(link).hostname.replace(/^www\./, "");
    } catch (error) {
        return "le site";
    }

}


/*
    PHOTOS D'UN SOUHAIT

    Envoyées chez Cloudinary avec les mêmes fonctions que la
    galerie (compressImage, uploadToCloudinary, dans gallery.js) ;
    le souhait garde seulement la liste de leurs adresses.
*/

const PHOTO_THUMB = "c_fill,w_240,h_240,q_auto,f_auto";
const PHOTO_LARGE = "c_limit,w_1600,h_1600,q_auto,f_auto";

function souhaitPhotos(souhait) {

    if (!Array.isArray(souhait.photos)) {
        return [];
    }

    return souhait.photos
        .filter(photo => photo && typeof photo.url === "string" && /^https:\/\//i.test(photo.url))
        .slice(0, SOUHAIT_MAX_PHOTOS);

}

// Version allégée calculée par Cloudinary ; si elle ne se charge
// pas, l'image d'origine prend le relais (data-fallback).
function cloudinaryVariant(url, transformation) {

    return url.includes("/image/upload/")
        ? url.replace("/image/upload/", `/image/upload/${transformation}/`)
        : url;

}

function photoImgHtml(url, transformation, extraAttributes = "") {

    return `<img
        src="${escapeHtml(cloudinaryVariant(url, transformation))}"
        data-fallback="${escapeHtml(url)}"
        alt=""
        ${extraAttributes}
    >`;

}

document.addEventListener("error", (event) => {

    const image = event.target;

    if (image.tagName === "IMG" && image.dataset && image.dataset.fallback) {

        const fallback = image.dataset.fallback;

        delete image.dataset.fallback;
        image.src = fallback;

    }

}, true);


/*
    FORMULAIRE : CHOIX DES PHOTOS

    Chaque élément est soit une photo déjà en ligne ({ photo }),
    soit une photo choisie sur le téléphone, pas encore envoyée
    ({ file, previewUrl }).
*/

const souhaitPhotosPreview = document.getElementById("souhaitPhotosPreview");
const souhaitPhotosAdd = document.getElementById("souhaitPhotosAdd");
const souhaitPhotosInput = document.getElementById("souhaitPhotosInput");

let souhaitPhotoItems = [];

function clearSouhaitPhotoItems() {

    souhaitPhotoItems.forEach(item => {

        if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
        }

    });

    souhaitPhotoItems = [];

}

function renderSouhaitPhotoPreview() {

    souhaitPhotosPreview.innerHTML = "";

    souhaitPhotoItems.forEach((item, index) => {

        const tile = document.createElement("div");

        tile.classList.add("souhait-photo-tile");

        tile.innerHTML = `
            ${
                item.photo
                    ? photoImgHtml(item.photo.url, PHOTO_THUMB)
                    : `<img src="${item.previewUrl}" alt="">`
            }
            <button type="button" class="souhait-photo-remove" aria-label="Retirer cette photo">
                <i data-lucide="x"></i>
            </button>
        `;

        tile
            .querySelector(".souhait-photo-remove")
            .addEventListener("click", () => {

                const [removed] = souhaitPhotoItems.splice(index, 1);

                if (removed.previewUrl) {
                    URL.revokeObjectURL(removed.previewUrl);
                }

                renderSouhaitPhotoPreview();

            });

        souhaitPhotosPreview.appendChild(tile);

    });

    souhaitPhotosAdd.hidden = souhaitPhotoItems.length >= SOUHAIT_MAX_PHOTOS;

    if (window.lucide) {
        lucide.createIcons();
    }

}

souhaitPhotosInput.addEventListener("change", () => {

    const files = [...souhaitPhotosInput.files]
        .filter(file => !file.type || file.type.startsWith("image/"));

    const room = SOUHAIT_MAX_PHOTOS - souhaitPhotoItems.length;

    files.slice(0, room).forEach(file => {

        souhaitPhotoItems.push({
            file,
            previewUrl: URL.createObjectURL(file)
        });

    });

    souhaitStatus.classList.remove("error");

    souhaitStatus.textContent =
        files.length > room
            ? `${SOUHAIT_MAX_PHOTOS} photos maximum : seules les ${room} premières ont été ajoutées.`
            : "";

    // Permet de rechoisir la même photo plus tard.
    souhaitPhotosInput.value = "";

    renderSouhaitPhotoPreview();

});

/*
    Envoie les nouvelles photos une par une (en affichant
    l'avancement) et renvoie la liste complète, dans l'ordre.
    Une photo déjà envoyée n'est pas renvoyée si l'on réessaie.
*/

async function uploadSouhaitPhotos() {

    const total = souhaitPhotoItems.filter(item => item.file).length;
    let sent = 0;

    for (const item of souhaitPhotoItems) {

        if (!item.file) {
            continue;
        }

        sent++;
        souhaitStatus.textContent = `Envoi des photos ${sent}/${total}…`;

        const compressed = await compressImage(item.file);
        const result = await uploadToCloudinary(compressed);

        item.photo = {
            url: result.secure_url,
            width: result.width || null,
            height: result.height || null
        };

        URL.revokeObjectURL(item.previewUrl);
        delete item.file;
        delete item.previewUrl;

    }

    return souhaitPhotoItems.map(item => item.photo);

}


/*
    FORMULAIRE : AJOUT OU MODIFICATION
*/

let editingSouhaitId = null;

function setSouhaitPriorityInput(priority) {

    const radio = souhaitForm.querySelector(
        `input[name="souhaitPriority"][value="${priority}"]`
    );

    if (radio) {
        radio.checked = true;
    }

}

function openSouhaitForm(souhait) {

    editingSouhaitId = souhait ? souhait.id : null;

    souhaitForm.reset();
    prefillAuthorInputs();

    souhaitStatus.textContent = "";
    souhaitStatus.classList.remove("error");

    document.getElementById("souhaitModalEyebrow").textContent =
        souhait ? "Changer d'avis, c'est permis" : "Une envie de plus";

    document.getElementById("souhaitModalVerb").textContent =
        souhait ? "Modifie" : "Ajoute";

    document.getElementById("souhaitModalObject").textContent =
        souhait ? "ton souhait" : "un souhait";

    document.getElementById("souhaitSubmitLabel").textContent =
        souhait ? "Enregistrer" : "Ajouter à ma liste";

    if (souhait) {

        document.getElementById("souhaitAuthor").value = souhait.author || "";
        document.getElementById("souhaitTitle").value = souhait.title || "";
        document.getElementById("souhaitLink").value = souhait.link || "";
        document.getElementById("souhaitNote").value = souhait.note || "";

        setSouhaitPriorityInput(normalizeSouhaitPriority(souhait.priority));

    } else {

        setSouhaitPriorityInput(SOUHAIT_DEFAULT_PRIORITY);

    }

    clearSouhaitPhotoItems();

    if (souhait) {
        souhaitPhotoItems = souhaitPhotos(souhait).map(photo => ({ photo }));
    }

    renderSouhaitPhotoPreview();

    openModal(souhaitModal);

}

document
    .getElementById("souhaitAddButton")
    .addEventListener("click", () => openSouhaitForm(null));

souhaitForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const author = document.getElementById("souhaitAuthor").value.trim();
    const title = document.getElementById("souhaitTitle").value.trim();
    const rawLink = document.getElementById("souhaitLink").value;
    const note = document.getElementById("souhaitNote").value.trim();

    const checkedPriority =
        souhaitForm.querySelector('input[name="souhaitPriority"]:checked');

    const priority = normalizeSouhaitPriority(
        checkedPriority ? checkedPriority.value : SOUHAIT_DEFAULT_PRIORITY
    );

    const link = normalizeSouhaitLink(rawLink);

    souhaitStatus.classList.remove("error");

    if (rawLink.trim() && !link) {

        souhaitStatus.textContent =
            "Ce lien ne semble pas valide — vérifie-le ou laisse le champ vide.";
        souhaitStatus.classList.add("error");

        return;

    }

    souhaitSubmit.disabled = true;

    let uploadingPhotos = true;

    try {

        const photos = await uploadSouhaitPhotos();

        uploadingPhotos = false;
        souhaitStatus.textContent = "Enregistrement...";

        const fields = { author, title, priority, link, note, photos };

        if (editingSouhaitId) {

            await souhaitsCollection.doc(editingSouhaitId).update({
                ...fields,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        } else {

            await souhaitsCollection.add({
                ...fields,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        }

        saveName(author);

        souhaitStatus.textContent = "";
        editingSouhaitId = null;
        clearSouhaitPhotoItems();

        closeModal(souhaitModal);

    } catch (error) {

        console.error(error);

        souhaitStatus.textContent = uploadingPhotos
            ? "Une photo n'a pas pu être envoyée — vérifie ta connexion et réessaie."
            : "Une erreur est survenue, réessaie.";
        souhaitStatus.classList.add("error");

    } finally {

        souhaitSubmit.disabled = false;

    }

});


/*
    SUPPRESSION
*/

function deleteSouhait(souhait) {

    const confirmed = window.confirm(
        `Retirer « ${souhait.title} » de la liste ?`
    );

    if (!confirmed) {
        return;
    }

    souhaitsCollection.doc(souhait.id).delete().catch(error => {
        console.error(error);
    });

}


/*
    AFFICHAGE : groupes par priorité, puis ordre d'ajout
*/

let lastSouhaits = [];

function souhaitTime(souhait) {

    return souhait.createdAt && souhait.createdAt.toDate
        ? souhait.createdAt.toDate().getTime()
        : Date.now();

}

function buildSouhaitCard(souhait, priority) {

    const card = document.createElement("div");

    card.classList.add("souhait-card", `priority-${priority}`);

    const link = normalizeSouhaitLink(souhait.link);
    const photos = souhaitPhotos(souhait);

    card.innerHTML = `
        <div class="souhait-card-info">
            <strong>${escapeHtml(souhait.title)}</strong>
            ${
                souhait.note
                    ? `<p>${escapeHtml(souhait.note)}</p>`
                    : ""
            }
            ${photos.length ? souhaitPhotoStripHtml(photos) : ""}
            ${
                link
                    ? `<a class="souhait-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
                           <i data-lucide="external-link"></i>
                           Voir sur ${escapeHtml(souhaitLinkHost(link))}
                       </a>`
                    : ""
            }
            <em class="souhait-author">
                Ajouté par ${escapeHtml(souhait.author) || "quelqu'un"}
            </em>
        </div>

        <div class="souhait-card-actions">
            <button type="button" class="souhait-edit" aria-label="Modifier ce souhait">
                <i data-lucide="pencil"></i>
            </button>
            <button type="button" class="souhait-delete" aria-label="Supprimer ce souhait">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `;

    card
        .querySelector(".souhait-edit")
        .addEventListener("click", () => openSouhaitForm(souhait));

    card
        .querySelector(".souhait-delete")
        .addEventListener("click", () => deleteSouhait(souhait));

    card.querySelectorAll(".souhait-photo").forEach(button => {

        button.addEventListener("click", () => {
            openPhotoViewer(photos, Number(button.dataset.index), souhait.title);
        });

    });

    return card;

}

/*
    Miniatures sur la carte : 4 au plus, la dernière indique
    combien d'autres photos il reste ("+2").
*/

function souhaitPhotoStripHtml(photos) {

    const visible = photos.slice(0, 4);
    const hidden = photos.length - visible.length;

    return `
        <div class="souhait-photos">
            ${visible.map((photo, index) => `
                <button
                    type="button"
                    class="souhait-photo"
                    data-index="${index}"
                    aria-label="Voir la photo ${index + 1} sur ${photos.length}"
                >
                    ${photoImgHtml(photo.url, PHOTO_THUMB, 'loading="lazy"')}
                    ${
                        index === visible.length - 1 && hidden > 0
                            ? `<span class="souhait-photo-more">+${hidden}</span>`
                            : ""
                    }
                </button>
            `).join("")}
        </div>
    `;

}


/*
    VISIONNEUSE PLEIN ÉCRAN
    (flèches, glisser du doigt, touches ← → et Échap)
*/

let photoViewer = null;
let viewerPhotos = [];
let viewerIndex = 0;
let viewerTitle = "";

function buildPhotoViewer() {

    photoViewer = document.createElement("div");

    photoViewer.className = "photo-viewer";
    photoViewer.setAttribute("role", "dialog");
    photoViewer.setAttribute("aria-modal", "true");
    photoViewer.setAttribute("aria-label", "Photos du souhait");

    photoViewer.innerHTML = `
        <button type="button" class="photo-viewer-close" aria-label="Fermer">
            <i data-lucide="x"></i>
        </button>
        <button type="button" class="photo-viewer-nav prev" aria-label="Photo précédente">
            <i data-lucide="chevron-left"></i>
        </button>
        <img class="photo-viewer-image" alt="">
        <button type="button" class="photo-viewer-nav next" aria-label="Photo suivante">
            <i data-lucide="chevron-right"></i>
        </button>
        <p class="photo-viewer-caption"></p>
    `;

    document.body.appendChild(photoViewer);

    photoViewer
        .querySelector(".photo-viewer-close")
        .addEventListener("click", closePhotoViewer);

    photoViewer
        .querySelector(".prev")
        .addEventListener("click", () => showViewerPhoto(viewerIndex - 1));

    photoViewer
        .querySelector(".next")
        .addEventListener("click", () => showViewerPhoto(viewerIndex + 1));

    // Toucher le fond sombre ferme la visionneuse.
    photoViewer.addEventListener("click", (event) => {

        if (event.target === photoViewer) {
            closePhotoViewer();
        }

    });

    let touchStartX = null;

    photoViewer.addEventListener("touchstart", (event) => {
        touchStartX = event.touches[0].clientX;
    }, { passive: true });

    photoViewer.addEventListener("touchend", (event) => {

        if (touchStartX === null) {
            return;
        }

        const deltaX = event.changedTouches[0].clientX - touchStartX;

        touchStartX = null;

        if (Math.abs(deltaX) > 50) {
            showViewerPhoto(viewerIndex + (deltaX < 0 ? 1 : -1));
        }

    });

    document.addEventListener("keydown", (event) => {

        if (!photoViewer.classList.contains("open")) {
            return;
        }

        if (event.key === "Escape") {
            closePhotoViewer();
        } else if (event.key === "ArrowLeft") {
            showViewerPhoto(viewerIndex - 1);
        } else if (event.key === "ArrowRight") {
            showViewerPhoto(viewerIndex + 1);
        }

    });

    if (window.lucide) {
        lucide.createIcons();
    }

}

function showViewerPhoto(index) {

    const count = viewerPhotos.length;

    viewerIndex = (index + count) % count;

    const photo = viewerPhotos[viewerIndex];
    const image = photoViewer.querySelector(".photo-viewer-image");

    image.dataset.fallback = photo.url;
    image.src = cloudinaryVariant(photo.url, PHOTO_LARGE);
    image.alt = `${viewerTitle} — photo ${viewerIndex + 1}`;

    photoViewer.querySelector(".photo-viewer-caption").textContent =
        count > 1
            ? `${viewerTitle} · ${viewerIndex + 1} / ${count}`
            : viewerTitle;

    photoViewer.classList.toggle("single", count < 2);

}

function openPhotoViewer(photos, index, title) {

    if (!photoViewer) {
        buildPhotoViewer();
    }

    viewerPhotos = photos;
    viewerTitle = title || "";

    showViewerPhoto(index);

    photoViewer.classList.add("open");
    document.body.classList.add("modal-open");

}

function closePhotoViewer() {

    photoViewer.classList.remove("open");
    document.body.classList.remove("modal-open");

}

function renderSouhaitsList() {

    souhaitsList.innerHTML = "";

    if (lastSouhaits.length === 0) {

        souhaitsList.appendChild(souhaitsEmpty);

        return;

    }

    Object.keys(SOUHAIT_PRIORITIES).map(Number).forEach(priority => {

        const items = lastSouhaits
            .filter(souhait => normalizeSouhaitPriority(souhait.priority) === priority)
            .sort((a, b) => souhaitTime(a) - souhaitTime(b));

        if (items.length === 0) {
            return;
        }

        const group = document.createElement("div");

        group.classList.add("souhaits-group");

        group.innerHTML = `
            <p class="souhaits-group-title">
                ${priorityHeartsHtml(priority)}
                <span>${SOUHAIT_PRIORITIES[priority].label}</span>
                <span class="souhaits-group-count">${items.length}</span>
            </p>
        `;

        items.forEach(souhait => {
            group.appendChild(buildSouhaitCard(souhait, priority));
        });

        souhaitsList.appendChild(group);

    });

    if (window.lucide) {
        lucide.createIcons();
    }

}


/*
    TEMPS RÉEL
*/

souhaitsCollection.onSnapshot(snapshot => {

    lastSouhaits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data({ serverTimestamps: "estimate" })
    }));

    renderSouhaitsList();

}, error => {

    console.error(error);

    souhaitsList.innerHTML =
        `<p class="souhaits-empty">
            Impossible de charger la liste pour le moment.
        </p>`;

});
