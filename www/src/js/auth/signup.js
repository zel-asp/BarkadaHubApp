import supabaseClient from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm'); // Attach to form

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const signupName = document.getElementById('signupName').value.trim();
        const signupEmail = document.getElementById('signupEmail').value.trim();
        const signupPassword = document.getElementById('signupPassword').value;
        const signupConfirmPassword = document.getElementById('signupConfirmPassword').value;

        // Validate empty fields
        if (!signupName || !signupEmail || !signupPassword || !signupConfirmPassword) {
            alert('Please fill out all fields');
            return;
        }

        // Validate password match
        if (signupPassword !== signupConfirmPassword) {
            alert("Passwords don't match");
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: signupEmail,
            password: signupPassword,
            options: {
                data: { display_name: signupName }
            }
        });

        if (error) {
            console.error(error);
            alert('Error creating user: ' + error.message);
        } else {
            console.log(data);
            alert('User created successfully!');
            signupForm.reset();
            window.location.href = "src/html/home.html";
        }
    });
});
