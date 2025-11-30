
export function timeout(modal, brand, slogan) {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');

        brand.classList.remove('-translate-y-50');
        brand.classList.add('translate-y-0');
        slogan.classList.remove('hidden');
        slogan.classList.add('block');
    }, 300);
}