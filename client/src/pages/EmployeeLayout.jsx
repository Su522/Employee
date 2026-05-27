import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeftRight, LogOut, Bell, UserCircle, CheckSquare, ShieldCheck, Lock, X } from 'lucide-react';

export default function EmployeeLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get dynamic user from session
  const authUser = JSON.parse(sessionStorage.getItem('auth_user') || '{"name": "訪客", "role": "employee", "isImpersonated": false}');
  const currentUser = authUser.name;
  const isImpersonated = authUser.isImpersonated;

  // Password Modification State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      alert('修改失敗：新密碼與確認新密碼輸入不一致！');
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser,
          currentPassword,
          newPassword
        })
      });

      if (res.ok) {
        alert('密碼修改成功！請以新密碼重新登入。');
        setShowPasswordModal(false);
        sessionStorage.removeItem('auth_user');
        navigate('/login');
      } else {
        const data = await res.json();
        alert(data.error || '密碼修改失敗，請稍後再試。');
      }
    } catch (err) {
      console.error(err);
      alert('連線失敗，請稍後再試。');
    } finally {
      setIsChanging(false);
    }
  };

  const menuItems = [
    { path: '/employee/dashboard', label: '我的班表', icon: <Calendar size={20} /> },
    { path: '/employee/availability', label: '時段設定', icon: <CheckSquare size={20} /> },
    { path: '/employee/swaps', label: '換班中心', icon: <ArrowLeftRight size={20} /> },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('auth_user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-indigo-950 text-white flex flex-col shadow-2xl z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
              <UserCircle className="text-indigo-400" size={24} />
            </div>
            <h2 className="text-xl font-black tracking-tight">員工專區</h2>
          </div>
          <p className="text-indigo-300/50 text-[10px] font-bold uppercase tracking-[0.2em] ml-1">Personalized Session</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${
                location.pathname === item.path
                  ? 'bg-white text-indigo-950 shadow-xl shadow-white/10'
                  : 'text-indigo-200/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                {item.icon}
              </span>
              <span className="font-bold">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="bg-white/5 p-5 rounded-[24px] mb-4 border border-white/5 shadow-inner">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">目前使用者</p>
            <p className="text-base font-black text-white truncate">{currentUser}</p>
          </div>
          {!isImpersonated && (
            <button 
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordModal(true);
              }}
              className="flex items-center gap-3 px-4 py-3 w-full text-indigo-300/60 hover:text-white hover:bg-white/5 rounded-xl transition-all group font-bold mb-1"
            >
              <Lock size={20} className="group-hover:rotate-12 transition-transform" />
              <span>修改密碼</span>
            </button>
          )}
          {isImpersonated && (
            <button 
              onClick={() => {
                sessionStorage.setItem('auth_user', JSON.stringify({ name: '管理員', role: 'admin' }));
                window.location.href = '/admin';
              }}
              className="flex items-center gap-3 px-4 py-3 w-full text-indigo-300/60 hover:text-amber-400 hover:bg-amber-400/5 rounded-xl transition-all group font-bold mb-1"
            >
              <ShieldCheck size={20} className="group-hover:rotate-12 transition-transform" />
              <span>切換為管理者</span>
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-indigo-300/60 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all group font-bold"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>登出系統</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {isImpersonated && (
          <div className="bg-amber-500 text-white px-8 py-2 flex justify-between items-center shadow-lg z-30 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
              <ShieldCheck size={14} /> 唯讀模式：目前以管理員身分檢視中
            </div>
            <button 
              onClick={() => {
                sessionStorage.setItem('auth_user', JSON.stringify({ name: '管理員', role: 'admin' }));
                window.location.href = '/admin';
              }}
              className="bg-white text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black hover:bg-amber-50 transition-all shadow-sm"
            >
              一鍵返回後台
            </button>
          </div>
        )}
        <header className="bg-white/70 backdrop-blur-xl border-b border-gray-100 px-8 py-5 flex justify-between items-center z-10">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {menuItems.find(item => item.path === location.pathname)?.label || '個人中心'}
          </h1>
          <div className="flex items-center gap-6">
             <div className="bg-indigo-50 px-4 py-2 rounded-xl flex items-center gap-3 border border-indigo-100">
               <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
               <span className="text-xs font-black text-indigo-600 tracking-widest uppercase">Online Now</span>
             </div>
             <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 hover:text-indigo-600 transition-colors cursor-pointer">
               <Bell size={20} />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)}></div>
          <form onSubmit={handleChangePassword} className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-black text-slate-900">修改登入密碼</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">使用者姓名：{currentUser}</p>
               </div>
               <button type="button" onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">舊密碼</label>
                <input 
                  required
                  type="password"
                  placeholder="輸入目前的密碼"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4.5 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">新密碼</label>
                <input 
                  required
                  type="password"
                  placeholder="輸入新的密碼"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4.5 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">確認新密碼</label>
                <input 
                  required
                  type="password"
                  placeholder="再次輸入新密碼"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4.5 px-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit"
                disabled={isChanging}
                className="w-full bg-indigo-600 text-white py-4.5 rounded-[24px] font-black shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 mt-4"
              >
                {isChanging ? '處理中...' : '確認修改密碼'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
