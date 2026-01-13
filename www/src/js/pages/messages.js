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

    async function render() {
        /* -----------------------------------------
        AUTH USER
        ----------------------------------------- */
        const { data: userData, error: authError } = await supabaseClient.auth.getUser();
        if (authError) {
            console.error(authError);
            return;
        }

        const userId = userData?.user?.id;
        if (!userId) return;

        /* -----------------------------------------
        FETCH ALL USER MESSAGES
        ----------------------------------------- */
        const { data: messages, error } = await supabaseClient
            .from('message')
            .select('*')
            .eq('user_id', userId)
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
            firendId: mes.friends_id
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
            firendId: mes.friends_id
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
            firendId: mes.friends_id
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

        const directMessageContainer = document.getElementById('directMessage');
        const directMessageModal = document.getElementById('directMessageModal');

        app.classList.add('hidden');
        directMessageModal.classList.remove('hidden');

        const { data, error } = await supabaseClient
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId);

        if (error) {
            console.error(error);
            return;
        }

        // EMPTY CHAT
        if (!data || data.length === 0) {
            directMessageContainer.innerHTML =
                directMessage(friendName, friendAvatar, relation);
            return;
        }

        // WITH MESSAGES
        const renderedMessages = data.map(msg => {
            return `
            <div class="text-sm text-gray-700">
                ${msg.message}
            </div>
        `;
        });

        directMessageContainer.innerHTML =
            directMessage(friendName, friendAvatar, relation, renderedMessages);
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
    const messagesContainer = document.getElementById('messagesContainer');

    let currentMediaFile = null;
    let currentMediaType = null;

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
        input.accept = 'video/*';

        input.onchange = (e) => {
            if (e.target.files?.[0]) {
                currentMediaFile = e.target.files[0];
                currentMediaType = 'video';
                showMediaPreview(currentMediaFile, 'video');
            }
        };

        input.click();
    });


    /* -------------------------------------------
        SHOW MEDIA PREVIEW
    ------------------------------------------- */
    function showMediaPreview(file, type) {
        previewContainer.innerHTML = ''; // Clear previous preview

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

        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors';
        removeBtn.innerHTML = '<i class="fas fa-times text-xs"></i>';
        removeBtn.onclick = removeMediaPreview;
        previewContainer.appendChild(removeBtn);

        mediaPreviewArea.classList.remove('hidden');
    }


    /* -------------------------------------------
        REMOVE MEDIA PREVIEW
    ------------------------------------------- */
    function removeMediaPreview() {
        previewContainer.innerHTML = '';
        mediaPreviewArea.classList.add('hidden');
        currentMediaFile = null;
        currentMediaType = null;
    }


    /* -------------------------------------------
        SEND MESSAGE HANDLER
    ------------------------------------------- */
    sendBtn.addEventListener('click', () => {
        const messageText = messageInput.value.trim();

        if (!messageText && !currentMediaFile) return; // Nothing to send

        const message = {
            text: messageText,
            media: currentMediaFile ? {
                file: currentMediaFile,
                type: currentMediaType,
                url: URL.createObjectURL(currentMediaFile)
            } : null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOutgoing: true
        };

        addMessageToUI(message);  // Function to render message in UI
        messageInput.value = '';
        if (currentMediaFile) removeMediaPreview();
        scrollToBottom();

        console.log('Message sent:', message); // Placeholder: replace with actual API/WebSocket logic
    });


    /* -------------------------------------------
        SCROLL CHAT TO BOTTOM
    ------------------------------------------- */
    function scrollToBottom() {
        const chatBody = document.querySelector('.overflow-y-auto');
        chatBody.scrollTop = chatBody.scrollHeight;
    }


    /* -------------------------------------------
        SEND MESSAGE ON ENTER KEY
        (Shift+Enter for newline)
    ------------------------------------------- */
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

});
