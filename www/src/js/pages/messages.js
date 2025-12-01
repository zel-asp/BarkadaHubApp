document.addEventListener('DOMContentLoaded', function () {
    const conversations = document.querySelectorAll('.conversation');

    conversations.forEach(conversation => {
        conversation.addEventListener('click', function () {
            // Remove selected class from all conversations
            conversations.forEach(c => c.classList.remove('selected'));

            // Add selected class to clicked conversation
            this.classList.add('selected');
        });
    });
});