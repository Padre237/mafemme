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
    souhaitStatus.textContent = "Enregistrement...";

    const fields = { author, title, priority, link, note };

    try {

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

        closeModal(souhaitModal);

    } catch (error) {

        console.error(error);

        souhaitStatus.textContent = "Une erreur est survenue, réessaie.";
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

    card.innerHTML = `
        <div class="souhait-card-info">
            <strong>${escapeHtml(souhait.title)}</strong>
            ${
                souhait.note
                    ? `<p>${escapeHtml(souhait.note)}</p>`
                    : ""
            }
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

    return card;

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
