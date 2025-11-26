export function timeout(modal, brand, slogan) {
    modal.classList.remove('active');

    setTimeout(() => {
        modal.classList.add('hidden');
        brand.classList.remove('-translate-y-50', 'transition-transform', 'duration-900');
        brand.classList.add('translate-y-50', 'transition-transform', 'duration-900');
        slogan.classList.remove('hidden');
    }, 300);
}

