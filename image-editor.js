/* =====================================================
   ÉDITEUR D'IMAGE (ROTATION)

   Ouvert depuis une photo de la galerie pour la placer
   en fond du Hero ou de la section Notre histoire.
   L'image s'adapte toujours automatiquement à la section
   (comme un fond "cover") ; seule la rotation est réglable.
===================================================== */

const imageEditorModal =
    document.getElementById("imageEditorModal");

const editorFrame =
    document.getElementById("editorFrame");

const editorImage =
    document.getElementById("editorImage");

const editorRotateButton =
    document.getElementById("editorRotate");

const editorValidateButton =
    document.getElementById("editorValidate");

const editorStatus =
    document.getElementById("editorStatus");

const editorTargetPills =
    document.querySelector(".editor-target-pills");

let editorState = null;


function resetEditorState(imageUrl) {

    editorState = {
        imageUrl,
        target: "hero",
        rotation: 0
    };

}

function renderEditorPreview() {

    editorFrame.classList.toggle(
        "ratio-histoire",
        editorState.target === "histoire"
    );

    applyCrop(editorImage, editorFrame, editorState);

}

function openImageEditor(imageUrl) {

    resetEditorState(imageUrl);

    editorTargetPills
        .querySelectorAll(".filter-pill")
        .forEach(pill => {
            pill.classList.toggle(
                "active",
                pill.dataset.target === editorState.target
            );
        });

    editorStatus.textContent = "";
    editorStatus.classList.remove("error");

    renderEditorPreview();

    openModal(imageEditorModal);

}


/*
    CHOIX DE LA DESTINATION
*/

editorTargetPills
    .querySelectorAll(".filter-pill")
    .forEach(pill => {

        pill.addEventListener("click", () => {

            editorTargetPills
                .querySelectorAll(".filter-pill")
                .forEach(p => p.classList.remove("active"));

            pill.classList.add("active");

            editorState.target = pill.dataset.target;

            renderEditorPreview();

        });

    });


/*
    ROTATION
*/

editorRotateButton.addEventListener("click", () => {

    editorState.rotation = (editorState.rotation + 90) % 360;

    renderEditorPreview();

});


/*
    VALIDATION
*/

editorValidateButton.addEventListener("click", async () => {

    editorValidateButton.disabled = true;
    editorStatus.classList.remove("error");
    editorStatus.textContent = "Enregistrement...";

    try {

        await saveBackgroundCrop(editorState.target, {
            imageUrl: editorState.imageUrl,
            rotation: editorState.rotation
        });

        editorStatus.textContent = "Image mise à jour !";

        setTimeout(() => closeModal(imageEditorModal), 700);

    } catch (error) {

        console.error(error);

        editorStatus.textContent =
            error.code === "permission-denied"
                ? "Envoi refusé (permissions Firestore à vérifier)."
                : "Une erreur est survenue, réessaie.";

        editorStatus.classList.add("error");

    } finally {

        editorValidateButton.disabled = false;

    }

});
