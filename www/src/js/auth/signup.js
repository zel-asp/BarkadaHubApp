import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import { students } from '../data/students.js';

document.addEventListener('DOMContentLoaded', () => {

    const signupForm = document.getElementById('signupForm');
    const lockIcons = document.querySelectorAll('.lockIcon');
    const alertSystem = new AlertSystem();

    if (!signupForm) return;

    /* -----------------------------
    helper: sanitize input
    ----------------------------- */
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

    /* -----------------------------
    password show/hide toggle
    ----------------------------- */
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

    /* -----------------------------
    real-time student id validation
    ----------------------------- */
    const studentNumberInput = document.getElementById('studentNumber');

    if (studentNumberInput) {

        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'mt-2 text-sm font-medium flex items-center gap-2';
        feedbackDiv.id = 'studentNumberFeedback';
        feedbackDiv.style.display = 'none';
        studentNumberInput.parentElement.parentElement.appendChild(feedbackDiv);

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

        studentNumberInput.addEventListener('blur', () => {
            if (!studentNumberInput.value.trim()) {
                feedbackDiv.style.display = 'none';
                studentNumberInput.classList.remove('border-green-400', 'border-orange-400');
            }
        });
    }

    /* -----------------------------
    signup form submit
    ----------------------------- */
    signupForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing up...';
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            // raw inputs
            let signupName = document.getElementById('signupName').value.trim();
            let signupEmail = document.getElementById('signupEmail').value.trim();
            let studentNumber = document.getElementById('studentNumber').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;

            // sanitize
            signupName = sanitize(signupName);
            signupEmail = sanitize(signupEmail);
            studentNumber = sanitize(studentNumber);


            /* -----------------------------
            basic validation
            ----------------------------- */
            if (!signupName || !signupEmail || !studentNumber || !password || !confirmPassword) {
                alertSystem.show('Please fill out all fields', 'error');
                return;
            }

            const { data: student, error: studentError } = await supabaseClient
                .from('profile')
                .select('student_id')
                .eq('student_id', studentNumber)
                .maybeSingle();

            if (studentError && studentError.code !== 'PGRST116') {
                console.error(studentError);
                alertSystem.show('Failed to load profile', 'error');
            }

            if (student) {
                return alertSystem.show('Student Number already in use', 'error');
            }

            // validate student
            const foundStudent = students.find(s => s.id === studentNumber);
            let studentVerified = false;
            let officialStudentName = null;
            let studentYearLevel = null;
            let studentMajor = null;

            if (foundStudent) {
                studentVerified = true;
                officialStudentName = foundStudent.name;
                studentYearLevel = foundStudent.year_level || null;
                studentMajor = foundStudent.major || null;
                alertSystem.show(`Student verified! Welcome ${foundStudent.name}`, 'success');
            } else {
                alertSystem.show('Student number not found in our records. Registering as UNKNOWN student.', 'warning');
                studentVerified = false;
            }

            // email format
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
                alertSystem.show('Invalid email format', 'error');
                return;
            }

            // prevent script injection
            if (/<|>|script/i.test(signupName) || /<|>|script/i.test(signupEmail)) {
                alertSystem.show('Invalid characters detected', 'error');
                return;
            }

            // password rules
            if (password.length < 8) {
                alertSystem.show('Password must be at least 8 characters long', 'error');
                return;
            }

            if (password !== confirmPassword) {
                alertSystem.show("Passwords don't match", 'error');
                return;
            }

            // check if email exists
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

            // signup with supabase
            const { data, error } = await supabaseClient.auth.signUp({
                email: signupEmail,
                password: password,
                options: {
                    emailRedirectTo: 'https://confirmed-email.netlify.app/',
                    data: { display_name: signupName }
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

                const userId = data.user?.id;

                if (userId) {
                    // save student data to profile
                    setTimeout(async () => {
                        try {
                            const { data: upsertData, error: profileError } = await supabaseClient
                                .from('profile')
                                .upsert({
                                    id: userId,
                                    name: signupName,
                                    email: signupEmail,
                                    student_id: studentVerified ? studentNumber : null,
                                    student_verified: studentVerified,
                                    student_name_official: officialStudentName,
                                    year_level: studentYearLevel,
                                    major: studentMajor
                                }, { onConflict: 'id' });

                            if (profileError) {
                                console.error('profile upsert error:', profileError);
                            }
                        } catch (err) {
                            console.error('profile insert exception:', err);
                        }
                    }, 500);
                }

                signupForm.reset();
            }

        } catch (err) {
            console.error(err);
            alertSystem.show(err.message || 'Failed to create account', 'error');
        } finally {
            // re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });

});
