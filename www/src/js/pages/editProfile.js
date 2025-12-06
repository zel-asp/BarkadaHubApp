import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';

document.addEventListener('DOMContentLoaded', async () => {
    /* -------------------------------------------
        CACHED DOM ELEMENTS
    ------------------------------------------- */
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarPreview = document.getElementById('avatar-preview');
    const bioTextarea = document.getElementById('bio');
    const charCount = document.getElementById('char-count');
    const fullNameInput = document.getElementById('fullName');
    const majorSelect = document.getElementById('major');
    const yearLevelSelect = document.getElementById('yearLevel');
    const form = document.querySelector('form');

    const alertSystem = new AlertSystem();

    /* -------------------------------------------
        LOAD EXISTING PROFILE
    ------------------------------------------- */
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return alertSystem.show('User not logged in', 'error');

    const userId = user.id;

    const { data: profile, error: profileError } = await supabaseClient
        .from('profile')
        .select('*')
        .eq('id', userId)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error(profileError);
        alertSystem.show('Failed to load profile', 'error');
    }

    if (profile) {
        fullNameInput.value = profile.name || '';
        bioTextarea.value = profile.about_me || '';
        majorSelect.value = profile.major || '';
        yearLevelSelect.value = profile.year_level || '';
        if (profile.avatar_url) avatarPreview.src = profile.avatar_url;
    }

    /* -------------------------------------------
        AVATAR PREVIEW ON FILE SELECT
    ------------------------------------------- */
    avatarUpload?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = evt => avatarPreview.src = evt.target.result;
        reader.readAsDataURL(file);
    });

    /* -------------------------------------------
        BIO CHARACTER COUNTER
    ------------------------------------------- */
    function updateCharCount() {
        const remaining = 500 - (bioTextarea?.value.length || 0);
        charCount.textContent = remaining;
        charCount.classList.toggle('text-red-500', remaining < 50);
        charCount.classList.toggle('text-gray-500', remaining >= 50);
    }
    bioTextarea?.addEventListener('input', updateCharCount);
    updateCharCount();

    /* -------------------------------------------
        FORM SUBMIT
    ------------------------------------------- */
    form?.addEventListener('submit', async e => {
        e.preventDefault();
        await insertProfileInfo();
    });

    /* -------------------------------------------
        INSERT / UPSERT PROFILE
    ------------------------------------------- */
    async function insertProfileInfo() {
        const fullName = fullNameInput.value.trim();
        const major = majorSelect.value;
        const yearLevel = yearLevelSelect.value;
        const bio = bioTextarea.value.trim();
        const avatarFile = avatarUpload.files?.[0];

        let avatarUrl = profile?.avatar_url || null;

        const { error: authError } = await supabaseClient.auth.updateUser({
            data: { display_name: fullName }
        });
        if (authError) console.error('Auth update error:', authError.message);

        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${userId}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            const { data: uploaded, error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(filePath, avatarFile, {
                    upsert: true,
                    metadata: {
                        user_id: userId   // IMPORTANT
                    }
                });

            if (uploadError) {
                console.error("Avatar upload error:", uploadError);
                alertSystem.show("Avatar upload failed", "error");
                return;
            }

            const { data: urlData } = supabaseClient
                .storage
                .from('avatars')
                .getPublicUrl(filePath);

            avatarUrl = urlData.publicUrl;
        }


        const { error: upsertError } = await supabaseClient
            .from('profile')
            .upsert({
                id: userId,
                name: fullName,
                major,
                year_level: yearLevel,
                about_me: bio,
                avatar_url: avatarUrl
            });

        if (upsertError) {
            console.error('Profile upsert error:', upsertError.message);
            alertSystem.show('Failed to update profile', 'error');
        } else {
            alertSystem.show('Profile updated successfully', 'success');
            if (avatarUrl) avatarPreview.src = avatarUrl;
        }
    }
});
