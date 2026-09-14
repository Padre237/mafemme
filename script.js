/* =====================================================
   INITIALISATION DES ICONES
===================================================== */

lucide.createIcons();


/* =====================================================
   ANNÉE
===================================================== */

document.getElementById("year").textContent =
    new Date().getFullYear();


/* =====================================================
   DATE DE RENCONTRE
===================================================== */

/*
    MODIFIE CETTE DATE.

    Exemple :
    15 février 2024 à 18h30

    Format :
    année, mois - 1, jour, heure, minute

    Attention :
    janvier = 0
    février = 1
    mars = 2
    etc.
*/

const meetingDate = new Date(
    2026,
    1,
    15,
    18,
    30,
    0
);


/* =====================================================
   COMPTEUR
===================================================== */

function updateCounter() {

    const now = new Date();

    let difference = now - meetingDate;

    if (difference < 0) {
        difference = 0;
    }

    const totalSeconds = Math.floor(difference / 1000);

    const days = Math.floor(totalSeconds / 86400);

    const hours = Math.floor(
        (totalSeconds % 86400) / 3600
    );

    const minutes = Math.floor(
        (totalSeconds % 3600) / 60
    );

    const seconds =
        totalSeconds % 60;

    document.getElementById("days").textContent =
        days.toLocaleString("fr-FR");

    document.getElementById("hours").textContent =
        String(hours).padStart(2, "0");

    document.getElementById("minutes").textContent =
        String(minutes).padStart(2, "0");

    document.getElementById("seconds").textContent =
        String(seconds).padStart(2, "0");
}

updateCounter();

setInterval(updateCounter, 1000);


/* =====================================================
   HEADER AU SCROLL
===================================================== */

const header = document.getElementById("header");

window.addEventListener("scroll", () => {

    if (window.scrollY > 40) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }

});


/* =====================================================
   MENU MOBILE
===================================================== */

const menuButton =
    document.getElementById("menuButton");

const navigation =
    document.getElementById("navigation");

menuButton.addEventListener("click", () => {

    navigation.classList.toggle("mobile-open");

});


/* =====================================================
   SCROLL REVEAL
===================================================== */

const revealElements =
    document.querySelectorAll(".reveal");

/*
    Décalage progressif : les éléments
    d'une même section apparaissent
    l'un après l'autre, comme un
    fondu en cascade.
*/

let lastParent = null;
let staggerIndex = 0;

revealElements.forEach(element => {

    if (element.parentElement !== lastParent) {
        lastParent = element.parentElement;
        staggerIndex = 0;
    }

    element.style.transitionDelay =
        `${Math.min(staggerIndex * 120, 480)}ms`;

    staggerIndex++;

});

const observer =
    new IntersectionObserver(

        (entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

                    observer.unobserve(entry.target);

                }

            });

        },

        {
            threshold: 0.15
        }

    );

revealElements.forEach(element => {

    observer.observe(element);

});


/* =====================================================
   LETTRE
===================================================== */

const envelope =
    document.getElementById("envelope");

const letterButton =
    document.getElementById("letterButton");

const letterButtonText =
    document.getElementById("letterButtonText");

const openLetterHero =
    document.getElementById("openLetterHero");

const letterTextContainer =
    document.getElementById("letterText");

const letterSignature =
    document.querySelector(".letter-signature");

const letterPaper =
    document.querySelector(".letter-paper");

function scrollLetterToCursor() {

    letterPaper.scrollTop =
        letterPaper.scrollHeight;

}


/*
    ÉCRITURE MANUSCRITE PROGRESSIVE

    On mémorise le texte original de chaque
    paragraphe une seule fois, puis on le
    réécrit caractère par caractère à chaque
    ouverture de la lettre (les <br> comptent
    comme des sauts de ligne instantanés).
*/

const letterParagraphs =
    Array.from(
        letterTextContainer.querySelectorAll("p")
    );

letterParagraphs.forEach(paragraph => {

    paragraph.dataset.original =
        paragraph.innerHTML.trim();

    paragraph.innerHTML = "";

});

let typingTimeouts = [];

function stopTyping() {

    typingTimeouts.forEach(id => clearTimeout(id));

    typingTimeouts = [];

}

function resetLetterText() {

    stopTyping();

    letterParagraphs.forEach(paragraph => {

        paragraph.innerHTML = "";

    });

    letterSignature.classList.remove("visible");

}

function typeLetter() {

    stopTyping();

    const charSpeed = 15;
    const lineBreakPause = charSpeed * 4;
    const paragraphPause = 220;

    let paragraphIndex = 0;

    function typeNextParagraph() {

        if (paragraphIndex >= letterParagraphs.length) {

            const id = setTimeout(
                () => letterSignature.classList.add("visible"),
                300
            );

            typingTimeouts.push(id);

            return;

        }

        const paragraph =
            letterParagraphs[paragraphIndex];

        const lines =
            paragraph.dataset.original
                .split(/<br\s*\/?>/i);

        let lineIndex = 0;
        let charIndex = 0;

        function typeNextChar() {

            if (lineIndex >= lines.length) {

                paragraph.innerHTML =
                    lines.join("<br>");

                scrollLetterToCursor();

                paragraphIndex++;

                const id = setTimeout(
                    typeNextParagraph,
                    paragraphPause
                );

                typingTimeouts.push(id);

                return;

            }

            const line = lines[lineIndex];

            const linesDone =
                lines.slice(0, lineIndex).join("<br>");

            const prefix =
                lineIndex > 0 ? linesDone + "<br>" : "";

            paragraph.innerHTML =
                prefix +
                line.slice(0, charIndex) +
                '<span class="typing-cursor"></span>';

            scrollLetterToCursor();

            if (charIndex < line.length) {

                charIndex++;

                const id = setTimeout(
                    typeNextChar,
                    charSpeed
                );

                typingTimeouts.push(id);

            } else {

                lineIndex++;
                charIndex = 0;

                const id = setTimeout(
                    typeNextChar,
                    lineBreakPause
                );

                typingTimeouts.push(id);

            }

        }

        typeNextChar();

    }

    typeNextParagraph();

}


function toggleLetter() {

    envelope.classList.toggle("open");

    const isOpen =
        envelope.classList.contains("open");

    if (isOpen) {

        letterButtonText.textContent =
            "Fermer ma lettre";

        resetLetterText();

        /*
            On attend que la lettre soit
            sortie de l'enveloppe avant
            de commencer à écrire.
        */

        const id = setTimeout(
            typeLetter,
            1300
        );

        typingTimeouts.push(id);

    } else {

        letterButtonText.textContent =
            "Ouvrir ma lettre";

        resetLetterText();

    }

}


letterButton.addEventListener(
    "click",
    toggleLetter
);


openLetterHero.addEventListener(
    "click",
    () => {

        document
            .getElementById("lettre")
            .scrollIntoView({
                behavior: "smooth"
            });

        setTimeout(() => {

            if (!envelope.classList.contains("open")) {
                toggleLetter();
            }

        }, 700);

    }
);


/* =====================================================
   FERMER LE MENU APRÈS CLIC
===================================================== */

document
    .querySelectorAll(".navigation a")
    .forEach(link => {

        link.addEventListener("click", () => {

            navigation.classList.remove(
                "mobile-open"
            );

        });

    });


/* =====================================================
   CŒURS ANIMÉS
===================================================== */

const heartsContainer =
    document.querySelector(".floating-hearts");


function createFloatingHeart() {

    const heart =
        document.createElement("div");

    heart.classList.add("floating-heart");

    heart.innerHTML = `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="
                M20.84 4.61
                a5.5 5.5 0 0 0-7.78 0
                L12 5.67
                l-1.06-1.06
                a5.5 5.5 0 0 0-7.78 7.78
                l1.06 1.06
                L12 21.23
                l7.78-7.78
                1.06-1.06
                a5.5 5.5 0 0 0 0-7.78z
            "/>
        </svg>
    `;

    const left =
        Math.random() * 100;

    const duration =
        8 + Math.random() * 7;

    const size =
        8 + Math.random() * 10;

    const drift =
        (Math.random() * 100) - 50;

    heart.style.left = `${left}%`;

    heart.style.bottom = "-30px";

    heart.style.width = `${size}px`;

    heart.style.height = `${size}px`;

    heart.style.animationDuration =
        `${duration}s`;

    heart.style.setProperty(
        "--drift",
        `${drift}px`
    );

    heartsContainer.appendChild(heart);

    setTimeout(() => {

        heart.remove();

    }, duration * 1000);

}


/*
    On crée un cœur toutes les
    1.8 secondes.
*/

setInterval(
    createFloatingHeart,
    1800
);


/* =====================================================
   EFFET PARALLAXE HERO
===================================================== */

const heroImage =
    document.querySelector(".hero-image");

window.addEventListener("scroll", () => {

    const scroll =
        window.scrollY;

    if (scroll < window.innerHeight) {

        heroImage.style.transform =
            `scale(1.1) translateY(${scroll * 0.12}px)`;

    }

});


/* =====================================================
   PETIT EFFET SUR LE COMPTEUR
===================================================== */

const counterCards =
    document.querySelectorAll(".counter-card");

counterCards.forEach((card, index) => {

    card.style.transitionDelay =
        `${index * 100}ms`;

});


/* =====================================================
   ANIMATION DE LA SIGNATURE
===================================================== */

const finalSignature =
    document.querySelector(".final-signature");

const signatureObserver =
    new IntersectionObserver(

        entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    finalSignature.animate(

                        [
                            {
                                opacity: 0,
                                transform:
                                    "translateY(15px)"
                            },
                            {
                                opacity: 1,
                                transform:
                                    "translateY(0)"
                            }
                        ],

                        {
                            duration: 1200,
                            easing:
                                "cubic-bezier(.2,.8,.2,1)",
                            fill: "forwards"
                        }

                    );

                }

            });

        },

        {
            threshold: .5
        }

    );

signatureObserver.observe(finalSignature);