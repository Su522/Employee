import React, { useState, useEffect } from 'react';
import { Save, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckCircle, Info } from 'lucide-react';

export default function AvailabilitySetting() {
  const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const timeSlots = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`);

  // Get dynamic user from session
  const auth = JSON.parse(sessionStorage.getItem('auth_user') || '{"name": "訪客", "isImpersonated": false}');
  const currentUser = auth.name;
  const isImpersonated = auth.isImpersonated;

  const [grid, setGrid] = useState(Array.from({ length: 14 }, () => Array(7).fill(false)));
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(null);

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`/api/availability/${encodeURIComponent(currentUser)}`);
      const data = await res.json();
      setGrid(data);
    } catch (err) {
      console.error('Failed to fetch availability', err);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [currentUser]);

  const toggleSlot = (row, col) => {
    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = !newGrid[row][col];
    setGrid(newGrid);
  };

  const handleMouseDown = (row, col) => {
    setIsDragging(true);
    const newValue = !grid[row][col];
    setDragValue(newValue);
    toggleSlot(row, col);
  };

  const handleMouseEnter = (row, col) => {
    if (isDragging) {
      const newGrid = [...grid];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = dragValue;
      setGrid(newGrid);
    }
  };

  const saveAvailability = async () => {
    try {
      const res = await fetch(`/api/availability/${encodeURIComponent(currentUser)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grid)
      });
      if (!res.ok) throw new Error('Failed to save availability');
      alert('可用時段已成功儲存至資料庫！');
    } catch (err) {
      console.error(err);
      alert('儲存失敗，請稍後再試！');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500" onMouseUp={() => setIsDragging(false)}>
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
            <CalendarIcon size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">下一週時段預約</h2>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">2026/05/04 - 2026/05/10</p>
          </div>
        </div>
        <button 
          onClick={saveAvailability}
          disabled={isImpersonated}
          className={`w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-3xl font-black shadow-xl transition-all ${
            isImpersonated 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
              : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95'
          }`}
        >
          <Save size={20} />
          {isImpersonated ? '唯讀模式 (禁止儲存)' : '儲存設定'}
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden relative">
        <div className="grid grid-cols-[100px_repeat(7,1fr)]">
          <div className="h-14 border-b border-r border-slate-50 bg-slate-50/50 flex items-center justify-center font-black text-slate-300 text-[10px]">TIME</div>
          {days.map(day => <div key={day} className="h-14 border-b border-slate-100 bg-slate-50/50 flex items-center justify-center font-black text-slate-700 text-sm">{day}</div>)}

          {timeSlots.map((time, rowIdx) => (
            <React.Fragment key={time}>
              <div className="h-12 border-b border-r border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 bg-slate-50/10 tracking-tighter">{time}</div>
              {days.map((_, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                  onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                  className={`h-12 border-b border-r border-slate-50 cursor-pointer transition-all ${grid[rowIdx][colIdx] ? 'bg-indigo-600 shadow-inner scale-[0.98] rounded-sm' : 'hover:bg-indigo-50'}`}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4 text-blue-700">
        <Info size={24} />
        <p className="text-sm font-bold">小提示：您可以直接在表格上點擊並拖曳，快速勾選多個連續時段。</p>
      </div>
    </div>
  );
}
