import supabaseClient from '../supabase.js';

// =======================
// THREE-DOTS MENU
// =======================
export function initEllipsisButtons(showDeleteConfirmation, hideDeleteConfirmation) {
    const ellipsisButtons = document.querySelectorAll('.ellipsis-btn');
    const ellipsisMenuModal = document.getElementById('ellipsisMenuModal');
    const app = document.getElementById('app');
    const closeBtn = document.getElementById('closeEllipsisMenu');
    const deletePostBtn = document.getElementById('deletePostBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    ellipsisButtons.forEach(btn => {
        if (!btn.dataset.bound) {
            btn.dataset.bound = "true";
            btn.addEventListener('click', () => {
                const postId = btn.closest('.post').dataset.postId;
                ellipsisMenuModal.dataset.postId = postId;
                ellipsisMenuModal.classList.remove('hidden');
                app.classList.add('opacity-50');
            });
        }
    });

    closeBtn.onclick = () => {
        ellipsisMenuModal.classList.add('hidden');
        app.classList.remove('opacity-50');
    };

    deletePostBtn.onclick = showDeleteConfirmation;
    cancelDeleteBtn.onclick = hideDeleteConfirmation;
}

// =======================
// SHOW DELETE CONFIRMATION
// =======================
export function showDeleteConfirmation(alertSystem) {
    const ellipsisMenuModal = document.getElementById('ellipsisMenuModal');
    const postId = ellipsisMenuModal.dataset.postId;
    if (!postId) return alertSystem.show('Error: no post selected', 'error');

    const modal = document.getElementById('deleteConfirmationModal');
    const card = modal.querySelector('.delete-card');

    modal.dataset.postId = postId;
    modal.classList.remove('hidden');
    setTimeout(() => card.classList.add('scale-100'));

    ellipsisMenuModal.classList.add('hidden');
}

// =======================
// HIDE DELETE CONFIRMATION
// =======================
export function hideDeleteConfirmation() {
    const modal = document.getElementById('deleteConfirmationModal');
    const card = modal.querySelector('.delete-card');
    card.classList.remove('scale-100');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('app').classList.remove('opacity-50');
    }, 150);
}

// =======================
// DELETE POST PERMANENTLY
// =======================
export function initDeletePermanently(userId, alertSystem) {
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        const modal = document.getElementById('deleteConfirmationModal');
        const postId = modal.dataset.postId;
        const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);

        if (!postEl) return alertSystem.show("Post not found", "error");

        const filePathForStorage = postEl.dataset.filePath;
        const alertId = alertSystem.show('Deleting...', 'info');

        // Check post ownership
        const { data: post, error: fetchError } = await supabaseClient
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .maybeSingle();

        if (fetchError) return alertSystem.show(`Error fetching post: ${fetchError.message}`, 'error');
        if (!post) return alertSystem.show("Post not found", 'error');
        if (post.user_id !== userId) return alertSystem.show("You can't delete this post", 'error');

        // Delete from storage
        const { error } = await supabaseClient
            .storage
            .from('post-media')
            .remove([filePathForStorage]);

        if (error) {
            console.error('Delete failed:', error);
            return alertSystem.show(`Failed to delete file: ${error.message}`, 'error');
        }

        // Delete from database
        const { error: deleteError } = await supabaseClient
            .from('posts')
            .delete()
            .eq('id', postId);

        if (deleteError) return alertSystem.show(`Failed to delete post: ${deleteError.message}`, 'error');

        // Remove from page
        postEl.remove();
        hideDeleteConfirmation();
        alertSystem.show('Post deleted successfully!', 'success');
        alertSystem.hide(alertId);
    });
}