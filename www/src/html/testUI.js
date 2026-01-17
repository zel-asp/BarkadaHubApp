function setupRealtimeSubscription(conversationId) {
    // Unsubscribe from previous subscription if exists
    if (activeSubscription) {
        supabaseClient.removeChannel(activeSubscription);
        activeSubscription = null;
    }

    // Create new subscription
    activeSubscription = supabaseClient
        .channel(`conversation:${conversationId}`)
        // -------------------------------
        // INSERT (New Messages)
        // -------------------------------
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `conversation_id=eq.${conversationId}`
            },
            async (payload) => {
                const newMsg = payload.new;

                // Skip if message is from current user (already handled)
                if (newMsg.sender_id === currentUserId) return;

                // Format and append the new message
                const messagesContainer = document.querySelector('#directMessage #messagesContainer');
                if (!messagesContainer) return;

                const messageHTML = await formatMessageForDisplay(newMsg);
                messagesContainer.innerHTML += messageHTML;

                // Scroll to bottom after adding
                scrollToBottom();

                // Update latest message preview in main messages list
                updateMessagesList(newMsg);
            }
        )
        // -------------------------------
        // DELETE (Deleted Messages)
        // -------------------------------
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'chat_messages',
                filter: `conversation_id=eq.${conversationId}`
            },
            (payload) => {
                const deletedMsg = payload.old;

                // Skip if the deleted message was sent by the current user (optimistic update already removed it)
                if (deletedMsg.sender_id === currentUserId) return;

                const messageElement = document.querySelector(`[data-message-id="${deletedMsg.id}"]`);
                if (messageElement) {
                    messageElement.remove();
                    console.log(`Message ${deletedMsg.id} removed from UI`);
                    scrollToBottom();
                } else {
                    console.warn(`Message ${deletedMsg.id} not found in UI for deletion`);
                }

                // Optional: Update messages list if this was the latest message
                // Could call updateMessagesList(null) or refresh that conversation
            }
        )
        // -------------------------------
        // UPDATE (if you ever implement message edits)
        // -------------------------------
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_messages',
                filter: `conversation_id=eq.${conversationId}`
            },
            async (payload) => {
                const updatedMsg = payload.new;
                const messageElement = document.querySelector(`[data-message-id="${updatedMsg.id}"]`);
                if (messageElement) {
                    const newHTML = await formatMessageForDisplay(updatedMsg);
                    messageElement.outerHTML = newHTML;
                }
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('Realtime subscribed for conversation:', conversationId);
            } else if (status === 'CHANNEL_ERROR') {
                alertSystem.show('Failed to connect to real-time updates.', 'error');
            }
        });

    return activeSubscription;
}
