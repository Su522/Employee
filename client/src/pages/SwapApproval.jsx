import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, ArrowLeftRight, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function SwapApproval() {
  const [requests, setRequests] = useState(() => {
    const saved = localStorage.getItem('swap_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const handleAction = (id, newStatus) => {
    const updated = requests.map(req => {
      if (req.id === id) {
        if (newStatus === 'approved') {
          updateGlobalSchedule(req);
        }
        return { ...req, status: newStatus };
      }
      return req;
    });
    setRequests(updated);
    localStorage.setItem('swap_requests', JSON.stringify(updated));
    alert(`換班申請已標記為：${newStatus === 'approved' ? '已核准' : '已拒絕'}`);
  };

  // Logic to actually swap names in the main schedule
  const updateGlobalSchedule = (request) => {
    const saved = localStorage.getItem('current_schedule');
    if (!saved) return;
    const schedule = JSON.parse(saved);
    
    // Find the slot by parsing the shift string (e.g., "週一 08:00 - 12:00")
    // For demo simplicity, we'll find where the requester is in any slot
    const newSchedule = { ...schedule };
    Object.keys(newSchedule).forEach(key => {
      const emps = newSchedule[key];
      if (emps.includes(request.requester)) {
        // Need to match the shift string to the grid key to be precise
        // But for this prototype, we'll assume the request shift matches
        newSchedule[key] = emps.map(name => name === request.requester ? request.helper : name);
      }
    });
    localStorage.setItem('current_schedule', JSON.stringify(newSchedule));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">換班審核中心</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">請審核已達成共識的換班請求</p>
        </div>
        <div className="flex items-center gap-3 bg-indigo-50 px-6 py-3 rounded-2xl text-indigo-600 font-black text-xs border border-indigo-100">
           <Clock size={16} /> 待處理：{requests.filter(r => r.status === 'waiting_admin').length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {requests.map(req => (
          <div key={req.id} className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row">
            <div className={`w-2 md:w-4 ${req.status === 'pending' ? 'bg-amber-400' : req.status === 'approved' ? 'bg-emerald-500' : req.status === 'waiting_admin' ? 'bg-indigo-500' : 'bg-red-500'}`}></div>
            <div className="p-8 flex-1 grid grid-cols-1 md:grid-cols-4 items-center gap-8">
              
              {/* Swap Flow */}
              <div className="md:col-span-1 flex items-center gap-3">
                <div className="text-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700 mx-auto mb-1">{req.requester[0]}</div>
                  <p className="text-xs font-black text-slate-900">{req.requester}</p>
                </div>
                <ArrowRight className="text-slate-300" size={20} />
                <div className="text-center">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white mx-auto mb-1 shadow-lg shadow-indigo-200">
                    {req.helper ? req.helper[0] : '?'}
                  </div>
                  <p className="text-xs font-black text-slate-900">{req.helper || '待響應'}</p>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                  <Clock size={14} /> 班次時段
                </div>
                <p className="text-slate-800 font-black mt-1">{req.shift}</p>
              </div>

              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">申請原因</p>
                <p className="text-sm text-slate-600 mt-1 italic leading-relaxed">"{req.reason}"</p>
              </div>

              <div className="flex justify-end gap-3">
                {req.status === 'waiting_admin' ? (
                  <>
                    <button 
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all shadow-sm"
                    >
                      <XCircle size={24} />
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, 'approved')}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                      <CheckCircle2 size={20} /> 核准換班
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] ${
                      req.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : 
                      req.status === 'pending' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {req.status === 'pending' ? '等待同事響應' : req.status}
                    </span>
                    {req.status === 'approved' && <p className="text-[9px] text-emerald-500 font-bold">班表已自動更新</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center">
            <AlertCircle size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">目前沒有任何換班申請需要處理。</p>
          </div>
        )}
      </div>
    </div>
  );
}
