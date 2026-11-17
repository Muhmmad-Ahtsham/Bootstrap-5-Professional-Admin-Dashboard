"use strict";

/* attendance.js - mark Present / Late / Absent for a date and save it.
   Stored as localStorage "attendance": { "YYYY-MM-DD": { studentId: "P"|"L"|"A" } }.
   Late counts as attended in every percentage shown in the dashboard. */

(function () {
  const $ = function (id) { return document.getElementById(id); };
  const STATUSES = [
    { code: "P", label: "Present", cls: "success" },
    { code: "L", label: "Late",    cls: "warning btn-late" },
    { code: "A", label: "Absent",  cls: "danger"  }
  ];

  let marks = {};        // marks for the selected date, keyed by student id
  let dirty = false;

  function loadMarks() {
    const saved = Store.getAttendance()[$("attDate").value] || {};
    marks = Object.assign({}, saved);
    dirty = false;
  }

  function visibleStudents() {
    const dept = $("attDept").value;
    const q = $("attSearch").value.trim().toLowerCase();
    return Store.getStudents()
      .filter(function (s) { return (!dept || s.department === dept) && (!q || s.name.toLowerCase().includes(q)); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function rowHTML(s, i) {
    const buttons = STATUSES.map(function (st) {
      const inputId = "att-" + i + "-" + st.code;
      return '<input type="radio" class="btn-check" name="att-' + i + '" id="' + inputId + '" value="' + st.code + '" data-id="' + UI.esc(s.id) + '"' + (marks[s.id] === st.code ? " checked" : "") + '>' +
        '<label class="btn btn-outline-' + st.cls + '" for="' + inputId + '">' + st.label + '</label>';
    }).join("");
    return '<tr>' +
      '<td><div class="fw-semibold">' + UI.esc(s.name) + '</div><div class="small text-body-secondary d-md-none">' + UI.esc(s.department || "") + '</div></td>' +
      '<td class="d-none d-md-table-cell"><span class="badge text-bg-' + UI.badgeColor(s.department) + '">' + UI.esc(s.department || "—") + '</span></td>' +
      '<td class="text-end"><div class="btn-group btn-group-sm" role="group" aria-label="Attendance for ' + UI.esc(s.name) + '">' + buttons + '</div></td>' +
      '</tr>';
  }

  function updateCounts() {
    const ids = new Set(visibleStudents().map(function (s) { return String(s.id); }));
    const sum = Store.summariseMarks(marks, ids);
    $("cntP").textContent = String(sum.present);
    $("cntL").textContent = String(sum.late);
    $("cntA").textContent = String(sum.absent);
    $("cntU").textContent = String(ids.size - sum.total);
    $("cntRate").textContent = UI.percent(sum.rate);
    $("btnSaveAtt").disabled = !dirty;
  }

  function render() {
    const list = visibleStudents();
    $("attBody").innerHTML = list.length === 0
      ? '<tr><td colspan="3" class="text-center text-body-secondary py-5">' + (Store.getStudents().length === 0 ? "No students yet. Add students first." : "No students match the filters.") + '</td></tr>'
      : list.map(rowHTML).join("");
    $("btnAllPresent").disabled = list.length === 0;
    updateCounts();
  }

  function onDateChange() {
    if (dirty && !window.confirm("You have unsaved attendance for this date. Discard it?")) {
      $("attDate").value = $("attDate").dataset.last;
      return;
    }
    if (!$("attDate").value) { $("attDate").value = Store.todayKey(); }
    $("attDate").dataset.last = $("attDate").value;
    loadMarks();
    render();
  }

  function init() {
    const date = $("attDate");
    date.value = Store.todayKey();
    date.max = Store.todayKey();
    date.dataset.last = date.value;
    UI.fillOptions($("attDept"), UI.departmentsInUse(), "All departments");

    date.addEventListener("change", onDateChange);
    $("attDept").addEventListener("input", render);
    $("attSearch").addEventListener("input", render);

    $("attBody").addEventListener("change", function (event) {
      const input = event.target.closest("input[type=radio][data-id]");
      if (!input) { return; }
      marks[input.dataset.id] = input.value;
      dirty = true;
      updateCounts();
    });

    $("btnAllPresent").addEventListener("click", function () {
      visibleStudents().forEach(function (s) { marks[s.id] = "P"; });
      dirty = true;
      render();
    });

    $("btnSaveAtt").addEventListener("click", function () {
      const ok = Store.saveAttendance(date.value, marks);
      dirty = false;
      updateCounts();
      if (ok) {
        UI.alert("success", "Attendance for " + UI.formatDate(date.value) + " was saved.");
      } else {
        UI.alert("danger", "Could not save: browser storage is full or blocked.", 0);
      }
    });

    document.addEventListener("students:changed", function () {
      UI.fillOptions($("attDept"), UI.departmentsInUse(), "All departments");
      if (!dirty) { loadMarks(); }
      render();
    });

    window.addEventListener("beforeunload", function (event) {
      if (dirty) { event.preventDefault(); event.returnValue = ""; }
    });

    loadMarks();
    render();
  }

  init();
})();
