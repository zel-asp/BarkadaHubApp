import { timeout } from "../functions.js";

document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('authModal');
    const openModalBtn = document.getElementById('openModal');
    const brand = document.getElementById('brand');
    const slogan = document.getElementById('slogan');
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    const loginSwitchLink = document.getElementById('loginSwitchLink');
    const signupSwitchLink = document.getElementById('signupSwitchLink');
    const closeModalBtn = document.querySelectorAll('.close-modal');

    // Open modal
    openModalBtn.addEventListener('click', function () {
        modal.classList.remove('hidden');
        modal.classList.add('active', 'flex');
        setTimeout(() => {
            brand.classList.add('-translate-y-50');
            brand.classList.remove('translate-y-0');
            slogan.classList.add('hidden');
        }, 100);

    });

    // Close modal for both login and signup
    closeModalBtn.forEach(btn => {
        btn.classList.add('cursor-pointer');
        btn.addEventListener('click', function () {
            timeout(modal, brand, slogan);
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (e) {
        if (e.target === modal) {
            timeout(modal, brand, slogan);
        }
    });

    // Switch to Login Form
    loginSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();

        signupContainer.classList.remove('hidden');
        loginContainer.classList.add('hidden');

    });

    signupSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();

        signupContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

});

