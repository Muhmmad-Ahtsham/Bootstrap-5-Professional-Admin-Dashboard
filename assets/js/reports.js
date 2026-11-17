"use strict";

/* reports.js - summary cards and tables built from the students and attendance data. */

(function () {
  const $ = function (id) { return document.getElementById(id); };

  function csvCell(value) {
    let text = String(value);
    if (/^[=+\-@\t\r]/.test(text)) { text = "'" + text; }   // stop spreadsheet formula injection
    return '"' + text.replace(/"/g, '""') + '"';
  }

  // Attendance (all recorded dates) for a set of student ids. Late counts as attended.
  function attendanceFor(ids) {
    const total = { present: 0, late: 0, absent: 0, total: 0 };
    Object.values(Store.getAttendance()).forEach(function (marks) {
      const s = Store.summariseMarks(marks, ids);
      total.present += s.present; total.late += s.late; total.absent += s.absent; total.total += s.total;
    });
    total.rate = total.total ? ((total.present + total.late) / total.total) * 100 : null;
    return total;
  }

  let summaryRows = [];     // kept for CSV export

  function render() {
    const students = Store.getStudents();
    const deptSet = new Set(Store.DEPARTMENTS);
    students.forEach(function (s) { if (s.department) { deptSet.add(s.department); } });
    const depts = Array.from(deptSet);
    const semesters = UI.semestersInUse().filter(function (sem) {
      return Store.SEMESTERS.map(String).indexOf(sem) !== -1 || students.some(function (s) { return s.semester === sem; });
    });

    // Per-department figures
    summaryRows = depts.map(function (name) {
      const list = students.filter(function (s) { return s.department === name; });
      const ids = new Set(list.map(function (s) { return String(s.id); }));
      return { name: name, count: list.length, att: attendanceFor(ids) };
    });
    const overall = attendanceFor(new Set(students.map(function (s) { return String(s.id); })));
    const largest = summaryRows.slice().sort(function (a, b) { return b.count - a.count; })[0];
    const active = summaryRows.filter(function (r) { return r.count > 0; });

    // Summary cards
    $("rTotal").textContent = students.length.toLocaleString("en-US");
    $("rDepts").textContent = String(active.length);
    $("rLargest").textContent = students.length && largest ? largest.name : "—";
    $("rLargestNote").textContent = students.length && largest ? largest.count + " students" : "No data yet";
    $("rAttendance").textContent = UI.percent(overall.rate);
    $("rAttendanceNote").textContent = overall.total ? "Across " + Object.keys(Store.getAttendance()).length + " recorded day(s)" : "No attendance recorded";

    // Table 1: department x semester matrix
    const head = '<tr><th scope="col">Department</th>' + semesters.map(function (n) { return '<th scope="col" class="text-center">Sem ' + UI.esc(n) + '</th>'; }).join("") + '<th scope="col" class="text-center">Total</th></tr>';
    const colTotals = semesters.map(function () { return 0; });
    let body = depts.map(function (name) {
      let rowTotal = 0;
      const cells = semesters.map(function (sem, i) {
        const n = students.filter(function (s) { return s.department === name && s.semester === sem; }).length;
        rowTotal += n;
        colTotals[i] += n;
        return '<td class="text-center' + (n === 0 ? " text-body-tertiary" : "") + '">' + n + '</td>';
      }).join("");
      return '<tr><th scope="row" class="fw-normal">' + UI.esc(name) + '</th>' + cells + '<td class="text-center fw-semibold">' + rowTotal + '</td></tr>';
    }).join("");
    const grand = colTotals.reduce(function (a, b) { return a + b; }, 0);
    body += '<tr class="table-light fw-semibold"><th scope="row">Total</th>' + colTotals.map(function (n) { return '<td class="text-center">' + n + '</td>'; }).join("") + '<td class="text-center">' + grand + '</td></tr>';
    $("matrixHead").innerHTML = head;
    $("matrixBody").innerHTML = body;

    // Table 2: department summary
    $("summaryBody").innerHTML = summaryRows.map(function (r) {
      const share = students.length ? (r.count / students.length) * 100 : 0;
      return '<tr><th scope="row" class="fw-normal">' + UI.esc(r.name) + '</th>' +
        '<td class="text-center">' + r.count + '</td>' +
        '<td style="min-width:140px"><div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" role="progressbar" aria-label="' + UI.esc(r.name) + ' share" aria-valuenow="' + share.toFixed(0) + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar bg-' + UI.badgeColor(r.name) + '" style="width:' + share.toFixed(1) + '%"></div></div><span class="small text-body-secondary text-nowrap">' + share.toFixed(1) + '%</span></div></td>' +
        '<td class="text-center d-none d-sm-table-cell">' + (r.att.total ? r.att.present + " / " + r.att.late + " / " + r.att.absent : "—") + '</td>' +
        '<td class="text-end fw-semibold">' + UI.percent(r.att.rate) + '</td></tr>';
    }).join("");

    $("reportDate").textContent = "Generated on " + UI.formatDate(Store.todayKey());
  }

  function exportCSV() {
    const lines = [["Department", "Students", "Share %", "Present", "Late", "Absent", "Attendance %"].map(csvCell).join(",")];
    const total = summaryRows.reduce(function (n, r) { return n + r.count; }, 0);
    summaryRows.forEach(function (r) {
      lines.push([
        r.name, r.count, total ? ((r.count / total) * 100).toFixed(1) : "0.0",
        r.att.present, r.att.late, r.att.absent, r.att.rate === null ? "" : r.att.rate.toFixed(1)
      ].map(csvCell).join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "department-report.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    UI.alert("success", "Report exported to department-report.csv.");
  }

  $("btnPrint").addEventListener("click", function () { window.print(); });
  $("btnCsv").addEventListener("click", exportCSV);
  document.addEventListener("students:changed", render);
  render();
})();
