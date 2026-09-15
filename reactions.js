/* =====================================================
   RÉACTIONS RAPIDES (❤️)
===================================================== */

function getReactedSet() {

    try {
        return new Set(
            JSON.parse(localStorage.getItem("reactedItems") || "[]")
        );
    } catch (error) {
        return new Set();
    }

}

function saveReactedSet(set) {

    try {
        localStorage.setItem(
            "reactedItems",
            JSON.stringify([...set])
        );
    } catch (error) {
        // Stockage indisponible : on ignore simplement.
    }

}

function renderReactionButton(collectionName, docId, count) {

    const reacted =
        getReactedSet().has(`${collectionName}/${docId}`);

    return `
        <button
            class="reaction-button ${reacted ? "reacted" : ""}"
            data-collection="${collectionName}"
            data-id="${docId}"
            aria-label="Réagir avec un cœur"
        >
            <i data-lucide="heart"></i>
            <span>${count || 0}</span>
        </button>
    `;

}

function bindReactionButton(button) {

    if (!button) {
        return;
    }

    button.addEventListener("click", async () => {

        const { collection: collectionName, id } = button.dataset;

        const key = `${collectionName}/${id}`;

        const reactedSet = getReactedSet();

        const alreadyReacted = reactedSet.has(key);

        const delta = alreadyReacted ? -1 : 1;

        if (alreadyReacted) {
            reactedSet.delete(key);
        } else {
            reactedSet.add(key);
        }

        saveReactedSet(reactedSet);

        try {

            await db.collection(collectionName).doc(id).update({
                reactions:
                    firebase.firestore.FieldValue.increment(delta)
            });

        } catch (error) {

            console.error(error);

        }

    });

}
