import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../services/api';
import SidebarSettings from '../components/FormGenerator/SidebarSettings';
import StudentSearch from '../components/FormGenerator/StudentSearch';
import FormsPreview from '../components/FormGenerator/FormsPreview';

const FORMS = [
  { id: 'all_forms', name: 'Trọn Bộ Hồ Sơ (In cả 4 biểu mẫu)' },
  { id: 'all_forms_multi', name: 'Trọn Bộ Hồ Sơ (Nhiều Học Kỳ)' },
  { id: 'all_forms_nd238_moi', name: 'Trọn Bộ Hồ Sơ NĐ 238 (Mới)' },
  { id: 'all_forms_nd238_moi_multi', name: 'Trọn Bộ NĐ 238 (Mới - Nhiều HK)' },
  { id: 'giay_xac_nhan', name: 'Giấy Xác Nhận (Ngành nghề nặng nhọc)' },
  { id: 'giay_xac_nhan_mien_giam', name: 'Giấy Xác Nhận (Phụ Lục V - Miễn giảm học phí)' },
  { id: 'du_toan', name: 'Dự Toán Kinh Phí Cấp Bù (Cá nhân)' },
  { id: 'danh_sach', name: 'Danh Sách Sinh Viên Giảm 70% Học Phí (Cũ)' },
  { id: 'danh_sach_nd238_moi', name: 'Danh Sách SV Hưởng NĐ 238 (Mới)' },
  { id: 'danh_sach_nd238_moi_multi', name: 'Danh Sách SV Hưởng NĐ 238 (Mới - Nhiều Học Kỳ)' },
  { id: 'kiem_tra_hoc_phi', name: 'Danh Sách SV Kiểm Tra Học Phí' }
];

export default function FormGenerator() {
  const location = useLocation();
  const loadState = (key, defaultVal) => {
    const saved = localStorage.getItem('fg_' + key);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultVal;
  };

  const [selectedForm, setSelectedForm] = useState(() => loadState('selectedForm', FORMS[0].id));
  const [searchTerm, setSearchTerm] = useState(() => loadState('searchTerm', ''));
  const [advancedFilterType, setAdvancedFilterType] = useState(() => loadState('advancedFilterType', 'none'));
  const [advancedFilterValue, setAdvancedFilterValue] = useState(() => loadState('advancedFilterValue', ''));
  const [printFilter, setPrintFilter] = useState(() => loadState('printFilter', 'all'));
  const [selectedStudent, setSelectedStudent] = useState(() => loadState('selectedStudent', null));
  const [students, setStudents] = useState([]);
  const [processedProfiles, setProcessedProfiles] = useState([]);
  const [missingFields, setMissingFields] = useState([]);
  const [customKiemTraList, setCustomKiemTraList] = useState(() => loadState('customKiemTraList', [])); // Selected students for kiem_tra_hoc_phi
  const printRef = useRef(null);
  
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);

  useEffect(() => {
    localStorage.setItem('fg_selectedForm', JSON.stringify(selectedForm));
    localStorage.setItem('fg_searchTerm', JSON.stringify(searchTerm));
    localStorage.setItem('fg_advancedFilterType', JSON.stringify(advancedFilterType));
    localStorage.setItem('fg_advancedFilterValue', JSON.stringify(advancedFilterValue));
    localStorage.setItem('fg_printFilter', JSON.stringify(printFilter));
    localStorage.setItem('fg_selectedStudent', JSON.stringify(selectedStudent));
    localStorage.setItem('fg_customKiemTraList', JSON.stringify(customKiemTraList));
  }, [selectedForm, searchTerm, advancedFilterType, advancedFilterValue, printFilter, selectedStudent, customKiemTraList]);

  useEffect(() => {
    if (location.state?.reprintProfile && students.length > 0) {
      const p = location.state.reprintProfile;
      const s = students.find(s => s.id === p.studentId);
      if (s) {
        setSelectedStudent(s);
        setSelectedForm(p.formId);
        if (p.formId === 'all_forms_multi') {
          updateGlobalSetting('multiSemesters', p.multiSemesters || []);
        } else {
          updateGlobalSetting('semester', p.semester);
          updateGlobalSetting('schoolYear', p.schoolYear);
        }
        // Clean up state so it doesn't loop
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, students]);
  
  // Global settings cho các biểu mẫu (ưu tiên load từ localStorage)
  const [globalSettings, setGlobalSettings] = useState(() => {
    const saved = localStorage.getItem('globalSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved settings', e);
      }
    }
    return {
      semester: '2',
      schoolYear: '2026 - 2027',
      soThang: '5',
      tuitionFee: '2.290.000',
      discipline: 'Không',
      committee: '',
      currentYear: '1',
      signDate: new Date().toISOString().split('T')[0], // default to today YYYY-MM-DD
      quyetDinhSoND238: '',
      ngayQuyetDinhND238: 'ngày ... tháng ... năm 202...',
      mucDongND238: '1.830.000',
      nganhND238: 'Kỹ thuật và công nghệ thông tin',
      multiSemesters: [
        { id: 1, semester: '1', schoolYear: '2025 - 2026', soThang: '5', tuitionFee: '1.490.000', mucDongND238: '1.830.000' }
      ]
    };
  });
  
  // Lưu settings vào localStorage mỗi khi thay đổi
  useEffect(() => {
    localStorage.setItem('globalSettings', JSON.stringify(globalSettings));
  }, [globalSettings]);

  // Nhận diện sinh viên được chọn từ trang Danh sách (Quick Action)
  useEffect(() => {
    if (students.length > 0 && location.state?.selectedStudentId) {
      const student = students.find(s => s.id === location.state.selectedStudentId);
      if (student) handleStudentSelect(student);
    }
  }, [students, location.state]);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    if (selectedForm === 'kiem_tra_hoc_phi' && student) {
      setCustomKiemTraList(prev => [
        ...prev, 
        { ...student, _instanceId: Date.now() + Math.random().toString() }
      ]);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsData, processedData] = await Promise.all([
          api.getStudents(),
          api.getProcessedProfiles()
        ]);
        setStudents(studentsData);
        setProcessedProfiles(processedData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

  const handlePrint = async () => {
    if (!selectedStudent && selectedForm !== 'danh_sach' && selectedForm !== 'kiem_tra_hoc_phi') {
      toast.error('Vui lòng chọn một sinh viên ở danh sách bên trái trước khi In/Xuất hồ sơ!');
      return;
    }
    const name = selectedStudent ? normalizeStr(selectedStudent.fullName).replace(/\s+/g, '_') : '';
    const mssv = selectedStudent ? (selectedStudent.studentId || selectedStudent.idCard || 'Unknown') : '';
    const hk = `HK${globalSettings.semester}`;
    const year = globalSettings.schoolYear.replace(/\s+/g, '').replace('-', '');
    const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');

    if (!isElectron) {
      // Fallback: browser mode - dùng window.print()
      // Nhờ CSS render tĩnh tờ 4 thành dọc xoay chữ ngang, ta không cần chèn class delay nữa
      const originalTitle = document.title;
      if (selectedForm === 'danh_sach') {
        document.title = `Danh_Sach_Sinh_Vien_Giam_70_${date}`;
      } else if (selectedForm === 'kiem_tra_hoc_phi') {
        document.title = `Danh_Sach_Kiem_Tra_Hoc_Phi_${date}`;
      } else {
        document.title = `Ho_So_${name}_${mssv}_${hk}_${year}_${date}`;
      }
      
      window.print();
      document.title = originalTitle;
    } else if (selectedForm === 'all_forms') {
      // === ELECTRON: IN TRỌN BỘ — TẤT CẢ GỘP VÀO 1 FILE PDF DỌC ===
      // Nhờ trang 4 đã được làm dọc sẵn bằng CSS, ta chỉ cần xuất 1 file duy nhất!
      const result = await window.electronAPI.printToPDF({
        landscape: false, // In dọc toàn bộ!
        fileName: `Ho_So_Tron_Bo_${name}_${mssv}_${hk}_${year}_${date}.pdf`,
      });

      if (result.success) {
        toast.success(`✅ Đã xuất 1 file PDF trọn bộ 4 biểu mẫu thành công!`, { duration: 5000 });
      }

    } else if (selectedForm === 'danh_sach') {
      // === ELECTRON: IN RIÊNG DANH SÁCH ===
      // Giờ danh sách cũng là dọc!
      const result = await window.electronAPI.printToPDF({
        landscape: false,
        fileName: `Danh_Sach_Sinh_Vien_Giam_70_${date}.pdf`,
      });
      if (result.success) {
        toast.success(`Đã xuất file PDF danh sách!`, { duration: 3000 });
      }

    } else if (selectedForm === 'kiem_tra_hoc_phi') {
      const result = await window.electronAPI.printToPDF({
        landscape: false,
        fileName: `Danh_Sach_Kiem_Tra_Hoc_Phi_${date}.pdf`,
      });
      if (result.success) {
        toast.success(`Đã xuất file PDF kiểm tra học phí!`, { duration: 3000 });
      }

    } else {
      // === ELECTRON: IN MẪU DỌC (portrait) ===
      await window.electronAPI.printToPDF({
        landscape: false,
        fileName: `Ho_So_${name}_${mssv}_${hk}_${year}_${date}.pdf`,
      });
    }

    // Tự động lưu hồ sơ đã in
    if (selectedStudent) {
      recordProcessedForm(selectedStudent, selectedForm);
    }
  };

  const handleBulkPrint = async () => {
    if (allFilteredStudents.length === 0) return;
    
    setIsBulkPrinting(true);
    const toastId = toast.loading(`Đang chuẩn bị in ${allFilteredStudents.length} sinh viên (có thể mất vài giây)...`);
    
    // Wait for React to render the massive DOM
    setTimeout(async () => {
      try {
        const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
        
        if (!isElectron) {
          const originalTitle = document.title;
          document.title = `Ho_So_Hang_Loat_${allFilteredStudents.length}_SV_${date}`;
          window.print();
          document.title = originalTitle;
        } else {
          const result = await window.electronAPI.printToPDF({
            landscape: false,
            fileName: `Ho_So_Hang_Loat_${allFilteredStudents.length}_SV_${date}.pdf`,
          });
          if (result.success) {
            toast.success(`✅ Đã xuất 1 file PDF gồm ${allFilteredStudents.length} bộ hồ sơ!`, { id: toastId, duration: 5000 });
          }
        }
        
        // Auto record history for all
        for (const student of allFilteredStudents) {
          await recordProcessedForm(student, 'all_forms');
        }
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi in hàng loạt', { id: toastId });
      } finally {
        setIsBulkPrinting(false);
        toast.dismiss(toastId);
      }
    }, 1500); // Wait 1.5s to ensure DOM renders all pages
  };

  const handleAddToQueue = async () => {
    if (!selectedStudent) {
      toast.error('Vui lòng chọn sinh viên trước!');
      return;
    }
    try {
      const currentQueue = await api.getPrintQueue();
      
      const exists = currentQueue.find(item => item.student.id === selectedStudent.id && item.formId === selectedForm);
      if (exists) {
        toast.error('Hồ sơ của sinh viên này đã có trong Hàng Đợi In!');
        return;
      }
      
      let effectiveStudent = { ...selectedStudent };
      if (globalSettings?.forceLienThong && globalSettings.forceLienThong !== 'default') {
        let newEducationType = globalSettings.forceLienThong;
        const isShort = (newEducationType === 'Liên thông' || newEducationType === 'Văn bằng 2');
        let newCourseDuration = isShort ? '24' : '36';
        let newCourseYear = selectedStudent.courseYear || '';

        const match = newCourseYear.match(/^(\d{4})/);
        if (match) {
          const startYear = parseInt(match[1], 10);
          newCourseYear = `${startYear} - ${startYear + (isShort ? 2 : 3)}`;
        }

        effectiveStudent = {
          ...selectedStudent,
          educationType: newEducationType,
          courseYear: newCourseYear,
          courseDuration: newCourseDuration
        };
      }
      
      const newItem = {
        id: Date.now().toString(),
        student: effectiveStudent,
        formId: selectedForm,
        addedAt: new Date().toISOString()
      };

      // Lưu kèm dữ liệu nhiều học kỳ vào queue item để không phụ thuộc vào globalSettings hiện tại
      if (selectedForm === 'all_forms_multi') {
        newItem.multiSemesters = JSON.parse(JSON.stringify(globalSettings.multiSemesters || []));
      }
      
      // Lưu kèm thông tin học phí & số tháng cho mọi loại form
      newItem.savedSettings = {
        semester: globalSettings.semester,
        schoolYear: globalSettings.schoolYear,
        tuitionFee: globalSettings.tuitionFee,
        soThang: globalSettings.soThang,
        currentYear: globalSettings.currentYear,
        signDate: globalSettings.signDate,
      };
      
      await api.addToPrintQueue(newItem);
      // Trigger custom event so sidebar could potentially update if we had a counter
      window.dispatchEvent(new Event('printQueueUpdated'));
      
      toast.success('🛒 Đã thêm hồ sơ vào Hàng Đợi In!');
    } catch (e) {
      toast.error('Lỗi khi thêm vào hàng đợi!');
      console.error(e);
    }
  };

  const recordProcessedForm = async (student, formId) => {
    try {
      let formsToRecord = [];
      if (formId === 'all_forms' || formId === 'all_forms_nd238_moi') {
        formsToRecord = [{ id: formId, name: formId === 'all_forms' ? 'Trọn bộ hồ sơ (Cũ)' : 'Trọn bộ NĐ 238 (Mới)' }];
      } else if (formId === 'all_forms_multi' || formId === 'all_forms_nd238_moi_multi') {
        const hks = (globalSettings.multiSemesters || []).map(s => `HK${s.semester}`).join(', ');
        formsToRecord = [{ id: formId, name: `Trọn bộ ${formId === 'all_forms_multi' ? 'Cũ' : 'NĐ238'} (Nhiều HK: ${hks})` }];
      } else {
        const form = FORMS.find(f => f.id === formId);
        if (form) formsToRecord.push(form);
      }

      // Check if already recorded to avoid duplicates
      const newForms = formsToRecord.filter(form => {
        return !processedProfiles.some(p => 
          p.studentId === student.id && 
          p.formId === form.id && 
          p.semester === globalSettings.semester && 
          p.schoolYear === globalSettings.schoolYear
        );
      });

      if (newForms.length === 0) return;

      const promises = newForms.map(form => {
        const record = {
          studentId: student.id,
          studentMSSV: student.studentId || student.idCard || '',
          studentName: student.fullName,
          classCode: student.classCode || '',
          formId: form.id,
          formName: form.name,
          semester: formId.includes('multi') ? 'Multi' : globalSettings.semester,
          schoolYear: formId.includes('multi') ? 'Multi' : globalSettings.schoolYear,
          multiSemesters: formId.includes('multi') ? globalSettings.multiSemesters : undefined,
          processedDate: new Date().toISOString()
        };
        return api.recordProcessedProfile(record);
      });

      const newRecords = await Promise.all(promises);
      setProcessedProfiles(prev => [...prev, ...newRecords]);
    } catch (err) {
      console.error('Failed to record processed form', err);
    }
  };

  const updateBulkPrintStatus = async () => {
    if (allFilteredStudents.length === 0) return;
    const toastId = toast.loading(`Đang xử lý ${allFilteredStudents.length} hồ sơ...`);
    try {
      for (const student of allFilteredStudents) {
        await recordProcessedForm(student, selectedForm);
      }
      toast.success(`Đã lưu lịch sử làm hồ sơ cho ${allFilteredStudents.length} sinh viên!`, { id: toastId });
    } catch (err) {
      console.error('Failed to bulk record', err);
      toast.error('Có lỗi xảy ra khi cập nhật hàng loạt.', { id: toastId });
    }
  };

  const handleUpdateStudentInfo = async (field, value) => {
    if (!selectedStudent) return;
    try {
      const updatedStudent = { ...selectedStudent, [field]: value };
      const result = await api.updateStudent(selectedStudent.id, updatedStudent);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? result : s));
      setSelectedStudent(result);
      setCustomKiemTraList(prev => prev.map(s => s.id === selectedStudent.id ? result : s));
    } catch (err) {
      console.error('Failed to update student info', err);
    }
  };

  const normalizeStr = (str) => (str || '').toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const normalizedSearch = normalizeStr(searchTerm);
  const normalizedAdvValue = normalizeStr(advancedFilterValue);
  
  const allFilteredStudents = students.filter(s => {
    let match = true;
    
    if (normalizedSearch) {
      match = normalizeStr(s.fullName).includes(normalizedSearch) ||
        normalizeStr(s.studentId).includes(normalizedSearch) ||
        normalizeStr(s.idCard).includes(normalizedSearch) ||
        normalizeStr(s.classCode).includes(normalizedSearch);
    }
    
    if (match && advancedFilterType !== 'none' && normalizedAdvValue) {
      if (advancedFilterType === 'eduType') {
        match = normalizeStr(s.educationType).includes(normalizedAdvValue);
      } else if (advancedFilterType === 'courseYear') {
        match = normalizeStr(s.courseYear).includes(normalizedAdvValue);
      } else if (advancedFilterType === 'dob') {
        match = normalizeStr(s.dob).includes(normalizedAdvValue);
      }
    }
    
    if (!match) return false;
    
    const hasPrintedCurrentForm = processedProfiles.some(p => 
      p.studentId === s.id && 
      (p.formId === selectedForm || p.formId === 'all_forms' || p.formId === 'all_forms_nd238_moi') &&
      p.semester === globalSettings.semester &&
      p.schoolYear === globalSettings.schoolYear
    );
    
    if (printFilter === 'printed') return hasPrintedCurrentForm;
    if (printFilter === 'unprinted') return !hasPrintedCurrentForm;
    return true;
  });
  const filteredStudentsForSidebar = allFilteredStudents.slice(0, 50);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-8rem)]">
      {/* Settings & Search Sidebar */}
      <div className="w-full lg:w-96 flex flex-col gap-6 hide-on-print overflow-y-auto pr-2 pb-8">
        <SidebarSettings 
          FORMS={FORMS}
          selectedForm={selectedForm}
          setSelectedForm={setSelectedForm}
          globalSettings={globalSettings}
          setGlobalSettings={setGlobalSettings}
          selectedStudent={selectedStudent}
          setSelectedStudent={handleStudentSelect}
          handleUpdateStudentInfo={handleUpdateStudentInfo}
        />
        
        <StudentSearch 
          handlePrint={handlePrint}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          advancedFilterType={advancedFilterType}
          setAdvancedFilterType={setAdvancedFilterType}
          advancedFilterValue={advancedFilterValue}
          setAdvancedFilterValue={setAdvancedFilterValue}
          printFilter={printFilter}
          setPrintFilter={setPrintFilter}
          filteredStudentsForSidebar={filteredStudentsForSidebar}
          selectedStudent={selectedStudent}
          setSelectedStudent={handleStudentSelect}
          processedProfiles={processedProfiles}
          selectedForm={selectedForm}
          globalSettings={globalSettings}
          customKiemTraList={customKiemTraList}
        />
      </div>

      {/* Preview Area */}
      <FormsPreview 
        selectedForm={selectedForm}
        selectedStudent={selectedStudent}
        missingFields={missingFields}
        setMissingFields={setMissingFields}
        updateBulkPrintStatus={updateBulkPrintStatus}
        allFilteredStudents={selectedForm === 'kiem_tra_hoc_phi' ? customKiemTraList : allFilteredStudents}
        setCustomKiemTraList={setCustomKiemTraList}
        processedProfiles={processedProfiles}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        recordProcessedForm={recordProcessedForm}
        handlePrint={handlePrint}
        printRef={printRef}
        isBulkPrinting={isBulkPrinting}
        handleBulkPrint={handleBulkPrint}
        handleAddToQueue={handleAddToQueue}
      />
    </div>
  );
}
