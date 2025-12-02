
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

export async function checkConnection() {
    try {

        await fetch('https://www.gstatic.com/generate_204', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store'
        });

        return true;
    } catch (error) {
        return false;
    }
}