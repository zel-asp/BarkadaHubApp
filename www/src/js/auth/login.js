import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import sanitize from '../utils/sanitize.js';


console.log(sanitize);

document.addEventListener('DOMContentLoaded', async () => {

    const alertSystem = new AlertSystem();

    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginLockIcon = document.getElementById('loginLockIcon');
    const loginForm = document.getElementById('loginForm');

    if (!loginForm) return;

    // toggle password visibility
    function initPasswordToggle() {
        if (!loginPasswordInput || !loginLockIcon) return;

        loginLockIcon.addEventListener('click', () => {

            const isHidden = loginPasswordInput.type === 'password';

            loginPasswordInput.type = isHidden ? 'text' : 'password';

            loginLockIcon.classList.toggle('fa-lock', !isHidden);
            loginLockIcon.classList.toggle('fa-unlock', isHidden);
        });
    }

    // validate login inputs
    function validateInputs(email, password) {

        if (!email || !password) {
            alertSystem.show('Please fill out all fields', 'error');
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alertSystem.show('Invalid email format', 'error');
            return false;
        }

        if (/<|>|script/i.test(email)) {
            alertSystem.show('Invalid characters detected', 'error');
            return false;
        }

        if (password.length < 8) {
            alertSystem.show('Password must be at least 8 characters', 'error');
            return false;
        }

        return true;
    }


    loginForm.addEventListener('submit', async (event) => {

        event.preventDefault();

        let loginEmail = loginEmailInput.value.trim();
        const loginPassword = loginPasswordInput.value;

        // sanitize email
        loginEmail = sanitize(loginEmail);

        // validate inputs
        if (!validateInputs(loginEmail, loginPassword)) return;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        // disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword
            });

            if (error) {
                alertSystem.show(`Login failed: ${error.message}`, 'error');
                return;
            }

            // get logged in user
            const { data: userData } = await supabaseClient.auth.getUser();

            const userId = userData?.user?.id;
            const email = userData?.user?.email;
            const userName = userData?.user?.user_metadata.display_name || "User";
            const userEmail = userData?.user?.user_metadata.email || "User";

            // log user activity
            await supabaseClient.from('user_activity').insert({
                user_id: data.user.id,
                action: 'login',
                description: 'User login',
                ip_address: window.location.hostname,
                user_agent: navigator.userAgent,
                user_name: userName,
                user_email: userEmail
            });

            // get existing profile info
            const { data: existingProfile } = await supabaseClient
                .from('profile')
                .select('student_id, student_verified, student_name_official')
                .eq('id', userId)
                .maybeSingle();

            // upsert profile
            await supabaseClient
                .from('profile')
                .upsert({
                    id: userId,
                    name: userName,
                    email: email,
                    student_id: existingProfile?.student_id || null,
                    student_verified: existingProfile?.student_verified || false,
                    student_name_official: existingProfile?.student_name_official || null
                }, { onConflict: 'id' });

            // show success
            alertSystem.show('Login successful', 'success', 1500);

            setTimeout(() => {
                window.location.href = 'src/html/profile.html';
            }, 1500);

        } catch (err) {

            console.error('Unexpected error:', err);
            alertSystem.show('Login Failed, please try again', 'error');

        } finally {

            // re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });


    /* -----------------------------
    initialize
    ----------------------------- */
    initPasswordToggle();

});
