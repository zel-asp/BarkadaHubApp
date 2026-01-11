import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import clubs from '../render/clubs.js';

document.addEventListener('DOMContentLoaded', async () => {
    const alertSystem = new AlertSystem();

    /* =====================================================
    AUTHENTICATION
    ===================================================== */
    async function checkUserAuth() {
        try {
            const { data, error } = await supabaseClient.auth.getUser();
            if (error || !data?.user) {
                alertSystem.show("You must be logged in.", "error");
                setTimeout(() => {
                    window.location.href = "../../index.html";
                }, 1500);
                return false;
            }
            return true;
        } catch (err) {
            console.error("Auth check failed:", err);
            alertSystem.show("An unexpected error occurred.", "error");
            return false;
        }
    }

    if (!(await checkUserAuth())) return;

    async function showCreateBtnForAdmins() {
        const createClubBtn = document.getElementById("createClubBtn");
        if (!createClubBtn) return; // Exit if button not found

        try {
            const { data, error } = await supabaseClient.auth.getUser();
            const userId = data.user.id;

            const adminIds = [
                'c1517366-9c04-41af-bf32-d0db2b2bab85',
                'd35072cd-9fe3-43bf-9dc8-adb050384154'
            ];

            if (!adminIds.includes(userId)) {
                createClubBtn.classList.add('hidden');
            }
        } catch (err) {
            console.error("Error checking admin:", err);
        }
    }

    showCreateBtnForAdmins();



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
    MODAL FUNCTIONS
    ===================================================== */
    function openModal() {
        if (!elements.modal) return;
        elements.modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        if (!elements.modal) return;
        elements.modal.classList.add("hidden");
        document.body.style.overflow = "";
    }

    function setupModalEvents() {
        elements.openBtn?.addEventListener("click", openModal);
        elements.closeBtn?.addEventListener("click", closeModal);
        elements.cancelBtn?.addEventListener("click", closeModal);

        elements.modal?.addEventListener("click", (e) => {
            if (e.target === elements.modal) closeModal();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !elements.modal?.classList.contains("hidden")) {
                closeModal();
            }
        });
    }

    /* =====================================================
    IMAGE HANDLING FUNCTIONS
    ===================================================== */
    function openFileDialog() {
        elements.inputFile?.click();
    }

    function resetImagePreview() {
        if (elements.inputFile) elements.inputFile.value = "";
        if (elements.imagePreview) elements.imagePreview.src = "";

        elements.previewContainer?.classList.add("hidden");
        elements.emptyPreview?.classList.remove("hidden");
        elements.fileNameWrapper?.classList.add("hidden");
    }

    function handleImageSelection() {
        const file = elements.inputFile.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            resetImagePreview();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be smaller than 5MB.");
            resetImagePreview();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            elements.imagePreview.src = e.target.result;
            elements.previewContainer.classList.remove("hidden");
            elements.emptyPreview.classList.add("hidden");
        };
        reader.readAsDataURL(file);

        elements.fileNameText.textContent = file.name;
        elements.fileNameWrapper.classList.remove("hidden");
    }

    function setupImageEvents() {
        elements.uploadBtn?.addEventListener("click", openFileDialog);
        elements.emptyPreview?.addEventListener("click", openFileDialog);
        elements.imagePreview?.addEventListener("click", openFileDialog);
        elements.inputFile?.addEventListener("change", handleImageSelection);
        elements.removeImageBtn?.addEventListener("click", resetImagePreview);
    }

    /* =====================================================
    FORM SUBMISSION FUNCTIONS
    ===================================================== */
    async function uploadClubImage(userId, imageFile) {
        const filePath = `clubs/${userId}-${Date.now()}-${imageFile.name}`;

        const { error } = await supabaseClient.storage
            .from("clubs")
            .upload(filePath, imageFile);

        if (error) throw error;

        const { data } = supabaseClient.storage
            .from("clubs")
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const clubName = document.getElementById("clubName")?.value.trim();
        const description = document.getElementById("description")?.value.trim();
        const location = document.getElementById("location")?.value.trim();
        const imageFile = elements.inputFile?.files[0];
        const selectedCategory = document.querySelector('input[name="category"]:checked').value.trim();

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            let imageUrl = null;
            if (imageFile) {
                imageUrl = await uploadClubImage(user.id, imageFile);
            }

            const { error } = await supabaseClient
                .from("clubs")
                .insert({
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
    }

    function setupForm() {
        elements.form?.addEventListener("submit", handleFormSubmit);
    }

    async function getClubs() {
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData.user.id;

        // Fetch all clubs
        const { data: clubsData, error: clubsError } = await supabaseClient
            .from('clubs')
            .select('*')
            .order('created_at', { ascending: false });

        if (clubsError) {
            alertSystem.show(clubsError.message, 'error');
            return;
        }

        if (!clubsData || clubsData.length === 0) {
            alertSystem.show('No Clubs available right now', 'info');
            return;
        }

        // Fetch club the user has already joined (if any)
        const { data: joinedClubData } = await supabaseClient
            .from('club_members')
            .select('club_id')
            .eq('user_id', userId)
            .maybeSingle();

        const joinedClubId = joinedClubData?.club_id || null;

        // Move the joined club to the top of the array
        let orderedClubs = [...clubsData];
        if (joinedClubId) {
            const joinedIndex = orderedClubs.findIndex(c => c.id === joinedClubId);
            if (joinedIndex > -1) {
                const [joinedClub] = orderedClubs.splice(joinedIndex, 1);
                orderedClubs.unshift(joinedClub);
            }
        }

        // Fetch member counts for all clubs
        const { data: membersData } = await supabaseClient
            .from('club_members')
            .select('club_id, user_id', { count: 'exact' });

        const memberCounts = {};
        if (membersData) {
            membersData.forEach(m => {
                memberCounts[m.club_id] = (memberCounts[m.club_id] || 0) + 1;
            });
        }

        // Clear container before rendering
        elements.clubContainer.innerHTML = "";

        orderedClubs.forEach(club => {
            let icon = '';
            switch (club.category) {
                case 'tech': icon = 'code'; break;
                case 'sports': icon = 'basketball-ball'; break;
                case 'arts': icon = 'paint-brush'; break;
                case 'academic': icon = 'graduation-cap'; break;
                default: icon = 'users';
            }

            const isJoined = joinedClubId === club.id;
            const totalMembers = memberCounts[club.id] || 0;

            const showClub = clubs(
                club.club_image,
                club.club_name,
                icon,
                club.location,
                club.description,
                club.id,
                club.category,
                totalMembers,
                isJoined
            );

            elements.clubContainer.insertAdjacentHTML('beforeend', showClub);
        });

        setupJoinClubButtons(joinedClubId);
    }



    async function setupJoinClubButtons(joinedClubId) {
        const joinBtns = document.querySelectorAll('.join-btn');

        joinBtns.forEach(btn => {
            const clubId = btn.dataset.id;

            if (joinedClubId) {
                // Disable buttons for clubs not joined
                if (clubId !== joinedClubId) {
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                    return;
                }
            }

            btn.addEventListener('click', async () => {
                const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
                if (userError || !user) {
                    alertSystem.show('You must be logged in to join a club.', 'error');
                    return;
                }

                if (joinedClubId) {
                    // Already joined → go to club
                    window.location.href = `./joinedClub.html?clubId=${clubId}`;
                    return;
                }

                try {
                    const { data, error } = await supabaseClient
                        .from('club_members')
                        .insert([{ club_id: clubId, user_id: user.id }])
                        .select();

                    // Fetch club info
                    const { data: clubData, error: clubError } = await supabaseClient
                        .from('clubs')
                        .select('club_name, club_image')
                        .eq('id', clubId)
                        .single();

                    if (clubError) throw clubError;

                    // Insert into message table
                    const { error: messageError } = await supabaseClient
                        .from('message')
                        .insert({
                            user_id: user.id,
                            friends_id: clubId,
                            friend_name: clubData.club_name,
                            friend_avatar: clubData.club_image,
                            relation: 'club'
                        });

                    if (messageError) throw messageError;
                    if (error) throw error;

                    // Refresh clubs to reflect Enter button & disable others
                    getClubs();

                } catch (err) {
                    console.error(err);
                    alertSystem.show('Failed to join the club.', 'error');
                }
            });
        });
    }


    /* =====================================================
    INITIALIZE ALL FEATURES
    ===================================================== */
    setupModalEvents();
    setupImageEvents();
    setupForm();
    getClubs();
});
