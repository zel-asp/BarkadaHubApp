// utils/realtimeReactions.js
import supabaseClient from '../supabase.js';
import { updateReactionUI } from './reactionUtils.js';
import { REACTION_IMAGES, REACTION_BG_COLORS } from './reactionImages.js';

const reactionSubscriptions = new Map();

export function subscribeToPostReactions(postId, userId) {
    if (reactionSubscriptions.has(postId)) {
        reactionSubscriptions.get(postId).unsubscribe();
    }

    const subscription = supabaseClient
        .channel(`post-reactions-${postId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'post_reactions',
                filter: `post_id=eq.${postId}`
            },
            async (payload) => {
                const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
                if (!postEl) return;

                const { data: userData } = await supabaseClient.auth.getUser();
                const currentUserId = userData?.user?.id;

                await handleReactionChange(postEl, postId, currentUserId, payload);
            }
        )
        .subscribe();

    reactionSubscriptions.set(postId, subscription);
    return subscription;
}

async function handleReactionChange(postEl, postId, currentUserId, payload) {
    const { count } = await supabaseClient
        .from('post_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

    const totalReactionsEl = postEl.querySelector('.likes-count');
    if (totalReactionsEl) {
        totalReactionsEl.textContent = count || 0;
    }

    await updateReactionPreview(postEl, postId);

    if (payload.new?.user_id === currentUserId || payload.old?.user_id === currentUserId) {
        const { data: userReaction } = await supabaseClient
            .from('post_reactions')
            .select('reaction')
            .eq('post_id', postId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        await updateReactionUI(postEl, userReaction?.reaction || null, currentUserId);
    }
}

async function updateReactionPreview(postEl, postId) {
    const { data: reactions } = await supabaseClient
        .from('post_reactions')
        .select('reaction, user_id')
        .eq('post_id', postId)
        .limit(3);

    const previewContainer = postEl.querySelector('.flex.-space-x-2');
    if (!previewContainer || !reactions) return;

    previewContainer.innerHTML = '';

    reactions.forEach(reaction => {
        const imageUrl = REACTION_IMAGES[reaction.reaction];
        const bgColor = REACTION_BG_COLORS[reaction.reaction];
        previewContainer.insertAdjacentHTML('beforeend', `
            <div class="w-5 h-5 rounded-full ${bgColor} flex items-center justify-center border-2 border-white -ml-1 first:ml-0 overflow-hidden">
                <img src="${imageUrl}" alt="${reaction.reaction}" class="w-full h-full object-cover">
            </div>
        `);
    });
}

export function unsubscribeAllReactions() {
    reactionSubscriptions.forEach((subscription) => {
        subscription.unsubscribe();
    });
    reactionSubscriptions.clear();
}