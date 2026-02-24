// Automated Attendance Agent Logic

// Process attendance from CSV file in attendance_records folder
let isProcessing = false;

async function processAttendanceFromCSV() {
    if (isProcessing) {
        console.log('Already processing a CSV. Skipping concurrent call.');
        return;
    }

    isProcessing = true;
    const statusDiv = document.getElementById('status-messages');

    // Show loading message
    showStatus('info', '<i class="fas fa-spinner fa-spin"></i> Reading CSV from attendance_records folder...', statusDiv);

    try {
        // Fetch CSV from attendance_records folder
        const response = await fetch('attendance_records/attendance_record.csv');

        if (!response.ok) {
            throw new Error('CSV file not found in attendance_records folder. Please ensure the file exists and you are running with a local server (e.g., Live Server in VS Code).');
        }

        const csvText = await response.text();

        // Parse CSV
        const csvData = parseCSV(csvText);

        if (csvData.length === 0) {
            throw new Error('CSV data is empty or invalid.');
        }

        // Show CSV preview
        displayCSVPreview(csvData);

        // Validate CSV data
        const validation = validateCSVData(csvData);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        showStatus('success', '<i class="fas fa-check-circle"></i> CSV file loaded successfully!', statusDiv);

        // Check for existing records to prevent duplication (ignoring date)
        const existingRecordsResponse = await fetch('/api/attendance');
        if (existingRecordsResponse.ok) {
            const records = await existingRecordsResponse.json();

            // Normalize values for comparison
            const targetClass = (csvData[0].Subject || '').trim();
            const targetHour = (csvData[0].Hour || '').trim();

            const alreadyMarked = records.find(r =>
                (r.class || '').trim() === targetClass &&
                (r.hour || '').trim() === targetHour
            );

            if (alreadyMarked) {
                const upToDateHTML = `
                    <div class="status-success">
                        <h3><i class="fas fa-check-circle"></i> Attendance is up-to-date</h3>
                        <p>Records for <strong>${targetClass}</strong> - <strong>${targetHour}</strong> already exist on the server.</p>
                        <a href="view-attendance.html" class="btn-view-records" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #4facfe; color: white; border-radius: 8px; text-decoration: none;">
                            <i class="fas fa-eye"></i> View Existing Records
                        </a>
                    </div>
                `;
                showStatus('success', upToDateHTML, statusDiv);

                // Ensure preview is hidden if it was previously shown
                const previewCard = document.getElementById('csv-preview');
                if (previewCard) previewCard.style.display = 'none';

                return;
            }
        }

        // Show CSV preview only if not already marked
        displayCSVPreview(csvData);

        // Process attendance
        setTimeout(() => {
            markAttendanceFromCSV(csvData, statusDiv);
        }, 1000);

    } catch (error) {
        showStatus('error', '<i class="fas fa-exclamation-circle"></i> Error: ' + error.message, statusDiv);
    } finally {
        isProcessing = false;
    }
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    // Remove BOM if present
    const cleanText = csvText.replace(/^\uFEFF/, '');
    const lines = cleanText.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());

    console.log('CSV Headers detected:', headers);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        } else {
            console.warn(`Skipping row ${i} due to column mismatch: expected ${headers.length}, got ${values.length}`);
        }
    }

    console.log('Parsed CSV Data (first row):', data[0]);
    return data;
}

// Validate CSV data
function validateCSVData(csvData) {
    // Check if required columns exist
    if (csvData.length === 0) {
        return { valid: false, error: 'CSV file is empty' };
    }

    const firstRow = csvData[0];
    if (!firstRow.RollNo || !firstRow.Name || !firstRow.Status || !firstRow.Subject || !firstRow.Hour) {
        return { valid: false, error: 'CSV must have columns: RollNo, Name, Status, Subject, Hour' };
    }

    // Validate status values
    for (const row of csvData) {
        const status = (row.Status || '').toLowerCase();
        if (status !== 'present' && status !== 'absent') {
            return { valid: false, error: `Invalid status "${row.Status}" for ${row.RollNo}. Must be "present" or "absent"` };
        }
    }

    return { valid: true };
}

// Display CSV preview
function displayCSVPreview(csvData) {
    const previewCard = document.getElementById('csv-preview');
    const tableContainer = document.getElementById('csv-table-container');

    const firstRow = csvData[0];
    const hasSubject = !!firstRow.Subject;
    const hasHour = !!firstRow.Hour;

    let tableHTML = `
        <div class="csv-metadata">
            ${hasSubject ? `<p><strong>Detected Subject:</strong> ${firstRow.Subject}</p>` : ''}
            ${hasHour ? `<p><strong>Detected Hour:</strong> ${firstRow.Hour}</p>` : ''}
        </div>
        <table class="attendance-table">
            <thead>
                <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Status</th>
                    ${hasSubject ? '<th>Subject</th>' : ''}
                    ${hasHour ? '<th>Hour</th>' : ''}
                </tr>
            </thead>
            <tbody>
    `;

    csvData.forEach(row => {
        const statusClass = (row.Status || '').toLowerCase() === 'present' ? 'present' : 'absent';
        tableHTML += `
            <tr>
                <td>${row.RollNo}</td>
                <td>${row.Name}</td>
                <td><span class="status-badge ${statusClass}">${row.Status}</span></td>
                ${hasSubject ? `<td>${row.Subject}</td>` : ''}
                ${hasHour ? `<td>${row.Hour}</td>` : ''}
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = tableHTML;
    previewCard.style.display = 'block';
}

// Mark attendance based on CSV data
async function markAttendanceFromCSV(csvData, statusDiv) {
    showStatus('info', '<i class="fas fa-spinner fa-spin"></i> Processing attendance...', statusDiv);

    const agentName = sessionStorage.getItem('username') || 'AGENT001';
    const date = new Date().toISOString();

    // Use Subject and Hour from CSV (now mandatory)
    const firstRow = csvData[0];
    const selectedClass = firstRow.Subject;
    const selectedHour = firstRow.Hour;

    if (!selectedClass || !selectedHour) {
        throw new Error('Subject or Hour information missing in CSV.');
    }

    // Convert CSV data to attendance format
    const students = csvData.map(row => ({
        rollNo: row.RollNo,
        name: row.Name,
        status: row.Status.toLowerCase()
    }));

    // Calculate summary
    const total = students.length;
    const present = students.filter(s => s.status === 'present').length;
    const absent = total - present;

    // Create attendance record
    const attendanceRecord = {
        id: Date.now(),
        date: date,
        faculty: agentName + ' (Automated)',
        class: selectedClass,
        hour: selectedHour,
        students: students,
        summary: {
            total: total,
            present: present,
            absent: absent
        }
    };

    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(attendanceRecord)
        });

        if (!response.ok) {
            throw new Error('Failed to save attendance to server');
        }

        // Show success message
        const successHTML = `
            <div class="success-summary">
                <h3><i class="fas fa-check-circle"></i> Attendance Processed Successfully!</h3>
                <div class="summary-stats">
                    <div class="stat-box">
                        <span class="stat-label">Total Students</span>
                        <span class="stat-value">${total}</span>
                    </div>
                    <div class="stat-box present">
                        <span class="stat-label">Present</span>
                        <span class="stat-value">${present}</span>
                    </div>
                    <div class="stat-box absent">
                        <span class="stat-label">Absent</span>
                        <span class="stat-value">${absent}</span>
                    </div>
                </div>
                <p><strong>Class:</strong> ${selectedClass}</p>
                <p><strong>Hour:</strong> ${selectedHour}</p>
                <p><strong>Saved at:</strong> ${new Date().toLocaleString()}</p>
                <a href="view-attendance.html" class="btn-view-records">
                    <i class="fas fa-eye"></i> View All Records
                </a>
            </div>
        `;

        showStatus('success', successHTML, statusDiv);
    } catch (error) {
        console.error('Error saving attendance:', error);
        showStatus('error', '<i class="fas fa-exclamation-circle"></i> Error saving to server: ' + error.message, statusDiv);
    }
}

// Autonomous Agent Polling
async function checkForAutonomousTrigger() {
    try {
        const response = await fetch('/api/agent/status');
        const data = await response.json();

        if (data.triggered) {
            console.log('Autonomous trigger received!');
            // Reset trigger so it doesn't fire repeatedly
            await fetch('/api/agent/reset', { method: 'POST' });

            // Automatically process CSV if we are on the agent page and the function exists
            if (typeof processAttendanceFromCSV === 'function' && document.getElementById('status-messages')) {
                processAttendanceFromCSV();
            }
        }
    } catch (error) {
        console.error('Error polling agent status:', error);
    }
}

// Start polling if user is an agent
if (sessionStorage.getItem('userType') === 'agent') {
    console.log('Autonomous agent mode active. Polling server...');
    // Initial check on load
    window.addEventListener('load', () => {
        setTimeout(processAttendanceFromCSV, 2000);
    });
    setInterval(checkForAutonomousTrigger, 5000); // Poll every 5 seconds
}

// Show status message
function showStatus(type, message, container) {
    const statusClass = type === 'error' ? 'status-error' :
        type === 'success' ? 'status-success' : 'status-info';

    container.innerHTML = `
        <div class="${statusClass}">
            ${message}
        </div>
    `;
}
