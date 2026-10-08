import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, Printer, ZoomIn, ZoomOut, ShoppingCart, FileDown } from 'lucide-react';
import GiayXacNhanForm from '../../forms/GiayXacNhanForm';
import GiayXacNhanMienGiamForm from '../../forms/GiayXacNhanMienGiamForm';
import DuToanKinhPhiForm from '../../forms/DuToanKinhPhiForm';
import DanhSachSinhVienForm from '../../forms/DanhSachSinhVienForm';
import DanhSachKiemTraHocPhiForm from '../../forms/DanhSachKiemTraHocPhiForm';
import DanhSachNghiDinh238MoiForm from '../../forms/DanhSachNghiDinh238MoiForm';
import { getDisplayDepartment, getDisplayNhomNganh } from '../../utils/studentUtils';
import { 
  exportGiayXacNhan, 
  exportGiayXacNhanMienGiam, 
  exportDuToanKinhPhi, 
  exportDanhSachSinhVien,
  exportDanhSachKiemTraHocPhi,
  exportQueue
} from '../../services/exportWord';

export default function FormsPreview({
  selectedForm,
  selectedStudent,
  missingFields,
  setMissingFields,
  updateBulkPrintStatus,
  allFilteredStudents,
  processedProfiles,
  globalSettings,
  recordProcessedForm,
  handlePrint,
  printRef,
  isBulkPrinting,
  handleBulkPrint,
  handleAddToQueue,
  setCustomKiemTraList
}) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const isSelectedStudentPrinted = selectedStudent && processedProfiles.some(p => 
    p.studentId === selectedStudent.id && 
    (selectedForm === 'all_forms' ? true : p.formId === selectedForm) &&
    p.semester === globalSettings.semester &&
    p.schoolYear === globalSettings.schoolYear
  );

  const effectiveStudent = selectedStudent ? (() => {
    let newEducationType = selectedStudent.educationType;
    let newCourseYear = selectedStudent.courseYear || '';
    let newCourseDuration = selectedStudent.courseDuration || '';

    if (globalSettings?.forceLienThong && globalSettings.forceLienThong !== 'default') {
      newEducationType = globalSettings.forceLienThong;
      const isShort = (newEducationType === 'Liên thông' || newEducationType === 'Văn bằng 2');
      newCourseDuration = isShort ? '24' : '36';

      // Try to extract start year from existing courseYear (e.g. "2026" or "2026 - 2029")
      const match = newCourseYear.match(/^(\d{4})/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        newCourseYear = `${startYear} - ${startYear + (isShort ? 2 : 3)}`;
      }
    }

    return {
      ...selectedStudent,
      educationType: newEducationType,
      courseYear: newCourseYear,
      courseDuration: newCourseDuration
    };
  })() : null;

  // Build data for Word export from student + globalSettings
  const buildExportData = () => {
    if (!effectiveStudent) return null;
    const s = effectiveStudent;
    let dateStr = 'ngày ... tháng ... năm 2026';
    if (globalSettings?.signDate) {
      const parts = globalSettings.signDate.split('-');
      if (parts.length === 3) {
        dateStr = `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
      }
    }
    let formattedDateWithCity = `Tp. Hồ Chí Minh, ${dateStr}`;
      let cYear = s.courseYear || '';
      if (cYear && cYear.trim().length === 4 && !isNaN(cYear)) {
        const startYear = parseInt(cYear);
        const cls = (s.classCode || '').toUpperCase().replace(/[\s-]/g, '');
        const isSpecial24 = /^(23|24|25)CYSCT[LV]/.test(cls);
        const isShort = isSpecial24 || (s.educationType === 'Liên thông' || s.educationType === 'Văn bằng 2');
        cYear = `${startYear} - ${startYear + (isShort ? 2 : 3)}`;
      }

      return {
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
        courseYear: cYear,
      educationLevel: s.educationLevel || 'Cao đẳng',
      educationType: s.educationType || '',
      studentId: s.studentId || '',
      committee: s.committee || globalSettings.committee || '',
      currentYear: s.currentYear || globalSettings.currentYear || '1',
      semester: s.semester || globalSettings.semester || '1',
      schoolYear: s.schoolYear || globalSettings.schoolYear || '2026 - 2027',
      tuitionFee: s.tuitionFee || globalSettings.tuitionFee || '',
      discipline: s.discipline || globalSettings.discipline || 'Không',
      courseDuration: s.courseDuration || (() => {
        const cls = (s.classCode || '').toUpperCase().replace(/[\s-]/g, '');
        const isSpecial24 = /^(23|24|25)CYSCT[LV]/.test(cls);
        if (isSpecial24 || s.educationType === 'Liên thông' || s.educationType === 'Văn bằng 2') return '24';
        return '36';
      })(),
      dateStr: dateStr,
      dateStrFull: formattedDateWithCity,
      mucThu: s.tuitionFee || globalSettings.tuitionFee || '2.290.000',
      soThang: s.soThang || globalSettings.soThang || '05',
      hocKy: `Học kỳ ${s.semester || globalSettings.semester || '1'}`,
      namHoc: s.schoolYear || globalSettings.schoolYear || '2026 - 2027',
      nhomNganh: getDisplayNhomNganh(s.department, s.major, s.nhomNganh),
      reason: 'Bổ túc hồ sơ Nghị định 238./.',
    };
  };

  const handleExportWord = async () => {
    if (!selectedStudent && selectedForm !== 'danh_sach' && selectedForm !== 'kiem_tra_hoc_phi' && selectedForm !== 'danh_sach_nd238_moi' && selectedForm !== 'danh_sach_nd238_moi_multi') {
      toast.error('Vui lòng chọn một sinh viên trước khi xuất Word!');
      return;
    }
    const data = buildExportData();
    if (!data) return;

    const toastId = toast.loading('Đang tạo file Word...');
    try {
      if (selectedForm === 'giay_xac_nhan') {
        const fileName = await exportGiayXacNhan(data, globalSettings);
        toast.success(`✅ Đã xuất: ${fileName}`, { id: toastId, duration: 4000 });
      } else if (selectedForm === 'giay_xac_nhan_mien_giam') {
        const fileName = await exportGiayXacNhanMienGiam(data, globalSettings);
        toast.success(`✅ Đã xuất: ${fileName}`, { id: toastId, duration: 4000 });
      } else if (selectedForm === 'du_toan') {
        const fileName = await exportDuToanKinhPhi(data, globalSettings);
        toast.success(`✅ Đã xuất: ${fileName}`, { id: toastId, duration: 4000 });
      } else if (selectedForm === 'danh_sach') {
        const listToExport = selectedStudent ? [selectedStudent] : allFilteredStudents;
        const fileName = await exportDanhSachSinhVien(listToExport, globalSettings);
        toast.success(`✅ Đã xuất: ${fileName}`, { id: toastId, duration: 4000 });
      } else if (selectedForm === 'kiem_tra_hoc_phi') {
        const listToExport = allFilteredStudents;
        const fileName = await exportDanhSachKiemTraHocPhi(listToExport, globalSettings);
        toast.success(`✅ Đã xuất: ${fileName}`, { id: toastId, duration: 4000 });
      } else if (selectedForm === 'danh_sach_nd238_moi' || selectedForm === 'danh_sach_nd238_moi_multi') {
        const listToExport = effectiveStudent ? [{ student: effectiveStudent, formId: selectedForm, itemGlobalSettings: globalSettings }] : allFilteredStudents.map(s => ({ student: s, formId: selectedForm, itemGlobalSettings: globalSettings }));
        const customName = `Danh_Sach_ND238_${effectiveStudent ? (data.fullName || 'SV').replace(/\s+/g, '_') : 'TapThe'}.docx`;
        const fileName = await exportQueue(listToExport, globalSettings, customName, 'nd238');
        toast.success(`✅ Đã xuất: ${fileName}`, { id: toastId, duration: 4000 });
      } else if (selectedForm.startsWith('all_forms')) {
        const queueItem = { formId: selectedForm, data, allStudents: [data] };
        const customName = `Ho_So_Tron_Bo_${(data.fullName || 'SV').replace(/\s+/g, '_')}.docx`;
        const fileName = await exportQueue([queueItem], globalSettings, customName);
        toast.success(`✅ Đã xuất 1 file Word trọn bộ: ${fileName}`, { id: toastId, duration: 5000 });
      } else {
        toast.error('Form này chưa hỗ trợ xuất Word', { id: toastId });
      }
    } catch (err) {
      console.error('Word export error:', err);
      toast.error('Lỗi khi xuất file Word: ' + err.message, { id: toastId });
    }
  };

  const handleUpdateKiemTraItem = (instanceId, field, value) => {
    if (setCustomKiemTraList) {
      setCustomKiemTraList(prev => prev.map(s => s._instanceId === instanceId ? { ...s, [field]: value } : s));
    }
  };

  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative h-[calc(100vh-8rem)] print:border-none print:shadow-none">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 hide-on-print flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-slate-900">Xem trước & Nhập bổ sung</h2>
          {missingFields.length > 0 && selectedStudent && (
            <div className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200 animate-pulse">
              ⚠ Còn thiếu: {missingFields.join(', ')}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-200/50 rounded-lg p-1 mr-2 border border-slate-200">
              <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))} className="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-colors"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-medium w-12 text-center text-slate-700">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.25))} className="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-colors"><ZoomIn className="w-4 h-4" /></button>
            </div>
          
          {(selectedForm === 'danh_sach' || selectedForm === 'kiem_tra_hoc_phi' || selectedForm === 'danh_sach_nd238_moi' || selectedForm === 'danh_sach_nd238_moi_multi') ? (
            <div className="flex gap-2">
              {selectedForm === 'kiem_tra_hoc_phi' && allFilteredStudents.length > 0 && (
                <button
                  onClick={() => setCustomKiemTraList && setCustomKiemTraList([])}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                >
                  Làm mới danh sách
                </button>
              )}
              <button
                onClick={() => updateBulkPrintStatus()}
                disabled={allFilteredStudents.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50"
              >
                ✅ Xác nhận đã làm (Cả danh sách)
              </button>
            </div>
          ) : selectedStudent ? (
            <button
              onClick={() => {
                if (isSelectedStudentPrinted) {
                  toast.error('Hồ sơ này đã được lưu trong Danh sách đã làm. Bạn có thể vào tab "Hồ sơ đã làm" để quản lý/hủy.', { duration: 4000 });
                } else {
                  recordProcessedForm(selectedStudent, selectedForm);
                  toast.success('Đã lưu vào danh sách hồ sơ đã làm!');
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                isSelectedStudentPrinted 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              {isSelectedStudentPrinted ? '✅ Đã lưu lịch sử' : '✅ Xác nhận đã làm'}
            </button>
          ) : null}
          <button 
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold text-sm shadow-md shadow-primary-500/30"
          >
            <Printer className="w-5 h-5" />
            {(selectedForm === 'danh_sach' || selectedForm === 'kiem_tra_hoc_phi' || selectedForm === 'danh_sach_nd238_moi' || selectedForm === 'danh_sach_nd238_moi_multi') ? 'In / Xuất Danh Sách' : (selectedForm.startsWith('all_forms') ? 'In / Xuất Trọn Bộ' : 'In / Xuất Hồ Sơ')}
          </button>
          
            <button 
              onClick={handleExportWord}
              disabled={(selectedForm === 'danh_sach' || selectedForm === 'kiem_tra_hoc_phi' || selectedForm === 'danh_sach_nd238_moi' || selectedForm === 'danh_sach_nd238_moi_multi') ? allFilteredStudents.length === 0 : !selectedStudent}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-md shadow-blue-500/30 disabled:opacity-50"
            >
              <FileDown className="w-5 h-5" />
              {selectedForm.startsWith('all_forms') ? 'Xuất Trọn Bộ Word' : 'Xuất Word'}
            </button>
          
          <button
            onClick={handleAddToQueue}
            disabled={!selectedStudent}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold text-sm shadow-md shadow-amber-500/30 disabled:opacity-50"
          >
            <ShoppingCart className="w-5 h-5" />
            Lưu Hàng Đợi
          </button>
          
          <button
            onClick={handleBulkPrint}
            disabled={allFilteredStudents.length === 0 || isBulkPrinting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold text-sm shadow-md shadow-purple-500/30 disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            In Hàng Loạt ({allFilteredStudents.length} SV)
          </button>
        </div>
      </div>
    </div>
    
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/50 flex flex-col items-center gap-8 print:bg-white print:p-0 print:block print:overflow-visible">
        <div style={{ zoom: typeof window !== 'undefined' && window.electronAPI?.isElectron ? undefined : zoomLevel, transform: typeof window !== 'undefined' && window.electronAPI?.isElectron ? `scale(${zoomLevel})` : undefined, transformOrigin: 'top center', transition: 'transform 0.2s' }} className="w-full flex justify-center print:transform-none print:zoom-100">
          <div ref={printRef} className={`w-full flex flex-col items-center mx-auto print:block print:overflow-visible`}>
            {!selectedStudent && selectedForm !== 'danh_sach' && selectedForm !== 'kiem_tra_hoc_phi' && selectedForm !== 'danh_sach_nd238_moi' && selectedForm !== 'danh_sach_nd238_moi_multi' ? (
            <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-md flex flex-col items-center justify-center text-slate-400 hide-on-print bg-slate-50/50">
              <FileText className="w-16 h-16 mb-4 opacity-50" />
              <p className="font-medium">Vui lòng chọn sinh viên để xem trước hồ sơ</p>
            </div>
          ) : (
            <div className="space-y-8 print:space-y-0 w-full flex flex-col items-center print:block">
              {(selectedForm === 'giay_xac_nhan' || selectedForm.startsWith('all_forms')) && (
                <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                  <GiayXacNhanForm student={effectiveStudent} globalSettings={globalSettings} onMissingFieldsChange={setMissingFields} />
                </div>
              )}
              
              {selectedForm === 'all_forms_multi' && (globalSettings.multiSemesters || []).map((sem) => {
                const multiSettings = {...globalSettings, semester: sem.semester, schoolYear: sem.schoolYear, soThang: sem.soThang, tuitionFee: sem.tuitionFee, currentYear: sem.currentYear || globalSettings.currentYear};
                return (
                  <div key={sem.id} className="space-y-8 print:space-y-0 w-full flex flex-col items-center print:block">
                    <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                      <GiayXacNhanMienGiamForm student={effectiveStudent} globalSettings={multiSettings} onMissingFieldsChange={setMissingFields} />
                    </div>
                    <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                      <DuToanKinhPhiForm student={effectiveStudent} globalSettings={multiSettings} onMissingFieldsChange={setMissingFields} />
                    </div>
                    <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none min-h-[297mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                      <div className="print-landscape-content p-[20mm] print:p-[10mm]">
                        <DanhSachSinhVienForm 
                          student={effectiveStudent} 
                          studentsList={effectiveStudent ? [effectiveStudent] : allFilteredStudents}
                          globalSettings={multiSettings} 
                          onMissingFieldsChange={setMissingFields} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {selectedForm === 'all_forms_nd238_moi_multi' && (globalSettings.multiSemesters || []).map((sem) => {
                const multiSettings = {...globalSettings, semester: sem.semester, schoolYear: sem.schoolYear, soThang: sem.soThang, tuitionFee: sem.tuitionFee, currentYear: sem.currentYear || globalSettings.currentYear};
                return (
                  <div key={sem.id} className="space-y-8 print:space-y-0 w-full flex flex-col items-center print:block">
                    <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                      <GiayXacNhanMienGiamForm student={effectiveStudent} globalSettings={multiSettings} onMissingFieldsChange={setMissingFields} />
                    </div>
                    <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                      <DuToanKinhPhiForm student={effectiveStudent} globalSettings={multiSettings} onMissingFieldsChange={setMissingFields} />
                    </div>
                    <div className="bg-white w-full max-w-[297mm] shadow-md print:shadow-none min-h-[210mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                      <div className="print-landscape-content p-[5mm] print:p-[3mm]">
                        <DanhSachNghiDinh238MoiForm 
                          queueItems={effectiveStudent ? [{ student: effectiveStudent, formId: 'danh_sach_nd238_moi_multi', itemGlobalSettings: multiSettings }] : allFilteredStudents.map(s => ({ student: s, formId: 'danh_sach_nd238_moi_multi', itemGlobalSettings: multiSettings }))} 
                          globalSettings={multiSettings} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {(selectedForm === 'giay_xac_nhan_mien_giam' || selectedForm === 'all_forms' || selectedForm === 'all_forms_nd238_moi') && (
                <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                  <GiayXacNhanMienGiamForm student={effectiveStudent} globalSettings={globalSettings} onMissingFieldsChange={setMissingFields} />
                </div>
              )}
              {(selectedForm === 'du_toan' || selectedForm === 'all_forms' || selectedForm === 'all_forms_nd238_moi') && (
                <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none p-[20mm] print:p-[15mm] min-h-[297mm] print:min-h-0 form-container relative break-after-page mx-auto">
                  <DuToanKinhPhiForm student={effectiveStudent} globalSettings={globalSettings} onMissingFieldsChange={setMissingFields} />
                </div>
              )}
              {(selectedForm === 'danh_sach' || selectedForm === 'all_forms') && (
                <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none min-h-[297mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                  <div className="print-landscape-content p-[20mm] print:p-[10mm]">
                    <DanhSachSinhVienForm 
                      student={effectiveStudent} 
                      studentsList={effectiveStudent ? [effectiveStudent] : allFilteredStudents}
                      globalSettings={globalSettings} 
                      onMissingFieldsChange={setMissingFields} 
                    />
                  </div>
                </div>
              )}
              {(selectedForm === 'kiem_tra_hoc_phi') && (
                <div className="bg-white w-full max-w-[210mm] shadow-md print:shadow-none min-h-[297mm] print:min-h-0 form-container-no-pad relative break-after-page mx-auto">
                  <div className="p-[5mm] print:p-0">
                    <DanhSachKiemTraHocPhiForm 
                      studentsList={allFilteredStudents}
                      globalSettings={globalSettings} 
                      onRemoveStudent={(instanceId) => setCustomKiemTraList(prev => prev.filter(s => s._instanceId !== instanceId))}
                      onUpdateStudent={handleUpdateKiemTraItem}
                    />
                  </div>
                </div>
              )}
              {(selectedForm === 'danh_sach_nd238_moi' || selectedForm === 'danh_sach_nd238_moi_multi' || selectedForm === 'all_forms_nd238_moi') && (
                <div className="bg-white w-full max-w-[297mm] shadow-md print:shadow-none min-h-[210mm] print:min-h-0 form-container relative break-after-page print-landscape-wrapper mx-auto">
                  <div className="print-landscape-content p-[5mm] print:p-[3mm]">
                    <DanhSachNghiDinh238MoiForm 
                      queueItems={effectiveStudent ? [{ student: effectiveStudent, formId: selectedForm, itemGlobalSettings: globalSettings }] : allFilteredStudents.map(s => ({ student: s, formId: selectedForm, itemGlobalSettings: globalSettings }))} 
                      globalSettings={globalSettings} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
