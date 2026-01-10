import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';

document.addEventListener('DOMContentLoaded', async () => {
    const alertSystem = new AlertSystem();

    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginLockIcon = document.getElementById('loginLockIcon');
    const loginForm = document.getElementById('loginForm');

    if (!loginForm) return;

    /* ------------------------------
        SANITIZER (prevents XSS)
    ------------------------------ */
    function sanitize(str) {
        return str.replace(/[&<>"'\/]/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        }[match]));
    }

    /* ------------------------------
        PASSWORD SHOW/HIDE
    ------------------------------ */
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

    /* ------------------------------
        SUBMIT LOGIN REQUEST
    ------------------------------ */
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        let loginEmail = loginEmailInput.value.trim();
        const loginPassword = loginPasswordInput.value;

        // Sanitize inputs
        loginEmail = sanitize(loginEmail);

        // Required check
        if (!loginEmail || !loginPassword) {
            alertSystem.show('Please fill out all fields', 'error');
            return;
        }

        // Email format validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
            alertSystem.show('Invalid email format', 'error');
            return;
        }

        // Block script injections
        if (/<|>|script/i.test(loginEmail)) {
            alertSystem.show('Invalid characters detected', 'error');
            return;
        }

        // Password length
        if (loginPassword.length < 8) {
            alertSystem.show('Password must be at least 8 characters', 'error');
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


            const { data: userData } = await supabaseClient.auth.getUser();
            const userId = userData?.user?.id;
            const userName = userData?.user.user_metadata.display_name || "User";

            const { error: upsertError } = await supabaseClient
                .from('profile')
                .upsert({
                    id: userId,
                    name: userName
                });
            if (upsertError) {
                return alertSystem.show('Failed to update profile', 'error');
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
