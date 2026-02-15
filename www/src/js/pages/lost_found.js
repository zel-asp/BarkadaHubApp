import supabaseClient from '../supabase.js';
import { lost_found, emptyLost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
import sanitize from '../utils/sanitize.js';

document.addEventListener('DOMContentLoaded', async () => {
    const alertSystem = new AlertSystem();

    // get logged-in user
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;

    // elements
    const openUploadFormBtn = document.getElementById('openUploadForm');
    const uploadModal = document.getElementById('uploadModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const lostFoundForm = document.getElementById('lostFoundForm');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const lostFoundContainer = document.getElementById('lostFoundContainer');
    const showAllBtn = document.getElementById('showAllBtn');
    const showLostBtn = document.getElementById('showLostBtn');
    const showFoundBtn = document.getElementById('showFoundBtn');

    // Search elements
    const searchInput = document.getElementById('searchItems');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    const displayedItemIds = new Set();
    let currentFilter = 'all';
    let searchTerm = '';
    let searchTimeout;

    // Daily submission limit
    const DAILY_LIMIT = 5;
    let todaySubmissions = 0;

    // Add search functionality CSS
    const style = document.createElement('style');
    style.textContent = `
        .search-count-badge {
            animation: fadeIn 0.3s ease;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            color: #4B5563;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .filter-buttons {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        /* Delete confirmation modal styles */
        .delete-modal {
            display: none;
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.5);
            align-items: center;
            justify-content: center;
            z-index: 50;
        }

        .delete-modal.show {
            display: flex;
        }

        .delete-modal-content {
            background-color: white;
            border-radius: 0.5rem;
            padding: 1.5rem;
            max-width: 24rem;
            margin: 0 1rem;
            animation: modalSlideIn 0.2s ease;
        }

        @keyframes modalSlideIn {
            from {
                transform: translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .delete-modal-title {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #111827;
        }

        .delete-modal-text {
            color: #6B7280;
            margin-bottom: 1.5rem;
        }

        .delete-modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
        }

        .delete-modal-cancel {
            padding: 0.5rem 1rem;
            color: #6B7280;
            transition: color 0.2s;
            cursor: pointer;
        }

        .delete-modal-cancel:hover {
            color: #374151;
        }

        .delete-modal-confirm {
            padding: 0.5rem 1rem;
            background-color: #DC2626;
            color: white;
            border-radius: 0.375rem;
            transition: background-color 0.2s;
            cursor: pointer;
        }

        .delete-modal-confirm:hover {
            background-color: #B91C1C;
        }
    `;
    document.head.appendChild(style);

    // Create delete confirmation modal
    function createDeleteModal() {
        const modal = document.createElement('div');
        modal.id = 'deleteConfirmModal';
        modal.className = 'delete-modal';
        modal.innerHTML = `
            <div class="delete-modal-content">
                <h3 class="delete-modal-title">Confirm Deletion</h3>
                <p class="delete-modal-text">Are you sure you want to delete this post? This action cannot be undone.</p>
                <div class="delete-modal-buttons">
                    <button id="cancelDelete" class="delete-modal-cancel">Cancel</button>
                    <button id="confirmDelete" class="delete-modal-confirm">Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    // Initialize modal
    const deleteModal = createDeleteModal();
    let pendingDelete = null;

    // Show delete confirmation modal
    function showDeleteConfirmation(postId, card, filePath, deleteBtn) {
        return new Promise((resolve) => {
            pendingDelete = { postId, card, filePath, deleteBtn, resolve };
            deleteModal.classList.add('show');
        });
    }

    // Handle modal confirm
    document.getElementById('confirmDelete')?.addEventListener('click', () => {
        if (pendingDelete) {
            deleteModal.classList.remove('show');
            const { postId, card, filePath, deleteBtn, resolve } = pendingDelete;
            pendingDelete = null;
            resolve(true);
            handleDelete(postId, card, filePath, deleteBtn);
        }
    });

    // Handle modal cancel
    document.getElementById('cancelDelete')?.addEventListener('click', () => {
        deleteModal.classList.remove('show');
        if (pendingDelete) {
            const { resolve } = pendingDelete;
            pendingDelete = null;
            resolve(false);
        }
    });

    // Close modal on background click
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.classList.remove('show');
            if (pendingDelete) {
                const { resolve } = pendingDelete;
                pendingDelete = null;
                resolve(false);
            }
        }
    });

    // Check user's daily submission count
    async function checkDailySubmissions() {
        if (!userId) return 0;

        // Get start of today (midnight)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data: submissions, error } = await supabaseClient
            .from('lost_found')
            .select('id')
            .eq('auth_id', userId)
            .gte('created_at', startOfDay.toISOString());

        if (error) {
            console.error('Error checking daily submissions:', error);
            return 0;
        }

        todaySubmissions = submissions?.length || 0;

        // Disable/enable upload button based on limit
        if (todaySubmissions >= DAILY_LIMIT) {
            if (openUploadFormBtn) {
                openUploadFormBtn.disabled = true;
                openUploadFormBtn.classList.add('opacity-50', 'cursor-not-allowed');
                openUploadFormBtn.title = 'Daily submission limit reached (5/5)';
            }
        } else {
            if (openUploadFormBtn) {
                openUploadFormBtn.disabled = false;
                openUploadFormBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                openUploadFormBtn.title = '';
            }
        }

        return todaySubmissions;
    }

    // Check if user can submit today
    async function canSubmitToday() {
        await checkDailySubmissions();

        if (todaySubmissions >= DAILY_LIMIT) {
            alertSystem.show(`You've reached the daily limit of ${DAILY_LIMIT} submissions. Please try again tomorrow.`, 'warning');
            return false;
        }
        return true;
    }

    // set up real-time subscription
    const setupRealtimeSubscription = () => {
        const subscription = supabaseClient
            .channel('lost_found_changes')
            .on('postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'lost_found'
                },
                (payload) => {
                    // handle delete in real-time
                    const deletedId = payload.old.id;

                    // remove from set
                    displayedItemIds.delete(deletedId);

                    // remove the card from dom
                    const cardToRemove = document.querySelector(`[data-post-id="${deletedId}"]`);
                    if (cardToRemove) {
                        cardToRemove.remove();
                    }

                    // check if we need to show empty state
                    updateEmptyState();

                    // show alert
                    alertSystem.show('An item was deleted', 'info');
                }
            )
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'lost_found'
                },
                async (payload) => {
                    // handle new posts in real-time
                    const newItem = payload.new;

                    // If the new item is from current user, update submission counter
                    if (newItem.auth_id === userId) {
                        todaySubmissions++;
                        // Re-check limit to update button state
                        checkDailySubmissions();
                    }

                    // only render if it matches current filter AND search term (if any)
                    if (currentFilter === 'all' || currentFilter === newItem.item_type) {
                        // Check if it matches search term
                        if (!searchTerm.trim() || filterItemsBySearch([newItem]).length > 0) {
                            // check if not already displayed
                            if (!displayedItemIds.has(newItem.id)) {
                                await renderLostFoundSingle(newItem, true);

                                // Update search count if searching
                                if (searchTerm.trim()) {
                                    const countBadge = document.querySelector('.search-count-badge');
                                    if (countBadge) {
                                        const currentCount = parseInt(countBadge.textContent.match(/\d+/)[0]) || 0;
                                        countBadge.innerHTML = `Found ${currentCount + 1} ${currentCount + 1 === 1 ? 'result' : 'results'}`;
                                    }
                                }
                            }
                        }
                    }

                    // update empty state
                    updateEmptyState();

                    // show alert
                    alertSystem.show('New item posted!', 'success');
                }
            )
            .subscribe();

        return subscription;
    };

    // modal open/close
    const closeModal = () => {
        uploadModal.classList.add('hidden');
        lostFoundForm.reset();
        imagePreview.classList.add('hidden');
    };

    openUploadFormBtn.addEventListener('click', async () => {
        // Check daily limit before opening modal
        const canSubmit = await canSubmitToday();
        if (canSubmit) {
            uploadModal.classList.remove('hidden');
        }
    });

    cancelBtn.addEventListener('click', closeModal);
    uploadModal.addEventListener('click', e => { if (e.target === uploadModal) closeModal(); });

    // image preview
    imageUpload.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    // submit lost & found report
    lostFoundForm.addEventListener('submit', async e => {
        e.preventDefault();

        // Double-check daily limit before submission
        const canSubmit = await canSubmitToday();
        if (!canSubmit) {
            closeModal();
            return;
        }

        const submitBtn = lostFoundForm.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        try {
            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

            const itemType = document.querySelector('input[name="itemType"]:checked')?.value;
            let itemName = document.getElementById('itemName').value.trim();
            const category = document.getElementById('category').value.trim();
            let description = document.getElementById('description').value.trim();
            let location = document.getElementById('location').value.trim();
            const file = imageUpload.files[0];

            itemName = sanitize(itemName);
            description = sanitize(description);
            location = sanitize(location);
            let filePath = null;

            if (file) {
                const ext = file.name.split('.').pop();
                const fileName = `${userId}-${Date.now()}.${ext}`;
                const { data: uploadData, error: uploadError } = await supabaseClient
                    .storage
                    .from('lost_found')
                    .upload(fileName, file);

                if (uploadError) throw new Error("Failed to upload image!");
                filePath = uploadData.path;
            }

            // insert new lost & found record
            const { data: insertedData, error: insertError } = await supabaseClient
                .from('lost_found')
                .insert([{
                    item_type: itemType,
                    item_name: itemName,
                    category,
                    description,
                    location,
                    auth_id: userId,
                    file_name: filePath,
                    created_at: new Date()
                }])
                .select();

            if (insertError) throw new Error("Failed to submit report!");

            // Increment submission counter
            todaySubmissions++;
            // Re-check limit to update button state
            checkDailySubmissions();

            alertSystem.show("Report submitted successfully!", 'success');
            closeModal();

            // reset button
            submitBtn.textContent = 'Submitted!';
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 2000);

        } catch (err) {
            console.error(err);

            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            alertSystem.show(err.message || "Failed to submit report!", 'error');
        }
    });

    // Search functionality
    function filterItemsBySearch(items) {
        if (!searchTerm.trim()) return items;

        const term = searchTerm.toLowerCase().trim();
        return items.filter(item => {
            return (
                (item.item_name && item.item_name.toLowerCase().includes(term)) ||
                (item.description && item.description.toLowerCase().includes(term)) ||
                (item.location && item.location.toLowerCase().includes(term)) ||
                (item.category && item.category.toLowerCase().includes(term))
            );
        });
    }

    // render functions
    async function renderLostFound(filterType = 'all', preserveSearch = true) {
        currentFilter = filterType;

        // Don't reset search term unless explicitly told to
        if (!preserveSearch) {
            searchTerm = '';
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');

            // Remove search count badge
            const countBadge = document.querySelector('.search-count-badge');
            if (countBadge) {
                countBadge.remove();
            }
        }

        try {
            let query = supabaseClient
                .from('lost_found')
                .select('*')
                .order('created_at', { ascending: false });

            if (filterType === 'lost') {
                query = query.eq('item_type', 'lost');
            } else if (filterType === 'found') {
                query = query.eq('item_type', 'found');
            }

            const { data: items, error } = await query;

            if (error) throw error;

            // clear container and set
            lostFoundContainer.innerHTML = '';
            displayedItemIds.clear();

            if (!items || items.length === 0) {
                showEmptyState();
                return;
            }

            // Apply search filter if there's a search term
            let filteredItems = items;
            if (searchTerm.trim()) {
                filteredItems = filterItemsBySearch(items);
            }

            // Show no results message if search returns nothing
            if (filteredItems.length === 0) {
                showNoSearchResults();
                return;
            }

            // Render filtered items
            filteredItems.forEach(item => renderLostFoundSingle(item));

            // Show search result count if searching
            if (searchTerm.trim()) {
                showSearchResultCount(filteredItems.length);
            }

        } catch (err) {
            console.error("Failed to render lost & found:", err);
        }
    }

    async function renderLostFoundSingle(item, prepend = false) {
        if (displayedItemIds.has(item.id)) return;

        let fileUrl = '';
        if (item.file_name) {
            const { data: storageData } = supabaseClient
                .storage
                .from('lost_found')
                .getPublicUrl(item.file_name);
            fileUrl = storageData.publicUrl;
        }

        const datePosted = new Date(item.created_at).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        let messageAdded = false;

        if (item.auth_id !== userId) {
            const { data: existingMessage } = await supabaseClient
                .from('message')
                .select('id')
                .eq('user_id', userId)
                .eq('friends_id', item.auth_id)
                .eq('relation', 'lost & found')
                .maybeSingle();

            messageAdded = !!existingMessage;
        }

        const postHtml = lost_found(
            fileUrl,
            item.item_type,
            item.item_name,
            item.description,
            item.location,
            datePosted,
            item.auth_id === userId,
            item.auth_id,
            item.file_name,
            item.id,
            messageAdded
        );

        // create temporary container to parse html
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = postHtml;
        const postElement = tempDiv.firstElementChild;

        // add data attribute for easier deletion
        postElement.setAttribute('data-post-id', item.id);

        // remove empty state if it exists before adding new items
        const emptyState = lostFoundContainer.querySelector('#emptyState, #emptyFilterState, #noSearchResults');
        if (emptyState) {
            lostFoundContainer.innerHTML = '';
            displayedItemIds.clear();
        }

        if (prepend) {
            lostFoundContainer.prepend(postElement);
        } else {
            lostFoundContainer.appendChild(postElement);
        }

        displayedItemIds.add(item.id);
    }

    // helper function to show empty state
    function showEmptyState() {
        lostFoundContainer.innerHTML = emptyLost_found;

        const emptyState = document.getElementById('emptyState');
        const emptyFilterState = document.getElementById('emptyFilterState');

        if (emptyState && emptyFilterState) {
            if (currentFilter === 'all') {
                emptyState.classList.remove('hidden');
                emptyFilterState.classList.add('hidden');
            } else {
                emptyState.classList.add('hidden');
                emptyFilterState.classList.remove('hidden');
            }
        }
    }

    // Show no search results
    function showNoSearchResults() {
        lostFoundContainer.innerHTML = `
            <div id="noSearchResults" class="col-span-full text-center py-12">
                <div class="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                    <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-search text-3xl text-gray-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                    <p class="text-gray-600 mb-4">No items matching "${searchTerm}"</p>
                    <button id="clearSearchFromNoResults" class="text-primary hover:text-primary-dark font-medium transition">
                        Clear search
                    </button>
                </div>
            </div>
        `;

        // Add event listener to the clear button in no results view
        document.getElementById('clearSearchFromNoResults')?.addEventListener('click', () => {
            searchTerm = '';
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');

            // Remove search count badge
            const countBadge = document.querySelector('.search-count-badge');
            if (countBadge) {
                countBadge.remove();
            }

            renderLostFound(currentFilter);
        });
    }

    // Show search result count
    function showSearchResultCount(count) {
        // Remove existing count badge if any
        const existingBadge = document.querySelector('.search-count-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Create and insert count badge
        const countBadge = document.createElement('div');
        countBadge.className = 'search-count-badge';
        countBadge.innerHTML = `Found ${count} ${count === 1 ? 'result' : 'results'}`;

        const filterButtons = document.querySelector('.filter-buttons');
        if (filterButtons) {
            filterButtons.insertAdjacentElement('afterend', countBadge);
        } else {
            // If filter buttons container doesn't exist, insert after the search container
            const searchContainer = document.querySelector('.bg-white.rounded-lg.shadow-sm.p-3.mb-4');
            if (searchContainer) {
                searchContainer.insertAdjacentElement('afterend', countBadge);
            }
        }
    }

    // helper function to update empty state visibility
    function updateEmptyState() {
        const hasItems = lostFoundContainer.children.length > 0;

        // check if current children are empty state divs
        const isEmptyStateDisplayed = lostFoundContainer.querySelector('#emptyState, #emptyFilterState, #noSearchResults');

        if (!hasItems || (isEmptyStateDisplayed && lostFoundContainer.children.length === 1)) {
            showEmptyState();
        } else {
            // hide empty states when there are items
            const emptyState = document.getElementById('emptyState');
            const emptyFilterState = document.getElementById('emptyFilterState');
            const noSearchResults = document.getElementById('noSearchResults');

            if (emptyState) emptyState.classList.add('hidden');
            if (emptyFilterState) emptyFilterState.classList.add('hidden');
            if (noSearchResults) noSearchResults?.remove();
        }
    }

    // Search event handlers
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const newSearchTerm = e.target.value;

        // Show/hide clear button
        if (newSearchTerm.trim()) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }

        // Debounce search to avoid too many renders
        searchTimeout = setTimeout(() => {
            searchTerm = newSearchTerm;
            renderLostFound(currentFilter, true);
        }, 300);
    });

    searchBtn.addEventListener('click', () => {
        searchTerm = searchInput.value;
        renderLostFound(currentFilter, true);

        // Show clear button if search term exists
        if (searchTerm.trim()) {
            clearSearchBtn.classList.remove('hidden');
        }
    });

    clearSearchBtn.addEventListener('click', () => {
        searchTerm = '';
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');

        // Remove search count badge
        const countBadge = document.querySelector('.search-count-badge');
        if (countBadge) {
            countBadge.remove();
        }

        renderLostFound(currentFilter, false);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchTerm = searchInput.value;
            renderLostFound(currentFilter, true);

            // Show clear button if search term exists
            if (searchTerm.trim()) {
                clearSearchBtn.classList.remove('hidden');
            }
        }
    });

    // Filter button handlers
    showAllBtn.addEventListener('click', () => {
        setActiveButton(showAllBtn);
        renderLostFound('all', false);
    });

    showLostBtn.addEventListener('click', () => {
        setActiveButton(showLostBtn);
        renderLostFound('lost', false);
    });

    showFoundBtn.addEventListener('click', () => {
        setActiveButton(showFoundBtn);
        renderLostFound('found', false);
    });

    function setActiveButton(activeBtn) {
        [showAllBtn, showLostBtn, showFoundBtn].forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });

        activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        activeBtn.classList.add('bg-primary', 'text-white');
    }

    // Optimized delete post handler
    document.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;

        // Prevent default and stop propagation immediately
        e.preventDefault();
        e.stopPropagation();

        const postId = deleteBtn.dataset.postId;
        const card = deleteBtn.closest('[data-post-id]');
        const filePath = deleteBtn.dataset.filePath;

        if (!postId) {
            alertSystem.show('This post is not found', 'error');
            return;
        }

        // Show custom confirmation modal
        showDeleteConfirmation(postId, card, filePath, deleteBtn);
    });

    // Optimized delete function
    async function handleDelete(postId, card, filePath, deleteBtn) {
        // Store original button state
        const originalHTML = deleteBtn.innerHTML;

        // Optimistic UI update
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }

        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

        try {
            // Perform deletion
            await destroy(postId, filePath);

            // Remove from DOM
            if (card) {
                card.remove();
            }

            // Remove from set
            displayedItemIds.delete(postId);

            // Update empty state
            updateEmptyState();

            // Update search count if searching
            if (searchTerm.trim()) {
                const countBadge = document.querySelector('.search-count-badge');
                if (countBadge) {
                    const currentCount = parseInt(countBadge.textContent.match(/\d+/)[0]) || 0;
                    if (currentCount > 0) {
                        countBadge.innerHTML = `Found ${currentCount - 1} ${currentCount - 1 === 1 ? 'result' : 'results'}`;
                    }
                }
            }

            alertSystem.show('Post deleted successfully', 'success');
        } catch (err) {
            // Revert optimistic update on error
            if (card) {
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            }
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalHTML;
            alertSystem.show(err.message, 'error');
        }
    }

    // Optimized destroy function with parallel operations
    async function destroy(postId, filePath) {
        // Use Promise.all to run storage and database operations in parallel
        const operations = [];

        // Add storage deletion if file exists
        if (filePath && filePath !== 'null' && filePath !== 'undefined') {
            operations.push(
                supabaseClient
                    .storage
                    .from('lost_found')
                    .remove([filePath])
                    .catch(error => {
                        console.error('Storage delete error:', error);
                        // Don't throw, continue with post deletion
                        return null;
                    })
            );
        }

        // Add database deletion
        operations.push(
            supabaseClient
                .from('lost_found')
                .delete()
                .eq('id', postId)
        );

        // Wait for all operations to complete
        const results = await Promise.all(operations);

        // Check for database deletion error (last operation)
        const dbResult = results[results.length - 1];
        if (dbResult.error) {
            throw new Error('Post delete failed: ' + dbResult.error.message);
        }
    }

    // message button
    document.addEventListener('click', async (e) => {
        const msgBtn = e.target.closest('.message-btn');
        if (!msgBtn) return;

        const friendId = msgBtn.dataset.userId;
        const postId = msgBtn.dataset.postId;
        const messageAdded = msgBtn.dataset.messageAdded === 'true';

        // already has message → just go
        if (messageAdded) {
            window.location.href = `./messages.html`;
            return;
        }

        // first time message
        e.preventDefault();

        try {
            msgBtn.disabled = true;
            msgBtn.textContent = 'Sending...';
            msgBtn.classList.add('opacity-50', 'cursor-not-allowed');

            await addToMessageTable(friendId, postId);

            msgBtn.dataset.messageAdded = 'true';
            msgBtn.innerHTML = `
            <i class="fas fa-comments"></i>
            Go to Message
        `;
            msgBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            msgBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
            msgBtn.disabled = false;

            // go to messages page
            window.location.href = `./messages.html`;

        } catch (err) {
            console.error(err.message);

            msgBtn.disabled = false;
            msgBtn.textContent = 'Send Message';
            msgBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });

    async function addToMessageTable(friendId, postId) {
        // auth user
        const { data: userData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !userData?.user) {
            console.error('Auth error:', authError);
            return;
        }

        const myUserId = userData.user.id;
        const myName = userData.user.user_metadata?.display_name || 'User';

        // fetch both profiles in one query
        const { data: profiles, error: profileError } = await supabaseClient
            .from('profile')
            .select('id, name, avatar_url')
            .in('id', [myUserId, friendId]);

        if (profileError) {
            console.warn('Profile fetch issue, using defaults');
        }

        const friendProfile = profiles?.find(p => p.id === friendId);
        const myProfile = profiles?.find(p => p.id === myUserId);

        const friendName = friendProfile?.name || 'User';
        const friendAvatar = friendProfile?.avatar_url || '../images/defaultAvatar.jpg';
        const myAvatar = myProfile?.avatar_url || '../images/defaultAvatar.jpg';

        // get lost & found post
        const { data: lostFound, error: lostError } = await supabaseClient
            .from('lost_found')
            .select('item_name')
            .eq('id', postId)
            .maybeSingle();

        if (lostError || !lostFound) {
            console.error('Lost & Found post not found');
            return;
        }

        const itemName = lostFound.item_name || 'an item';

        const { data: conversation, error: convError } = await supabaseClient
            .from('conversations')
            .insert({ type: 'friend' })
            .select('id')
            .single();

        if (convError) throw convError;
        const conversationId = conversation.id;

        // prepare messages
        const messages = [
            {
                user_id: myUserId,
                friends_id: friendId,
                friend_name: friendName,
                friend_avatar: friendAvatar,
                relation: 'lost & found',
                latest_message: `Message about item '${itemName}'`,
                conversation_id: conversationId
            },
            {
                user_id: friendId,
                friends_id: myUserId,
                friend_name: myName,
                friend_avatar: myAvatar,
                relation: 'lost & found',
                latest_message: `You have a message about item '${itemName}'`,
                conversation_id: conversationId
            }
        ];

        // insert both rows at once
        const { error: insertError } = await supabaseClient
            .from('message')
            .insert(messages);

        if (insertError && insertError.code !== '23505') {
            console.error('Message insert error:', insertError);
        }
    }

    let subscription;
    try {
        subscription = setupRealtimeSubscription();
    } catch (error) {
        console.error('Failed to setup realtime subscription:', error);
    }

    window.addEventListener('beforeunload', () => {
        if (subscription) {
            supabaseClient.removeChannel(subscription);
        }
    });

    // Add filter-buttons class to the filter buttons container if it doesn't have it
    const filterContainer = document.querySelector('.flex.justify-center.space-x-2');
    if (filterContainer) {
        filterContainer.classList.add('filter-buttons');
    }

    // Check daily submissions on page load
    await checkDailySubmissions();

    // Check submissions count every minute (in case user leaves page open overnight)
    setInterval(checkDailySubmissions, 60000);

    renderLostFound();
});