import supabaseClient from '../supabase.js';
import comments, { emptyComments } from '../render/comments.js';
import { formatRelativeTime } from './postUtils.js';
import { commentPost } from '../pages/notification.js';
import sanitize from './sanitize.js';

// =======================
// COMMENTS MODAL
// =======================
export function initCommentsModal(alertSystem, bannedWords = [], currentUserId) {
    const commentModal = document.getElementById('commentModal');
    const commentBackBtn = document.getElementById('commentBackBtn');
    const app = document.getElementById('app');
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');
    const charCounter = document.querySelector('#charCounter');
    const sendBtn = document.getElementById('sendBtn');

    let savedScrollY = 0;
    let currentPostId = null;

    commentBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        commentModal.classList.add('hidden');
        app.classList.remove('hidden');
        window.scrollTo(0, savedScrollY);
    });

    document.addEventListener('click', async (e) => {
        const button = e.target.closest('.commentBtn');
        if (!button) return;

        currentPostId = button.dataset.postId?.trim();
        if (!currentPostId) return alertSystem.show('No postId found!', 'error');

        savedScrollY = window.scrollY;
        await loadComments(currentPostId, currentUserId);

        commentModal.classList.remove('hidden');
        app.classList.add('hidden');

        // Focus on comment input
        setTimeout(() => {
            if (commentInput) {
                commentInput.focus();
            }
        }, 300);
    });

    // Contenteditable input handling
    if (commentInput) {
        commentInput.addEventListener('input', () => {
            const commentText = commentInput.innerText || '';
            const commentLength = commentText.length;

            if (commentLength > 250) {
                commentInput.innerText = commentText.substring(0, 250);
                placeCursorAtEnd(commentInput);
            }

            charCounter.innerHTML = `${Math.min(commentLength, 250)}/250`;
            if (sendBtn) {
                sendBtn.disabled = commentLength === 0;
            }
        });

        // Prevent Enter from submitting (optional)
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (sendBtn && !sendBtn.disabled) {
                    commentForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentPostId) return alertSystem.show("No post selected!", "error");

        let commentText = commentInput.innerText?.trim() || '';
        commentText = sanitize(commentText || '');

        console.log(commentText);

        if (!commentText) return;

        if (sendBtn) sendBtn.disabled = true;

        try {
            const { data: userData } = await supabaseClient.auth.getUser();
            const userId = userData?.user?.id;
            const userName = userData?.user.user_metadata.display_name || "User";

            if (!userId) throw new Error("You must be logged in to comment.");

            // Filter banned words
            if (bannedWords.length > 0) {
                let foundBanned = false;
                bannedWords.forEach(word => {
                    const pattern = new RegExp(`\\b${word}\\b[.,!?:;|<>@#$%^&()\\-_=+*]*`, 'gi');
                    if (pattern.test(commentText)) {
                        commentText = commentText.replace(pattern, match => '*'.repeat(match.length));
                        foundBanned = true;
                    }
                });
                if (foundBanned) alertSystem.show("Some inappropriate words were filtered.", 'info');
            }

            // Get avatar
            let avatar = '../images/defaultAvatar.jpg';
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', userId)
                .maybeSingle();
            if (profile?.avatar_url) avatar = profile.avatar_url;

            // Insert comment
            const { error: insertError } = await supabaseClient
                .from('post_comments')
                .insert({
                    post_id: currentPostId,
                    user_id: userId,
                    user_name: userName,
                    comment: commentText,
                    avatar: avatar
                });
            if (insertError) throw insertError;

            await commentPost(currentPostId, userId);

            // Reset input
            commentInput.innerHTML = '';
            charCounter.innerHTML = '0/250';
            await loadComments(currentPostId, currentUserId);

        } catch (err) {
            console.error(err);
            alertSystem.show(err.message || "Failed to post comment.", "error");
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
    });

    // Helper: move cursor to end after trimming
    function placeCursorAtEnd(el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// =======================
// LOAD COMMENTS
// =======================
export async function loadComments(postId, currentUserId = null) {
    const commentsContainer = document.getElementById('comments');

    const { data: commentsData, error } = await supabaseClient
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

    commentsContainer.innerHTML = '';

    if (error) {
        commentsContainer.innerHTML = `<p class="text-red-500">Error fetching comments.</p>`;
        console.error(error);
        return;
    }

    if (!commentsData || commentsData.length === 0) {
        commentsContainer.innerHTML = emptyComments();
    } else {
        commentsData.forEach(comment => {
            const commentDate = formatRelativeTime(comment.created_at);
            // Check if the current user owns this comment
            let isOwner = currentUserId && comment.user_id === currentUserId;

            commentsContainer.insertAdjacentHTML(
                'beforeend',
                comments(
                    comment.user_name,
                    comment.comment,
                    comment.avatar,
                    commentDate,
                    parseInt(comment.id),
                    comment.user_id,
                    isOwner,
                    comment.post_id
                )
            );
        });
    }

    commentsContainer.scrollTop = commentsContainer.scrollHeight;
}

// =======================
// DELETE COMMENT FUNCTIONALITY
// =======================
export function initDeleteComment(alertSystem) {
    // Use a more efficient event delegation pattern
    let isProcessing = false; // Prevent multiple simultaneous deletions

    document.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;

        // Skip if it's a mention button or already processing
        if (deleteBtn.classList.contains('mention-btn') || isProcessing) return;

        e.preventDefault();
        e.stopPropagation(); // Stop event propagation to reduce overhead

        const commentId = parseInt(deleteBtn.dataset.commentId);
        const postId = deleteBtn.dataset.postId;

        if (!commentId || isNaN(commentId)) {
            console.error('Invalid comment ID:', deleteBtn.dataset.commentId);
            alertSystem.show('Invalid comment ID', 'error');
            return;
        }

        // Use a custom modal instead of confirm() to avoid blocking
        if (!await showDeleteConfirmationDialog(alertSystem)) {
            return;
        }

        // Set processing flag
        isProcessing = true;

        const originalHTML = deleteBtn.innerHTML;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Deleting...';

        try {
            // Get user data - this is async but we can't avoid it
            const { data: userData } = await supabaseClient.auth.getUser();
            const currentUserId = userData?.user?.id;

            if (!currentUserId) {
                alertSystem.show('You must be logged in to delete comments', 'error');
                return;
            }

            // Use Promise.all to parallelize requests where possible
            const [commentResult] = await Promise.all([
                supabaseClient
                    .from('post_comments')
                    .select('user_id')
                    .eq('id', commentId)
                    .maybeSingle()
            ]);

            const { data: comment, error: fetchError } = commentResult;

            if (fetchError || !comment) {
                alertSystem.show('Failed to verify comment ownership', 'error');
                return;
            }

            if (comment.user_id !== currentUserId) {
                alertSystem.show('You can only delete your own comments', 'error');
                return;
            }

            const { error: deleteError } = await supabaseClient
                .from('post_comments')
                .delete()
                .eq('id', commentId);

            if (deleteError) throw deleteError;

            // Use requestAnimationFrame for smooth animations
            requestAnimationFrame(() => {
                const commentContainer = deleteBtn.closest('.comment-container');
                if (commentContainer) {
                    commentContainer.style.transition = 'opacity 0.3s ease';
                    commentContainer.style.opacity = '0';

                    setTimeout(() => {
                        const nextElement = commentContainer.nextElementSibling;
                        if (nextElement && nextElement.classList.contains('h-4')) {
                            nextElement.remove();
                        }
                        commentContainer.remove();

                        const commentsContainer = document.getElementById('comments');
                        if (commentsContainer && commentsContainer.children.length === 0) {
                            commentsContainer.innerHTML = emptyComments();
                        }
                    }, 300);
                }
            });

            alertSystem.show('Comment deleted successfully!', 'success');

        } catch (err) {
            console.error('Error deleting comment:', err);
            alertSystem.show(err.message || 'Failed to delete comment', 'error');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalHTML;
        } finally {
            // Clear processing flag after a short delay
            setTimeout(() => {
                isProcessing = false;
            }, 500);
        }
    });
}

// Custom confirmation dialog to avoid blocking confirm()
async function showDeleteConfirmationDialog(alertSystem) {
    return new Promise((resolve) => {
        // Check if modal exists, if not create a temporary one
        let modal = document.getElementById('deleteCommentModal');

        if (!modal) {
            modal = createDeleteConfirmationModal();
            document.body.appendChild(modal);
        }

        const confirmBtn = modal.querySelector('#confirmCommentDelete');
        const cancelBtn = modal.querySelector('#cancelCommentDelete');

        modal.classList.remove('hidden');

        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        // Also close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
    });
}

function createDeleteConfirmationModal() {
    const modal = document.createElement('div');
    modal.id = 'deleteCommentModal';
    modal.className = 'fixed inset-0 bg-black/50 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 hidden';
    modal.innerHTML = `
        <div class="delete-card bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 transform transition-all duration-200 scale-95">
            <div class="p-6">
                <div class="flex justify-center mb-4">
                    <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                    </div>
                </div>
                <div class="text-center mb-6">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">Delete this comment?</h3>
                    <p class="text-gray-600 text-sm leading-relaxed">
                        This action cannot be undone. The comment will be permanently removed.
                    </p>
                </div>
                <div class="flex flex-col space-y-3">
                    <button type="button" id="confirmCommentDelete"
                        class="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow">
                        Delete permanently
                    </button>
                    <button type="button" id="cancelCommentDelete"
                        class="w-full py-3.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 rounded-xl font-medium transition-all duration-200 hover:shadow-sm">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    return modal;
}

// =======================
// REALTIME COMMENT DELETION
// =======================
export function initCommentRealtime() {
    supabaseClient
        .channel('public:post_comments')
        .on('postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'post_comments'
            },
            (payload) => {
                const commentContainer = document.querySelector(`.comment-container[data-comment-id="${payload.old.id}"]`);
                if (commentContainer) {
                    const nextElement = commentContainer.nextElementSibling;
                    if (nextElement && nextElement.classList.contains('h-4')) {
                        nextElement.remove();
                    }
                    commentContainer.remove();

                    const commentsContainer = document.getElementById('comments');
                    if (commentsContainer && commentsContainer.children.length === 0) {
                        commentsContainer.innerHTML = emptyComments();
                    }
                }
            }
        )
        .subscribe();
}

// =======================
// MENTION USER
// =======================
export function initMentionUser(alertSystem) {
    const commentInput = document.getElementById('commentInput');

    document.addEventListener('click', async (e) => {
        const mentionBtn = e.target.closest('.mention-btn');
        if (!mentionBtn) return;

        const targetUserId = mentionBtn.dataset.userId;
        const commentId = mentionBtn.dataset.commentId;
        const postId = mentionBtn.dataset.postId;

        const { data: user, error } = await supabaseClient
            .from('profile')
            .select('id, name, avatar_url')
            .eq('id', targetUserId)
            .single();

        if (!user || !user.name) return;

        const mentionHTML = `<span contenteditable="false" class="text-blue-500">@${user.name}</span>&nbsp;`;
        insertAtCursor(commentInput, mentionHTML);

        commentInput.dispatchEvent(new Event('input'));

        try {
            const { data: currentUser } = await supabaseClient.auth.getUser();
            const senderId = currentUser?.user?.id;
            const senderName = currentUser?.user?.user_metadata.display_name || 'User';
            const senderAvatar = currentUser?.user?.user_metadata.avatar_url || '../images/defaultAvatar.jpg';

            if (!senderId) return;

            const message = `${senderName} mentioned you in a comment`;

            const { error: notifError } = await supabaseClient
                .from('notifications')
                .insert({
                    user_id: targetUserId,
                    sender_id: senderId,
                    type: 'comment',
                    entity_type: 'post',
                    entity_id: postId,
                    message: message,
                    username: senderName,
                    avatar_url: senderAvatar
                });

            if (notifError) console.error('Notification error:', notifError);
        } catch (err) {
            console.error('Failed to create notification:', err);
        }
    });
}

function insertAtCursor(el, html) {
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const frag = range.createContextualFragment(html);
    range.insertNode(frag);

    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
}