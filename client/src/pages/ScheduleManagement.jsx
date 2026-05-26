import React, { useState, useEffect } from 'react';
import { Sparkles, Save, UserPlus, Trash2, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, XCircle, X, Calendar } from 'lucide-react';

export default function ScheduleManagement() {
  const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const timeSlots = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00', '20:00 - 22:00', '22:00 - 00:00'];
  
  const [schedule, setSchedule] = useState({});
  const [employees, setEmployees] = useState([]);
  const [allAvailabilities, setAllAvailabilities] = useState({});
  const [settings, setSettings] = useState({
    wages: { junior: 200, senior: 220 },
    staffing: { morning: 2, afternoon: 1, evening: 2 },
    constraints: { maxHours: 20, consecutiveShiftsAllowed: false, seniorRequiredPerShift: true }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeWeek, setActiveWeek] = useState({ start: '', end: '' });
  
  // Selection Modal State
  const [selectionModal, setSelectionModal] = useState({ isOpen: false, slotKey: null, dayIdx: null, rowIdx: null });

  const fetchData = async () => {
    try {
      const schedRes = await fetch('/api/schedule');
      const schedData = await schedRes.json();
      setSchedule(schedData);

      const empRes = await fetch('/api/employees');

      const empData = await empRes.json();
      setEmployees(empData);

      const availRes = await fetch('/api/availability');
      const availData = await availRes.json();
      setAllAvailabilities(availData);

      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      setSettings(settingsData);

      const weekRes = await fetch('/api/active-week');
      if (weekRes.ok) {
        const weekData = await weekRes.json();
        setActiveWeek({
          start: weekData.start.replace(/-/g, '/'),
          end: weekData.end.replace(/-/g, '/')
        });
      }
    } catch (err) {
      console.error('Failed to fetch schedule data', err);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  const handleAutoGenerate = () => {
    if (employees.length === 0) {
      alert('目前員工名單為空，請先到「員工管理」新增員工！');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const newSchedule = {};
      const employeeHours = {};
      employees.forEach(emp => {
        employeeHours[emp.name] = 0;
      });

      // Helper to check if employee is free in a specific day & time block
      const isFree = (empName, rowIdx, colIdx) => {
        const empAvail = allAvailabilities[empName];
        if (!empAvail) return true; // 預設無設定可用時段時視為有空，保障全新系統可正常排班
        const startRow = rowIdx * 2;
        const endRow = Math.min(13, startRow + 1);
        let freeCount = 0;
        for (let r = startRow; r <= endRow; r++) {
          if (empAvail[r] && empAvail[r][colIdx]) freeCount++;
        }
        return freeCount >= 1;
      };

      // Helper to get staffing requirement
      const getRequiredCount = (rowIdx) => {
        if (rowIdx <= 1) return settings.staffing.morning;
        if (rowIdx <= 4) return settings.staffing.afternoon;
        return settings.staffing.evening;
      };

      // Loop through all days and time slots to assign employees
      timeSlots.forEach((_, rowIdx) => {
        days.forEach((_, colIdx) => {
          const key = `${rowIdx}-${colIdx}`;
          const requiredCount = getRequiredCount(rowIdx);
          const assigned = [];

          // 1. Find all available candidates for this slot
          let candidates = employees.filter(emp => {
            // Check availability
            const available = isFree(emp.name, rowIdx, colIdx);
            // Check max hours limit
            const underLimit = (employeeHours[emp.name] + 2) <= settings.constraints.maxHours;
            // Check consecutive shift constraint if consecutiveShiftsAllowed is false
            let noConsecutiveConflict = true;
            if (!settings.constraints.consecutiveShiftsAllowed && rowIdx > 0) {
              const prevKey = `${rowIdx - 1}-${colIdx}`;
              const prevAssigned = newSchedule[prevKey] || [];
              if (prevAssigned.includes(emp.name)) {
                noConsecutiveConflict = false;
              }
            }
            return available && underLimit && noConsecutiveConflict;
          });

          // Shuffle candidates to ensure fair distribution
          candidates = candidates.sort(() => 0.5 - Math.random());

          // 2. Apply Senior Guard if required
          if (settings.constraints.seniorRequiredPerShift) {
            const seniorCandidateIndex = candidates.findIndex(c => c.level === 'senior');
            if (seniorCandidateIndex !== -1) {
              const senior = candidates.splice(seniorCandidateIndex, 1)[0];
              assigned.push(senior.name);
              employeeHours[senior.name] += 2;
            }
          }

          // 3. Fill the rest of required slots with remaining candidates
          while (assigned.length < requiredCount && candidates.length > 0) {
            const nextCandidate = candidates.shift();
            assigned.push(nextCandidate.name);
            employeeHours[nextCandidate.name] += 2;
          }

          newSchedule[key] = assigned;
        });
      });

      setSchedule(newSchedule);
      setIsGenerating(false);
      setHasUnsavedChanges(true);
      alert('已根據您的「系統設定」（包含時段人數、資深保障、週工時上限）自動產生最佳班表！請記得儲存班表。');
    }, 1200);
  };



  const saveToStorage = async () => {
    try {
      const res = await fetch('/api/schedule/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
      if (!res.ok) throw new Error('Failed to save schedule');
      setHasUnsavedChanges(false);
      alert('班表已儲存至資料庫！');
    } catch (err) {
      console.error(err);
      alert('儲存失敗，請稍後再試！');
    }
  };



  const removeEmployee = (slotKey, empName) => {
    const newSchedule = { ...schedule };
    newSchedule[slotKey] = newSchedule[slotKey].filter(name => name !== empName);
    setSchedule(newSchedule);
    setHasUnsavedChanges(true);
  };

  const openSelectionModal = (slotKey, rowIdx, colIdx) => {
    setSelectionModal({ isOpen: true, slotKey, rowIdx, dayIdx: colIdx });
  };

  const addEmployeeToSlot = (name) => {
    const { slotKey } = selectionModal;
    const newSchedule = { ...schedule };
    if (!(newSchedule[slotKey] || []).includes(name)) {
      newSchedule[slotKey] = [...(newSchedule[slotKey] || []), name];
      setSchedule(newSchedule);
      setHasUnsavedChanges(true);
    }
    setSelectionModal({ ...selectionModal, isOpen: false });
  };



  // Helper to check if employee is free in a 2-hour block
  const checkAvailability = (empName, rowIdx, dayIdx) => {
    const empAvail = allAvailabilities[empName];
    if (!empAvail) return 'unknown';
    
    // Check the corresponding 2 hours in the 1-hour grid
    const startRow = rowIdx * 2;
    const endRow = Math.min(13, startRow + 1);
    
    let freeCount = 0;
    for(let r = startRow; r <= endRow; r++) {
      if (empAvail[r] && empAvail[r][dayIdx]) freeCount++;
    }
    
    return freeCount >= 1 ? 'free' : 'busy'; // If at least 1 hour in the 2-hour block is free
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">智慧排班系統</h2>
          <p className="text-xs font-bold text-indigo-500 mt-1.5 uppercase tracking-widest flex items-center gap-1.5">
             <Calendar size={12} /> 排班週次：{activeWeek.start} - {activeWeek.end}
          </p>
          {hasUnsavedChanges && <p className="text-amber-500 text-[10px] font-black mt-1 uppercase tracking-widest">● Detected Unsaved Changes</p>}
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="flex items-center gap-3 bg-white border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-[24px] font-black hover:bg-indigo-50 transition-all disabled:opacity-50"
          >
            <Sparkles size={20} />
            {isGenerating ? '計算中...' : '自動產生'}
          </button>
          <button 
            onClick={saveToStorage}
            className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-[24px] font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Save size={20} />
            儲存班表
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-[150px_repeat(7,1fr)] bg-slate-50/50">
              <div className="p-6"></div>
              {days.map(day => <div key={day} className="p-6 text-center font-black text-slate-800">{day}</div>)}
            </div>
            {timeSlots.map((time, rowIdx) => (
              <div key={time} className="grid grid-cols-[150px_repeat(7,1fr)] border-t border-gray-50">
                <div className="p-6 flex flex-col justify-center bg-slate-50/20 border-r border-gray-50 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Block</span>
                  <span className="text-xs font-black text-slate-900">{time}</span>
                </div>
                {days.map((_, colIdx) => {
                  const key = `${rowIdx}-${colIdx}`;
                  const emps = schedule[key] || [];
                  return (
                    <div key={key} className="p-3 min-h-[130px] border-r border-gray-50 flex flex-col gap-2 group/cell hover:bg-indigo-50/10 transition-colors">
                      {emps.map(name => (
                        <div key={name} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm group/tag hover:border-indigo-200 transition-all">
                          <span className="text-[11px] font-bold text-slate-700">{name}</span>
                          <button onClick={() => removeEmployee(key, name)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover/tag:opacity-100 transition-all"><Trash2 size={12} /></button>
                        </div>
                      ))}
                      <button 
                        onClick={() => openSelectionModal(key, rowIdx, colIdx)} 
                        className="mt-auto py-2 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-indigo-400 hover:text-indigo-600 text-[10px] font-bold opacity-0 group-hover/cell:opacity-100 transition-all"
                      >
                        + 排入員工
                      </button>
                    </div>
                  );
                })}


              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selection Modal */}
      {selectionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectionModal({ ...selectionModal, isOpen: false })}></div>
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-white/20">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-black text-slate-900">選擇排班人員</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                   時段：{days[selectionModal.dayIdx]} {timeSlots[selectionModal.rowIdx]}
                 </p>
               </div>
               <button onClick={() => setSelectionModal({ ...selectionModal, isOpen: false })} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-2">
              {employees.map(emp => {
                const status = checkAvailability(emp.name, selectionModal.rowIdx, selectionModal.dayIdx);
                const currentSlotEmps = schedule[selectionModal.slotKey] || [];
                // Use trim() to ensure robust string comparison
                const isAlreadyIn = currentSlotEmps.some(name => name.trim() === emp.name.trim());
                
                return (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={isAlreadyIn}
                    onClick={() => addEmployeeToSlot(emp.name)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isAlreadyIn ? 'bg-slate-50 border-gray-100 opacity-60 cursor-not-allowed' : 'bg-white border-gray-100 hover:border-indigo-600 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${isAlreadyIn ? 'bg-slate-200 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                         {emp.name[0]}
                       </div>
                       <div className="text-left">
                         <p className={`font-bold ${isAlreadyIn ? 'text-slate-400' : 'text-slate-900'}`}>{emp.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{emp.level}</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isAlreadyIn ? (
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest">
                           已在班表中
                        </span>
                      ) : (
                        <>
                          {status === 'free' ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                               <CheckCircle2 size={12} /> 有空
                            </span>
                          ) : status === 'busy' ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">
                               <XCircle size={12} /> 忙碌
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">未設定</span>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-8 bg-slate-50/50 border-t border-gray-50">
              <p className="text-[10px] text-slate-400 font-medium text-center">
                ※ 狀態根據員工自行設定的「可用時段」即時計算產生
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
