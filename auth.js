// auth.js
let currentUser = null;
let isRegistering = false;

// Toggle between login and register forms
function toggleAuth() {
    console.log('Toggling auth mode');
    isRegistering = !isRegistering;
    const title = document.querySelector('#authSection h2');
    const toggleBtn = document.querySelector('#authSection p button');
    const emailField = document.getElementById('emailField');
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    
    console.log('Is registering:', isRegistering);
    
    if (isRegistering) {
        title.textContent = 'Register';
        toggleBtn.textContent = 'Back to Login';
        emailField.style.display = 'block';
        submitBtn.textContent = 'Register';
    } else {
        title.textContent = 'Login';
        toggleBtn.textContent = 'Register';
        emailField.style.display = 'none';
        submitBtn.textContent = 'Login';
    }
}

// Handle form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const email = document.getElementById('loginEmail')?.value;

    console.log('Form data:', { 
        username, 
        password: '***', 
        email, 
        isRegistering 
    });

    try {
        if (isRegistering) {
            console.log('Attempting registration...');
            // Handle registration
            const userData = await window.api.registerUser({ 
                username, 
                password,
                email: email || null 
            });
            console.log('Registration successful:', userData);
            currentUser = userData;
        } else {
            console.log('Attempting login...');
            // Handle login
            const userData = await window.api.loginUser({ username, password });
            console.log('Login successful:', userData);
            currentUser = userData;
        }

        // Update UI after successful auth
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('username').textContent = currentUser.username;
        
        // Load initial data
        if (typeof loadInitialData === 'function') {
            loadInitialData();
        }

    } catch (error) {
        console.error('Authentication error:', error);
        alert(error.message);
    }
});

// Logout function
function logout() {
    console.log('Logging out');
    currentUser = null;
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    document.getElementById('loginForm').reset();
}