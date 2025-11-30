import supabaseClient from '../supabase.js';

document.addEventListener('DOMContentLoaded', function () {
    const app = document.getElementById('app');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    // Show logout confirmation modal
    logoutBtn.addEventListener('click', function () {
        logoutModal.classList.remove('hidden');
        app.classList.add('opacity-50');
    });

    // Hide modal when cancel is clicked
    cancelLogout.addEventListener('click', function () {
        logoutModal.classList.add('hidden');
        app.classList.remove('opacity-50');
    });

    // Handle logout confirmation securely
    confirmLogout.addEventListener('click', async function () {
        // Show loading state
        confirmLogout.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging out...';
        confirmLogout.disabled = true;

        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) throw error;

            setTimeout(() => {
                window.location.href = '../../index.html';

            }, 1000);
        } catch (err) {
            alert('Logout failed: ' + err.message);
            console.error(err);

            // Reset button state
            confirmLogout.innerHTML = 'Yes, Logout';
            confirmLogout.disabled = false;
            logoutModal.classList.add('hidden');
            app.classList.remove('opacity-50');
        }
    });

    // Close modal when clicking outside
    logoutModal.addEventListener('click', function (e) {
        if (e.target === logoutModal) {
            logoutModal.classList.add('hidden');
            app.classList.remove('opacity-50');
        }
    });

    // Load user display name
    async function loadUserName() {
        const { data, error } = await supabaseClient.auth.getUser();

        if (!error && data?.user) {
            const name = data.user.user_metadata?.display_name || "User";

            const usernameElement = document.getElementById("username");
            const nameElement = document.getElementById("name");
            const namepost = document.getElementById("Name_post");

            if (usernameElement) usernameElement.textContent = name;
            if (nameElement) nameElement.textContent = name;
            if (namepost) namepost.textContent = name + "'s Posts";
        } else {
            console.log("User not logged in");
        }
    }

    loadUserName();
});
