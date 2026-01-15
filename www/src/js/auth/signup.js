import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const lockIcons = document.querySelectorAll('.lockIcon');
    const alertSystem = new AlertSystem();

    /* ------------------------------------
        SECURE INPUT SANITIZER
    ------------------------------------ */
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

    /* ------------------------------------
        PASSWORD SHOW/HIDE
    ------------------------------------ */
    lockIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const input = icon.previousElementSibling;
            if (!input) return;

            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';

            icon.classList.toggle('fa-lock', !isHidden);
            icon.classList.toggle('fa-unlock', isHidden);
        });
    });

    /* ------------------------------------
        SIGNUP EVENT
    ------------------------------------ */
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Raw inputs
        let signupName = document.getElementById('signupName').value.trim();
        let signupEmail = document.getElementById('signupEmail').value.trim();
        const signupPassword = document.getElementById('signupPassword');
        const signupConfirmPassword = document.getElementById('signupConfirmPassword');

        const password = signupPassword.value;
        const confirmPassword = signupConfirmPassword.value;

        // Sanitize to prevent XSS
        signupName = sanitize(signupName);
        signupEmail = sanitize(signupEmail);

        /* ------------------------------------
            VALIDATION
        ------------------------------------ */

        // Required fields
        if (!signupName || !signupEmail || !password || !confirmPassword) {
            alertSystem.show('Please fill out all fields', 'error');
            return;
        }

        /* ------------------------------------
CHECK IF EMAIL EXISTS IN PROFILE
------------------------------------ */
        const sanitizedEmail = sanitize(signupEmail).toLowerCase();

        const { data: existingUser, error: emailError } = await supabaseClient
            .from('profile')
            .select('email')
            .ilike('email', sanitizedEmail)
            .maybeSingle();


        if (emailError) {
            alertSystem.show('Server error. Please try again.', 'error');
            return;
        }

        if (existingUser) {
            alertSystem.show('Email is already registered.', 'error');
            return;
        }

        // Name must contain letters & spaces only
        if (!/^[a-zA-Z\s]+$/.test(signupName)) {
            alertSystem.show('Name contains invalid characters', 'error');
            return;
        }

        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
            alertSystem.show('Invalid email format', 'error');
            return;
        }

        // Prevent script injection
        if (/<|>|script/i.test(signupName) || /<|>|script/i.test(signupEmail)) {
            alertSystem.show('Invalid characters detected', 'error');
            return;
        }

        // Password length
        if (password.length < 8) {
            alertSystem.show('Password must be at least 8 characters long', 'error');
            return;
        }

        // Password match
        if (password !== confirmPassword) {
            alertSystem.show("Passwords don't match", 'error');
            return;
        }

        /* ------------------------------------
            SUPABASE SIGNUP
        ------------------------------------ */
        const { data, error } = await supabaseClient.auth.signUp({
            email: signupEmail,
            password: password,
            options: {
                data: {
                    display_name: signupName
                }
            }
        });

        if (error) {
            console.error(error);
            alertSystem.show(`Error creating user: ${error.message}`, 'error');
        } else {
            alertSystem.show(
                'Account created successfully! Check your email to verify your account.',
                'success'
            );
            signupForm.reset();
        }
    });
});
