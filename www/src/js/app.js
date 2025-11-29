import HeaderComponent from "./components/header.js";
import { mobileNavigations, rightSideBar, leftSideBar } from "./components/navigations.js";
import { createClient } from '@supabase/supabase-js'

document.addEventListener('DOMContentLoaded', function () {

    const headerElement = document.getElementById('header');
    const mobileNav = document.getElementById('mobileNav');
    const rightSideNav = document.getElementById('rightSideBar');
    const leftSideNav = document.getElementById('leftSideBar');

    if (headerElement || mobileNav) {
        headerElement.innerHTML = HeaderComponent();
        mobileNav.innerHTML = mobileNavigations();
        rightSideNav.innerHTML = rightSideBar();
        leftSideNav.innerHTML = leftSideBar();
    }

    const file = window.location.pathname.split("/").pop();
    const currentPage = file.split(".")[0];

    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        const page = item.getAttribute("data-page");

        if (page === currentPage) {
            item.classList.remove("text-gray-500");
            item.classList.add("text-primary");
        } else {
            item.classList.remove("text-primary");
            item.classList.add("text-gray-500");
        }
    });
});


const supabaseUrl = 'https://mxxrymqwkxxtvxsgkyil.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eHJ5bXF3a3h4dHZ4c2dreWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjAzNjgsImV4cCI6MjA3OTg5NjM2OH0.Z2kJCeypENzxwWfwCdO3eRspKgslJswNzi_h8gtdQJE'
const supabase = createClient(supabaseUrl, supabaseKey)


// Signup function
async function handleSignup(signupData) {
    try {
        const { name, email, password, confirmPassword } = signupData;

        // Validation
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match!');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters!');
        }

        // 1. Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (authError) throw authError;

        if (authData.user) {
            // 2. Create user profile in users table
            const { error: profileError } = await supabase
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        username: email.split('@')[0], // Generate username from email
                        fullname: name,
                        email: email,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ]);

            if (profileError) {
                console.warn('Profile creation warning:', profileError.message);
                // Continue even if profile creation has issues
            }

            return {
                success: true,
                user: authData.user,
                message: 'Account created successfully! Please check your email for verification.'
            };
        }

    } catch (error) {
        console.error('Signup error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Login function
async function handleLogin(loginData) {
    try {
        const { email, password } = loginData;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            // Load user profile from users table
            const userProfile = await loadUserProfile(data.user.id);

            return {
                success: true,
                user: data.user,
                profile: userProfile,
                message: 'Login successful!'
            };
        }

    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to load user profile
async function loadUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('Error loading user profile:', error);
        return null;
    }
}

// Check existing session
async function checkAuthSession() {
    try {
        const { data, error } = await supabase.auth.getSession();

        if (!error && data.session) {
            const userProfile = await loadUserProfile(data.session.user.id);

            return {
                success: true,
                user: data.session.user,
                profile: userProfile
            };
        }

        return { success: false, user: null, profile: null };

    } catch (error) {
        console.error('Session check error:', error);
        return { success: false, error: error.message };
    }
}

// Logout function
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        return {
            success: true,
            message: 'Logged out successfully!'
        };

    } catch (error) {
        console.error('Logout error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Update user profile
async function updateUserProfile(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select();

        if (error) throw error;

        return {
            success: true,
            data: data,
            message: 'Profile updated successfully!'
        };

    } catch (error) {
        console.error('Update profile error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}




