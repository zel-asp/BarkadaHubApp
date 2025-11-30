import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';

document.addEventListener('DOMContentLoaded', () => {
    const alertSystem = new AlertSystem();

    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginLockIcon = document.getElementById('loginLockIcon');
    const loginForm = document.getElementById('loginForm');

    if (!loginForm) return;

    function showPassword() {
        if (!loginPasswordInput || !loginLockIcon) return;

        loginLockIcon.addEventListener("click", () => {
            const isHidden = loginPasswordInput.type === "password";

            loginPasswordInput.type = isHidden ? "text" : "password";

            loginLockIcon.classList.toggle("fa-lock", !isHidden);
            loginLockIcon.classList.toggle("fa-unlock", isHidden);
        });
    }

    showPassword();

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const loginEmail = loginEmailInput.value.trim();
        const loginPassword = loginPasswordInput.value;

        // Empty check
        if (!loginEmail || !loginPassword) {
            alertSystem.show('Please fill out all fields', 'error');
            return;
        }

        // Password length check
        if (loginPassword.length < 6) {
            alertSystem.show('Password must have at least 6 characters', 'error');
            return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword
            });

            if (error) {
                alertSystem.show(`Login failed: ${error.message}`, 'error');
                console.error('Login error:', error.message);
                return;
            }

            alertSystem.show('Login successful', 'success', 1500);

            setTimeout(() => {
                window.location.href = 'src/html/profile.html';
            }, 1500);

        } catch (err) {
            console.error('Unexpected error:', err);
            alertSystem.show('An unexpected error occurred. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
});
