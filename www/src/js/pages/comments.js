document.addEventListener('DOMContentLoaded', function () {
    // Function to close all reply inputs
    function closeAllReplyInputs() {
        document.querySelectorAll('.reply-input-container').forEach(input => {
            input.classList.remove('active');
        });
    }

    // reply button clicks
    document.querySelectorAll('.reply-btn').forEach(button => {
        button.addEventListener('click', function () {
            const commentId = this.getAttribute('data-comment');
            const replyId = this.getAttribute('data-reply');

            // Close any open reply inputs first
            closeAllReplyInputs();

            // Open the correct reply input
            if (commentId) {
                const inputId = `reply-input-${commentId}`;
                document.getElementById(inputId).classList.add('active');
                document.querySelector(`#${inputId} textarea`).focus();
            } else if (replyId) {
                const inputId = `reply-input-${replyId}`;
                document.getElementById(inputId).classList.add('active');
                document.querySelector(`#${inputId} textarea`).focus();
            }
        });
    });

    // cancel button clicks
    document.querySelectorAll('.cancel-reply-btn').forEach(button => {
        button.addEventListener('click', function () {
            const commentId = this.getAttribute('data-comment');
            const replyId = this.getAttribute('data-reply');

            if (commentId) {
                const inputId = `reply-input-${commentId}`;
                document.getElementById(inputId).classList.remove('active');
            } else if (replyId) {
                const inputId = `reply-input-${replyId}`;
                document.getElementById(inputId).classList.remove('active');
            }
        });
    });

    // post reply button clicks
    document.querySelectorAll('.post-reply-btn').forEach(button => {
        button.addEventListener('click', function () {
            const commentId = this.getAttribute('data-comment');
            const replyId = this.getAttribute('data-reply');

            let textarea;
            if (commentId) {
                const inputId = `reply-input-${commentId}`;
                textarea = document.querySelector(`#${inputId} textarea`);
            } else if (replyId) {
                const inputId = `reply-input-${replyId}`;
                textarea = document.querySelector(`#${inputId} textarea`);
            }
        });
    });
});