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

const activiteFeed =
    document.getElementById("activiteFeed");

const activiteEmpty =
    document.getElementById("activiteEmpty");


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

function renderActivite() {

    const items = [

        ...activiteState.rendezvous.map(rendezvous => ({
            type: "rendezvous",
            createdAt: rendezvous.createdAt,
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
            createdAt: item.createdAt,
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
            createdAt: message.createdAt,
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

    activiteFeed.innerHTML = "";

    if (items.length === 0) {

        activiteFeed.appendChild(activiteEmpty);

        return;

    }

    items.slice(0, 30).forEach(item => {

        const row =
            document.createElement("div");

        row.classList.add("activite-item");

        row.innerHTML = `
            <i data-lucide="${activiteIcons[item.type]}"></i>
            <div class="activite-item-content">
                <p>${item.html}</p>
                <span>${timeAgo(item.createdAt)}</span>
            </div>
        `;

        activiteFeed.appendChild(row);

    });

    if (window.lucide) {
        lucide.createIcons();
    }

}

rendezvousCollection.onSnapshot(snapshot => {

    activiteState.rendezvous =
        snapshot.docs.map(doc => ({
            ...doc.data(),
            createdAt: toJsDate(doc.data().createdAt)
        }));

    renderActivite();

});

galerieCollection.onSnapshot(snapshot => {

    activiteState.galerie =
        snapshot.docs.map(doc => ({
            ...doc.data(),
            createdAt: toJsDate(doc.data().createdAt)
        }));

    renderActivite();

});

messagesCollection.onSnapshot(snapshot => {

    activiteState.messages =
        snapshot.docs.map(doc => ({
            ...doc.data(),
            createdAt: toJsDate(doc.data().createdAt)
        }));

    renderActivite();

});
