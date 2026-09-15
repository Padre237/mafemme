/* =====================================================
   RENDEZ-VOUS PARTAGÉS (FIRESTORE)
===================================================== */

const db = firebase.firestore();
const rendezvousCollection = db.collection("rendezvous");

const rendezvousForm =
    document.getElementById("rendezvousForm");

const rendezvousStatus =
    document.getElementById("rendezvousStatus");

const rendezvousToggle =
    document.getElementById("rendezvousToggle");

const rendezvousList =
    document.getElementById("rendezvousList");

const rendezvousEmpty =
    document.getElementById("rendezvousEmpty");

const rendezvousCount =
    document.getElementById("rendezvousCount");

const rendezvousCountdown =
    document.getElementById("rendezvousCountdown");

const rdvCountDays =
    document.getElementById("rdvCountDays");

const rdvCountHours =
    document.getElementById("rdvCountHours");

const rdvCountMinutes =
    document.getElementById("rdvCountMinutes");

const rdvCountSeconds =
    document.getElementById("rdvCountSeconds");

const rdvCountPlace =
    document.getElementById("rdvCountPlace");


/*
    AFFICHAGE / MASQUAGE DE LA LISTE
    Cliquer sur la "boîte" ouvre ou ferme
    l'affichage des rendez-vous programmés.
*/

rendezvousToggle.addEventListener("click", () => {

    rendezvousList.classList.toggle("open");
    rendezvousToggle.classList.toggle("open");

});


/*
    FORMATAGE D'UNE DATE EN FRANÇAIS
*/

function formatRendezvousDate(dateStr, timeStr) {

    const [year, month, day] = dateStr.split("-");

    const date =
        new Date(year, month - 1, day);

    const dateLabel =
        date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    return `${dateLabel} à ${timeStr}`;

}


/*
    AJOUT D'UN RENDEZ-VOUS
*/

rendezvousForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const author = document.getElementById("rdvAuthor").value.trim();
    const date = document.getElementById("rdvDate").value;
    const time = document.getElementById("rdvTime").value;
    const lieu = document.getElementById("rdvLieu").value.trim();
    const message = document.getElementById("rdvMessage").value.trim();

    const submitButton =
        document.getElementById("rdvSubmit");

    submitButton.disabled = true;
    rendezvousStatus.textContent = "Envoi en cours...";
    rendezvousStatus.classList.remove("error");

    try {

        await rendezvousCollection.add({
            author,
            date,
            time,
            datetime: `${date}T${time}`,
            lieu,
            message,
            confirmed: false,
            createdAt:
                firebase.firestore.FieldValue.serverTimestamp()
        });

        saveName(author);

        rendezvousForm.reset();
        prefillAuthorInputs();

        rendezvousStatus.textContent =
            "Ta proposition a bien été envoyée !";

        closeModal(document.getElementById("rendezvousModal"));

        if (!rendezvousList.classList.contains("open")) {
            rendezvousToggle.click();
        }

    } catch (error) {

        console.error(error);

        rendezvousStatus.textContent =
            "Une erreur est survenue, réessaie.";

        rendezvousStatus.classList.add("error");

    } finally {

        submitButton.disabled = false;

        setTimeout(() => {
            rendezvousStatus.textContent = "";
        }, 4000);

    }

});


/*
    SUPPRESSION D'UN RENDEZ-VOUS
*/

function deleteRendezvous(id) {

    rendezvousCollection.doc(id).delete();

}


/*
    CONFIRMATION D'UN RENDEZ-VOUS
*/

function toggleConfirmRendezvous(id, confirmed) {

    rendezvousCollection.doc(id).update({
        confirmed: !confirmed
    });

}


/*
    COMPTE À REBOURS DU PROCHAIN RENDEZ-VOUS CONFIRMÉ
*/

let upcomingRendezvous = null;
let countdownInterval = null;

function findUpcomingConfirmed(rendezvousList) {

    const now = new Date();

    const upcoming = rendezvousList
        .filter(item =>
            item.confirmed &&
            new Date(`${item.date}T${item.time}`) > now
        )
        .sort((a, b) =>
            new Date(`${a.date}T${a.time}`) -
            new Date(`${b.date}T${b.time}`)
        );

    return upcoming[0] || null;

}

function updateCountdownDisplay() {

    if (!upcomingRendezvous) {

        rendezvousCountdown.hidden = true;

        return;

    }

    const target =
        new Date(
            `${upcomingRendezvous.date}T${upcomingRendezvous.time}`
        );

    const diff = target - new Date();

    if (diff <= 0) {

        rendezvousCountdown.hidden = true;

        return;

    }

    rendezvousCountdown.hidden = false;

    const totalSeconds = Math.floor(diff / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    rdvCountDays.textContent = days;
    rdvCountHours.textContent = String(hours).padStart(2, "0");
    rdvCountMinutes.textContent = String(minutes).padStart(2, "0");
    rdvCountSeconds.textContent = String(seconds).padStart(2, "0");

    rdvCountPlace.textContent =
        upcomingRendezvous.lieu
            ? `À ${upcomingRendezvous.lieu}`
            : "";

}

countdownInterval = setInterval(updateCountdownDisplay, 1000);


/*
    AFFICHAGE EN TEMPS RÉEL DE LA LISTE
*/

rendezvousCollection
    .orderBy("datetime", "asc")
    .onSnapshot(snapshot => {

        rendezvousCount.textContent = snapshot.size;

        rendezvousList.innerHTML = "";

        const allRendezvous =
            snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        upcomingRendezvous =
            findUpcomingConfirmed(allRendezvous);

        updateCountdownDisplay();

        if (snapshot.empty) {

            rendezvousList.appendChild(rendezvousEmpty);

            return;

        }

        allRendezvous.forEach(rendezvous => {

            const card =
                document.createElement("div");

            card.classList.add("rendezvous-card");

            if (rendezvous.confirmed) {
                card.classList.add("confirmed");
            }

            card.innerHTML = `
                <div class="rendezvous-card-info">
                    <div class="rendezvous-card-top">
                        <strong>
                            ${formatRendezvousDate(
                                rendezvous.date,
                                rendezvous.time
                            )}
                        </strong>
                        <span class="rendezvous-badge">
                            ${
                                rendezvous.confirmed
                                    ? "Confirmé 💕"
                                    : "Proposé"
                            }
                        </span>
                    </div>
                    <span>
                        <i data-lucide="map-pin"></i>
                        ${escapeHtml(rendezvous.lieu)}
                    </span>
                    ${
                        rendezvous.message
                            ? `<p>${escapeHtml(rendezvous.message)}</p>`
                            : ""
                    }
                    <em class="rendezvous-author">
                        Proposé par ${escapeHtml(rendezvous.author) || "quelqu'un"}
                    </em>
                    <div class="rendezvous-card-actions">
                        <button class="rendezvous-confirm ${rendezvous.confirmed ? "is-confirmed" : ""}">
                            ${
                                rendezvous.confirmed
                                    ? "Annuler la confirmation"
                                    : "Je confirme 💕"
                            }
                        </button>
                        ${renderReactionButton(
                            "rendezvous",
                            rendezvous.id,
                            rendezvous.reactions
                        )}
                    </div>
                </div>

                <button
                    class="rendezvous-delete"
                    aria-label="Supprimer ce rendez-vous"
                >
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            card
                .querySelector(".rendezvous-delete")
                .addEventListener(
                    "click",
                    () => deleteRendezvous(rendezvous.id)
                );

            card
                .querySelector(".rendezvous-confirm")
                .addEventListener(
                    "click",
                    () => toggleConfirmRendezvous(
                        rendezvous.id,
                        rendezvous.confirmed
                    )
                );

            bindReactionButton(
                card.querySelector(".reaction-button")
            );

            rendezvousList.appendChild(card);

        });

        if (window.lucide) {
            lucide.createIcons();
        }

    }, error => {

        console.error(error);

        rendezvousList.innerHTML =
            `<p class="rendezvous-empty">
                Impossible de charger les rendez-vous
                pour le moment.
            </p>`;

    });
