import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { GraduationCap, Lock, User, Loader2, Settings } from 'lucide-react';
import { api } from '../services/api';
import { setCurrentUser, getCurrentUser } from '../services/auth';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect
    if (getCurrentUser()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch users from DB
      let users = [];
      try {
        users = await api.getUsers();
      } catch (err) {
        // If users table doesn't exist yet, we seed the default admin
        users = [];
      }

      // If no users exist at all, allow default admin login and seed it
      if (users.length === 0) {
        if (username === 'admin' && password === 'admin') {
          const defaultAdmin = {
            username: 'admin',
            password: 'admin', // In a real app this should be hashed
            role: 'admin',
            fullName: 'Quản trị viên hệ thống'
          };
          const createdAdmin = await api.createUser(defaultAdmin);
          setCurrentUser(createdAdmin);
          api.logActivity('Đăng nhập', 'Đăng nhập lần đầu bằng tài khoản admin mặc định');
          toast.success('Đăng nhập thành công');
          navigate('/', { replace: true });
          return;
        }
      }

      // 2. Validate credentials
      const user = users.find(u => u.username === username && u.password === password);

      if (user) {
        setCurrentUser(user);
        api.logActivity('Đăng nhập', 'Đăng nhập vào hệ thống');
        toast.success(`Chào mừng ${user.fullName}`);
        navigate('/', { replace: true });
      } else {
        toast.error('Sai tên đăng nhập hoặc mật khẩu');
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #5b21b6 75%, #7c3aed 100%)' }}>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 bg-white"
          style={{ animation: 'float 8s ease-in-out infinite' }}></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full opacity-10 bg-violet-300"
          style={{ animation: 'float 6s ease-in-out infinite reverse' }}></div>
        <div className="absolute top-1/4 right-1/4 w-48 h-48 rounded-full opacity-5 bg-white"
          style={{ animation: 'float 10s ease-in-out infinite 2s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-32 h-32 rounded-full opacity-5 bg-violet-200"
          style={{ animation: 'float 7s ease-in-out infinite 1s' }}></div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        .login-glow:focus-within {
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3), 0 0 20px rgba(139, 92, 246, 0.1);
        }
      `}</style>

      {/* Logo & Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-down">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)' }}>
            <GraduationCap className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Công Tác Sinh Viên
        </h2>
        <p className="mt-2 text-center text-sm text-violet-200/80 font-medium">
          Hệ thống Quản lý Hồ sơ & Biểu mẫu
        </p>
      </div>

      {/* Glassmorphism Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <div className="py-8 px-4 sm:rounded-2xl sm:px-10 border border-white/20 shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-violet-100 mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative rounded-xl login-glow transition-all duration-200">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-violet-300" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-3 py-3 border border-white/20 rounded-xl text-white placeholder-violet-300/50 sm:text-sm transition-all duration-200 focus:outline-none focus:border-violet-400/50"
                  style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-violet-100 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative rounded-xl login-glow transition-all duration-200">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-violet-300" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-3 py-3 border border-white/20 rounded-xl text-white placeholder-violet-300/50 sm:text-sm transition-all duration-200 focus:outline-none focus:border-violet-400/50"
                  style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)' }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng Nhập'}
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/setup')}
              className="flex items-center gap-2 text-sm text-violet-200/70 hover:text-white font-medium transition-colors duration-200"
            >
              <Settings className="w-4 h-4" />
              Cài đặt kết nối mạng LAN
            </button>
            <div className="text-xs text-violet-300/50 font-medium tracking-wide">
              Trường Cao đẳng Đại Việt Sài Gòn
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
