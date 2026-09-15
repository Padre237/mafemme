/* =====================================================
   CARTES FLOTTANTES (MODALES) POUR LES FORMULAIRES
===================================================== */

function openModal(modal) {

    if (!modal) {
        return;
    }

    modal.classList.add("open");
    document.body.classList.add("modal-open");

    if (window.lucide) {
        lucide.createIcons();
    }

}

function closeModal(modal) {

    if (!modal) {
        return;
    }

    modal.classList.remove("open");
    document.body.classList.remove("modal-open");

}

document
    .querySelectorAll("[data-modal-target]")
    .forEach(trigger => {

        trigger.addEventListener("click", () => {

            const modal =
                document.getElementById(
                    trigger.dataset.modalTarget
                );

            openModal(modal);

        });

    });

document
    .querySelectorAll(".form-modal")
    .forEach(modal => {

        modal.addEventListener("click", (event) => {

            if (event.target === modal) {
                closeModal(modal);
            }

        });

        const closeButton =
            modal.querySelector(".form-modal-close");

        if (closeButton) {

            closeButton.addEventListener(
                "click",
                () => closeModal(modal)
            );

        }

    });

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        document
            .querySelectorAll(".form-modal.open")
            .forEach(closeModal);

    }

});
