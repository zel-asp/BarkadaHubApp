import supabaseClient from '../supabase.js';

// =======================
// GET FRIEND STATUS
// =======================
export async function getFriendStatus(currentUserId, postUserId) {
    if (currentUserId === postUserId) return null;

    const { data, error } = await supabaseClient
        .from('friends_request')
        .select('sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${postUserId}),and(sender_id.eq.${postUserId},receiver_id.eq.${currentUserId})`);

    if (error || !data || data.length === 0) return null;

    const sentRequest = data.find(r => r.sender_id === currentUserId);
    if (sentRequest) return sentRequest.status;

    const receivedRequest = data.find(r => r.receiver_id === currentUserId);
    if (receivedRequest) return receivedRequest.status === 'pending' ? 'accept' : receivedRequest.status;

    return null;
}

// =======================
// FOLLOW BUTTONS
// =======================
export function initFollowButtons(alertSystem) {
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.follow-btn');
        if (!btn) return;

        if (btn.dataset.requestSent === 'true') return;

        const receiverId = btn.dataset.userPostId;
        const currentStatus = btn.dataset.status;

        try {
            const { data: userData, error: authError } = await supabaseClient.auth.getUser();
            if (authError) throw authError;

            const senderId = userData?.user?.id;
            if (!senderId) throw new Error('User not logged in');

            const { data: existingRequests, error: fetchError } = await supabaseClient
                .from('friends_request')
                .select('id, status, sender_id, receiver_id')
                .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);

            if (fetchError) throw fetchError;

            if (existingRequests && existingRequests.length > 0) {
                const req = existingRequests[0];

                if (req.sender_id === senderId) {
                    if (req.status === 'pending') {
                        alertSystem.show('You already sent a follow request', 'info');
                        return;
                    }
                    if (req.status === 'friends') {
                        alertSystem.show('You are already friends', 'info');
                        return;
                    }
                }

                if (req.receiver_id === senderId && req.status === 'pending') {
                    const { error: updateError } = await supabaseClient
                        .from('friends_request')
                        .update({
                            status: 'friends',
                            responded_at: new Date().toISOString()
                        })
                        .eq('id', req.id);

                    if (updateError) throw updateError;

                    const { data: profiles, error: profileError } = await supabaseClient
                        .from('profile')
                        .select('id, name, avatar_url')
                        .in('id', [req.sender_id, req.receiver_id]);

                    let senderProfile = {
                        id: req.sender_id,
                        name: 'User',
                        avatar_url: '../images/defaultAvatar.jpg'
                    };
                    let receiverProfile = {
                        id: req.receiver_id,
                        name: 'User',
                        avatar_url: '../images/defaultAvatar.jpg'
                    };

                    if (profiles && profiles.length > 0) {
                        profiles.forEach(profile => {
                            if (profile.id === req.sender_id) {
                                senderProfile = {
                                    id: profile.id,
                                    name: profile.name || 'User',
                                    avatar_url: profile.avatar_url || '../images/defaultAvatar.jpg'
                                };
                            }
                            if (profile.id === req.receiver_id) {
                                receiverProfile = {
                                    id: profile.id,
                                    name: profile.name || 'User',
                                    avatar_url: profile.avatar_url || '../images/defaultAvatar.jpg'
                                };
                            }
                        });
                    }

                    const { error: friendsError } = await supabaseClient
                        .from('friends')
                        .insert([
                            {
                                user_id: req.sender_id,
                                friends_id: req.receiver_id,
                                friendReq_id: req.id
                            },
                            {
                                user_id: req.receiver_id,
                                friends_id: req.sender_id,
                                friendReq_id: req.id
                            }
                        ]);

                    if (friendsError) throw friendsError;

                    const { data: conversation, error: convError } = await supabaseClient
                        .from('conversations')
                        .insert({ type: 'friend' })
                        .select('id')
                        .single();

                    if (convError) throw convError;

                    const conversationId = conversation.id;

                    try {
                        await supabaseClient
                            .from('message')
                            .insert([
                                {
                                    user_id: req.sender_id,
                                    friends_id: req.receiver_id,
                                    friend_name: receiverProfile.name,
                                    friend_avatar: receiverProfile.avatar_url,
                                    relation: 'friend',
                                    friendRequest_id: req.id,
                                    conversation_id: conversationId
                                },
                                {
                                    user_id: req.receiver_id,
                                    friends_id: req.sender_id,
                                    friend_name: senderProfile.name,
                                    friend_avatar: senderProfile.avatar_url,
                                    relation: 'friend',
                                    friendRequest_id: req.id,
                                    conversation_id: conversationId
                                }
                            ]);
                    } catch (messageErr) {
                        console.error('Failed to create message entries:', messageErr);
                    }

                    btn.disabled = true;
                    btn.classList.remove('bg-green-500', 'hover:bg-green-600');
                    btn.classList.add('bg-gray-400', 'cursor-not-allowed');
                    btn.dataset.status = 'friends';
                    btn.dataset.requestSent = 'true';

                    alertSystem.show('Friend request accepted!', 'success');
                    return;
                }

                if (req.status === 'friends') {
                    alertSystem.show('You are already friends', 'info');
                    return;
                }
            }

            if (
                (!currentStatus || currentStatus === 'null' || currentStatus === 'undefined') &&
                (!existingRequests || existingRequests.length === 0)
            ) {
                const { error: insertError } = await supabaseClient
                    .from('friends_request')
                    .insert({
                        sender_id: senderId,
                        receiver_id: receiverId,
                        status: 'pending'
                    });

                if (insertError) throw insertError;
                btn.disabled = true;
                btn.classList.remove('bg-primary', 'hover:bg-blue-500');
                btn.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'cursor-not-allowed');
                btn.dataset.status = 'pending';
                btn.dataset.requestSent = 'true';

                alertSystem.show('Follow request sent!', 'success');
            }

        } catch (err) {
            console.error('Error handling friend request:', err);
            alertSystem.show('An error occurred. Please try again.', 'error');
        }
    });
}

// =======================
// REALTIME FRIEND REQUESTS
// =======================
export function initFriendRealtime(currentUserId) {
    supabaseClient
        .channel('friends-request-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friends_request' }, (payload) => {
            if (payload.new.sender_id === currentUserId || payload.new.receiver_id === currentUserId) {
                updateFollowButtonsRealtime(payload.new);
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friends_request' }, (payload) => {
            if (payload.new.sender_id === currentUserId || payload.new.receiver_id === currentUserId) {
                updateFollowButtonsRealtime(payload.new);
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'friends_request' }, (payload) => {
            if (payload.old.sender_id === currentUserId || payload.old.receiver_id === currentUserId) {
                updateFollowButtonsRealtime(payload.old);
            }
        })
        .subscribe();
}

function updateFollowButtonsRealtime(row) {
    if (row.status === 'pending') {
        document.querySelectorAll(
            `.follow-btn[data-user-post-id="${row.sender_id}"]`
        ).forEach(btn => {
            btn.disabled = false;
            btn.className = btn.className.replace(/bg-\S+/g, '');
            btn.classList.add('bg-green-500', 'hover:bg-green-600');
            btn.dataset.status = 'accept';
        });
        return;
    }

    if (row.status === 'friends') {
        document.querySelectorAll(
            `.follow-btn[data-user-post-id="${row.sender_id}"],
            .follow-btn[data-user-post-id="${row.receiver_id}"]`
        ).forEach(btn => {
            btn.disabled = true;
            btn.className = btn.className.replace(/bg-\S+/g, '');
            btn.classList.add('bg-gray-400');
            btn.dataset.status = 'friends';
        });
    }
}