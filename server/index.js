require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./db/connection');
const app = express();
const port = process.env.PORT || 5000;

const settingsFilePath = path.join(__dirname, 'db/settings.json');

async function getSettingsFromDb() {
  const defaultStaffing = [2, 2, 1, 1, 1, 2, 2, 2];
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM ScheduleSource');
    if (rows.length > 0) {
      const settings = {
        wages: { junior: 200, senior: 220 },
        staffing: [...defaultStaffing],
        constraints: { maxHours: 20, consecutiveShiftsAllowed: false, seniorRequiredPerShift: true }
      };
      rows.forEach(row => {
        const val = row.setting_value;
        if (row.setting_key === 'wages_junior') settings.wages.junior = parseInt(val);
        else if (row.setting_key === 'wages_senior') settings.wages.senior = parseInt(val);
        else if (row.setting_key.startsWith('staffing_slot_')) {
          const idx = parseInt(row.setting_key.replace('staffing_slot_', ''));
          if (idx >= 0 && idx < 8) {
            settings.staffing[idx] = parseInt(val);
          }
        }
        else if (row.setting_key === 'constraints_maxHours') settings.constraints.maxHours = parseInt(val);
        else if (row.setting_key === 'constraints_consecutiveShiftsAllowed') settings.constraints.consecutiveShiftsAllowed = (val === 'true');
        else if (row.setting_key === 'constraints_seniorRequiredPerShift') settings.constraints.seniorRequiredPerShift = (val === 'true');
      });
      return settings;
    }
  } catch (e) {
    console.error('Error reading settings from DB', e);
  }
  
  // Fallback to local settings.json file
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
      if (data && data.staffing && !Array.isArray(data.staffing)) {
        // Map legacy object to array
        const morning = parseInt(data.staffing.morning) || 2;
        const afternoon = parseInt(data.staffing.afternoon) || 1;
        const evening = parseInt(data.staffing.evening) || 2;
        data.staffing = [morning, morning, afternoon, afternoon, afternoon, evening, evening, evening];
      }
      return data;
    }
  } catch (e) {
    console.error('Error reading settings file', e);
  }
  return {
    wages: { junior: 200, senior: 220 },
    staffing: [...defaultStaffing],
    constraints: { maxHours: 20, consecutiveShiftsAllowed: false, seniorRequiredPerShift: true }
  };
}


app.use(cors());
app.use(express.json());

// Helper mapping for availability
// morning: rows 0-4 (8:00 - 13:00)
// afternoon: rows 5-9 (13:00 - 18:00)
// evening: rows 10-13 (18:00 - 22:00)
const SHIFTS = {
  morning: [0, 1, 2, 3, 4],
  afternoon: [5, 6, 7, 8, 9],
  evening: [10, 11, 12, 13]
};

const DAYS_MAP = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Time slots mapping for schedule (row to times)
const TIME_SLOTS = [
  { start: '08:00:00', end: '10:00:00' },
  { start: '10:00:00', end: '12:00:00' },
  { start: '12:00:00', end: '14:00:00' },
  { start: '14:00:00', end: '16:00:00' },
  { start: '16:00:00', end: '18:00:00' },
  { start: '18:00:00', end: '20:00:00' },
  { start: '20:00:00', end: '22:00:00' },
  { start: '22:00:00', end: '00:00:00' }
];

// Timezone-safe local date formatter (YYYY-MM-DD)
const formatLocalDate = (dateObj) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getWeekRange = (offset = 0) => {
  const today = new Date();
  const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  // Monday of the current week (offset = 0)
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const currentMonday = new Date(today);
  currentMonday.setDate(diff);

  const targetMonday = new Date(currentMonday);
  targetMonday.setDate(currentMonday.getDate() + (offset * 7));

  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  return {
    start: formatLocalDate(targetMonday),
    end: formatLocalDate(targetSunday),
    mondayDate: targetMonday
  };
};

async function seedMockScheduleForWeek(offset) {
  try {
    const { start, end, mondayDate } = getWeekRange(offset);
    
    // Check if records already exist
    const [existing] = await db.query(
      'SELECT COUNT(*) as count FROM WorkSchedule WHERE schedule_date BETWEEN ? AND ?',
      [start, end]
    );
    
    if (existing[0].count > 0) {
      return;
    }

    console.log(`Seeding mock schedule for week offset ${offset} (${start} - ${end})...`);

    // Get all employees
    const [employees] = await db.query("SELECT employee_id, name, level, hourly_wage FROM Employee WHERE level != 'manager'");
    if (employees.length === 0) {
      console.log('No employees found. Cannot seed mock schedule.');
      return;
    }

    const currentSettings = await getSettingsFromDb();

    await db.query('START TRANSACTION');

    // For each day (0 to 6)
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const targetDate = new Date(mondayDate);
      targetDate.setDate(mondayDate.getDate() + colIdx);
      const dateStr = formatLocalDate(targetDate);

      // For each time slot (0 to 7)
      for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
        const requiredCount = Array.isArray(currentSettings.staffing) 
          ? (currentSettings.staffing[rowIdx] !== undefined ? currentSettings.staffing[rowIdx] : 2)
          : 2;

        // Shuffle employees to pick random ones
        const shuffled = [...employees].sort(() => 0.5 - Math.random());
        const assigned = shuffled.slice(0, requiredCount);

        const timeSlot = TIME_SLOTS[rowIdx];

        for (const emp of assigned) {
          // Insert into WorkSchedule
          const [wsResult] = await db.query(
            `INSERT INTO WorkSchedule (employee_id, Employee_num, schedule_date, start_time, end_time)
             VALUES (?, ?, ?, ?, ?)`,
            [emp.employee_id, assigned.length, dateStr, timeSlot.start, timeSlot.end]
          );

          // Calculate wages (2 hours * hourly_wage)
          const workHours = 2.0;
          const wage = emp.hourly_wage * workHours;

          // Insert into PayRecord
          await db.query(
            `INSERT INTO PayRecord (Work_Schedule_ID, Employee_ID, wage, work_hour, wage_per_hour)
             VALUES (?, ?, ?, ?, ?)`,
            [wsResult.insertId, emp.employee_id, wage, workHours, emp.hourly_wage]
          );
        }
      }
    }

    await db.query('COMMIT');
    console.log(`Mock schedule for week offset ${offset} seeded successfully.`);
  } catch (err) {
    console.error(`Failed to seed mock schedule for offset ${offset}:`, err);
    try { await db.query('ROLLBACK'); } catch (_) {}
  }
}

// Calculate next week's Monday based on current local date
const getNextWeekMondayDate = () => {
  const today = new Date();
  const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  return nextMonday;
};

const getNextMondayStr = () => {
  return formatLocalDate(getNextWeekMondayDate());
};

const getNextSundayStr = () => {
  const nextMonday = getNextWeekMondayDate();
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  return formatLocalDate(nextSunday);
};

// Calculate current week's Monday based on current local date
const getCurrentMondayDate = () => {
  const today = new Date();
  const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const currentMonday = new Date(today);
  currentMonday.setDate(diff);
  return currentMonday;
};

const getCurrentMondayStr = () => {
  return formatLocalDate(getCurrentMondayDate());
};

// Helper to get date for next week's day of week (starting dynamically on next Monday)
const getWeekDateString = (dayColIdx) => {
  const baseDate = getNextWeekMondayDate();
  baseDate.setDate(baseDate.getDate() + dayColIdx);
  return formatLocalDate(baseDate);
};

// Helper to get day col index from date
const getDayColIdxFromDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
  return day === 0 ? 6 : day - 1;
};

// Basic route
app.get('/', (req, res) => {
  res.send('Automated Scheduling System API');
});

// Authentication API
app.post('/api/login', async (req, res) => {
  const { role, username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '姓名與密碼為必填項目！' });
  }

  try {
    // 1. Find user by name in Employee table
    const [rows] = await db.query(
      'SELECT employee_id, name, level, email, password FROM Employee WHERE name = ?',
      [username.trim()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: '登入失敗：帳號不存在，請確認輸入姓名是否正確！' });
    }
    const user = rows[0];

    // 2. Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: '登入失敗：密碼錯誤，請確認輸入密碼是否正確！' });
    }

    // 3. Verify entryway role and database level role match
    if (user.level === 'manager') {
      if (role !== 'admin') {
        return res.status(401).json({ error: '登入失敗：管理者請由管理者登入頁面登入！' });
      }
      return res.json({ name: user.name, role: 'admin' });
    } else {
      if (role !== 'employee') {
        return res.status(401).json({ error: '登入失敗：該帳號非管理者帳號！' });
      }
      return res.json({ name: user.name, role: 'employee' });
    }
  } catch (error) {
    console.error('Login backend error:', error);
    res.status(500).json({ error: '伺服器驗證失敗，請稍後再試。' });
  }
});

// Employee self change password API
app.put('/api/change-password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ error: '請填寫所有必要欄位（姓名、舊密碼、新密碼）！' });
  }

  try {
    // 1. Find employee by name
    const [rows] = await db.query('SELECT employee_id, password FROM Employee WHERE name = ?', [username.trim()]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '修改失敗：找不到該員工帳號！' });
    }
    const employee = rows[0];

    // 2. Compare current password
    const match = await bcrypt.compare(currentPassword, employee.password);
    if (!match) {
      return res.status(401).json({ error: '修改失敗：舊密碼輸入錯誤！' });
    }

    // 3. Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE Employee SET password = ? WHERE employee_id = ?', [hashedPassword, employee.employee_id]);

    res.json({ message: '密碼修改成功，請重新登入！' });
  } catch (error) {
    console.error('Change password API error:', error);
    res.status(500).json({ error: '伺服器內部錯誤，修改密碼失敗。' });
  }
});


// ==========================================
// 1. Employee Management API
// ==========================================

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT employee_id AS id, name, level, email, hourly_wage AS hourlyWage, DATE_FORMAT(join_date, '%Y-%m-%d') AS joinDate FROM Employee WHERE level != 'manager'"
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Add an employee
app.post('/api/employees', async (req, res) => {
  const { name, email, password, level, hourlyWage } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: '姓名、電子郵件和密碼皆為必填！' });
  }
  const joinDate = new Date().toISOString().split('T')[0];
  
  // Resolve default hourly wage from system settings
  const currentSettings = await getSettingsFromDb();
  const defaultWage = level === 'senior' ? currentSettings.wages.senior : currentSettings.wages.junior;

  const finalWage = (hourlyWage !== undefined && hourlyWage !== null && hourlyWage !== '') ? parseInt(hourlyWage) : defaultWage;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO Employee (name, email, password, level, hourly_wage, join_date) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, level || 'junior', finalWage, joinDate]
    );
    res.status(201).json({ id: result.insertId, name, email, level: level || 'junior', hourlyWage: finalWage, joinDate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

// Update an employee
app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, level, hourlyWage } = req.body;
  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE Employee SET name = ?, email = ?, password = ?, level = ?, hourly_wage = ? WHERE employee_id = ?',
        [name, email, hashedPassword, level, hourlyWage || 200, id]
      );
    } else {
      await db.query(
        'UPDATE Employee SET name = ?, email = ?, level = ?, hourly_wage = ? WHERE employee_id = ?',
        [name, email, level, hourlyWage || 200, id]
      );
    }
    res.json({ id: parseInt(id), name, email, level, hourlyWage: hourlyWage || 200 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete an employee
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Employee WHERE employee_id = ?', [id]);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});


// ==========================================
// 2. Availability API
// ==========================================

// Get all employees availability
app.get('/api/availability', async (req, res) => {
  try {
    const [availRows] = await db.query(
      `SELECT e.name AS employee_name, a.day_of_week, a.shift, a.status 
       FROM Availability a
       JOIN Employee e ON a.Employee_ID = e.employee_id`
    );

    const result = {};

    availRows.forEach(row => {
      const name = row.employee_name;
      if (!result[name]) {
        result[name] = Array.from({ length: 8 }, () => Array(7).fill(false));
      }
      if (row.status === 'available') {
        const dayIdx = DAYS_MAP.indexOf(row.day_of_week);
        if (dayIdx !== -1) {
          if (row.shift.startsWith('slot_')) {
            const rIdx = parseInt(row.shift.replace('slot_', ''));
            if (rIdx >= 0 && rIdx < 8) {
              result[name][rIdx][dayIdx] = true;
            }
          } else {
            // Legacy compatibility mapping
            const legacyRows = SHIFTS[row.shift] || [];
            legacyRows.forEach(lIdx => {
              const rIdx = Math.floor(lIdx / 2);
              if (rIdx >= 0 && rIdx < 8) {
                result[name][rIdx][dayIdx] = true;
              }
            });
          }
        }
      }
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get all availabilities' });
  }
});

// Get availability grid for an employee
app.get('/api/availability/:employeeName', async (req, res) => {
  const { employeeName } = req.params;
  try {
    // 1. Find employee_id
    const [employees] = await db.query('SELECT employee_id FROM Employee WHERE name = ?', [employeeName]);
    if (employees.length === 0) {
      return res.json(Array.from({ length: 8 }, () => Array(7).fill(false)));
    }
    const empId = employees[0].employee_id;

    // 2. Query Availability table
    const [availRows] = await db.query(
      'SELECT day_of_week, shift, status FROM Availability WHERE Employee_ID = ?',
      [empId]
    );

    // 3. Construct 8x7 grid
    const grid = Array.from({ length: 8 }, () => Array(7).fill(false));

    availRows.forEach(row => {
      if (row.status === 'available') {
        const dayIdx = DAYS_MAP.indexOf(row.day_of_week);
        if (dayIdx !== -1) {
          if (row.shift.startsWith('slot_')) {
            const rIdx = parseInt(row.shift.replace('slot_', ''));
            if (rIdx >= 0 && rIdx < 8) {
              grid[rIdx][dayIdx] = true;
            }
          } else {
            // Legacy compatibility mapping
            const legacyRows = SHIFTS[row.shift] || [];
            legacyRows.forEach(lIdx => {
              const rIdx = Math.floor(lIdx / 2);
              if (rIdx >= 0 && rIdx < 8) {
                grid[rIdx][dayIdx] = true;
              }
            });
          }
        }
      }
    });

    res.json(grid);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get availability' });
  }
});

// Save availability grid for an employee
app.post('/api/availability/:employeeName', async (req, res) => {
  const { employeeName } = req.params;
  const grid = req.body; // 8x7 array
  if (!Array.isArray(grid) || grid.length !== 8) {
    return res.status(400).json({ error: 'Invalid grid data' });
  }

  try {
    // 1. Find employee_id
    const [employees] = await db.query('SELECT employee_id FROM Employee WHERE name = ?', [employeeName]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const empId = employees[0].employee_id;

    // Start transaction
    await db.query('START TRANSACTION');

    // Clean up existing entries for this employee
    await db.query('DELETE FROM Availability WHERE Employee_ID = ?', [empId]);

    // For each of the 7 days (columns)
    for (let col = 0; col < 7; col++) {
      const dayName = DAYS_MAP[col];
      
      // Check each slot
      for (let row = 0; row < 8; row++) {
        const isAvailable = grid[row] && grid[row][col];
        const statusValue = isAvailable ? 'available' : 'unavailable';
        const shiftName = `slot_${row}`;

        // INSERT into Availability table
        await db.query(
          `INSERT INTO Availability (Employee_ID, day_of_week, shift, status)
           VALUES (?, ?, ?, ?)`,
          [empId, dayName, shiftName, statusValue]
        );
      }
    }

    await db.query('COMMIT');
    res.json({ message: 'Availability saved successfully' });
  } catch (error) {
    console.error(error);
    try { await db.query('ROLLBACK'); } catch (_) {}
    res.status(500).json({ error: 'Failed to save availability' });
  }
});

// Get course schedule for an employee
app.get('/api/course-schedule/:employeeName', async (req, res) => {
  const { employeeName } = req.params;
  try {
    const [employees] = await db.query('SELECT employee_id FROM Employee WHERE name = ?', [employeeName]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const empId = employees[0].employee_id;

    const [rows] = await db.query(
      `SELECT start_time, end_time, day_of_week, CourseName
       FROM CourseSchedule WHERE employee_id = ?`,
      [empId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get course schedule' });
  }
});

// Save course schedule for an employee
app.post('/api/course-schedule/:employeeName', async (req, res) => {
  const { employeeName } = req.params;
  const courses = req.body; // Array of { day_of_week, startTime, endTime, courseName }
  if (!Array.isArray(courses)) {
    return res.status(400).json({ error: 'Invalid course schedule data' });
  }

  try {
    // 1. Find employee_id
    const [employees] = await db.query('SELECT employee_id FROM Employee WHERE name = ?', [employeeName]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const empId = employees[0].employee_id;

    // Start transaction
    await db.query('START TRANSACTION');

    // Clean up existing course schedule entries for this employee
    await db.query('DELETE FROM CourseSchedule WHERE employee_id = ?', [empId]);

    // Insert new entries
    for (const course of courses) {
      // Map day name to ENUM: 'Mon','Tue','Wed','Thu','Fri','Sat','Sun'
      let dbDay = 'Mon';
      const d = course.day_of_week;
      if (d.includes('一') || d.includes('Mon') || d === '1') dbDay = 'Mon';
      else if (d.includes('二') || d.includes('Tue') || d === '2') dbDay = 'Tue';
      else if (d.includes('三') || d.includes('Wed') || d === '3') dbDay = 'Wed';
      else if (d.includes('四') || d.includes('Thu') || d === '4') dbDay = 'Thu';
      else if (d.includes('五') || d.includes('Fri') || d === '5') dbDay = 'Fri';
      else if (d.includes('六') || d.includes('Sat') || d === '6') dbDay = 'Sat';
      else if (d.includes('日') || d.includes('天') || d.includes('Sun') || d === '7' || d === '0') dbDay = 'Sun';

      // Format time string to HH:MM:00
      let startTime = course.startTime;
      if (startTime && startTime.length === 5) startTime += ':00';
      let endTime = course.endTime;
      if (endTime && endTime.length === 5) endTime += ':00';

      await db.query(
        `INSERT INTO CourseSchedule (employee_id, start_time, end_time, day_of_week, CourseName)
         VALUES (?, ?, ?, ?, ?)`,
        [empId, startTime, endTime, dbDay, course.courseName || null]
      );
    }

    await db.query('COMMIT');
    res.json({ message: 'Course schedule saved successfully' });
  } catch (error) {
    console.error(error);
    try { await db.query('ROLLBACK'); } catch (_) {}
    res.status(500).json({ error: 'Failed to save course schedule' });
  }
});


// ==========================================
// 3. Schedule API
// ==========================================

// Get current schedule
app.get('/api/schedule', async (req, res) => {
  const offset = parseInt(req.query.offset) !== undefined && !isNaN(parseInt(req.query.offset)) ? parseInt(req.query.offset) : 1;
  const { start, end } = getWeekRange(offset);
  try {
    // Fetch all schedule records for the specified week
    const [rows] = await db.query(
      `SELECT ws.Work_Schedule_ID, ws.Employee_num, DATE_FORMAT(ws.schedule_date, '%Y-%m-%d') as schedule_date,
              ws.start_time, ws.end_time, e.name AS employee_name
       FROM WorkSchedule ws
       JOIN Employee e ON ws.employee_id = e.employee_id
       WHERE ws.schedule_date BETWEEN ? AND ?`,
      [start, end]
    );

    // Format schedule into frontend structure: { "rowIdx-colIdx": [name1, name2] }
    const schedule = {};

    rows.forEach(item => {
      // Find col index from date
      const colIdx = getDayColIdxFromDate(item.schedule_date);
      
      // Find row index from start_time
      const startTimeStr = item.start_time; // format like "08:00:00"
      const rowIdx = TIME_SLOTS.findIndex(slot => slot.start === startTimeStr);

      if (colIdx !== -1 && rowIdx !== -1) {
        const key = `${rowIdx}-${colIdx}`;
        if (!schedule[key]) {
          schedule[key] = [];
        }
        if (!schedule[key].includes(item.employee_name)) {
          schedule[key].push(item.employee_name);
        }
      }
    });

    res.json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

// Save current schedule and automatically calculate/save PayRecords in database
app.post('/api/schedule/save', async (req, res) => {
  let schedule = req.body;
  let clientOffset = 1;
  if (req.body && req.body.schedule) {
    schedule = req.body.schedule;
    if (req.body.offset !== undefined) {
      clientOffset = parseInt(req.body.offset);
    }
  }
  
  if (clientOffset <= 0) {
    return res.status(403).json({ error: '本週與過去週次的班表為固定狀態，無法修改！' });
  }

  const { start, end, mondayDate } = getWeekRange(clientOffset);
  
  try {
    // 1. Get all employees mapping name -> { id, level, hourly_wage }
    const [employees] = await db.query("SELECT employee_id, name, level, hourly_wage FROM Employee WHERE level != 'manager'");
    const empMap = {};
    employees.forEach(emp => {
      empMap[emp.name] = { id: emp.employee_id, level: emp.level, hourly_wage: emp.hourly_wage };
    });

    // Start a transaction to ensure all operations succeed together
    await db.query('START TRANSACTION');

    // 2. Find existing WorkSchedule IDs for the active week
    const [existingWS] = await db.query(
      "SELECT Work_Schedule_ID FROM WorkSchedule WHERE schedule_date BETWEEN ? AND ?",
      [start, end]
    );
    const wsIds = existingWS.map(row => row.Work_Schedule_ID);

    if (wsIds.length > 0) {
      // Clear associated PayRecord rows first to respect foreign key constraint
      await db.query("DELETE FROM PayRecord WHERE Work_Schedule_ID IN (?)", [wsIds]);
    }

    // 3. Clear existing schedule for the week
    await db.query(
      "DELETE FROM WorkSchedule WHERE schedule_date BETWEEN ? AND ?",
      [start, end]
    );

    // 4. Insert new schedule records & calculate pay records
    for (const [key, names] of Object.entries(schedule)) {
      if (!Array.isArray(names) || names.length === 0) continue;

      const [rowStr, colStr] = key.split('-');
      const rowIdx = parseInt(rowStr);
      const colIdx = parseInt(colStr);

      if (isNaN(rowIdx) || isNaN(colIdx)) continue;

      const timeSlot = TIME_SLOTS[rowIdx];
      if (!timeSlot) continue;

      const targetDate = new Date(mondayDate);
      targetDate.setDate(mondayDate.getDate() + colIdx);
      const dateStr = formatLocalDate(targetDate);

      for (const name of names) {
        const emp = empMap[name];
        if (!emp) {
          console.warn(`Employee name not found in db: ${name}`);
          continue;
        }

        // Insert into WorkSchedule
        const [wsResult] = await db.query(
          `INSERT INTO WorkSchedule (employee_id, Employee_num, schedule_date, start_time, end_time)
           VALUES (?, ?, ?, ?, ?)`,
          [emp.id, names.length, dateStr, timeSlot.start, timeSlot.end]
        );
        const newWsId = wsResult.insertId;

        // Calculate pay record based on individual employee's hourly wage
        const wagePerHour = emp.hourly_wage || 200;
        const workHours = 2.0; // Each time slot represents 2 hours
        const totalWage = wagePerHour * workHours;

        // Insert into PayRecord
        await db.query(
          `INSERT INTO PayRecord (Work_Schedule_ID, Employee_ID, wage, work_hour, wage_per_hour)
           VALUES (?, ?, ?, ?, ?)`,
          [newWsId, emp.id, totalWage, workHours, wagePerHour]
        );
      }
    }

    await db.query('COMMIT');
    res.json({ message: 'Schedule and PayRecords saved successfully' });
  } catch (error) {
    console.error(error);
    try {
      await db.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Rollback failed:', rbErr);
    }
    res.status(500).json({ error: 'Failed to save schedule and pay records' });
  }
});



// Get pay records aggregated per employee for the specified week
app.get('/api/pay-records', async (req, res) => {
  const offset = parseInt(req.query.offset) !== undefined && !isNaN(parseInt(req.query.offset)) ? parseInt(req.query.offset) : 1;
  const { start, end } = getWeekRange(offset);
  try {
    const [rows] = await db.query(
      `SELECT e.employee_id AS id, e.name, e.level, SUM(pr.work_hour) AS hours, e.hourly_wage AS rate, SUM(pr.wage) AS total
       FROM PayRecord pr
       JOIN Employee e ON pr.Employee_ID = e.employee_id
       JOIN WorkSchedule ws ON pr.Work_Schedule_ID = ws.Work_Schedule_ID
       WHERE ws.schedule_date BETWEEN ? AND ?
       GROUP BY e.employee_id, e.name, e.level, e.hourly_wage`,
      [start, end]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get pay records' });
  }
});

// Get settings configuration
app.get('/api/settings', async (req, res) => {
  res.json(await getSettingsFromDb());
});

// Get dynamic week range
app.get('/api/active-week', (req, res) => {
  const offset = parseInt(req.query.offset) !== undefined && !isNaN(parseInt(req.query.offset)) ? parseInt(req.query.offset) : 1;
  const { start, end } = getWeekRange(offset);
  res.json({
    start,
    end
  });
});

// Update settings configuration and sync employee wages
app.post('/api/settings', async (req, res) => {
  const { wages, staffing, constraints } = req.body;
  try {
    const queries = [];
    if (wages) {
      if (wages.junior !== undefined) queries.push(['wages_junior', wages.junior.toString()]);
      if (wages.senior !== undefined) queries.push(['wages_senior', wages.senior.toString()]);
    }
    if (staffing) {
      if (Array.isArray(staffing)) {
        staffing.forEach((val, idx) => {
          if (idx >= 0 && idx < 8) {
            queries.push([`staffing_slot_${idx}`, val.toString()]);
          }
        });
      } else {
        if (staffing.morning !== undefined) queries.push(['staffing_morning', staffing.morning.toString()]);
        if (staffing.afternoon !== undefined) queries.push(['staffing_afternoon', staffing.afternoon.toString()]);
        if (staffing.evening !== undefined) queries.push(['staffing_evening', staffing.evening.toString()]);
      }
    }
    if (constraints) {
      if (constraints.maxHours !== undefined) queries.push(['constraints_maxHours', constraints.maxHours.toString()]);
      if (constraints.consecutiveShiftsAllowed !== undefined) queries.push(['constraints_consecutiveShiftsAllowed', constraints.consecutiveShiftsAllowed.toString()]);
      if (constraints.seniorRequiredPerShift !== undefined) queries.push(['constraints_seniorRequiredPerShift', constraints.seniorRequiredPerShift.toString()]);
    }

    // Start a transaction to ensure atomic updates
    await db.query('START TRANSACTION');
    for (const [key, val] of queries) {
      await db.query(
        `INSERT INTO ScheduleSource (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [key, val, val]
      );
    }

    // Sync settings wages to all employees of the respective levels
    if (wages) {
      const { junior, senior } = wages;
      if (junior !== undefined) {
        await db.query("UPDATE Employee SET hourly_wage = ? WHERE level = 'junior'", [junior]);
      }
      if (senior !== undefined) {
        await db.query("UPDATE Employee SET hourly_wage = ? WHERE level = 'senior'", [senior]);
      }
    }
    await db.query('COMMIT');

    // Also update settings.json as a cache/backup so nothing else breaks
    try {
      fs.writeFileSync(settingsFilePath, JSON.stringify(req.body, null, 2), 'utf8');
    } catch (fsErr) {
      console.error('Failed to write settings cache file', fsErr);
    }

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Failed to save settings:', error);
    try {
      await db.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Rollback failed:', rbErr);
    }
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ==========================================
// 4. Swap Request API
// ==========================================

const DAYS_TW = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

const getShiftLabel = (dateStr, start, end) => {
  const date = new Date(dateStr);
  const dayOfWeek = DAYS_TW[date.getDay()];
  const startFormatted = start.substring(0, 5);
  const endFormatted = end.substring(0, 5);
  return `${dayOfWeek} ${startFormatted} - ${endFormatted}`;
};

// Get all swap requests (only showing swaps for current week onwards)
app.get('/api/swaps', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sr.request_ID AS id, req.name AS requester, rec.name AS helper, sr.status, sr.reason,
              DATE_FORMAT(ws.schedule_date, '%Y-%m-%d') AS schedule_date, ws.start_time, ws.end_time
       FROM swapRequest sr
       JOIN Employee req ON sr.request_EID = req.employee_id
       LEFT JOIN Employee rec ON sr.receive_EID = rec.employee_id
       JOIN WorkSchedule ws ON sr.request_target = ws.Work_Schedule_ID
       WHERE ws.schedule_date >= ?`,
      [getCurrentMondayStr()]
    );

    const formatted = rows.map(row => ({
      id: row.id,
      requester: row.requester,
      helper: row.helper,
      status: row.status,
      reason: row.reason,
      shift: getShiftLabel(row.schedule_date, row.start_time, row.end_time)
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch swap requests' });
  }
});

// Create a swap request
app.post('/api/swaps', async (req, res) => {
  const { requesterName, rowIdx, colIdx, reason } = req.body;
  if (!requesterName || rowIdx === undefined || colIdx === undefined || !reason) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const dateStr = getWeekDateString(colIdx);
  const timeSlot = TIME_SLOTS[rowIdx];
  if (!timeSlot) return res.status(400).json({ error: 'Invalid time slot' });

  try {
    // 1. Get employee ID
    const [employees] = await db.query('SELECT employee_id FROM Employee WHERE name = ?', [requesterName]);
    if (employees.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const empId = employees[0].employee_id;

    // 2. Find corresponding WorkSchedule ID
    const [schedule] = await db.query(
      `SELECT Work_Schedule_ID FROM WorkSchedule
       WHERE employee_id = ? AND schedule_date = ? AND start_time = ?`,
      [empId, dateStr, timeSlot.start]
    );
    if (schedule.length === 0) {
      return res.status(404).json({ error: 'Work schedule slot not found for this employee' });
    }
    const wsId = schedule[0].Work_Schedule_ID;

    // 3. Insert into swapRequest
    await db.query(
      `INSERT INTO swapRequest (request_EID, receive_EID, request_target, reason, status)
       VALUES (?, NULL, ?, ?, 'pending')`,
      [empId, wsId, reason]
    );

    res.status(201).json({ message: 'Swap request created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create swap request' });
  }
});

// Accept a swap request (helper accepts)
app.post('/api/swaps/accept', async (req, res) => {
  const { requestId, helperName } = req.body;
  if (!requestId || !helperName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 1. Get helper ID
    const [employees] = await db.query('SELECT employee_id FROM Employee WHERE name = ?', [helperName]);
    if (employees.length === 0) return res.status(404).json({ error: 'Helper not found' });
    const helperId = employees[0].employee_id;

    // 2. Update swapRequest
    await db.query(
      `UPDATE swapRequest SET receive_EID = ?, status = 'waiting_admin' WHERE request_ID = ?`,
      [helperId, requestId]
    );

    res.json({ message: 'Swap request accepted, waiting for admin approval' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept swap request' });
  }
});

// Approve swap request (admin approves -> updates schedule, pay record, and swap status)
app.post('/api/swaps/approve', async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

  try {
    // 1. Get swap request details
    const [requests] = await db.query(
      'SELECT request_target, receive_EID FROM swapRequest WHERE request_ID = ?',
      [requestId]
    );
    if (requests.length === 0) return res.status(404).json({ error: 'Swap request not found' });
    const { request_target: wsId, receive_EID: helperId } = requests[0];

    if (!helperId) return res.status(400).json({ error: 'No helper has accepted this request yet' });

    // 2. Get helper details for pay calculation
    const [helperDetails] = await db.query('SELECT hourly_wage FROM Employee WHERE employee_id = ?', [helperId]);
    if (helperDetails.length === 0) return res.status(404).json({ error: 'Helper employee details not found' });
    const hourlyWage = helperDetails[0].hourly_wage;

    // Start database transaction
    await db.query('START TRANSACTION');

    // 3. Update WorkSchedule assignee to helper
    await db.query(
      'UPDATE WorkSchedule SET employee_id = ? WHERE Work_Schedule_ID = ?',
      [helperId, wsId]
    );

    // 4. Update PayRecord assignee and recalculate wages
    const workHours = 2.0;
    const newWage = hourlyWage * workHours;
    await db.query(
      `UPDATE PayRecord 
       SET Employee_ID = ?, wage_per_hour = ?, wage = ? 
       WHERE Work_Schedule_ID = ?`,
      [helperId, hourlyWage, newWage, wsId]
    );

    // 5. Update swapRequest status
    await db.query(
      "UPDATE swapRequest SET status = 'approved' WHERE request_ID = ?",
      [requestId]
    );



    await db.query('COMMIT');
    res.json({ message: 'Swap request approved, schedule and pay records updated successfully' });
  } catch (error) {
    console.error(error);
    try {
      await db.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Rollback failed:', rbErr);
    }
    res.status(500).json({ error: 'Failed to approve swap request' });
  }
});

// Reject swap request
app.post('/api/swaps/reject', async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

  try {
    await db.query(
      "UPDATE swapRequest SET status = 'rejected' WHERE request_ID = ?",
      [requestId]
    );
    res.json({ message: 'Swap request rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject swap request' });
  }
});

async function runMigration() {
  try {
    // Ensure Availability.shift column is VARCHAR(50) instead of ENUM
    console.log('Ensuring Availability.shift column is VARCHAR(50)...');
    await db.query('ALTER TABLE Availability MODIFY COLUMN shift VARCHAR(50) NOT NULL');

    // Ensure Employee.level column supports 'manager'
    console.log("Ensuring Employee.level column supports 'manager'...");
    await db.query("ALTER TABLE Employee MODIFY COLUMN level ENUM('junior', 'senior', 'manager') DEFAULT 'junior'");

    // Check if employee IDs need to be reset to start from 1
    const [needsIdReset] = await db.query("SELECT COUNT(*) as count FROM Employee WHERE employee_id > 9");
    if (needsIdReset[0].count > 0) {
      console.log("Employee IDs are not starting from 1. Performing full database reset...");
      await db.query("SET FOREIGN_KEY_CHECKS = 0");
      await db.query("TRUNCATE TABLE swapRequest");
      await db.query("TRUNCATE TABLE PayRecord");
      await db.query("TRUNCATE TABLE WorkSchedule");
      await db.query("TRUNCATE TABLE Availability");
      await db.query("TRUNCATE TABLE CourseSchedule");
      await db.query("TRUNCATE TABLE Employee");
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
      console.log("Database tables truncated and AUTO_INCREMENT reset to 1.");
    }

    // Check if manager exists
    const [managers] = await db.query("SELECT COUNT(*) as count FROM Employee WHERE level = 'manager'");
    if (managers[0].count === 0) {
      console.log("Seeding default manager account into Employee table...");
      const hashedAdminPassword = await bcrypt.hash('admin', 10);
      await db.query(
        `INSERT INTO Employee (name, email, password, level, hourly_wage, join_date)
         VALUES ('管理員', 'admin@example.com', ?, 'manager', 0, '2025-01-01')`,
        [hashedAdminPassword]
      );
      console.log("Default manager account seeded successfully.");
    }

    // Check if we need to clean up legacy 3-character employee names
    const [legacyEmps] = await db.query(
      "SELECT COUNT(*) as count FROM Employee WHERE name IN ('張小明', '李美華', '王大衛', '陳志明', '林淑芬', '黃秀琴', '吳信宏', '蔡佳蓉')"
    );
    if (legacyEmps[0].count > 0) {
      console.log("Legacy 3-character employees detected. Performing database cleanup for renaming...");
      await db.query("DELETE FROM Employee WHERE level != 'manager'");
      console.log("Legacy employees and associated schedules cleared.");
    }

    // Check if we need to seed the default 8 employees
    const [employeesCount] = await db.query("SELECT COUNT(*) as count FROM Employee WHERE level != 'manager'");
    if (employeesCount[0].count === 0) {
      console.log("Seeding new 2-character employee list...");
      const hashedPassword = await bcrypt.hash('123456', 10);
      const defaultEmployees = [
        ['小明', 'ming@example.com', hashedPassword, 'senior', 220, '2025-01-15'],
        ['美華', 'hua@example.com', hashedPassword, 'junior', 200, '2025-02-10'],
        ['大衛', 'david@example.com', hashedPassword, 'senior', 220, '2025-03-05'],
        ['志明', 'chihming@example.com', hashedPassword, 'junior', 200, '2025-03-10'],
        ['淑芬', 'shufen@example.com', hashedPassword, 'junior', 200, '2025-03-12'],
        ['秀琴', 'hsiuchin@example.com', hashedPassword, 'senior', 220, '2025-03-15'],
        ['信宏', 'hsinhong@example.com', hashedPassword, 'junior', 200, '2025-03-18'],
        ['佳蓉', 'chiarung@example.com', hashedPassword, 'junior', 200, '2025-03-20']
      ];
      
      for (const emp of defaultEmployees) {
        await db.query(
          `INSERT INTO Employee (name, email, password, level, hourly_wage, join_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          emp
        );
      }
      console.log("New 2-character employees seeded successfully.");
      
      // Clear mock schedules to force re-seeding
      await db.query("DELETE FROM PayRecord");
      await db.query("DELETE FROM WorkSchedule");
      console.log("Mock schedules cleared to trigger fresh seed.");
    }

    const [rows] = await db.query('SELECT setting_key, setting_value FROM ScheduleSource');
    const keys = rows.map(r => r.setting_key);
    
    const hasLegacy = keys.includes('staffing_morning') || keys.includes('staffing_afternoon') || keys.includes('staffing_evening');
    const hasNew = keys.some(k => k.startsWith('staffing_slot_'));

    if (hasLegacy && !hasNew) {
      console.log('Migrating legacy staffing settings to 2-hour slot settings...');
      let morningVal = '2';
      let afternoonVal = '1';
      let eveningVal = '2';

      rows.forEach(r => {
        if (r.setting_key === 'staffing_morning') morningVal = r.setting_value;
        if (r.setting_key === 'staffing_afternoon') afternoonVal = r.setting_value;
        if (r.setting_key === 'staffing_evening') eveningVal = r.setting_value;
      });

      const slotValues = [
        morningVal,   // 08:00 - 10:00
        morningVal,   // 10:00 - 12:00
        afternoonVal, // 12:00 - 14:00
        afternoonVal, // 14:00 - 16:00
        afternoonVal, // 16:00 - 18:00
        eveningVal,   // 18:00 - 20:00
        eveningVal,   // 20:00 - 22:00
        eveningVal    // 22:00 - 00:00
      ];

      await db.query('START TRANSACTION');
      for (let i = 0; i < 8; i++) {
        await db.query(
          `INSERT INTO ScheduleSource (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
          [`staffing_slot_${i}`, slotValues[i], slotValues[i]]
        );
      }
      // Delete old keys
      await db.query(`DELETE FROM ScheduleSource WHERE setting_key IN ('staffing_morning', 'staffing_afternoon', 'staffing_evening')`);
      await db.query('COMMIT');
      console.log('Migration completed successfully.');
    }

    // Seed mock schedules for current week, previous week, and previous two weeks
    await seedMockScheduleForWeek(0);
    await seedMockScheduleForWeek(-1);
    await seedMockScheduleForWeek(-2);
  } catch (err) {
    console.error('Migration error:', err);
    try { await db.query('ROLLBACK'); } catch (_) {}
  }
}

runMigration().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });
}).catch(err => {
  console.error('Failed to run database migration on startup:', err);
  app.listen(port, () => {
    console.log(`Server is running on port: ${port} (migration failed)`);
  });
});
