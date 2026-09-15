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

const galerieTypeFilter =
    document.getElementById("galerieTypeFilter");

const galerieAuthorFilter =
    document.getElementById("galerieAuthorFilter");

const galeriePeriodFilter =
    document.getElementById("galeriePeriodFilter");

const galerieLoadMore =
    document.getElementById("galerieLoadMore");

const galerieLoadMoreLabel =
    document.getElementById("galerieLoadMoreLabel");

const galerieLoadMoreIcon =
    document.getElementById("galerieLoadMoreIcon");

const GALERIE_PAGE_SIZE = 3;

let allGalerieItems = [];
let galerieVisibleCount = GALERIE_PAGE_SIZE;

let galerieFilters = {
    type: "all",
    author: "all",
    period: "all"
};


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
    CARTE VERROUILLÉE (PHOTO MASQUÉE PAR CODE)

    La photo n'est pas mise dans le DOM tant que le bon
    code n'a pas été validé.
*/

function buildLockedGalerieCard(item) {

    const card =
        document.createElement("div");

    card.classList.add("galerie-card", "galerie-card-locked");

    card.innerHTML = `
        <div class="galerie-lock-screen">

            <i data-lucide="lock"></i>

            <p>Photo masquée</p>

            <form class="galerie-unlock-form">

                <input
                    type="password"
                    inputmode="numeric"
                    class="galerie-unlock-input"
                    placeholder="Code"
                    required
                >

                <button type="submit" aria-label="Déverrouiller">
                    <i data-lucide="unlock"></i>
                </button>

            </form>

            <p class="galerie-unlock-status"></p>

        </div>
    `;

    const form = card.querySelector(".galerie-unlock-form");
    const input = card.querySelector(".galerie-unlock-input");
    const status = card.querySelector(".galerie-unlock-status");

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const code = input.value.trim();

        status.textContent = "";

        const valid = await verifyGalleryCode(code);

        if (valid) {

            unlockPhoto(item.id);
            renderGalerieGrid();

        } else {

            status.textContent = "Code incorrect.";
            input.value = "";
            input.focus();

        }

    });

    return card;

}


/*
    CONSTRUCTION D'UNE CARTE DE LA GALERIE
*/

function buildGalerieCard(item) {

    const isPhoto = item.type !== "video";

    if (isPhoto && item.locked && !isPhotoUnlocked(item.id)) {
        return buildLockedGalerieCard(item);
    }

    const card =
        document.createElement("div");

    card.classList.add("galerie-card");

    if (isPhoto) {
        card.dataset.url = item.url;
    }

    const media =
        item.type === "video"
            ? `<video src="${item.url}" controls></video>`
            : `<img src="${item.url}" alt="Souvenir ajouté par ${escapeHtml(item.author)}">`;

    card.innerHTML = `
        <div class="galerie-media">

            ${media}

            ${
                isPhoto
                    ? `
                        <button
                            class="galerie-set-hero ${
                                (isBackgroundImage("hero", item.url) || isBackgroundImage("histoire", item.url))
                                    ? "active"
                                    : ""
                            }"
                            aria-label="Utiliser comme image de fond"
                        >
                            <i data-lucide="image"></i>
                        </button>

                        <div class="hero-badges">
                            <span class="hero-current-badge" data-badge-target="hero" ${isBackgroundImage("hero", item.url) ? "" : "hidden"}>
                                <i data-lucide="check"></i>
                                Fond du Hero
                            </span>
                            <span class="hero-current-badge" data-badge-target="histoire" ${isBackgroundImage("histoire", item.url) ? "" : "hidden"}>
                                <i data-lucide="check"></i>
                                Notre histoire
                            </span>
                        </div>

                        <button
                            class="galerie-lock-toggle"
                            aria-label="${item.locked ? "Cacher à nouveau" : "Masquer cette photo"}"
                        >
                            <i data-lucide="${item.locked ? "eye" : "eye-off"}"></i>
                        </button>
                    `
                    : ""
            }

            <button
                class="galerie-delete"
                aria-label="Supprimer ce souvenir"
            >
                <i data-lucide="trash-2"></i>
            </button>

        </div>

        <div class="galerie-card-info">
            <strong>${escapeHtml(item.author) || "Quelqu'un"}</strong>
            ${
                item.caption
                    ? `<p>${escapeHtml(item.caption)}</p>`
                    : ""
            }
            ${
                isPhoto && item.locked
                    ? `<button type="button" class="galerie-unlock-forever">Retirer le verrou</button>`
                    : ""
            }
            ${renderEmojiBar("galerie", item.id, item.emojiReactions)}
            ${renderCommentsSection()}
        </div>
    `;

    card
        .querySelector(".galerie-delete")
        .addEventListener(
            "click",
            () => deleteGalerieItem(item.id)
        );

    const setHeroButton =
        card.querySelector(".galerie-set-hero");

    if (setHeroButton) {

        setHeroButton.addEventListener(
            "click",
            () => openImageEditor(item.url)
        );

    }

    const lockToggleButton =
        card.querySelector(".galerie-lock-toggle");

    if (lockToggleButton) {

        lockToggleButton.addEventListener("click", () => {

            if (item.locked) {

                relockPhoto(item.id);
                renderGalerieGrid();

            } else {

                setGaleriePhotoLocked(item.id, true)
                    .catch(error => console.error(error));

            }

        });

    }

    const unlockForeverButton =
        card.querySelector(".galerie-unlock-forever");

    if (unlockForeverButton) {

        unlockForeverButton.addEventListener("click", () => {

            setGaleriePhotoLocked(item.id, false)
                .catch(error => console.error(error));

        });

    }

    bindEmojiBar(
        card.querySelector(".emoji-bar")
    );

    bindCommentsSection(
        card.querySelector(".comments-section"),
        "galerie",
        item.id
    );

    return card;

}


/*
    FILTRES (TYPE, AUTEUR, PÉRIODE)
*/

function populateAuthorFilterOptions() {

    const authors =
        [...new Set(
            allGalerieItems
                .map(item => item.author)
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

    const previousValue = galerieAuthorFilter.value;

    galerieAuthorFilter.innerHTML =
        `<option value="all">Tous les auteurs</option>` +
        authors
            .map(author => `<option value="${escapeHtml(author)}">${escapeHtml(author)}</option>`)
            .join("");

    if (authors.includes(previousValue)) {
        galerieAuthorFilter.value = previousValue;
    }

}

function matchesPeriod(date, period) {

    if (period === "all") {
        return true;
    }

    if (!date) {
        return false;
    }

    const now = new Date();

    if (period === "today") {

        return date.toDateString() === now.toDateString();

    }

    if (period === "week") {

        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);

        return date >= weekAgo;

    }

    if (period === "month") {

        return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth()
        );

    }

    if (period === "year") {

        return date.getFullYear() === now.getFullYear();

    }

    return true;

}

function getFilteredGalerieItems() {

    return allGalerieItems.filter(item => {

        if (galerieFilters.type !== "all" && item.type !== galerieFilters.type) {
            return false;
        }

        if (galerieFilters.author !== "all" && item.author !== galerieFilters.author) {
            return false;
        }

        if (!matchesPeriod(item.createdAt, galerieFilters.period)) {
            return false;
        }

        return true;

    });

}

galerieTypeFilter.querySelectorAll(".filter-pill").forEach(pill => {

    pill.addEventListener("click", () => {

        galerieTypeFilter
            .querySelectorAll(".filter-pill")
            .forEach(p => p.classList.remove("active"));

        pill.classList.add("active");

        galerieFilters.type = pill.dataset.type;
        galerieVisibleCount = GALERIE_PAGE_SIZE;

        renderGalerieGrid();

    });

});

galerieAuthorFilter.addEventListener("change", () => {

    galerieFilters.author = galerieAuthorFilter.value;
    galerieVisibleCount = GALERIE_PAGE_SIZE;

    renderGalerieGrid();

});

galeriePeriodFilter.addEventListener("change", () => {

    galerieFilters.period = galeriePeriodFilter.value;
    galerieVisibleCount = GALERIE_PAGE_SIZE;

    renderGalerieGrid();

});

galerieLoadMore.addEventListener("click", () => {

    const filteredCount = getFilteredGalerieItems().length;

    if (galerieVisibleCount >= filteredCount) {

        galerieVisibleCount = GALERIE_PAGE_SIZE;

    } else {

        galerieVisibleCount += GALERIE_PAGE_SIZE;

    }

    renderGalerieGrid();

});


/*
    AFFICHAGE DE LA GRILLE (FILTRÉE ET PAGINÉE)

    Si quelqu'un est en train d'écrire un commentaire, on
    évite de redessiner la grille (ça couperait sa frappe) :
    le rendu est reporté jusqu'à ce qu'il quitte le champ.
*/

let galerieRenderPending = false;

const galerieMobileQuery =
    window.matchMedia("(max-width: 699px)");

function isGalerieMobile() {
    return galerieMobileQuery.matches;
}

function renderGalerieGrid() {

    if (isTypingInComments(galerieGrid)) {
        galerieRenderPending = true;
        return;
    }

    galerieRenderPending = false;

    galerieGrid.innerHTML = "";

    const filtered = getFilteredGalerieItems();

    if (filtered.length === 0) {

        const empty = galerieEmpty.cloneNode(true);
        empty.removeAttribute("id");
        empty.hidden = false;

        galerieGrid.appendChild(empty);

        galerieLoadMore.hidden = true;

        return;

    }

    const mobile = isGalerieMobile();

    const visibleItems =
        mobile ? filtered : filtered.slice(0, galerieVisibleCount);

    visibleItems.forEach(item => {
        galerieGrid.appendChild(buildGalerieCard(item));
    });

    if (mobile) {

        galerieLoadMore.hidden = true;

    } else {

        const fullyExpanded = galerieVisibleCount >= filtered.length;

        galerieLoadMore.hidden = filtered.length <= GALERIE_PAGE_SIZE;

        galerieLoadMoreLabel.textContent =
            fullyExpanded ? "Voir moins de souvenirs" : "Voir plus de souvenirs";

        galerieLoadMoreIcon.setAttribute(
            "data-lucide",
            fullyExpanded ? "chevron-up" : "chevron-down"
        );

    }

    if (window.lucide) {
        lucide.createIcons();
    }

}

galerieMobileQuery.addEventListener("change", renderGalerieGrid);

galerieGrid.addEventListener("focusout", () => {

    setTimeout(() => {

        if (galerieRenderPending && !isTypingInComments(galerieGrid)) {
            renderGalerieGrid();
        }

    }, 0);

});


/*
    AFFICHAGE EN TEMPS RÉEL DE LA GRILLE
*/

galerieCollection
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {

        allGalerieItems =
            snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt:
                    doc.data().createdAt
                        ? doc.data().createdAt.toDate()
                        : null
            }));

        checkForNewContent(allGalerieItems, "galerie", "galerie");

        populateAuthorFilterOptions();
        renderGalerieGrid();

    }, error => {

        console.error(error);

        galerieGrid.innerHTML =
            `<p class="galerie-empty">
                Impossible de charger la galerie pour le moment.
            </p>`;

    });
