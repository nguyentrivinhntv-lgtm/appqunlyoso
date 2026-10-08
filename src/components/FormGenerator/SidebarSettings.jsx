import { FileText, Check, Plus, Trash2, Globe, AlertTriangle } from 'lucide-react';
import { calculateFromAbsoluteSemester } from '../../utils/studentUtils';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

export default function SidebarSettings({ 
  FORMS, 
  selectedForm, 
  setSelectedForm, 
  globalSettings, 
  setGlobalSettings,
  selectedStudent,
  setSelectedStudent,
  handleUpdateStudentInfo
}) {
  const [isCheckingWeb, setIsCheckingWeb] = useState(false);
  const [webDiff, setWebDiff] = useState(null);

  const normalizeStrCheck = (str) => (str || '').toString().toLowerCase().trim();

  const handleCheckWeb = async () => {
    if (!selectedStudent || !selectedStudent.studentId) {
      toast.error('Sinh viên này chưa có Mã sinh viên (MSSV) để kiểm tra!');
      return;
    }
    
    setIsCheckingWeb(true);
    setWebDiff(null);
    try {
      toast.loading('Đang lấy dữ liệu từ web trường...', { id: 'webCheck' });
      const res = await api.fetchStudentFromWeb(selectedStudent.studentId);
      
      if (!res.html || !res.html.includes('BẢNG ĐIỂM SINH VIÊN')) {
        toast.error('Không tìm thấy thông tin trên web trường hoặc MSSV sai.', { id: 'webCheck' });
        setIsCheckingWeb(false);
        return;
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(res.html, 'text/html');
      const fontTags = doc.querySelectorAll("font[color='#0000FF']");
      
      if (fontTags.length >= 6) {
        const webData = {
          fullName: fontTags[0].textContent.trim(),
          classCode: fontTags[1].textContent.trim(),
          studentId: fontTags[2].textContent.trim(),
          dob: fontTags[3].textContent.trim(),
          major: fontTags[4].textContent.trim(),
          educationType: fontTags[5].textContent.trim(),
        };

        const diffs = [];
        const checkField = (field, label, appVal, webVal) => {
          if (normalizeStrCheck(appVal) !== normalizeStrCheck(webVal)) {
            diffs.push({ field, label, app: appVal, web: webVal });
          }
        };

        checkField('fullName', 'Họ tên', selectedStudent.fullName, webData.fullName);
        checkField('dob', 'Ngày sinh', selectedStudent.dob, webData.dob);
        checkField('classCode', 'Lớp', selectedStudent.classCode, webData.classCode);
        checkField('major', 'Ngành', selectedStudent.major, webData.major);

        if (diffs.length > 0) {
          setWebDiff(diffs);
          toast.error('Phát hiện thông tin sai lệch so với web trường!', { id: 'webCheck' });
        } else {
          toast.success('Thông tin khớp chính xác với web trường!', { id: 'webCheck' });
        }
      } else {
        toast.error('Không thể đọc cấu trúc dữ liệu từ web trường.', { id: 'webCheck' });
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi kết nối khi lấy dữ liệu web.', { id: 'webCheck' });
    } finally {
      setIsCheckingWeb(false);
    }
  };

  const handleAutoFix = () => {
    if (!webDiff || webDiff.length === 0) return;
    
    let updatedStudent = { ...selectedStudent };
    webDiff.forEach(diff => {
      if (diff.field) {
        updatedStudent[diff.field] = diff.web;
        handleUpdateStudentInfo(diff.field, diff.web);
      }
    });
    
    setSelectedStudent(updatedStudent);
    setWebDiff(null);
    toast.success('Đã tự động sửa thông tin!');
  };

  return (
    <>
      {/* Form Selection */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          1. Chọn Mẫu Hồ Sơ
        </h2>
        <div className="space-y-2">
          {FORMS.map(form => (
            <button
              key={form.id}
              onClick={() => setSelectedForm(form.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                selectedForm === form.id 
                  ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500 shadow-sm' 
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{form.name}</span>
                {selectedForm === form.id && <Check className="w-4 h-4 text-primary-600" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Formatting */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          2. Định dạng văn bản
        </h2>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">Kiểu chữ (Font)</label>
              <select 
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={globalSettings.fontFamily || '"Times New Roman", serif'}
                onChange={e => setGlobalSettings({...globalSettings, fontFamily: e.target.value})}
              >
                <option value='"Times New Roman", serif'>Times New Roman</option>
                <option value='Arial, sans-serif'>Arial</option>
                <option value='Tahoma, sans-serif'>Tahoma</option>
                <option value='Roboto, sans-serif'>Roboto</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Cỡ chữ (Size)</label>
              <select 
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={globalSettings.baseFontSize || 12}
                onChange={e => setGlobalSettings({...globalSettings, baseFontSize: parseInt(e.target.value, 10)})}
              >
                <option value={11}>11 pt</option>
                <option value={12}>12 pt</option>
                <option value={13}>13 pt</option>
                <option value={14}>14 pt</option>
                <option value={15}>15 pt</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" />
          3. Cài đặt nội dung
        </h2>
        <div className="space-y-3 text-sm">
          <div className="mb-4 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
             <label className="block text-amber-800 font-medium mb-1">Ép kiểu Hệ Đào Tạo (Chỉ dùng khi In/Xuất)</label>
             <select 
               className="w-full border rounded-lg px-3 py-2 bg-white border-amber-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
               value={globalSettings.forceLienThong || 'default'}
               onChange={e => setGlobalSettings({...globalSettings, forceLienThong: e.target.value})}
             >
               <option value="default">-- Giữ nguyên theo Data gốc --</option>
               <option value="Liên thông">Liên thông (Thời gian học 24 tháng)</option>
               <option value="Văn bằng 2">Văn bằng 2 (Thời gian học 24 tháng)</option>
               <option value="Chính quy">Chính quy (Thời gian học 36 tháng)</option>
             </select>
             <p className="text-[10px] text-amber-600 mt-1 italic">* Tính năng này không làm thay đổi Data gốc của sinh viên.</p>
          </div>

          {/* Helper function to get auto ceiling */}
          {(()=>{
            const isND238Moi = selectedForm === 'danh_sach_nd238_moi' || selectedForm === 'all_forms_nd238_moi';
            const isND238MoiMulti = selectedForm === 'danh_sach_nd238_moi_multi' || selectedForm === 'all_forms_nd238_moi_multi';
            const isAnyMulti = selectedForm === 'all_forms_multi' || isND238MoiMulti;
            
            if (!isAnyMulti) {
              return (
                <>
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <label className="block text-amber-800 font-semibold mb-1 text-xs">Học kỳ toàn khóa (Tự động điền)</label>
                    <input 
                      type="number"
                      min="1"
                      max="6"
                      className="w-full border border-amber-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
                      placeholder="VD: 6 (Tự điền HK 2, Năm 3)"
                      value={globalSettings.absoluteSemester || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const semNum = parseInt(val, 10);
                        const newGlobal = {...globalSettings, absoluteSemester: val};
                        if (semNum >= 1 && semNum <= 6) {
                          const info = calculateFromAbsoluteSemester(selectedStudent || {}, semNum);
                          newGlobal.semester = info.semester;
                          newGlobal.currentYear = info.currentYear;
                          if (info.schoolYear) {
                            newGlobal.schoolYear = info.schoolYear;
                          }
                        }
                        setGlobalSettings(newGlobal);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">Học kỳ</label>
                      <input className="w-full border rounded-lg px-3 py-2" value={globalSettings.semester} onChange={e => setGlobalSettings({...globalSettings, semester: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Năm học</label>
                      <input className="w-full border rounded-lg px-3 py-2" value={globalSettings.schoolYear} onChange={e => {
                        const newYear = e.target.value;
                        const newGlobal = {...globalSettings, schoolYear: newYear};
                        setGlobalSettings(newGlobal);
                      }} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-600 mb-1">Sinh viên năm thứ</label>
                      <input className="w-full border rounded-lg px-3 py-2" value={globalSettings.currentYear || ''} onChange={e => setGlobalSettings({...globalSettings, currentYear: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-slate-600 mb-1">Số tháng</label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2" value={globalSettings.soThang} onChange={e => setGlobalSettings({...globalSettings, soThang: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Mức thu HP/1 học kỳ</label>
                      <input 
                        className="w-full border rounded-lg px-3 py-2 border-indigo-300 bg-indigo-50" 
                        placeholder="VD: 11.450.000"
                        value={globalSettings.semesterTuitionFee || ''} 
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, '');
                          val = val ? parseInt(val).toLocaleString('vi-VN') : '';
                          const semNum = parseInt(val.replace(/\./g, '')) || 0;
                          const th = parseInt(globalSettings.soThang) || 5;
                          const monthVal = semNum > 0 ? Math.round(semNum / th).toLocaleString('vi-VN') : '';
                          setGlobalSettings({...globalSettings, semesterTuitionFee: val, tuitionFee: monthVal});
                        }} 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-600 mb-1">Mức thu HP/tháng</label>
                      <input 
                        className="w-full border rounded-lg px-3 py-2 bg-slate-50" 
                        value={globalSettings.tuitionFee} 
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, '');
                          val = val ? parseInt(val).toLocaleString('vi-VN') : '';
                          setGlobalSettings({...globalSettings, tuitionFee: val});
                        }} 
                      />
                    </div>
                  </div>
            </>
          );
            } else {
              return (
              <div className="space-y-4">
                {isND238MoiMulti && (
                  <div className="space-y-3 mb-4 p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                    <h3 className="font-semibold text-emerald-800 text-sm">Cài đặt chung cho NĐ 238</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1 text-xs">Số quyết định</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={globalSettings.quyetDinhSoND238 || ''} onChange={e => setGlobalSettings({...globalSettings, quyetDinhSoND238: e.target.value})} placeholder="Số QĐ..." />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 text-xs">Ngày ra QĐ</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={globalSettings.ngayQuyetDinhND238 || ''} onChange={e => setGlobalSettings({...globalSettings, ngayQuyetDinhND238: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Danh sách học kỳ</span>
                  <button 
                    onClick={() => {
                      const newId = Math.max(0, ...(globalSettings.multiSemesters || []).map(s => s.id)) + 1;
                      const newSemester = { 
                        id: newId, semester: '1', schoolYear: '2026 - 2027', soThang: '5', 
                        tuitionFee: '2.290.000', currentYear: '1'
                      };
                      setGlobalSettings({...globalSettings, multiSemesters: [...(globalSettings.multiSemesters || []), newSemester]});
                    }}
                    className="flex items-center gap-1 text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded hover:bg-primary-100"
                  >
                    <Plus className="w-3 h-3" /> Thêm HK
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {(globalSettings.multiSemesters || []).map((sem, idx) => (
                    <div key={sem.id} className="bg-slate-50 border rounded-lg p-3 relative">
                      <div className="absolute top-2 right-2 text-xs font-semibold text-slate-400">#{idx + 1}</div>
                      <button 
                        onClick={() => setGlobalSettings({...globalSettings, multiSemesters: globalSettings.multiSemesters.filter(s => s.id !== sem.id)})}
                        className="absolute top-2 right-8 text-red-400 hover:text-red-600"
                        title="Xóa học kỳ này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="col-span-2 mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                          <label className="block text-amber-800 font-semibold mb-1 text-[10px]">HK Toàn khóa (Tự động điền)</label>
                          <input 
                            type="number"
                            min="1"
                            max="6"
                            className="w-full border border-amber-300 rounded px-2 py-1 text-sm bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none" 
                            placeholder="VD: 6"
                            value={sem.absoluteSemester || ''}
                            onChange={e => {
                              const val = e.target.value;
                              const semNum = parseInt(val, 10);
                              const newMulti = [...globalSettings.multiSemesters];
                              newMulti[idx].absoluteSemester = val;
                              if (semNum >= 1 && semNum <= 6) {
                                const info = calculateFromAbsoluteSemester(selectedStudent || {}, semNum);
                                newMulti[idx].semester = info.semester;
                                newMulti[idx].currentYear = info.currentYear;
                                if (info.schoolYear) {
                                  newMulti[idx].schoolYear = info.schoolYear;
                                }
                              }
                              setGlobalSettings({...globalSettings, multiSemesters: newMulti});
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Học kỳ</label>
                          <input 
                            className="w-full border rounded px-2 py-1 text-sm" 
                            value={sem.semester} 
                            onChange={e => {
                              const newMulti = [...globalSettings.multiSemesters];
                              newMulti[idx].semester = e.target.value;
                              setGlobalSettings({...globalSettings, multiSemesters: newMulti});
                            }} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Năm học</label>
                          <input 
                            className="w-full border rounded px-2 py-1 text-sm" 
                            value={sem.schoolYear} 
                            onChange={e => {
                              const newMulti = [...globalSettings.multiSemesters];
                              newMulti[idx].schoolYear = e.target.value;
                              setGlobalSettings({...globalSettings, multiSemesters: newMulti});
                            }} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Số tháng</label>
                          <input 
                            type="number"
                            className="w-full border rounded px-2 py-1 text-sm" 
                            value={sem.soThang} 
                            onChange={e => {
                              const newMulti = [...globalSettings.multiSemesters];
                              newMulti[idx].soThang = e.target.value;
                              setGlobalSettings({...globalSettings, multiSemesters: newMulti});
                            }} 
                          />
                        </div>

                            <div>
                              <label className="block text-xs text-slate-500 mb-1 text-indigo-600 font-medium">Mức thu HP/kỳ</label>
                              <input 
                                className="w-full border border-indigo-200 bg-indigo-50 rounded px-2 py-1 text-sm" 
                                placeholder="11.450.000"
                                value={sem.semesterTuitionFee || ''} 
                                onChange={e => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  val = val ? parseInt(val).toLocaleString('vi-VN') : '';
                                  const semNum = parseInt(val.replace(/\./g, '')) || 0;
                                  const th = parseInt(sem.soThang) || 5;
                                  const monthVal = semNum > 0 ? Math.round(semNum / th).toLocaleString('vi-VN') : '';
                                  const newMulti = [...globalSettings.multiSemesters];
                                  newMulti[idx].semesterTuitionFee = val;
                                  newMulti[idx].tuitionFee = monthVal;
                                  setGlobalSettings({...globalSettings, multiSemesters: newMulti});
                                }} 
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-slate-500 mb-1">HP/tháng</label>
                              <input 
                                className="w-full border rounded px-2 py-1 text-sm bg-slate-50" 
                                value={sem.tuitionFee} 
                                onChange={e => {
                                  let val = e.target.value.replace(/\D/g, '');
                                  val = val ? parseInt(val).toLocaleString('vi-VN') : '';
                                  const newMulti = [...globalSettings.multiSemesters];
                                  newMulti[idx].tuitionFee = val;
                                  setGlobalSettings({...globalSettings, multiSemesters: newMulti});
                                }} 
                              />
                            </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-medium text-orange-600 mb-1">Ghi đè SV Năm thứ</label>
                          <input 
                            type="text"
                            className="w-full border border-orange-200 bg-orange-50 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none" 
                            value={sem.currentYear || ''} 
                            onChange={e => {
                              const newMulti = [...globalSettings.multiSemesters];
                              newMulti[idx].currentYear = e.target.value;
                              setGlobalSettings({...globalSettings, multiSemesters: newMulti});
                            }} 
                            placeholder="VD: 2 (Để trống tự tính)"
                          />
                        </div>

                      </div>
                    </div>
                  ))}
                  {(!globalSettings.multiSemesters || globalSettings.multiSemesters.length === 0) && (
                    <div className="text-center text-slate-400 py-4 text-xs italic">
                      Chưa có học kỳ nào. Hãy bấm "Thêm HK".
                    </div>
                  )}
                </div>
              </div>
            );
          }})()}

          <div className={`grid ${['all_forms_multi', 'danh_sach_nd238_moi_multi', 'all_forms_nd238_moi_multi'].includes(selectedForm) ? 'grid-cols-1' : 'grid-cols-1'} gap-3 pt-3 border-t`}>
            <div>
              <label className="block text-slate-600 mb-1">Kỷ luật</label>
              <input className="w-full border rounded-lg px-3 py-2" value={globalSettings.discipline} onChange={e => setGlobalSettings({...globalSettings, discipline: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Ngày ký</label>
              <input
                type="date"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                value={globalSettings.signDate}
                onChange={e => setGlobalSettings({...globalSettings, signDate: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">UBND xã/phường (nếu cần)</label>
              <input
                type="text"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                value={globalSettings.committee}
                onChange={e => setGlobalSettings({...globalSettings, committee: e.target.value})}
                placeholder="VD: Phường 5, Quận 3..."
              />
           </div>
          </div>

          {/* Cấu hình học kỳ kiểm tra học phí */}
          {selectedForm === 'kiem_tra_hoc_phi' && (
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-700 text-xs">Học kỳ cần kiểm tra HP</span>
                <button 
                  onClick={() => {
                    const kiemTraSemesters = globalSettings.kiemTraSemesters || [];
                    const newId = Math.max(0, ...kiemTraSemesters.map(s => s.id)) + 1;
                    const newSemester = { id: newId, semester: '1', schoolYear: '2025 - 2026' };
                    setGlobalSettings({...globalSettings, kiemTraSemesters: [...kiemTraSemesters, newSemester]});
                  }}
                  className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                >
                  <Plus className="w-3 h-3" /> Thêm HK
                </button>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {(globalSettings.kiemTraSemesters || []).map((sem, idx) => (
                  <div key={sem.id} className="bg-blue-50/50 border border-blue-100 rounded-lg p-2 relative">
                    <button 
                      onClick={() => setGlobalSettings({...globalSettings, kiemTraSemesters: globalSettings.kiemTraSemesters.filter(s => s.id !== sem.id)})}
                      className="absolute top-1 right-1 text-red-400 hover:text-red-600"
                      title="Xóa học kỳ này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-2 pr-5">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Học kỳ</label>
                        <input 
                          className="w-full border rounded px-2 py-1 text-xs" 
                          value={sem.semester} 
                          onChange={e => {
                            const newList = [...globalSettings.kiemTraSemesters];
                            newList[idx] = {...newList[idx], semester: e.target.value};
                            setGlobalSettings({...globalSettings, kiemTraSemesters: newList});
                          }} 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Năm học</label>
                        <input 
                          className="w-full border rounded px-2 py-1 text-xs" 
                          value={sem.schoolYear} 
                          onChange={e => {
                            const newList = [...globalSettings.kiemTraSemesters];
                            newList[idx] = {...newList[idx], schoolYear: e.target.value};
                            setGlobalSettings({...globalSettings, kiemTraSemesters: newList});
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(!globalSettings.kiemTraSemesters || globalSettings.kiemTraSemesters.length === 0) && (
                  <div className="text-center text-slate-400 py-2 text-[10px] italic">
                    Chưa thêm học kỳ nào. Nếu không thêm, mỗi SV sẽ chỉ có 1 dòng.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {selectedStudent && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-primary-600 uppercase tracking-wider">Cập nhật nhanh Sinh Viên</h3>
              <button 
                onClick={handleCheckWeb}
                disabled={isCheckingWeb}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors border border-indigo-200"
              >
                <Globe className={`w-3.5 h-3.5 ${isCheckingWeb ? 'animate-spin' : ''}`} />
                {isCheckingWeb ? 'Đang tra cứu...' : 'Đối chiếu Web'}
              </button>
            </div>

            {webDiff && webDiff.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-red-700 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4" /> Sai lệch thông tin:
                  </div>
                  <button 
                    onClick={handleAutoFix}
                    className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded shadow-sm transition-colors font-medium"
                  >
                    Tự động sửa
                  </button>
                </div>
                <div className="space-y-1.5">
                  {webDiff.map((diff, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium text-slate-700">{diff.label}:</span>{' '}
                      <span className="text-red-600 line-through mr-1">{diff.app || '(Trống)'}</span>
                      <span className="text-emerald-600 font-medium">➔ {diff.web}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Giới tính</label>
                <select
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.gender || ''}
                  onChange={e => {
                    const newGender = e.target.value;
                    setSelectedStudent({...selectedStudent, gender: newGender});
                    handleUpdateStudentInfo('gender', newGender);
                  }}
                >
                  <option value="">-- Chọn --</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Số CCCD</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.idCard || ''}
                  onChange={e => setSelectedStudent({...selectedStudent, idCard: e.target.value})}
                  onBlur={e => handleUpdateStudentInfo('idCard', e.target.value)}
                  placeholder="Nhập CCCD..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Ngày cấp CCCD</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.idCardIssueDate || ''}
                  onChange={e => setSelectedStudent({...selectedStudent, idCardIssueDate: e.target.value})}
                  onBlur={e => handleUpdateStudentInfo('idCardIssueDate', e.target.value)}
                  placeholder="VD: 15/05/2021"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Nơi cấp</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.idCardIssuePlace || ''}
                  onChange={e => setSelectedStudent({...selectedStudent, idCardIssuePlace: e.target.value})}
                  onBlur={e => handleUpdateStudentInfo('idCardIssuePlace', e.target.value)}
                  placeholder="VD: Cục CSQLHCVTTXH"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">SĐT</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.phone || ''}
                  onChange={e => setSelectedStudent({...selectedStudent, phone: e.target.value})}
                  onBlur={e => handleUpdateStudentInfo('phone', e.target.value)}
                  placeholder="VD: 09..."
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-slate-700">Địa chỉ</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.address || ''}
                  onChange={e => setSelectedStudent({...selectedStudent, address: e.target.value})}
                  onBlur={e => handleUpdateStudentInfo('address', e.target.value)}
                  placeholder="VD: Phường 5, Quận 3, TP.HCM"
                />
              </div>
              
              <div className="space-y-1 col-span-2 mt-2">
                <label className="text-xs font-semibold text-emerald-700 border-b border-emerald-200 block pb-1 mb-2">Thông tin tài khoản (Dành cho biểu mẫu hỗ trợ)</label>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Tên tài khoản</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.accountName !== undefined ? selectedStudent.accountName : (selectedStudent.fullName || '')}
                  onChange={e => setSelectedStudent({...selectedStudent, accountName: e.target.value})}
                  onBlur={e => handleUpdateStudentInfo('accountName', e.target.value)}
                  placeholder="VD: NGUYEN VAN A"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Số tài khoản</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.accountNumber || ''}
                  onChange={e => setSelectedStudent({...selectedStudent, accountNumber: e.target.value})}
                  onBlur={e => handleUpdateStudentInfo('accountNumber', e.target.value)}
                  placeholder="VD: 123456789"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-slate-700">Tên ngân hàng</label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={selectedStudent.bankName || ''}
                  onChange={e => setSelectedStudent({...selectedStudent, bankName: e.target.value})}
                  onBlur={e => handleUpdateStudentInfo('bankName', e.target.value)}
                  placeholder="VD: Vietcombank CN Tân Bình"
                />
              </div>
              {selectedForm === 'kiem_tra_hoc_phi' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Số hóa đơn</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={selectedStudent.invoiceNumber || ''}
                    onChange={e => setSelectedStudent({...selectedStudent, invoiceNumber: e.target.value})}
                    onBlur={e => handleUpdateStudentInfo('invoiceNumber', e.target.value)}
                    placeholder="VD: 18207"
                  />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 italic">* Nhập xong click ra ngoài ô để tự động lưu vào danh sách.</p>
          </div>
        )}
        
        <div className="mt-4 text-[10px] text-slate-400 italic">
          * Các thông tin chung sẽ áp dụng tự động lên biểu mẫu.
        </div>
      </div>
    </>
  );
}
