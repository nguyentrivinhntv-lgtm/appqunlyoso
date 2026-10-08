import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, ExternalLink, Copy, RefreshCw, ChevronDown, GraduationCap, Globe, Info } from 'lucide-react';
import { api } from '../services/api';

const LOOKUP_URL = 'http://115.74.232.210:8081/';
const LOOKUP_URL_OLD = 'http://115.74.232.210:8082/';

export default function StudentLookup() {
  const [studentId, setStudentId] = useState('');
  const [selectedUrl, setSelectedUrl] = useState(LOOKUP_URL);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [allStudents, setAllStudents] = useState([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentStudentLookups') || '[]');
    } catch { return []; }
  });
  
  const iframeRef = useRef(null);
  const searchInputRef = useRef(null);

  // Load danh sách sinh viên để gợi ý autocomplete
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.getStudents();
        setAllStudents(res.data || []);
      } catch (err) {
        console.error('Không thể tải danh sách SV:', err);
      }
    };
    fetchStudents();
  }, []);

  // Tìm gợi ý khi nhập MSSV
  useEffect(() => {
    if (studentId.length < 1) {
      setSuggestions([]);
      return;
    }
    const query = studentId.toLowerCase();
    const matched = allStudents.filter(s =>
      s.studentId?.toLowerCase().includes(query) ||
      s.fullName?.toLowerCase().includes(query)
    ).slice(0, 8);
    setSuggestions(matched);
  }, [studentId, allStudents]);

  const saveRecentSearch = (id, name) => {
    const newRecent = [
      { id, name, time: new Date().toISOString() },
      ...recentSearches.filter(r => r.id !== id)
    ].slice(0, 10);
    setRecentSearches(newRecent);
    localStorage.setItem('recentStudentLookups', JSON.stringify(newRecent));
  };

  const handleLookup = async () => {
    if (!studentId.trim()) {
      toast.error('Vui lòng nhập mã sinh viên!');
      searchInputRef.current?.focus();
      return;
    }
    
    // Tìm tên SV trong danh sách
    const found = allStudents.find(s => s.studentId === studentId.trim());
    saveRecentSearch(studentId.trim(), found?.fullName || '');
    
    setIsLoading(true);
    setHtmlContent(''); // Xóa nội dung cũ
    
    toast.success(`Đang tra cứu MSSV: ${studentId.trim()}`);
    
    try {
      // Dùng proxy API để vượt qua lỗi Cross-Origin & SameSite Cookie
      const res = await api.fetchStudentFromWeb(studentId.trim());
      
      if (res && res.success && res.html) {
        // Chèn thẻ <base> để các link hình ảnh, css của trường load đúng gốc
        const baseUrl = selectedUrl.endsWith('/') ? selectedUrl : selectedUrl + '/';
        const injectedHtml = res.html.replace('<head>', `<head><base href="${baseUrl}">`);
        setHtmlContent(injectedHtml);
      } else {
        toast.error('Không tải được dữ liệu từ web trường.');
        setHtmlContent('');
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi kết nối với web trường.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleSelectSuggestion = (student) => {
    setStudentId(student.studentId);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleCopyId = () => {
    if (studentId.trim()) {
      navigator.clipboard.writeText(studentId.trim());
      toast.success('Đã sao chép MSSV vào clipboard!');
    }
  };

  const handleOpenExternal = () => {
    window.open(selectedUrl, '_blank');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowSuggestions(false);
      handleLookup();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="h-full flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm z-10 relative">
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tra Cứu Sinh Viên</h1>
                <p className="text-sm text-gray-500">Kiểm tra thông tin & điểm sinh viên trên hệ thống trường</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              {/* Input MSSV */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập MSSV hoặc tên sinh viên..."
                  className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-gray-50 focus:bg-white"
                />
                {/* Nút copy & clear */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                  {studentId && (
                    <>
                      <button
                        onClick={handleCopyId}
                        className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                        title="Sao chép MSSV"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setStudentId(''); searchInputRef.current?.focus(); }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Xóa"
                      >
                        <span className="text-lg leading-none">&times;</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-64 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id || s.studentId}
                        onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center"
                      >
                        <div>
                          <span className="font-medium text-sm text-gray-800">{s.fullName}</span>
                          <span className="text-xs text-gray-400 ml-2">({s.classCode || 'N/A'})</span>
                        </div>
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s.studentId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nút Tra cứu */}
              <button
                onClick={handleLookup}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:from-teal-600 hover:to-emerald-700 transition-all shadow-md shadow-teal-500/25 font-semibold text-sm flex items-center gap-2 shrink-0"
              >
                <Search className="w-4 h-4" />
                Tra cứu
              </button>

              {/* Chọn hệ thống tra cứu */}
              <div className="relative shrink-0">
                <select
                  value={selectedUrl}
                  onChange={(e) => {
                    setSelectedUrl(e.target.value);
                    setHtmlContent('');
                  }}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-300 text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none cursor-pointer"
                >
                  <option value={LOOKUP_URL}>Tra cứu điểm (Mới)</option>
                  <option value={LOOKUP_URL_OLD}>Điểm 2013 trở về trước</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
          if (studentId) {
            handleLookup();
          } else {
            setHtmlContent('');
          }
        }}
                className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Tải lại trang tra cứu"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleOpenExternal}
                className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Mở trong trình duyệt"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Gần đây:</span>
              {recentSearches.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setStudentId(r.id);
                    setTimeout(() => handleLookup(), 100);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-teal-50 hover:text-teal-700 text-gray-600 rounded-full text-xs font-medium transition-colors"
                >
                  <span className="font-mono">{r.id}</span>
                  {r.name && <span className="text-gray-400">• {r.name}</span>}
                </button>
              ))}
              <button
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem('recentStudentLookups');
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1"
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="px-6 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 border-t border-teal-100 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <p className="text-xs text-teal-700">
            <strong>Hướng dẫn:</strong> Điền MSSV và bấm Tra cứu, hệ thống sẽ tự động gửi lên web trường. Hoặc bạn có thể tự nhập vào khung bên dưới.
          </p>
        </div>
      </div>
      
      {/* Iframe Container */}
      <div className="flex-1 relative bg-gray-100">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-teal-200 rounded-full animate-spin border-t-teal-600 mx-auto"></div>
                <Globe className="w-6 h-6 text-teal-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-600">Đang tải trang tra cứu điểm...</p>
              <p className="text-xs text-gray-400 mt-1">Vui lòng đợi trong giây lát</p>
            </div>
          </div>
        )}
        
        {htmlContent ? (
          <iframe
            ref={iframeRef}
            name="lookupIframe"
            srcDoc={htmlContent}
            onLoad={handleIframeLoad}
            className="w-full h-full border-0 bg-white"
            title="Tra cứu điểm sinh viên"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <iframe
            ref={iframeRef}
            name="lookupIframe"
            src={selectedUrl}
            onLoad={handleIframeLoad}
            className="w-full h-full border-0"
            title="Tra cứu điểm sinh viên"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
          />
        )}
      </div>
    </div>
  );
}
