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

            </div>

        </div>
    `;

}

function bindCommentsSection(section, collectionName, docId) {

    if (!section) {
        return;
    }

    const toggle = section.querySelector(".comments-toggle");
    const panel = section.querySelector(".comments-panel");
    const list = section.querySelector(".comments-list");
    const form = section.querySelector(".comment-form");
    const authorInput = form.querySelector(".comment-author");
    const textInput = form.querySelector(".comment-text");

    const saved = getSavedName();

    if (saved) {
        authorInput.value = saved;
    }

    const commentsRef =
        db.collection(collectionName).doc(docId).collection("comments");

    let loaded = false;

    toggle.addEventListener("click", () => {

        panel.hidden = !panel.hidden;

        if (panel.hidden || loaded) {
            return;
        }

        loaded = true;

        commentsRef.orderBy("createdAt", "asc").onSnapshot(snapshot => {

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

    });

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const author = authorInput.value.trim();
        const text = textInput.value.trim();

        if (!text) {
            return;
        }

        try {

            await commentsRef.add({
                author,
                text,
                createdAt:
                    firebase.firestore.FieldValue.serverTimestamp()
            });

            saveName(author);

            textInput.value = "";

        } catch (error) {

            console.error(error);

        }

    });

}
