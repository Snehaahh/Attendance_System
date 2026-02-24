// Student data
const students = [
    { rollNo: '22BCS201', name: 'Aarav Kumar' },
    { rollNo: '22BCS202', name: 'Ananya Sharma' },
    { rollNo: '22BCS203', name: 'Arjun Patel' },
    { rollNo: '22BCS204', name: 'Diya Singh' },
    { rollNo: '22BCS205', name: 'Ishaan Reddy' },
    { rollNo: '22BCS206', name: 'Kavya Nair' },
    { rollNo: '22BCS207', name: 'Rohan Gupta' },
    { rollNo: '22BCS208', name: 'Saanvi Iyer' },
    { rollNo: '22BCS209', name: 'Vihaan Mehta' },
    { rollNo: '22BCS210', name: 'Zara Khan' }
];

// Attendance state
let attendanceData = {};

// Initialize attendance
function initializeAttendance() {
    const studentList = document.getElementById('student-list');

    students.forEach(student => {
        // Set default status as present
        attendanceData[student.rollNo] = 'present';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.rollNo}</td>
            <td>${student.name}</td>
            <td>
                <button class="attendance-btn present" 
                        id="btn-${student.rollNo}" 
                        onclick="toggleAttendance('${student.rollNo}')">
                    <i class="fas fa-check"></i> Present
                </button>
            </td>
        `;
        studentList.appendChild(row);
    });

    updateSummary();
}

// Toggle attendance status
function toggleAttendance(rollNo) {
    const button = document.getElementById(`btn-${rollNo}`);

    if (attendanceData[rollNo] === 'present') {
        // Change to absent
        attendanceData[rollNo] = 'absent';
        button.classList.remove('present');
        button.classList.add('absent');
        button.innerHTML = '<i class="fas fa-times"></i> Absent';
    } else {
        // Change to present
        attendanceData[rollNo] = 'present';
        button.classList.remove('absent');
        button.classList.add('present');
        button.innerHTML = '<i class="fas fa-check"></i> Present';
    }

    updateSummary();
}

// Update attendance summary
function updateSummary() {
    const total = students.length;
    const present = Object.values(attendanceData).filter(status => status === 'present').length;
    const absent = total - present;

    document.getElementById('total-students').textContent = total;
    document.getElementById('present-count').textContent = present;
    document.getElementById('absent-count').textContent = absent;
}

// Save attendance
async function saveAttendance() {
    const facultyName = sessionStorage.getItem('username') || 'Faculty';
    const classSelect = document.getElementById('class-select');
    const hourSelect = document.getElementById('hour-select');
    const selectedClass = classSelect.value;
    const selectedHour = hourSelect.value;
    const date = new Date().toISOString();

    // Create attendance record
    const attendanceRecord = {
        id: Date.now(),
        date: date,
        faculty: facultyName,
        class: selectedClass,
        hour: selectedHour,
        students: students.map(student => ({
            rollNo: student.rollNo,
            name: student.name,
            status: attendanceData[student.rollNo]
        })),
        summary: {
            total: students.length,
            present: Object.values(attendanceData).filter(s => s === 'present').length,
            absent: Object.values(attendanceData).filter(s => s === 'absent').length
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
        alert('Attendance saved successfully to server!');

        // Redirect to view attendance
        window.location.href = 'view-attendance.html';
    } catch (error) {
        console.error('Error saving attendance:', error);
        alert('Error saving attendance. Please check if the server is running.');
    }
}
