import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, Users, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

export default function PayRecord() {
  const [records, setRecords] = useState([]);
  
  useEffect(() => {
    // 1. Load data
    const savedSchedule = localStorage.getItem('current_schedule');
    const schedule = savedSchedule ? JSON.parse(savedSchedule) : {};
    
    const savedEmployees = localStorage.getItem('app_employees');
    const employees = savedEmployees ? JSON.parse(savedEmployees) : [];

    // 2. Create a map of employee level/rates
    const employeeData = {};
    employees.forEach(emp => {
      employeeData[emp.name] = {
        level: emp.level,
        rate: emp.level === 'senior' ? 220 : 200
      };
    });

    // 3. Calculate hours and pay
    const stats = {};
    
    Object.values(schedule).forEach(empList => {
      empList.forEach(name => {
        // Only calculate if employee exists in the system
        if (employeeData[name]) {
          if (!stats[name]) {
            stats[name] = { 
              hours: 0, 
              rate: employeeData[name].rate,
              level: employeeData[name].level 
            };
          }
          stats[name].hours += 2; // Each slot is 2 hours
        }
      });
    });

    const finalRecords = Object.keys(stats).map((name, index) => ({
      id: index + 1,
      name,
      level: stats[name].level,
      hours: stats[name].hours,
      rate: stats[name].rate,
      total: stats[name].hours * stats[name].rate,
      period: '2026/04/27 - 05/03'
    }));

    setRecords(finalRecords);
  }, []);

  const totalPayout = records.reduce((sum, rec) => sum + rec.total, 0);
  const totalHours = records.reduce((sum, rec) => sum + rec.hours, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-2">Total Payroll</p>
            <h3 className="text-4xl font-black">NT$ {totalPayout.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <TrendingUp size={14} />
              <span>薪資數據已根據最新員工名單更新</span>
            </div>
          </div>
          <DollarSign className="absolute -right-8 -bottom-8 text-white/5 group-hover:scale-110 transition-transform duration-500" size={180} />
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
            <Clock size={32} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total Working Hours</p>
            <h3 className="text-2xl font-black text-gray-900">{totalHours} <span className="text-xs text-gray-400">HRS</span></h3>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
            <Users size={32} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Active Staffs</p>
            <h3 className="text-2xl font-black text-gray-900">{records.length} <span className="text-xs text-gray-400">PEOPLE</span></h3>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/30">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">薪資結算報表</h2>
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold text-gray-500 flex items-center gap-2 shadow-sm">
             <Calendar size={14} /> 2026/04/27 - 05/03
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">員工</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">階級</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">總工時</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">應付薪資</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium">
              {records.map((rec) => (
                <tr key={rec.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
                        {rec.name[0]}
                      </div>
                      <span className="font-bold text-slate-900">{rec.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${rec.level === 'senior' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {rec.level}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-slate-600">{rec.hours} hrs</td>
                  <td className="px-8 py-6">
                    <span className="text-lg font-black text-indigo-600">NT$ {rec.total.toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-6 text-right text-[10px] font-black text-emerald-500 tracking-widest">
                    SYNCED
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <div className="p-24 text-center">
              <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">目前無排班資料，請先前往班表管理進行操作。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
