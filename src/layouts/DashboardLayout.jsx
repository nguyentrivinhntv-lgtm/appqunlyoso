import React, { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Settings,
  Menu,
  GraduationCap,
  BarChart3,
  FileCheck,
  Printer,
  ClipboardCheck,
  LogOut,
  UserCog,
  History,
  Globe
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getCurrentUser, logout, isAdmin } from '../services/auth';
import { api } from '../services/api';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: 'Tổng quan (Dashboard)', href: '/', icon: BarChart3, reqAdmin: false },
  { name: 'Danh sách sinh viên', href: '/students', icon: Users, reqAdmin: false },
  { name: 'Cấp phát hồ sơ', href: '/distribution', icon: ClipboardCheck, reqAdmin: false },
  { name: 'In Hồ sơ (Forms)', href: '/forms', icon: FileText, reqAdmin: false },
  { name: 'Hàng đợi in', href: '/print-queue', icon: Printer, reqAdmin: false },
  { name: 'Hồ sơ đã làm', href: '/processed', icon: FileCheck, reqAdmin: false },
  { name: 'Thống kê & Báo cáo', href: '/statistics', icon: BarChart3, reqAdmin: false },
  { name: 'Tra cứu SV (Trường)', href: '/student-lookup', icon: Globe, reqAdmin: false },
  { name: 'Quản lý tài khoản', href: '/users', icon: UserCog, reqAdmin: true },
  { name: 'Nhật ký hệ thống', href: '/logs', icon: History, reqAdmin: true },
  { name: 'Cài đặt kết nối', href: '/settings', icon: Settings, reqAdmin: true },
];

// Route name map for breadcrumb
const ROUTE_NAMES = {
  '/': 'Tổng quan',
  '/students': 'Danh sách sinh viên',
  '/distribution': 'Cấp phát hồ sơ',
  '/forms': 'In hồ sơ',
  '/print-queue': 'Hàng đợi in',
  '/processed': 'Hồ sơ đã làm',
  '/statistics': 'Thống kê & Báo cáo',
  '/student-lookup': 'Tra cứu SV (Trường)',
  '/users': 'Quản lý tài khoản',
  '/logs': 'Nhật ký hệ thống',
  '/settings': 'Cài đặt kết nối',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [printQueueCount, setPrintQueueCount] = useState(0);
  const searchInputRef = React.useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const getApiBaseUrl = () => {
    return api.getBaseUrl ? api.getBaseUrl() : 'http://localhost:5000/api';
  };

  // Custom hook or simple useEffect to fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const distRes = await fetch(`${getApiBaseUrl()}/documentRouting`);
        const distData = await distRes.json();

        const today = new Date();
        const overdue = distData.filter(d => {
          if (!d.receiveDate || d.toKhoa || d.toKeToan || d.toDaoTao || d.toGiamDoc) return false;
          const rDate = new Date(d.receiveDate);
          const diffDays = Math.floor((today - rDate) / (1000 * 60 * 60 * 24));
          return diffDays >= 3;
        });

        const newNotifs = overdue.map(d => ({
          id: d.id,
          title: 'Hồ sơ trễ hạn',
          message: `Hồ sơ của ${d.studentName} đã nhận quá 3 ngày chưa chuyển!`,
          time: d.receiveDate,
          read: false
        }));

        setNotifications(newNotifs);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };

    const fetchStudents = async () => {
      try {
        const res = await api.getStudents();
        setAllStudents(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchPrintQueue = async () => {
      try {
        const q = await api.getPrintQueue();
        setPrintQueueCount(Array.isArray(q) ? q.length : 0);
      } catch (err) { /* ignore */ }
    };

    fetchNotifications();
    fetchStudents();
    fetchPrintQueue();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K -> Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Ctrl+P -> Go to print queue
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        navigate('/print-queue');
      }
      // Esc -> Close dropdowns
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Fuzzy Search Utility
  const removeVietnameseTones = (str) => {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
  };

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (q.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const normalizedQ = removeVietnameseTones(q);
    const results = allStudents.filter(s => {
      return removeVietnameseTones(s.fullName).includes(normalizedQ) ||
        s.studentId.includes(normalizedQ) ||
        (s.classCode && removeVietnameseTones(s.classCode).includes(normalizedQ));
    }).slice(0, 5); // Max 5 results

    setSearchResults(results);
    setShowSearchResults(true);
  };

  const handleLogout = () => {
    api.logActivity('Đăng xuất', 'Đăng xuất khỏi hệ thống');
    logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(item => !item.reqAdmin || isAdmin());

  return (
    <div className="flex h-screen bg-slate-50 print:h-auto print:block">
      {/* Mobile sidebar */}
      <div className={cn("fixed inset-0 z-50 lg:hidden hide-on-print", sidebarOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white flex flex-col">
          <div className="flex h-16 shrink-0 items-center gap-2.5 px-5" style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' }}>
            <GraduationCap className="h-8 w-8 text-white/90" />
            <span className="font-bold text-lg text-white tracking-tight">Công Tác SV</span>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            {filteredNavigation.map((item, idx) => {
              const isActive = location.pathname === item.href;
              const showDivider = idx > 0 && item.reqAdmin && !filteredNavigation[idx - 1].reqAdmin;
              return (
                <React.Fragment key={item.name}>
                  {showDivider && <div className="my-3 border-t border-slate-200" />}
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                      isActive
                        ? "bg-violet-50 text-violet-700 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-600 rounded-r-full" />}
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-violet-600")} />
                    <span className="flex-1">{item.name}</span>
                    {item.href === '/print-queue' && printQueueCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold text-white bg-violet-500 rounded-full">{printQueueCount}</span>
                    )}
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200/80 lg:bg-white hide-on-print">
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-5" style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' }}>
          <GraduationCap className="h-8 w-8 text-white/90" />
          <span className="font-bold text-lg text-white tracking-tight">Công Tác SV</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {filteredNavigation.map((item, idx) => {
            const isActive = location.pathname === item.href;
            const showDivider = idx > 0 && item.reqAdmin && !filteredNavigation[idx - 1].reqAdmin;
            return (
              <React.Fragment key={item.name}>
                {showDivider && (
                  <div className="my-3 flex items-center gap-2 px-3">
                    <div className="flex-1 border-t border-slate-200" />
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Quản trị</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>
                )}
                <Link
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                    isActive
                      ? "bg-violet-50 text-violet-700 shadow-sm border border-violet-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-600 rounded-r-full" />}
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-violet-600" : "group-hover:text-violet-500")} />
                  <span className="flex-1">{item.name}</span>
                  {item.href === '/print-queue' && printQueueCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold text-white bg-violet-500 rounded-full shadow-sm">{printQueueCount}</span>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.fullName || 'Người dùng'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64 print:pl-0 print:block">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 hide-on-print">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            {/* Global Search Bar */}
            <div className="flex flex-1 items-center">
              <div className="relative w-full max-w-md hidden md:block">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Tìm kiếm nhanh (Ctrl+K)..."
                  className="block w-full rounded-lg border-0 py-1.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm sm:leading-6"
                  value={searchQuery}
                  onChange={handleSearch}
                  onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                />

                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50">
                    {searchResults.length > 0 ? (
                      <ul className="max-h-80 overflow-y-auto py-1">
                        {searchResults.map(s => (
                          <li key={s.id}>
                            <Link
                              to={`/students?search=${s.studentId}`}
                              className="block px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-900 text-sm">{s.fullName}</span>
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s.studentId}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">{s.classCode || 'Chưa cập nhật lớp'}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500">
                        Không tìm thấy sinh viên nào.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500 relative focus:outline-none"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <span className="sr-only">View notifications</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <span className="font-bold text-slate-800 text-sm">Cảnh báo hệ thống</span>
                      <span className="text-xs text-slate-500">{notifications.length} thông báo</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                          {notifications.map((n) => (
                            <li key={n.id} className="p-4 hover:bg-slate-50 transition-colors">
                              <div className="flex gap-3 items-start">
                                <div className="mt-0.5 rounded-full bg-red-100 p-1.5 shrink-0">
                                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                                  <p className="text-[10px] text-slate-400 mt-1.5">{new Date(n.time).toLocaleDateString('vi-VN')}</p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-8 text-center text-sm text-slate-500">
                          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          Không có cảnh báo nào.
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                        <Link to="/distribution" className="text-xs font-medium text-violet-600 hover:text-violet-700">Đi đến trang Luân chuyển</Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col hidden sm:block">
                  <span className="text-sm font-medium text-slate-700 leading-tight">{user?.fullName || 'Người dùng'}</span>
                  <span className="text-[10px] text-slate-500 leading-tight uppercase tracking-wide">{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</span>
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        {location.pathname !== '/' && (
          <div className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-2 hide-on-print">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Link to="/" className="hover:text-violet-600 transition-colors">Tổng quan</Link>
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              <span className="text-slate-800">{ROUTE_NAMES[location.pathname] || 'Trang'}</span>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 print:overflow-visible print:block print:p-0 print:bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
