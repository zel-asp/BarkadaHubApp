import supabaseClient from '../supabase.js';

export function initEllipsisButtons(showDeleteConfirmation, hideDeleteConfirmation) {
    console.log('Ellipsis buttons initialized');
}

export function showDeleteConfirmation(alertSystem) {
    const ellipsisMenuModal = document.getElementById('ellipsisMenuModal');
    const postId = ellipsisMenuModal.dataset.postId;

    if (!postId) {
        if (alertSystem) {
            alertSystem.show('Error: no post selected', 'error');
        } else {
            console.error('No post selected for deletion');
        }
        return;
    }

    const modal = document.getElementById('deleteConfirmationModal');
    const card = modal?.querySelector('.delete-card');

    if (!modal || !card) {
        console.error('Delete confirmation modal not found');
        return;
    }

    modal.dataset.postId = postId;
    modal.classList.remove('hidden');

    setTimeout(() => card.classList.add('scale-100'), 10);

    ellipsisMenuModal.classList.add('hidden');

    const app = document.getElementById('app');
    if (app) {
        app.classList.remove('opacity-50');
    }
}

// hide delete confirmation
export function hideDeleteConfirmation() {
    const modal = document.getElementById('deleteConfirmationModal');
    const card = modal?.querySelector('.delete-card');

    if (!modal || !card) {
        console.error('Delete confirmation modal not found');
        return;
    }

    // Remove scale animation
    card.classList.remove('scale-100');

    setTimeout(() => {
        modal.classList.add('hidden');
        delete modal.dataset.postId;

        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('opacity-50');
        }
    }, 150);
}

export function initDeletePermanently(userId, alertSystem) {
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    if (!confirmDeleteBtn) {
        console.error('Confirm delete button not found');
        return;
    }

    const newConfirmDeleteBtn = confirmDeleteBtn.cloneNode(true);
    confirmDeleteBtn.parentNode.replaceChild(newConfirmDeleteBtn, confirmDeleteBtn);

    newConfirmDeleteBtn.addEventListener('click', async () => {
        const modal = document.getElementById('deleteConfirmationModal');
        const postId = modal?.dataset.postId;
        const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);

        if (!postEl) {
            if (alertSystem) {
                alertSystem.show("Post not found", "error");
            } else {
                console.error("Post element not found");
            }
            hideDeleteConfirmation();
            return;
        }

        if (!postId) {
            if (alertSystem) {
                alertSystem.show("Post ID not found", "error");
            } else {
                console.error("Post ID not found");
            }
            hideDeleteConfirmation();
            return;
        }

        const filePathForStorage = postEl.dataset.filePath;

        let alertId = null;
        if (alertSystem) {
            alertId = alertSystem.show('Deleting post...', 'info');
        }

        try {
            const { data: post, error: fetchError } = await supabaseClient
                .from('posts')
                .select('user_id')
                .eq('id', postId)
                .maybeSingle();

            if (fetchError) {
                console.error('Error fetching post:', fetchError);
                if (alertSystem) {
                    alertSystem.show(`Error fetching post: ${fetchError.message}`, 'error');
                }
                hideDeleteConfirmation();
                return;
            }

            if (!post) {
                if (alertSystem) {
                    alertSystem.show("Post not found in database", 'error');
                }
                hideDeleteConfirmation();
                return;
            }

            if (post.user_id !== userId) {
                if (alertSystem) {
                    alertSystem.show("You don't have permission to delete this post", 'error');
                }
                hideDeleteConfirmation();
                return;
            }

            if (filePathForStorage) {
                const { error: storageError } = await supabaseClient
                    .storage
                    .from('post-media')
                    .remove([filePathForStorage]);

                if (storageError) {
                    console.error('Storage deletion failed:', storageError);
                    if (alertSystem) {
                        alertSystem.show(`Warning: Media could not be deleted`, 'warning');
                    }
                }
            }
            const { error: commentsError } = await supabaseClient
                .from('post_comments')
                .delete()
                .eq('post_id', postId);

            if (commentsError) {
                console.error('Error deleting comments:', commentsError);
            }

            // Delete post likes
            const { error: likesError } = await supabaseClient
                .from('post_likes')
                .delete()
                .eq('post_id', postId);

            if (likesError) {
                console.error('Error deleting likes:', likesError);
            }
            const { error: reactionsError } = await supabaseClient
                .from('post_reactions')
                .delete()
                .eq('post_id', postId);

            if (reactionsError) {
                console.error('Error deleting reactions:', reactionsError);
            }
            const { error: deleteError } = await supabaseClient
                .from('posts')
                .delete()
                .eq('id', postId);

            if (deleteError) {
                console.error('Post deletion failed:', deleteError);
                if (alertSystem) {
                    alertSystem.show(`Failed to delete post: ${deleteError.message}`, 'error');
                }
                hideDeleteConfirmation();
                return;
            }

            // Remove post from DOM with fade out animation
            postEl.style.transition = 'opacity 0.3s ease';
            postEl.style.opacity = '0';

            setTimeout(() => {
                postEl.remove();
            }, 300);

            // Hide confirmation modal
            hideDeleteConfirmation();

            // Hide loading indicator
            if (alertId && alertSystem) {
                alertSystem.hide(alertId);
            }

            // Show success message
            if (alertSystem) {
                alertSystem.show('Post deleted successfully!', 'success');
            }

        } catch (err) {
            console.error('Unexpected error during deletion:', err);

            if (alertSystem) {
                alertSystem.show('An unexpected error occurred', 'error');
            }

            // Hide loading indicator
            if (alertId && alertSystem) {
                alertSystem.hide(alertId);
            }
            hideDeleteConfirmation();
        }
    });
}
// Optional: Add keyboard support (Escape key to close)
export function initKeyboardSupport() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('deleteConfirmationModal');
            if (modal && !modal.classList.contains('hidden')) {
                hideDeleteConfirmation();
            }
        }
    });
}