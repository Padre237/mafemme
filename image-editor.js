/* =====================================================
   ÉDITEUR D'IMAGE (RECADRAGE, ZOOM, ROTATION)

   Ouvert depuis une photo de la galerie pour la placer
   en fond du Hero ou de la section Notre histoire.
===================================================== */

const imageEditorModal =
    document.getElementById("imageEditorModal");

const editorFrame =
    document.getElementById("editorFrame");

const editorImage =
    document.getElementById("editorImage");

const editorZoom =
    document.getElementById("editorZoom");

const editorRotateButton =
    document.getElementById("editorRotate");

const editorResetButton =
    document.getElementById("editorReset");

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
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0
    };

}

function renderEditorPreview() {

    editorFrame.classList.toggle(
        "ratio-histoire",
        editorState.target === "histoire"
    );

    applyCrop(editorImage, editorFrame, editorState);

    editorZoom.value = editorState.scale;

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
    ZOOM, ROTATION, RÉINITIALISATION
*/

editorZoom.addEventListener("input", () => {

    editorState.scale = parseFloat(editorZoom.value);

    renderEditorPreview();

});

editorRotateButton.addEventListener("click", () => {

    editorState.rotation = (editorState.rotation + 90) % 360;

    renderEditorPreview();

});

editorResetButton.addEventListener("click", () => {

    editorState.scale = 1;
    editorState.offsetX = 0;
    editorState.offsetY = 0;
    editorState.rotation = 0;

    renderEditorPreview();

});


/*
    GLISSER POUR REPOSITIONNER LA PHOTO
*/

let editorDragging = false;
let editorDragStartX = 0;
let editorDragStartY = 0;
let editorDragStartOffsetX = 0;
let editorDragStartOffsetY = 0;

editorFrame.addEventListener("pointerdown", (event) => {

    editorDragging = true;

    editorDragStartX = event.clientX;
    editorDragStartY = event.clientY;
    editorDragStartOffsetX = editorState.offsetX;
    editorDragStartOffsetY = editorState.offsetY;

    editorFrame.setPointerCapture(event.pointerId);

});

editorFrame.addEventListener("pointermove", (event) => {

    if (!editorDragging) {
        return;
    }

    const deltaX = event.clientX - editorDragStartX;
    const deltaY = event.clientY - editorDragStartY;

    editorState.offsetX =
        editorDragStartOffsetX + deltaX / editorFrame.clientWidth;

    editorState.offsetY =
        editorDragStartOffsetY + deltaY / editorFrame.clientHeight;

    applyCrop(editorImage, editorFrame, editorState);

});

["pointerup", "pointercancel", "pointerleave"].forEach(eventName => {

    editorFrame.addEventListener(eventName, () => {
        editorDragging = false;
    });

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
            scale: editorState.scale,
            offsetX: editorState.offsetX,
            offsetY: editorState.offsetY,
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
