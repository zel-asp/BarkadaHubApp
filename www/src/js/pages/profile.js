import supabaseClient from '../supabase.js';
import { lost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
import { displayBio, displayInformation } from '../render/profile.js'

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    const alertSystem = new AlertSystem();
    /* -------------------------------------------
        LOGOUT MODAL CONTROL
    ------------------------------------------- */

    const openModal = () => {
        logoutModal.classList.remove('hidden');
        app.classList.add('opacity-50');
    };

    const closeModal = () => {
        logoutModal.classList.add('hidden');
        app.classList.remove('opacity-50');
    };

    logoutBtn.addEventListener('click', openModal);
    cancelLogout.addEventListener('click', closeModal);

    logoutModal.addEventListener('click', e => {
        if (e.target === logoutModal) closeModal();
    });

    /* -------------------------------------------
        LOGOUT HANDLING
    ------------------------------------------- */

    confirmLogout.addEventListener('click', async () => {
        confirmLogout.innerHTML = `
            <i class="fas fa-spinner fa-spin mr-2"></i> Logging out...
        `;
        confirmLogout.disabled = true;

        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;

            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 1000);

        } catch (err) {
            console.error(err);
            alert('Logout failed: ' + err.message);

            // reset button
            confirmLogout.innerHTML = 'Yes, Logout';
            confirmLogout.disabled = false;

            closeModal();
        }
    });

    /* -------------------------------------------
        LOAD USER NAME
    ------------------------------------------- */

    async function loadUserName() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error || !data?.user) {
            console.log("User not logged in");
            return;
        }

        const name = data.user.user_metadata?.display_name || "User";

        const elements = {
            username: document.getElementById("username"),
            name: document.getElementById("name"),
            namepost: document.getElementById("Name_post")
        };

        if (elements.username) elements.username.textContent = name;
        if (elements.name) elements.name.textContent = name;
        if (elements.namepost) elements.namepost.textContent = `${name}'s Posts`;
    }

    loadUserName();


    async function renderBio() {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) return;


        const userId = user.id;
        const userName = user.user_metadata.display_name;
        const userEmail = user.email;

        const { data, error } = await supabaseClient
            .from('profile')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            document.getElementById('userAvatar').src = '../images/defaultAvatar.jpg';
            alertSystem.show('No data found, edit your profile now!', 'info');
            return;
        }

        const nullData = "No information available";

        const bioText = data?.about_me || nullData;
        const name = userName || nullData;
        const email = userEmail || nullData;
        const major = data?.major || nullData;
        const year_level = data?.year_level || nullData;
        document.getElementById('userAvatar').src =
            data?.avatar_url || '../images/defaultAvatar.jpg';
        document.getElementById('displayBio').innerHTML = displayBio(bioText);
        document.getElementById('location').innerHTML = data?.location || '';
        document.getElementById('PersonalInfo').innerHTML = displayInformation(name, email, major, year_level);
    }
    renderBio();
});
