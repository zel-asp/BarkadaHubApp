// utils/reactionImages.js
import supabaseClient from '../supabase.js';

// Get the public URL for a reaction image
export function getReactionImageUrl(reactionType) {
    const { data } = supabaseClient
        .storage
        .from('reactions')
        .getPublicUrl(`${reactionType}.png`);

    return data.publicUrl;
}

// Pre-load all reaction images for better performance
export const REACTION_IMAGES = {
    like: 'https://mxxrymqwkxxtvxsgkyil.supabase.co/storage/v1/object/public/reactions/like.png',
    love: 'https://mxxrymqwkxxtvxsgkyil.supabase.co/storage/v1/object/public/reactions/love.png',
    laugh: 'https://mxxrymqwkxxtvxsgkyil.supabase.co/storage/v1/object/public/reactions/laughing.png',
    wow: 'https://mxxrymqwkxxtvxsgkyil.supabase.co/storage/v1/object/public/reactions/wow.png',
    sad: 'https://mxxrymqwkxxtvxsgkyil.supabase.co/storage/v1/object/public/reactions/crying.png',
    angry: 'https://mxxrymqwkxxtvxsgkyil.supabase.co/storage/v1/object/public/reactions/angry.png',
    clap: 'https://mxxrymqwkxxtvxsgkyil.supabase.co/storage/v1/object/public/reactions/clap.png'
};

// Background colors for fallback
export const REACTION_BG_COLORS = {
    like: 'bg-blue-100',
    love: 'bg-red-100',
    laugh: 'bg-yellow-100',
    wow: 'bg-purple-100',
    sad: 'bg-indigo-100',
    angry: 'bg-orange-100',
    clap: 'bg-green-100'
};

// Labels for reactions
export const REACTION_LABELS = {
    like: 'Like',
    love: 'Love',
    laugh: 'Haha',
    wow: 'Wow',
    sad: 'Sad',
    angry: 'Angry',
    clap: 'Clap'
};