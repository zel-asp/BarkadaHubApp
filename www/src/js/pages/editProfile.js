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
    const emailInput = document.getElementById('email');
    const locationInput = document.getElementById('location');
    const userAt = document.getElementById('userAt');

    const alertSystem = new AlertSystem();

    /* -------------------------------------------
        LOAD USER AUTH INFO
    ------------------------------------------- */
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return alertSystem.show('User not logged in', 'error');

    const userId = user.id;
    const metaName = user.user_metadata?.display_name || "";

    emailInput.value = user.email;
    fullNameInput.value = metaName || "User";

    // generate @username
    function updateUserAt(name) {
        userAt.innerHTML = `@${name.trim().toLowerCase().replace(/\s/g, '')}`;
    }
    updateUserAt(fullNameInput.value);

    /* -------------------------------------------
        LOAD PROFILE FROM DATABASE
    ------------------------------------------- */
    const { data: profile, error: profileError } = await supabaseClient
        .from('profile')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error(profileError);
        alertSystem.show('Failed to load profile', 'error');
    }

    if (profile) {
        fullNameInput.value = profile.name || fullNameInput.value;
        bioTextarea.value = profile.about_me || '';
        majorSelect.value = profile.major || '';
        locationInput.value = profile.location || '';
        yearLevelSelect.value = profile.year_level || '';

        if (profile.avatar_url) {
            avatarPreview.src = profile.avatar_url;
        }

        updateUserAt(fullNameInput.value);
    }

    /* -------------------------------------------
        AVATAR PREVIEW
    ------------------------------------------- */
    avatarUpload?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = evt => (avatarPreview.src = evt.target.result);
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
        FUNCTION TO UPDATE FRIEND AVATAR IN MESSAGES
    ------------------------------------------- */
    async function updateFriendAvatarInMessages(userId, newAvatarUrl, newName) {
        try {
            console.log('Updating friend avatar in messages for user:', userId);

            // Update messages where this user is the friend
            const { error: updateError } = await supabaseClient
                .from('message')
                .update({
                    friend_avatar: newAvatarUrl,
                    friend_name: newName || undefined // Only update name if provided
                })
                .eq('friends_id', userId); // Where this user is the friend

            if (updateError) {
                console.error('Error updating friend avatar in messages:', updateError);
                return false;
            }

            console.log('Successfully updated friend avatar in messages');
            return true;
        } catch (error) {
            console.error('Failed to update friend avatar in messages:', error);
            return false;
        }
    }

    /* -------------------------------------------
        SAVE PROFILE
    ------------------------------------------- */
    form?.addEventListener('submit', async e => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        try {
            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Saving...';
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

            await saveProfile();

            submitBtn.textContent = 'Saved!';
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');

            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 2000);

        } catch (err) {
            console.error(err);

            submitBtn.disabled = false;
            submitBtn.textContent = 'Save';
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            alertSystem.show('Failed to save profile.', 'error');
        }
    });


    async function saveProfile() {
        const fullName = fullNameInput.value.trim();
        const location = locationInput.value;
        const major = majorSelect.value;
        const yearLevel = yearLevelSelect.value;
        const bio = bioTextarea.value.trim();
        const avatarFile = avatarUpload.files?.[0];

        let avatarUrl = profile?.avatar_url ?? '../images/defaultAvatar.jpg';

        /* Update Auth Metadata */
        await supabaseClient.auth.updateUser({
            data: { display_name: fullName }
        });

        /* Upload Avatar if New */
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${userId}/avatar.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(filePath, avatarFile, { upsert: true });

            if (uploadError) {
                alertSystem.show("Avatar upload failed", "error");
                return;
            }

            const { data: urlData } = supabaseClient
                .storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Add cache-buster
            avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
        }

        /* Upsert Profile Row */
        const { error: upsertError } = await supabaseClient
            .from('profile')
            .upsert({
                id: userId,
                name: fullName,
                major,
                location,
                year_level: yearLevel,
                about_me: bio,
                avatar_url: avatarUrl
            });

        if (upsertError) {
            return alertSystem.show('Failed to update profile', 'error');
        }

        await updateFriendAvatarInMessages(userId, avatarUrl, fullName);

        // Update preview
        avatarPreview.src = `${avatarUrl}`;
        updateUserAt(fullName);

        alertSystem.show('Profile updated successfully', 'success');
    }

    /* -------------------------------------------
        REALTIME UPDATES (Optional - for when others update)
    ------------------------------------------- */
    // This is optional - it will update the UI when other users update their profile
    supabaseClient
        .channel('profile-updates')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profile', filter: `id=neq.${userId}` },
            async (payload) => {
                const friendId = payload.new.id;

                const { data: existingMessage } = await supabaseClient
                    .from('message')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('friends_id', friendId)
                    .maybeSingle();

                if (existingMessage) {
                    await supabaseClient
                        .from('message')
                        .update({
                            friend_avatar: payload.new.avatar_url,
                            friend_name: payload.new.name
                        })
                        .eq('user_id', userId)
                        .eq('friends_id', friendId);
                }
            }
        )
        .subscribe();

});