import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowLeftRight, User, CheckCircle2, ChevronLeft, ChevronRight, Bell, Sparkles } from 'lucide-react';

export default function EmployeeDashboard() {
  const [currentUser, setCurrentUser] = useState('訪客');
  const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const timeSlots = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00', '20:00 - 22:00', '22:00 - 00:00'];

  const [schedule, setSchedule] = useState({});
  const [stats, setStats] = useState({ hours: 0, pay: 0 });
  const [isImpersonated, setIsImpersonated] = useState(false);

  useEffect(() => {
    // 1. Get logged in user
    const auth = JSON.parse(sessionStorage.getItem('auth_user') || '{"name": "訪客", "isImpersonated": false}');
    setCurrentUser(auth.name);
    setIsImpersonated(auth.isImpersonated);

    // 2. Load schedule
    const savedSchedule = JSON.parse(localStorage.getItem('current_schedule') || '{}');
    setSchedule(savedSchedule);

    // 3. Load employees to get level for pay calculation
    const employees = JSON.parse(localStorage.getItem('app_employees') || '[]');
    const userProfile = employees.find(e => e.name === auth.name);
    const rate = userProfile?.level === 'senior' ? 220 : 200;

    // 4. Calculate stats for this user
    let userHours = 0;
    Object.values(savedSchedule).forEach(emps => {
      if (emps.includes(auth.name)) userHours += 2;
    });

    setStats({
      hours: userHours,
      pay: userHours * rate
    });
  }, []);

  const handleSwapRequest = (day, time) => {
    const confirm = window.confirm(`您確定要針對「${day} ${time}」的班次發起換班申請嗎？`);
    if (confirm) {
      const reason = prompt('請輸入換班原因：');
      if (reason) {
        const swapReq = {
          id: Date.now(),
          requester: currentUser,
          shift: `${day} ${time}`,
          reason: reason,
          status: 'pending'
        };
        const existing = JSON.parse(localStorage.getItem('swap_requests') || '[]');
        localStorage.setItem('swap_requests', JSON.stringify([...existing, swapReq]));
        alert('換班申請已送出！');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-8 rounded-[40px] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 truncate max-w-[400px]">早安，{currentUser}！</h2>
          <p className="text-indigo-100 font-medium tracking-wide">本週您共有 <span className="text-white font-black underline underline-offset-4 decoration-amber-400">{stats.hours / 4} 個班次</span>，請確認您的行程安排。</p>
        </div>
        <div className="flex gap-4 relative z-10">
           <div className="bg-white/10 p-5 rounded-3xl text-center backdrop-blur-md border border-white/10 min-w-[130px]">
             <p className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">Your Hours</p>
             <p className="text-3xl font-black">{stats.hours}h</p>
           </div>
           <div className="bg-white/10 p-5 rounded-3xl text-center backdrop-blur-md border border-white/10 min-w-[130px]">
             <p className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">Est. Pay</p>
             <p className="text-3xl font-black">NT$ {stats.pay.toLocaleString()}</p>
           </div>
        </div>
        <Sparkles className="absolute -right-4 -bottom-4 text-white/5" size={200} />
      </div>

      {/* Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <Clock className="text-indigo-600" size={24} /> 全體班表 (本週)
          </h3>
          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-[0.2em]">High Performance</span>
        </div>

        <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[150px_repeat(7,1fr)] bg-slate-50/50">
                <div className="p-6"></div>
                {days.map(day => <div key={day} className="p-6 text-center font-black text-slate-800">{day}</div>)}
              </div>

              {timeSlots.map((time, rowIdx) => (
                <div key={time} className="grid grid-cols-[150px_repeat(7,1fr)] border-t border-gray-50">
                  <div className="p-6 bg-slate-50/20 border-r border-gray-50 flex items-center justify-center">
                    <span className="text-[11px] font-black text-slate-900">{time}</span>
                  </div>
                  {days.map((day, colIdx) => {
                    const key = `${rowIdx}-${colIdx}`;
                    const emps = schedule[key] || [];
                    const isMyShift = emps.includes(currentUser);

                    return (
                      <div key={key} className={`p-3 min-h-[140px] border-r border-gray-50 flex flex-col gap-2 transition-all ${isMyShift ? 'bg-indigo-600 shadow-inner' : 'bg-white hover:bg-indigo-50/20'}`}>
                        {emps.map(name => (
                          <div key={name} className={`flex items-center gap-2 px-2 py-2 rounded-xl text-[11px] font-bold ${isMyShift && name === currentUser ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                            <User size={12} /> {name}
                          </div>
                        ))}
                        {isMyShift && (
                          <button 
                            onClick={() => !isImpersonated && handleSwapRequest(day, time)}
                            disabled={isImpersonated}
                            className={`mt-auto py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${
                              isImpersonated
                                ? 'bg-indigo-400/50 text-white/50 cursor-not-allowed shadow-none'
                                : 'bg-white text-indigo-600 hover:scale-105 active:scale-95'
                            }`}
                          >
                            {isImpersonated ? '檢視中' : '申請換班'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
