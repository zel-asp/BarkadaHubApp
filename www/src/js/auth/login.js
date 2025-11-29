import supabaseClient from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const loginEmail = document.getElementById('loginEmail').value.trim();
        const loginPassword = document.getElementById('loginPassword').value;

        if (!loginEmail || !loginPassword) {
            alert('Please fill out all fields');
            return;
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword
            });

            if (error) {
                console.error('Login error:', error.message);
                alert(`Login failed: ${error.message}`);
                return;
            }

            console.log('Login successful:', data);
            alert('Login successful!');
            window.location.href = 'src/html/profile.html';

        } catch (err) {
            console.error('Unexpected error:', err);
            alert('An unexpected error occurred. Please try again.');
        }
    });
});
