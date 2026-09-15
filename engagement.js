/* =====================================================
   ENGAGEMENT : RÉACTIONS EMOJI + COMMENTAIRES
   (utilisé sur les photos de la galerie et les rendez-vous)
===================================================== */

const EMOJI_SET = ["❤️", "😍", "😂", "😮", "👏"];


/*
    RÉACTIONS EMOJI
*/

function getEmojiReactedSet() {

    try {
        return new Set(
            JSON.parse(localStorage.getItem("emojiReactedItems") || "[]")
        );
    } catch (error) {
        return new Set();
    }

}

function saveEmojiReactedSet(set) {

    try {
        localStorage.setItem(
            "emojiReactedItems",
            JSON.stringify([...set])
        );
    } catch (error) {
        // Stockage indisponible : on ignore simplement.
    }

}

function renderEmojiBar(collectionName, docId, emojiReactions) {

    const reactedSet = getEmojiReactedSet();
    const counts = emojiReactions || {};

    return `
        <div class="emoji-bar" data-collection="${collectionName}" data-id="${docId}">
            ${EMOJI_SET.map(emoji => {

                const count = counts[emoji] || 0;

                const reacted =
                    reactedSet.has(`${collectionName}/${docId}/${emoji}`);

                return `
                    <button
                        type="button"
                        class="emoji-reaction ${reacted ? "reacted" : ""}"
                        data-emoji="${emoji}"
                        aria-label="Réagir avec ${emoji}"
                    >
                        ${emoji}
                        ${count ? `<span>${count}</span>` : ""}
                    </button>
                `;

            }).join("")}
        </div>
    `;

}

function explodeEmoji(originButton, emoji) {

    const rect = originButton.getBoundingClientRect();

    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const count = 8 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {

        const particle =
            document.createElement("span");

        particle.classList.add("emoji-particle");
        particle.textContent = emoji;

        const angle =
            (Math.PI * 2 * i) / count + (Math.random() * 0.6 - 0.3);

        const distance = 45 + Math.random() * 55;

        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance - 25;

        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;

        particle.style.setProperty("--tx", `${tx}px`);
        particle.style.setProperty("--ty", `${ty}px`);
        particle.style.setProperty("--scale", (0.6 + Math.random() * 0.9).toFixed(2));
        particle.style.setProperty("--rot", `${Math.round(Math.random() * 70 - 35)}deg`);
        particle.style.animationDelay = `${Math.round(Math.random() * 90)}ms`;

        document.body.appendChild(particle);

        particle.addEventListener("animationend", () => particle.remove());

    }

}

function bindEmojiBar(bar) {

    if (!bar) {
        return;
    }

    const { collection: collectionName, id } = bar.dataset;

    bar.querySelectorAll(".emoji-reaction").forEach(button => {

        button.addEventListener("click", async () => {

            const emoji = button.dataset.emoji;
            const key = `${collectionName}/${id}/${emoji}`;

            const reactedSet = getEmojiReactedSet();
            const alreadyReacted = reactedSet.has(key);
            const delta = alreadyReacted ? -1 : 1;

            if (alreadyReacted) {
                reactedSet.delete(key);
            } else {
                reactedSet.add(key);
                explodeEmoji(button, emoji);
            }

            saveEmojiReactedSet(reactedSet);

            try {

                await db.collection(collectionName).doc(id).update({
                    [`emojiReactions.${emoji}`]:
                        firebase.firestore.FieldValue.increment(delta)
                });

            } catch (error) {

                console.error(error);

            }

        });

    });

}


/*
    COMMENTAIRES
*/

function renderCommentsSection() {

    return `
        <div class="comments-section">

            <button type="button" class="comments-toggle">
                <i data-lucide="message-circle"></i>
                <span>Commenter</span>
                <span class="comment-count" hidden>0</span>
            </button>

            <div class="comments-panel" hidden>

                <div class="comments-list"></div>

                <form class="comment-form">

                    <input
                        type="text"
                        class="author-name-input comment-author"
                        placeholder="Ton prénom"
                        required
                    >

                    <input
                        type="text"
                        class="comment-text"
                        placeholder="Ajouter un commentaire..."
                        required
                    >

                    <button type="submit" aria-label="Envoyer le commentaire">
                        <i data-lucide="send"></i>
                    </button>

                </form>

                <p class="comment-status"></p>

            </div>

        </div>
    `;

}


/*
    BROUILLON DE COMMENTAIRE (garde le texte tapé et l'état
    ouvert/fermé du panneau en dehors du DOM, au cas où la
    carte serait quand même redessinée pendant la frappe)
*/

const commentDrafts = {};

function isTypingInComments(container) {

    const active = document.activeElement;

    return (
        Boolean(active) &&
        container.contains(active) &&
        (active.classList.contains("comment-author") || active.classList.contains("comment-text"))
    );

}

function bindCommentsSection(section, collectionName, docId) {

    if (!section) {
        return;
    }

    const toggle = section.querySelector(".comments-toggle");
    const countBadge = section.querySelector(".comment-count");
    const panel = section.querySelector(".comments-panel");
    const list = section.querySelector(".comments-list");
    const form = section.querySelector(".comment-form");
    const authorInput = form.querySelector(".comment-author");
    const textInput = form.querySelector(".comment-text");
    const status = section.querySelector(".comment-status");
    const submitButton = form.querySelector("button[type=submit]");

    const draftKey = `${collectionName}/${docId}`;

    const draft =
        commentDrafts[draftKey] ||
        (commentDrafts[draftKey] = {
            open: false,
            author: "",
            text: ""
        });

    authorInput.value = draft.author || getSavedName();
    textInput.value = draft.text;
    panel.hidden = !draft.open;

    authorInput.addEventListener("input", () => {
        draft.author = authorInput.value;
    });

    textInput.addEventListener("input", () => {
        draft.text = textInput.value;
    });

    toggle.addEventListener("click", () => {

        panel.hidden = !panel.hidden;
        draft.open = !panel.hidden;

    });

    const commentsRef =
        db.collection(collectionName).doc(docId).collection("comments");

    commentsRef.orderBy("createdAt", "asc").onSnapshot(snapshot => {

        countBadge.hidden = snapshot.size === 0;
        countBadge.textContent = snapshot.size;

        list.innerHTML = "";

        if (snapshot.empty) {

            list.innerHTML =
                `<p class="comments-empty">Aucun commentaire pour l'instant.</p>`;

            return;

        }

        snapshot.forEach(doc => {

            const comment = doc.data();

            const item = document.createElement("p");
            item.classList.add("comment-item");

            item.innerHTML =
                `<strong>${escapeHtml(comment.author) || "Quelqu'un"}</strong> ` +
                escapeHtml(comment.text);

            list.appendChild(item);

        });

        list.scrollTop = list.scrollHeight;

    });

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const author = authorInput.value.trim();
        const text = textInput.value.trim();

        if (!text) {
            return;
        }

        submitButton.disabled = true;
        status.textContent = "";
        status.classList.remove("error");

        try {

            await commentsRef.add({
                author,
                text,
                createdAt:
                    firebase.firestore.FieldValue.serverTimestamp()
            });

            saveName(author);

            textInput.value = "";
            draft.text = "";

        } catch (error) {

            console.error(error);

            status.textContent =
                error.code === "permission-denied"
                    ? "Envoi refusé (permissions Firestore à vérifier)."
                    : "Une erreur est survenue, réessaie.";

            status.classList.add("error");

        } finally {

            submitButton.disabled = false;

        }

    });

}
