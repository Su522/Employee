import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowLeftRight, User, CheckCircle2, ChevronLeft, ChevronRight, Bell, Sparkles } from 'lucide-react';

export default function EmployeeDashboard() {
  const [currentUser, setCurrentUser] = useState('訪客');
  const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const timeSlots = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00', '20:00 - 22:00', '22:00 - 00:00'];

  const [schedule, setSchedule] = useState({});
  const [sources, setSources] = useState({});
  const [stats, setStats] = useState({ hours: 0, pay: 0 });
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [viewMode, setViewMode] = useState('personal'); // 'personal' or 'all'
  const [activeWeek, setActiveWeek] = useState({ start: '', end: '' });

  useEffect(() => {
    const auth = JSON.parse(sessionStorage.getItem('auth_user') || '{"name": "訪客", "isImpersonated": false}');
    setCurrentUser(auth.name);
    setIsImpersonated(auth.isImpersonated);

    const loadDashboardData = async () => {
      try {
        // 1. Fetch schedule
        const schedRes = await fetch('/api/schedule');
        const schedData = await schedRes.json();
        setSchedule(schedData);

        // Fetch sources
        const sourcesRes = await fetch('/api/schedule/sources');
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json();
          setSources(sourcesData);
        }


        // 2. Fetch employees to calculate pay
        const empRes = await fetch('/api/employees');
        const empData = await empRes.json();

        const userProfile = empData.find(e => e.name === auth.name);
        const rate = userProfile?.hourlyWage || (userProfile?.level === 'senior' ? 220 : 200);

        // 3. Calculate hours and pay
        let userHours = 0;
        Object.values(schedData).forEach(emps => {
          if (emps.includes(auth.name)) userHours += 2;
        });

        setStats({
          hours: userHours,
          pay: userHours * rate
        });

        // 4. Fetch active week dates
        const weekRes = await fetch('/api/active-week');
        if (weekRes.ok) {
          const weekData = await weekRes.json();
          setActiveWeek({
            start: weekData.start.replace(/-/g, '/'),
            end: weekData.end.substring(5).replace(/-/g, '/')
          });
        }
      } catch (err) {
        console.error('Failed to load employee dashboard data', err);
      }
    };

    loadDashboardData();
  }, []);

  const handleSwapRequest = async (rowIdx, colIdx, day, time) => {
    const confirm = window.confirm(`您確定要針對「${day} ${time}」的班次發起換班申請嗎？`);
    if (confirm) {
      const reason = prompt('請輸入換班原因：');
      if (reason) {
        try {
          const res = await fetch('/api/swaps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requesterName: currentUser,
              rowIdx,
              colIdx,
              reason
            })
          });
          if (res.ok) {
            alert('換班申請已送出！');
          } else {
            const data = await res.json();
            alert(`換班申請失敗：${data.error || '未知錯誤'}`);
          }
        } catch (err) {
          console.error(err);
          alert('連線失敗，請稍後再試。');
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-8 rounded-[40px] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 truncate max-w-[400px]">早安，{currentUser}！</h2>
          <p className="text-indigo-100 font-medium tracking-wide">本週 ({activeWeek.start} - {activeWeek.end}) 您共有 <span className="text-white font-black underline underline-offset-4 decoration-amber-400">{stats.hours / 2} 個班次</span>，請確認您的行程安排。</p>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <Clock className="text-indigo-600" size={24} /> 
            {viewMode === 'personal' ? '個人排班表 (本週)' : '全體排班表 (本週)'}
          </h3>
          <div className="bg-black/5 p-1 rounded-2xl flex border border-black/5 backdrop-blur-md">
            <button 
              onClick={() => setViewMode('personal')}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${viewMode === 'personal' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              個人班表
            </button>
            <button 
              onClick={() => setViewMode('all')}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${viewMode === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              全體班表
            </button>
          </div>
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

                    if (viewMode === 'personal' && !isMyShift) {
                      return (
                        <div key={key} className="p-3 min-h-[140px] border-r border-gray-50 bg-slate-50/10 flex items-center justify-center">
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">無排班</span>
                        </div>
                      );
                    }

                    const source = sources[key];
                    return (
                      <div key={key} className={`p-3 min-h-[140px] border-r border-gray-50 flex flex-col gap-2 transition-all ${isMyShift ? 'bg-indigo-600 shadow-inner' : 'bg-white hover:bg-indigo-50/20'}`}>
                        {emps.length > 0 && source && (
                          <span className={`self-start text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                            isMyShift
                              ? 'bg-white/25 text-white border-white/20'
                              : source === 'auto' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                source === 'swap' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {source === 'auto' ? '系統自動' : source === 'swap' ? '換班代班' : '手動微調'}
                          </span>
                        )}
                        {emps.map(name => (
                          <div key={name} className={`flex items-center gap-2 px-2 py-2 rounded-xl text-[11px] font-bold ${isMyShift && name === currentUser ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                            <User size={12} /> {name}
                          </div>
                        ))}
                        {isMyShift && (
                          <button 
                            onClick={() => !isImpersonated && handleSwapRequest(rowIdx, colIdx, day, time)}
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
