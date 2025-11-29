import supabaseClient from '../supabase.js';

// Load user data and personalize the home page
async function LoadHome() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (!error && data?.user) {
        const name = data.user.user_metadata?.display_name || "User";

        const FeedElement = document.getElementById("FeedPost");
        
          
        if (FeedElement ) {
            FeedElement.placeholder= `What's on your mind, ${name}?`;
        }
    } else {
        console.log("User not logged in");
    }
}

LoadHome();

