import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import students from '../data/students.js';
import sanitize from '../utils/sanitize.js';

document.addEventListener('DOMContentLoaded', async () => {

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

    const studentNumberInput = document.getElementById('studentNumber');
    const feedback = document.getElementById('feedback');
    const studentNumberInputContainer = document.getElementById('studentNumberInputContainer');

    const alertSystem = new AlertSystem();

    let isVerified = false;
    let studentId = null;
    let studentName = null;

    // update @username preview
    function updateUserAt(name) {
        userAt.innerHTML = `@${name.trim().toLowerCase().replace(/\s/g, '')}`;
    }

    // update bio character counter
    function updateCharCount() {
        const remaining = 500 - (bioTextarea?.value.length || 0);
        charCount.textContent = remaining;

        charCount.classList.toggle('text-red-500', remaining < 50);
        charCount.classList.toggle('text-gray-500', remaining >= 50);
    }

    // preview avatar before upload
    function handleAvatarPreview() {
        avatarUpload?.addEventListener('change', e => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = evt => (avatarPreview.src = evt.target.result);
            reader.readAsDataURL(file);
        });
    }

    // verify student id from local list
    function verifyStudentNumber() {
        studentNumberInput.addEventListener('input', () => {

            const studentNumberFromUser = studentNumberInput.value.trim();

            const studentVerified = students.find(student =>
                student.id === studentNumberFromUser
            );

            if (!studentVerified) {
                studentNumberInputContainer.classList.add('ring-1', 'ring-orange-500');
                studentNumberInputContainer.classList.remove('ring-green-500');

                feedback.classList.remove('hidden');
                feedback.innerHTML = `
                    <i class="fas fa-exclamation-circle text-orange-500"></i>
                    <span class="text-orange-600">Not found</span>
                `;

                isVerified = false;
                studentId = null;
                studentName = null;

            } else {
                studentNumberInputContainer.classList.add('ring-1', 'ring-green-500');
                studentNumberInputContainer.classList.remove('ring-orange-500');

                feedback.classList.remove('hidden');
                feedback.innerHTML = `
                    <i class="fas fa-check-circle text-green-500"></i>
                    <span class="text-green-600">${studentVerified.name}</span>
                `;

                isVerified = true;
                studentId = studentVerified.id;
                studentName = studentVerified.name;
            }
        });
    }

    // update friend avatar in messages table
    async function updateFriendAvatarInMessages(userId, newAvatarUrl, newName) {
        try {
            const { error } = await supabaseClient
                .from('message')
                .update({
                    friend_avatar: newAvatarUrl,
                    friend_name: newName || undefined
                })
                .eq('friends_id', userId);

            if (error) {
                console.error(error);
                return false;
            }

            return true;

        } catch (error) {
            console.error(error);
            return false;
        }
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return alertSystem.show('User not logged in', 'error');
    }

    const userId = user.id;
    const metaName = user.user_metadata?.display_name || "";

    emailInput.value = user.email;
    fullNameInput.value = metaName || "User";

    updateUserAt(fullNameInput.value);


    /* -----------------------------
    load profile from database
    ----------------------------- */
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
        studentNumberInput.value = profile.student_id || '';

        if (profile.avatar_url) {
            avatarPreview.src = profile.avatar_url;
        }

        updateUserAt(fullNameInput.value);
    }


    /* -----------------------------
    save profile
    ----------------------------- */
    async function saveProfile() {

        let fullName = fullNameInput.value.trim();
        let location = locationInput.value;
        const major = majorSelect.value;
        const yearLevel = yearLevelSelect.value;
        const bio = bioTextarea.value.trim();
        const avatarFile = avatarUpload.files?.[0];
        let studentNumberFromUser = null;

        fullName = sanitize(fullName || '');
        location = sanitize(location || '');
        bio = sanitize(bio || '');

        if (isVerified) {
            studentNumberFromUser = studentNumberInput.value.trim();
            studentNumberFromUser = sanitize(studentNumberFromUser || '');
        }

        const { data: student, error: studentError } = await supabaseClient
            .from('profile')
            .select('student_id')
            .eq('student_id', studentNumberFromUser)
            .maybeSingle();

        if (studentError && studentError.code !== 'PGRST116') {
            console.error(studentError);
            alertSystem.show('Failed to load profile', 'error');
        }

        if (student) {
            return alertSystem.show('Student Number already in use', 'error');
        }

        let avatarUrl = profile?.avatar_url ?? '../images/defaultAvatar.jpg';

        // update auth metadata
        await supabaseClient.auth.updateUser({
            data: { display_name: fullName }
        });

        // upload avatar if changed
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

            avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
        }

        // upsert profile row
        const { error: upsertError } = await supabaseClient
            .from('profile')
            .upsert({
                id: userId,
                name: fullName,
                major,
                location,
                year_level: yearLevel,
                about_me: bio,
                avatar_url: avatarUrl,
                student_id: studentNumberFromUser,
                student_verified: isVerified,
                student_name_official: studentName
            });

        if (upsertError) {
            return alertSystem.show('Failed to update profile', 'error');
        }

        await updateFriendAvatarInMessages(userId, avatarUrl, fullName);

        avatarPreview.src = avatarUrl;
        updateUserAt(fullName);

        alertSystem.show('Profile updated successfully', 'success');
    }


    /* -----------------------------
    form submit handler
    ----------------------------- */
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

    handleAvatarPreview();
    verifyStudentNumber();
    bioTextarea?.addEventListener('input', updateCharCount);
    updateCharCount();

});
