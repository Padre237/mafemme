/* =====================================================
   NOTIFICATIONS NAVIGATEUR

   Prévient (via l'API Notification du navigateur) de tout
   nouveau message dans le chat, nouveau rendez-vous,
   commentaire ou réaction emoji — y compris ses propres
   actions. Fonctionne tant qu'un onglet du site reste
   ouvert (pas besoin qu'il soit au premier plan) ; ça ne
   fonctionne pas site totalement fermé (il faudrait un
   service worker + Firebase Cloud Messaging pour ça), ni
   sur Safari iOS qui ne supporte pas cette API hors PWA
   installée.
===================================================== */

const notifPermissionToggle =
    document.getElementById("notifPermissionToggle");


/*
    PRÉFÉRENCE ET PERMISSION
*/

function getNotificationsEnabled() {

    try {
        return localStorage.getItem("notificationsEnabled") === "true";
    } catch (error) {
        return false;
    }

}

function setNotificationsEnabled(value) {

    try {
        localStorage.setItem("notificationsEnabled", value ? "true" : "false");
    } catch (error) {
        // Stockage indisponible : on ignore simplement.
    }

}

function notificationsActive() {

    return (
        "Notification" in window &&
        Notification.permission === "granted" &&
        getNotificationsEnabled()
    );

}

function updateNotifToggleUI() {

    if (!notifPermissionToggle) {
        return;
    }

    const active = notificationsActive();

    notifPermissionToggle.classList.toggle("active", active);

    notifPermissionToggle.querySelector("i")
        .setAttribute("data-lucide", active ? "bell" : "bell-off");

    if (window.lucide) {
        lucide.createIcons();
    }

}

if (notifPermissionToggle) {

    notifPermissionToggle.addEventListener("click", async () => {

        if (!("Notification" in window)) {

            alert("Les notifications ne sont pas prises en charge par ce navigateur.");

            return;

        }

        if (notificationsActive()) {

            setNotificationsEnabled(false);
            updateNotifToggleUI();

            return;

        }

        if (Notification.permission === "denied") {

            alert(
                "Les notifications sont bloquées pour ce site. " +
                "Autorise-les dans les réglages de ton navigateur pour les activer."
            );

            return;

        }

        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            setNotificationsEnabled(true);
        }

        updateNotifToggleUI();

    });

    updateNotifToggleUI();

}


/*
    ENVOI D'UNE NOTIFICATION
*/

function fireNotification(title, body) {

    if (!notificationsActive()) {
        return;
    }

    try {

        new Notification(title, {
            body,
            icon: "mafemme.jpg",
            tag: `mafemme-${Date.now()}`
        });

    } catch (error) {

        console.error(error);

    }

}


/*
    NOUVEAUX MESSAGES DU CHAT
*/

let notifMessagesInitialLoad = true;

messagesCollection.onSnapshot(snapshot => {

    snapshot.docChanges().forEach(change => {

        if (change.type === "added" && !notifMessagesInitialLoad) {

            const message = change.doc.data();

            fireNotification(
                `💌 ${message.author || "Quelqu'un"}`,
                message.text
            );

        }

    });

    notifMessagesInitialLoad = false;

});


/*
    RÉACTIONS EMOJI + NOUVELLES ENTRÉES
    (galerie et rendez-vous)

    Chaque document garde en mémoire son dernier total de
    réactions par emoji, pour détecter une augmentation
    (donc une nouvelle réaction) à chaque mise à jour.
*/

function watchCollectionForNotifications(collectionRef, options) {

    let initialLoad = true;
    const baseline = {};

    collectionRef.onSnapshot(snapshot => {

        snapshot.docChanges().forEach(change => {

            const data = change.doc.data();
            const id = change.doc.id;

            if (change.type === "added") {

                baseline[id] = { ...(data.emojiReactions || {}) };

                if (!initialLoad && options.onNewEntry) {
                    options.onNewEntry(data);
                }

            }

            if (change.type === "modified") {

                const previous = baseline[id] || {};
                const current = data.emojiReactions || {};

                Object.keys(current).forEach(emoji => {

                    if ((current[emoji] || 0) > (previous[emoji] || 0)) {
                        options.onNewReaction(emoji, data);
                    }

                });

                baseline[id] = { ...current };

            }

            if (change.type === "removed") {
                delete baseline[id];
            }

        });

        initialLoad = false;

    });

}

watchCollectionForNotifications(rendezvousCollection, {

    onNewEntry: (rendezvous) => {

        fireNotification(
            "📅 Nouveau rendez-vous",
            `${rendezvous.author || "Quelqu'un"} a proposé un rendez-vous`
        );

    },

    onNewReaction: (emoji) => {

        fireNotification(
            "Nouvelle réaction",
            `Quelqu'un a réagi ${emoji} à un rendez-vous`
        );

    }

});

watchCollectionForNotifications(galerieCollection, {

    onNewReaction: (emoji) => {

        fireNotification(
            "Nouvelle réaction",
            `Quelqu'un a réagi ${emoji} à une photo`
        );

    }

});


/*
    NOUVEAUX COMMENTAIRES (galerie ET rendez-vous)
*/

let notifCommentsInitialLoad = true;

db.collectionGroup("comments").onSnapshot(snapshot => {

    snapshot.docChanges().forEach(change => {

        if (change.type === "added" && !notifCommentsInitialLoad) {

            const comment = change.doc.data();

            fireNotification(
                `💬 ${comment.author || "Quelqu'un"} a commenté`,
                comment.text
            );

        }

    });

    notifCommentsInitialLoad = false;

}, error => {

    console.error(error);

});
