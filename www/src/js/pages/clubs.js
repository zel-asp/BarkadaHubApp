import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import clubs from '../render/clubs.js';

document.addEventListener('DOMContentLoaded', async () => {
    const alertSystem = new AlertSystem();

    /* =====================================================
       AUTHENTICATION
    ===================================================== */
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) {
        alertSystem.show("You must be logged in.", "error");
        setTimeout(() => window.location.href = "../../index.html", 1500);
        return;
    }
    const userId = authData.user.id;

    /* =====================================================
       ADMIN CHECK
    ===================================================== */
    const createClubBtn = document.getElementById("createClubBtn");
    const adminIds = [
        'c1517366-9c04-41af-bf32-d0db2b2bab85',
        'd35072cd-9fe3-43bf-9dc8-adb050384154'
    ];
    if (createClubBtn && !adminIds.includes(userId)) createClubBtn.classList.add('hidden');

    /* =====================================================
       ELEMENT REFERENCES
    ===================================================== */
    const elements = {
        modal: document.getElementById("createClubModal"),
        openBtn: document.getElementById("openCreateClubBtn"),
        closeBtn: document.getElementById("closeModalBtn"),
        cancelBtn: document.getElementById("cancelBtn"),
        form: document.getElementById("createClubForm"),
        uploadBtn: document.getElementById("uploadImageBtn"),
        inputFile: document.getElementById("clubPicture"),
        emptyPreview: document.getElementById("emptyPreviewContainer"),
        previewContainer: document.getElementById("imagePreviewContainer"),
        imagePreview: document.getElementById("imagePreview"),
        removeImageBtn: document.getElementById("removeImageBtn"),
        fileNameWrapper: document.getElementById("fileName"),
        fileNameText: document.getElementById("fileNameText"),
        clubContainer: document.getElementById("clubContainer"),
    };

    /* =====================================================
       MODAL
    ===================================================== */
    const openModal = () => {
        if (!elements.modal) return;
        elements.modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    };
    const closeModal = () => {
        if (!elements.modal) return;
        elements.modal.classList.add("hidden");
        document.body.style.overflow = "";
    };
    const setupModalEvents = () => {
        elements.openBtn?.addEventListener("click", openModal);
        elements.closeBtn?.addEventListener("click", closeModal);
        elements.cancelBtn?.addEventListener("click", closeModal);
        elements.modal?.addEventListener("click", e => { if (e.target === elements.modal) closeModal(); });
        document.addEventListener("keydown", e => { if (e.key === "Escape" && !elements.modal?.classList.contains("hidden")) closeModal(); });
    };

    /* =====================================================
       IMAGE HANDLING
    ===================================================== */
    const openFileDialog = () => elements.inputFile?.click();
    const resetImagePreview = () => {
        elements.inputFile.value = "";
        if (elements.imagePreview) elements.imagePreview.src = "";
        elements.previewContainer?.classList.add("hidden");
        elements.emptyPreview?.classList.remove("hidden");
        elements.fileNameWrapper?.classList.add("hidden");
    };
    const handleImageSelection = () => {
        const file = elements.inputFile.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
            alert(file.size > 5 * 1024 * 1024 ? "Image must be smaller than 5MB." : "Please select an image file.");
            return resetImagePreview();
        }
        const reader = new FileReader();
        reader.onload = e => {
            elements.imagePreview.src = e.target.result;
            elements.previewContainer.classList.remove("hidden");
            elements.emptyPreview.classList.add("hidden");
        };
        reader.readAsDataURL(file);
        elements.fileNameText.textContent = file.name;
        elements.fileNameWrapper.classList.remove("hidden");
    };
    const setupImageEvents = () => {
        elements.uploadBtn?.addEventListener("click", openFileDialog);
        elements.emptyPreview?.addEventListener("click", openFileDialog);
        elements.imagePreview?.addEventListener("click", openFileDialog);
        elements.inputFile?.addEventListener("change", handleImageSelection);
        elements.removeImageBtn?.addEventListener("click", resetImagePreview);
    };

    /* =====================================================
       FORM SUBMISSION
    ===================================================== */
    const uploadClubImage = async (userId, imageFile) => {
        const filePath = `clubs/${userId}-${Date.now()}-${imageFile.name}`;
        const { error } = await supabaseClient.storage.from("clubs").upload(filePath, imageFile);
        if (error) throw error;
        return supabaseClient.storage.from("clubs").getPublicUrl(filePath).data.publicUrl;
    };
    const handleFormSubmit = async e => {
        e.preventDefault();
        const clubName = document.getElementById("clubName")?.value.trim();
        const description = document.getElementById("description")?.value.trim();
        const location = document.getElementById("location")?.value.trim();
        const imageFile = elements.inputFile?.files[0];
        const selectedCategory = document.querySelector('input[name="category"]:checked')?.value.trim();
        if (!selectedCategory) return;

        try {
            const imageUrl = imageFile ? await uploadClubImage(userId, imageFile) : null;
            const { error } = await supabaseClient.from("clubs").insert({
                club_name: clubName,
                description,
                location,
                club_image: imageUrl,
                category: selectedCategory
            });
            if (error) throw error;

            alertSystem.show("Club created successfully!", "success");
            elements.form.reset();
            resetImagePreview();
            closeModal();
        } catch (err) {
            console.error("Create club error:", err);
            alertSystem.show("Error creating club", "error");
        }
    };
    const setupForm = () => elements.form?.addEventListener("submit", handleFormSubmit);

    /* =====================================================
       FETCH & RENDER CLUBS
    ===================================================== */
    const getClubs = async () => {
        const { data: clubsData, error: clubsError } = await supabaseClient.from('clubs').select('*').order('created_at', { ascending: false });
        if (clubsError) return alertSystem.show(clubsError.message, 'error');
        if (!clubsData || clubsData.length === 0) return alertSystem.show('No Clubs available right now', 'info');

        const { data: joinedClubData } = await supabaseClient.from('club_members').select('club_id').eq('user_id', userId).maybeSingle();
        const joinedClubId = joinedClubData?.club_id || null;

        // Move joined club to top
        let orderedClubs = [...clubsData];
        if (joinedClubId) {
            const idx = orderedClubs.findIndex(c => c.id === joinedClubId);
            if (idx > -1) orderedClubs.unshift(...orderedClubs.splice(idx, 1));
        }

        const { data: membersData } = await supabaseClient.from('club_members').select('club_id, user_id');
        const memberCounts = {};
        membersData?.forEach(m => memberCounts[m.club_id] = (memberCounts[m.club_id] || 0) + 1);

        elements.clubContainer.innerHTML = "";
        orderedClubs.forEach(club => {
            const iconMap = { tech: 'code', sports: 'basketball-ball', arts: 'paint-brush', academic: 'graduation-cap' };
            const icon = iconMap[club.category] || 'users';
            const isJoined = joinedClubId === club.id;
            const totalMembers = memberCounts[club.id] || 0;
            elements.clubContainer.insertAdjacentHTML('beforeend', clubs(club.club_image, club.club_name, icon, club.location, club.description, club.id, club.category, totalMembers, isJoined));
        });

        setupJoinClubButtons(joinedClubId);
    };

    /* =====================================================
       JOIN CLUB BUTTONS
    ===================================================== */
    const setupJoinClubButtons = async (joinedClubId) => {
        document.querySelectorAll('.join-btn').forEach(btn => {
            const clubId = btn.dataset.id;

            if (joinedClubId && clubId !== joinedClubId) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
                return;
            }

            btn.addEventListener('click', async () => {
                if (joinedClubId) return window.location.href = `./joinedClub.html?clubId=${clubId}`;

                try {
                    const { data, error } = await supabaseClient.from('club_members').insert([{ club_id: clubId, user_id: userId }]).select();
                    if (error) throw error;

                    const { data: clubData, error: clubError } = await supabaseClient.from('clubs').select('club_name, club_image').eq('id', clubId).single();
                    if (clubError) throw clubError;

                    const { data: conversation, error: convError } = await supabaseClient.from('conversations').insert({ type: 'friend' }).select('id').single();
                    if (convError) throw convError;

                    const { data: member } = await supabaseClient.from('club_members').select('id').eq('user_id', userId).eq('club_id', clubId).single();
                    const { error: messageError } = await supabaseClient.from('message').insert({
                        user_id: userId,
                        friends_id: clubId,
                        friend_name: clubData.club_name,
                        friend_avatar: clubData.club_image,
                        relation: 'club',
                        clubMember_id: member.id,
                        conversation_id: conversation.id
                    });
                    if (messageError) throw messageError;

                    getClubs();
                } catch (err) {
                    console.error(err);
                    alertSystem.show('Failed to join the club.', 'error');
                }
            });
        });
    };

    /* =====================================================
       INITIALIZE
    ===================================================== */
    setupModalEvents();
    setupImageEvents();
    setupForm();
    getClubs();
});
