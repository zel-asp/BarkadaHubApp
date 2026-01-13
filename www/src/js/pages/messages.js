import supabaseClient from '../supabase.js';
import { lost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
import messageItem, { createEmptyMessageState } from '../render/message.js';

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
    const messageContainer = document.getElementById('messagesContainer');

    async function render() {
        const { data: message } = await supabaseClient
            .from('message')
            .select('*')
            .eq('relation', 'friend')

        if (!message || message.length < 1) {
            friendsMessage.innerHTML = createEmptyMessageState();
        }

        message.map(mes => {
            friendsMessage.innerHTML = messageItem({
                relation: mes.relation,
                name: mes.friend_name,
                avatar: mes.friend_avatar,
                timestamp: mes.created_at,
            });
        })

    }

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

    let currentMediaFile = null;   // Currently selected media file
    let currentMediaType = null;   // 'image' or 'video'


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
