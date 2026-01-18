// ... (previous code remains the same until delete handlers)

/* -------------------------------------------
        DELETE CONVERSATION FUNCTION
    ------------------------------------------- */
async function deleteConversation(conversationId) {
    try {
        // First, delete all chat messages in this conversation
        const { error: messagesError } = await supabaseClient
            .from('chat_messages')
            .delete()
            .eq('conversation_id', conversationId);

        if (messagesError) {
            console.error('Error deleting chat messages:', messagesError);
            // Continue anyway, as we still want to delete the conversation
        }

        // Then delete the conversation from message table
        const { error } = await supabaseClient
            .from('message')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', currentUserId);

        if (error) {
            console.error('Error deleting conversation:', error);
            alertSystem.show('Failed to delete conversation. Please try again.', 'error');
            return false;
        }

        console.log('Conversation deleted successfully');
        return true;
    } catch (error) {
        console.error('Error in deleteConversation:', error);
        alertSystem.show('An error occurred while deleting the conversation.', 'error');
        return false;
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

        // Delete message from chat_messages table
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
        return true;

    } catch (error) {
        console.error('Error in deleteMessage:', error);
        alertSystem.show('An error occurred while deleting the message.', 'error');
        return false;
    }
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
            <button class="delete-conversation-btn w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center gap-2 border-t border-gray-100">
                <i class="fas fa-comment-slash text-sm"></i>
                <span class="text-sm">Delete Conversation</span>
            </button>
        `;

    // Position menu near the click
    const clickX = event.clientX;
    const clickY = event.clientY;
    const menuWidth = 180;
    const menuHeight = 80;

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

    // Handle delete message button click
    const deleteMessageBtn = menu.querySelector('.delete-message-btn');
    deleteMessageBtn.addEventListener('click', async () => {
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

                    alertSystem.show('Message deleted successfully.', 'success');
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

    // Handle delete conversation button click
    const deleteConversationBtn = menu.querySelector('.delete-conversation-btn');
    deleteConversationBtn.addEventListener('click', async () => {
        const confirmed = confirm('Are you sure you want to delete this entire conversation? This will remove it from your messages list on all devices.');

        if (confirmed && currentConversation?.id) {
            try {
                const success = await deleteConversation(currentConversation.id);

                if (success) {
                    // Close the chat modal
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

                    alertSystem.show('Conversation deleted successfully.', 'success');
                }
            } catch (error) {
                console.error('Error in delete conversation handler:', error);
                alertSystem.show('Failed to delete conversation. Please try again.', 'error');
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
    SETUP REAL-TIME FOR MESSAGES LIST
------------------------------------------- */
function setupMessagesListRealtime(userId) {
    return supabaseClient
        .channel('messages-list-realtime')
        .on(
            'postgres_changes',
            {
                event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'message',
                filter: `user_id=eq.${userId}`
            },
            async (payload) => {
                console.log('Message list update:', payload);

                // For DELETE events, remove from UI
                if (payload.eventType === 'DELETE') {
                    const conversationElement = document.querySelector(
                        `.selectedMessage[data-conversation-id="${payload.old.conversation_id}"]`
                    );
                    if (conversationElement) {
                        conversationElement.remove();
                    }
                }
                // For INSERT and UPDATE events, refresh the list
                else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    await render();
                }

                // Check if we need to show empty state
                const friendMessages = document.querySelectorAll('#friends-message .selectedMessage');
                const clubMessages = document.querySelectorAll('#club-message .selectedMessage');
                const lostMessages = document.querySelectorAll('#lost-message .selectedMessage');

                if (friendMessages.length === 0 && clubMessages.length === 0 && lostMessages.length === 0) {
                    messageContainer.innerHTML = createEmptyMessageState();
                }
            }
        )
        .subscribe();
}
// ... (rest of the code remains the same)