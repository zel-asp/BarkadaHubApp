import supabaseClient from '../supabase.js';
import { lost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';

document.addEventListener('DOMContentLoaded', async () => {
    const alertSystem = new AlertSystem();

    // Get logged-in user
    const { data, error } = await supabaseClient.auth.getUser();
    const userId = data?.user?.id;

    if (error || !data?.user) {
        alertSystem.show("You must be logged in.", 'error');
        setTimeout(() => window.location.href = '../../index.html', 1500);
        return;
    }

    const openUploadFormBtn = document.getElementById('openUploadForm');
    const uploadModal = document.getElementById('uploadModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const lostFoundForm = document.getElementById('lostFoundForm');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const lostFoundContainer = document.getElementById('lostFoundContainer');

    const displayedItemIds = new Set(); // Track rendered items

    // Open / Close modal
    openUploadFormBtn.addEventListener('click', () => uploadModal.classList.remove('hidden'));
    const closeModal = () => {
        uploadModal.classList.add('hidden');
        lostFoundForm.reset();
        imagePreview.classList.add('hidden');
    };
    cancelBtn.addEventListener('click', closeModal);
    uploadModal.addEventListener('click', e => { if (e.target === uploadModal) closeModal(); });

    // Image preview
    imageUpload.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                previewImg.src = e.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // Submit report
    lostFoundForm.addEventListener('submit', async e => {
        e.preventDefault();

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return alertSystem.show("You must be logged in!", 'error');

        const itemType = document.querySelector('input[name="itemType"]:checked').value;
        const itemName = document.getElementById('itemName').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;
        const file = imageUpload.files[0];

        let filePath = null;
        if (file) {
            const ext = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${ext}`;
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('lost_found')
                .upload(fileName, file);
            if (uploadError) return alertSystem.show("Failed to upload image!", 'error');
            filePath = uploadData.path;
        }

        // Insert row
        const { data: insertedData, error: insertError } = await supabaseClient
            .from('lost_found')
            .insert([{
                item_type: itemType,
                item_name: itemName,
                category,
                description,
                location,
                auth_id: user.id,
                file_name: filePath,
                created_at: new Date()
            }])
            .select(); // return inserted row

        if (insertError) return alertSystem.show("Failed to submit report!", 'error');

        alertSystem.show("Report submitted successfully!", 'success');
        closeModal();

        // Render new report immediately
        renderLostFoundSingle(insertedData[0], true);
    });

    // Render all lost & found items on page load
    async function renderLostFound() {
        try {
            const { data: items, error } = await supabaseClient
                .from('lost_found')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            if (!items) return;

            lostFoundContainer.innerHTML = '';
            items.forEach(item => renderLostFoundSingle(item));
        } catch (err) {
            console.error("Failed to render lost & found:", err);
        }
    }

    // Render single item (can prepend or append)
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

        const datePosted = new Date(item.created_at).toLocaleString();
        const postHtml = lost_found(
            fileUrl,
            item.item_type,
            item.item_name,
            item.description,
            item.location,
            datePosted
        );

        if (prepend) {
            lostFoundContainer.insertAdjacentHTML("afterbegin", postHtml);
        } else {
            lostFoundContainer.insertAdjacentHTML("beforeend", postHtml);
        }

        displayedItemIds.add(item.id);
    }

    renderLostFound();


});
