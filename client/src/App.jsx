import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import AvailabilitySetting from './pages/AvailabilitySetting';
import ScheduleManagement from './pages/ScheduleManagement';
import PayRecord from './pages/PayRecord';
import SwapRequest from './pages/SwapRequest';
import SwapApproval from './pages/SwapApproval';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeLayout from './pages/EmployeeLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<Navigate to="employees" replace />} />
          <Route path="employees" element={<EmployeeManagement />} />
          <Route path="schedule" element={<ScheduleManagement />} />
          <Route path="pay" element={<PayRecord />} />
          <Route path="swaps" element={<SwapApproval />} />
        </Route>

        {/* Employee Routes */}
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="availability" element={<AvailabilitySetting />} />
          <Route path="swaps" element={<SwapRequest />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
