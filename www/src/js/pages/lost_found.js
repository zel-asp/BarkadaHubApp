import supabaseClient from '../supabase.js';
import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';

document.addEventListener('DOMContentLoaded', async function () {
    const alertSystem = new AlertSystem();

    const { data, error } = await supabaseClient.auth.getUser(); // await here

    if (error || !data?.user) {

        alertSystem.show("You must be logged in.", 'error');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 1500);
        return;
    }


    const openUploadFormBtn = document.getElementById('openUploadForm');
    const uploadModal = document.getElementById('uploadModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const lostFoundForm = document.getElementById('lostFoundForm');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    // Open modal
    openUploadFormBtn.addEventListener('click', () => uploadModal.classList.remove('hidden'));

    // Close modal
    const closeModal = () => {
        uploadModal.classList.add('hidden');
        lostFoundForm.reset();
        imagePreview.classList.add('hidden');
    };
    cancelBtn.addEventListener('click', closeModal);
    uploadModal.addEventListener('click', e => { if (e.target === uploadModal) closeModal(); });

    // Image preview
    imageUpload.addEventListener('change', function (e) {
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

    // Form submission
    lostFoundForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Check if user is logged in
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert("You must be logged in to submit a report!");
            return;
        }

        const itemType = document.querySelector('input[name="itemType"]:checked').value;
        const itemName = document.getElementById('itemName').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;
        const date = document.getElementById('date').value;
        const contact = document.getElementById('contact').value;
        const file = imageUpload.files[0];

        let filePath = null;

        if (file) {
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('lost_found')
                .upload(`${user.id}/${file.name}`, file);

            if (uploadError) {
                console.error(uploadError);
                alert("Failed to upload image");
                return;
            }

            filePath = uploadData.path;
        }

        // Insert into Supabase table
        const { data: report, error: insertError } = await supabaseClient
            .from('lost_found')
            .insert([{
                item_type: itemType,
                item_name: itemName,
                category,
                description,
                location,
                contact_number: contact,
                auth_id: user.id,
                file_name: filePath,
                created_at: new Date()
            }]);

        if (insertError) {
            console.error(insertError);
            alert("Failed to submit report!");
            return;
        }

        alert("Your report has been submitted successfully!");
        closeModal();
    });

    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();
});
