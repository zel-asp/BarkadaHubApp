import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import messageItem, { createEmptyMessageState, directMessage } from '../render/message.js';

document.addEventListener("DOMContentLoaded", () => {
    const alertSystem = new AlertSystem();

    const backIcon = document.getElementById("backIcon");
    if (!backIcon) return;

    backIcon.addEventListener("click", (e) => {
        e.preventDefault();

        const previousPage = localStorage.getItem("messages_from");

        window.location.href = previousPage || "./home.html";
    });

    const clubMessage = document.getElementById('club-message');
    const friendsMessage = document.getElementById('friends-message');
    const lostMessage = document.getElementById('lost-message');
    const messageContainer = document.getElementById('messagesContainer');
    const app = document.getElementById('app');

    // Store current conversation data
    let currentConversation = null;
    let currentUserId = null;
    let currentUserName = 'You'; // Store current user's name
    let currentMessages = [];
    let activeSubscription = null;
    let isSendingMessage = false;

    async function render() {
        /* -----------------------------------------
           AUTH USER
        ----------------------------------------- */
        const { data: userData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) {
            console.error(authError);
            alertSystem.show('Authentication error. Please try again.', 'error');
            return;
        }

        currentUserId = userData?.user?.id;
        if (!currentUserId) {
            alertSystem.show('User not found. Please log in again.', 'error');
            return;
        }

        // Get current user's name
        currentUserName = userData.user?.user_metadata?.name ||
            userData.user?.user_metadata?.full_name ||
            userData.user?.email?.split('@')[0] ||
            'You';

        /* -----------------------------------------
           FETCH ALL USER MESSAGES
        ----------------------------------------- */
        const { data: messages, error } = await supabaseClient
            .from('message')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            alertSystem.show('Failed to load messages.', 'error');
            return;
        }

        if (!messages || messages.length === 0) {
            messageContainer.innerHTML = createEmptyMessageState();
            return;
        }

        /* -----------------------------------------
           FETCH UNREAD CHAT MESSAGES
        ----------------------------------------- */
        const { data: unreadRows, error: unreadError } = await supabaseClient
            .from('chat_messages')
            .select('conversation_id')
            .eq('is_seen', false)
            .neq('sender_id', currentUserId);

        if (unreadError) {
            console.error('Unread fetch error:', unreadError);
        }

        const unreadMap = {};
        (unreadRows || []).forEach(row => {
            unreadMap[row.conversation_id] = true; // true = has unread
        });

        /* -----------------------------------------
           SPLIT BY RELATION
        ----------------------------------------- */
        const friendMessages = messages.filter(m => m.relation === 'friend');
        const clubMessages = messages.filter(m => m.relation === 'club');
        const lostFoundMessages = messages.filter(m => m.relation === 'lost & found');

        /* -----------------------------------------
           CLUB MEMBER COUNTS
        ----------------------------------------- */
        const membersCountMap = {};
        const clubIds = [...new Set(clubMessages.map(m => m.friends_id).filter(Boolean))];

        for (const clubId of clubIds) {
            const { count, error: countError } = await supabaseClient
                .from('club_members')
                .select('user_id', { count: 'exact', head: true })
                .eq('club_id', clubId);

            if (countError) {
                console.error('Club count error:', countError);
                membersCountMap[clubId] = 0;
            } else {
                membersCountMap[clubId] = count || 0;
            }
        }

        /* -----------------------------------------
           HELPER FUNCTIONS
        ----------------------------------------- */
        const formatTime = date =>
            new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const formatDate = date =>
            new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        /* -----------------------------------------
           RENDER FRIENDS
        ----------------------------------------- */
        friendsMessage.innerHTML = friendMessages.map(mes => messageItem({
            relation: mes.relation,
            name: mes.friend_name,
            avatar: mes.friend_avatar,
            timestamp: formatTime(mes.created_at),
            badgeText: mes.relation,
            subtitle: 'Tap to chat',
            conversationId: mes.conversation_id,
            firendId: mes.friends_id,
            formatDate: formatDate(mes.created_at),
            isSeen: !unreadMap[mes.conversation_id] // true = seen, false = unread
        })).join('');

        /* -----------------------------------------
           RENDER CLUBS
        ----------------------------------------- */
        clubMessage.innerHTML = clubMessages.map(mes => messageItem({
            relation: mes.relation,
            name: mes.friend_name,
            avatar: mes.friend_avatar,
            timestamp: formatTime(mes.created_at),
            badgeText: mes.relation,
            members: membersCountMap[mes.friends_id] || 0,
            subtitle: 'Tap to chat',
            conversationId: mes.conversation_id,
            firendId: mes.friends_id,
            formatDate: formatDate(mes.created_at),
            isSeen: !unreadMap[mes.conversation_id]
        })).join('');

        /* -----------------------------------------
           RENDER LOST & FOUND
        ----------------------------------------- */
        lostMessage.innerHTML = lostFoundMessages.map(mes => messageItem({
            relation: mes.relation,
            name: mes.friend_name,
            avatar: mes.friend_avatar,
            timestamp: formatTime(mes.created_at),
            badgeText: mes.relation,
            subtitle: mes.latest_message || 'Tap to chat',
            conversationId: mes.conversation_id,
            firendId: mes.friends_id,
            formatDate: formatDate(mes.created_at),
            isSeen: !unreadMap[mes.conversation_id]
        })).join('');
    }

    render();

    document.addEventListener('click', async (e) => {
        const selectedChat = e.target.closest('.selectedMessage');
        if (!selectedChat) return;

        const conversationId = selectedChat.dataset.conversationId;
        const friendName = selectedChat.dataset.name;
        const friendAvatar = selectedChat.dataset.avatar;
        const relation = selectedChat.dataset.relation;
        const date = selectedChat.dataset.date;
        const members = selectedChat.dataset.members;
        const friendId = selectedChat.dataset.friendid;

        // Store current conversation data
        currentConversation = {
            id: conversationId,
            friendName,
            friendAvatar,
            relation,
            friendId
        };

        const directMessageContainer = document.getElementById('directMessage');
        const directMessageModal = document.getElementById('directMessageModal');

        app.classList.add('hidden');
        directMessageModal.classList.remove('hidden');

        // ------------------ MARK MESSAGES AS SEEN ------------------
        try {
            const { data: updated, error: updateError } = await supabaseClient
                .from('chat_messages')
                .update({ is_seen: true })
                .eq('conversation_id', conversationId)
                .eq('is_seen', false);

            if (updateError) {
                console.error('Error updating messages as seen:', updateError);
            } else {
                console.log(`Marked ${updated?.length || 0} messages as seen in conversation ${conversationId}`);
            }
        } catch (err) {
            console.error('Unexpected error updating is_seen:', err);
        }

        // Fetch chat messages
        const { data, error } = await fetchMessages(conversationId);

        if (error) {
            console.error(error);
            alertSystem.show('Failed to load chat messages.', 'error');
            return;
        }

        currentMessages = data || [];

        // Format messages for display
        const renderedMessages = await Promise.all(currentMessages.map(msg => formatMessageForDisplay(msg)));

        directMessageContainer.innerHTML = directMessage(
            friendName,
            friendAvatar,
            relation,
            members,
            date,
            renderedMessages
        );

        // Set up real-time subscription
        setupRealtimeSubscription(conversationId);

        // Scroll to bottom
        setTimeout(() => {
            scrollToBottom();
        }, 100);

        // Add scroll event listener to maintain scroll position
        setupChatScrolling();

        // Initialize ellipsis buttons for delete functionality
        initEllipsisButtons();
    });


    /* -------------------------------------------
        DOM ELEMENTS AND START OF DIRECT MESSAGE CODE
    ------------------------------------------- */
    const videoBtn = document.getElementById('videoBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const mediaPreviewArea = document.getElementById('mediaPreviewArea');
    const previewContainer = document.getElementById('previewContainer');
    const backToMessages = document.getElementById('backToMessages');

    let currentMediaFile = null;
    let currentMediaType = null;

    // Back button handler
    if (backToMessages) {
        backToMessages.addEventListener('click', (e) => {
            e.preventDefault();
            const directMessageModal = document.getElementById('directMessageModal');
            const app = document.getElementById('app');

            directMessageModal.classList.add('hidden');
            app.classList.remove('hidden');

            // Clear current conversation
            currentConversation = null;
            currentMessages = [];
            messageInput.value = '';
            removeMediaPreview();

            // Reset send button state
            updateSendButtonState();

            // Unsubscribe from real-time updates
            if (activeSubscription) {
                supabaseClient.removeChannel(activeSubscription);
                activeSubscription = null;
            }
        });
    }

    /* -------------------------------------------
        CAMERA BUTTON HANDLER - SIMPLIFIED
    ------------------------------------------- */
    cameraBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = (e) => {
            if (e.target.files?.[0]) {
                currentMediaFile = e.target.files[0];
                currentMediaType = 'image';
                showMediaPreview(currentMediaFile, 'image');
            }
        };

        input.click();
    });

    /* -------------------------------------------
        VIDEO BUTTON HANDLER
    ------------------------------------------- */
    videoBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,image/*';

        input.onchange = (e) => {
            if (e.target.files?.[0]) {
                currentMediaFile = e.target.files[0];
                const fileType = currentMediaFile.type.startsWith('video/') ? 'video' : 'image';
                currentMediaType = fileType;
                showMediaPreview(currentMediaFile, fileType);
            }
        };

        input.click();
    });

    /* -------------------------------------------
        SHOW MEDIA PREVIEW
    ------------------------------------------- */
    function showMediaPreview(file, type) {
        previewContainer.innerHTML = '';

        let mediaElement;
        if (type === 'image') {
            mediaElement = document.createElement('img');
            mediaElement.src = URL.createObjectURL(file);
            mediaElement.className = 'w-40 h-40 object-cover rounded-lg';
        } else if (type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = URL.createObjectURL(file);
            mediaElement.className = 'w-40 h-40 object-cover rounded-lg';
            mediaElement.controls = true;
            mediaElement.muted = true;
        }
        previewContainer.appendChild(mediaElement);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors';
        removeBtn.innerHTML = '<i class="fas fa-times text-xs"></i>';
        removeBtn.onclick = removeMediaPreview;
        previewContainer.appendChild(removeBtn);

        mediaPreviewArea.classList.remove('hidden');
        updateSendButtonState();
    }

    /* -------------------------------------------
        REMOVE MEDIA PREVIEW
    ------------------------------------------- */
    function removeMediaPreview() {
        previewContainer.innerHTML = '';
        mediaPreviewArea.classList.add('hidden');
        currentMediaFile = null;
        currentMediaType = null;
        updateSendButtonState();
    }

    /* -------------------------------------------
        UPDATE SEND BUTTON STATE
    ------------------------------------------- */
    function updateSendButtonState() {
        const hasContent = messageInput.value.trim().length > 0 || currentMediaFile;
        sendBtn.disabled = isSendingMessage || !hasContent;

        if (isSendingMessage) {
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else if (hasContent) {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    /* -------------------------------------------
        FETCH MESSAGES FUNCTION
    ------------------------------------------- */
    async function fetchMessages(conversationId) {
        return await supabaseClient
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
    }

    /* -------------------------------------------
        UPLOAD FILE TO STORAGE
    ------------------------------------------- */
    async function uploadFileToStorage(file, conversationId) {
        try {
            // Create a folder structure: chat-media/{conversationId}/{timestamp_filename}
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const fileName = `${timestamp}_${randomString}.${fileExt}`;
            const filePath = `${conversationId}/${fileName}`;

            console.log('Uploading file to path:', filePath);

            // Upload file to Supabase Storage
            const { data, error } = await supabaseClient.storage
                .from('chat-media')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (error) {
                console.error('Storage upload error:', error);

                // For bucket permission errors, use data URL fallback
                if (error.message.includes('bucket') || error.code === '400' || error.message.includes('policy')) {
                    console.log('Storage bucket access issue, using data URL fallback');
                    throw new Error('STORAGE_UNAVAILABLE');
                }
                throw error;
            }

            console.log('Upload successful');

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from('chat-media')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;
            console.log('Public URL:', publicUrl);

            return {
                url: publicUrl,
                type: file.type.startsWith('video/') ? 'video' : 'image',
                fileName: file.name,
                path: filePath
            };

        } catch (error) {
            console.error('Error in uploadFileToStorage:', error);

            // Re-throw the error for the calling function to handle
            if (error.message === 'STORAGE_UNAVAILABLE') {
                throw error;
            }

            // For other errors, also use fallback
            throw new Error('STORAGE_UNAVAILABLE');
        }
    }

    /* -------------------------------------------
        DELETE FILE FROM STORAGE
    ------------------------------------------- */
    async function deleteFileFromStorage(filePath) {
        try {
            if (!filePath) return;

            console.log('Deleting file from storage:', filePath);

            const { data, error } = await supabaseClient.storage
                .from('chat-media')
                .remove([filePath]);

            if (error) {
                console.error('Error deleting file from storage:', error);
                return false;
            }

            console.log('File deleted from storage:', data);
            return true;

        } catch (error) {
            console.error('Error in deleteFileFromStorage:', error);
            return false;
        }
    }

    /* -------------------------------------------
        EXTRACT FILE PATH FROM MESSAGE CONTENT
    ------------------------------------------- */
    function extractFilePathFromContent(content) {
        try {
            // Check if content contains Supabase storage URL
            const storagePattern = /https:\/\/[^\/]+\/storage\/v1\/object\/public\/chat-media\/([^"'\s]+)/;
            const match = content.match(storagePattern);

            if (match && match[1]) {
                return match[1];
            }

            return null;
        } catch (error) {
            console.error('Error extracting file path:', error);
            return null;
        }
    }

    /* -------------------------------------------
        DELETE MESSAGE FUNCTION
    ------------------------------------------- */
    async function deleteMessage(messageId, content, senderId) {
        // Check if current user is the sender
        if (senderId !== currentUserId) {
            alertSystem.show('You can only delete your own messages.', 'error');
            return false;
        }

        try {
            // Extract file path if it's a media message
            const filePath = extractFilePathFromContent(content);

            // Delete file from storage if it exists
            if (filePath) {
                const storageDeleted = await deleteFileFromStorage(filePath);
                if (!storageDeleted) {
                    console.warn('Failed to delete file from storage, but continuing with message deletion');
                }
            }

            // Delete message from database
            const { error } = await supabaseClient
                .from('chat_messages')
                .delete()
                .eq('id', messageId);

            if (error) {
                console.error('Error deleting message from database:', error);
                alertSystem.show('Failed to delete message. Please try again.', 'error');
                return false;
            }

            console.log('Message deleted successfully');
            alertSystem.show('Message deleted successfully.', 'success');
            return true;

        } catch (error) {
            console.error('Error in deleteMessage:', error);
            alertSystem.show('An error occurred while deleting the message.', 'error');
            return false;
        }
    }

    /* -------------------------------------------
        INITIALIZE ELLIPSIS BUTTONS FOR DELETE
    ------------------------------------------- */
    function initEllipsisButtons() {
        // Add click event to message containers to show ellipsis
        document.addEventListener('click', (e) => {
            const messageContainer = e.target.closest('[data-message-id]');

            if (!messageContainer) {
                // Hide all ellipsis menus if clicking outside
                hideAllEllipsisMenus();
                return;
            }

            // Check if clicking on ellipsis button or message bubble
            if (e.target.closest('.message-ellipsis-btn')) {
                const messageId = messageContainer.dataset.messageId;
                const senderId = messageContainer.dataset.senderId;
                const messageContent = messageContainer.querySelector('.message-content')?.innerHTML || '';

                // Show ellipsis menu
                showEllipsisMenu(messageId, senderId, messageContent, e);
            } else if (e.target.closest('.message-content')) {
                // Show ellipsis button when clicking on message
                showEllipsisButton(messageContainer);
            }
        });
    }

    /* -------------------------------------------
        SHOW ELLIPSIS BUTTON ON MESSAGE CLICK
    ------------------------------------------- */
    function showEllipsisButton(messageContainer) {
        // Hide any existing ellipsis buttons first
        hideAllEllipsisButtons();

        // Check if this is the current user's message
        const senderId = messageContainer.dataset.senderId;
        if (senderId !== currentUserId) return; // Only show for own messages

        // Create ellipsis button if it doesn't exist
        let ellipsisBtn = messageContainer.querySelector('.message-ellipsis-btn');
        if (!ellipsisBtn) {
            ellipsisBtn = document.createElement('button');
            ellipsisBtn.className = 'message-ellipsis-btn absolute top-1 right-1 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 z-10';
            ellipsisBtn.innerHTML = '<i class="fas fa-ellipsis-h text-gray-600 text-sm"></i>';
            ellipsisBtn.title = 'More options';

            // Add to message container
            messageContainer.style.position = 'relative';
            messageContainer.appendChild(ellipsisBtn);
        }

        // Show the ellipsis button
        ellipsisBtn.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (ellipsisBtn && !ellipsisBtn.matches(':hover')) {
                ellipsisBtn.classList.add('hidden');
            }
        }, 5000);
    }

    /* -------------------------------------------
        HIDE ALL ELLIPSIS BUTTONS
    ------------------------------------------- */
    function hideAllEllipsisButtons() {
        document.querySelectorAll('.message-ellipsis-btn').forEach(btn => {
            btn.classList.add('hidden');
        });
    }

    /* -------------------------------------------
        SHOW ELLIPSIS MENU
    ------------------------------------------- */
    function showEllipsisMenu(messageId, senderId, content, event) {
        // Hide any existing menus first
        hideAllEllipsisMenus();

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'fixed bg-white rounded-lg shadow-lg py-2 min-w-[150px] z-50 border border-gray-200';
        menu.innerHTML = `
            <button class="delete-message-btn w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center gap-2">
                <i class="fas fa-trash text-sm"></i>
                <span class="text-sm">Delete Message</span>
            </button>
        `;

        // Position menu near the click
        const clickX = event.clientX;
        const clickY = event.clientY;
        const menuWidth = 150;
        const menuHeight = 40;

        // Adjust position to fit within viewport
        let left = clickX;
        let top = clickY;

        if (clickX + menuWidth > window.innerWidth) {
            left = window.innerWidth - menuWidth - 10;
        }

        if (clickY + menuHeight > window.innerHeight) {
            top = window.innerHeight - menuHeight - 10;
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;

        document.body.appendChild(menu);

        // Handle delete button click
        const deleteBtn = menu.querySelector('.delete-message-btn');
        deleteBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to delete this message? This action cannot be undone.');

            if (confirmed) {
                try {
                    const success = await deleteMessage(messageId, content, senderId);

                    if (success) {
                        // Remove the message from UI
                        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
                        if (messageElement) {
                            messageElement.remove();
                        }
                    }
                } catch (error) {
                    console.error('Error in delete handler:', error);
                    alertSystem.show('Failed to delete message. Please try again.', 'error');
                }
            }

            // Remove menu
            if (menu.parentNode) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeMenu);
        });

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !e.target.closest('.message-ellipsis-btn')) {
                // Check if menu still exists in DOM before removing
                if (menu.parentNode) {
                    document.body.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    /* -------------------------------------------
        HIDE ALL ELLIPSIS MENUS
    ------------------------------------------- */
    function hideAllEllipsisMenus() {
        const menus = document.querySelectorAll('.fixed.bg-white.rounded-lg.shadow-lg.py-2');
        menus.forEach(menu => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
        });
    }

    /* -------------------------------------------
        GET USER DISPLAY NAME
    ------------------------------------------- */
    async function getUserDisplayName(userId) {
        // If it's the current user, return cached name
        if (userId === currentUserId) {
            return currentUserName;
        }

        try {
            // First, check if we have a profiles table
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('full_name, username, name')
                .eq('id', userId)
                .single();

            if (!profileError && profileData) {
                return profileData.full_name || profileData.name || profileData.username || 'Unknown User';
            }

            // If no profiles table or user not found, try to get from auth metadata
            // Note: This requires appropriate RLS policies
            const { data: authData, error: authError } = await supabaseClient.auth.admin.getUserById(userId);

            if (!authError && authData?.user) {
                return authData.user.user_metadata?.name ||
                    authData.user.user_metadata?.full_name ||
                    authData.user.email?.split('@')[0] ||
                    'Unknown User';
            }

            return 'Unknown User';
        } catch (error) {
            console.error('Error getting user display name:', error);
            return 'Unknown User';
        }
    }

    /* -------------------------------------------
        FORMAT MESSAGE FOR DISPLAY - WITH SENDER NAME AND DELETE OPTION
    ------------------------------------------- */
    async function formatMessageForDisplay(msg) {
        const isCurrentUser = msg.sender_id === currentUserId;
        const messageDate = new Date(msg.created_at);
        const timeString = messageDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Get sender name - use from message if available, otherwise fetch it
        let senderName = msg.sender_name;

        if (!senderName && msg.sender_id) {
            senderName = await getUserDisplayName(msg.sender_id);
        }

        // Check what type of content we have
        let contentHTML = msg.content || '';

        // If it's already HTML with <img> or <video> tags, use it as is
        if (contentHTML.includes('<img ') || contentHTML.includes('<video ') ||
            contentHTML.includes('data:image/') || contentHTML.includes('supabase.co/storage/')) {
            // Content is already HTML or contains media URLs
            // No need to escape or modify
        } else {
            // It's plain text - escape it for safety
            const div = document.createElement('div');
            div.textContent = contentHTML;
            contentHTML = div.innerHTML;
        }

        // For current user's messages, don't show name but add delete option
        // For other users' messages, show sender name
        if (isCurrentUser) {
            return `
                <div class="mb-4 text-right relative" data-message-id="${msg.id}" data-sender-id="${msg.sender_id}">
                    <div class="inline-block max-w-xs lg:max-w-md bg-primary text-white rounded-2xl rounded-tr-none px-4 py-2 hover:bg-blue-700 transition-colors cursor-pointer message-content">
                        <div class="text-sm wrap-break-word overflow-hidden">${contentHTML}</div>
                        <div class="text-xs mt-1 text-blue-100">
                            ${timeString}
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="mb-4 text-left" data-message-id="${msg.id}" data-sender-id="${msg.sender_id}">
                    <div class="flex items-start gap-2 mb-1">
                        <div class="text-xs font-medium text-gray-700">
                            ${escapeHtml(senderName)}
                        </div>
                    </div>
                    <div class="inline-block max-w-xs lg:max-w-md bg-gray-200 text-gray-800 rounded-2xl rounded-tl-none px-4 py-2">
                        <div class="text-sm wrap-break-word overflow-hidden">${contentHTML}</div>
                        <div class="text-xs mt-1 text-gray-500">
                            ${timeString}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /* -------------------------------------------
        HELPER FUNCTIONS
    ------------------------------------------- */
    function getVideoMimeType(url) {
        const ext = url.split('.').pop().split('?')[0].toLowerCase();
        const mimeTypes = {
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'webm': 'video/webm',
            'avi': 'video/x-msvideo',
            'mkv': 'video/x-matroska'
        };
        return mimeTypes[ext] || 'video/mp4';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* -------------------------------------------
        SETUP CHAT SCROLLING
    ------------------------------------------- */
    function setupChatScrolling() {
        const chatBody = document.querySelector('#directMessage .overflow-y-auto');
        if (!chatBody) return;

        // Ensure chat body has proper scrolling
        chatBody.style.overflowY = 'auto';
        chatBody.style.maxHeight = 'calc(100vh - 200px)';


    }

    /* -------------------------------------------
        SEND MESSAGE HANDLER
    ------------------------------------------- */
    sendBtn.addEventListener('click', async () => {
        if (isSendingMessage) return;

        const messageText = messageInput.value.trim();

        if (!messageText && !currentMediaFile) {
            alertSystem.show('Please enter a message or attach a file.', 'info');
            return;
        }

        if (!currentConversation || !currentUserId) {
            alertSystem.show('No conversation selected.', 'error');
            return;
        }

        try {
            isSendingMessage = true;
            updateSendButtonState();

            let textContent = messageText || '';
            let mediaHtml = '';

            // Handle media upload
            if (currentMediaFile) {
                try {
                    const uploadResult = await uploadFileToStorage(currentMediaFile, currentConversation.id);

                    if (uploadResult.type === 'image') {
                        mediaHtml = `<img src="${uploadResult.url}" alt="Shared image" class="max-w-xs rounded-lg mt-1" style="max-height: 300px; max-width: 100%;" loading="lazy">`;
                    } else if (uploadResult.type === 'video') {
                        mediaHtml = `<video controls class="max-w-xs rounded-lg mt-1" preload="metadata" style="max-height: 300px; max-width: 100%;"><source src="${uploadResult.url}" type="${getVideoMimeType(uploadResult.url)}"></video>`;
                    }

                } catch (uploadError) {
                    if (uploadError.message === 'STORAGE_UNAVAILABLE') {
                        // Use data URL as fallback for images only
                        if (currentMediaFile.type.startsWith('image/') && currentMediaFile.size < 5000000) {
                            const reader = new FileReader();
                            const dataUrl = await new Promise((resolve, reject) => {
                                reader.onload = () => resolve(reader.result);
                                reader.onerror = reject;
                                reader.readAsDataURL(currentMediaFile);
                            });

                            mediaHtml = `<img src="${dataUrl}" alt="Shared image" class="max-w-xs rounded-lg mt-1" style="max-height: 300px; max-width: 100%;" loading="lazy">`;
                        } else {
                            alertSystem.show('File upload not available. Please try sending text only or a smaller image (<5MB).', 'error');
                            isSendingMessage = false;
                            updateSendButtonState();
                            return;
                        }
                    } else {
                        throw uploadError;
                    }
                }
            }

            // Combine text and media
            let finalContent = '';
            if (textContent && mediaHtml) {
                finalContent = `${escapeHtml(textContent)}<br>${mediaHtml}`;
            } else if (textContent) {
                finalContent = escapeHtml(textContent);
            } else if (mediaHtml) {
                finalContent = mediaHtml;
            }

            // Send the message to database
            await sendMessageToDatabase(finalContent, messageText);

            // Clear input and reset button
            messageInput.value = '';
            if (currentMediaFile) removeMediaPreview();

            isSendingMessage = false;
            updateSendButtonState();

            // Focus back on input
            messageInput.focus();

            render();

            // REMOVED: Don't add optimistic update here - real-time subscription will handle it

        } catch (error) {
            console.error('Error sending message:', error);
            alertSystem.show('Failed to send message. Please try again.', 'error');
            isSendingMessage = false;
            updateSendButtonState();
        }
    });

    /* -------------------------------------------
        SEND MESSAGE TO DATABASE - WITH SENDER NAME
    ------------------------------------------- */
    async function sendMessageToDatabase(finalContent, originalText) {
        try {
            // Insert message into chat_messages table with sender name
            const { data, error } = await supabaseClient
                .from('chat_messages')
                .insert([
                    {
                        conversation_id: currentConversation.id,
                        sender_id: currentUserId,
                        sender_name: currentUserName,
                        content: finalContent,
                        friend_name: currentConversation.friendName,
                        friend_avatar: currentConversation.friendAvatar
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            await supabaseClient
                .from('message')
                .update({
                    latest_message: originalText || (currentMediaFile ? `Shared ${currentMediaType}` : ''),
                    created_at: new Date().toISOString(),
                })
                .eq('conversation_id', currentConversation.id)
                .eq('user_id', currentUserId);

        } catch (error) {
            console.error('Error in sendMessageToDatabase:', error);
            throw error;
        }
    }

    /* -------------------------------------------
        SETUP REAL-TIME SUBSCRIPTION WITH DELETE HANDLING
    ------------------------------------------- */
    function setupRealtimeSubscription(conversationId) {
        // Unsubscribe from previous subscription if exists
        if (activeSubscription) {
            supabaseClient.removeChannel(activeSubscription);
            activeSubscription = null;
        }

        // Create new subscription with better error handling
        activeSubscription = supabaseClient
            .channel(`conversation:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                async (payload) => {
                    console.log('Realtime update received:', payload);

                    // Skip if this is our own message (handled by optimistic update)
                    if (payload.new.sender_id === currentUserId) {
                        // Remove temporary message if exists
                        const tempMsg = document.querySelector('[data-temp-message="true"]');
                        if (tempMsg) {
                            tempMsg.remove();
                        }

                        // Add the actual message with proper formatting
                        const messageElement = await formatMessageForDisplay(payload.new);
                        const messagesContainer = document.querySelector('#directMessage #messagesContainer');
                        if (messagesContainer) {
                            messagesContainer.innerHTML += messageElement;
                            scrollToBottom();
                        }
                        return;
                    }

                    // Add message from other person
                    const messageElement = await formatMessageForDisplay(payload.new);
                    const messagesContainer = document.querySelector('#directMessage #messagesContainer');

                    if (messagesContainer) {
                        messagesContainer.innerHTML += messageElement;
                        scrollToBottom();

                        // Update the messages list on the main page
                        updateMessagesList(payload.new);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    console.log('Message deleted:', payload.old);

                    // Remove the message from UI
                    const messageElement = document.querySelector(`[data-message-id="${payload.old.id}"]`);
                    if (messageElement) {
                        messageElement.remove();
                    }
                }
            )
            .subscribe(
                (status) => {
                    console.log('Subscription status:', status);
                    if (status === 'SUBSCRIBED') {
                        console.log('Successfully subscribed to real-time updates');
                    } else if (status === 'CHANNEL_ERROR') {
                        alertSystem.show('Failed to connect to real-time updates.', 'error');
                    }
                }
            );

        return activeSubscription;
    }

    /* -------------------------------------------
        UPDATE MESSAGES LIST
    ------------------------------------------- */
    function updateMessagesList(newMessage) {
        // Update the conversation in the messages list
        const conversationElements = document.querySelectorAll(`[data-conversation-id="${newMessage.conversation_id}"]`);

        conversationElements.forEach(element => {
            const subtitle = element.querySelector('.text-xs.text-gray-500');
            if (subtitle) {
                // Create a temporary div to extract text from HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newMessage.content;

                // Remove image/video tags for preview
                tempDiv.querySelectorAll('img, video').forEach(el => el.remove());

                let messageText = tempDiv.textContent || tempDiv.innerText || '';
                messageText = messageText.trim();

                const cleanText = messageText.substring(0, 30);
                subtitle.textContent = cleanText + (messageText.length >= 30 ? '...' : '');
            }

            const timestamp = element.querySelector('.text-xs.font-medium.text-gray-400');
            if (timestamp) {
                const messageDate = new Date(newMessage.created_at);
                timestamp.textContent = messageDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        });
    }

    /* -------------------------------------------
        SCROLL CHAT TO BOTTOM
    ------------------------------------------- */
    function scrollToBottom() {
        const chatBody = document.querySelector('#directMessage .overflow-y-auto');
        if (chatBody) {
            // Use requestAnimationFrame for smoother scrolling
            requestAnimationFrame(() => {
                chatBody.scrollTop = chatBody.scrollHeight;
            });
        }
    }

    /* -------------------------------------------
        SEND MESSAGE ON ENTER KEY
    ------------------------------------------- */
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isSendingMessage) {
                sendBtn.click();
            }
        }
    });

    /* -------------------------------------------
        UPDATE SEND BUTTON ON INPUT
    ------------------------------------------- */
    messageInput.addEventListener('input', () => {
        updateSendButtonState();
    });

    // Initialize send button state
    updateSendButtonState();
});