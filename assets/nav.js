function markActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;

    const link = document.querySelector(`.top-nav .nav-link[data-page="${page}"]`);
    if (link) {
        link.classList.add('nav-link--active');
        const more = link.closest('.top-nav__more');
        if (more) {
            const moreBtn = more.querySelector('.top-nav__more-btn');
            if (moreBtn) moreBtn.classList.add('nav-link--active');
        }
    }
}

function initMoreMenu() {
    const more = document.querySelector('.top-nav__more');
    if (!more) return;

    const button = more.querySelector('.top-nav__more-btn');
    const menu = more.querySelector('.top-nav__more-menu');
    if (!button || !menu) return;

    const close = () => {
        more.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
    };

    const open = () => {
        more.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
    };

    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (more.classList.contains('is-open')) close();
        else open();
    });

    document.addEventListener('click', (event) => {
        if (!more.contains(event.target)) close();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    markActiveNav();
    initMoreMenu();
});