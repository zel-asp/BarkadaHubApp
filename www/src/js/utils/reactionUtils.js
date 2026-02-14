// utils/reactionUtils.js
import supabaseClient from '../supabase.js';
import { REACTION_IMAGES, REACTION_BG_COLORS, REACTION_LABELS } from './reactionImages.js';

export const REACTION_TYPES = {
    like: { label: 'Like', bg: REACTION_BG_COLORS.like },
    love: { label: 'Love', bg: REACTION_BG_COLORS.love },
    laugh: { label: 'Haha', bg: REACTION_BG_COLORS.laugh },
    wow: { label: 'Wow', bg: REACTION_BG_COLORS.wow },
    sad: { label: 'Sad', bg: REACTION_BG_COLORS.sad },
    angry: { label: 'Angry', bg: REACTION_BG_COLORS.angry },
    clap: { label: 'Clap', bg: REACTION_BG_COLORS.clap }
};

export function initReactions(alertSystem) {
    let currentPicker = null;

    // Show reaction picker on hover
    document.addEventListener('mouseenter', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;

        const reactionBtn = target.closest('.reaction-btn');
        if (!reactionBtn) return;

        const container = reactionBtn.closest('.reaction-picker-container');
        const picker = container?.querySelector('.reaction-picker');

        if (picker) {
            // Hide any other open pickers
            document.querySelectorAll('.reaction-picker').forEach(p => {
                if (p !== picker) {
                    p.classList.add('hidden');
                }
            });

            // Show this picker
            picker.classList.remove('hidden');
            currentPicker = picker;
        }
    }, true);

    // Hide picker when clicking outside
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;

        // Don't hide if clicking on reaction button or picker
        if (target.closest('.reaction-btn') || target.closest('.reaction-picker')) {
            return;
        }

        // Hide all pickers
        document.querySelectorAll('.reaction-picker').forEach(picker => {
            picker.classList.add('hidden');
        });
        currentPicker = null;
    });

    // Handle reaction selection
    document.addEventListener('click', async (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;

        const reactionOption = target.closest('.reaction-option');
        if (!reactionOption) return;

        e.preventDefault();

        const postId = reactionOption.dataset.postId;
        const reaction = reactionOption.dataset.reaction;
        const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);

        if (!postEl) return;

        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
            alertSystem.show('You must be logged in to react', 'error');
            return;
        }

        if (postEl.classList.contains('processing')) return;
        postEl.classList.add('processing');

        try {
            const { data: existingReaction } = await supabaseClient
                .from('post_reactions')
                .select('reaction')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .maybeSingle();

            if (existingReaction) {
                if (existingReaction.reaction === reaction) {
                    await supabaseClient
                        .from('post_reactions')
                        .delete()
                        .eq('post_id', postId)
                        .eq('user_id', userId);

                    await updateReactionUI(postEl, null, userId);
                    alertSystem.show(`Removed ${REACTION_LABELS[reaction]}`, 'info');
                } else {
                    await supabaseClient
                        .from('post_reactions')
                        .update({ reaction })
                        .eq('post_id', postId)
                        .eq('user_id', userId);

                    await updateReactionUI(postEl, reaction, userId);
                    alertSystem.show(`Reacted with ${REACTION_LABELS[reaction]}`, 'success');
                }
            } else {
                await supabaseClient
                    .from('post_reactions')
                    .insert({ post_id: postId, user_id: userId, reaction });

                await updateReactionUI(postEl, reaction, userId);
                alertSystem.show(`Reacted with ${REACTION_LABELS[reaction]}`, 'success');

                await createReactionNotification(postId, userId, reaction);
            }

            // Hide the picker after selection
            const picker = reactionOption.closest('.reaction-picker');
            if (picker) {
                picker.classList.add('hidden');
                currentPicker = null;
            }

        } catch (error) {
            console.error('Reaction error:', error);
            alertSystem.show('Failed to react', 'error');
        } finally {
            postEl.classList.remove('processing');
        }
    });

    // Optional: Also hide on scroll to keep UI clean
    document.addEventListener('scroll', () => {
        document.querySelectorAll('.reaction-picker:not(.hidden)').forEach(picker => {
            picker.classList.add('hidden');
        });
        currentPicker = null;
    }, { passive: true });
}

export async function updateReactionUI(postEl, reaction, userId) {
    const reactionBtn = postEl.querySelector('.reaction-btn');
    if (!reactionBtn) return;

    const currentIcon = reactionBtn.querySelector('.current-reaction-icon');
    const currentText = reactionBtn.querySelector('.current-reaction-text');
    const totalReactionsEl = postEl.querySelector('.likes-count');

    if (reaction && REACTION_IMAGES[reaction]) {
        const imageUrl = REACTION_IMAGES[reaction];
        if (currentIcon) {
            currentIcon.innerHTML = `<img src="${imageUrl}" alt="${reaction}" class="w-5 h-5 object-contain rounded-full">`;
        }
        if (currentText) {
            currentText.textContent = REACTION_LABELS[reaction];
            currentText.className = `current-reaction-text text-xs font-bold`;
        }
    } else {
        if (currentIcon) {
            currentIcon.innerHTML = '<i class="far fa-thumbs-up text-gray-400"></i>';
        }
        if (currentText) {
            currentText.textContent = 'Like';
            currentText.className = 'current-reaction-text text-xs font-bold text-gray-600';
        }
    }

    const { count, error } = await supabaseClient
        .from('post_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postEl.dataset.postId);

    if (!error && totalReactionsEl) {
        totalReactionsEl.textContent = count || 0;
    }
}

async function createReactionNotification(postId, userId, reaction) {
    try {
        const { data: postData } = await supabaseClient
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single();

        if (!postData || postData.user_id === userId) return;

        const { data: userData } = await supabaseClient.auth.getUser();
        const senderName = userData?.user?.user_metadata?.display_name || 'Someone';
        const senderAvatar = userData?.user?.user_metadata?.avatar_url || '../images/defaultAvatar.jpg';

        // Insert notification with correct schema
        const { error } = await supabaseClient
            .from('notifications')
            .insert({
                user_id: postData.user_id,           // recipient
                sender_id: userId,                    // who performed the action
                type: 'reaction',                      // notification type
                entity_type: 'post',                    // type of entity
                entity_id: postId,                      // the post ID
                message: `${senderName} reacted with ${REACTION_LABELS[reaction]} to your post`,
                username: senderName,                   // sender's name
                avatar_url: senderAvatar,                // sender's avatar
                is_read: false,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('Failed to create notification:', error);
        }

    } catch (error) {
        console.error('Failed to create notification:', error);
    }
}

export async function getPostReactions(postId, userId) {
    if (!postId) return { userReaction: null, total: 0, summary: {}, recentReactions: [] };

    try {
        // Get total count
        const { count, error: countError } = await supabaseClient
            .from('post_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        // Get user's reaction
        const { data: userReactionData } = await supabaseClient
            .from('post_reactions')
            .select('reaction')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .maybeSingle();

        // Get recent reactions for preview (limit to 20)
        const { data: recentReactionsData } = await supabaseClient
            .from('post_reactions')
            .select('reaction, user_id, created_at')
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .limit(20);

        // Get profiles for these users
        let formattedReactions = [];
        if (recentReactionsData && recentReactionsData.length > 0) {
            const userIds = [...new Set(recentReactionsData.map(r => r.user_id))];

            const { data: profiles } = await supabaseClient
                .from('profile')
                .select('id, name')
                .in('id', userIds);

            const profileMap = {};
            profiles?.forEach(p => {
                profileMap[p.id] = p;
            });

            formattedReactions = recentReactionsData.map(r => ({
                reaction: r.reaction,
                user_name: profileMap[r.user_id]?.name || 'Someone',
                user_id: r.user_id
            }));
        }

        // Get reaction counts for summary
        const { data: summaryData } = await supabaseClient
            .from('post_reactions')
            .select('reaction')
            .eq('post_id', postId);

        const summary = {};
        summaryData?.forEach(r => {
            summary[r.reaction] = (summary[r.reaction] || 0) + 1;
        });

        return {
            userReaction: userReactionData?.reaction || null,
            total: count || 0,
            summary,
            recentReactions: formattedReactions
        };
    } catch (error) {
        console.error('Error in getPostReactions:', error);
        return { userReaction: null, total: 0, summary: {}, recentReactions: [] };
    }
}