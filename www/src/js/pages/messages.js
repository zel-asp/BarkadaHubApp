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
    const searchInput = document.querySelector('input[type="text"]');

    // store current conversation data
    let currentConversation = null;
    let currentUserId = null;
    let currentUserName = 'You';
    let currentMessages = [];
    let activeSubscription = null;
    let isSendingMessage = false;

    // store all messages for search functionality
    let allMessages = {
        friends: [],
        clubs: [],
        lost: []
    };
    let filteredMessages = {
        friends: [],
        clubs: [],
        lost: []
    };

    async function render() {
        // auth user
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

        // get current user's name
        currentUserName = userData.user?.user_metadata?.name ||
            userData.user?.user_metadata?.full_name ||
            userData.user?.email?.split('@')[0] ||
            'You';

        // fetch all user messages
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

        // fetch unread chat messages
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
            unreadMap[row.conversation_id] = true;
        });

        // split by relation
        const friendMessages = messages.filter(m => m.relation === 'friend');
        const clubMessages = messages.filter(m => m.relation === 'club');
        const lostFoundMessages = messages.filter(m => m.relation === 'lost & found');

        // store all messages for search
        allMessages.friends = friendMessages;
        allMessages.clubs = clubMessages;
        allMessages.lost = lostFoundMessages;

        // initially show all messages
        filteredMessages.friends = friendMessages;
        filteredMessages.clubs = clubMessages;
        filteredMessages.lost = lostFoundMessages;

        // club member counts
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

        // helper functions
        const formatTime = date =>
            new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const formatDate = date =>
            new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // render messages function
        function renderMessages() {
            // clear existing messages
            friendsMessage.innerHTML = '';
            clubMessage.innerHTML = '';
            lostMessage.innerHTML = '';

            // show/hide sections based on whether they have messages
            const friendsSection = document.querySelector('#friends-message').parentElement;
            const clubSection = document.querySelector('#club-message').parentElement;
            const lostSection = document.querySelector('#lost-message').parentElement;

            // render friends messages
            if (filteredMessages.friends.length > 0) {
                friendsSection.classList.remove('hidden');
                friendsMessage.innerHTML = filteredMessages.friends.map(mes => messageItem({
                    relation: mes.relation,
                    name: mes.friend_name,
                    avatar: mes.friend_avatar,
                    timestamp: formatTime(mes.created_at),
                    badgeText: mes.relation,
                    subtitle: 'Tap to chat',
                    conversationId: mes.conversation_id,
                    firendId: mes.friends_id,
                    formatDate: formatDate(mes.created_at),
                    isSeen: !unreadMap[mes.conversation_id]
                })).join('');
            } else {
                friendsSection.classList.add('hidden');
            }

            // render club messages
            if (filteredMessages.clubs.length > 0) {
                clubSection.classList.remove('hidden');
                clubMessage.innerHTML = filteredMessages.clubs.map(mes => messageItem({
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
            } else {
                clubSection.classList.add('hidden');
            }

            // render lost & found messages
            if (filteredMessages.lost.length > 0) {
                lostSection.classList.remove('hidden');
                lostMessage.innerHTML = filteredMessages.lost.map(mes => messageItem({
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
            } else {
                lostSection.classList.add('hidden');
            }

            // show "no results" message if all sections are hidden and search is active
            const searchTerm = searchInput.value.trim();
            if (searchTerm &&
                filteredMessages.friends.length === 0 &&
                filteredMessages.clubs.length === 0 &&
                filteredMessages.lost.length === 0) {
                showNoResultsMessage(searchTerm);
            } else {
                hideNoResultsMessage();
            }
        }

        // search functionality
        function performSearch(searchTerm) {
            if (!searchTerm) {
                // reset to show all messages
                filteredMessages = {
                    friends: allMessages.friends,
                    clubs: allMessages.clubs,
                    lost: allMessages.lost
                };
                renderMessages();
                return;
            }

            const lowerSearchTerm = searchTerm.toLowerCase();

            // filter friends messages
            filteredMessages.friends = allMessages.friends.filter(message =>
                message.friend_name?.toLowerCase().includes(lowerSearchTerm) ||
                message.relation?.toLowerCase().includes(lowerSearchTerm) ||
                message.latest_message?.toLowerCase().includes(lowerSearchTerm)
            );

            // filter club messages
            filteredMessages.clubs = allMessages.clubs.filter(message =>
                message.friend_name?.toLowerCase().includes(lowerSearchTerm) ||
                message.relation?.toLowerCase().includes(lowerSearchTerm) ||
                message.latest_message?.toLowerCase().includes(lowerSearchTerm) ||
                membersCountMap[message.friends_id]?.toString().includes(searchTerm)
            );

            // filter lost & found messages
            filteredMessages.lost = allMessages.lost.filter(message =>
                message.friend_name?.toLowerCase().includes(lowerSearchTerm) ||
                message.relation?.toLowerCase().includes(lowerSearchTerm) ||
                message.latest_message?.toLowerCase().includes(lowerSearchTerm)
            );

            renderMessages();
        }

        // show no results message
        function showNoResultsMessage(searchTerm) {
            let noResultsDiv = document.getElementById('no-results-message');

            if (!noResultsDiv) {
                noResultsDiv = document.createElement('div');
                noResultsDiv.id = 'no-results-message';
                noResultsDiv.className = 'text-center py-10';

                const messagesContainer = document.querySelector('#messagesContainer');
                if (messagesContainer) {
                    messagesContainer.appendChild(noResultsDiv);
                }
            }

            noResultsDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8">
                    <div class="mb-4 p-4 rounded-full bg-gray-100">
                        <i class="fas fa-search text-3xl text-gray-400"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-700 mb-2">No results found</h3>
                    <p class="text-gray-500 mb-4 max-w-md">
                        No messages found for "<span class="font-semibold text-primary">${escapeHtml(searchTerm)}</span>"
                    </p>
                    <p class="text-gray-400 text-sm">
                        Try searching by name, relation, or message content
                    </p>
                </div>
            `;
        }

        // hide no results message
        function hideNoResultsMessage() {
            const noResultsDiv = document.getElementById('no-results-message');
            if (noResultsDiv) {
                noResultsDiv.remove();
            }
        }

        // escape html helper
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // initial render
        renderMessages();

        // setup search event listeners
        if (searchInput) {
            // search on input with debounce
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    performSearch(e.target.value.trim());
                }, 300);
            });

            // clear search on escape
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    performSearch('');
                    searchInput.blur();
                }
            });

            // clear search on clear button click
            const searchClearBtn = searchInput.parentElement.querySelector('.search-clear');
            if (searchClearBtn) {
                searchClearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    performSearch('');
                    searchInput.focus();
                });
            }
        }
    }

    render();

    // direct message click handler
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

        // store current conversation data
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

        // mark messages as seen
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

        // fetch chat messages
        const { data, error } = await fetchMessages(conversationId);

        if (error) {
            console.error(error);
            alertSystem.show('Failed to load chat messages.', 'error');
            return;
        }

        currentMessages = data || [];

        // format messages for display
        const renderedMessages = await Promise.all(currentMessages.map(msg => formatMessageForDisplay(msg)));

        directMessageContainer.innerHTML = directMessage(
            friendName,
            friendAvatar,
            relation,
            members,
            date,
            renderedMessages
        );

        // set up real-time subscription
        setupRealtimeSubscription(conversationId);

        // scroll to bottom
        setTimeout(() => {
            scrollToBottom();
        }, 100);

        // add scroll event listener to maintain scroll position
        setupChatScrolling();

        // initialize ellipsis buttons for delete functionality
        initEllipsisButtons();
    });

    // dom elements and start of direct message code
    const videoBtn = document.getElementById('videoBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const mediaPreviewArea = document.getElementById('mediaPreviewArea');
    const previewContainer = document.getElementById('previewContainer');
    const backToMessages = document.getElementById('backToMessages');

    let currentMediaFile = null;
    let currentMediaType = null;

    // back button handler
    if (backToMessages) {
        backToMessages.addEventListener('click', (e) => {
            e.preventDefault();
            const directMessageModal = document.getElementById('directMessageModal');
            const app = document.getElementById('app');

            directMessageModal.classList.add('hidden');
            app.classList.remove('hidden');

            // clear current conversation
            currentConversation = null;
            currentMessages = [];
            messageInput.value = '';
            removeMediaPreview();

            // reset send button state
            updateSendButtonState();

            // unsubscribe from real-time updates
            if (activeSubscription) {
                supabaseClient.removeChannel(activeSubscription);
                activeSubscription = null;
            }
        });
    }

    // camera button handler
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

    // video button handler
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

    // show media preview
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

    // remove media preview
    function removeMediaPreview() {
        previewContainer.innerHTML = '';
        mediaPreviewArea.classList.add('hidden');
        currentMediaFile = null;
        currentMediaType = null;
        updateSendButtonState();
    }

    // update send button state
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

    // fetch messages function
    async function fetchMessages(conversationId) {
        return await supabaseClient
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
    }

    // upload file to storage
    async function uploadFileToStorage(file, conversationId) {
        try {
            // create folder structure: chat-media/{conversationId}/{timestamp_filename}
            const fileExt = file.name.split('.').pop();
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const fileName = `${timestamp}_${randomString}.${fileExt}`;
            const filePath = `${conversationId}/${fileName}`;

            // upload file to supabase storage
            const { data, error } = await supabaseClient.storage
                .from('chat-media')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (error) {
                console.error('Storage upload error:', error);

                // for bucket permission errors, use data URL fallback
                if (error.message.includes('bucket') || error.code === '400' || error.message.includes('policy')) {
                    console.log('Storage bucket access issue, using data URL fallback');
                    throw new Error('STORAGE_UNAVAILABLE');
                }
                throw error;
            }

            console.log('Upload successful');

            // get public url
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

            // re-throw the error for the calling function to handle
            if (error.message === 'STORAGE_UNAVAILABLE') {
                throw error;
            }

            // for other errors, also use fallback
            throw new Error('STORAGE_UNAVAILABLE');
        }
    }

    // delete file from storage
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

    // extract file path from message content
    function extractFilePathFromContent(content) {
        try {
            // check if content contains supabase storage url
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

    // delete message function
    async function deleteMessage(messageId, content, senderId) {
        // check if current user is the sender
        if (senderId !== currentUserId) {
            alertSystem.show('You can only delete your own messages.', 'error');
            return false;
        }

        try {
            // extract file path if it's a media message
            const filePath = extractFilePathFromContent(content);

            // delete file from storage if it exists
            if (filePath) {
                const storageDeleted = await deleteFileFromStorage(filePath);
                if (!storageDeleted) {
                    console.warn('Failed to delete file from storage, but continuing with message deletion');
                }
            }

            // delete message from database
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

    // initialize ellipsis buttons for delete
    function initEllipsisButtons() {
        // add click event to message containers to show ellipsis
        document.addEventListener('click', (e) => {
            const messageContainer = e.target.closest('[data-message-id]');

            if (!messageContainer) {
                // hide all ellipsis menus if clicking outside
                hideAllEllipsisMenus();
                return;
            }

            // check if clicking on ellipsis button or message bubble
            if (e.target.closest('.message-ellipsis-btn')) {
                const messageId = messageContainer.dataset.messageId;
                const senderId = messageContainer.dataset.senderId;
                const messageContent = messageContainer.querySelector('.message-content')?.innerHTML || '';

                // show ellipsis menu
                showEllipsisMenu(messageId, senderId, messageContent, e);
            } else if (e.target.closest('.message-content')) {
                // show ellipsis button when clicking on message
                showEllipsisButton(messageContainer);
            }
        });
    }

    // show ellipsis button on message click
    function showEllipsisButton(messageContainer) {
        // hide any existing ellipsis buttons first
        hideAllEllipsisButtons();

        // check if this is the current user's message
        const senderId = messageContainer.dataset.senderId;
        if (senderId !== currentUserId) return;

        // create ellipsis button if it doesn't exist
        let ellipsisBtn = messageContainer.querySelector('.message-ellipsis-btn');
        if (!ellipsisBtn) {
            ellipsisBtn = document.createElement('button');
            ellipsisBtn.className = 'message-ellipsis-btn absolute top-1 right-1 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 z-10';
            ellipsisBtn.innerHTML = '<i class="fas fa-ellipsis-h text-gray-600 text-sm"></i>';
            ellipsisBtn.title = 'More options';

            // add to message container
            messageContainer.style.position = 'relative';
            messageContainer.appendChild(ellipsisBtn);
        }

        // show the ellipsis button
        ellipsisBtn.classList.remove('hidden');

        // auto-hide after 5 seconds
        setTimeout(() => {
            if (ellipsisBtn && !ellipsisBtn.matches(':hover')) {
                ellipsisBtn.classList.add('hidden');
            }
        }, 5000);
    }

    // hide all ellipsis buttons
    function hideAllEllipsisButtons() {
        document.querySelectorAll('.message-ellipsis-btn').forEach(btn => {
            btn.classList.add('hidden');
        });
    }

    // show ellipsis menu
    function showEllipsisMenu(messageId, senderId, content, event) {
        // hide any existing menus first
        hideAllEllipsisMenus();

        // create menu
        const menu = document.createElement('div');
        menu.className = 'fixed bg-white rounded-lg shadow-lg py-2 min-w-[150px] z-50 border border-gray-200';
        menu.innerHTML = `
            <button class="delete-message-btn w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center gap-2">
                <i class="fas fa-trash text-sm"></i>
                <span class="text-sm">Delete Message</span>
            </button>
        `;

        // position menu near the click
        const clickX = event.clientX;
        const clickY = event.clientY;
        const menuWidth = 150;
        const menuHeight = 40;

        // adjust position to fit within viewport
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

        // handle delete button click
        const deleteBtn = menu.querySelector('.delete-message-btn');
        deleteBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to delete this message? This action cannot be undone.');

            if (confirmed) {
                try {
                    const success = await deleteMessage(messageId, content, senderId);

                    if (success) {
                        // remove the message from ui
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

            // remove menu
            if (menu.parentNode) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeMenu);
        });

        // close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !e.target.closest('.message-ellipsis-btn')) {
                // check if menu still exists in dom before removing
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

    // hide all ellipsis menus
    function hideAllEllipsisMenus() {
        const menus = document.querySelectorAll('.fixed.bg-white.rounded-lg.shadow-lg.py-2');
        menus.forEach(menu => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
        });
    }

    // get user display name
    async function getUserDisplayName(userId) {
        // if it's the current user, return cached name
        if (userId === currentUserId) {
            return currentUserName;
        }

        try {
            // check if we have a profiles table
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('full_name, username, name')
                .eq('id', userId)
                .single();

            if (!profileError && profileData) {
                return profileData.full_name || profileData.name || profileData.username || 'Unknown User';
            }

            // if no profiles table or user not found, try to get from auth metadata
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

    // format message for display - with sender name and delete option
    async function formatMessageForDisplay(msg) {
        const isCurrentUser = msg.sender_id === currentUserId;
        const messageDate = new Date(msg.created_at);
        const timeString = messageDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        // get sender name - use from message if available, otherwise fetch it
        let senderName = msg.sender_name;

        if (!senderName && msg.sender_id) {
            senderName = await getUserDisplayName(msg.sender_id);
        }

        // check what type of content we have
        let contentHTML = msg.content || '';

        // if it's already html with <img> or <video> tags, use it as is
        if (contentHTML.includes('<img ') || contentHTML.includes('<video ') ||
            contentHTML.includes('data:image/') || contentHTML.includes('supabase.co/storage/')) {
            // content is already html or contains media urls
        } else {
            // it's plain text - escape it for safety
            const div = document.createElement('div');
            div.textContent = contentHTML;
            contentHTML = div.innerHTML;
        }

        // for current user's messages, don't show name but add delete option
        // for other users' messages, show sender name
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

    // helper functions
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

    // setup chat scrolling
    function setupChatScrolling() {
        const chatBody = document.querySelector('#directMessage .overflow-y-auto');
        if (!chatBody) return;

        // ensure chat body has proper scrolling
        chatBody.style.overflowY = 'auto';
        chatBody.style.maxHeight = 'calc(100vh - 200px)';
    }

    // send message handler
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

            // handle media upload
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
                        // use data url as fallback for images only
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

            // combine text and media
            let finalContent = '';
            if (textContent && mediaHtml) {
                finalContent = `${escapeHtml(textContent)}<br>${mediaHtml}`;
            } else if (textContent) {
                finalContent = escapeHtml(textContent);
            } else if (mediaHtml) {
                finalContent = mediaHtml;
            }

            // send the message to database
            await sendMessageToDatabase(finalContent, messageText);

            // clear input and reset button
            messageInput.value = '';
            if (currentMediaFile) removeMediaPreview();

            isSendingMessage = false;
            updateSendButtonState();

            // focus back on input
            messageInput.focus();

            render();

        } catch (error) {
            console.error('Error sending message:', error);
            alertSystem.show('Failed to send message. Please try again.', 'error');
            isSendingMessage = false;
            updateSendButtonState();
        }
    });

    // send message to database - with sender name
    async function sendMessageToDatabase(finalContent, originalText) {
        try {
            // insert message into chat_messages table with sender name
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

    // setup real-time subscription with delete handling
    function setupRealtimeSubscription(conversationId) {
        // unsubscribe from previous subscription if exists
        if (activeSubscription) {
            supabaseClient.removeChannel(activeSubscription);
            activeSubscription = null;
        }

        // create new subscription with better error handling
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

                    // skip if this is our own message
                    if (payload.new.sender_id === currentUserId) {
                        // remove temporary message if exists
                        const tempMsg = document.querySelector('[data-temp-message="true"]');
                        if (tempMsg) {
                            tempMsg.remove();
                        }

                        // add the actual message with proper formatting
                        const messageElement = await formatMessageForDisplay(payload.new);
                        const messagesContainer = document.querySelector('#directMessage #messagesContainer');
                        if (messagesContainer) {
                            messagesContainer.innerHTML += messageElement;
                            scrollToBottom();
                        }
                        return;
                    }

                    // add message from other person
                    const messageElement = await formatMessageForDisplay(payload.new);
                    const messagesContainer = document.querySelector('#directMessage #messagesContainer');

                    if (messagesContainer) {
                        messagesContainer.innerHTML += messageElement;
                        scrollToBottom();

                        // update the messages list on the main page
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

                    // remove the message from ui
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

    // update messages list
    function updateMessagesList(newMessage) {
        // update the conversation in the messages list
        const conversationElements = document.querySelectorAll(`[data-conversation-id="${newMessage.conversation_id}"]`);

        conversationElements.forEach(element => {
            const subtitle = element.querySelector('.text-xs.text-gray-500');
            if (subtitle) {
                // create a temporary div to extract text from html
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newMessage.content;

                // remove image/video tags for preview
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

    // scroll chat to bottom
    function scrollToBottom() {
        const chatBody = document.querySelector('#directMessage .overflow-y-auto');
        if (chatBody) {
            // use requestAnimationFrame for smoother scrolling
            requestAnimationFrame(() => {
                chatBody.scrollTop = chatBody.scrollHeight;
            });
        }
    }

    // send message on enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isSendingMessage) {
                sendBtn.click();
            }
        }
    });

    // update send button on input
    messageInput.addEventListener('input', () => {
        updateSendButtonState();
    });

    // initialize send button state
    updateSendButtonState();
});