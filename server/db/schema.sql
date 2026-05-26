-- Drop tables in order of dependencies
DROP TABLE IF EXISTS swapRequest;
DROP TABLE IF EXISTS PayRecord;
DROP TABLE IF EXISTS ScheduleSource;
DROP TABLE IF EXISTS WorkSchedule;
DROP TABLE IF EXISTS Availability;
DROP TABLE IF EXISTS CourseSchedule;
DROP TABLE IF EXISTS Employee;

-- Employee
CREATE TABLE IF NOT EXISTS Employee (
  employee_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  level ENUM('junior', 'senior') DEFAULT 'junior',
  hourly_wage INT NOT NULL DEFAULT 200,
  join_date DATE NOT NULL
);

-- CourseSchedule
CREATE TABLE IF NOT EXISTS CourseSchedule (
  CourseSchedule_ID INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_of_week ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  CourseName VARCHAR(100),
  FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE
);

-- Availability
CREATE TABLE IF NOT EXISTS Availability (
  Employee_ID INT NOT NULL,
  day_of_week ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  shift ENUM('morning','afternoon','evening') NOT NULL,
  status ENUM('available','unavailable') DEFAULT 'available',
  PRIMARY KEY (Employee_ID, day_of_week, shift),
  FOREIGN KEY (Employee_ID) REFERENCES Employee(employee_id) ON DELETE CASCADE
);

-- WorkSchedule
CREATE TABLE IF NOT EXISTS WorkSchedule (
  Work_Schedule_ID INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  Employee_num INT NOT NULL DEFAULT 1,
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) ON DELETE CASCADE
);

-- PayRecord
CREATE TABLE IF NOT EXISTS PayRecord (
  Pay_ID INT PRIMARY KEY AUTO_INCREMENT,
  Work_Schedule_ID INT NOT NULL,
  Employee_ID INT NOT NULL,
  wage DECIMAL(10,2) NOT NULL,
  work_hour DECIMAL(5,2) NOT NULL,
  wage_per_hour DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (Work_Schedule_ID) REFERENCES WorkSchedule(Work_Schedule_ID) ON DELETE CASCADE,
  FOREIGN KEY (Employee_ID) REFERENCES Employee(employee_id) ON DELETE CASCADE
);

-- swapRequest
CREATE TABLE IF NOT EXISTS swapRequest (
  request_ID INT PRIMARY KEY AUTO_INCREMENT,
  request_EID INT NOT NULL,
  receive_EID INT,
  request_target INT NOT NULL,
  request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  status ENUM('pending','waiting_admin','approved','rejected') DEFAULT 'pending',
  FOREIGN KEY (request_EID) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (receive_EID) REFERENCES Employee(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (request_target) REFERENCES WorkSchedule(Work_Schedule_ID) ON DELETE CASCADE
);

-- ScheduleSource (Stores Scheduling Constraints / System settings)
CREATE TABLE IF NOT EXISTS ScheduleSource (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
);
