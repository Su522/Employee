import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, ShieldCheck, UserCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, password })
      });
      
      if (res.ok) {
        const userInfo = await res.json();
        sessionStorage.setItem('auth_user', JSON.stringify(userInfo));
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/employee');
        }
      } else {
        const errData = await res.json();
        alert(errData.error || '登入失敗，請確認帳號密碼！');
      }
    } catch (err) {
      console.error('Failed to validate login:', err);
      alert('系統連線失敗，請稍後再試。');
    }
  };

  // Dynamic Theme Colors
  const theme = role === 'admin' 
    ? {
        bg: 'from-slate-900 via-indigo-950 to-slate-900',
        primary: 'bg-indigo-600',
        accent: 'text-indigo-400',
        ring: 'focus:ring-indigo-500',
        iconBg: 'bg-indigo-600',
        button: 'hover:bg-indigo-50'
      }
    : {
        bg: 'from-emerald-950 via-teal-900 to-slate-900',
        primary: 'bg-emerald-500',
        accent: 'text-emerald-400',
        ring: 'focus:ring-emerald-500',
        iconBg: 'bg-emerald-500',
        button: 'hover:bg-emerald-50'
      };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${theme.bg} p-4 transition-all duration-700 ease-in-out`}>
      <div className="w-full max-w-md bg-white/10 backdrop-blur-3xl rounded-[48px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 relative group">
        
        {/* Decorative elements */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 ${theme.primary} rounded-full blur-[80px] opacity-20 transition-all duration-700`}></div>
        <div className={`absolute -bottom-20 -left-20 w-40 h-40 ${theme.primary} rounded-full blur-[80px] opacity-20 transition-all duration-700`}></div>

        <div className="p-10 relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className={`w-20 h-20 ${theme.iconBg} rounded-[28px] flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 transform group-hover:scale-105`}>
              {role === 'admin' ? <ShieldCheck className="w-10 h-10 text-white" /> : <Sparkles className="w-10 h-10 text-white" />}
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">AutoSched</h1>
            <p className="text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">
              {role === 'admin' ? '管理系統端登入' : '員工個人專區登入'}
            </p>
          </div>

          {/* Role Switcher */}
          <div className="bg-black/20 p-1.5 rounded-2xl flex mb-10 border border-white/5 backdrop-blur-md">
            <button 
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs transition-all duration-500 ${role === 'admin' ? 'bg-white text-slate-900 shadow-xl scale-100' : 'text-slate-400 hover:text-white'}`}
            >
              <ShieldCheck size={16} /> 管理者模式
            </button>
            <button 
              type="button"
              onClick={() => setRole('employee')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs transition-all duration-500 ${role === 'employee' ? 'bg-white text-slate-900 shadow-xl scale-100' : 'text-slate-400 hover:text-white'}`}
            >
              <UserCircle size={16} /> 員工模式
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group/input">
              <User className={`absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:${theme.accent} transition-colors`} size={20} />
              <input
                type="text"
                placeholder="輸入您的真實姓名"
                className={`w-full bg-black/20 border border-white/10 rounded-2xl py-4.5 pl-14 pr-5 text-white focus:outline-none focus:ring-2 ${theme.ring} transition-all font-bold placeholder:text-slate-600`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="relative group/input">
              <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:${theme.accent} transition-colors`} size={20} />
              <input
                type="password"
                placeholder="密碼"
                className={`w-full bg-black/20 border border-white/10 rounded-2xl py-4.5 pl-14 pr-5 text-white focus:outline-none focus:ring-2 ${theme.ring} transition-all font-bold placeholder:text-slate-600`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className={`w-full ${theme.primary} text-white font-black py-4.5 rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 group/btn mt-6 active:scale-95`}
            >
              <span className="text-sm tracking-widest uppercase">進入系統</span>
              <LogIn size={20} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
        
        <div className="bg-black/20 p-5 text-center border-t border-white/5 backdrop-blur-md">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
             {role === 'admin' ? 'Security Enforcement Enabled' : 'Welcome back to your workspace'}
          </p>
        </div>
      </div>
    </div>
  );
}
