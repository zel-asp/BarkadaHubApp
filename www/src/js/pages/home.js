import supabaseClient from '../supabase.js';
import uploadedPost from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
import comments, { emptyComments } from '../render/comments.js';
import { likePost } from './notification.js';
import { commentPost } from './notification.js';

document.addEventListener('DOMContentLoaded', async () => {

    // =======================
    // PAGE ELEMENTS
    // =======================
    const postForm = document.getElementById('postForm');
    const postContent = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    const photoUpload = document.getElementById('photoUpload');
    const videoUpload = document.getElementById('videoUpload');
    const mediaPreview = document.getElementById('mediaPreview');
    const previewContainer = document.getElementById('previewContainer');
    const removeMedia = document.getElementById('removeMedia');
    const postButton = document.getElementById('postButton');
    const postsContainer = document.getElementById('dynamic-posts');
    const userAvatar = document.getElementById('userAvatar');


    // =======================
    // APP STATE
    // =======================
    let selectedMedia = null;
    const displayedPostIds = new Set();
    const alertSystem = new AlertSystem();

    const { data, error } = await supabaseClient.auth.getUser();
    const userId = data?.user?.id;

    const bannedWords = [
        "tanga", "bobo", "ulol", "gago", "putangina", "pakshet", "tangina", "tarantado", "peste", "hayop",
        "sex", "kantot", "ligawan", "hubad", "malandi", "puki", "titi", "pepe", "kantutan", "libog", "nigga",
        "puta", "pota", "potangina", "punyeta", "leche", "lintik", "buwisit", "siraulo", "hinayupak",
        "inutil", "bunganga", "kupal", "buang", "gagu", "linta", "saksakan", "gaga", "engot", "bangag",
        "lintik", "yawa", "bwisit", "shet", "animal", "bilat", "betlog", "etits", "tungaw", "tikol",
        "jakol", "tamod", "bulbol", "tite", "burat", "kiki", "puday", "bulin", "bakla", "tomboy",
        "binabae", "baklang", "salsal", "kantotero", "kantotera", "manyak", "bastos", "walanghiya",
        "salot", "sintu-sinto", "hinamak", "suklam", "supot", "ungas", "unggoy", "utong", "suso",
        "pekpek", "dede", "pwet", "puwet", "pimpoy", "kantotray", "kolokoy", "sinturon", "bulok",
        "hinubdan", "hinubdan", "pokpok", "kalapating", "mabaho", "maut", "utot", "tae", "ipis",
        "demonyo", "impakto", "aswang", "tikbalang", "duwende", "kapre", "tiyanak", "manananggal",
        "bampira", "multo", "pugot", "maligno", "satanas", "diyablo", "demonyo", "bwisit na",
        "napakabobo", "napakatanga", "napakagago", "napakasira", "napakabastos",
        "sinungaling", "magnanakaw", "sinungaling", "dayo",
        "ulikba", "ungol", "ungas", "unggoy", "tamod", "tamuran",
        "kadiri", "kadiri", "kasuklam-suklam", "nakakadiri", "nakakasuka",
        "pakshet", "pakyu", "pakyu", "pakyo", "pakyaw", "pakyawan",
        "sinturon", "sinulid", "sinungaling", "sinungaling", "amputa",
        "tarantadu", "tampal", "tampalasan", "tampalasan", "bembang", "bembangan",
        "yawa", "yagit", "iyot", "nipple", "panget", "pangit", "panot", "hairline", "sipunin", "tuwad", "dogstyle", "kadyot"
    ];

    async function loadProfilePic(userId, userAvatarElement) {
        let avatar = '../images/defaultAvatar.jpg';

        try {
            const { data: profile, error } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.warn("Failed to fetch profile:", error);
            }

            if (profile?.avatar_url) avatar = profile.avatar_url;
        } catch (err) {
            console.error("Error loading profile avatar:", err);
        }

        // Set the avatar src
        userAvatarElement.src = avatar;
    }

    loadProfilePic(userId, userAvatar);

    // =======================
    // LOAD CURRENT USER
    // =======================
    async function loadUser() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) {
            alertSystem.show(`Error: ${error}`, 'error');
            setTimeout(() => window.location.replace = '../../index.html', 1500);
            return;
        }

        const name = data.user.user_metadata?.display_name || "User";
        postContent.placeholder = `What's on your mind, ${name}?`;
    }

    // =======================
    // CHARACTER COUNT
    // =======================
    postContent.addEventListener('input', () => {
        charCount.textContent = postContent.value.length;
        postButton.disabled = (postContent.value.length === 0 && !selectedMedia);
    });

    // =======================
    // MEDIA UPLOAD
    // =======================
    function handleMediaUpload(file, type) {
        selectedMedia = { file, type };
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = '';
            const element = type === 'image'
                ? Object.assign(document.createElement('img'), { src: e.target.result, className: 'max-h-64 rounded-lg' })
                : Object.assign(document.createElement('video'), { src: e.target.result, controls: true, className: 'max-h-64 rounded-lg' });
            previewContainer.appendChild(element);
            mediaPreview.classList.remove('hidden');
            if (postContent.value.length === 0) postButton.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    photoUpload.addEventListener('change', () => photoUpload.files[0] && handleMediaUpload(photoUpload.files[0], 'image'));
    videoUpload.addEventListener('change', () => videoUpload.files[0] && handleMediaUpload(videoUpload.files[0], 'video'));

    removeMedia.addEventListener('click', () => {
        selectedMedia = null;
        mediaPreview.classList.add('hidden');
        photoUpload.value = '';
        videoUpload.value = '';
        postButton.disabled = (postContent.value.length === 0);
    });

    // =======================
    // THREE-DOTS MENU
    // =======================
    function initEllipsisButtons() {
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
    // DELETE CONFIRMATION
    // =======================
    function showDeleteConfirmation() {
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

    function hideDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmationModal');
        const card = modal.querySelector('.delete-card');
        card.classList.remove('scale-100');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('app').classList.remove('opacity-50');
        }, 150);
    }

    function deletePermanently() {
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
            const { data, error } = await supabaseClient
                .storage
                .from('post-media')
                .remove([filePathForStorage]);

            if (error) console.error('Delete failed:', error);
            else console.log('File deleted:', data);

            if (error) return alertSystem.show(`Failed to delete file: ${error.message}`, 'error');

            // Delete from database
            const { data: deletedPost, error: deleteError } = await supabaseClient
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

    // =======================
    // TIME FORMATTING
    // =======================
    function formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = (now - date) / 1000;
        if (diff < 5) return "Just now";
        if (diff < 60) return `${Math.floor(diff)} sec ago`;
        const minutes = diff / 60;
        if (minutes < 60) return `${Math.floor(minutes)} min ago`;
        const hours = minutes / 60;
        if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? "s" : ""} ago`;
        const days = hours / 24;
        if (days < 2) return "Yesterday";
        if (days < 7) return `${Math.floor(days)} day${Math.floor(days) > 1 ? "s" : ""} ago`;
        return date.toLocaleString('en-US', { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
    }

    // =======================
    // RENDER SINGLE POST
    // =======================
    async function renderPost(post, position = "beforeend") {
        if (!post.id || displayedPostIds.has(post.id)) return;

        const { data: userData } = await supabaseClient.auth.getUser();
        const currentUserId = userData?.user?.id;
        const owner = currentUserId === post.user_id;

        // Check if user liked this post
        let isLikedByUser = false;
        if (currentUserId) {
            const { data: userLike } = await supabaseClient
                .from('post_likes')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', currentUserId)
                .maybeSingle();
            isLikedByUser = !!userLike;
        }

        // Get total likes
        const { count: totalLikes } = await supabaseClient
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        // Get total comments
        const { count: commentCount } = await supabaseClient
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        // Get profile avatar
        let avatar = post.avatar_url || '../images/defaultAvatar.jpg';
        try {
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', post.user_id)
                .maybeSingle();

            if (profile?.avatar_url) avatar = profile.avatar_url;
        } catch (err) {
            console.warn('Failed to fetch profile avatar for user:', post.user_id, err);
        }

        const relativeTime = formatRelativeTime(post.created_at);
        const friendStatus = await getFriendStatus(currentUserId, post.user_id);

        const isReportedByUser = await checkIfUserReported(post.id);

        const html = uploadedPost(
            avatar,
            owner,
            post.user_name,
            relativeTime,
            post.content,
            post.media_url,
            post.media_type,
            post.id,
            totalLikes,
            commentCount,
            isLikedByUser,
            post.file_path,
            post.user_id,
            friendStatus,
            isReportedByUser
        );

        postsContainer.insertAdjacentHTML(position, html);
        displayedPostIds.add(post.id);

        setTimeout(() => {
            initEllipsisButtons();
            initLikeButtons();
        }, 100);
    }

    async function getFriendStatus(currentUserId, postUserId) {
        if (currentUserId === postUserId) return null;

        const { data, error } = await supabaseClient
            .from('friends_request')
            .select('sender_id, receiver_id, status')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${postUserId}),and(sender_id.eq.${postUserId},receiver_id.eq.${currentUserId})`);

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
    // FOLLOW BUTTONS
    // =======================
    function initFollowButtons() {
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
    function initFriendRealtime(currentUserId) {
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

    if (userId) {
        initFriendRealtime(userId);
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

    // =======================
    // CHECK IF USER REPORTED POST
    // =======================
    async function checkIfUserReported(postId) {
        const { data: userData } = await supabaseClient.auth.getUser();
        const currentUserId = userData?.user?.id;

        if (!currentUserId) return false;

        try {
            const { data: existingReport } = await supabaseClient
                .from('reports')
                .select('id')
                .eq('post_id', postId)
                .eq('who_reported', currentUserId)
                .maybeSingle();

            return !!existingReport; // Returns true if user reported, false if not
        } catch (error) {
            console.error('Error checking report:', error);
            return false;
        }
    }

    // Open Report Modal
    document.addEventListener('click', async (e) => {
        const reportBtn = e.target.closest('.report-btn');
        if (!reportBtn) return;

        const postId = reportBtn.dataset.postId;

        // Check if user already reported
        const alreadyReported = await checkIfUserReported(postId);

        if (alreadyReported) {
            alertSystem.show('You have already reported this post', 'info');
            return;
        }

        const modal = document.getElementById('reportPostModal');
        modal.dataset.postId = postId;
        modal.classList.remove('hidden');
    });

    // Cancel button
    document.getElementById('cancelReportBtn').addEventListener('click', () => {
        const modal = document.getElementById('reportPostModal');
        modal.classList.add('hidden');

        // Reset form
        document.getElementById('reportReason').value = '';
        document.getElementById('reportDetails').value = '';
    });

    // Submit report - UPDATED
    document.getElementById('confirmReportBtn').addEventListener('click', async () => {
        const modal = document.getElementById('reportPostModal');
        const postId = modal.dataset.postId;
        const reason = document.getElementById('reportReason').value;
        const otherReason = document.getElementById('reportDetails').value;

        if (!reason) {
            alert('Please select a reason for reporting.');
            return;
        }

        // Get current user ID
        const { data: userData } = await supabaseClient.auth.getUser();
        const whoReported = userData?.user?.id;

        if (!whoReported) {
            alert('You must be logged in to report.');
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('reports')
                .insert([
                    {
                        post_id: postId,
                        who_reported: whoReported,
                        reason,
                        other_reason: otherReason || null
                    }
                ]);

            if (error) throw error;

            alertSystem.show('Report submitted successfully!', 'success');

            // DISABLE THE REPORT BUTTON
            const reportBtn = document.querySelector(`.report-btn[data-post-id="${postId}"]`);
            if (reportBtn) {
                reportBtn.innerHTML = `<i class="fas fa-flag-checkered mr-1"></i> Reported`;
                reportBtn.disabled = true;
                reportBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                reportBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            }

            modal.classList.add('hidden');

            // Reset form
            document.getElementById('reportReason').value = '';
            document.getElementById('reportDetails').value = '';
        } catch (err) {
            console.error('Error submitting report:', err);
            alert('Failed to submit report.');
        }
    });

    // =======================
    // CREATE POST
    // =======================
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const postButton = postForm.querySelector('button[type="submit"]');
        if (!postButton) return;

        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        const userName = userData?.user.user_metadata.display_name || "User";

        if (!userId) return alertSystem.show("You must be logged in.", 'error');

        try {
            postButton.disabled = true;
            const originalText = postButton.textContent;
            postButton.textContent = 'Posting...';
            postButton.classList.add('opacity-50', 'cursor-not-allowed');

            let content = postContent.value;
            let foundBanned = false;

            bannedWords.forEach(word => {
                const pattern = new RegExp(`\\b${word}\\b[.,!?;:]*`, 'gi');
                if (pattern.test(content)) {
                    content = content.replace(pattern, match => '*'.repeat(match.length));
                    foundBanned = true;
                }
            });

            if (foundBanned) {
                alertSystem.show("Some inappropriate words were filtered.", 'info');
            }


            const loadingId = alertSystem.show("Posting...", 'loading');

            let mediaUrl = null;
            let mediaType = null;
            let filePath = null;

            if (selectedMedia) {
                const file = selectedMedia.file;
                const ext = file.name.split('.').pop();
                const fileName = `${Date.now()}.${ext}`;
                filePath = `${userId}/${fileName}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from("post-media")
                    .upload(filePath, file);
                if (uploadError) throw new Error("Media upload failed!");

                const { data } = supabaseClient.storage.from("post-media").getPublicUrl(filePath);
                mediaUrl = data.publicUrl;
                mediaType = selectedMedia.type;
            }

            let avatar = '../images/defaultAvatar.jpg';
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (profile?.avatar_url) avatar = profile.avatar_url;



            const { data: newPost, error } = await supabaseClient
                .from("posts")
                .insert({
                    user_id: userId,
                    user_name: userName,
                    content: content,
                    media_url: mediaUrl,
                    media_type: mediaType,
                    avatar_url: avatar,
                    file_path: filePath
                })
                .select('*, post_comments(*)')
                .maybeSingle();

            alertSystem.hide(loadingId);
            if (error) throw new Error("Failed to publish post!");

            postForm.reset();
            selectedMedia = null;
            mediaPreview.classList.add('hidden');
            charCount.textContent = "0";

            alertSystem.show("Post created successfully!", 'success');

            // Restore button
            postButton.textContent = 'Posted!';
            postButton.classList.remove('opacity-50', 'cursor-not-allowed');
            setTimeout(() => {
                postButton.textContent = originalText;
                postButton.disabled = true; // re-disable until new content
            }, 2000);

        } catch (err) {
            console.error(err);

            postButton.disabled = false;
            postButton.textContent = 'Post';
            postButton.classList.remove('opacity-50', 'cursor-not-allowed');

            alertSystem.show(err.message || "Failed to publish post!", 'error');
        }
    });

    // =======================
    // FETCH POSTS
    // =======================
    async function getPosts() {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*, post_comments(count)')
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching posts:", error);
            return;
        }

        if (!data) return;

        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        let postsToRender = data;
        if (postId) {
            postsToRender = data.filter(p => p.id == postId);
        }

        for (const post of postsToRender) {
            await renderPost(post, "beforeend");
        }

        if (postId) {
            setTimeout(() => {
                const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                if (postElement) {
                    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }

    // =======================
    // FULL IMAGE MODAL
    // =======================
    window.viewFullImage = (url) => {
        const modal = document.getElementById('fullImageModal');
        document.getElementById('fullImageContent').src = url;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };
    document.getElementById('closeFullImage').onclick = () => {
        document.getElementById('fullImageModal').classList.add('hidden');
        document.body.style.overflow = '';
    }

    // =======================
    // LIKE BUTTONS
    // =======================
    function initLikeButtons() {
        document.querySelectorAll('.like-btn').forEach(btn => {
            if (!btn.hasAttribute('data-bound-like')) {
                btn.setAttribute('data-bound-like', 'true');

                btn.addEventListener('click', async () => {
                    if (btn.classList.contains('processing')) return;
                    btn.classList.add('processing');

                    const postId = btn.dataset.postId;
                    const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
                    const likesEl = postEl?.querySelector('.likes-count');
                    const heartIcon = btn.querySelector('i');
                    const likeTextSpan = btn.querySelector('span');
                    let currentLikes = parseInt(likesEl?.textContent) || 0;

                    const { data: userData } = await supabaseClient.auth.getUser();
                    const userId = userData?.user?.id;

                    if (!userId) {
                        alertSystem.show("You must be logged in to like posts", "error");
                        btn.classList.remove('processing');
                        return;
                    }

                    try {
                        const { data: existingLike } = await supabaseClient
                            .from('post_likes')
                            .select('id')
                            .eq('post_id', postId)
                            .eq('user_id', userId)
                            .maybeSingle();

                        if (existingLike) {
                            alertSystem.show("You already liked this post.", "info");
                            btn.classList.remove('processing');
                            return;
                        }

                        const { error: insertError } = await supabaseClient
                            .from('post_likes')
                            .insert({ post_id: postId, user_id: userId });

                        if (insertError) {
                            console.error("Error inserting like:", insertError);
                            btn.classList.remove('processing');
                            return;
                        }

                        await likePost(postId, userId);

                        likesEl.textContent = currentLikes + 1;
                        heartIcon.className = 'fas fa-heart text-red-600';
                        likeTextSpan.textContent = 'Liked';
                        btn.classList.add('text-red-600', 'opacity-50', 'cursor-not-allowed');
                        btn.disabled = true;

                    } catch (error) {
                        console.error("Unexpected error:", error);
                    } finally {
                        btn.classList.remove('processing');
                    }
                });
            }
        });
    }

    // =======================
    // UPDATE LIKE BUTTONS
    // =======================
    async function updateLikeButtonStates() {
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;

        const { data: userLikes, error } = await supabaseClient
            .from('post_likes')
            .select('post_id')
            .eq('user_id', userId);

        if (error) return console.error("Error fetching user likes:", error);

        const likedPostIds = new Set(userLikes.map(like => like.post_id));

        document.querySelectorAll('.post').forEach(postEl => {
            const postId = postEl.dataset.postId;
            const likeBtn = postEl.querySelector('.like-btn');
            if (!likeBtn) return;

            const heartIcon = likeBtn.querySelector('i');
            const likeText = likeBtn.querySelector('span');

            if (likedPostIds.has(postId)) {
                heartIcon.className = 'fas fa-heart text-red-600';
                likeText.textContent = 'Liked';
                likeBtn.classList.add('text-red-600', 'opacity-50', 'cursor-not-allowed');
                likeBtn.disabled = true;
            } else {
                heartIcon.className = 'fas fa-heart text-gray-400';
                likeText.textContent = 'Like';
                likeBtn.classList.remove('text-red-600');
            }
        });
    }

    // =======================
    // COMMENTS MODAL
    // =======================
    function openComments() {
        const commentModal = document.getElementById('commentModal');
        const commentBackBtn = document.getElementById('commentBackBtn');
        const app = document.getElementById('app');
        const commentForm = document.getElementById('commentForm');
        const commentInput = document.getElementById('commentInput'); // contenteditable div
        const charCounter = document.querySelector('#charCounter');
        const sendBtn = document.getElementById('sendBtn');
        let commentLength = 0;

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
            await loadComments(currentPostId);

            commentModal.classList.remove('hidden');
            app.classList.add('hidden');
        });

        // Contenteditable input handling
        commentInput.addEventListener('input', () => {
            // Use innerText to get plain text, ignore HTML tags
            const commentText = commentInput.innerText || '';
            commentLength = commentText.length;

            // Enforce max length
            if (commentLength > 250) {
                // Trim excess characters
                commentInput.innerText = commentText.substring(0, 250);
                commentLength = 250;

                // Move cursor to end
                placeCursorAtEnd(commentInput);
            }

            charCounter.innerHTML = `${commentLength}/250`;
            sendBtn.disabled = commentLength === 0;
        });

        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentPostId) return alertSystem.show("No post selected!", "error");

            // Get plain text for submission
            let commentText = commentInput.innerText.trim();
            if (!commentText) return;

            sendBtn.disabled = true;

            try {
                const { data: userData } = await supabaseClient.auth.getUser();
                const userId = userData?.user?.id;
                const userName = userData?.user.user_metadata.display_name || "User";

                if (!userId) throw new Error("You must be logged in to comment.");

                // Filter banned words
                let foundBanned = false;
                bannedWords.forEach(word => {
                    const pattern = new RegExp(`\\b${word}\\b[.,!?:;|<>@#$%^&()\\-_=+*]*`, 'gi');
                    if (pattern.test(commentText)) {
                        commentText = commentText.replace(pattern, match => '*'.repeat(match.length));
                        foundBanned = true;
                    }
                });
                if (foundBanned) alertSystem.show("Some inappropriate words were filtered.", 'info');

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
                await loadComments(currentPostId);

            } catch (err) {
                console.error(err);
                alertSystem.show(err.message || "Failed to post comment.", "error");
            } finally {
                sendBtn.disabled = false;
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
    async function loadComments(postId) {
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
                let isOwner = comment.user_id === userId;

                commentsContainer.insertAdjacentHTML(
                    'beforeend',
                    comments(comment.user_name, comment.comment, comment.avatar, commentDate, comment.id, comment.user_id, isOwner, comment.post_id)
                );
            });
        }

        commentsContainer.scrollTop = commentsContainer.scrollHeight;
    }

    async function mentionUser() {
        const commentInput = document.getElementById('commentInput');

        document.addEventListener('click', async (e) => {
            const mentionBtn = e.target.closest('.mention-btn');
            if (!mentionBtn) return;

            const targetUserId = mentionBtn.dataset.userId;
            const commentId = mentionBtn.dataset.commentId;
            const postId = mentionBtn.dataset.postId;

            // Fetch the mentioned user
            const { data: user, error } = await supabaseClient
                .from('profile')
                .select('id, name, avatar_url')
                .eq('id', targetUserId)
                .single();

            if (!user || !user.name) return;

            // Insert the styled mention in the comment input
            const mentionHTML = `<span contenteditable="false" class="text-blue-500">@${user.name}</span>&nbsp;`;
            insertAtCursor(commentInput, mentionHTML);

            // Trigger input event to update counter
            commentInput.dispatchEvent(new Event('input'));

            // Create a notification for the mentioned user
            try {
                const { data: currentUser } = await supabaseClient.auth.getUser();
                const senderId = currentUser?.user?.id;
                const senderName = currentUser?.user?.user_metadata.display_name || 'User';
                const senderAvatar = currentUser?.user?.user_metadata.avatar_url || '../images/defaultAvatar.jpg';

                if (!senderId) return; // not logged in

                // Construct notification message
                const message = `${senderName} mentioned you in a comment`;

                // Insert into notifications table
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

        // Convert HTML string to document fragment
        const frag = range.createContextualFragment(html);
        range.insertNode(frag);

        // Move cursor after inserted node
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }




    // =======================
    // INITIALIZE
    // =======================
    await loadUser();
    deletePermanently();
    mentionUser();
    openComments();
    initFollowButtons();
    setTimeout(updateLikeButtonStates, 500);

    // Realtime posts updates
    supabaseClient
        .channel('public:posts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
            if (!displayedPostIds.has(payload.new.id)) {
                renderPost(payload.new, 'afterbegin');
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
            const postEl = document.querySelector(`.post[data-post-id="${payload.old.id}"]`);
            if (postEl) {
                postEl.remove();
                displayedPostIds.delete(payload.old.id);
            }
        })
        .subscribe();

    await getPosts();

});