/* =====================================================
   PETIT MOT + FIL D'ACTIVITÉ (FIRESTORE)
===================================================== */

const messagesCollection = db.collection("messages");

const messageForm =
    document.getElementById("messageForm");

const messageStatus =
    document.getElementById("messageStatus");

const messageSubmit =
    document.getElementById("messageSubmit");

const activiteEmpty =
    document.getElementById("activiteEmpty");

const activiteToday =
    document.getElementById("activiteToday");

const activiteCarousel =
    document.getElementById("activiteCarousel");

const activiteSeeAll =
    document.getElementById("activiteSeeAll");

const activiteSeeAllStandalone =
    document.getElementById("activiteSeeAllStandalone");

const activiteModal =
    document.getElementById("activiteModal");

const activiteModalFeed =
    document.getElementById("activiteModalFeed");

const activiteFilterPills =
    document.getElementById("activiteFilterPills");

const chatMessages =
    document.getElementById("chatMessages");


/*
    PUBLICATION D'UN PETIT MOT
*/

messageForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const author = document.getElementById("messageAuthor").value.trim();
    const text = document.getElementById("messageText").value.trim();

    messageSubmit.disabled = true;
    messageStatus.classList.remove("error");
    messageStatus.textContent = "Envoi en cours...";

    try {

        await messagesCollection.add({
            author,
            text,
            createdAt:
                firebase.firestore.FieldValue.serverTimestamp()
        });

        saveName(author);

        messageForm.reset();
        prefillAuthorInputs();

        messageStatus.textContent =
            "Ton mot a été publié !";

        closeModal(document.getElementById("messageModal"));

    } catch (error) {

        console.error(error);

        messageStatus.textContent =
            "Une erreur est survenue, réessaie.";

        messageStatus.classList.add("error");

    } finally {

        messageSubmit.disabled = false;

        setTimeout(() => {
            messageStatus.textContent = "";
        }, 4000);

    }

});


/*
    TEMPS ÉCOULÉ, EN FRANÇAIS
*/

function timeAgo(date) {

    if (!date) {
        return "à l'instant";
    }

    const diff =
        Math.max(0, Date.now() - date.getTime());

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
        return "à l'instant";
    }

    if (diff < hour) {
        return `il y a ${Math.floor(diff / minute)} min`;
    }

    if (diff < day) {
        return `il y a ${Math.floor(diff / hour)} h`;
    }

    return `il y a ${Math.floor(diff / day)} j`;

}


/*
    LIBELLÉ DU GROUPE DE JOUR (Aujourd'hui, Hier, date...)
*/

function dayGroupLabel(date) {

    if (!date) {
        return "Plus tôt";
    }

    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const today = startOfDay(new Date());
    const target = startOfDay(date);

    const diffDays =
        Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
        return "Aujourd'hui";
    }

    if (diffDays === 1) {
        return "Hier";
    }

    return target.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: target.getFullYear() === today.getFullYear() ? undefined : "numeric"
    });

}


/*
    FUSION DES TROIS SOURCES D'ACTIVITÉ
    (rendez-vous, galerie, petits mots)
*/

const activiteState = {
    rendezvous: [],
    galerie: [],
    messages: []
};

const activiteIcons = {
    rendezvous: "calendar-heart",
    galerie: "image",
    message: "message-circle-heart"
};

function toJsDate(timestamp) {

    return timestamp && timestamp.toDate
        ? timestamp.toDate()
        : null;

}

let lastActiviteItems = [];
let currentActiviteFilter = "all";

function renderActivite() {

    const items = [

        ...activiteState.rendezvous.map(rendezvous => ({
            type: "rendezvous",
            collection: "rendezvous",
            id: rendezvous.id,
            createdAt: rendezvous.createdAt,
            reactions: rendezvous.reactions,
            html:
                `${escapeHtml(rendezvous.author) || "Quelqu'un"} ` +
                `a proposé un rendez-vous le ` +
                `${formatRendezvousDate(rendezvous.date, rendezvous.time)}` +
                (
                    rendezvous.lieu
                        ? ` — ${escapeHtml(rendezvous.lieu)}`
                        : ""
                )
        })),

        ...activiteState.galerie.map(item => ({
            type: "galerie",
            collection: "galerie",
            id: item.id,
            createdAt: item.createdAt,
            reactions: item.reactions,
            html:
                `${escapeHtml(item.author) || "Quelqu'un"} a ajouté ` +
                `${item.type === "video" ? "une vidéo" : "une photo"}` +
                (
                    item.caption
                        ? ` : "${escapeHtml(item.caption)}"`
                        : ""
                )
        })),

        ...activiteState.messages.map(message => ({
            type: "message",
            collection: "messages",
            id: message.id,
            createdAt: message.createdAt,
            reactions: message.reactions,
            html:
                `${escapeHtml(message.author) || "Quelqu'un"} a laissé ` +
                `un mot : "${escapeHtml(message.text)}"`
        }))

    ];

    items.sort((a, b) => {

        const timeA = a.createdAt ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt ? b.createdAt.getTime() : 0;

        return timeB - timeA;

    });

    checkForNewContent(items, "activite", "activite");

    lastActiviteItems = items;

    renderActiviteLauncher(items);
    renderModalFeed();

    if (window.lucide) {
        lucide.createIcons();
    }

}


/*
    ENTRÉE DE LA SECTION : CARROUSEL DU JOUR, OU BOUTON
    "VOIR TOUT" SEUL SI RIEN AUJOURD'HUI MAIS DE L'HISTORIQUE
*/

function renderActiviteLauncher(items) {

    const todayItems =
        items.filter(item => dayGroupLabel(item.createdAt) === "Aujourd'hui");

    if (items.length === 0) {

        activiteToday.hidden = true;
        activiteSeeAllStandalone.hidden = true;
        activiteEmpty.hidden = false;

        return;

    }

    activiteEmpty.hidden = true;

    if (todayItems.length > 0) {

        activiteToday.hidden = false;
        activiteSeeAllStandalone.hidden = true;

        renderActiviteCarousel(todayItems);

    } else {

        activiteToday.hidden = true;
        activiteSeeAllStandalone.hidden = false;

    }

}


/*
    LISTE FILTRÉE DE LA MODALE "TOUT VOIR"
*/

function renderModalFeed() {

    const filtered =
        currentActiviteFilter === "all"
            ? lastActiviteItems
            : lastActiviteItems.filter(item => item.type === currentActiviteFilter);

    renderActiviteList(activiteModalFeed, filtered.slice(0, 50), true);

    if (window.lucide) {
        lucide.createIcons();
    }

}

if (activiteFilterPills) {

    activiteFilterPills.querySelectorAll(".filter-pill").forEach(pill => {

        pill.addEventListener("click", () => {

            activiteFilterPills
                .querySelectorAll(".filter-pill")
                .forEach(p => p.classList.remove("active"));

            pill.classList.add("active");

            currentActiviteFilter = pill.dataset.filter;

            renderModalFeed();

        });

    });

}

if (activiteSeeAllStandalone) {

    activiteSeeAllStandalone.addEventListener(
        "click",
        () => openModal(activiteModal)
    );

}


/*
    UNE LIGNE D'ACTIVITÉ (réutilisée dans le fil et la modale)
*/

function buildActiviteRow(item) {

    const row =
        document.createElement("div");

    row.classList.add("activite-item");

    row.innerHTML = `
        <i data-lucide="${activiteIcons[item.type]}"></i>
        <div class="activite-item-content">
            <p>${item.html}</p>
            <span>${timeAgo(item.createdAt)}</span>
            ${renderReactionButton(item.collection, item.id, item.reactions)}
        </div>
    `;

    bindReactionButton(
        row.querySelector(".reaction-button")
    );

    return row;

}


/*
    LISTE DES ACTIVITÉS, GROUPÉE PAR JOUR OU NON
*/

function renderActiviteList(container, items, grouped) {

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (items.length === 0) {

        const empty = activiteEmpty.cloneNode(true);
        empty.removeAttribute("id");
        empty.hidden = false;

        container.appendChild(empty);

        return;

    }

    let currentGroup = null;

    items.forEach(item => {

        if (grouped) {

            const groupLabel = dayGroupLabel(item.createdAt);

            if (groupLabel !== currentGroup) {

                currentGroup = groupLabel;

                const title =
                    document.createElement("p");

                title.classList.add("activite-group-title");
                title.textContent = groupLabel;

                container.appendChild(title);

            }

        }

        container.appendChild(buildActiviteRow(item));

    });

}


/*
    CARROUSEL "AUJOURD'HUI"
*/

function renderActiviteCarousel(todayItems) {

    if (!activiteCarousel) {
        return;
    }

    activiteCarousel.innerHTML = "";

    todayItems.forEach(item => {

        const card =
            document.createElement("button");

        card.type = "button";
        card.classList.add("activite-carousel-card");

        card.innerHTML = `
            <i data-lucide="${activiteIcons[item.type]}"></i>
            <p>${item.html}</p>
            <span>${timeAgo(item.createdAt)}</span>
        `;

        card.addEventListener("click", () => openModal(activiteModal));

        activiteCarousel.appendChild(card);

    });

}

if (activiteSeeAll) {

    activiteSeeAll.addEventListener(
        "click",
        () => openModal(activiteModal)
    );

}

rendezvousCollection.onSnapshot(snapshot => {

    activiteState.rendezvous =
        snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toJsDate(doc.data().createdAt)
        }));

    renderActivite();

});

galerieCollection.onSnapshot(snapshot => {

    activiteState.galerie =
        snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toJsDate(doc.data().createdAt)
        }));

    renderActivite();

});

messagesCollection.onSnapshot(snapshot => {

    activiteState.messages =
        snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toJsDate(doc.data().createdAt)
        }));

    renderActivite();
    renderChatMessages();

});


/*
    CHAT "PETIT MOT" (BULLES DE MESSAGERIE)
*/

function isOwnMessage(author) {

    const saved = getSavedName().trim().toLowerCase();

    if (!saved || !author) {
        return false;
    }

    return author.trim().toLowerCase() === saved;

}

function renderChatMessages() {

    if (!chatMessages) {
        return;
    }

    chatMessages.innerHTML = "";

    const sorted =
        [...activiteState.messages].sort((a, b) => {

            const timeA = a.createdAt ? a.createdAt.getTime() : 0;
            const timeB = b.createdAt ? b.createdAt.getTime() : 0;

            return timeA - timeB;

        });

    if (sorted.length === 0) {

        chatMessages.innerHTML =
            `<p class="chat-empty">Aucun message pour l'instant — écris le premier !</p>`;

        return;

    }

    sorted.forEach(message => {

        const own = isOwnMessage(message.author);

        const bubble =
            document.createElement("div");

        bubble.classList.add("chat-bubble", own ? "own" : "other");

        bubble.innerHTML = `
            ${
                own
                    ? ""
                    : `<span class="chat-bubble-author">${escapeHtml(message.author) || "Quelqu'un"}</span>`
            }
            ${escapeHtml(message.text)}
            <span class="chat-bubble-time">${timeAgo(message.createdAt)}</span>
        `;

        chatMessages.appendChild(bubble);

    });

    chatMessages.scrollTop = chatMessages.scrollHeight;

}

const messageModalTrigger =
    document.querySelector('[data-modal-target="messageModal"]');

if (messageModalTrigger) {

    messageModalTrigger.addEventListener("click", () => {

        setTimeout(() => {

            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

        }, 50);

    });

}
