import { useState, useEffect } from 'react';
import { Settings, DollarSign, Users, ShieldAlert, Save, RefreshCw } from 'lucide-react';

const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 22:00',
  '22:00 - 00:00'
];

export default function SettingsPage() {
  const [wages, setWages] = useState({
    junior: 200,
    senior: 220
  });

  const [staffing, setStaffing] = useState([2, 2, 1, 1, 1, 2, 2, 2]);

  const [constraints, setConstraints] = useState({
    maxHours: 20,
    consecutiveShiftsAllowed: false,
    seniorRequiredPerShift: true
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.wages) setWages(data.wages);
        if (data.staffing) setStaffing(data.staffing);
        if (data.constraints) setConstraints(data.constraints);
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wages, staffing, constraints })
      });
      if (!res.ok) throw new Error('Failed to save settings');
      alert('系統設定已成功儲存至伺服器！');
    } catch (err) {
      console.error(err);
      alert('儲存失敗，請稍後再試！');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('您確定要將所有設定重設為預設值嗎？')) {
      setWages({ junior: 200, senior: 220 });
      setStaffing([2, 2, 1, 1, 1, 2, 2, 2]);
      setConstraints({ maxHours: 20, consecutiveShiftsAllowed: false, seniorRequiredPerShift: true });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
            <Settings size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">系統設定</h2>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">配置排班規則、薪資費率及人力配置需求</p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={handleReset}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-gray-200 text-gray-500 font-bold hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw size={18} />
            重設預設
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save size={20} />
            {isSaving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Salary Configuration Card */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-gray-50 pb-4">
            <DollarSign className="text-indigo-600" size={22} />
            時薪費率設定
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">初級員工 (Junior)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">NT$</span>
                <input 
                  type="number" 
                  value={wages.junior} 
                  onChange={e => setWages({...wages, junior: parseInt(e.target.value) || 0})}
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">資深員工 (Senior)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">NT$</span>
                <input 
                  type="number" 
                  value={wages.senior} 
                  onChange={e => setWages({...wages, senior: parseInt(e.target.value) || 0})}
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 font-medium">※ 此費率將在排班儲存時即時套用至薪資紀錄的計算中。</p>
        </div>

        {/* Staffing Config Card */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-gray-50 pb-4">
            <Users className="text-indigo-600" size={22} />
            時段人力需求配置 (每時段配置人數)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {TIME_SLOTS.map((slot, index) => (
              <div key={slot} className="bg-slate-50/50 p-4 rounded-2xl border border-gray-100/50 flex flex-col justify-between">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 text-center">{slot}</label>
                <input 
                  type="number" 
                  min="0"
                  value={Array.isArray(staffing) ? (staffing[index] !== undefined ? staffing[index] : 2) : 2} 
                  onChange={e => {
                    const newStaffing = Array.isArray(staffing) ? [...staffing] : [2, 2, 1, 1, 1, 2, 2, 2];
                    newStaffing[index] = Math.max(0, parseInt(e.target.value) || 0);
                    setStaffing(newStaffing);
                  }}
                  className="w-full bg-white border border-gray-100 rounded-xl py-2 text-center focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 font-medium">※ 智慧排班引擎將以此人數配置做為自動排班的基礎需求門檻。</p>
        </div>

        {/* Scheduling Constraints & Rules */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6 lg:col-span-2">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-gray-50 pb-4">
            <ShieldAlert className="text-indigo-600" size={22} />
            智慧排班約束規則
          </h3>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-6 rounded-3xl">
              <div>
                <p className="font-bold text-slate-800">單週工時限制 (每位員工最大上限)</p>
                <p className="text-xs text-gray-400 mt-1">防止工讀生單週工作時數超標，保障排班公平性</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  value={constraints.maxHours} 
                  onChange={e => setConstraints({...constraints, maxHours: parseInt(e.target.value) || 0})}
                  className="bg-white border-2 border-gray-100 rounded-xl py-2 px-4 w-24 text-center font-bold focus:ring-2 focus:ring-indigo-500"
                />
                <span className="font-bold text-slate-600">小時 / 週</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl">
              <div>
                <p className="font-bold text-slate-800">允許連續排班 (跨時段排班)</p>
                <p className="text-xs text-gray-400 mt-1">是否允許員工連續排入相鄰的兩個時段</p>
              </div>
              <button 
                onClick={() => setConstraints({...constraints, consecutiveShiftsAllowed: !constraints.consecutiveShiftsAllowed})}
                className={`w-14 h-8 rounded-full transition-all relative ${constraints.consecutiveShiftsAllowed ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${constraints.consecutiveShiftsAllowed ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl">
              <div>
                <p className="font-bold text-slate-800">保障資深人員在班 (Senior Guard)</p>
                <p className="text-xs text-gray-400 mt-1">強制確保每個排班時段中，至少要有一位資深 (Senior) 員工在班以利營運</p>
              </div>
              <button 
                onClick={() => setConstraints({...constraints, seniorRequiredPerShift: !constraints.seniorRequiredPerShift})}
                className={`w-14 h-8 rounded-full transition-all relative ${constraints.seniorRequiredPerShift ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${constraints.seniorRequiredPerShift ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
