import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import { joinedClubHeaderTemplate } from '../render/clubs.js'

const alertSystem = new AlertSystem();

document.addEventListener('DOMContentLoaded', async () => {
    const postContent = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    const clubHeaderContainer = document.getElementById('clubHeaderContainer');
    const closeModalBtn = document.getElementById('closeModalBtn');

    /* -------------------------------------------
        CHARACTER COUNTER
    ------------------------------------------- */
    if (postContent && charCount) {
        postContent.addEventListener('input', () => {
            const length = postContent.value.length;
            charCount.textContent = length;
            charCount.classList.toggle('text-red-500', length >= 450);
        });
    }

    /* -------------------------------------------
        FETCH USER JOINED CLUB
    ------------------------------------------- */
    async function getUserJoinedClub() {
        try {
            const { data: userData, error: authError } = await supabaseClient.auth.getUser();
            if (authError || !userData?.user) return null;

            const userId = userData.user.id;

            const { data: joinedClubData, error } = await supabaseClient
                .from('club_members')
                .select('club_id, clubs(*)')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                throw error;
            }
            return joinedClubData?.clubs || null;

        } catch (err) {
            console.error('Error fetching joined club:', err);
            alertSystem.show('Failed to load your club.', 'error');
            window.location.href = './clubs.html';
            return null;
        }
    }

    /* -------------------------------------------
        GET CLUB MEMBERS COUNT
    ------------------------------------------- */
    async function getClubMembersCount(clubId) {
        try {
            const { count, error } = await supabaseClient
                .from('club_members')
                .select('user_id', { count: 'exact', head: true }) // only count
                .eq('club_id', clubId);

            if (error) throw error;
            return count || 0;

        } catch (err) {
            console.error('Error fetching club members count:', err);
            return 0;
        }
    }

    /* -------------------------------------------
        RENDER CLUB HEADER
    ------------------------------------------- */
    async function renderClubHeader(club) {
        if (!club) return;

        // Get dynamic members count
        const membersCount = await getClubMembersCount(club.id);

        clubHeaderContainer.innerHTML =
            joinedClubHeaderTemplate(club.club_image, club.club_name, club.description, membersCount, club.category);

        // Leave club logic
        const leaveBtn = document.getElementById('leaveClubBtn');
        leaveBtn.addEventListener('click', async () => {
            try {
                // Get the logged-in user
                const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
                if (userError || !user) {
                    alertSystem.show('You must be logged in to leave the club.', 'error');
                    return;
                }

                // Delete the membership
                const { error } = await supabaseClient
                    .from('club_members')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('club_id', club.id);

                if (error) throw error;

                // Delete the membership
                const { error: message } = await supabaseClient
                    .from('message')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('relation', 'club')

                alertSystem.show('You left the club.', 'success');

                setTimeout(() => {
                    window.location.href = './clubs.html';
                }, 800);

            } catch (err) {
                console.error(err);
                alertSystem.show('Failed to leave the club.', 'error');
            }
        });


    }

    // Fetch joined club and render
    const joinedClub = await getUserJoinedClub();
    await renderClubHeader(joinedClub);
});
