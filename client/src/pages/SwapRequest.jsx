import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Calendar, User, Clock, Check, Send, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export default function SwapRequest() {
  const auth = JSON.parse(sessionStorage.getItem('auth_user') || '{"name": "訪客", "isImpersonated": false}');
  const currentUser = auth.name;
  const isImpersonated = auth.isImpersonated;

  const [myShifts, setMyShifts] = useState([]);
  const [swapRequests, setSwapRequests] = useState(() => {
    const saved = localStorage.getItem('swap_requests');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const savedSchedule = localStorage.getItem('current_schedule');
    const schedule = savedSchedule ? JSON.parse(savedSchedule) : {};
    const shifts = [];
    
    const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    const times = ['08:00 - 12:00', '12:00 - 16:00', '16:00 - 20:00', '20:00 - 00:00'];

    Object.entries(schedule).forEach(([key, emps]) => {
      if (emps.includes(currentUser)) {
        const [row, col] = key.split('-');
        shifts.push({ key, label: `${days[col]} ${times[row]}` });
      }
    });
    setMyShifts(shifts);
  }, [currentUser]);

  const handleCreateRequest = (shift) => {
    const reason = prompt('請輸入換班原因：');
    if (reason) {
      const newRequest = {
        id: Date.now(),
        requester: currentUser,
        helper: null, // To be filled by another employee
        shift: shift.label,
        reason,
        status: 'pending'
      };
      const updated = [...swapRequests, newRequest];
      setSwapRequests(updated);
      localStorage.setItem('swap_requests', JSON.stringify(updated));
      alert('需求已送出！請等待同事響應。');
    }
  };

  const handleHelpRequest = (id) => {
    const updated = swapRequests.map(req => {
      if (req.id === id) {
        if (req.requester === currentUser) {
          alert('您不能幫自己代班喔！');
          return req;
        }
        alert(`您已接受 ${req.requester} 的代班請求，將提交給管理員審核！`);
        return { ...req, helper: currentUser, status: 'waiting_admin' };
      }
      return req;
    });
    setSwapRequests(updated);
    localStorage.setItem('swap_requests', JSON.stringify(updated));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: My Shifts */}
        <div className="bg-white p-10 rounded-[40px] shadow-xl border border-gray-100 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
               <Calendar size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">我的目前班次</h2>
          </div>
          
          <div className="space-y-4 flex-1">
            {myShifts.map(shift => (
              <div key={shift.key} className="p-6 bg-slate-50/50 rounded-3xl border border-gray-100 flex justify-between items-center group hover:bg-indigo-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-500 shadow-sm transition-colors">
                    <Clock size={20} />
                  </div>
                  <span className="font-bold text-slate-700">{shift.label}</span>
                </div>
                <button 
                  onClick={() => !isImpersonated && handleCreateRequest(shift)}
                  disabled={isImpersonated}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black shadow-lg transition-all ${
                    isImpersonated
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:scale-105 active:scale-95'
                  }`}
                >
                  <ArrowLeftRight size={14} /> {isImpersonated ? '唯讀' : '申請換班'}
                </button>
              </div>
            ))}
            {myShifts.length === 0 && (
              <div className="py-20 text-center opacity-30 flex flex-col items-center">
                 <Calendar size={48} className="mb-4" />
                 <p className="font-bold text-slate-500">本週無排班</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Swap Board */}
        <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400 border border-white/5">
               <ArrowLeftRight size={24} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">換班佈告欄</h2>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {swapRequests.map(req => (
              <div key={req.id} className={`p-6 rounded-[32px] border flex flex-col gap-4 transition-all ${req.status === 'pending' ? 'bg-white/5 border-white/10 hover:bg-white/[0.08]' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
                      {req.requester[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-wide">{req.requester}</p>
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${req.status === 'pending' ? 'text-amber-400/70' : 'text-emerald-400'}`}>
                        {req.status === 'pending' ? '等待響應' : '已有人代班'}
                      </span>
                    </div>
                  </div>
                  {req.helper && (
                    <div className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                       <CheckCircle2 size={10} /> {req.helper} 代班中
                    </div>
                  )}
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">班次時段</p>
                  <p className="text-sm font-black text-white">{req.shift}</p>
                </div>
                <p className="text-xs text-slate-400 italic font-medium leading-relaxed">「{req.reason}」</p>
                
                {req.status === 'pending' && req.requester !== currentUser && (
                  <button 
                    onClick={() => !isImpersonated && handleHelpRequest(req.id)}
                    disabled={isImpersonated}
                    className={`w-full py-4 rounded-2xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 ${
                      isImpersonated
                        ? 'bg-white/10 text-white/30 cursor-not-allowed shadow-none'
                        : 'bg-white text-slate-900 hover:bg-indigo-50'
                    }`}
                  >
                     <Check size={14} /> {isImpersonated ? '唯讀模式' : '我可以代班'}
                  </button>
                )}
                
                {req.status === 'waiting_admin' && (
                  <div className="text-center py-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                     等待管理員最終審核
                  </div>
                )}
              </div>
            ))}
            {swapRequests.length === 0 && <p className="text-center text-slate-500 py-10">目前沒有換班需求</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
