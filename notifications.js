/* =====================================================
   NOTIFICATIONS DE NOUVEAUTÉ (POINTS SUR LA NAV)
===================================================== */

function getLastSeen(key) {

    try {
        return parseInt(
            localStorage.getItem(`lastSeen_${key}`) || "0",
            10
        );
    } catch (error) {
        return 0;
    }

}

function setLastSeen(key) {

    try {
        localStorage.setItem(`lastSeen_${key}`, Date.now().toString());
    } catch (error) {
        // Stockage indisponible : on ignore simplement.
    }

}

function showNavDot(sectionId) {

    const link =
        document.querySelector(`.navigation a[href="#${sectionId}"]`);

    if (!link || link.querySelector(".nav-dot")) {
        return;
    }

    const dot = document.createElement("span");

    dot.classList.add("nav-dot");

    link.appendChild(dot);

}

function hideNavDot(sectionId) {

    const link =
        document.querySelector(`.navigation a[href="#${sectionId}"]`);

    const dot = link && link.querySelector(".nav-dot");

    if (dot) {
        dot.remove();
    }

}

function markSeenOnView(sectionId, key) {

    const section = document.getElementById(sectionId);

    if (!section) {
        return;
    }

    const observer = new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    setLastSeen(key);
                    hideNavDot(sectionId);

                }

            });

        },
        { threshold: .3 }
    );

    observer.observe(section);

}

function checkForNewContent(items, key, sectionId) {

    if (!items.length) {
        return;
    }

    const latest = Math.max(
        ...items.map(item =>
            item.createdAt ? item.createdAt.getTime() : 0
        )
    );

    if (latest > getLastSeen(key)) {
        showNavDot(sectionId);
    }

}

markSeenOnView("galerie", "galerie");
markSeenOnView("activite", "activite");
