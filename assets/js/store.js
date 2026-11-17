"use strict";

/* =====================================================================
   store.js - data layer for the admin dashboard (Lab 7)

   Lab 6 integration: the dashboard reads and writes the SAME localStorage
   key that the Lab 6 student app uses: "students" (a JSON array).
   Pages served from the same origin (for example http://localhost/...)
   share localStorage, so students added in Lab 6 appear here and the other
   way round.

   Student record: { id, name, email, department, semester }
   Older field names (fullName, dept, sem) are also understood when reading.
   ===================================================================== */

const Store = (function () {
  const KEYS = { students: "students", attendance: "attendance" };

  const DEPARTMENTS = [
    "Computer Science",
    "Software Engineering",
    "Information Technology",
    "Data Science"
  ];
  const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

  // Alternative field names that an older Lab 6 app might have used
  const ALIASES = {
    name: ["fullName", "studentName"],
    department: ["dept"],
    semester: ["sem"]
  };

  const COURSES = [
    { code: "CS-101", title: "Programming Fundamentals",       department: "Computer Science",       semester: 1, credits: "3(2+1)", instructor: "Ms. Fatima Noor" },
    { code: "CS-201", title: "Data Structures and Algorithms", department: "Computer Science",       semester: 3, credits: "4(3+1)", instructor: "Dr. Sara Khan" },
    { code: "CS-202", title: "Database Systems",               department: "Computer Science",       semester: 4, credits: "3(2+1)", instructor: "Ms. Fatima Noor" },
    { code: "CS-302", title: "Web Technologies",               department: "Computer Science",       semester: 5, credits: "3(2+1)", instructor: "Mr. Hamza Ali" },
    { code: "CS-401", title: "Artificial Intelligence",        department: "Computer Science",       semester: 7, credits: "3(2+1)", instructor: "Dr. Sara Khan" },
    { code: "SE-201", title: "Software Requirements",          department: "Software Engineering",   semester: 3, credits: "3(3+0)", instructor: "Mr. Bilal Ahmed" },
    { code: "SE-301", title: "Software Design and Architecture", department: "Software Engineering", semester: 5, credits: "3(2+1)", instructor: "Mr. Bilal Ahmed" },
    { code: "SE-401", title: "Software Testing",               department: "Software Engineering",   semester: 7, credits: "3(2+1)", instructor: "Mr. Bilal Ahmed" },
    { code: "IT-102", title: "Introduction to Networks",       department: "Information Technology", semester: 2, credits: "3(2+1)", instructor: "Dr. Imran Shah" },
    { code: "IT-302", title: "Systems Administration",         department: "Information Technology", semester: 5, credits: "3(2+1)", instructor: "Dr. Imran Shah" },
    { code: "DS-201", title: "Statistics for Data Science",    department: "Data Science",           semester: 3, credits: "3(3+0)", instructor: "Dr. Ayesha Memon" },
    { code: "DS-401", title: "Machine Learning",               department: "Data Science",           semester: 7, credits: "3(2+1)", instructor: "Dr. Ayesha Memon" }
  ];

  const SAMPLE_STUDENTS = [
    ["Ayesha Khan",     "ayesha.khan@example.com",    "Computer Science",       3],
    ["Hamza Ali",       "hamza.ali@example.com",      "Computer Science",       5],
    ["Sara Malik",      "sara.malik@example.com",     "Computer Science",       1],
    ["Bilal Ahmed",     "bilal.ahmed@example.com",    "Software Engineering",   3],
    ["Fatima Noor",     "fatima.noor@example.com",    "Software Engineering",   5],
    ["Usman Tariq",     "usman.tariq@example.com",    "Software Engineering",   7],
    ["Zainab Shah",     "zainab.shah@example.com",    "Information Technology", 2],
    ["Ali Raza",        "ali.raza@example.com",       "Information Technology", 5],
    ["Mariam Siddiqui", "mariam.siddiqui@example.com","Information Technology", 4],
    ["Hassan Memon",    "hassan.memon@example.com",   "Data Science",           3],
    ["Hina Qureshi",    "hina.qureshi@example.com",   "Data Science",           7],
    ["Omar Farooq",     "omar.farooq@example.com",    "Data Science",           1],
    ["Noor Fatima",     "noor.fatima@example.com",    "Computer Science",       7],
    ["Danish Iqbal",    "danish.iqbal@example.com",   "Computer Science",       3],
    ["Rabia Aslam",     "rabia.aslam@example.com",    "Software Engineering",   1],
    ["Kamran Baig",     "kamran.baig@example.com",    "Information Technology", 8]
  ];

  const state = { corrupt: false, writable: true };

  /* ---------- low-level storage (never throws) ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      if (key === KEYS.students) { state.corrupt = true; }
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      state.writable = false;
      return false;
    }
  }

  function emit() {
    document.dispatchEvent(new CustomEvent("students:changed"));
  }

  /* ---------- students ---------- */
  function newId() {
    return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function pick(raw, field) {
    const keys = [field].concat(ALIASES[field] || []);
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== "") {
        return String(raw[k]).trim();
      }
    }
    return "";
  }

  // The original stored object of every normalised student. Saving starts from the
  // original, so fields this dashboard does not know about (and number/string types
  // used by Lab 6) are never lost or changed.
  const RAW = new WeakMap();

  // position is used to give a stable id to records that have none
  function toStudent(raw, position) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) { return null; }
    const hasId = raw.id !== undefined && raw.id !== null && String(raw.id) !== "";
    const id = hasId ? raw.id : "row" + (position === undefined ? newId() : position);
    const student = {
      id: id,
      name: pick(raw, "name"),
      email: pick(raw, "email"),
      department: pick(raw, "department"),
      semester: pick(raw, "semester")
    };
    RAW.set(student, raw);
    return student;
  }

  function firstStored(raw, field) {
    const keys = [field].concat(ALIASES[field] || []);
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== "") { return raw[k]; }
    }
    return undefined;
  }

  // Build the object that is written to localStorage for one student
  function toStorage(student) {
    const raw = RAW.get(student) || {};
    const out = Object.assign({}, raw);
    out.id = student.id;
    ["name", "email", "department", "semester"].forEach(function (field) {
      const stored = firstStored(raw, field);
      if (stored === undefined && student[field] === "") { return; }                 // nothing to write
      if (stored !== undefined && String(stored).trim() === student[field]) { return; } // unchanged: keep original
      const keys = [field].concat(ALIASES[field] || []).filter(function (k) { return k in out; });
      (keys.length ? keys : [field]).forEach(function (k) {
        const wasNumber = typeof out[k] === "number";
        out[k] = wasNumber && student[field] !== "" && !Number.isNaN(Number(student[field])) ? Number(student[field]) : student[field];
      });
    });
    return out;
  }

  function getStudents() {
    state.corrupt = false;
    const data = read(KEYS.students, []);
    if (!Array.isArray(data)) {
      state.corrupt = data !== null;
      return [];
    }
    const seen = new Set();
    const list = [];
    data.forEach(function (raw, position) {
      const s = toStudent(raw, position);
      if (!s) { return; }
      // keep ids unique (and stable between reads) even if the stored data repeats one
      const base = String(s.id);
      let n = 1;
      while (seen.has(String(s.id))) { s.id = base + "-dup" + n++; }
      seen.add(String(s.id));
      list.push(s);
    });
    return list;
  }

  function saveStudents(list) {
    const ok = write(KEYS.students, list.map(toStorage));
    emit();
    return ok;
  }

  function addStudent(data) {
    const list = getStudents();
    const record = Object.assign({ id: newId() }, data);
    list.push(record);
    return { ok: saveStudents(list), student: record };
  }

  function updateStudent(id, data) {
    const list = getStudents();
    const record = list.find(function (s) { return String(s.id) === String(id); });
    if (!record) { return { ok: false }; }
    Object.assign(record, data);
    return { ok: saveStudents(list), student: record };
  }

  function removeStudent(id) {
    const list = getStudents();
    const next = list.filter(function (s) { return String(s.id) !== String(id); });
    if (next.length === list.length) { return { ok: false }; }
    return { ok: saveStudents(next) };
  }

  function findStudent(id) {
    return getStudents().find(function (s) { return String(s.id) === String(id); }) || null;
  }

  function emailTaken(email, exceptId) {
    const wanted = String(email).trim().toLowerCase();
    return getStudents().some(function (s) {
      return s.email.toLowerCase() === wanted && String(s.id) !== String(exceptId || "");
    });
  }

  /* ---------- import / export ---------- */
  function importStudents(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      return { ok: false, error: "The file is not valid JSON." };
    }
    if (!Array.isArray(data)) {
      return { ok: false, error: "The JSON must be an array of students." };
    }
    const list = getStudents();
    const emails = new Set(list.map(function (s) { return s.email.toLowerCase(); }));
    let added = 0;
    let skipped = 0;
    data.forEach(function (raw) {
      const s = toStudent(raw);
      const valid = s && s.name.length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s.email);
      if (!valid || emails.has(s.email.toLowerCase())) { skipped++; return; }
      emails.add(s.email.toLowerCase());
      list.push(s);
      added++;
    });
    if (added > 0) { saveStudents(list); }
    return { ok: true, added: added, skipped: skipped };
  }

  /* ---------- attendance: { "YYYY-MM-DD": { studentId: "P" | "L" | "A" } } ---------- */
  function getAttendance() {
    const data = read(KEYS.attendance, {});
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  }

  function saveAttendance(dateKey, marks) {
    const all = getAttendance();
    all[dateKey] = marks;
    const ok = write(KEYS.attendance, all);
    emit();
    return ok;
  }

  // Late counts as attended. Returns { present, late, absent, total, rate }.
  function summariseMarks(marks, ids) {
    const out = { present: 0, late: 0, absent: 0, total: 0, rate: null };
    Object.keys(marks || {}).forEach(function (id) {
      if (ids && !ids.has(String(id))) { return; }
      const m = marks[id];
      if (m === "P") { out.present++; } else if (m === "L") { out.late++; } else if (m === "A") { out.absent++; } else { return; }
      out.total++;
    });
    out.rate = out.total ? ((out.present + out.late) / out.total) * 100 : null;
    return out;
  }

  /* ---------- sample data (only when there is no data yet) ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function loadSample() {
    if (getStudents().length > 0) { return false; }
    const list = SAMPLE_STUDENTS.map(function (row, i) {
      return { id: 1001 + i, name: row[0], email: row[1], department: row[2], semester: String(row[3]) };
    });
    write(KEYS.students, list);

    if (Object.keys(getAttendance()).length === 0) {
      const att = {};
      const day = new Date();
      let made = 0;
      while (made < 5) {
        day.setDate(day.getDate() - (made === 0 && day.getDay() % 6 !== 0 ? 0 : 1));
        if (day.getDay() % 6 !== 0) {            // skip Saturday and Sunday
          const marks = {};
          list.forEach(function (s, i) {
            const roll = (i * 7 + made * 5 + day.getDate()) % 10;   // fixed pattern, not random
            marks[s.id] = roll < 7 ? "P" : roll < 8 ? "L" : "A";
          });
          att[dateKey(day)] = marks;
          made++;
        }
      }
      write(KEYS.attendance, att);
    }
    emit();
    return true;
  }

  function todayKey() { return dateKey(new Date()); }

  // Other tabs / pages (including Lab 6) changed the data
  window.addEventListener("storage", function (event) {
    if (event.key === null || event.key === KEYS.students || event.key === KEYS.attendance) { emit(); }
  });

  return {
    KEYS: KEYS, DEPARTMENTS: DEPARTMENTS, SEMESTERS: SEMESTERS, COURSES: COURSES, state: state,
    getStudents: getStudents, addStudent: addStudent, updateStudent: updateStudent,
    removeStudent: removeStudent, findStudent: findStudent, emailTaken: emailTaken,
    importStudents: importStudents,
    getAttendance: getAttendance, saveAttendance: saveAttendance, summariseMarks: summariseMarks,
    loadSample: loadSample, todayKey: todayKey, dateKey: dateKey
  };
})();
