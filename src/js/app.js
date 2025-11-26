// DOM Elements
const authModal = document.getElementById('authModal');
const app = document.getElementById('app');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const authSwitchText = document.getElementById('authSwitchText');
const authSwitchLink = document.getElementById('authSwitchLink');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const closeModal = document.querySelector('.close-modal');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const likeButtons = document.querySelectorAll('.like-btn');
const pageSections = document.querySelectorAll('.page-section');
const navLinks = document.querySelectorAll('.nav-link, .sidebar-link, .mobile-nav-item, .logo, .user-profile, .club-card, .friend-card, .view-all');
const joinButtons = document.querySelectorAll('.join-btn');
const backToClubs = document.querySelector('.back-to-clubs');

// State
let isLoginMode = true;
let currentPage = 'home';
let userClubs = [];

// Show authentication modal on page load
window.addEventListener('DOMContentLoaded', () => {
    authModal.style.display = 'flex';
});

// Switch between login and signup
authSwitchLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        authTitle.textContent = 'Login to BarkadaHub';
        authSubmit.textContent = 'Login';
        authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink">Sign up</a>';
        confirmPasswordGroup.style.display = 'none';
    } else {
        authTitle.textContent = 'Join BarkadaHub';
        authSubmit.textContent = 'Sign Up';
        authSwitchText.innerHTML = 'Already have an account? <a href="#" id="authSwitchLink">Login</a>';
        confirmPasswordGroup.style.display = 'block';
    }

    // Re-attach event listener to the new link
    document.getElementById('authSwitchLink').addEventListener('click', arguments.callee);
});

// Handle form submission
authForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isLoginMode) {
        // Simulate login
        console.log('Logging in with:', email, password);
        // In a real app, you would make an API call here

        // For demo purposes, just show the app
        authModal.style.display = 'none';
        app.style.display = 'block';
    } else {
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        // Simulate signup
        console.log('Signing up with:', email, password);
        // In a real app, you would make an API call here

        // For demo purposes, switch to login mode
        isLoginMode = true;
        authTitle.textContent = 'Login to BarkadaHub';
        authSubmit.textContent = 'Login';
        authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink">Sign up</a>';
        confirmPasswordGroup.style.display = 'none';
        alert('Account created successfully! Please login.');
    }
});

// Close modal
closeModal.addEventListener('click', () => {
    authModal.style.display = 'none';
});

// Tab functionality
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');

        // Update active tab
        tabs.forEach(t => {
            t.classList.remove('active', 'border-primary', 'text-primary');
            t.classList.add('border-transparent');
        });
        tab.classList.add('active', 'border-primary', 'text-primary');

        // Show corresponding content
        tabContents.forEach(content => {
            content.classList.add('hidden');
            content.classList.remove('active', 'space-y-6');
            if (content.id === `${tabId}-posts`) {
                content.classList.remove('hidden');
                content.classList.add('active', 'space-y-6');
            }
        });
    });
});

// Like button functionality
likeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const icon = button.querySelector('i');

        if (button.classList.contains('liked')) {
            button.classList.remove('liked');
            icon.classList.remove('fas');
            icon.classList.add('far');
        } else {
            button.classList.add('liked');
            icon.classList.remove('far');
            icon.classList.add('fas');
        }
    });
});

// Navigation functionality
function navigateToPage(page) {
    // Update active page section
    pageSections.forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
        if (section.id === `${page}-page`) {
            section.classList.remove('hidden');
            section.classList.add('active');
        }
    });

    // Update active nav links
    navLinks.forEach(link => {
        link.classList.remove('active', 'text-primary', 'bg-gray-100');
        link.classList.add('text-gray-600');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active', 'text-primary');
            if (link.classList.contains('nav-link') || link.classList.contains('sidebar-link')) {
                link.classList.add('bg-gray-100');
            }
        }
    });

    // Update mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active', 'text-primary');
        item.classList.add('text-gray-600');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active', 'text-primary');
        }
    });

    currentPage = page;
}

// Add click event listeners to all navigation elements
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        if (page) {
            navigateToPage(page);
        }
    });
});

// Join club functionality
joinButtons.forEach(button => {
    button.addEventListener('click', function () {
        const clubItem = this.closest('.club-item, .club-card');
        const clubName = clubItem.querySelector('h4').textContent;
        const clubDescription = clubItem.querySelector('p').textContent;
        const clubMembers = clubItem.querySelector('.text-xs.text-gray-500')?.textContent.match(/\d+/)?.[0] || '0';

        // Add to user's clubs
        if (!userClubs.includes(clubName)) {
            userClubs.push(clubName);

            // Update button text
            this.textContent = 'Joined';
            this.classList.remove('bg-primary', 'hover:bg-secondary');
            this.classList.add('bg-success', 'hover:bg-success');

            // Show club detail page
            showClubDetail(clubName, clubDescription, clubMembers);
        }
    });
});

// Show club detail page
function showClubDetail(name, description, members) {
    document.getElementById('club-detail-name').textContent = name;
    document.getElementById('club-detail-description').textContent = description;
    document.getElementById('club-detail-members').textContent = members;

    // Hide clubs page and show club detail page
    document.getElementById('clubs-page').classList.add('hidden');
    document.getElementById('clubs-page').classList.remove('active');
    document.getElementById('club-detail-page').classList.remove('hidden');
    document.getElementById('club-detail-page').classList.add('active');
}

// Back to clubs functionality
backToClubs.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('club-detail-page').classList.add('hidden');
    document.getElementById('club-detail-page').classList.remove('active');
    document.getElementById('clubs-page').classList.remove('hidden');
    document.getElementById('clubs-page').classList.add('active');
});

// Club card click in right sidebar
document.querySelectorAll('.right-sidebar .club-card').forEach(card => {
    card.addEventListener('click', function () {
        const clubName = this.querySelector('h4').textContent;
        const clubDescription = "Club description would go here"; // In a real app, this would come from data
        const clubMembers = this.querySelector('span').textContent.match(/\d+/)?.[0] || '0';
        showClubDetail(clubName, clubDescription, clubMembers);
    });
});

// Conversation selection
document.querySelectorAll('.conversation').forEach(conv => {
    conv.addEventListener('click', () => {
        document.querySelectorAll('.conversation').forEach(c => {
            c.classList.remove('active', 'bg-gray-100');
        });
        conv.classList.add('active', 'bg-gray-100');
    });
});

// Send message functionality
document.querySelector('.send-btn').addEventListener('click', () => {
    const input = document.querySelector('.chat-input input');
    const message = input.value.trim();

    if (message) {
        const messagesContainer = document.querySelector('.chat-messages');
        const newMessage = document.createElement('div');
        newMessage.className = 'message sent max-w-[70%] ml-auto';
        newMessage.innerHTML = `
    <div class="bg-primary text-white rounded-lg p-3 rounded-br-none">
        <p>${message}</p>
        <div class="message-time text-xs text-white text-opacity-70 mt-1 text-right">Just now</div>
    </div>
    `;
        messagesContainer.appendChild(newMessage);
        input.value = '';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});

// Allow sending message with Enter key
document.querySelector('.chat-input input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.querySelector('.send-btn').click();
    }
});
