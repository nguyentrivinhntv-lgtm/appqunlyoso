import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Trash2, Printer, ShoppingCart, Info, Search, Filter, Pencil } from 'lucide-react';
import GiayXacNhanForm from '../forms/GiayXacNhanForm';
import GiayXacNhanMienGiamForm from '../forms/GiayXacNhanMienGiamForm';
import DuToanKinhPhiForm from '../forms/DuToanKinhPhiForm';
import DanhSachSinhVienForm from '../forms/DanhSachSinhVienForm';
import DanhSachKiemTraHocPhiForm from '../forms/DanhSachKiemTraHocPhiForm';
import DanhSachNghiDinh238MoiForm from '../forms/DanhSachNghiDinh238MoiForm';
import { exportQueue } from '../services/exportWord';
import { FileDown } from 'lucide-react';
import { getDisplayDepartment, getDisplayNhomNganh } from '../utils/studentUtils';
import { api } from '../services/api';

export default function PrintQueue() {
  const [queue, setQueue] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormId, setFilterFormId] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);
  const hasInitialLoaded = useRef(false);
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

  const [globalSettings, setGlobalSettings] = useState(() => {
    const saved = localStorage.getItem('globalSettings');
    return saved ? JSON.parse(saved) : {
      semester: 'Học kỳ 1',
      schoolYear: '2026 - 2027',
      tuitionFee: '2.268.000',
      soThang: '05',
      signDate: '2026-08-18'
    };
  });

  useEffect(() => {
    loadQueue();
    const handleStorageChange = () => loadQueue();
    window.addEventListener('printQueueUpdated', handleStorageChange);
    return () => window.removeEventListener('printQueueUpdated', handleStorageChange);
  }, []);

  const loadQueue = async () => {
    try {
      const saved = await api.getPrintQueue();
      setQueue(saved);
      setSelectedIds(prev => {
        if (!hasInitialLoaded.current && saved.length > 0) {
          hasInitialLoaded.current = true;
          return saved.map(i => i.id);
        }
        return prev.filter(id => saved.some(item => item.id === id));
      });
    } catch (e) {
      console.error('Lỗi khi tải hàng đợi:', e);
    }
  };

  const removeFromQueue = async (id) => {
    const newQueue = queue.filter(item => item.id !== id);
    setQueue(newQueue);
    await api.replacePrintQueue(newQueue);
    toast.success('Đã xóa khỏi hàng đợi');
    window.dispatchEvent(new Event('printQueueUpdated'));
  };

  const clearQueue = async () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ hàng đợi?')) {
      setQueue([]);
      setSelectedIds([]);
      await api.replacePrintQueue([]);
      toast.success('Đã làm trống hàng đợi');
      window.dispatchEvent(new Event('printQueueUpdated'));
    }
  };

  const removeSelected = async () => {
    if (window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} hồ sơ đã chọn khỏi hàng đợi?`)) {
      const newQueue = queue.filter(item => !selectedIds.includes(item.id));
      setQueue(newQueue);
      setSelectedIds([]);
      await api.replacePrintQueue(newQueue);
      toast.success(`Đã xóa ${selectedIds.length} hồ sơ`);
      window.dispatchEvent(new Event('printQueueUpdated'));
    }
  };

  const handleEditClick = (item) => {
    setEditingItem({ ...item, student: { ...item.student } });
  };

  const updateEditingField = (field, value) => {
    setEditingItem(prev => ({
      ...prev,
      student: { ...prev.student, [field]: value }
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const newQueue = queue.map(item => item.id === editingItem.id ? editingItem : item);
    setQueue(newQueue);
    await api.replacePrintQueue(newQueue);
    setEditingItem(null);
    toast.success('Đã cập nhật thông tin hồ sơ trong hàng đợi');
    window.dispatchEvent(new Event('printQueueUpdated'));
  };

  const getFormName = (formId) => {
    switch (formId) {
      case 'all_forms': return 'Trọn Bộ Hồ Sơ (Cũ)';
      case 'all_forms_multi': return 'Trọn Bộ (Nhiều HK - Cũ)';
      case 'all_forms_nd238_moi': return 'Trọn Bộ NĐ 238 (Mới)';
      case 'all_forms_nd238_moi_multi': return 'Trọn Bộ NĐ 238 (Nhiều HK)';
      case 'giay_xac_nhan': return 'Giấy Xác Nhận (Phụ Lục V)';
      case 'giay_xac_nhan_mien_giam': return 'Giấy XN Miễn Giảm (Phụ Lục I)';
      case 'du_toan': return 'Dự Toán Kinh Phí (Phụ Lục VI)';
      case 'danh_sach': return 'Danh Sách SV Kèm Theo (Cũ)';
      case 'danh_sach_nd238_moi': return 'Danh Sách SV Hưởng NĐ 238 (Mới)';
      case 'danh_sach_nd238_moi_multi': return 'Danh Sách NĐ 238 (Mới - Nhiều HK)';
      case 'kiem_tra_hoc_phi': return 'Danh Sách SV Kiểm Tra Học Phí';
      default: return 'Không xác định';
    }
  };

  const handlePrintAll = async () => {
    const itemsToPrint = queue.filter(item => selectedIds.includes(item.id));
    if (itemsToPrint.length === 0) return;
    
    setIsPrinting(true);
    const toastId = toast.loading(`Đang chuẩn bị in ${itemsToPrint.length} hồ sơ...`);
    
    setTimeout(async () => {
      try {
        const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
        
        if (!isElectron) {
          const originalTitle = document.title;
          document.title = `Hang_Doi_In_${queue.length}_Ho_So_${date}`;
          window.print();
          document.title = originalTitle;
        } else {
          const result = await window.electronAPI.printToPDF({
            landscape: false,
            fileName: `Hang_Doi_In_${itemsToPrint.length}_Ho_So_${date}.pdf`,
          });
          if (result.success) {
            toast.success(`✅ Đã xuất 1 file PDF chứa ${itemsToPrint.length} hồ sơ!`, { id: toastId, duration: 5000 });
            
            // Hỏi để xóa queue đã in
            if (window.confirm('Đã in thành công! Bạn có muốn xóa các hồ sơ vừa in khỏi hàng đợi không?')) {
              const newQueue = queue.filter(item => !selectedIds.includes(item.id));
              setQueue(newQueue);
              setSelectedIds([]);
              await api.replacePrintQueue(newQueue);
              window.dispatchEvent(new Event('printQueueUpdated'));
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi in hàng đợi', { id: toastId });
      } finally {
        setIsPrinting(false);
        toast.dismiss(toastId);
      }
    }, 1500);
  };

  const handleExportWordAll = async (exportType = 'all') => {
    const itemsToExport = queue.filter(item => selectedIds.includes(item.id));
    if (itemsToExport.length === 0) return;
    
    // For 'kiem_tra_hp', 'landscape_xacnhan', and 'nd238', we accept all items because it aggregates student data
    const supportWordForms = (exportType === 'kiem_tra_hp' || exportType === 'landscape_xacnhan' || exportType === 'nd238')
      ? itemsToExport
      : itemsToExport.filter(item => item.formId !== 'kiem_tra_hoc_phi');
      
    if (supportWordForms.length === 0) {
      toast.error('Trong hàng đợi không có biểu mẫu nào hỗ trợ xuất Word.');
      return;
    }

    const typeText = exportType === 'portrait' ? '3 trang đầu' : 
                     exportType === 'landscape_xacnhan' ? 'danh sách xác nhận' :
                     exportType === 'kiem_tra_hp' ? 'danh sách kiểm tra học phí' :
                     exportType === 'nd238' ? 'danh sách NĐ 238' : 'trang danh sách';
    const toastId = toast.loading(`Đang tạo 1 file Word (${typeText}) gộp chung ${supportWordForms.length} hồ sơ...`);
    try {
      // Collect all unique students in the selected items
      const allQueueStudents = Array.from(new Map(itemsToExport.map(item => [item.student.id, item.student])).values());
      
      // Build data array
      const queueItemsForWord = supportWordForms.map(item => {
        const s = item.student;
        // Ưu tiên dùng settings đã lưu kèm trong queue item (thời điểm thêm vào hàng đợi)
        const itemSettings = item.savedSettings || globalSettings;
        
        let dateStr = 'ngày ... tháng ... năm 2026';
        const signDate = itemSettings.signDate || globalSettings.signDate;
        if (signDate) {
          const parts = signDate.split('-');
          if (parts.length === 3) {
            dateStr = `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
          }
        }
        let formattedDateWithCity = `Tp. Hồ Chí Minh, ${dateStr}`;
        
        // Xây dựng globalSettings riêng cho item này (bao gồm multiSemesters đã lưu)
        const itemGlobalSettings = {
          ...globalSettings,
          ...itemSettings,
          multiSemesters: item.multiSemesters || globalSettings.multiSemesters || [],
        };
        
        return {
          formId: item.formId,
          allStudents: allQueueStudents,
          itemGlobalSettings: itemGlobalSettings, // Truyền settings riêng cho mỗi item
          data: {
            fullName: s.fullName || '',
            dob: s.dob || '',
            gender: s.gender || '',
            idCard: s.idCard || '',
            idCardIssueDate: s.idCardIssueDate || '',
            idCardIssuePlace: s.idCardIssuePlace || '',
            schoolName: s.schoolName || 'Trường Cao đẳng Đại Việt Sài Gòn',
            schoolCode: s.schoolCode || 'CSG',
            department: getDisplayDepartment(s.department),
            major: s.major || '',
            classCode: s.classCode || '',
            courseYear: s.courseYear || '',
            educationLevel: s.educationLevel || 'Cao đẳng',
            educationType: s.educationType || '',
            studentId: s.studentId || '',
            committee: s.committee || itemSettings.committee || globalSettings.committee || '',
            
            currentYear: s.currentYear || itemSettings.currentYear || globalSettings.currentYear || '1',
            semester: s.semester || itemSettings.semester || globalSettings.semester || '1',
            schoolYear: s.schoolYear || itemSettings.schoolYear || globalSettings.schoolYear || '2026 - 2027',
            tuitionFee: s.tuitionFee || itemSettings.tuitionFee || globalSettings.tuitionFee || '',
            discipline: s.discipline || globalSettings.discipline || 'Không',
            courseDuration: s.courseDuration || (s.educationType === 'Liên thông' || s.educationType === 'Văn bằng 2' ? '24' : '36'),
            dateStr: dateStr,
            dateStrFull: formattedDateWithCity,
            mucThu: s.tuitionFee || itemSettings.tuitionFee || globalSettings.tuitionFee || '2.290.000',
            soThang: s.soThang || itemSettings.soThang || globalSettings.soThang || '05',
            hocKy: `Học kỳ ${s.semester || itemSettings.semester || globalSettings.semester || '1'}`,
            namHoc: s.schoolYear || itemSettings.schoolYear || globalSettings.schoolYear || '2026 - 2027',
            nhomNganh: getDisplayNhomNganh(s.department, s.major, s.nhomNganh),
            reason: 'Bổ túc hồ sơ Nghị định 238./.',
            tuitionStatus: s.tuitionStatus || '',
            invoiceNumber: s.invoiceNumber || '',
          }
        };
      });

      const suffix = exportType === 'portrait' ? '_3TrangDau' : 
                     exportType === 'landscape_xacnhan' ? '_DanhSachXacNhan' : 
                     exportType === 'kiem_tra_hp' ? '_KiemTraHocPhi' : 
                     exportType === 'nd238' ? '_NghiDinh238' : '_TrangDanhSach';
      const customFileName = `Hang_Doi_Ho_So${suffix}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.docx`;
      const fileName = await exportQueue(queueItemsForWord, globalSettings, customFileName, exportType);
      toast.success(`✅ Đã xuất thành công: ${fileName}`, { id: toastId, duration: 5000 });
      
      // Không tự động hỏi xóa hàng đợi nữa, vì người dùng cần xuất thêm trang Danh sách (file thứ 2)
      // Họ có thể tự bấm nút "Làm trống" trên giao diện khi đã xong việc.
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xuất Word: ' + err.message, { id: toastId });
    }
  };

  const getLocalDateString = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const filteredQueue = queue.filter(item => {
    const matchesSearch = item.student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.student.studentId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterFormId === 'all' || item.formId === filterFormId;
    const matchesDate = !filterDate || getLocalDateString(item.addedAt) === filterDate;
    return matchesSearch && matchesFilter && matchesDate;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const newSelected = [...new Set([...selectedIds, ...filteredQueue.map(item => item.id)])];
      setSelectedIds(newSelected);
    } else {
      const filteredIds = filteredQueue.map(item => item.id);
      setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 print:bg-white print:h-auto print:block">
      <div className="p-6 border-b border-gray-200 bg-white flex flex-col gap-4 hide-on-print shadow-sm z-10 relative">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingCart className="text-primary-600" /> 
              Hàng Đợi In
            </h1>
            <p className="text-gray-500 mt-1">Chọn, tìm kiếm và xuất/in các bộ hồ sơ trong hàng đợi.</p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={removeSelected}
                  disabled={isPrinting}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Xóa đã chọn ({selectedIds.length})
                </button>
              )}
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  disabled={isPrinting}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Làm trống tất cả
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExportWordAll('portrait')}
                disabled={selectedIds.length === 0 || isPrinting}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/30 disabled:opacity-50 font-bold text-sm"
                title="Chỉ xuất 3 trang đầu (Giấy xác nhận, Giấy miễn giảm, Dự toán) của các hồ sơ đã chọn"
              >
                <FileDown className="w-5 h-5" />
                XUẤT WORD (3 TRANG ĐẦU)
              </button>
              <button
                onClick={() => handleExportWordAll('landscape')}
                disabled={selectedIds.length === 0 || isPrinting}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-md shadow-purple-500/30 disabled:opacity-50 font-bold text-sm"
                title="Chỉ xuất trang cuối (Danh sách sinh viên kèm theo) của bộ hồ sơ"
              >
                <FileDown className="w-5 h-5" />
                XUẤT WORD (DS MIỄN GIẢM)
              </button>
              <button
                onClick={() => handleExportWordAll('kiem_tra_hp')}
                disabled={selectedIds.length === 0 || isPrinting}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/30 disabled:opacity-50 font-bold text-sm"
                title="Chỉ xuất trang Danh sách kiểm tra học phí"
              >
                <FileDown className="w-5 h-5" />
                XUẤT WORD (DS KIỂM TRA HP)
              </button>
              <button
                onClick={() => handleExportWordAll('landscape_xacnhan')}
                disabled={selectedIds.length === 0 || isPrinting}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/30 disabled:opacity-50 font-bold text-sm"
                title="Xuất Danh sách sinh viên xin giấy xác nhận"
              >
                <FileDown className="w-5 h-5" />
                XUẤT WORD (DS XÁC NHẬN)
              </button>
              <button
                onClick={() => handleExportWordAll('nd238')}
                disabled={selectedIds.length === 0 || isPrinting}
                className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors shadow-md shadow-amber-500/30 disabled:opacity-50 font-bold text-sm"
                title="Chỉ xuất trang Danh sách NĐ 238"
              >
                <FileDown className="w-5 h-5" />
                XUẤT WORD (DS NĐ 238)
              </button>
              <button
                onClick={handlePrintAll}
                disabled={selectedIds.length === 0 || isPrinting}
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/30 disabled:opacity-50 font-bold"
              >
                <Printer className="w-5 h-5" />
                IN PDF ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>

        {/* Thanh công cụ Tìm kiếm và Lọc */}
        <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã số sinh viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border-slate-200 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="relative w-48 shrink-0 flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">Ngày:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
            />
          </div>
          <div className="relative w-56 shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterFormId}
              onChange={(e) => setFilterFormId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border-slate-200 text-sm focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
            >
              <option value="all">Tất cả loại form</option>
              <option value="all_forms">Trọn Bộ Hồ Sơ (Cũ)</option>
              <option value="all_forms_multi">Trọn Bộ (Nhiều HK - Cũ)</option>
              <option value="all_forms_nd238_moi">Trọn Bộ NĐ 238 (Mới)</option>
              <option value="all_forms_nd238_moi_multi">Trọn Bộ NĐ 238 (Nhiều HK)</option>
              <option value="giay_xac_nhan">Giấy Xác Nhận (Phụ Lục V)</option>
              <option value="giay_xac_nhan_mien_giam">Giấy XN Miễn Giảm (Phụ Lục I)</option>
              <option value="du_toan">Dự Toán Kinh Phí (Phụ Lục VI)</option>
              <option value="danh_sach">Danh Sách SV Kèm Theo (Cũ)</option>
              <option value="danh_sach_nd238_moi">Danh Sách NĐ 238 (Mới)</option>
              <option value="danh_sach_nd238_moi_multi">Danh Sách NĐ 238 (Nhiều HK)</option>
              <option value="kiem_tra_hoc_phi">DS SV Kiểm Tra Học Phí</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 relative print:p-0 print:overflow-visible print:block">
        {!isPrinting && queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 hide-on-print">
            <ShoppingCart className="w-20 h-20 mb-4 text-slate-200" />
            <p className="text-lg font-medium text-slate-500">Hàng đợi in đang trống</p>
            <p className="text-sm mt-2">Hãy vào mục "In Hồ Sơ" và chọn "Lưu Hàng Đợi" để thêm hồ sơ vào đây.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hide-on-print max-w-4xl mx-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                        checked={filteredQueue.length > 0 && filteredQueue.every(item => selectedIds.includes(item.id))}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sinh viên</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">MSSV / Lớp</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Loại Form</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian thêm</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                        Không tìm thấy hồ sơ nào phù hợp với điều kiện lọc.
                      </td>
                    </tr>
                  ) : filteredQueue.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{item.student.fullName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-500">{item.student.studentId}</div>
                        <div className="text-xs text-slate-400">{item.student.classCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                          {getFormName(item.formId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(item.addedAt).toLocaleTimeString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Sửa hồ sơ"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-blue-50 text-blue-700 text-sm flex gap-3 border-t border-blue-100">
                <Info className="w-5 h-5 shrink-0" />
                <p><strong>Lưu ý:</strong> Dữ liệu hàng đợi được lưu tạm trên máy. Nếu bạn tắt hoàn toàn ứng dụng, hàng đợi có thể bị làm trống. Hãy bấm in ngay sau khi gom đủ bộ.</p>
              </div>
            </div>

            {/* Vùng ẩn dùng để vẽ form ra giấy in */}
            {isPrinting && (
              <div ref={printRef} className="w-full flex justify-center print:block opacity-0 print:opacity-100 absolute top-0 left-0 print:relative pointer-events-none print:pointer-events-auto">
                <div className="w-full flex flex-col items-center print:block">
                  {/* Danh sách kiểm tra học phí (in gộp tất cả sinh viên được chọn) */}
                  {queue.some(item => selectedIds.includes(item.id) && item.formId === 'kiem_tra_hoc_phi') && (
                    <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                      <div className="p-[20mm] print:p-[10mm]">
                        <DanhSachKiemTraHocPhiForm 
                          studentsList={queue.filter(item => selectedIds.includes(item.id) && item.formId === 'kiem_tra_hoc_phi').map(item => item.student)} 
                          globalSettings={globalSettings} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Danh sách NĐ 238 Mới (in gộp) */}
                  {queue.some(item => selectedIds.includes(item.id) && (item.formId === 'danh_sach_nd238_moi' || item.formId === 'danh_sach_nd238_moi_multi')) && (
                    <div className="bg-white w-full max-w-[297mm] shadow-md print:shadow-none min-h-[210mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                      <div className="print-landscape-content p-[5mm] print:p-[3mm]">
                        <DanhSachNghiDinh238MoiForm 
                          queueItems={queue.filter(item => selectedIds.includes(item.id) && (item.formId === 'danh_sach_nd238_moi' || item.formId === 'danh_sach_nd238_moi_multi'))} 
                          globalSettings={globalSettings} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Render từng hồ sơ cá nhân */}
                  {queue.filter(item => selectedIds.includes(item.id) && item.formId !== 'kiem_tra_hoc_phi' && item.formId !== 'danh_sach_nd238_moi' && item.formId !== 'danh_sach_nd238_moi_multi').map((item) => {
                    // Dùng settings đã lưu kèm trong queue item (thời điểm thêm vào hàng đợi) thay vì globalSettings hiện tại
                    const effectiveSettings = item.savedSettings ? {...globalSettings, ...item.savedSettings} : globalSettings;
                    
                    return (
                      <div key={`print-${item.id}`} className="w-full flex flex-col items-center print:block">
                        {/* Trọn bộ nhiều học kỳ */}
                        {(item.formId === 'all_forms_multi' || item.formId === 'all_forms_nd238_moi_multi') && (effectiveSettings.multiSemesters || []).map((sem) => {
                          const multiSettings = {...effectiveSettings, semester: sem.semester, schoolYear: sem.schoolYear, soThang: sem.soThang, tuitionFee: sem.tuitionFee, currentYear: sem.currentYear || effectiveSettings.currentYear};
                          return (
                            <div key={sem.id} className="space-y-8 print:space-y-0 w-full flex flex-col items-center print:block">
                              <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                                <GiayXacNhanMienGiamForm student={item.student} globalSettings={multiSettings} />
                              </div>
                              <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                                <DuToanKinhPhiForm student={item.student} globalSettings={multiSettings} />
                              </div>
                              {item.formId === 'all_forms_multi' ? (
                                <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none min-h-[297mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                                  <div className="print-landscape-content p-[20mm] print:p-[10mm]">
                                    <DanhSachSinhVienForm 
                                      student={item.student} 
                                      studentsList={[item.student]}
                                      globalSettings={multiSettings} 
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white w-full max-w-[297mm] shadow-md print:shadow-none min-h-[210mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                                  <div className="print-landscape-content p-[15mm] print:p-[5mm]">
                                    <DanhSachNghiDinh238MoiForm 
                                      queueItems={[{ student: item.student, formId: 'danh_sach_nd238_moi_multi', itemGlobalSettings: multiSettings }]} 
                                      globalSettings={multiSettings} 
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Các biểu mẫu riêng lẻ hoặc trọn bộ (phần Giấy tờ cá nhân) */}
                        {(item.formId === 'giay_xac_nhan' || item.formId === 'all_forms' || item.formId === 'all_forms_multi' || item.formId === 'all_forms_nd238_moi' || item.formId === 'all_forms_nd238_moi_multi') && (
                          <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                            <GiayXacNhanForm student={item.student} globalSettings={effectiveSettings} />
                          </div>
                        )}
                        {(item.formId === 'giay_xac_nhan_mien_giam' || item.formId === 'all_forms' || item.formId === 'all_forms_nd238_moi') && (
                          <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                            <GiayXacNhanMienGiamForm student={item.student} globalSettings={effectiveSettings} />
                          </div>
                        )}
                        {(item.formId === 'du_toan' || item.formId === 'all_forms' || item.formId === 'all_forms_nd238_moi') && (
                          <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                            <DuToanKinhPhiForm student={item.student} globalSettings={effectiveSettings} />
                          </div>
                        )}
                        
                        {/* Danh sách cá nhân (mẫu cũ) */}
                        {(item.formId === 'danh_sach' || item.formId === 'all_forms') && (
                          <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none min-h-[297mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                            <div className="print-landscape-content p-[20mm] print:p-[10mm]">
                              <DanhSachSinhVienForm 
                                student={item.student} 
                                studentsList={[item.student]}
                                globalSettings={effectiveSettings} 
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Danh sách cá nhân (mẫu mới) */}
                        {(item.formId === 'all_forms_nd238_moi') && (
                          <div className="bg-white w-full max-w-[297mm] shadow-md print:shadow-none min-h-[210mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                            <div className="print-landscape-content p-[15mm] print:p-[5mm]">
                              <DanhSachNghiDinh238MoiForm 
                                queueItems={[{ student: item.student, formId: 'danh_sach_nd238_moi', itemGlobalSettings: effectiveSettings }]} 
                                globalSettings={effectiveSettings} 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-gray-800">Chỉnh sửa hồ sơ: {getFormName(editingItem.formId)}</h2>
              <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700 font-bold text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="edit-queue-form" onSubmit={handleSaveEdit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                  <input required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.fullName || ''} onChange={e => updateEditingField('fullName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MSSV</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.studentId || ''} onChange={e => updateEditingField('studentId', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.dob || ''} onChange={e => updateEditingField('dob', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white" 
                    value={editingItem.student.gender || ''} 
                    onChange={e => updateEditingField('gender', e.target.value)}
                  >
                    <option value="">-- Chọn --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số CMND/CCCD</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.idCard || ''} onChange={e => updateEditingField('idCard', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày cấp</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.idCardIssueDate || ''} onChange={e => updateEditingField('idCardIssueDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nơi cấp</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.idCardIssuePlace || ''} onChange={e => updateEditingField('idCardIssuePlace', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Khoa</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.department || ''} onChange={e => updateEditingField('department', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngành</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.major || ''} onChange={e => updateEditingField('major', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm Ngành</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.nhomNganh || ''} onChange={e => updateEditingField('nhomNganh', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.classCode || ''} onChange={e => updateEditingField('classCode', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Khóa học</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.courseYear || ''} onChange={e => updateEditingField('courseYear', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bậc đào tạo</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.educationLevel || ''} onChange={e => updateEditingField('educationLevel', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại hình ĐT</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.educationType || ''} onChange={e => updateEditingField('educationType', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian khóa học</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.courseDuration || ''} onChange={e => updateEditingField('courseDuration', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số tháng</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.soThang || ''} onChange={e => updateEditingField('soThang', e.target.value)} placeholder="05" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-700 mb-1">Học phí 1 kỳ</label>
                  <input 
                    className="w-full border border-indigo-300 bg-indigo-50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    value={editingItem.student.semesterTuitionFee || ''} 
                    placeholder="Nhập để tự chia tháng"
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      val = val ? parseInt(val).toLocaleString('vi-VN') : '';
                      updateEditingField('semesterTuitionFee', val);
                      
                      // Auto calculate 1 month
                      const semNum = parseInt(val.replace(/\./g, '')) || 0;
                      const th = parseInt(editingItem.student.soThang || globalSettings.soThang || '5');
                      const monthVal = semNum > 0 ? Math.round(semNum / th).toLocaleString('vi-VN') : '';
                      updateEditingField('tuitionFee', monthVal);
                    }} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mức thu (1 tháng)</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-red-600 font-bold" value={editingItem.student.tuitionFee || ''} onChange={e => updateEditingField('tuitionFee', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái học phí</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.tuitionStatus || ''} onChange={e => updateEditingField('tuitionStatus', e.target.value)} placeholder="VD: Đã đóng, Còn nợ..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số hóa đơn</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.invoiceNumber || ''} onChange={e => updateEditingField('invoiceNumber', e.target.value)} placeholder="Nhập số hóa đơn..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kỷ luật</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editingItem.student.discipline || ''} onChange={e => updateEditingField('discipline', e.target.value)} />
                </div>
                <div className="col-span-2 md:col-span-3 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2 flex gap-2">
                  <Info className="w-5 h-5 shrink-0" />
                  <p><strong>Lưu ý:</strong> Việc chỉnh sửa này chỉ áp dụng tạm thời trên hồ sơ hiện tại để in/xuất Word. Nó không làm thay đổi thông tin lưu trong CSDL sinh viên.</p>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-slate-50">
              <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors">Hủy bỏ</button>
              <button type="submit" form="edit-queue-form" className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm transition-colors">Lưu hồ sơ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
