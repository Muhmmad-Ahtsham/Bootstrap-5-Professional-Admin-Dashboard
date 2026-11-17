"use strict";

/* =====================================================================
   students.js - student table used on index.html and students.html
   Search, filters, sort, pagination, add / edit / view / delete modals
   ===================================================================== */

const StudentsTable = (function () {
  const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
  const $ = function (id) { return document.getElementById(id); };

  const cfg = { pageSize: 10 };
  const state = { page: 1, deleteId: null };
  let el = {};

  /* ---------- filtering and sorting ---------- */
  function currentFilters() {
    return {
      query: (el.search.value || "").trim().toLowerCase(),
      department: el.dept.value,
      semester: el.sem.value,
      sort: el.sort ? el.sort.value : "recent"
    };
  }

  function getFiltered() {
    const f = currentFilters();
    const list = Store.getStudents().filter(function (s) {
      const textMatch = !f.query || s.name.toLowerCase().includes(f.query) || s.email.toLowerCase().includes(f.query);
      return textMatch && (!f.department || s.department === f.department) && (!f.semester || s.semester === f.semester);
    });

    const byName = function (a, b) { return a.name.localeCompare(b.name); };
    switch (f.sort) {
      case "name-asc":  list.sort(byName); break;
      case "name-desc": list.sort(function (a, b) { return byName(b, a); }); break;
      case "sem-asc":   list.sort(function (a, b) { return (Number(a.semester) - Number(b.semester)) || byName(a, b); }); break;
      case "dept-asc":  list.sort(function (a, b) { return a.department.localeCompare(b.department) || byName(a, b); }); break;
      default:          list.reverse();   // "recent": newest first
    }
    return list;
  }

  /* ---------- rendering ---------- */
  function rowHTML(s) {
    const id = UI.esc(s.id);
    const color = UI.badgeColor(s.department);
    return '<tr>' +
      '<td><div class="d-flex align-items-center gap-2">' +
        '<span class="avatar rounded-circle text-bg-' + color + ' d-inline-flex align-items-center justify-content-center fw-semibold flex-shrink-0" aria-hidden="true">' + UI.esc(UI.initials(s.name)) + '</span>' +
        '<div><div class="fw-semibold">' + UI.esc(s.name) + '</div>' +
        '<div class="small text-body-secondary d-md-none text-break">' + UI.esc(s.email) + '</div></div>' +
      '</div></td>' +
      '<td class="d-none d-md-table-cell text-break">' + UI.esc(s.email) + '</td>' +
      '<td class="d-none d-sm-table-cell"><span class="badge text-bg-' + color + '">' + UI.esc(s.department || "—") + '</span></td>' +
      '<td class="text-center">' + UI.esc(s.semester || "—") + '</td>' +
      '<td class="text-end text-nowrap"><div class="btn-group btn-group-sm" role="group" aria-label="Actions for ' + UI.esc(s.name) + '">' +
        '<button type="button" class="btn btn-outline-secondary" data-action="view" data-id="' + id + '" aria-label="View ' + UI.esc(s.name) + '"><i class="bi bi-eye" aria-hidden="true"></i></button>' +
        '<button type="button" class="btn btn-outline-primary" data-action="edit" data-id="' + id + '" aria-label="Edit ' + UI.esc(s.name) + '"><i class="bi bi-pencil" aria-hidden="true"></i></button>' +
        '<button type="button" class="btn btn-outline-danger" data-action="delete" data-id="' + id + '" aria-label="Delete ' + UI.esc(s.name) + '"><i class="bi bi-trash" aria-hidden="true"></i></button>' +
      '</div></td>' +
    '</tr>';
  }

  function render() {
    const total = Store.getStudents().length;
    const list = getFiltered();
    const pages = Math.max(1, Math.ceil(list.length / cfg.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * cfg.pageSize;
    const slice = list.slice(start, start + cfg.pageSize);

    if (slice.length === 0) {
      const text = total === 0 ? "No students yet. Click “Add Student” to create the first one." : "No students match your filters.";
      el.body.innerHTML = '<tr><td colspan="5" class="text-center text-body-secondary py-5">' + text + '</td></tr>';
    } else {
      el.body.innerHTML = slice.map(rowHTML).join("");
    }

    el.info.textContent = list.length === 0
      ? "0 students"
      : "Showing " + (start + 1) + "–" + (start + slice.length) + " of " + list.length + (list.length !== total ? " (filtered from " + total + ")" : "") + " students";
    el.pagination.innerHTML = UI.paginationHTML(state.page, pages);

    document.dispatchEvent(new CustomEvent("students:filtered", { detail: { filtered: list, all: Store.getStudents() } }));
  }

  function refreshFilterOptions() {
    UI.fillOptions(el.dept, UI.departmentsInUse(), "All departments");
    UI.fillOptions(el.sem, UI.semestersInUse(), "All semesters");
  }

  /* ---------- add / edit modal ---------- */
  function fillFormSelects() {
    UI.fillOptions(el.fDept, UI.departmentsInUse(), "Select department");
    el.fSem.innerHTML = '<option value="">Select semester</option>' +
      Store.SEMESTERS.map(function (n) { return '<option value="' + n + '">Semester ' + n + '</option>'; }).join("");
  }

  function openForm(student) {
    el.form.classList.remove("was-validated");
    el.form.reset();
    fillFormSelects();
    el.emailFeedback.textContent = "Enter a valid email address.";
    el.fEmail.setCustomValidity("");

    if (student) {
      el.modalTitle.textContent = "Edit Student";
      el.submit.textContent = "Save changes";
      el.fId.value = String(student.id);
      el.fName.value = student.name;
      el.fEmail.value = student.email;
      // an unknown department/semester from older data must stay selectable
      if (student.department && !Array.from(el.fDept.options).some(function (o) { return o.value === student.department; })) {
        el.fDept.add(new Option(student.department, student.department));
      }
      if (student.semester && !Array.from(el.fSem.options).some(function (o) { return o.value === student.semester; })) {
        el.fSem.add(new Option("Semester " + student.semester, student.semester));
      }
      el.fDept.value = student.department;
      el.fSem.value = student.semester;
    } else {
      el.modalTitle.textContent = "Add Student";
      el.submit.textContent = "Add student";
      el.fId.value = "";
    }
    bootstrap.Modal.getOrCreateInstance(el.formModal).show();
  }

  function checkEmail() {
    const value = el.fEmail.value.trim();
    el.fEmail.setCustomValidity("");
    if (value === "") {
      el.emailFeedback.textContent = "Email is required.";
    } else if (!EMAIL_PATTERN.test(value)) {
      el.fEmail.setCustomValidity("Invalid email");
      el.emailFeedback.textContent = "Enter a valid email, for example name@example.com.";
    } else if (Store.emailTaken(value, el.fId.value)) {
      el.fEmail.setCustomValidity("Duplicate email");
      el.emailFeedback.textContent = "This email is already registered.";
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    checkEmail();
    el.form.classList.add("was-validated");
    if (!el.form.checkValidity()) {
      const firstBad = el.form.querySelector(":invalid");
      if (firstBad) { firstBad.focus(); }
      return;
    }

    const data = {
      name: el.fName.value.trim(),
      email: el.fEmail.value.trim(),
      department: el.fDept.value,
      semester: el.fSem.value
    };
    const editing = el.fId.value !== "";
    // A new student is shown first when sorted by "recent", so go back to page 1.
    // (Done before saving: saving triggers the redraw.)
    if (!editing && (!el.sort || el.sort.value === "recent")) { state.page = 1; }
    const result = editing ? Store.updateStudent(el.fId.value, data) : Store.addStudent(data);

    bootstrap.Modal.getOrCreateInstance(el.formModal).hide();
    if (!result.ok) {
      UI.alert("danger", "Could not save: browser storage is full or blocked. Your change was not stored.", 0);
      return;
    }
    UI.alert("success", editing ? "Student “" + data.name + "” was updated." : "Student “" + data.name + "” was added.");
  }

  /* ---------- view and delete ---------- */
  function openView(student) {
    $("viewBody").innerHTML =
      '<div class="text-center mb-3"><span class="avatar avatar-lg rounded-circle text-bg-' + UI.badgeColor(student.department) + ' d-inline-flex align-items-center justify-content-center fw-semibold">' + UI.esc(UI.initials(student.name)) + '</span></div>' +
      '<dl class="row mb-0">' +
        '<dt class="col-sm-4">Name</dt><dd class="col-sm-8">' + UI.esc(student.name) + '</dd>' +
        '<dt class="col-sm-4">Email</dt><dd class="col-sm-8 text-break">' + UI.esc(student.email) + '</dd>' +
        '<dt class="col-sm-4">Department</dt><dd class="col-sm-8">' + UI.esc(student.department || "—") + '</dd>' +
        '<dt class="col-sm-4">Semester</dt><dd class="col-sm-8">' + UI.esc(student.semester || "—") + '</dd>' +
        '<dt class="col-sm-4">Record ID</dt><dd class="col-sm-8 mb-0 text-break">' + UI.esc(student.id) + '</dd>' +
      '</dl>';
    bootstrap.Modal.getOrCreateInstance($("viewModal")).show();
  }

  function openDelete(student) {
    state.deleteId = student.id;
    $("deleteName").textContent = student.name;
    bootstrap.Modal.getOrCreateInstance($("deleteModal")).show();
  }

  function confirmDelete() {
    const student = Store.findStudent(state.deleteId);
    const result = Store.removeStudent(state.deleteId);
    bootstrap.Modal.getOrCreateInstance($("deleteModal")).hide();
    state.deleteId = null;
    if (result.ok) {
      UI.alert("warning", "Student “" + (student ? student.name : "") + "” was deleted.");
    } else {
      UI.alert("danger", "That student no longer exists.");
    }
  }

  /* ---------- JSON import / export (students page only) ---------- */
  function exportJSON() {
    const blob = new Blob([JSON.stringify(Store.getStudents(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    UI.alert("success", "Exported " + Store.getStudents().length + " students to students.json.");
  }

  function importJSON(file) {
    if (!file) { return; }
    if (file.size > 1024 * 1024) {
      UI.alert("danger", "That file is larger than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const result = Store.importStudents(String(reader.result));
      if (!result.ok) {
        UI.alert("danger", result.error);
      } else if (result.added === 0) {
        UI.alert("warning", "Nothing imported: " + result.skipped + " record(s) were invalid or had an email that already exists.");
      } else {
        UI.alert("success", "Imported " + result.added + " student(s)" + (result.skipped ? "; skipped " + result.skipped + " invalid or duplicate." : "."));
      }
    };
    reader.onerror = function () { UI.alert("danger", "The file could not be read."); };
    reader.readAsText(file);
    el.importFile.value = "";
  }

  /* ---------- wiring ---------- */
  function init(options) {
    cfg.pageSize = (options && options.pageSize) || 10;
    el = {
      search: $("fSearch"), dept: $("fDept"), sem: $("fSem"), sort: $("fSort"), reset: $("fReset"),
      body: $("studentsBody"), info: $("pageInfo"), pagination: $("pagination"),
      formModal: $("studentModal"), form: $("studentForm"), modalTitle: $("studentModalTitle"), submit: $("studentSubmit"),
      fId: $("studentId"), fName: $("sName"), fEmail: $("sEmail"), fDept: $("sDepartment"), fSem: $("sSemester"),
      emailFeedback: $("sEmailFeedback"), importFile: $("importFile")
    };

    refreshFilterOptions();

    [el.search, el.dept, el.sem, el.sort].forEach(function (control) {
      if (!control) { return; }
      control.addEventListener("input", function () { state.page = 1; render(); });
    });

    el.reset.addEventListener("click", function () {
      el.search.value = "";
      el.dept.value = "";
      el.sem.value = "";
      if (el.sort) { el.sort.selectedIndex = 0; }
      state.page = 1;
      render();
    });

    el.pagination.addEventListener("click", function (event) {
      const btn = event.target.closest("button[data-page]");
      if (btn && !btn.disabled) {
        state.page = Number(btn.dataset.page);
        render();
      }
    });

    el.body.addEventListener("click", function (event) {
      const btn = event.target.closest("button[data-action]");
      if (!btn) { return; }
      const student = Store.findStudent(btn.dataset.id);
      if (!student) { UI.alert("danger", "That student no longer exists."); return; }
      if (btn.dataset.action === "view") { openView(student); }
      if (btn.dataset.action === "edit") { openForm(student); }
      if (btn.dataset.action === "delete") { openDelete(student); }
    });

    document.querySelectorAll('[data-action="add"]').forEach(function (btn) {
      btn.addEventListener("click", function () { openForm(null); });
    });

    el.form.addEventListener("submit", onSubmit);
    el.fEmail.addEventListener("input", checkEmail);
    $("confirmDelete").addEventListener("click", confirmDelete);

    const exportBtn = $("btnExport");
    if (exportBtn) { exportBtn.addEventListener("click", exportJSON); }
    const importBtn = $("btnImport");
    if (importBtn && el.importFile) {
      importBtn.addEventListener("click", function () { el.importFile.click(); });
      el.importFile.addEventListener("change", function () { importJSON(el.importFile.files[0]); });
    }

    // Any change to the data (this page, another tab, or the Lab 6 app) redraws the table
    document.addEventListener("students:changed", function () {
      refreshFilterOptions();
      render();
    });

    render();
  }

  return { init: init };
})();
