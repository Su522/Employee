import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, Edit2, Trash2, X, UserCircle } from 'lucide-react';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Employee Form State
  const [newEmp, setNewEmp] = useState({ name: '', email: '', password: '', level: 'junior', hourlyWage: 200 });
  const [wagesConfig, setWagesConfig] = useState({ junior: 200, senior: 220 });
  
  // Editing Employee State
  const [editingEmp, setEditingEmp] = useState(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.wages) {
        setWagesConfig(data.wages);
        // Pre-populate default junior wage for new employees
        setNewEmp(prev => ({ ...prev, hourlyWage: data.wages.junior }));
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchEmployees();
      fetchSettings();
    });
  }, [fetchEmployees, fetchSettings]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.email || !newEmp.password) return;

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp)
      });
      if (!res.ok) throw new Error('Failed to save employee');
      const savedEmployee = await res.json();
      setEmployees([...employees, savedEmployee]);
      setNewEmp({ name: '', email: '', password: '', level: 'junior', hourlyWage: wagesConfig.junior });
      setShowAddModal(false);
      alert(`員工 ${savedEmployee.name} 已成功加入系統！`);
    } catch (err) {
      console.error(err);
      alert('新增員工失敗，請稍後再試！');
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmp.name || !editingEmp.email) return;

    try {
      const res = await fetch(`/api/employees/${editingEmp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEmp)
      });
      if (!res.ok) throw new Error('Failed to update employee');
      const updated = await res.json();
      setEmployees(employees.map(e => e.id === updated.id ? { ...e, ...updated } : e));
      setShowEditModal(false);
      alert(`員工 ${updated.name} 的資料已成功更新！`);
    } catch (err) {
      console.error(err);
      alert('更新員工失敗，請稍後再試！');
    }
  };

  const openEditModal = (emp) => {
    setEditingEmp({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      password: '',
      level: emp.level,
      hourlyWage: emp.hourlyWage || 200
    });
    setShowEditModal(true);
  };

  const deleteEmployee = async (id, name) => {
    if (window.confirm(`確定要刪除員工 ${name} 嗎？這將會同步移除其在班表中的所有班次。`)) {
      try {
        const res = await fetch(`/api/employees/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete employee');
        setEmployees(employees.filter(e => e.id !== id));
        alert('員工資料已成功刪除。');
      } catch (err) {
        console.error(err);
        alert('刪除員工失敗，請稍後再試！');
      }
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
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">每小時時薪</th>
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
                <td className="px-8 py-5 font-bold text-slate-700">
                  NT$ {emp.hourlyWage || 200} 元 / 小時
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => openEditModal(emp)} 
                      title="編輯員工"
                      className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
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

      {/* Add Employee Modal */}
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
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">登入密碼</label>
                <input 
                  required
                  type="password" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500 font-bold" 
                  placeholder="設定登入密碼" 
                  value={newEmp.password}
                  onChange={e => setNewEmp({...newEmp, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">時薪費率 (NT$)</label>
                <input 
                  required
                  type="number" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500 font-bold" 
                  placeholder="200" 
                  value={newEmp.hourlyWage}
                  onChange={e => setNewEmp({...newEmp, hourlyWage: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">能力階級</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setNewEmp({...newEmp, level: 'junior', hourlyWage: wagesConfig.junior})}
                    className={`py-4 rounded-2xl font-black transition-all border-2 ${newEmp.level === 'junior' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}`}
                  >
                    初級 Junior
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewEmp({...newEmp, level: 'senior', hourlyWage: wagesConfig.senior})}
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

      {/* Edit Employee Modal */}
      {showEditModal && editingEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditEmployee} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">編輯員工資料</h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
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
                  value={editingEmp.name}
                  onChange={e => setEditingEmp({...editingEmp, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">電子郵件</label>
                <input 
                  required
                  type="email" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500 font-bold" 
                  placeholder="example@mail.com" 
                  value={editingEmp.email}
                  onChange={e => setEditingEmp({...editingEmp, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">登入密碼 (留空表示不修改)</label>
                <input 
                  type="password" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500 font-bold" 
                  placeholder="輸入新密碼以進行修改" 
                  value={editingEmp.password || ''}
                  onChange={e => setEditingEmp({...editingEmp, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">每小時時薪 (NT$)</label>
                <input 
                  required
                  type="number" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-indigo-500 font-bold" 
                  value={editingEmp.hourlyWage}
                  onChange={e => setEditingEmp({...editingEmp, hourlyWage: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">能力階級</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditingEmp({...editingEmp, level: 'junior'})}
                    className={`py-4 rounded-2xl font-black transition-all border-2 ${editingEmp.level === 'junior' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}`}
                  >
                    初級 Junior
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingEmp({...editingEmp, level: 'senior'})}
                    className={`py-4 rounded-2xl font-black transition-all border-2 ${editingEmp.level === 'senior' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}`}
                  >
                    資深 Senior
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all mt-4">
                確認更新資料
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
