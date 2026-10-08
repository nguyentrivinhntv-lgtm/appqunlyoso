import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Search, Plus, User, X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Pencil, ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { getApiBaseUrl, getHelperUrl } from '../services/connectionConfig';
import { api } from '../services/api';
import { isAdmin } from '../services/auth';

const getApiUrl = () => `${getApiBaseUrl()}/students`;

const EMPTY_FORM = {
  fullName: '', dob: '', gender: 'Nam', idCard: '', 
  idCardIssueDate: '', idCardIssuePlace: 'Cục CSQLHCVTTXH', 
  schoolName: 'Trường Cao đẳng Đại Việt Sài Gòn',
  schoolCode: 'CSG', department: '', major: '', classCode: '', 
  courseYear: '', educationLevel: 'Cao đẳng', educationType: 'Chính quy',
  studentId: '', phone: '', birthPlace: '', ethnicity: '', courseDuration: '36',
  committee: '', currentYear: '', semester: '', schoolYear: '', tuitionFee: '', discipline: 'Không', soThang: '5'
};

// Auto-map ngành (major) → khoa (department)
function getDepartmentFromMajor(major) {
  if (!major) return '';
  const m = major.toLowerCase().normalize('NFC');

  // Y Dược
  if (['điều dưỡng', 'dược', 'dược liên thông', 'y sĩ đa khoa', 'y sỹ đa khoa',
       'kỹ thuật xét nghiệm y học', 'kỹ thuật hình ảnh y học', 'y học cổ truyền'].some(k => m.includes(k.toLowerCase())))
    return 'Y Dược';

  // Kỹ thuật Công nghệ
  if (['công nghệ kỹ thuật cơ khí', 'công nghệ ô tô', 'điện công nghiệp', 'công nghệ thông tin'].some(k => m.includes(k.toLowerCase())))
    return 'Kỹ thuật Công nghệ';

  // Kinh tế
  if (['kế toán', 'quản trị kinh doanh', 'quản trị khách sạn'].some(k => m.includes(k.toLowerCase())))
    return 'Kinh tế';

  // Ngoại ngữ
  if (['tiếng anh', 'tiếng hàn', 'tiếng nhật', 'tiếng trung'].some(k => m.includes(k.toLowerCase())))
    return 'Ngoại ngữ';

  // Sư phạm
  if (m.includes('giáo dục mầm non') || m.includes('mầm non') || m.includes('giáo dục'))
    return 'Sư phạm';

  return '';
}


// Smart column matcher - uses fuzzy matching to map any Excel header to our fields
const FIELD_MATCHERS = [
  { field: 'fullName',        keywords: ['họ và tên', 'ho va ten', 'hovaten', 'họ tên', 'hoten', 'fullname'] },
  { field: 'lastName',        keywords: ['họ và', 'ho va'] },
  { field: 'firstName',       keywords: ['tên', 'ten', 'name'] },
  { field: 'courseYear',      keywords: ['khóa học', 'khoahoc', 'khóa', 'khoa hoc', 'năm học'] },
  { field: 'studentId',      keywords: ['mssv', 'mã sv', 'masv', 'mã sinh viên', 'ma sinh vien', 'student id'] },
  { field: 'dob',            keywords: ['ngày sinh', 'ngaysinh', 'dob', 'năm sinh', 'ns'] },
  { field: 'classCode',      keywords: ['mã lớp', 'malop', 'lớp', 'lop', 'class'] },
  { field: 'major',          keywords: ['ngành đang học', 'ngành', 'nganh', 'ngành học', 'nganh hoc', 'major'] },
  { field: 'educationType',  keywords: ['hệ', 'he', 'hệ đào tạo', 'loại hình', 'hedaotao'] },
  { field: 'gender',         keywords: ['giới tính', 'gioitinh', 'gioi tinh', 'gender', 'gt'] },
  { field: 'idCard',         keywords: ['cccd', 'cmnd', 'số cccd', 'so cccd', 'cmnd/cccd', 'căn cước'] },
  { field: 'birthPlace',     keywords: ['nơi sinh', 'noisinh', 'noi sinh', 'quê quán'] },
  { field: 'ethnicity',      keywords: ['dân tộc', 'dantoc', 'dan toc'] },
  { field: 'phone',          keywords: ['sđt', 'sdt', 'số điện thoại', 'điện thoại', 'phone', 'đt'] },
  { field: 'idCardIssueDate', keywords: ['ngày cấp', 'ngaycap'] },
  { field: 'idCardIssuePlace', keywords: ['nơi cấp', 'noicap', 'noi cap'] },
  { field: 'schoolName',     keywords: ['tên trường', 'trường', 'truong'] },
  { field: 'schoolCode',     keywords: ['mã trường', 'matruong'] },
  { field: 'department',     keywords: ['khoa', 'department'] },
  { field: 'committee',      keywords: ['ubnd', 'ủy ban', 'uỷ ban', 'phường', 'xã', 'phuong', 'xa'] },
  { field: 'currentYear',    keywords: ['năm thứ', 'nam thu', 'năm học thứ'] },
  { field: 'semester',       keywords: ['học kỳ', 'hoc ky', 'kỳ', 'ky'] },
  { field: 'schoolYear',     keywords: ['năm học', 'nam hoc', 'năm học 20'] },
  { field: 'tuitionFee',     keywords: ['mức thu học phí', 'muc thu hoc phi', 'học phí', 'hoc phi', 'mức thu', 'số tiền học 1 tháng', 'tiền học 1 tháng', '1 tháng'] },
  { field: 'discipline',     keywords: ['kỷ luật', 'ky luat'] },
  { field: 'soThang',        keywords: ['số tháng', 'so thang'] },
];

function normalizeStr(str) {
  return String(str).trim().toLowerCase().normalize('NFC');
}

function matchColumn(header) {
  const normalized = normalizeStr(header);
  if (!normalized || normalized === '' || /^\d+$/.test(normalized)) return null; // skip empty or number-only headers
  
  for (const matcher of FIELD_MATCHERS) {
    for (const keyword of matcher.keywords) {
      if (normalized === keyword || normalized.includes(keyword)) {
        return matcher.field;
      }
    }
  }
  return null;
}

// Detect if a value looks like an Excel serial date number
function excelDateToString(value) {
  if (typeof value === 'number' && value > 10000 && value < 100000) {
    // Excel serial date
    const date = new Date((value - 25569) * 86400 * 1000);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(value).trim();
}

// Field display labels
const FIELD_LABELS = {
  fullName: 'Họ và tên',
  dob: 'Ngày sinh',
  gender: 'Giới tính',
  idCard: 'CCCD',
  idCardIssueDate: 'Ngày cấp',
  idCardIssuePlace: 'Nơi cấp',
  schoolName: 'Tên trường',
  schoolCode: 'Mã trường',
  department: 'Khoa',
  major: 'Ngành',
  classCode: 'Lớp',
  courseYear: 'Khóa học',
  educationLevel: 'Trình độ',
  educationType: 'Hệ ĐT',
  studentId: 'MSSV',
  phone: 'SĐT',
  birthPlace: 'Nơi sinh',
  ethnicity: 'Dân tộc',
};

// Visible columns in preview table
const PREVIEW_COLUMNS = ['fullName', 'dob', 'gender', 'idCard', 'major', 'classCode', 'courseYear', 'educationType', 'studentId'];

export default function StudentList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilterType, setAdvancedFilterType] = useState('none');
  const [advancedFilterValue, setAdvancedFilterValue] = useState('');
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({...EMPTY_FORM});

  // Excel import states
  const [excelSheets, setExcelSheets] = useState([]); // [{name, rowCount, selected}]
  const [workbookRef, setWorkbookRef] = useState(null);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelData, setExcelData] = useState([]); // parsed & mapped data ready for review
  const [importStep, setImportStep] = useState(1); // 1=upload, 2=select sheets, 3=review & edit, 4=done
  const [importStatus, setImportStatus] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [importProgress, setImportProgress] = useState({current: 0, total: 0});
  const [editingCell, setEditingCell] = useState(null); // {rowIdx, field}
  const fileInputRef = useRef(null);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(getApiUrl());
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => { setFormData({...EMPTY_FORM}); setEditingId(null); setIsModalOpen(true); };
  const openEditModal = (student) => { setFormData({...student}); setEditingId(student.id); setIsModalOpen(true); };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    
    // Auto-set department if missing
    const dataToSave = { ...formData };
    if (!dataToSave.department && dataToSave.major) {
      dataToSave.department = getDepartmentFromMajor(dataToSave.major);
    }
    
    // Đặc thù Y sĩ đa khoa khóa 23-25: mã liên thông nhưng gọi chính quy, 24 tháng
    const m = normalizeStr(dataToSave.major);
    const classCode = normalizeStr(dataToSave.classCode);
    const courseYear = normalizeStr(dataToSave.courseYear);
    const eduType = normalizeStr(dataToSave.educationType);
    
    const isYSiDaKhoa = m.includes('y sĩ đa khoa') || m.includes('y sỹ đa khoa');
    const isLienThongCode = eduType.includes('liên thông') || eduType.includes('lien thong') || classCode.includes('lt');
    const isYear23to25 = courseYear.includes('2023') || courseYear.includes('2024') || courseYear.includes('2025') ||
                         classCode.startsWith('23') || classCode.startsWith('24') || classCode.startsWith('25');
    
    if (isYSiDaKhoa && isYear23to25 && isLienThongCode) {
      dataToSave.educationType = 'Chính quy';
      dataToSave.courseDuration = '24';
    }

    try {
      if (editingId) {
        const response = await axios.put(`${getApiUrl()}/${editingId}`, dataToSave);
        setStudents(students.map(s => s.id === editingId ? response.data : s));
        api.logActivity('Sửa thông tin', `Cập nhật sinh viên: ${dataToSave.fullName} (${dataToSave.studentId})`);
      } else {
        const response = await axios.post(getApiUrl(), dataToSave);
        setStudents([...students, response.data]);
        api.logActivity('Thêm sinh viên', `Thêm mới sinh viên: ${dataToSave.fullName} (${dataToSave.studentId})`);
      }
      setIsModalOpen(false); setFormData({...EMPTY_FORM}); setEditingId(null);
      toast.success('Lưu sinh viên thành công!');
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Có lỗi xảy ra khi lưu sinh viên!');
    }
  };

  const handleDeleteStudent = async (id, fullName) => {
    if (!isAdmin()) {
      toast.error('Chỉ Quản trị viên mới được phép xóa sinh viên!');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa sinh viên ${fullName}?`)) {
      try {
        await axios.delete(`${getApiUrl()}/${id}`);
        setStudents(students.filter(s => s.id !== id));
        toast.success('Đã xóa sinh viên');
        api.logActivity('Xóa sinh viên', `Xóa sinh viên: ${fullName}`);
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error('Có lỗi xảy ra khi xóa!');
      }
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ sinh viên trong hệ thống? Hành động này KHÔNG THỂ hoàn tác!')) return;
    
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const total = students.length;
    const studentsCopy = [...students]; // copy lại vì state sẽ thay đổi
    
    setLoading(true);
    setIsExcelModalOpen(true);
    setImportStep(3);
    setImportStatus('importing');
    setImportProgress({current: 0, total});
    setImportMessage(`Đang xóa: 0/${total}`);
    
    // Chờ React render modal lên màn hình trước
    await delay(100);
    
    try {
      // Gọi API bulk-delete trực tiếp ghi vào file json, cực nhanh và không nghẽn
      await axios.post(`${getHelperUrl()}/bulk-delete`);
      
      setImportProgress({current: total, total});
      setImportMessage(`Đang xóa: ${total}/${total}`);
      await delay(100);

      setStudents([]);
      setImportStep(4);
      setImportStatus('success');
      setImportMessage(`Đã xóa toàn bộ ${total} sinh viên!`);
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      setImportStatus('error');
      setImportMessage('Quá trình xóa bị gián đoạn. Đã xóa được một phần.');
      fetchStudents();
    } finally {
      setLoading(false);
    }
  };

  // ========== EXCEL IMPORT ==========
  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFileName(file.name);
    setImportStatus(null); setImportMessage('');
    setExcelData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        setWorkbookRef(workbook);
        
        // List all sheets with row counts
        const sheets = workbook.SheetNames.map(name => {
          const ws = workbook.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          return { name, rowCount: Math.max(0, rows.length - 1), selected: true };
        });
        setExcelSheets(sheets);
        setImportStep(2);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setImportMessage('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file.');
        setImportStatus('error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleSheet = (idx) => {
    setExcelSheets(prev => prev.map((s, i) => i === idx ? {...s, selected: !s.selected} : s));
  };

  const parseSelectedSheets = async () => {
    try {
    if (!workbookRef) return;
    const selectedSheets = excelSheets.filter(s => s.selected);
    if (selectedSheets.length === 0) {
      setImportMessage('Vui lòng chọn ít nhất 1 sheet!');
      setImportStatus('error');
      return;
    }

    let allStudents = [];

    for (const sheet of selectedSheets) {
      const ws = workbookRef.Sheets[sheet.name];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) continue;

      // Find header row: first row that has recognizable column names
      let headerRowIdx = 0;
      let columnMap = {};
      
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i];
        const tempMap = {};
        let matchCount = 0;
        row.forEach((cell, colIdx) => {
          const field = matchColumn(cell);
          if (field && !tempMap[field]) {
            tempMap[field] = colIdx;
            matchCount++;
          }
        });
        if (matchCount >= 2 && matchCount > Object.keys(columnMap).length) {
          headerRowIdx = i;
          columnMap = tempMap;
        }
      }

      if (Object.keys(columnMap).length === 0) continue;

      // Parse data rows
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const student = {...EMPTY_FORM};
        let hasData = false;

        Object.entries(columnMap).forEach(([field, colIdx]) => {
          let value = row[colIdx];
          if (value === undefined || value === null || String(value).trim() === '') return;

          // Convert Excel date serial numbers
          if (field === 'dob' || field === 'idCardIssueDate') {
            value = excelDateToString(value);
          } else {
            value = String(value).trim();
          }
          
          student[field] = value;
          hasData = true;
        });

        // Combine firstName and lastName if fullName is missing
        if (!student.fullName && (student.firstName || student.lastName)) {
          student.fullName = `${student.lastName || ''} ${student.firstName || ''}`.trim();
        }

        // Clean up temporary fields
        delete student.firstName;
        delete student.lastName;

        // Skip rows without a name
        if (!student.fullName || student.fullName.trim() === '') continue;
        // Skip rows that look like headers repeated
        if (normalizeStr(student.fullName).includes('họ và tên') || normalizeStr(student.fullName).includes('ho va ten') || normalizeStr(student.fullName).includes('họ và tên')) continue;
        
        if (hasData) {
          // Auto-set course duration based on education type
          const eduType = normalizeStr(student.educationType);
          let isShort = false;
          
          const cls = normalizeStr(student.classCode || '').replace(/[\s-]/g, '');
          const isSpecial24 = /^(23|24|25)cysct[lv]/.test(cls);

          if (isSpecial24 || eduType.includes('liên thông') || eduType.includes('lien thong') || eduType.includes('văn bằng') || eduType.includes('van bang') || eduType === 'lt' || eduType === 'vb2') {
            student.courseDuration = '24';
            isShort = true;
          } else {
            student.courseDuration = '36';
            isShort = false;
          }

          let startYear;
          const syStr = student.courseYear || student.schoolYear || globalSettings?.schoolYear || '';
          const match = syStr.match(/\d{4}/);
          if (match) {
            startYear = parseInt(match[0]);
          } else {
            startYear = new Date().getFullYear();
          }
          student.courseYear = `${startYear} - ${startYear + (isShort ? 2 : 3)}`;
          
          // Auto-set department (Khoa) from major (Ngành) if not already set
          if (!student.department && student.major) {
            student.department = getDepartmentFromMajor(student.major);
          }
          
          // Tag with sheet info
          student._sheet = sheet.name;
          
          // Lọc trùng (Deduplication)
          let isDuplicate = false;
          
          // Chỉ kiểm tra trùng MSSV (nếu có)
          if (student.studentId && student.studentId.trim() !== '') {
            const hasDuplicateMSSV = students.some(s => s.studentId === student.studentId) || 
                                     allStudents.some(s => s.studentId === student.studentId);
            if (hasDuplicateMSSV) isDuplicate = true;
          }
          
          if (!isDuplicate) {
            allStudents.push(student);
          }
        }
      }
    }

    if (allStudents.length === 0) {
      setImportMessage('Không tìm thấy dữ liệu sinh viên hợp lệ trong các sheet đã chọn.');
      setImportStatus('error');
      return;
    }

    // Import directly — missing fields will be filled in on the Forms page
    setImportStatus('importing');
    const total = allStudents.length;
    setImportProgress({current: 0, total});
    setImportMessage(`Đang nhập 0/${total} sinh viên...`);
    setImportStep(3);

    // Chờ React render modal progress bar trước khi bắt đầu
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(100);

    let successCount = 0;
    
    try {
      // Gửi toàn bộ data lên server phụ (helper server ở port 5001) để ghi 1 lần duy nhất
      // Tránh việc json-server bị nghẽn do nhận hàng ngàn request nhỏ
      const cleanStudents = allStudents.map(({ _sheet, ...s }) => s);
      const res = await axios.post(`${getHelperUrl()}/bulk-students`, cleanStudents);
      successCount = res.data.count;
      
      api.logActivity('Nhập Excel', `Đã nhập thành công ${successCount} sinh viên từ file Excel`);
      
      setImportProgress({current: total, total});
      setImportMessage(`Đang nhập ${total}/${total} sinh viên...`);
      await delay(100);
      
    } catch (error) {
      console.error('Error importing:', error);
      throw new Error('Không thể kết nối đến máy chủ lưu trữ (Port 5001)');
    }

    // Chờ json-server (ở port 5000) tải lại file db.json mới vừa ghi
    await delay(1000);
    await fetchStudents();
    
    setImportStatus('success');
    setImportMessage(`Nhập thành công ${successCount} sinh viên!`);
    setImportStep(4);
    } catch (err) {
      console.error('Lỗi trong quá trình nhập:', err);
      setImportStep(4);
      setImportStatus('error');
      setImportMessage(`Có lỗi xảy ra: ${err.message}. Dữ liệu đã nhập một phần.`);
      await fetchStudents();
    }
  };



  const closeExcelModal = () => {
    // Không cho đóng modal khi đang xử lý
    if (importStep === 3) return;
    setIsExcelModalOpen(false);
    setExcelData([]); setExcelSheets([]); setExcelFileName('');
    setImportStatus(null); setImportMessage('');
    setImportStep(1); setWorkbookRef(null);
    setImportProgress({current: 0, total: 0});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const normalizeStr = (str) => (str || '').toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

  const cleanSearch = normalizeStr(searchTerm);
  const cleanAdvValue = normalizeStr(advancedFilterValue);

  const filteredStudents = students.filter(student => {
    let match = true;
    if (cleanSearch) {
      match = (
        normalizeStr(student.fullName).includes(cleanSearch) ||
        normalizeStr(student.idCard).includes(cleanSearch) ||
        normalizeStr(student.classCode).includes(cleanSearch) ||
        normalizeStr(student.studentId).includes(cleanSearch)
      );
    }
    
    if (match && advancedFilterType !== 'none' && cleanAdvValue) {
      if (advancedFilterType === 'eduType') {
        match = normalizeStr(student.educationType).includes(cleanAdvValue);
      } else if (advancedFilterType === 'courseYear') {
        match = normalizeStr(student.courseYear).includes(cleanAdvValue);
      } else if (advancedFilterType === 'dob') {
        match = normalizeStr(student.dob).includes(cleanAdvValue);
      }
    }
    
    return match;
  });

  const updateField = (field, value) => setFormData(prev => ({...prev, [field]: value}));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách sinh viên</h1>
          <p className="text-slate-500 mt-1">Quản lý thông tin hồ sơ sinh viên toàn trường • <span className="font-medium text-slate-700">{students.length} sinh viên</span></p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 sm:mt-0 justify-end">
          {students.length > 0 && (
            <button onClick={handleDeleteAll} className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm border border-red-200">
              <Trash2 className="w-4 h-4" />
              Xóa tất cả
            </button>
          )}
          {filteredStudents.length > 0 && (
            <button onClick={() => {
              const exportData = filteredStudents.map((s, idx) => ({
                'STT': idx + 1,
                'Họ và tên': s.fullName || '',
                'MSSV': s.studentId || '',
                'Lớp': s.classCode || '',
                'Ngày sinh': s.dob || '',
                'Giới tính': s.gender || '',
                'CCCD': s.idCard || '',
                'Ngành': s.major || '',
                'Khoa': s.department || '',
                'Hệ ĐT': s.educationType || '',
                'Khóa': s.courseYear || '',
                'SĐT': s.phone || '',
              }));
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Danh sách SV');
              XLSX.writeFile(wb, `DanhSachSinhVien_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
              toast.success(`Đã xuất ${filteredStudents.length} sinh viên ra Excel`);
            }} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors font-medium text-sm border border-violet-200">
              <FileSpreadsheet className="w-4 h-4" />
              Xuất Excel
            </button>
          )}
          <button onClick={() => setIsExcelModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm">
            <Upload className="w-4 h-4" />
            Nhập từ Excel
          </button>
          <button onClick={openAddModal} className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium text-sm">
            <Plus className="w-4 h-4" />
            Thêm sinh viên
          </button>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
              <input type="text" className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" placeholder="Tên, CCCD, MSSV, lớp..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <select 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white text-slate-700"
                value={advancedFilterType}
                onChange={e => {
                  setAdvancedFilterType(e.target.value);
                  setAdvancedFilterValue('');
                }}
              >
                <option value="none">-- Chọn tiêu chí lọc --</option>
                <option value="eduType">Lọc Hệ đào tạo</option>
                <option value="courseYear">Lọc Khóa</option>
                <option value="dob">Lọc Ngày sinh</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <input 
                type="text" 
                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400" 
                placeholder={
                  advancedFilterType === 'eduType' ? 'VD: Chính quy' :
                  advancedFilterType === 'courseYear' ? 'VD: 2023' :
                  advancedFilterType === 'dob' ? 'VD: 15/05' :
                  'Chọn tiêu chí trước...'
                } 
                value={advancedFilterValue} 
                onChange={(e) => setAdvancedFilterValue(e.target.value)} 
                disabled={advancedFilterType === 'none'}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-3 border-b border-slate-200">Họ và tên</th>
                <th className="px-6 py-3 border-b border-slate-200">Ngày sinh</th>
                <th className="px-6 py-3 border-b border-slate-200">CCCD</th>
                <th className="px-6 py-3 border-b border-slate-200">Khoa / Ngành</th>
                <th className="px-6 py-3 border-b border-slate-200">Lớp</th>
                <th className="px-6 py-3 border-b border-slate-200">Khóa</th>
                <th className="px-6 py-3 border-b border-slate-200">Hệ ĐT</th>
                <th className="px-6 py-3 border-b border-slate-200">Thời gian</th>
                <th className="px-6 py-3 border-b border-slate-200 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">{student.fullName ? student.fullName.charAt(0) : '?'}</div>
                        <div>
                          <div className="font-medium text-slate-900">{student.fullName}</div>
                          {student.studentId && <div className="text-xs text-slate-400">MSSV: {student.studentId}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">{student.dob}</td>
                    <td className="px-6 py-3">{student.idCard || <span className="text-slate-300 italic">Chưa có</span>}</td>
                    <td className="px-6 py-3">
                      <div>{student.department || ''}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{student.major}</div>
                    </td>
                    <td className="px-6 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{student.classCode}</span></td>
                    <td className="px-6 py-3 text-xs text-slate-500">{student.courseYear}</td>
                    <td className="px-6 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${student.educationType === 'Liên thông' ? 'bg-amber-100 text-amber-700' : student.educationType === 'Văn bằng 2' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{student.educationType || 'Chính quy'}</span></td>
                    <td className="px-6 py-3 text-xs text-slate-500">{student.courseDuration ? `${student.courseDuration} tháng` : ''}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => navigate('/forms', { state: { selectedStudentId: student.id } })} className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 p-1.5 rounded" title="In Hồ Sơ Nhanh"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => openEditModal(student)} className="text-sky-600 hover:text-sky-700 bg-sky-50 p-1.5 rounded" title="Sửa"><Pencil className="w-4 h-4" /></button>
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.fullName)}
                          className={`p-1.5 rounded-lg transition-colors ${isAdmin() ? 'text-red-600 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed'}`}
                          title={isAdmin() ? "Xóa" : "Không có quyền xóa"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500"><User className="w-8 h-8 mx-auto text-slate-300 mb-3" /><p>Không tìm thấy sinh viên nào.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== ADD/EDIT STUDENT MODAL ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center shrink-0 bg-slate-50">
              <h2 className="text-lg font-bold">{editingId ? 'Chỉnh sửa sinh viên' : 'Thêm sinh viên mới'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Thông tin cá nhân */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>Thông tin cá nhân</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label><input required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent" value={formData.fullName} onChange={e => updateField('fullName', e.target.value)} placeholder="VD: Nguyễn Văn A" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label><select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.gender} onChange={e => updateField('gender', e.target.value)}><option>Nam</option><option>Nữ</option></select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh <span className="text-red-500">*</span></label><input required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent" value={formData.dob} onChange={e => updateField('dob', e.target.value)} placeholder="DD/MM/YYYY" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Số CMND/CCCD</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent" value={formData.idCard} onChange={e => updateField('idCard', e.target.value)} placeholder="091205014349" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày cấp CCCD</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.idCardIssueDate} onChange={e => updateField('idCardIssueDate', e.target.value)} placeholder="DD/MM/YYYY" /></div>
                  <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Nơi cấp CCCD</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.idCardIssuePlace} onChange={e => updateField('idCardIssuePlace', e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">SĐT</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.phone} onChange={e => updateField('phone', e.target.value)} /></div>
                </div>
              </div>
              {/* Thông tin trường */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Thông tin trường học</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Tên trường</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.schoolName} onChange={e => updateField('schoolName', e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Mã trường</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.schoolCode} onChange={e => updateField('schoolCode', e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">MSSV</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.studentId} onChange={e => updateField('studentId', e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Khoa</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.department} onChange={e => updateField('department', e.target.value)} placeholder="Y dược" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngành <span className="text-red-500">*</span></label><input required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.major} onChange={e => updateField('major', e.target.value)} placeholder="Y Sĩ Đa Khoa" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Lớp <span className="text-red-500">*</span></label><input required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.classCode} onChange={e => updateField('classCode', e.target.value)} placeholder="23CYS-CTC1" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Khóa học</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.courseYear} onChange={e => updateField('courseYear', e.target.value)} placeholder="2023 - 2026" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Hệ đào tạo</label><select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.educationLevel} onChange={e => updateField('educationLevel', e.target.value)}><option>Cao đẳng</option><option>Trung cấp</option><option>Đại học</option></select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Loại hình đào tạo</label><select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.educationType} onChange={e => { 
                    const v = e.target.value; 
                    updateField('educationType', v); 
                    
                    const cls = (formData.classCode || '').toUpperCase().replace(/[\s-]/g, '');
                    const isSpecial24 = /^(23|24|25)CYSCT[LV]/.test(cls);
                    const isShort = isSpecial24 || (v === 'Liên thông' || v === 'Văn bằng 2');
                    
                    updateField('courseDuration', isShort ? '24' : '36'); 
                    const sy = formData.schoolYear || globalSettings?.schoolYear || '';
                    const match = sy.match(/\d{4}/);
                    const startYear = match ? parseInt(match[0]) : new Date().getFullYear();
                    updateField('courseYear', `${startYear} - ${startYear + (isShort ? 2 : 3)}`);
                  }}><option>Chính quy</option><option>Liên thông</option><option>Văn bằng 2</option></select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Thời gian ĐT (tháng)</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50" value={formData.courseDuration || '36'} onChange={e => updateField('courseDuration', e.target.value)} /></div>
                </div>
              </div>
              {/* Thông tin miễn giảm học phí */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>Thông tin biểu mẫu miễn giảm</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">UBND xã/phường</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.committee || ''} onChange={e => updateField('committee', e.target.value)} placeholder="Nhập tên phường/xã..." /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Kỷ luật</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.discipline || 'Không'} onChange={e => updateField('discipline', e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Năm học</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.schoolYear || ''} onChange={e => {
                    const v = e.target.value;
                    updateField('schoolYear', v);
                    const match = v.match(/\d{4}/);
                    if (match) {
                      const startYear = parseInt(match[0]);
                      const cls = (formData.classCode || '').toUpperCase().replace(/[\s-]/g, '');
                      const isSpecial24 = /^(23|24|25)CYSCT[LV]/.test(cls);
                      const isShort = isSpecial24 || (formData.educationType === 'Liên thông' || formData.educationType === 'Văn bằng 2');
                      updateField('courseYear', `${startYear} - ${startYear + (isShort ? 2 : 3)}`);
                    }
                  }} placeholder="2026 - 2027" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Sinh viên năm thứ</label><input type="number" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.currentYear || ''} onChange={e => updateField('currentYear', e.target.value)} placeholder="1" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Học kỳ</label><input type="number" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.semester || ''} onChange={e => updateField('semester', e.target.value)} placeholder="1" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Số tháng</label><input type="number" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={formData.soThang || ''} onChange={e => updateField('soThang', e.target.value)} placeholder="5" /></div>
                  <div><label className="block text-sm font-medium text-indigo-600 mb-1">HP 1 học kỳ</label><input className="w-full border border-indigo-200 bg-indigo-50 rounded-lg p-2.5 text-sm" value={formData.semesterTuitionFee || ''} onChange={e => {
                    let val = e.target.value.replace(/\D/g, '');
                    val = val ? parseInt(val).toLocaleString('vi-VN') : '';
                    updateField('semesterTuitionFee', val);
                    const semNum = parseInt(val.replace(/\./g, '')) || 0;
                    const th = parseInt(formData.soThang) || 5;
                    const monthVal = semNum > 0 ? Math.round(semNum / th).toLocaleString('vi-VN') : '';
                    updateField('tuitionFee', monthVal);
                  }} placeholder="11.450.000" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Mức thu HP/tháng</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50" value={formData.tuitionFee || ''} onChange={e => {
                    let val = e.target.value.replace(/\D/g, '');
                    val = val ? parseInt(val).toLocaleString('vi-VN') : '';
                    updateField('tuitionFee', val);
                  }} placeholder="2.290.000" /></div>
                </div>
              </div>
              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="px-5 py-2.5 border rounded-lg font-medium hover:bg-slate-50 text-sm">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 text-sm">{editingId ? 'Cập nhật' : 'Lưu sinh viên'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EXCEL IMPORT MODAL ==================== */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header with steps */}
            <div className="px-6 py-4 border-b flex justify-between items-center shrink-0 bg-emerald-50">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold">Nhập dữ liệu từ Excel</h2>
                <div className="flex items-center gap-1 ml-4 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${importStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1. Chọn file</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className={`px-2 py-0.5 rounded-full font-medium ${importStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2. Chọn sheet</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className={`px-2 py-0.5 rounded-full font-medium ${importStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3. Hoàn tất</span>
                </div>
              </div>
              <button onClick={closeExcelModal} className={`text-slate-400 hover:text-slate-600 ${importStep === 3 ? 'invisible' : ''}`}><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* STEP 1: Upload */}
              {importStep === 1 && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-emerald-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelFileChange} />
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="font-semibold text-slate-700 text-lg">Nhấp vào đây để chọn file Excel</p>
                    <p className="text-sm text-slate-400 mt-1">Hỗ trợ: .xlsx, .xls, .csv</p>
                  </div>
                  {importStatus === 'error' && <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium bg-red-50 text-red-700"><AlertCircle className="w-4 h-4" />{importMessage}</div>}
                </div>
              )}

              {/* STEP 2: Select Sheets */}
              {importStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">File: <span className="text-emerald-600">{excelFileName}</span></h3>
                    <p className="text-sm text-slate-500">Chọn các sheet (khóa/hệ) bạn muốn nhập vào phần mềm:</p>
                  </div>
                  <div className="space-y-2">
                    {excelSheets.map((sheet, idx) => (
                      <label key={idx} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${sheet.selected ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="checkbox" checked={sheet.selected} onChange={() => toggleSheet(idx)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{sheet.name}</div>
                          <div className="text-xs text-slate-500">{sheet.rowCount} dòng dữ liệu</div>
                        </div>
                        {sheet.selected && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      </label>
                    ))}
                  </div>
                  {importStatus === 'error' && <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium bg-red-50 text-red-700"><AlertCircle className="w-4 h-4" />{importMessage}</div>}
                </div>
              )}

              {/* STEP 3: Importing... with progress bar */}
              {importStep === 3 && (
                <div className="text-center py-12 px-8">
                  <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-6"></div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Đang xử lý dữ liệu...</h3>
                  <p className="text-slate-500 mb-6">{importMessage}</p>
                  {importProgress.total > 0 && (
                    <div className="max-w-md mx-auto">
                      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-4 rounded-full transition-all duration-300 ease-out"
                          style={{width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`}}
                        ></div>
                      </div>
                      <p className="text-sm font-semibold text-emerald-700 mt-3">
                        {Math.round((importProgress.current / importProgress.total) * 100)}% — {importProgress.current}/{importProgress.total}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Done */}
              {importStep === 4 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Nhập dữ liệu thành công!</h3>
                  <p className="text-slate-500">{importMessage}</p>
                  <p className="text-sm text-slate-400 mt-2">Thông tin còn thiếu (CCCD, Ngày cấp...) sẽ được bổ sung khi làm hồ sơ.</p>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                {importStep === 2 && (
                  <button onClick={() => setImportStep(1)} className="px-4 py-2 border rounded-lg font-medium hover:bg-slate-100 text-sm text-slate-600">← Quay lại</button>
                )}
              </div>
              <div className="flex gap-3">
                {importStep === 3 ? (
                  <p className="text-sm text-amber-600 font-medium py-2">⚠ Vui lòng không đóng cửa sổ này!</p>
                ) : (
                  <button type="button" onClick={closeExcelModal} className="px-5 py-2.5 border rounded-lg font-medium hover:bg-slate-100 text-sm">
                    {importStep === 4 ? 'Đóng' : 'Hủy'}
                  </button>
                )}
                {importStep === 2 && (
                  <button onClick={parseSelectedSheets} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 text-sm inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Nhập dữ liệu ngay
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
