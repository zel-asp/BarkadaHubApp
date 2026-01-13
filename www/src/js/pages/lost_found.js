import supabaseClient from '../supabase.js';
import { lost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';

document.addEventListener('DOMContentLoaded', async () => {
    const alertSystem = new AlertSystem();

    // Get logged-in user
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;

    // ELEMENTS
    const openUploadFormBtn = document.getElementById('openUploadForm');
    const uploadModal = document.getElementById('uploadModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const lostFoundForm = document.getElementById('lostFoundForm');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const lostFoundContainer = document.getElementById('lostFoundContainer');

    const displayedItemIds = new Set(); // Track rendered items

    /* ------------------------------
    MODAL OPEN/CLOSE
    ------------------------------ */
    const closeModal = () => {
        uploadModal.classList.add('hidden');
        lostFoundForm.reset();
        imagePreview.classList.add('hidden');
    };

    openUploadFormBtn.addEventListener('click', () => uploadModal.classList.remove('hidden'));
    cancelBtn.addEventListener('click', closeModal);
    uploadModal.addEventListener('click', e => { if (e.target === uploadModal) closeModal(); });

    /* ------------------------------
    IMAGE PREVIEW
    ------------------------------ */
    imageUpload.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    /* ------------------------------
    SUBMIT LOST & FOUND REPORT
    ------------------------------ */
    lostFoundForm.addEventListener('submit', async e => {
        e.preventDefault();

        const itemType = document.querySelector('input[name="itemType"]:checked')?.value;
        const itemName = document.getElementById('itemName').value.trim();
        const category = document.getElementById('category').value.trim();
        const description = document.getElementById('description').value.trim();
        const location = document.getElementById('location').value.trim();
        const file = imageUpload.files[0];

        let filePath = null;

        if (file) {
            const ext = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${ext}`;
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('lost_found')
                .upload(fileName, file);

            if (uploadError) return alertSystem.show("Failed to upload image!", 'error');
            filePath = uploadData.path;
        }

        // Insert new lost & found record
        const { data: insertedData, error: insertError } = await supabaseClient
            .from('lost_found')
            .insert([{
                item_type: itemType,
                item_name: itemName,
                category,
                description,
                location,
                auth_id: userId,
                file_name: filePath,
                created_at: new Date()
            }])
            .select();

        if (insertError) return alertSystem.show("Failed to submit report!", 'error');

        alertSystem.show("Report submitted successfully!", 'success');
        closeModal();
        renderLostFoundSingle(insertedData[0], true);
    });

    /* ------------------------------
    RENDER FUNCTIONS
    ------------------------------ */
    async function renderLostFound() {
        try {
            const { data: items, error } = await supabaseClient
                .from('lost_found')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!items) return;

            lostFoundContainer.innerHTML = '';
            items.forEach(item => renderLostFoundSingle(item));
        } catch (err) {
            console.error("Failed to render lost & found:", err);
        }
    }

    async function renderLostFoundSingle(item, prepend = false) {
        if (displayedItemIds.has(item.id)) return;

        let fileUrl = '';
        if (item.file_name) {
            const { data: storageData } = supabaseClient
                .storage
                .from('lost_found')
                .getPublicUrl(item.file_name);
            fileUrl = storageData.publicUrl;
        }

        const datePosted = new Date(item.created_at).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        let messageAdded = false;

        if (item.auth_id !== userId) {
            const { data: existingMessage } = await supabaseClient
                .from('message')
                .select('id')
                .eq('user_id', userId)
                .eq('friends_id', item.auth_id)
                .maybeSingle();

            // ✅ Fix: true only if a message actually exists
            messageAdded = !!existingMessage;
        }

        const postHtml = lost_found(
            fileUrl,
            item.item_type,
            item.item_name,
            item.description,
            item.location,
            datePosted,
            item.auth_id === userId,
            item.auth_id,
            item.file_name,
            item.id,
            messageAdded
        );

        lostFoundContainer.insertAdjacentHTML(prepend ? "afterbegin" : "beforeend", postHtml);
        displayedItemIds.add(item.id);
    }


    document.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;

        const postId = deleteBtn.dataset.postId;

        const card = deleteBtn.closest('[data-post-id]');
        const filePath = card?.dataset.filePath;

        if (!postId) {
            alertSystem.show('This post is not found', 'error');
            return;
        }

        // deleting UI effect
        const originalHTML = deleteBtn.innerHTML;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Deleting...`;

        try {
            await destroy(postId, filePath);
            card.remove();
        } catch (err) {
            alertSystem.show(err.message, 'error');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalHTML;
        }
    });


    async function destroy(postId, filePath) {

        if (filePath) {
            const { error: storageError } = await supabaseClient
                .storage
                .from('lost_found')
                .remove([filePath]);

            if (storageError) {
                throw new Error('Storage delete failed: ' + storageError.message);
            }
        }

        const { error: deleteError } = await supabaseClient
            .from('lost_found')
            .delete()
            .eq('id', postId);

        if (deleteError) {
            throw new Error('Post delete failed: ' + deleteError.message);
        }

        alertSystem.show('Post deleted successfully', 'success');
    }

    document.addEventListener('click', async (e) => {
        const msgBtn = e.target.closest('.message-btn');
        if (!msgBtn) return;

        const friendId = msgBtn.dataset.userId;
        const postId = msgBtn.dataset.postId;
        const messageAdded = msgBtn.dataset.messageAdded === 'true';

        // If already has message → just go
        if (messageAdded) {
            window.location.href = `./messages.html`;
            return;
        }

        // First time message
        e.preventDefault();

        try {
            await addToMessageTable(friendId, postId);

            msgBtn.dataset.messageAdded = 'true';
            msgBtn.innerHTML = `
            <i class="fas fa-comments"></i>
            Go to Message
        `;
            msgBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            msgBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');

            window.location.href = `./messages.html`;

        } catch (err) {
            console.error(err.message);
        }
    });


    async function addToMessageTable(friendId, postId) {
        /* -----------------------------------------
        AUTH USER
        ----------------------------------------- */
        const { data: userData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !userData?.user) {
            console.error('Auth error:', authError);
            return;
        }

        const myUserId = userData.user.id;
        const myName = userData.user.user_metadata?.display_name || 'User';

        /* -----------------------------------------
        FETCH BOTH PROFILES IN ONE QUERY
        ----------------------------------------- */
        const { data: profiles, error: profileError } = await supabaseClient
            .from('profile')
            .select('id, name, avatar_url')
            .in('id', [myUserId, friendId]);

        if (profileError) {
            console.warn('Profile fetch issue, using defaults');
        }

        const friendProfile = profiles?.find(p => p.id === friendId);
        const myProfile = profiles?.find(p => p.id === myUserId);

        const friendName = friendProfile?.name || 'User';
        const friendAvatar = friendProfile?.avatar_url || '../images/defaultAvatar.jpg';
        const myAvatar = myProfile?.avatar_url || '../images/defaultAvatar.jpg';

        /* -----------------------------------------
        GET LOST & FOUND POST
        ----------------------------------------- */
        const { data: lostFound, error: lostError } = await supabaseClient
            .from('lost_found')
            .select('item_name')
            .eq('id', postId)
            .maybeSingle();

        if (lostError || !lostFound) {
            console.error('Lost & Found post not found');
            return;
        }

        const itemName = lostFound.item_name || 'an item';

        const { data: conversation, error: convError } = await supabaseClient
            .from('conversations')
            .insert({ type: 'friend' })
            .select('id')
            .single();

        if (convError) throw convError;
        const conversationId = conversation.id;

        /* -----------------------------------------
        PREPARE MESSAGES
        ----------------------------------------- */
        const messages = [
            {
                user_id: myUserId,
                friends_id: friendId,
                friend_name: friendName,
                friend_avatar: friendAvatar,
                relation: 'lost & found',
                latest_message: `Message about item '${itemName}'`,
                conversation_id: conversationId
            },
            {
                user_id: friendId,
                friends_id: myUserId,
                friend_name: myName,
                friend_avatar: myAvatar,
                relation: 'lost & found',
                latest_message: `You have a message about item '${itemName}'`,
                conversation_id: conversationId
            }
        ];

        /* -----------------------------------------
        INSERT BOTH ROWS AT ONCE
        ----------------------------------------- */
        const { error: insertError } = await supabaseClient
            .from('message')
            .insert(messages);

        if (insertError && insertError.code !== '23505') {
            console.error('Message insert error:', insertError);
        }
    }


    /* ------------------------------
    INITIAL LOAD
    ------------------------------ */
    renderLostFound();
});
