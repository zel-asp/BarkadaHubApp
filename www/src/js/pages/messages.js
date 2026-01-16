import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import messageItem, { createEmptyMessageState, directMessage } from '../render/message.js';

document.addEventListener("DOMContentLoaded", () => {
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
    let isSendingMessage = false; // Track if message is being sent

    async function render() {
        /* -----------------------------------------
        AUTH USER
        ----------------------------------------- */
        const { data: userData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) {
            console.error(authError);
            return;
        }

        currentUserId = userData?.user?.id;
        if (!currentUserId) return;

        // Get current user's name
        if (userData?.user) {
            currentUserName = userData.user.user_metadata?.name ||
                userData.user.user_metadata?.full_name ||
                userData.user.email?.split('@')[0] ||
                'You';
        }

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
            return;
        }

        if (!messages || messages.length === 0) {
            messageContainer.innerHTML = createEmptyMessageState();
            return;
        }

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

        const clubIds = [
            ...new Set(
                clubMessages
                    .map(m => m.friends_id)
                    .filter(Boolean)
            )
        ];

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
        HELPER
        ----------------------------------------- */
        const formatTime = date =>
            new Date(date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

        const formatDate = date =>
            new Date(date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });

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
            formatDate: formatDate(mes.created_at)
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
            formatDate: formatDate(mes.created_at)
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
            formatDate: formatDate(mes.created_at)
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

        // Fetch chat messages
        const { data, error } = await fetchMessages(conversationId);

        if (error) {
            console.error(error);
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
        CAMERA BUTTON HANDLER
    ------------------------------------------- */
    cameraBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';

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
        FORMAT MESSAGE FOR DISPLAY - WITH SENDER NAME
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

        // For current user's messages, don't show name
        // For other users' messages, show sender name
        if (isCurrentUser) {
            return `
                <div class="mb-4 text-right" data-message-id="${msg.id}" data-sender-id="${msg.sender_id}">
                    <div class="inline-block max-w-xs lg:max-w-md bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2">
                        <div class="text-sm wrap-break-word overflow-hidden message-content">${contentHTML}</div>
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
                        <div class="text-sm wrap-break-word overflow-hidden message-content">${contentHTML}</div>
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

        // Scroll to bottom when new content is added
        const observer = new MutationObserver(() => {
            scrollToBottom();
        });

        observer.observe(chatBody, { childList: true, subtree: true });
    }

    /* -------------------------------------------
        SEND MESSAGE HANDLER
    ------------------------------------------- */
    sendBtn.addEventListener('click', async () => {
        if (isSendingMessage) return; // Prevent multiple sends

        const messageText = messageInput.value.trim();

        if (!messageText && !currentMediaFile) return;

        if (!currentConversation || !currentUserId) {
            alert('No conversation selected');
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
                            alert('File upload not available. Please try sending text only or a smaller image (<5MB).');
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

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
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
                        sender_name: currentUserName, // Include sender name
                        content: finalContent,
                        friend_name: currentConversation.friendName,
                        friend_avatar: currentConversation.friendAvatar
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            // Update latest message in the message table for instant UI update
            await supabaseClient
                .from('message')
                .update({
                    latest_message: originalText || (currentMediaFile ? `Shared ${currentMediaType}` : ''),
                    created_at: new Date().toISOString()
                })
                .eq('conversation_id', currentConversation.id)
                .eq('user_id', currentUserId);

            console.log('Message sent successfully');

            // Add message to UI immediately (optimistic update)
            // For current user, show without name
            addMessageToUI(finalContent, true);

        } catch (error) {
            console.error('Error in sendMessageToDatabase:', error);
            throw error;
        }
    }

    /* -------------------------------------------
        ADD MESSAGE TO UI (OPTIMISTIC UPDATE)
    ------------------------------------------- */
    function addMessageToUI(content, isCurrentUser = true) {
        const messagesContainer = document.querySelector('#directMessage #messagesContainer');
        if (!messagesContainer) return;

        const messageDate = new Date();
        const timeString = messageDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (isCurrentUser) {
            const messageElement = `
                <div class="mb-4 text-right" data-temp-message="true">
                    <div class="inline-block max-w-xs lg:max-w-md bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2">
                        <div class="text-sm wrap-break-word overflow-hidden message-content">${content}</div>
                        <div class="text-xs mt-1 text-blue-100">${timeString}</div>
                    </div>
                </div>
            `;
            messagesContainer.innerHTML += messageElement;
        } else {
            const messageElement = `
                <div class="mb-4 text-left" data-temp-message="true">
                    <div class="inline-block max-w-xs lg:max-w-md bg-gray-200 text-gray-800 rounded-2xl rounded-tl-none px-4 py-2">
                        <div class="text-sm wrap-break-word overflow-hidden message-content">${content}</div>
                        <div class="text-xs mt-1 text-gray-500">${timeString}</div>
                    </div>
                </div>
            `;
            messagesContainer.innerHTML += messageElement;
        }

        scrollToBottom();
    }

    /* -------------------------------------------
        SETUP REAL-TIME SUBSCRIPTION
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
            .subscribe(
                (status) => {
                    console.log('Subscription status:', status);
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