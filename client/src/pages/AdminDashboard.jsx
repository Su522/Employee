import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Bell, DollarSign, ArrowLeftRight, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const menuItems = [
    { path: '/admin/employees', label: '員工管理', icon: <Users size={20} /> },
    { path: '/admin/schedule', label: '班表管理', icon: <Calendar size={20} /> },
    { path: '/admin/swaps', label: '換班審核', icon: <ArrowLeftRight size={20} /> },
    { path: '/admin/pay', label: '薪資紀錄', icon: <DollarSign size={20} /> },
    { path: '/admin/settings', label: '系統設定', icon: <Settings size={20} /> },
  ];

  useEffect(() => {
    const checkNotifications = async () => {
      const newNotifs = [];
      
      // 1. Check pending swaps
      try {
        const res = await fetch('/api/swaps');
        if (res.ok) {
          const swaps = await res.json();
          const pendingCount = swaps.filter(s => s.status === 'waiting_admin').length;
          if (pendingCount > 0) {
            newNotifs.push({
              id: 'swaps',
              type: 'alert',
              title: '換班申請待處理',
              message: `目前有 ${pendingCount} 筆已達成共識的換班申請等待您的核准。`,
              link: '/admin/swaps',
              icon: <ArrowLeftRight size={16} />
            });
          }
        }
      } catch (err) {
        console.error('Failed to check swaps for notifications:', err);
      }

      // 2. Check if it's Friday for scheduling reminder
      const today = new Date();
      if (today.getDay() === 5) {
        newNotifs.push({
          id: 'friday',
          type: 'reminder',
          title: '排班提醒',
          message: '今天是週五，別忘了為下週進行自動排班並儲存！',
          link: '/admin/schedule',
          icon: <Clock size={16} />
        });
      }

      setNotifications(newNotifs);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('auth_user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <h2 className="text-xl font-black tracking-tight">AutoSched</h2>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-indigo-400">管理中心 v2.0</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${
                location.pathname.startsWith(item.path)
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`${location.pathname.startsWith(item.path) ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                {item.icon}
              </span>
              <span className="font-bold">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl mb-4 border border-white/5 shadow-inner">
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center font-black text-white shadow-lg">
              A
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-black truncate">管理員帳號</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">System Admin</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all group font-bold"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>登出系統</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-8 py-5 flex justify-between items-center z-30">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {menuItems.find(item => location.pathname.startsWith(item.path))?.label || '儀表板概述'}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-3 rounded-2xl transition-all ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
              >
                <Bell size={22} />
                {notifications.length > 0 && (
                  <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-96 bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="p-6 bg-slate-50/50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">系統通知</h3>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{notifications.length} 則未讀</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? notifications.map(n => (
                      <button 
                        key={n.id}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate(n.link);
                        }}
                        className="w-full p-6 text-left hover:bg-indigo-50/30 transition-colors border-b border-gray-50 flex gap-4 group"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'alert' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                          {n.icon}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      </button>
                    )) : (
                      <div className="p-12 text-center">
                         <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                           <Bell size={24} />
                         </div>
                         <p className="text-slate-400 font-bold text-sm">目前沒有新通知</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50/50 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AutoSched Smart Notification System</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-8 w-[1px] bg-gray-100"></div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900">{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{new Date().toLocaleDateString('zh-TW', { weekday: 'long' })}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200">
                <Users size={20} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/30 relative">
          <div className="max-w-7xl mx-auto p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
