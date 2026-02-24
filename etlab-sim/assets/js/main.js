function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        // Store username in sessionStorage
        sessionStorage.setItem('username', username);

        // Detect user type based on username pattern
        const isAgent = username.toUpperCase().startsWith('AGENT');
        const isFaculty = username.toUpperCase().startsWith('FAC') ||
            username.toUpperCase().startsWith('PROF');

        // Set user type
        if (isAgent) {
            sessionStorage.setItem('userType', 'agent');
            window.location.href = 'agent-attendance.html';
        } else if (isFaculty) {
            sessionStorage.setItem('userType', 'faculty');
            window.location.href = 'faculty-dashboard.html';
        } else {
            sessionStorage.setItem('userType', 'student');
            window.location.href = 'dashboard.html';
        }
    } else {
        alert('Please enter valid credentials');
    }
}

// Dashboard initialization is handled by inline script in dashboard.html
