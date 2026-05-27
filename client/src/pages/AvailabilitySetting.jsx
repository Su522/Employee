import React, { useState, useEffect } from 'react';
import { Save, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckCircle, Info, Upload, Download, FileSpreadsheet } from 'lucide-react';

const SLOT_BOUNDS = [
  { start: 8 * 60, end: 10 * 60 },
  { start: 10 * 60, end: 12 * 60 },
  { start: 12 * 60, end: 14 * 60 },
  { start: 14 * 60, end: 16 * 60 },
  { start: 16 * 60, end: 18 * 60 },
  { start: 18 * 60, end: 20 * 60 },
  { start: 20 * 60, end: 22 * 60 },
  { start: 22 * 60, end: 24 * 60 }
];

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

const parseDayToColumnIndex = (dayStr) => {
  if (!dayStr) return -1;
  const clean = dayStr.trim().toLowerCase();
  
  if (clean.includes('一') || clean.includes('mon') || clean === '1') return 0;
  if (clean.includes('二') || clean.includes('tue') || clean === '2') return 1;
  if (clean.includes('三') || clean.includes('wed') || clean === '3') return 2;
  if (clean.includes('四') || clean.includes('thu') || clean === '4') return 3;
  if (clean.includes('五') || clean.includes('fri') || clean === '5') return 4;
  if (clean.includes('六') || clean.includes('sat') || clean === '6') return 5;
  if (clean.includes('日') || clean.includes('天') || clean.includes('sun') || clean === '7' || clean === '0') return 6;
  
  return -1;
};

export default function AvailabilitySetting() {
  const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const timeSlots = [
    '08:00 - 10:00',
    '10:00 - 12:00',
    '12:00 - 14:00',
    '14:00 - 16:00',
    '16:00 - 18:00',
    '18:00 - 20:00',
    '20:00 - 22:00',
    '22:00 - 00:00'
  ];

  // Get dynamic user from session
  const auth = JSON.parse(sessionStorage.getItem('auth_user') || '{"name": "訪客", "isImpersonated": false}');
  const currentUser = auth.name;
  const isImpersonated = auth.isImpersonated;

  const [grid, setGrid] = useState(Array.from({ length: 8 }, () => Array(7).fill(false)));
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(null);
  const [courses, setCourses] = useState([]);

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`/api/availability/${encodeURIComponent(currentUser)}`);
      const data = await res.json();
      setGrid(data);
    } catch (err) {
      console.error('Failed to fetch availability', err);
    }
  };

  const fetchCourseSchedule = async () => {
    try {
      const res = await fetch(`/api/course-schedule/${encodeURIComponent(currentUser)}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data.map(row => ({
          day_of_week: row.day_of_week,
          startTime: row.start_time.substring(0, 5),
          endTime: row.end_time.substring(0, 5),
          courseName: row.CourseName
        })));
      }
    } catch (err) {
      console.error('Failed to fetch course schedule', err);
    }
  };

  useEffect(() => {
    fetchAvailability();
    fetchCourseSchedule();
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
      const resGrid = await fetch(`/api/availability/${encodeURIComponent(currentUser)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grid)
      });
      if (!resGrid.ok) throw new Error('Failed to save availability grid');

      const resCourses = await fetch(`/api/course-schedule/${encodeURIComponent(currentUser)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courses)
      });
      if (!resCourses.ok) throw new Error('Failed to save course schedule');

      alert('可用時段與課表資料已成功儲存至資料庫！');
    } catch (err) {
      console.error(err);
      alert('儲存失敗，請稍後再試！');
    }
  };

  const downloadTemplate = () => {
    const csvContent = "\ufeff" + [
      ["星期", "課程名稱", "開始時間", "結束時間"],
      ["週一", "計算機概論", "09:00", "12:00"],
      ["週二", "微積分", "10:00", "12:00"],
      ["週三", "體育課", "13:30", "15:30"],
      ["週四", "物理實驗", "14:00", "17:00"],
      ["週五", "通識講座", "18:30", "20:30"]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "課表範本.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      
      const lines = text.split(/\r?\n/);
      const rows = [];
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        const cleanFields = (matches || []).map(f => f.replace(/^"|"$/g, '').trim());
        if (cleanFields.length > 0) {
          rows.push(cleanFields);
        }
      }

      if (rows.length < 2) {
        alert('CSV 檔案內容不足（需包含標頭與至少一筆資料）！');
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase());
      
      let dayIdx = headers.findIndex(h => h.includes('星期') || h.includes('週') || h.includes('day') || h.includes('date'));
      let startIdx = headers.findIndex(h => h.includes('開始') || h.includes('start') || h.includes('from') || h.includes('stime'));
      let endIdx = headers.findIndex(h => h.includes('結束') || h.includes('end') || h.includes('to') || h.includes('etime'));
      let courseNameIdx = headers.findIndex(h => h.includes('課程') || h.includes('科目') || h.includes('course') || h.includes('subject'));

      if (dayIdx === -1 || startIdx === -1 || endIdx === -1) {
        const firstData = rows[1];
        const timeIndices = [];
        let foundDayIdx = -1;
        
        firstData.forEach((val, idx) => {
          if (val.includes(':')) {
            timeIndices.push(idx);
          } else if (parseDayToColumnIndex(val) !== -1) {
            foundDayIdx = idx;
          }
        });

        if (foundDayIdx !== -1) dayIdx = foundDayIdx;
        if (timeIndices.length >= 2) {
          startIdx = timeIndices[0];
          endIdx = timeIndices[1];
        }
      }

      if (dayIdx === -1 || startIdx === -1 || endIdx === -1) {
        alert('無法識別 CSV 欄位！請確保檔案中包含「星期」、「開始時間」與「結束時間」的欄位。');
        return;
      }

      const newGrid = Array.from({ length: 8 }, () => Array(7).fill(true));
      const parsedCoursesList = [];
      let parsedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length <= Math.max(dayIdx, startIdx, endIdx)) continue;

        const dayVal = row[dayIdx];
        const startVal = row[startIdx];
        const endVal = row[endIdx];
        const courseNameVal = courseNameIdx !== -1 && row[courseNameIdx] ? row[courseNameIdx] : '';

        const col = parseDayToColumnIndex(dayVal);
        if (col === -1) continue;

        const courseStart = parseTimeToMinutes(startVal);
        const courseEnd = parseTimeToMinutes(endVal);

        if (courseStart >= courseEnd) continue;

        parsedCount++;

        parsedCoursesList.push({
          day_of_week: dayVal,
          startTime: startVal,
          endTime: endVal,
          courseName: courseNameVal
        });

        SLOT_BOUNDS.forEach((slot, rowIdx) => {
          if (courseStart < slot.end && courseEnd > slot.start) {
            newGrid[rowIdx][col] = false;
          }
        });
      }

      setGrid(newGrid);
      setCourses(parsedCoursesList);
      alert(`成功匯入 ${parsedCount} 筆課程時段！有課時間已設為「沒空」，您可以在下方繼續微調，確認無誤後請點擊「儲存設定」。`);
      event.target.value = '';
    };
    
    reader.readAsText(file);
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

      {/* CSV Import Card */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">匯入課表快速設定時段</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">上傳課表 CSV 檔案後，有課時段將自動設為沒空，其餘設為有空。</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={downloadTemplate}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border-2 border-slate-100 hover:border-indigo-100 text-slate-500 hover:text-indigo-600 font-black text-sm transition-all"
          >
            <Download size={16} />
            下載課表範本
          </button>
          <label className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-sm cursor-pointer transition-all active:scale-95 shadow-inner">
            <Upload size={16} />
            上傳課表 CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>
        </div>
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
