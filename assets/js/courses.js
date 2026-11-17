"use strict";

/* courses.js - course catalog table with filters. "Students" = students of that
   department who are currently in the semester the course is offered in. */

(function () {
  const $ = function (id) { return document.getElementById(id); };

  function render() {
    const q = $("cSearch").value.trim().toLowerCase();
    const dept = $("cDept").value;
    const students = Store.getStudents();

    const rows = Store.COURSES.filter(function (c) {
      const text = !q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q);
      return text && (!dept || c.department === dept);
    });

    $("coursesBody").innerHTML = rows.length === 0
      ? '<tr><td colspan="7" class="text-center text-body-secondary py-5">No courses match your filters.</td></tr>'
      : rows.map(function (c) {
        const enrolled = students.filter(function (s) { return s.department === c.department && s.semester === String(c.semester); }).length;
        return '<tr>' +
          '<td class="fw-semibold text-nowrap">' + UI.esc(c.code) + '</td>' +
          '<td>' + UI.esc(c.title) + '</td>' +
          '<td class="d-none d-md-table-cell"><span class="badge text-bg-' + UI.badgeColor(c.department) + '">' + UI.esc(c.department) + '</span></td>' +
          '<td class="text-center">' + c.semester + '</td>' +
          '<td class="text-center d-none d-sm-table-cell">' + UI.esc(c.credits) + '</td>' +
          '<td class="d-none d-lg-table-cell">' + UI.esc(c.instructor) + '</td>' +
          '<td class="text-end"><span class="badge text-bg-light border">' + enrolled + '</span></td>' +
          '</tr>';
      }).join("");

    $("coursesInfo").textContent = "Showing " + rows.length + " of " + Store.COURSES.length + " courses";
    $("cTotal").textContent = String(rows.length);
    $("cDepts").textContent = String(new Set(rows.map(function (c) { return c.department; })).size);
  }

  UI.fillOptions($("cDept"), Store.DEPARTMENTS, "All departments");
  ["cSearch", "cDept"].forEach(function (id) { $(id).addEventListener("input", render); });
  $("cReset").addEventListener("click", function () { $("cSearch").value = ""; $("cDept").value = ""; render(); });
  document.addEventListener("students:changed", render);
  render();
})();
