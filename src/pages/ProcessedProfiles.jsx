import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileCheck, Search, XCircle, Printer, RefreshCw, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getApiBaseUrl } from '../services/connectionConfig';

const getProcessedApi = () => `${getApiBaseUrl()}/processedProfiles`;

export default function ProcessedProfiles() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const fetchProfiles = async () => {
    try {
      const res = await axios.get(getProcessedApi());
      // Sort by newest first
      const sorted = res.data.sort((a, b) => new Date(b.processedDate) - new Date(a.processedDate));
      setProfiles(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const unmarkPrinted = async (profile) => {
    if (!window.confirm(`Bạn có chắc muốn hủy lịch sử hồ sơ "${profile.formName}" của sinh viên ${profile.studentName}?`)) return;
    try {
      await axios.delete(`${getProcessedApi()}/${profile.id}`);
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi hủy lịch sử.');
    }
  };

  const normalizeStr = (str) => (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedSearch = normalizeStr(searchTerm);

  const filteredProfiles = profiles.filter(p => 
    normalizeStr(p.studentName).includes(normalizedSearch) ||
    normalizeStr(p.studentMSSV).includes(normalizedSearch) ||
    normalizeStr(p.classCode).includes(normalizedSearch) ||
    normalizeStr(p.formName).includes(normalizedSearch)
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProfiles = filteredProfiles.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Danh_Sach_Ho_So_Da_Lam_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}`;
    window.print();
    document.title = originalTitle;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 hide-on-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-8 h-8 text-emerald-500" />
            Hồ Sơ Đã Xử Lý
          </h1>
          <p className="text-slate-500 mt-1">Lịch sử các biểu mẫu đã làm của sinh viên</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {filteredProfiles.length > 0 && (
            <button 
              onClick={() => {
                const exportData = filteredProfiles.map((p, idx) => ({
                  'STT': idx + 1,
                  'Họ và tên': p.studentName || '',
                  'MSSV': p.studentMSSV || '',
                  'Lớp': p.classCode || '',
                  'Tên biểu mẫu': p.formName || '',
                  'Học kỳ': p.semester || '',
                  'Năm học': p.schoolYear || '',
                  'Ngày xử lý': p.processedDate ? new Date(p.processedDate).toLocaleDateString('vi-VN') : '',
                }));
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Hồ sơ đã làm');
                XLSX.writeFile(wb, `HoSoDaLam_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors font-medium border border-violet-200 shadow-sm"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Xuất Excel
            </button>
          )}
          <button 
            onClick={handlePrint}
            disabled={filteredProfiles.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Printer className="w-5 h-5" />
            In / Xuất PDF
          </button>
        </div>
      </div>

      <div className="print:block hidden mb-6 text-center">
        <h2 className="text-xl font-bold uppercase mb-2">Danh Sách Lịch Sử Hồ Sơ Sinh Viên</h2>
        <p className="italic">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        <p className="font-medium mt-2">Tổng cộng: {filteredProfiles.length} lượt hồ sơ</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center hide-on-print">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, MSSV, Lớp, Tên Form..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Tổng cộng: <span className="text-emerald-600 font-bold">{filteredProfiles.length}</span> lượt
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 print:text-black">
              <tr>
                <th className="px-4 py-3 font-semibold border-print">STT</th>
                <th className="px-4 py-3 font-semibold border-print">Sinh viên</th>
                <th className="px-4 py-3 font-semibold border-print">Lớp</th>
                <th className="px-4 py-3 font-semibold border-print">Biểu mẫu</th>
                <th className="px-4 py-3 font-semibold border-print">Học kỳ / Năm</th>
                <th className="px-4 py-3 font-semibold border-print">Ngày làm</th>
                <th className="px-4 py-3 font-semibold hide-on-print text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    Chưa có lịch sử làm hồ sơ nào.
                  </td>
                </tr>
              ) : (
                paginatedProfiles.map((profile, index) => (
                  <tr key={profile.id} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                    <td className="px-4 py-3 font-medium text-slate-900 border-print">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 border-print">
                      <div className="font-medium text-slate-900">{profile.studentName}</div>
                      <div className="text-slate-500 text-xs mt-0.5 print:text-slate-800">
                        MSSV: {profile.studentMSSV || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-print text-slate-700">{profile.classCode}</td>
                    <td className="px-4 py-3 border-print text-primary-700 font-medium">{profile.formName}</td>
                    <td className="px-4 py-3 border-print">
                      <div className="text-slate-900">HK {profile.semester}</div>
                      <div className="text-slate-500 text-xs">{profile.schoolYear}</div>
                    </td>
                    <td className="px-4 py-3 border-print text-slate-600 text-xs">
                      {formatDate(profile.processedDate)}
                    </td>
                    <td className="px-4 py-3 hide-on-print text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate('/forms', { state: { reprintProfile: profile } })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                          title="Tải lại hồ sơ này để in"
                        >
                          <RefreshCw className="w-4 h-4" />
                          In lại
                        </button>
                        <button
                          onClick={() => unmarkPrinted(profile)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                          title="Hủy lịch sử hồ sơ này"
                        >
                          <XCircle className="w-4 h-4" />
                          Hủy
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination UI */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between hide-on-print">
            <div className="text-sm text-slate-500">
              Hiển thị <span className="font-medium">{startIndex + 1}</span> đến <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredProfiles.length)}</span> trong số <span className="font-medium">{filteredProfiles.length}</span> kết quả
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <div className="px-3 py-1 text-sm font-medium text-slate-700">
                Trang {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
