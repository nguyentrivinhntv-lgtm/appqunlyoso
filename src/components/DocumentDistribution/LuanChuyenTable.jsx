import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Upload, X, FileImage, Plus, Trash2, CheckSquare, Settings2 } from 'lucide-react';
import { getApiBaseUrl } from '../../services/connectionConfig';

const getApiUrl = () => getApiBaseUrl();

export default function LuanChuyenTable({ paginatedStudents, currentDists, setCurrentDists, loading, startIndex }) {
  const [viewImage, setViewImage] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Custom Columns State
  const [showCols, setShowCols] = useState({
    khoa: true,
    ketoan: true,
    daotao: true,
    giamdoc: true,
  });
  const [showSettings, setShowSettings] = useState(false);

  // Build lookup map for O(1) access: studentId -> array of records
  const distMap = React.useMemo(() => {
    const map = {};
    currentDists.forEach(d => {
      if (!map[d.studentId]) map[d.studentId] = [];
      map[d.studentId].push(d);
    });
    return map;
  }, [currentDists]);

  // Handle changes and debounce save
  const handleUpdate = async (record, updates) => {
    if (!record.id) {
      toast.error('Lỗi: Hồ sơ chưa được khởi tạo đúng cách.');
      return;
    }

    let processedUpdates = { ...updates };
    
    // Auto-fill forwardDate if destination checked
    if (
      (updates.toKhoa === true || updates.toKeToan === true || updates.toDaoTao === true || updates.toGiamDoc === true) &&
      !record.forwardDate && !updates.forwardDate
    ) {
      const today = new Date();
      const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      processedUpdates.forwardDate = localDate;
      toast.success('Đã tự động điền Ngày đi', { icon: '✨' });
    }

    const updatedRecord = { ...record, ...processedUpdates, updatedAt: new Date().toISOString() };
    
    setCurrentDists(prev => prev.map(d => d.id === record.id ? updatedRecord : d));
    
    try {
      await axios.put(`${getApiUrl()}/documentRouting/${record.id}`, updatedRecord);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật dữ liệu luân chuyển');
      setCurrentDists(prev => prev.map(d => d.id === record.id ? record : d));
    }
  };

  const handleAddRecord = async (student) => {
    const newRecord = {
      studentId: student.id,
      studentName: student.fullName,
      classCode: student.classCode || '',
      createdAt: new Date().toISOString(),
      note: '',
      receiveDate: '',
      forwardDate: '',
      toKhoa: false,
      toKeToan: false,
      toDaoTao: false,
      toGiamDoc: false,
      image: null
    };
    
    try {
      const res = await axios.post(`${getApiUrl()}/documentRouting`, newRecord);
      setCurrentDists(prev => [...prev, res.data]);
      toast.success('Đã thêm dòng hồ sơ mới');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thêm hồ sơ mới');
    }
  };

  const handleDeleteRecord = async (record) => {
    // Delete with Undo feature
    try {
      await axios.delete(`${getApiUrl()}/documentRouting/${record.id}`);
      setCurrentDists(prev => prev.filter(d => d.id !== record.id));
      
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Đã xóa 1 hồ sơ.</span>
          <button
            className="bg-slate-200 text-slate-800 px-3 py-1 rounded text-xs font-semibold hover:bg-slate-300 transition-colors"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const { id, ...recordWithoutId } = record;
                const res = await axios.post(`${getApiUrl()}/documentRouting`, recordWithoutId);
                setCurrentDists(prev => [...prev, res.data]);
                toast.success('Đã khôi phục hồ sơ!');
              } catch (e) {
                console.error(e);
                toast.error('Lỗi khi khôi phục');
              }
            }}
          >
            Hoàn tác (Undo)
          </button>
        </div>
      ), { duration: 5000 });
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa hồ sơ');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(new Set(paginatedStudents.map(s => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(studentId)) newSet.delete(studentId);
    else newSet.add(studentId);
    setSelectedStudents(newSet);
  };

  const handleBulkAction = async (actionType) => {
    if (selectedStudents.size === 0) return;
    setIsProcessingBulk(true);
    const toastId = toast.loading(`Đang xử lý ${selectedStudents.size} sinh viên...`);

    try {
      const today = new Date();
      const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      const newDists = [...currentDists];

      for (const studentId of selectedStudents) {
        const student = paginatedStudents.find(s => s.id === studentId);
        if (!student) continue;

        const records = distMap[studentId] || [];
        const record = records[0]; 

        if (actionType === 'nhan_ho_so') {
          if (record && record.id) {
            if (!record.receiveDate) {
              const updated = { ...record, receiveDate: localDate };
              await axios.put(`${getApiUrl()}/documentRouting/${record.id}`, updated);
              const idx = newDists.findIndex(d => d.id === record.id);
              if (idx > -1) newDists[idx] = updated;
            }
          } else {
            const newRecord = {
              studentId: student.id, studentName: student.fullName, classCode: student.classCode || '',
              createdAt: new Date().toISOString(), note: '', receiveDate: localDate, forwardDate: '',
              toKhoa: false, toKeToan: false, toDaoTao: false, toGiamDoc: false, image: null
            };
            const res = await axios.post(`${getApiUrl()}/documentRouting`, newRecord);
            newDists.push(res.data);
          }
        } else if (actionType === 'chuyen_khoa') {
          if (record && record.id) {
            if (!record.toKhoa) {
              const updated = { ...record, toKhoa: true, forwardDate: record.forwardDate || localDate };
              await axios.put(`${getApiUrl()}/documentRouting/${record.id}`, updated);
              const idx = newDists.findIndex(d => d.id === record.id);
              if (idx > -1) newDists[idx] = updated;
            }
          } else {
            const newRecord = {
              studentId: student.id, studentName: student.fullName, classCode: student.classCode || '',
              createdAt: new Date().toISOString(), note: '', receiveDate: '', forwardDate: localDate,
              toKhoa: true, toKeToan: false, toDaoTao: false, toGiamDoc: false, image: null
            };
            const res = await axios.post(`${getApiUrl()}/documentRouting`, newRecord);
            newDists.push(res.data);
          }
        }
      }

      setCurrentDists(newDists);
      toast.success(`Đã xử lý xong hàng loạt!`, { id: toastId });
      setSelectedStudents(new Set()); 
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thao tác hàng loạt', { id: toastId });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleImageUpload = (e, record) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh');
      return;
    }

    if (!record.id) {
      toast.error('Vui lòng tạo dòng hồ sơ (Bấm + Thêm hồ sơ) trước khi tải ảnh lên.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        handleUpdate(record, { image: dataUrl });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="overflow-x-auto relative min-h-[400px]">
      {/* Column Settings Toggle */}
      <div className="absolute right-0 -top-12 flex items-center z-10">
        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Tùy biến Cột
          </button>
          
          {showSettings && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50">
              <div className="text-xs font-semibold text-slate-500 mb-2 uppercase">Hiển thị cột đích đến</div>
              {Object.keys(showCols).map(colKey => {
                const labels = { khoa: 'Khoa', ketoan: 'Kế toán', daotao: 'Đào tạo', giamdoc: 'Giám đốc' };
                return (
                  <label key={colKey} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-slate-50 rounded px-1">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={showCols[colKey]}
                      onChange={(e) => setShowCols(prev => ({ ...prev, [colKey]: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-700">{labels[colKey]}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedStudents.size > 0 && (
        <div className="sticky top-0 z-20 bg-violet-50 border-b border-violet-200 px-4 py-3 flex items-center justify-between shadow-sm animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <span className="text-violet-700 font-semibold text-sm bg-violet-200 px-2 py-1 rounded-md">
              Đã chọn: {selectedStudents.size} SV
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('nhan_ho_so')}
              disabled={isProcessingBulk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors disabled:opacity-50"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Đánh dấu Đã nhận (Hôm nay)
            </button>
            <button
              onClick={() => handleBulkAction('chuyen_khoa')}
              disabled={isProcessingBulk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Đánh dấu Chuyển Khoa
            </button>
            <button
              onClick={() => setSelectedStudents(new Set())}
              className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 rounded"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 font-semibold w-10 text-center">
              <input 
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                onChange={handleSelectAll}
                checked={paginatedStudents.length > 0 && selectedStudents.size === paginatedStudents.length}
              />
            </th>
            <th className="px-2 py-3 font-semibold w-12 text-center">STT</th>
            <th className="px-3 py-3 font-semibold min-w-[200px]">Họ và tên</th>
            <th className="px-3 py-3 font-semibold w-[70px] text-center">Ảnh HS</th>
            <th className="px-3 py-3 font-semibold">Ngày Nhận</th>
            <th className="px-3 py-3 font-semibold">Ngày Đi</th>
            {showCols.khoa && <th className="px-2 py-3 font-semibold text-center w-16">Khoa</th>}
            {showCols.ketoan && <th className="px-2 py-3 font-semibold text-center w-16">Kế toán</th>}
            {showCols.daotao && <th className="px-2 py-3 font-semibold text-center w-16">Đào tạo</th>}
            {showCols.giamdoc && <th className="px-2 py-3 font-semibold text-center w-16">Giám đốc</th>}
            <th className="px-3 py-3 font-semibold min-w-[150px]">Ghi chú</th>
            <th className="px-2 py-3 font-semibold text-center w-12">Xóa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {loading ? (
            <tr>
              <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                Đang tải dữ liệu...
              </td>
            </tr>
          ) : paginatedStudents.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                Không có sinh viên nào.
              </td>
            </tr>
          ) : (
            paginatedStudents.map((student, index) => {
              const records = distMap[student.id] || [];
              const rowCount = Math.max(records.length, 1);
              const displayRecords = records.length > 0 ? records : [{}];
              const isSelected = selectedStudents.has(student.id);
              
              return (
                <React.Fragment key={student.id}>
                  {displayRecords.map((record, rIndex) => (
                    <tr key={record.id || `empty-${student.id}`} className={`${isSelected ? 'bg-violet-50/50' : 'hover:bg-slate-50/80'} transition-colors`}>
                      {rIndex === 0 && (
                        <>
                          <td className="px-3 py-3 text-center align-top bg-white/50 border-r border-slate-100" rowSpan={rowCount}>
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer mt-1"
                              checked={isSelected}
                              onChange={() => handleSelectStudent(student.id)}
                              tabIndex={0}
                            />
                          </td>
                          <td className="px-2 py-3 text-center text-slate-500 font-medium align-top bg-white/50 border-r border-slate-100" rowSpan={rowCount}>
                            {startIndex + index + 1}
                          </td>
                          <td className="px-3 py-3 align-top bg-white/50 border-r border-slate-100" rowSpan={rowCount}>
                            <div className="font-medium text-slate-900">{student.fullName}</div>
                            <div className="text-[10px] text-slate-500 mb-2">{student.classCode} • {student.studentId}</div>
                            <button
                              onClick={() => handleAddRecord(student)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              <Plus className="w-3 h-3" />
                              Thêm hồ sơ
                            </button>
                          </td>
                        </>
                      )}
                      
                      {/* Image Upload */}
                      <td className="px-3 py-3 text-center">
                        <div className="relative group inline-block">
                          {record.image ? (
                            <div 
                              className="cursor-pointer w-10 h-10 rounded-lg border border-slate-300 hover:border-violet-500 overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                              onClick={() => setViewImage(record.image)}
                              title="Phóng to ảnh"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter') setViewImage(record.image); }}
                            >
                              <img src={record.image} alt="HS" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <label className={`cursor-pointer flex flex-col items-center justify-center w-10 h-10 rounded-lg border-2 border-dashed ${!record.id ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-300 hover:border-violet-500 hover:bg-violet-50'} transition-colors focus-within:ring-2 focus-within:ring-violet-500`}>
                              <FileImage className={`w-4 h-4 ${!record.id ? 'text-slate-300' : 'text-slate-400 group-hover:text-violet-500'}`} />
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, record)}
                                disabled={!record.id}
                              />
                            </label>
                          )}
                          
                          {record.image && (
                            <div className="absolute -right-7 -top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <label className="cursor-pointer bg-white border border-slate-200 text-slate-600 hover:text-violet-600 p-1 rounded shadow-sm" title="Đổi ảnh">
                                <Upload className="w-3.5 h-3.5" />
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleImageUpload(e, record)}
                                />
                              </label>
                              <button 
                                onClick={() => handleUpdate(record, { image: null })}
                                className="bg-white border border-slate-200 text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                title="Xóa ảnh"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Receive Date */}
                      <td className="px-2 py-3">
                        <input 
                          type="date" 
                          className="border border-slate-300 rounded px-2 py-1.5 text-xs w-[120px] focus:ring-2 focus:ring-violet-500 outline-none disabled:bg-slate-50 transition-shadow"
                          value={record.receiveDate || ''}
                          disabled={!record.id}
                          onChange={(e) => record.id ? handleUpdate(record, { receiveDate: e.target.value }) : null}
                        />
                      </td>

                      {/* Forward Date */}
                      <td className="px-2 py-3">
                        <input 
                          type="date" 
                          className="border border-slate-300 rounded px-2 py-1.5 text-xs w-[120px] focus:ring-2 focus:ring-violet-500 outline-none disabled:bg-slate-50 transition-shadow"
                          value={record.forwardDate || ''}
                          disabled={!record.id}
                          onChange={(e) => record.id ? handleUpdate(record, { forwardDate: e.target.value }) : null}
                        />
                      </td>

                      {/* Checkboxes */}
                      {showCols.khoa && (
                        <td className="px-2 py-3 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                              checked={record.toKhoa || false}
                              disabled={!record.id}
                              onChange={(e) => record.id ? handleUpdate(record, { toKhoa: e.target.checked }) : null}
                            />
                          </label>
                        </td>
                      )}
                      {showCols.ketoan && (
                        <td className="px-2 py-3 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                              checked={record.toKeToan || false}
                              disabled={!record.id}
                              onChange={(e) => record.id ? handleUpdate(record, { toKeToan: e.target.checked }) : null}
                            />
                          </label>
                        </td>
                      )}
                      {showCols.daotao && (
                        <td className="px-2 py-3 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                              checked={record.toDaoTao || false}
                              disabled={!record.id}
                              onChange={(e) => record.id ? handleUpdate(record, { toDaoTao: e.target.checked }) : null}
                            />
                          </label>
                        </td>
                      )}
                      {showCols.giamdoc && (
                        <td className="px-2 py-3 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                              checked={record.toGiamDoc || false}
                              disabled={!record.id}
                              onChange={(e) => record.id ? handleUpdate(record, { toGiamDoc: e.target.checked }) : null}
                            />
                          </label>
                        </td>
                      )}

                      {/* Note */}
                      <td className="px-2 py-3">
                        <textarea 
                          rows={1}
                          className="border border-slate-300 rounded px-2 py-1.5 text-xs w-full min-w-[120px] focus:ring-2 focus:ring-violet-500 outline-none resize-none disabled:bg-slate-50 transition-shadow"
                          placeholder={record.id ? "Ghi chú..." : "Vui lòng bấm Thêm hồ sơ trước..."}
                          value={record.note || ''}
                          disabled={!record.id}
                          onChange={(e) => record.id ? handleUpdate(record, { note: e.target.value }) : null}
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-3 text-center">
                        {record.id && (
                          <button
                            onClick={() => handleDeleteRecord(record)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Xóa hồ sơ này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  <tr className="h-0 border-b-2 border-slate-100"></tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {/* Image Viewer Modal */}
      {viewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setViewImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute -top-4 -right-4 bg-white text-slate-900 rounded-full p-2 shadow-lg hover:bg-slate-100 z-10 transition-transform hover:scale-110"
              onClick={() => setViewImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={viewImage} 
              alt="Phóng to" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl bg-white" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
