import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import { students } from '../data/students.js';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const lockIcons = document.querySelectorAll('.lockIcon');
    const alertSystem = new AlertSystem();

    /* ------------------------------------
        SECURE INPUT SANITIZER
    ------------------------------------ */
    function sanitize(str) {
        return str.replace(/[&<>"'\/]/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        }[match]));
    }

    /* ------------------------------------
        PASSWORD SHOW/HIDE
    ------------------------------------ */
    lockIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const input = icon.previousElementSibling;
            if (!input) return;

            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';

            icon.classList.toggle('fa-lock', !isHidden);
            icon.classList.toggle('fa-unlock', isHidden);
        });
    });

    /* ------------------------------------
        REAL-TIME STUDENT ID VALIDATION
    ------------------------------------ */
    const studentNumberInput = document.getElementById('studentNumber');
    if (studentNumberInput) {
        // Create feedback element
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'mt-2 text-sm font-medium flex items-center gap-2';
        feedbackDiv.id = 'studentNumberFeedback';
        feedbackDiv.style.display = 'none';
        studentNumberInput.parentElement.parentElement.appendChild(feedbackDiv);

        // Check student ID as user types
        studentNumberInput.addEventListener('input', () => {
            const inputValue = studentNumberInput.value.trim();
            
            if (!inputValue) {
                feedbackDiv.style.display = 'none';
                return;
            }

            const foundStudent = students.find(s => s.id === inputValue);
            
            if (foundStudent) {
                feedbackDiv.innerHTML = `<i class="fas fa-check-circle text-green-500"></i> <span class="text-green-600">✓ ${foundStudent.name}</span>`;
                feedbackDiv.style.display = 'flex';
                studentNumberInput.classList.remove('border-red-400');
                studentNumberInput.classList.add('border-green-400');
            } else {
                feedbackDiv.innerHTML = `<i class="fas fa-exclamation-circle text-orange-500"></i> <span class="text-orange-600">Not found in system</span>`;
                feedbackDiv.style.display = 'flex';
                studentNumberInput.classList.remove('border-green-400');
                studentNumberInput.classList.add('border-orange-400');
            }
        });

        // Clear feedback on blur if empty
        studentNumberInput.addEventListener('blur', () => {
            if (!studentNumberInput.value.trim()) {
                feedbackDiv.style.display = 'none';
                studentNumberInput.classList.remove('border-green-400', 'border-orange-400');
            }
        });
    }

    /* ------------------------------------
        SIGNUP EVENT
    ------------------------------------ */
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        // Disable button immediately
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing up...';
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            // Raw inputs
            let signupName = document.getElementById('signupName').value.trim();
            let signupEmail = document.getElementById('signupEmail').value.trim();
            let studentNumber = document.getElementById('studentNumber').value.trim();
            const signupPassword = document.getElementById('signupPassword');
            const signupConfirmPassword = document.getElementById('signupConfirmPassword');

            const password = signupPassword.value;
            const confirmPassword = signupConfirmPassword.value;

            // Sanitize to prevent XSS
            signupName = sanitize(signupName);
            signupEmail = sanitize(signupEmail);

            /* ------------------------------------
                VALIDATION
            ------------------------------------ */

            // Required fields
            if (!signupName || !signupEmail || !studentNumber || !password || !confirmPassword) {
                alertSystem.show('Please fill out all fields', 'error');
                return;
            }

            /* ------------------------------------
            VALIDATE STUDENT NUMBER
            ------------------------------------ */
            const foundStudent = students.find(student => student.id === studentNumber);
            let studentVerified = false;
            let officialStudentName = null;
            let studentYearLevel = null;
            let studentMajor = null;
            
            if (foundStudent) {
                // Student found - use their official data from the list
                signupName = foundStudent.name;
                studentVerified = true;
                officialStudentName = foundStudent.name;
                studentYearLevel = foundStudent.year_level || null;
                studentMajor = foundStudent.major || null;
                alertSystem.show(`Student verified! Welcome ${foundStudent.name}`, 'success');
            } else {
                // Student not found - mark as unknown
                alertSystem.show('Student number not found in our records. Registering as UNKNOWN student.', 'warning');
                studentVerified = false;
            }

            /* ------------------------------------
            CHECK IF EMAIL EXISTS IN PROFILE
            ------------------------------------ */
            const sanitizedEmail = signupEmail.toLowerCase();

            const { data: existingUser, error: emailError } = await supabaseClient
                .from('profile')
                .select('email')
                .ilike('email', sanitizedEmail)
                .maybeSingle();

            if (emailError) {
                alertSystem.show('Server error. Please try again.', 'error');
                return;
            }

            if (existingUser) {
                alertSystem.show('Email is already registered.', 'error');
                return;
            }

            // Name must contain letters & spaces only (skip for official names with special chars)
            if (!foundStudent && !/^[a-zA-Z\s]+$/.test(signupName)) {
                alertSystem.show('Name contains invalid characters', 'error');
                return;
            }

            // Basic email format check
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
                alertSystem.show('Invalid email format', 'error');
                return;
            }

            // Prevent script injection
            if (/<|>|script/i.test(signupName) || /<|>|script/i.test(signupEmail)) {
                alertSystem.show('Invalid characters detected', 'error');
                return;
            }

            // Password length
            if (password.length < 8) {
                alertSystem.show('Password must be at least 8 characters long', 'error');
                return;
            }

            // Password match
            if (password !== confirmPassword) {
                alertSystem.show("Passwords don't match", 'error');
                return;
            }

            /* ------------------------------------
                SUPABASE SIGNUP
            ------------------------------------ */
            const { data, error } = await supabaseClient.auth.signUp({
                email: signupEmail,
                password: password,
                options: {
                    emailRedirectTo: 'https://confirmed-email.netlify.app/',
                    data: {
                        display_name: signupName
                    }
                }
            });

            if (error) {
                console.error(error);
                alertSystem.show(`Error creating user: ${error.message}`, 'error');
            } else {
                alertSystem.show(
                    'Account created successfully! Check your email to verify your account.',
                    'success'
                );
                
                // After successful signup, save student data to profile
                const userId = data.user?.id;
                
                if (userId) {
                    // Wait a moment for auth to fully complete
                    setTimeout(async () => {
                        try {
                            console.log('Attempting to save student data for user:', userId);
                            console.log('Student Number:', studentNumber);
                            console.log('Student Verified:', studentVerified);
                            console.log('Official Name:', officialStudentName);
                            
                            const { data: upsertData, error: profileError } = await supabaseClient
                                .from('profile')
                                .upsert({
                                    id: userId,
                                    name: signupName,
                                    email: signupEmail,
                                    // Only save student_id if verified (found in students list)
                                    student_id: studentVerified ? studentNumber : null,
                                    student_verified: studentVerified,
                                    student_name_official: officialStudentName,
                                    year_level: studentYearLevel,
                                    major: studentMajor
                                }, { onConflict: 'id' });

                            if (profileError) {
                                console.error('Profile upsert error:', profileError);
                                console.error('Error details:', profileError.message, profileError.code);
                            } else {
                                console.log('Profile upsert successful:', upsertData);
                                if (!studentVerified) {
                                    console.warn('Student ID not found in records - saved as Unknown');
                                }
                            }
                        } catch (err) {
                            console.error('Profile insert exception:', err);
                        }
                    }, 500); // Wait 500ms
                }
                
                signupForm.reset();
            }

        } catch (err) {
            console.error(err);
            alertSystem.show(err.message || 'Failed to create account', 'error');
        } finally {
            // Always re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
});
