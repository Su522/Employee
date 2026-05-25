import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, ChevronRight, User, X, UserCircle } from 'lucide-react';

export default function EmployeeManagement() {
  // Load from localStorage
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('app_employees');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: '張小明', level: 'senior', email: 'ming@example.com', joinDate: '2025-01-15' },
      { id: 2, name: '李美華', level: 'junior', email: 'hua@example.com', joinDate: '2025-02-10' },
      { id: 3, name: '王大衛', level: 'senior', email: 'david@example.com', joinDate: '2025-03-05' },
    ];
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Employee Form State
  const [newEmp, setNewEmp] = useState({ name: '', email: '', level: 'junior' });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('app_employees', JSON.stringify(employees));
  }, [employees]);

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.email) return;

    const employee = {
      ...newEmp,
      id: Date.now(),
      joinDate: new Date().toISOString().split('T')[0]
    };

    setEmployees([...employees, employee]);
    setNewEmp({ name: '', email: '', level: 'junior' });
    setShowAddModal(false);
    alert(`員工 ${employee.name} 已成功加入系統！`);
  };

  const deleteEmployee = (id, name) => {
    if (window.confirm(`確定要刪除員工 ${name} 嗎？這將會同步移除其在班表中的所有班次。`)) {
      // 1. Remove from list
      const updated = employees.filter(e => e.id !== id);
      setEmployees(updated);
      localStorage.setItem('app_employees', JSON.stringify(updated));

      // 2. Clean up current schedule
      const savedSchedule = localStorage.getItem('current_schedule');
      if (savedSchedule) {
        const schedule = JSON.parse(savedSchedule);
        const newSchedule = {};
        Object.keys(schedule).forEach(key => {
          newSchedule[key] = schedule[key].filter(empName => empName !== name);
        });
        localStorage.setItem('current_schedule', JSON.stringify(newSchedule));
      }
      alert('員工資料與相關班次已同步刪除。');
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.includes(searchTerm) || e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋員工姓名或電子郵件..."
            className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 transition-all text-gray-600 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all font-bold"
        >
          <UserPlus size={20} />
          <span>新增員工</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">員工資訊</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">能力階級</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-indigo-50/20 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                      {emp.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    emp.level === 'senior' 
                      ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {emp.level === 'senior' ? '資深 Senior' : '初級 Junior'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        sessionStorage.setItem('auth_user', JSON.stringify({ name: emp.name, role: 'employee', isImpersonated: true }));
                        window.location.href = '/employee';
                      }} 
                      title="查看員工視角"
                      className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <UserCircle size={18} />
                    </button>
                    <button onClick={() => deleteEmployee(emp.id, emp.name)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEmployees.length === 0 && (
          <div className="p-20 text-center text-gray-300 font-bold">查無符合條件的員工</div>
        )}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddEmployee} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">新增員工</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">員工姓名</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500 font-bold" 
                  placeholder="請輸入姓名" 
                  value={newEmp.name}
                  onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">電子郵件</label>
                <input 
                  required
                  type="email" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500 font-bold" 
                  placeholder="example@mail.com" 
                  value={newEmp.email}
                  onChange={e => setNewEmp({...newEmp, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">能力階級</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setNewEmp({...newEmp, level: 'junior'})}
                    className={`py-4 rounded-2xl font-black transition-all border-2 ${newEmp.level === 'junior' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}`}
                  >
                    初級 Junior
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewEmp({...newEmp, level: 'senior'})}
                    className={`py-4 rounded-2xl font-black transition-all border-2 ${newEmp.level === 'senior' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}`}
                  >
                    資深 Senior
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all mt-4">
                確認新增員工
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
