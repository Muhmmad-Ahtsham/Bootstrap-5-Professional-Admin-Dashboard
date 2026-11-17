"use strict";

/* =====================================================================
   dashboard.js - KPI cards and department overview for index.html.
   Everything reacts to the filter bar: the table fires "students:filtered"
   with the students that match, and the cards are recalculated from them.
   ===================================================================== */

(function () {
  const $ = function (id) { return document.getElementById(id); };

  function countBy(list, field) {
    const counts = {};
    list.forEach(function (s) {
      const key = s[field] || "Unassigned";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  // Latest attendance date that has at least one mark for the given students
  function latestAttendance(ids) {
    const all = Store.getAttendance();
    const dates = Object.keys(all).sort().reverse();
    for (const date of dates) {
      const summary = Store.summariseMarks(all[date], ids);
      if (summary.total > 0) { return { date: date, summary: summary }; }
    }
    return null;
  }

  function update(filtered) {
    const deptFilter = $("fDept").value;
    const semFilter = $("fSem").value;
    const filtering = Boolean(deptFilter || semFilter || $("fSearch").value.trim());

    // Card 1: students
    $("kpiStudents").textContent = filtered.length.toLocaleString("en-US");
    $("kpiStudentsNote").textContent = filtering ? "Matching current filters" : "All registered students";

    // Card 2: departments in the filtered list
    const byDept = countBy(filtered, "department");
    const deptNames = Object.keys(byDept);
    $("kpiDepartments").textContent = String(deptNames.length);
    $("kpiDepartmentsNote").textContent = deptNames.length ? "With enrolled students" : "No students to group";

    // Card 3: courses that match the department and semester filters
    const courses = Store.COURSES.filter(function (c) {
      return (!deptFilter || c.department === deptFilter) && (!semFilter || String(c.semester) === semFilter);
    });
    $("kpiCourses").textContent = String(courses.length);
    $("kpiCoursesNote").textContent = "In the course catalog";

    // Card 4: latest attendance rate for the filtered students
    const ids = new Set(filtered.map(function (s) { return String(s.id); }));
    const latest = latestAttendance(ids);
    $("kpiAttendance").textContent = latest ? UI.percent(latest.summary.rate) : "—";
    $("kpiAttendanceNote").textContent = latest ? "On " + UI.formatDate(latest.date) : "No attendance recorded";

    // Department overview (progress bars)
    const box = $("deptBars");
    if (filtered.length === 0) {
      box.innerHTML = '<p class="text-body-secondary mb-0">No data to show.</p>';
      return;
    }
    box.innerHTML = deptNames
      .sort(function (a, b) { return byDept[b] - byDept[a] || a.localeCompare(b); })
      .map(function (name) {
        const pct = (byDept[name] / filtered.length) * 100;
        return '<div class="mb-3">' +
          '<div class="d-flex justify-content-between small mb-1"><span>' + UI.esc(name) + '</span><span class="text-body-secondary">' + byDept[name] + ' (' + pct.toFixed(0) + '%)</span></div>' +
          '<div class="progress" role="progressbar" aria-label="' + UI.esc(name) + ' share of students" aria-valuenow="' + pct.toFixed(0) + '" aria-valuemin="0" aria-valuemax="100">' +
          '<div class="progress-bar bg-' + UI.badgeColor(name) + '" style="width:' + pct.toFixed(1) + '%"></div></div></div>';
      }).join("");
  }

  document.addEventListener("students:filtered", function (event) { update(event.detail.filtered); });
})();
