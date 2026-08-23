// Load from localStorage or empty array
let students = JSON.parse(localStorage.getItem("students")) || [];
let editIndex = null;

// Load data on page start
window.onload = function () {
    displayStudents();
};

function addStudent() {
    let fname = document.getElementById("fname").value;
    let lname = document.getElementById("lname").value;
    let email = document.getElementById("email").value;
    let gender = document.getElementById("gender").value;
    let phone = document.getElementById("phone").value;

    if (!fname || !email) {
        alert("⚠️ Please fill required fields!");
        return;
    }

    let student = {
        id: Date.now(),
        name: fname + " " + lname,
        email,
        gender,
        phone
    };

    students.push(student);

    // ✅ Save to localStorage
    localStorage.setItem("students", JSON.stringify(students));

    displayStudents();
    clearForm();

    alert("✅ Student Added Successfully!");
}

function displayStudents() {
    let table = document.getElementById("tableBody");
    table.innerHTML = "";

    students.forEach((s, index) => {
        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${s.id}</td>
            <td>${s.name}</td>
            <td>${s.email}</td>
            <td>${s.gender}</td>
            <td>${s.phone}</td>
            <td>
                <button onclick="editStudent(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteStudent(${index})">Delete</button>
            </td>
        `;

        row.style.opacity = 0;
        setTimeout(() => {
            row.style.opacity = 1;
            row.style.transition = "0.5s";
        }, 100);

        table.appendChild(row);
    });
}

function deleteStudent(index) {
    if (confirm("Delete this student?")) {
        students.splice(index, 1);

        // ✅ Save after delete
        localStorage.setItem("students", JSON.stringify(students));

        displayStudents();
    }
}

function editStudent(index) {
    let s = students[index];
    editIndex = index;

    document.getElementById("fname").value = s.name.split(" ")[0];
    document.getElementById("lname").value = s.name.split(" ")[1];
    document.getElementById("email").value = s.email;
    document.getElementById("gender").value = s.gender;
    document.getElementById("phone").value = s.phone;
}

function updateStudent() {
    if (editIndex === null) return;

    students[editIndex].name =
        document.getElementById("fname").value + " " +
        document.getElementById("lname").value;

    students[editIndex].email = document.getElementById("email").value;
    students[editIndex].gender = document.getElementById("gender").value;
    students[editIndex].phone = document.getElementById("phone").value;

    // ✅ Save after update
    localStorage.setItem("students", JSON.stringify(students));

    displayStudents();
    clearForm();
    editIndex = null;

    alert("✏️ Student Updated!");
}

function searchStudent() {
    let query = document.getElementById("search").value.toLowerCase();

    let filtered = students.filter(s =>
        s.name.toLowerCase().includes(query)
    );

    let table = document.getElementById("tableBody");
    table.innerHTML = "";

    filtered.forEach(s => {
        table.innerHTML += `
        <tr>
            <td>${s.id}</td>
            <td>${s.name}</td>
            <td>${s.email}</td>
            <td>${s.gender}</td>
            <td>${s.phone}</td>
            <td>-</td>
        </tr>`;
    });
}

function clearForm() {
    document.querySelectorAll("input").forEach(i => i.value = "");
}

function exportCSV() {
    let csv = "ID,Name,Email,Gender,Phone\n";

    students.forEach(s => {
        csv += `${s.id},${s.name},${s.email},${s.gender},${s.phone}\n`;
    });

    let blob = new Blob([csv], { type: "text/csv" });
    let url = window.URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
}