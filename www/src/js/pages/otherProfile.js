import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import { displayBio, displayInformation } from '../render/profile.js';

const alertSystem = new AlertSystem();

async function renderBio() {
    const params = new URLSearchParams(window.location.search);
    const ownerId = params.get('user');

    if (!ownerId) return;

    const { data } = await supabaseClient.auth.getUser();
    const userId = data?.user?.id;

    let isOwner = userId === ownerId;

    const { data: profile, error } = await supabaseClient
        .from('profile')
        .select('*')
        .eq('id', ownerId)
        .single();

    console.log(profile);

    if (error) {
        console.error('Profile fetch error:', error);
        return;
    }

    const nullData = "No information available";

    const bioText = profile?.about_me || nullData;
    const name = profile?.name || nullData;
    const email = profile?.email || nullData;
    const major = profile?.major || nullData;
    const year_level = profile?.year_level || nullData;
    const avatarUrl = profile?.avatar_url || '../images/defaultAvatar.jpg';

    // Elements
    const userAvatar = document.getElementById('userAvatar');
    const fullImageModal = document.getElementById('fullImageModal');
    const viewAvatar = document.getElementById('viewAvatar');
    const closeFullImage = document.getElementById('closeFullImage');

    // Set data
    userAvatar.src = avatarUrl;
    viewAvatar.src = avatarUrl;

    document.getElementById('displayBio').innerHTML = displayBio(bioText);
    document.getElementById('username').innerHTML = name;
    document.getElementById('location').textContent = profile?.location || '';
    document.getElementById('PersonalInfo').innerHTML =
        displayInformation(name, email, major, year_level, isOwner);

    // Initialize follow button functionality if not owner
    if (!isOwner) {
        initFollowButton(userId, ownerId);
        initFriendRealtime(userId, ownerId);
    }

    // =============================
    // OPEN FULL IMAGE MODAL
    // =============================
    userAvatar.onclick = () => {
        viewAvatar.src = avatarUrl;
        fullImageModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    };

    // =============================
    // CLOSE MODAL (X BUTTON)
    // =============================
    closeFullImage.onclick = () => {
        fullImageModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    // =============================
    // CLOSE MODAL (BACKGROUND CLICK)
    // =============================
    fullImageModal.onclick = (e) => {
        if (e.target === fullImageModal) {
            fullImageModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    };
}

// =======================
// FOLLOW BUTTON FUNCTIONALITY
// =======================
async function initFollowButton(currentUserId, profileOwnerId) {
    const followBtn = document.querySelector('.follow-btn');
    if (!followBtn) return;

    // Get current friend status
    const friendStatus = await getFriendStatus(currentUserId, profileOwnerId);
    updateFollowButtonState(followBtn, friendStatus);

    // Add click event listener
    followBtn.addEventListener('click', async () => {
        if (followBtn.dataset.requestSent === 'true') return;

        const currentStatus = followBtn.dataset.status;

        try {
            const { data: userData, error: authError } = await supabaseClient.auth.getUser();
            if (authError) throw authError;

            const senderId = userData?.user?.id;
            if (!senderId) throw new Error('User not logged in');

            const { data: existingRequests, error: fetchError } = await supabaseClient
                .from('friends_request')
                .select('id, status, sender_id, receiver_id')
                .or(`and(sender_id.eq.${senderId},receiver_id.eq.${profileOwnerId}),and(sender_id.eq.${profileOwnerId},receiver_id.eq.${senderId})`);

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

                    console.log('Profiles found:', profiles);

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

                    // Get names from posts if not in profile
                    if (senderProfile.name === 'User') {
                        try {
                            const { data: userPost } = await supabaseClient
                                .from('posts')
                                .select('user_name')
                                .eq('user_id', req.sender_id)
                                .limit(1)
                                .maybeSingle();

                            if (userPost?.user_name) {
                                senderProfile.name = userPost.user_name;
                            }
                        } catch (err) {
                            console.warn('Could not get sender name from posts:', err);
                        }
                    }

                    if (receiverProfile.name === 'User') {
                        try {
                            const { data: userPost } = await supabaseClient
                                .from('posts')
                                .select('user_name')
                                .eq('user_id', req.receiver_id)
                                .limit(1)
                                .maybeSingle();

                            if (userPost?.user_name) {
                                receiverProfile.name = userPost.user_name;
                            }
                        } catch (err) {
                            console.warn('Could not get receiver name from posts:', err);
                        }
                    }

                    // Create friendship records
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

                    // Create conversation for friends
                    const { data: conversation, error: convError } = await supabaseClient
                        .from('conversations')
                        .insert({ type: 'friend' })
                        .select('id')
                        .single();

                    if (convError) throw convError;

                    const conversationId = conversation.id;

                    // Create message entries for the friendship
                    try {
                        const { error: messageError } = await supabaseClient
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

                        if (messageError) {
                            console.error('Message insert error:', messageError);
                            if (messageError.code === '23505') {
                                console.log('Message entries already exist, skipping...');
                            } else {
                                throw messageError;
                            }
                        } else {
                            console.log('Message entries created successfully');
                        }
                    } catch (messageErr) {
                        console.error('Failed to create message entries:', messageErr);
                    }

                    updateFollowButtonState(followBtn, 'friends');
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
                        receiver_id: profileOwnerId,
                        status: 'pending'
                    });

                if (insertError) throw insertError;

                updateFollowButtonState(followBtn, 'pending');
                alertSystem.show('Follow request sent!', 'success');
            }

        } catch (err) {
            console.error('Error handling friend request:', err);
            alertSystem.show('An error occurred. Please try again.', 'error');
        }
    });
}

// =======================
// GET FRIEND STATUS
// =======================
async function getFriendStatus(currentUserId, targetUserId) {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return null;

    const { data, error } = await supabaseClient
        .from('friends_request')
        .select('sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`);

    if (error) {
        console.error('Error fetching friend status:', error);
        return null;
    }

    if (!data || data.length === 0) return null;

    const sentRequest = data.find(r => r.sender_id === currentUserId);
    if (sentRequest) return sentRequest.status;

    const receivedRequest = data.find(r => r.receiver_id === currentUserId);
    if (receivedRequest) return receivedRequest.status === 'pending' ? 'accept' : receivedRequest.status;

    return null;
}

// =======================
// UPDATE FOLLOW BUTTON STATE
// =======================
function updateFollowButtonState(button, status) {
    if (!button) return;

    button.dataset.status = status || 'null';
    button.dataset.requestSent = (status === 'pending' || status === 'friends') ? 'true' : 'false';
    button.disabled = status === 'friends';

    // Clear existing color classes
    const classList = button.classList;
    const classesToRemove = [];

    // Collect classes to remove
    classList.forEach(className => {
        if (className.startsWith('bg-') ||
            className.startsWith('hover:bg-') ||
            className.startsWith('text-') ||
            className === 'cursor-not-allowed' ||
            className === 'opacity-50') {
            classesToRemove.push(className);
        }
    });

    // Remove collected classes
    classesToRemove.forEach(className => {
        classList.remove(className);
    });

    // Set icon and text based on status
    let iconClass, buttonText, bgClass, textClass = 'text-white';

    switch (status) {
        case 'pending':
            iconClass = 'fas fa-hourglass-half';
            buttonText = 'Requested';
            bgClass = 'bg-yellow-500';
            button.disabled = true;
            button.classList.add('cursor-not-allowed');
            break;
        case 'accept':
            iconClass = 'fas fa-user-check';
            buttonText = 'Accept';
            bgClass = 'bg-green-500';
            button.disabled = false;
            break;
        case 'friends':
            iconClass = 'fas fa-user-friends';
            buttonText = 'Friends';
            bgClass = 'bg-gray-400';
            button.disabled = true;
            button.classList.add('cursor-not-allowed', 'opacity-50');
            textClass = 'text-gray-700';
            break;
        default:
            iconClass = 'fas fa-user-plus';
            buttonText = 'Follow';
            bgClass = 'bg-primary';
            button.disabled = false;
    }

    button.innerHTML = `<i class="${iconClass} mr-1"></i><span>${buttonText}</span>`;

    // Only add classes if they're not empty
    if (bgClass && bgClass.trim()) button.classList.add(bgClass);
    if (textClass && textClass.trim()) button.classList.add(textClass);

    // Add hover class for non-friends states
    if (status !== 'friends' && bgClass && bgClass.trim()) {
        const hoverClass = bgClass.replace('bg-', 'hover:bg-');
        if (hoverClass && hoverClass.trim()) button.classList.add(hoverClass);
    }
}

// =======================
// REALTIME FRIEND REQUESTS UPDATES
// =======================
function initFriendRealtime(currentUserId, profileOwnerId) {
    if (!currentUserId || !profileOwnerId) return;

    supabaseClient
        .channel('friends-request-profile-realtime')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'friends_request'
        }, (payload) => {
            if ((payload.new.sender_id === currentUserId && payload.new.receiver_id === profileOwnerId) ||
                (payload.new.sender_id === profileOwnerId && payload.new.receiver_id === currentUserId)) {
                handleFriendUpdate(payload.new, currentUserId, profileOwnerId);
            }
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'friends_request'
        }, (payload) => {
            if ((payload.new.sender_id === currentUserId && payload.new.receiver_id === profileOwnerId) ||
                (payload.new.sender_id === profileOwnerId && payload.new.receiver_id === currentUserId)) {
                handleFriendUpdate(payload.new, currentUserId, profileOwnerId);
            }
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'friends_request'
        }, (payload) => {
            if ((payload.old.sender_id === currentUserId && payload.old.receiver_id === profileOwnerId) ||
                (payload.old.sender_id === profileOwnerId && payload.old.receiver_id === currentUserId)) {
                handleFriendUpdate(payload.old, currentUserId, profileOwnerId, true);
            }
        })
        .subscribe();
}

// =======================
// HANDLE FRIEND UPDATE
// =======================
async function handleFriendUpdate(row, currentUserId, profileOwnerId, isDelete = false) {
    const followBtn = document.querySelector('.follow-btn');
    if (!followBtn) return;

    if (isDelete) {
        // If request was deleted, reset to follow button
        updateFollowButtonState(followBtn, null);
        return;
    }

    if (row.status === 'pending') {
        if (row.sender_id === currentUserId) {
            // User sent the request
            updateFollowButtonState(followBtn, 'pending');
        } else if (row.receiver_id === currentUserId) {
            // User received the request
            updateFollowButtonState(followBtn, 'accept');
        }
        return;
    }

    if (row.status === 'friends') {
        updateFollowButtonState(followBtn, 'friends');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderBio();
});