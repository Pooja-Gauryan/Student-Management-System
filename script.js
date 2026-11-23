/* StudentHub v3.0 — front-end HCI demo. Authentication and records use browser LocalStorage. */

const K = {
    students: "sh_students_v3",
    admin: "sh_admin_v1",
    session: "sh_session_v1",
    notes: "sh_notifications_v1",
    feedback: "sh_feedback_v1",
    theme: "sh_theme_v1",
    font: "sh_font_v1"
};

let students = read(K.students, []);
let notifications = read(K.notes, []);
let feedback = read(K.feedback, []);
let admin = read(K.admin, null);

let page = 1,
    authMode = "login",
    photoData = "",
    toastTimer;

const $ = id => document.getElementById(id);

function read(k, fallback) {
    try {
        const v = JSON.parse(localStorage.getItem(k));
        return v ?? fallback;
    } catch {
        return fallback;
    }
}

function write(k, v) {
    try {
        localStorage.setItem(k, JSON.stringify(v));
        return true;
    } catch (e) {
        notify("Storage limit reached. Try a smaller photo or remove old records.", "error");
        return false;
    }
}

function esc(v = "") {
    return String(v).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

function initials(n = "") {
    return n.trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase() || "ST";
}

function notify(msg, type = "success") {
    const el = document.createElement("div");
    el.className = "toast " + (type === "error" ? "error" : "");
    el.textContent = msg;
    $("toastRegion").append(el);
    setTimeout(() => el.remove(), 3500);
}

function logActivity(message) {
    notifications.unshift({
        id: Date.now() + Math.random(),
        message,
        at: new Date().toISOString()
    });

    notifications = notifications.slice(0, 60);
    write(K.notes, notifications);
    renderNotificationCount();
}

function renderNotificationCount() {
    $("notificationCount").textContent = notifications.length;
}

function setAuthMode(mode) {
    authMode = mode;
    $("authError").textContent = "";
    $("authForm").reset();

    $("authNameWrap").hidden = mode !== "signup";
    $("confirmWrap").hidden = mode !== "signup";
    $("forgotLink").hidden = mode === "forgot" || mode === "signup";
    $("authSwitch").hidden = mode === "forgot";

    $("authSwitch").textContent = mode === "signup"
        ? "Already have an account? Sign in"
        : "Create admin account";

    $("authTitle").textContent = mode === "signup"
        ? "Create admin account"
        : mode === "forgot"
            ? "Reset password"
            : "Welcome back";

    $("authSubtitle").textContent = mode === "signup"
        ? "Set up the administrator account for this browser."
        : mode === "forgot"
            ? "Enter your registered email and choose a new password."
            : "Sign in to manage your student records.";

    $("authSubmit").textContent = mode === "signup"
        ? "Create account"
        : mode === "forgot"
            ? "Update password"
            : "Sign in";
}

function showAuth() {
    $("authScreen").hidden = false;
    $("appShell").hidden = true;
    setAuthMode(admin ? "login" : "signup");
}

function showApp() {
    $("authScreen").hidden = true;
    $("appShell").hidden = false;

    const name = admin?.name || "Administrator";

    $("welcomeName").textContent = name;
    $("sideAdminName").textContent = name;
    $("adminEmailLabel").textContent = admin?.email || "";

    renderAll();
    goTo("dashboard");
}

function hashDemo(s) {
    let h = 2166136261;

    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }

    return (h >>> 0).toString(16);
}

// Authentication events

$("authSwitch").addEventListener("click", () => {
    setAuthMode(authMode === "signup" ? "login" : "signup");
});

$("forgotLink").addEventListener("click", () => setAuthMode("forgot"));

document.querySelectorAll("[data-toggle-password]").forEach(b => {
    b.addEventListener("click", () => {
        const i = $(b.dataset.togglePassword);
        i.type = i.type === "password" ? "text" : "password";
        b.textContent = i.type === "password" ? "Show" : "Hide";
    });
});

$("authPassword").addEventListener("input", () => {
    if (authMode === "signup") {
        $("passwordStrength").textContent =
            $("authPassword").value.length < 8
                ? "Use at least 8 characters."
                : /[A-Z]/.test($("authPassword").value) &&
                    /[0-9]/.test($("authPassword").value)
                    ? "Good password strength."
                    : "Add an uppercase letter and a number for a stronger password.";
    }
});

$("authForm").addEventListener("submit", e => {
    e.preventDefault();

    const email = $("authEmail").value.trim().toLowerCase();
    const pass = $("authPassword").value;
    const name = $("authName").value.trim();

    $("authError").textContent = "";

    if (authMode === "signup") {
        if (admin) {
            $("authError").textContent = "An admin account already exists in this browser.";
            return;
        }

        if (!name) {
            $("authError").textContent = "Please enter your name.";
            return;
        }

        if (pass.length < 8) {
            $("authError").textContent = "Password must contain at least 8 characters.";
            return;
        }

        if (pass !== $("authConfirm").value) {
            $("authError").textContent = "Passwords do not match.";
            return;
        }

        admin = {
            name,
            email,
            passwordHash: hashDemo(pass)
        };

        if (!write(K.admin, admin)) return;

        localStorage.setItem(K.session, "active");
        logActivity("Administrator account created");
        showApp();
        notify("Admin account created successfully.");
    }

    else if (authMode === "login") {
        if (!admin || email !== admin.email || hashDemo(pass) !== admin.passwordHash) {
            $("authError").textContent = "Incorrect email or password.";
            return;
        }

        localStorage.setItem(K.session, "active");
        showApp();
        notify("Welcome back, " + admin.name + ".");
    }

    else {
        if (!admin || email !== admin.email) {
            $("authError").textContent = "No admin account found with this email.";
            return;
        }

        if (pass.length < 8) {
            $("authError").textContent = "New password must contain at least 8 characters.";
            return;
        }

        if (pass !== $("authConfirm").value) {
            $("authError").textContent = "Passwords do not match.";
            return;
        }

        admin.passwordHash = hashDemo(pass);
        write(K.admin, admin);
        setAuthMode("login");
        notify("Password updated. Please sign in.");
    }
});

// Logout

function logout() {
    localStorage.removeItem(K.session);
    showAuth();
    notify("You have signed out.");
}

$("logoutBtn").addEventListener("click", logout);
$("settingsLogout").addEventListener("click", logout);

// Navigation

function goTo(p) {
    const valid = [
        "dashboard",
        "students",
        "add",
        "analytics",
        "reports",
        "notifications",
        "feedback",
        "settings"
    ];

    if (!valid.includes(p)) p = "dashboard";

    document.querySelectorAll(".page").forEach(x => {
        x.classList.remove("active");
    });

    $("page-" + p).classList.add("active");

    document.querySelectorAll(".nav-link").forEach(x => {
        x.classList.toggle("active", x.dataset.page === p);
    });

    $("breadcrumb").textContent = ({
        dashboard: "Dashboard",
        students: "All Students",
        add: $("editingId").value ? "Edit Student" : "Add Student",
        analytics: "Analytics",
        reports: "Reports",
        notifications: "Notifications",
        feedback: "Feedback",
        settings: "Settings"
    })[p];

    $("sidebar").classList.remove("open");

    if (p === "dashboard") renderDashboard();
    if (p === "students") renderStudents();
    if (p === "analytics") renderAnalytics();
    if (p === "reports") renderReports();
    if (p === "notifications") renderNotifications();
    if (p === "feedback") renderFeedback();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

document.addEventListener("click", e => {
    const b = e.target.closest("[data-page]");

    if (b) {
        e.preventDefault();

        if (b.dataset.page === "add" && !$("editingId").value) {
            resetForm();
        }

        goTo(b.dataset.page);
    }
});

$("menuToggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
});

$("todayLabel").textContent = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
}).format(new Date());

// Rendering

function renderAll() {
    renderDashboard();
    renderStudents();
    renderAnalytics();
    renderReports();
    renderNotificationCount();
    $("sideCount").textContent = students.length;
}

function avatar(s) {
    return s.photo
        ? `<img class="student-avatar" src="${s.photo}" alt="">`
        : `<span class="student-avatar">${esc(initials(s.name))}</span>`;
}

function renderDashboard() {
    const male = students.filter(s => s.gender === "Male").length;
    const female = students.filter(s => s.gender === "Female").length;
    const other = students.length - male - female;

    const now = new Date();

    const added = students.filter(s => {
        const d = new Date(s.createdAt);

        return d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();
    }).length;

    $("totalStudents").textContent = students.length;
    $("maleStudents").textContent = male;
    $("femaleStudents").textContent = female;
    $("newStudents").textContent = added;

    $("donutTotal").textContent = students.length;
    $("maleLegend").textContent = male;
    $("femaleLegend").textContent = female;
    $("otherLegend").textContent = other;

    const a = students.length ? male / students.length * 100 : 0;
    const b = students.length ? (male + female) / students.length * 100 : 0;

    $("genderDonut").style.background =
        `conic-gradient(var(--cyan) 0 ${a}%,var(--purple) ${a}% ${b}%,#75879d ${b}% 100%)`;

    const recent = [...students]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    $("recentList").innerHTML = recent.map(s => `
        <div class="recent-row">
            ${avatar(s)}
            <div class="recent-info">
                <strong>${esc(s.name)}</strong>
                <small>${esc(s.email)}</small>
            </div>
            <span class="recent-course">${esc(s.course || "Course not set")}</span>
            <button class="mini-action" onclick="viewStudent('${s.id}')" aria-label="View ${esc(s.name)}">↗</button>
        </div>
    `).join("");

    $("recentEmpty").hidden = recent.length > 0;
    $("sideCount").textContent = students.length;
}

function filtered() {
    const q = $("searchInput").value.trim().toLowerCase();
    const g = $("genderFilter").value;
    const sort = $("sortSelect").value;

    let a = students.filter(s =>
        (!g || s.gender === g) &&
        (!q || [
            s.name,
            s.email,
            s.phone,
            s.course,
            s.year,
            String(s.id)
        ].some(x => String(x || "").toLowerCase().includes(q)))
    );

    if (sort === "name") {
        a.sort((x, y) => x.name.localeCompare(y.name));
    } else {
        a.sort((x, y) =>
            sort === "oldest"
                ? new Date(x.createdAt) - new Date(y.createdAt)
                : new Date(y.createdAt) - new Date(x.createdAt)
        );
    }

    return a;
}

function renderStudents() {
    const a = filtered();
    const pages = Math.max(1, Math.ceil(a.length / 7));

    page = Math.min(page, pages);

    const start = (page - 1) * 7;
    const rows = a.slice(start, start + 7);

    $("studentsTable").innerHTML = rows.map(s => `
        <tr>
            <td class="id-label">#${String(s.id).slice(-6)}</td>
            <td>
                <div class="student-cell">
                    ${avatar(s)}
                    <span>${esc(s.name)}</span>
                </div>
            </td>
            <td>${esc(s.email)}</td>
            <td>${esc([s.course, s.year].filter(Boolean).join(" · ") || "—")}</td>
            <td>${esc(s.gender || "—")}</td>
            <td>
                <div class="action-group">
                    <button class="mini-action" onclick="viewStudent('${s.id}')" aria-label="View profile">View</button>
                    <button class="mini-action" onclick="editStudent('${s.id}')" aria-label="Edit student">Edit</button>
                    <button class="mini-action" onclick="confirmDelete('${s.id}')" aria-label="Delete student">×</button>
                </div>
            </td>
        </tr>
    `).join("");

    $("studentsEmpty").hidden = a.length > 0;

    $("resultCount").textContent =
        `Showing ${a.length ? start + 1 : 0}–${Math.min(start + 7, a.length)} of ${a.length} students`;

    $("pageInfo").textContent = `${page} / ${pages}`;
    $("prevPage").disabled = page <= 1;
    $("nextPage").disabled = page >= pages;
}

["searchInput", "genderFilter", "sortSelect"].forEach(id => {
    $(id).addEventListener(
        id === "searchInput" ? "input" : "change",
        () => {
            page = 1;
            renderStudents();
        }
    );
});

$("prevPage").onclick = () => {
    page--;
    renderStudents();
};

$("nextPage").onclick = () => {
    page++;
    renderStudents();
};

// Student form

function clearFormErrors() {
    ["firstName", "lastName", "email", "phone"].forEach(id => {
        $(id).classList.remove("input-invalid");
        $(id + "Error").textContent = "";
    });

    $("photoError").textContent = "";
}

function resetForm() {
    $("studentForm").reset();
    $("editingId").value = "";
    photoData = "";

    $("photoPreview").hidden = true;
    $("formTitle").textContent = "Add new student";
    $("saveStudentBtn").textContent = "Save student →";

    clearFormErrors();
}

$("resetForm").onclick = () => {
    resetForm();
    notify("Form cleared.");
};

$("photo").addEventListener("change", e => {
    const f = e.target.files[0];

    photoData = "";
    $("photoPreview").hidden = true;

    if (!f) return;

    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
        $("photoError").textContent = "Choose a JPG, PNG or WebP image.";
        e.target.value = "";
        return;
    }

    if (f.size > 500 * 1024) {
        $("photoError").textContent = "Image must be 500 KB or smaller.";
        e.target.value = "";
        return;
    }

    const r = new FileReader();

    r.onload = () => {
        photoData = r.result;
        $("photoPreview").src = photoData;
        $("photoPreview").hidden = false;
    };

    r.readAsDataURL(f);
});

$("studentForm").addEventListener("submit", e => {
    e.preventDefault();

    clearFormErrors();

    const first = $("firstName").value.trim();
    const last = $("lastName").value.trim();
    const email = $("email").value.trim().toLowerCase();
    const phone = $("phone").value.trim();
    const editing = $("editingId").value;

    let valid = true;

    if (!first) {
        $("firstNameError").textContent = "First name is required.";
        valid = false;
    }

    if (!last) {
        $("lastNameError").textContent = "Last name is required.";
        valid = false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        $("emailError").textContent = "Enter a valid email address.";
        valid = false;
    }

    if (phone && !/^[0-9+()\-\s]{7,15}$/.test(phone)) {
        $("phoneError").textContent = "Enter a valid phone number.";
        valid = false;
    }

    if (students.some(s =>
        s.email.toLowerCase() === email &&
        String(s.id) !== editing
    )) {
        $("emailError").textContent = "This email is already registered.";
        valid = false;
    }

    if (!valid) {
        notify("Please correct the highlighted fields.", "error");
        return;
    }

    const old = students.find(s => String(s.id) === editing);

    const record = {
        id: editing ? old.id : Date.now(),
        name: first + " " + last,
        email,
        phone,
        gender: $("gender").value,
        dob: $("dob").value,
        course: $("course").value.trim(),
        year: $("year").value.trim(),
        address: $("address").value.trim(),
        photo: photoData || old?.photo || "",
        createdAt: old?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editing) {
        students = students.map(s =>
            String(s.id) === editing ? record : s
        );

        logActivity(`Updated student profile: ${record.name}`);
        notify("Student updated successfully.");
    } else {
        students.unshift(record);

        logActivity(`Added new student: ${record.name}`);
        notify("Student added successfully.");
    }

    if (write(K.students, students)) {
        resetForm();
        renderAll();
        goTo("students");
    }
});

// Edit student

function editStudent(id) {
    const s = students.find(x => String(x.id) === String(id));

    if (!s) return;

    goTo("add");

    $("editingId").value = s.id;

    const p = s.name.split(" ");

    $("firstName").value = p.shift();
    $("lastName").value = p.join(" ");
    $("email").value = s.email;
    $("phone").value = s.phone || "";
    $("gender").value = s.gender || "";
    $("dob").value = s.dob || "";
    $("course").value = s.course || "";
    $("year").value = s.year || "";
    $("address").value = s.address || "";

    photoData = "";

    if (s.photo) {
        $("photoPreview").src = s.photo;
        $("photoPreview").hidden = false;
    }

    $("formTitle").textContent = "Edit student";
    $("saveStudentBtn").textContent = "Update student →";
}

// Modal

function openModal(title, content, actions) {
    $("modalTitle").textContent = title;
    $("modalContent").innerHTML = content;
    $("modalActions").innerHTML = actions;
    $("modalBackdrop").hidden = false;
    $("modalClose").focus();
}

function closeModal() {
    $("modalBackdrop").hidden = true;
}

$("modalClose").onclick = closeModal;

$("modalBackdrop").addEventListener("click", e => {
    if (e.target === $("modalBackdrop")) closeModal();
});

// View student

function viewStudent(id) {
    const s = students.find(x => String(x.id) === String(id));

    if (!s) return;

    const fields = [
        ["Student ID", s.id],
        ["Email", s.email],
        ["Phone", s.phone],
        ["Gender", s.gender],
        ["Date of birth", s.dob],
        ["Course / branch", s.course],
        ["Year / semester", s.year],
        ["Address", s.address],
        ["Enrolled", new Date(s.createdAt).toLocaleDateString("en-IN")]
    ];

    openModal(
        "Student profile",
        `
            <div class="profile-head">
                ${s.photo
                    ? `<img src="${s.photo}" alt="Profile photo">`
                    : `<span class="student-avatar">${esc(initials(s.name))}</span>`
                }
                <div>
                    <strong>${esc(s.name)}</strong>
                    <small class="muted">${esc(s.course || "Student profile")}</small>
                </div>
            </div>

            <div class="detail-grid">
                ${fields.map(([k, v]) => `
                    <div class="detail-item">
                        <small>${k}</small>
                        <strong>${esc(v || "Not provided")}</strong>
                    </div>
                `).join("")}
            </div>
        `,
        `
            <button class="btn outline" onclick="closeModal()">Close</button>
            <button class="btn primary" onclick="closeModal();editStudent('${s.id}')">Edit profile</button>
        `
    );
}

// Delete student

function confirmDelete(id) {
    const s = students.find(x => String(x.id) === String(id));

    if (!s) return;

    openModal(
        "Delete student?",
        `<p class="muted">Are you sure you want to delete <strong>${esc(s.name)}</strong>? This action cannot be undone.</p>`,
        `
            <button class="btn outline" onclick="closeModal()">Cancel</button>
            <button class="btn danger-btn" onclick="deleteStudent('${s.id}')">Delete student</button>
        `
    );
}

function deleteStudent(id) {
    const s = students.find(x => String(x.id) === String(id));

    students = students.filter(x => String(x.id) !== String(id));

    write(K.students, students);
    closeModal();

    logActivity(`Deleted student record: ${s?.name || id}`);

    renderAll();
    notify("Student record deleted.");
}

// CSV export

function csvCell(v) {
    return '"' + String(v ?? "").replace(/"/g, '""') + '"';
}

function downloadCSV() {
    if (!students.length) {
        notify("No student records to export.", "error");
        return;
    }

    const cols = [
        "Student ID",
        "Name",
        "Email",
        "Gender",
        "Phone",
        "DOB",
        "Course",
        "Year / Semester",
        "Address",
        "Enrollment Date"
    ];

    const rows = students.map(s => [
        s.id,
        s.name,
        s.email,
        s.gender,
        s.phone,
        s.dob,
        s.course,
        s.year,
        s.address,
        s.createdAt
    ]);

    const csv = [cols, ...rows]
        .map(r => r.map(csvCell).join(","))
        .join("\r\n");

    download(
        new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8"
        }),
        "studenthub_students.csv"
    );

    notify("CSV exported successfully.");
}

function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = name;

    document.body.append(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

["exportBtn", "reportExport"].forEach(id => {
    $(id).onclick = downloadCSV;
});

// Analytics

function renderBars(el, items) {
    const max = Math.max(1, ...items.map(x => x[1]));

    $(el).innerHTML = items.length
        ? items.map(([n, v]) => `
            <div class="bar-row">
                <span>${esc(n)}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${v / max * 100}%"></div>
                </div>
                <b>${v}</b>
            </div>
        `).join("")
        : `<p class="muted">No data available yet.</p>`;
}

function renderAnalytics() {
    const total = students.length;
    const m = students.filter(s => s.gender === "Male").length;
    const f = students.filter(s => s.gender === "Female").length;
    const other = total - m - f;

    $("analyticsTotal").textContent = total;
    $("withEmail").textContent = students.filter(s => s.email).length;
    $("withPhone").textContent = students.filter(s => s.phone).length;
    $("withCourse").textContent = students.filter(s => s.course).length;

    renderBars("genderBars", [
        ["Male", m],
        ["Female", f],
        ["Other / not set", other]
    ]);

    const courses = {};

    students.forEach(s => {
        if (s.course) {
            courses[s.course] = (courses[s.course] || 0) + 1;
        }
    });

    renderBars(
        "courseBars",
        Object.entries(courses)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7)
    );
}

// Reports

function renderReports() {
    const courses = new Set(students.map(s => s.course).filter(Boolean));

    const recent = students.filter(s =>
        Date.now() - new Date(s.createdAt).getTime() < 30 * 86400000
    ).length;

    $("reportTotal").textContent = students.length;
    $("reportCourses").textContent = courses.size;
    $("reportRecent").textContent = recent;
    $("reportFeedback").textContent = feedback.length;

    const fields = [
        ["Email available", students.filter(s => s.email).length],
        ["Phone available", students.filter(s => s.phone).length],
        ["Course recorded", students.filter(s => s.course).length],
        ["Address recorded", students.filter(s => s.address).length],
        ["Profile photo added", students.filter(s => s.photo).length]
    ];

    $("reportSummary").innerHTML = fields.map(([n, v]) => `
        <div class="summary-row">
            <span>${n}</span>
            <strong>${v} / ${students.length}</strong>
        </div>
    `).join("");
}

// Notifications

function renderNotifications() {
    $("notificationList").innerHTML = notifications.map(n => `
        <div class="notification-item">
            <strong>${esc(n.message)}</strong>
            <small>${new Date(n.at).toLocaleString("en-IN")}</small>
        </div>
    `).join("");

    $("notificationEmpty").hidden = notifications.length > 0;
}

$("clearNotifications").onclick = () => {
    notifications = [];

    write(K.notes, notifications);
    renderNotifications();
    renderNotificationCount();

    notify("Notifications cleared.");
};

// Feedback

$("feedbackForm").addEventListener("submit", e => {
    e.preventDefault();

    const rating = $("feedbackRating").value;
    const text = $("feedbackText").value.trim();

    if (!rating) {
        notify("Please select a rating.", "error");
        return;
    }

    feedback.unshift({
        rating: Number(rating),
        text,
        at: new Date().toISOString()
    });

    write(K.feedback, feedback);

    $("feedbackForm").reset();

    logActivity("New feedback submitted");

    renderFeedback();
    renderReports();

    notify("Thank you for your feedback.");
});

function renderFeedback() {
    $("feedbackList").innerHTML = feedback.map(f => `
        <div class="feedback-item">
            <strong>${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)} · ${f.rating}/5</strong>
            <p>${esc(f.text || "No written suggestion.")}</p>
            <small>${new Date(f.at).toLocaleString("en-IN")}</small>
        </div>
    `).join("");

    $("feedbackEmpty").hidden = feedback.length > 0;
}

// Backup

$("backupBtn").onclick = () => {
    const backup = {
        format: "StudentHubBackup",
        version: 3,
        createdAt: new Date().toISOString(),
        students,
        admin,
        notifications,
        feedback,
        theme: localStorage.getItem(K.theme),
        font: localStorage.getItem(K.font)
    };

    download(
        new Blob([JSON.stringify(backup, null, 2)], {
            type: "application/json"
        }),
        "studenthub_backup.json"
    );

    notify("Backup downloaded.");
};

// Import helpers

function normalizeStudentRecord(record, index = 0) {
    const s = record && typeof record === "object" ? record : {};

    const first = String(s.firstName ?? s.first_name ?? "").trim();
    const last = String(s.lastName ?? s.last_name ?? "").trim();

    const name = String(
        s.name ??
        s.studentName ??
        s.student_name ??
        [first, last].filter(Boolean).join(" ")
    ).trim();

    const email = String(
        s.email ??
        s.emailAddress ??
        s.email_address ??
        ""
    ).trim().toLowerCase();

    if (!name || !email) return null;

    return {
        id: s.id ?? s.studentId ?? s.student_id ?? (Date.now() + index + Math.random()),
        name,
        email,
        gender: String(s.gender ?? "").trim(),
        phone: String(s.phone ?? s.mobile ?? s.contact ?? "").trim(),
        dob: String(s.dob ?? s.dateOfBirth ?? s.date_of_birth ?? "").trim(),
        course: String(s.course ?? s.program ?? s.department ?? "").trim(),
        year: String(s.year ?? s.semester ?? s.yearSemester ?? s.year_semester ?? "").trim(),
        address: String(s.address ?? "").trim(),
        photo: String(s.photo ?? s.photoData ?? "").trim(),
        createdAt: s.createdAt ?? s.created_at ?? s.enrollmentDate ?? s.enrollment_date ?? new Date().toISOString()
    };
}

function parseDelimitedFile(text) {
    // Supports quoted commas, escaped quotes, and fields containing newlines.

    const source = String(text ?? "").replace(/^\uFEFF/, "");
    const firstLine = source.split(/\r?\n/, 1)[0] || "";

    const candidates = [",", ";", "\t"];

    const delimiter = candidates
        .map(d => ({
            d,
            count: (
                firstLine.match(
                    new RegExp(d === "\t" ? "\t" : "\\" + d, "g")
                ) || []
            ).length
        }))
        .sort((a, b) => b.count - a.count)[0].d;

    const rows = [];

    let row = [],
        cell = "",
        quoted = false;

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];

        if (ch === '"' && quoted && source[i + 1] === '"') {
            cell += '"';
            i++;
        }

        else if (ch === '"') {
            quoted = !quoted;
        }

        else if (ch === delimiter && !quoted) {
            row.push(cell);
            cell = "";
        }

        else if ((ch === "\n" || ch === "\r") && !quoted) {
            if (ch === "\r" && source[i + 1] === "\n") i++;

            row.push(cell);

            if (row.some(value => String(value).trim() !== "")) {
                rows.push(row);
            }

            row = [];
            cell = "";
        }

        else {
            cell += ch;
        }
    }

    row.push(cell);

    if (row.some(value => String(value).trim() !== "")) {
        rows.push(row);
    }

    return rows;
}

function normalizeHeader(value) {
    return String(value ?? "")
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase()
        .replace(/[\s_\-./()]+/g, "");
}

// CSV import

function importStudentsFromCSV(fileText) {
    const rows = parseDelimitedFile(fileText);

    if (rows.length < 2) {
        throw new Error("The selected CSV has no student rows.");
    }

    const headers = rows[0].map(normalizeHeader);

    const findColumn = (...names) =>
        headers.findIndex(h => names.includes(h));

    const columns = {
        name: findColumn("name", "studentname", "fullname", "student"),
        email: findColumn("email", "emailaddress", "mail"),
        id: findColumn("id", "studentid", "rollno", "rollnumber", "registrationno"),
        gender: findColumn("gender", "sex"),
        phone: findColumn("phone", "mobile", "contact", "phonenumber"),
        dob: findColumn("dob", "dateofbirth", "birthdate"),
        course: findColumn("course", "program", "department", "branch"),
        year: findColumn("year", "semester", "yearsemester", "class"),
        address: findColumn("address", "permanentaddress")
    };

    if (columns.name < 0 || columns.email < 0) {
        throw new Error(
            "CSV needs Name and Email columns. Other supported columns: Student ID, Gender, Phone, DOB, Course, Year/Semester and Address."
        );
    }

    const existingEmails = new Set(
        students.map(s => String(s.email || "").trim().toLowerCase())
    );

    const existingIds = new Set(students.map(s => String(s.id)));

    let added = 0,
        skipped = 0;

    rows.slice(1).forEach((cells, rowIndex) => {
        const get = key =>
            columns[key] < 0
                ? ""
                : String(cells[columns[key]] ?? "").trim();

        const email = get("email").toLowerCase();
        const name = get("name");

        if (!name || !email || existingEmails.has(email)) {
            skipped++;
            return;
        }

        let id = get("id") || (Date.now() + rowIndex + Math.random());

        if (existingIds.has(String(id))) {
            id = Date.now() + rowIndex + Math.random();
        }

        const student = normalizeStudentRecord({
            id,
            name,
            email,
            gender: get("gender"),
            phone: get("phone"),
            dob: get("dob"),
            course: get("course"),
            year: get("year"),
            address: get("address"),
            createdAt: new Date().toISOString()
        }, rowIndex);

        if (!student) {
            skipped++;
            return;
        }

        students.push(student);

        existingEmails.add(email);
        existingIds.add(String(student.id));

        added++;
    });

    if (added) {
        if (!write(K.students, students)) {
            throw new Error("Could not save imported records. Browser storage may be full.");
        }

        logActivity(`Imported ${added} student record(s) from CSV`);
        renderAll();
    }

    return {
        added,
        skipped,
        total: rows.length - 1
    };
}

// Restore backup

$("restoreFile").addEventListener("change", async e => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
        const data = JSON.parse(await file.text());

        const records = Array.isArray(data)
            ? data
            : data.students;

        if (!Array.isArray(records)) {
            throw new Error("This JSON file does not contain a students array.");
        }

        const cleaned = records
            .map((record, index) => normalizeStudentRecord(record, index))
            .filter(Boolean);

        if (records.length && !cleaned.length) {
            throw new Error("No valid student records found. Each record needs a name and email.");
        }

        const backup = Array.isArray(data) ? {} : data;

        openModal(
            "Restore backup?",
            `<p class="muted">This will replace the current records with <strong>${cleaned.length}</strong> valid student record(s).${records.length !== cleaned.length ? ` ${records.length - cleaned.length} invalid row(s) will be skipped.` : ""}</p>`,
            `
                <button class="btn outline" onclick="closeModal()">Cancel</button>
                <button class="btn primary" onclick="applyBackup(window.__pendingBackup)">Restore data</button>
            `
        );

        window.__pendingBackup = {
            ...backup,
            students: cleaned
        };

    } catch (err) {
        notify(err.message || "Could not read this backup file.", "error");
    }

    e.target.value = "";
});

window.applyBackup = function (data) {
    if (!data || !Array.isArray(data.students)) return;

    students = data.students
        .map((record, index) => normalizeStudentRecord(record, index))
        .filter(Boolean);

    notifications = Array.isArray(data.notifications)
        ? data.notifications
        : [];

    feedback = Array.isArray(data.feedback)
        ? data.feedback
        : [];

    if (data.admin && typeof data.admin === "object") {
        admin = data.admin;
        write(K.admin, admin);
    }

    write(K.students, students);
    write(K.notes, notifications);
    write(K.feedback, feedback);

    closeModal();
    renderAll();

    notify(`Backup restored: ${students.length} student record(s).`);
};

// CSV file import event

$("importFile").addEventListener("change", async e => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
        const result = importStudentsFromCSV(await file.text());

        if (!result.added) {
            notify(
                `No new students imported. ${result.skipped} row(s) were skipped; check for missing name/email or duplicates.`,
                "error"
            );
        } else {
            notify(
                `Imported ${result.added} student(s). ${result.skipped} duplicate/invalid row(s) skipped.`
            );
        }

    } catch (err) {
        notify(
            err.message || "CSV could not be imported. Please check the file and its headings.",
            "error"
        );
    }

    e.target.value = "";
});

// Theme settings

function applyTheme(light) {
    document.body.classList.toggle("light", light);

    localStorage.setItem(K.theme, light ? "light" : "dark");

    $("settingsTheme").textContent = light
        ? "Switch to dark mode"
        : "Switch to light mode";

    $("themeToggle").textContent = light ? "☾" : "☼";
}

function toggleTheme() {
    applyTheme(!document.body.classList.contains("light"));
}

$("themeToggle").onclick = toggleTheme;
$("settingsTheme").onclick = toggleTheme;

// Font settings

function applyFont(size) {
    document.body.classList.remove("font-small", "font-large");

    if (size === "small") {
        document.body.classList.add("font-small");
    }

    if (size === "large") {
        document.body.classList.add("font-large");
    }

    $("fontSize").value = size;
    localStorage.setItem(K.font, size);
}

$("fontSize").onchange = e => applyFont(e.target.value);

applyTheme(localStorage.getItem(K.theme) === "light");
applyFont(localStorage.getItem(K.font) || "normal");

// Change password

$("changePasswordBtn").onclick = () => {
    openModal(
        "Change password",
        `
            <div class="form-grid" style="grid-template-columns:1fr">
                <label>
                    Current password
                    <input id="oldPass" type="password">
                </label>

                <label>
                    New password
                    <input id="newPass" type="password">
                </label>

                <label>
                    Confirm new password
                    <input id="newPass2" type="password">
                </label>

                <small id="changePassError" class="field-error"></small>
            </div>
        `,
        `
            <button class="btn outline" onclick="closeModal()">Cancel</button>
            <button class="btn primary" onclick="saveNewPassword()">Update password</button>
        `
    );
};

window.saveNewPassword = function () {
    const old = $("oldPass").value;
    const n = $("newPass").value;
    const n2 = $("newPass2").value;

    if (hashDemo(old) !== admin.passwordHash) {
        $("changePassError").textContent = "Current password is incorrect.";
        return;
    }

    if (n.length < 8 || n !== n2) {
        $("changePassError").textContent =
            "New passwords must match and contain at least 8 characters.";
        return;
    }

    admin.passwordHash = hashDemo(n);

    write(K.admin, admin);

    closeModal();
    notify("Password changed successfully.");
};

// Clear all records

$("clearAllBtn").onclick = () => {
    openModal(
        "Clear all student records?",
        `<p class="muted">This will permanently remove all <strong>${students.length}</strong> student records from this browser. This cannot be undone.</p>`,
        `
            <button class="btn outline" onclick="closeModal()">Cancel</button>
            <button class="btn danger-btn" onclick="clearAllRecords()">Clear all records</button>
        `
    );
};

window.clearAllRecords = function () {
    students = [];

    write(K.students, students);

    closeModal();

    logActivity("All student records cleared");

    renderAll();
    goTo("dashboard");

    notify("All student records cleared.");
};

// Keyboard shortcuts

function showShortcuts() {
    openModal(
        "Keyboard shortcuts",
        `
            <div class="kbd-help">
                <div><span>Open quick help</span><kbd>?</kbd></div>
                <div><span>Focus student search</span><kbd>/</kbd></div>
                <div><span>Add a student</span><kbd>Alt + N</kbd></div>
                <div><span>Go to dashboard</span><kbd>Alt + D</kbd></div>
                <div><span>Close dialog</span><kbd>Esc</kbd></div>
            </div>
        `,
        `<button class="btn primary" onclick="closeModal()">Got it</button>`
    );
}

$("quickHelp").onclick = showShortcuts;

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        closeModal();
    }

    if (
        e.key === "?" &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
    ) {
        e.preventDefault();
        showShortcuts();
    }

    if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
    ) {
        e.preventDefault();
        goTo("students");
        $("searchInput").focus();
    }

    if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        resetForm();
        goTo("add");
        $("firstName").focus();
    }

    if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        goTo("dashboard");
    }
});

$("modalClose").addEventListener("keydown", e => {
    if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        $("modalActions").querySelector("button:last-child")?.focus();
    }
});

// Initial application state

if (localStorage.getItem(K.session) === "active" && admin) {
    showApp();
} else {
    showAuth();
}