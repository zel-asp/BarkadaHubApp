import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';


document.addEventListener('DOMContentLoaded', async function () {
    const alertSystem = new AlertSystem();

    const { data, error } = await supabaseClient.auth.getUser(); // await here

    if (error || !data?.user) {

        alertSystem.show("You must be logged in.", 'error');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 1500);
        return;
    }

});