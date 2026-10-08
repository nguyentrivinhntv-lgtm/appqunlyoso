import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Wifi, WifiOff, Server, Monitor, CheckCircle2, XCircle, 
  Loader2, Globe, Copy, RefreshCw, Info, ArrowRight, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { 
  getConnectionConfig, saveConnectionConfig, 
  getApiBaseUrl, getHelperUrl, testConnection 
} from '../services/connectionConfig';

export default function ConnectionSettings() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isLoggedIn = !!currentUser;
  
  // If not logged in, force client mode for the UI view (because server already has accounts)
  const initialConfig = getConnectionConfig();
  if (!isLoggedIn && initialConfig.mode === 'server') {
    initialConfig.mode = 'client';
  }

  const [config, setConfig] = useState(initialConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [localIPs, setLocalIPs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('unknown'); // 'connected' | 'disconnected' | 'unknown'

  // Load local IPs (only works in Electron)
  useEffect(() => {
    if (window.electronAPI?.getLocalIPs) {
      window.electronAPI.getLocalIPs().then(ips => {
        setLocalIPs(ips);
      }).catch(() => {});
    }
  }, []);

  // Check current connection status
  useEffect(() => {
    checkCurrentConnection();
  }, []);

  const checkCurrentConnection = async () => {
    try {
      const res = await fetch(getApiBaseUrl(), { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  const handleModeChange = (mode) => {
    setConfig(prev => ({ ...prev, mode }));
    setTestResult(null);
  };

  const handleIPChange = (e) => {
    setConfig(prev => ({ ...prev, serverIP: e.target.value }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!config.serverIP) {
      toast.error('Vui lòng nhập IP của máy Server');
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(config.serverIP, config.serverPort);
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    if (config.mode === 'client' && !config.serverIP) {
      toast.error('Vui lòng nhập IP của máy Server');
      return;
    }
    saveConnectionConfig(config);
    toast.success('Đã lưu cài đặt kết nối!');
    if (!isLoggedIn) {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const copyIP = (ip) => {
    navigator.clipboard.writeText(ip).then(() => {
      toast.success(`Đã sao chép: ${ip}`);
    });
  };

  const savedConfig = getConnectionConfig();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-500" />
            Cài Đặt Kết Nối Mạng
          </h1>
          <p className="text-slate-500 mt-2">
            Thiết lập đồng bộ dữ liệu giữa các máy trong cùng mạng LAN
          </p>
        </div>
        {!isLoggedIn && (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Đăng nhập
          </button>
        )}
      </div>

      {/* Current status */}
      <div className={`rounded-xl p-4 mb-6 border flex items-center gap-3 ${
        connectionStatus === 'connected' 
          ? 'bg-emerald-50 border-emerald-200' 
          : connectionStatus === 'disconnected'
          ? 'bg-red-50 border-red-200'
          : 'bg-slate-50 border-slate-200'
      }`}>
        {connectionStatus === 'connected' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        ) : connectionStatus === 'disconnected' ? (
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
        ) : (
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
        )}
        <div className="flex-1">
          <div className="font-medium text-sm">
            {connectionStatus === 'connected' && 'Đang kết nối thành công'}
            {connectionStatus === 'disconnected' && 'Không thể kết nối đến server'}
            {connectionStatus === 'unknown' && 'Đang kiểm tra kết nối...'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Chế độ hiện tại: <span className="font-semibold">{savedConfig.mode === 'server' ? 'Server (Máy chính)' : `Client → ${savedConfig.serverIP || 'chưa cấu hình'}`}</span>
            {' • '}API: {getApiBaseUrl()}
          </div>
        </div>
        <button onClick={checkCurrentConnection} className="p-2 hover:bg-white/60 rounded-lg transition-colors" title="Kiểm tra lại">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Server Mode */}
        {isLoggedIn && (
          <button
            onClick={() => handleModeChange('server')}
            className={`text-left rounded-xl p-5 border-2 transition-all ${
              config.mode === 'server'
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                config.mode === 'server' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Máy Server</div>
                <div className="text-xs text-slate-500">Máy chính, lưu trữ dữ liệu</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Chọn nếu đây là máy <strong>chính</strong> chứa dữ liệu. Các máy khác sẽ kết nối đến máy này.
            </p>
            {config.mode === 'server' && (
              <div className="mt-3 flex items-center gap-1 text-xs text-blue-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đang chọn
              </div>
            )}
          </button>
        )}

        {/* Client Mode */}
        <button
          onClick={() => handleModeChange('client')}
          className={`text-left rounded-xl p-5 border-2 transition-all ${!isLoggedIn ? 'md:col-span-2' : ''} ${
            config.mode === 'client'
              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              config.mode === 'client' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Máy Client</div>
              <div className="text-xs text-slate-500">Kết nối đến máy chính</div>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Chọn nếu đây là máy <strong>phụ</strong>. Sẽ kết nối đến máy Server qua mạng LAN để dùng chung dữ liệu.
          </p>
          {config.mode === 'client' && (
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đang chọn
            </div>
          )}
        </button>
      </div>

      {/* Server Mode Info */}
      {config.mode === 'server' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            Thông tin máy Server
          </h3>
          
          {localIPs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 mb-3">
                Đưa IP dưới đây cho máy Client để kết nối:
              </p>
              {localIPs.map((ip, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                  <Wifi className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <span className="font-mono text-lg font-bold text-blue-700">{ip.address}</span>
                    <span className="text-xs text-slate-400 ml-2">({ip.name})</span>
                  </div>
                  <button 
                    onClick={() => copyIP(ip.address)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Sao chép
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700 flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>Không thể xác định IP. Chạy <code className="bg-amber-100 px-1 rounded">ipconfig</code> trong CMD để xem IP máy bạn.</span>
            </div>
          )}

          <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <strong>Lưu ý:</strong> Đảm bảo Windows Firewall cho phép port <strong>5000</strong> và <strong>5001</strong>.
            <br />
            <span className="text-xs">Vào Windows Defender Firewall → Advanced Settings → Inbound Rules → New Rule → Port → TCP 5000, 5001 → Allow</span>
          </div>
        </div>
      )}

      {/* Client Mode Config */}
      {config.mode === 'client' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-emerald-500" />
            Kết nối đến máy Server
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Địa chỉ IP máy Server
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ví dụ: 192.168.1.100"
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-base"
                value={config.serverIP}
                onChange={handleIPChange}
              />
              <button
                onClick={handleTestConnection}
                disabled={testing || !config.serverIP}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                Kiểm tra
              </button>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              {testResult.message}
            </div>
          )}

          <div className="mt-4 bg-emerald-50 rounded-lg p-3 text-sm text-emerald-700">
            <strong>Hướng dẫn:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
              <li>Mở app trên máy Server (máy chính chứa dữ liệu)</li>
              <li>Vào <strong>Cài đặt kết nối</strong> → xem IP của máy Server</li>
              <li>Nhập IP đó vào ô trên → Bấm <strong>Kiểm tra</strong></li>
              <li>Nếu thành công → Bấm <strong>Lưu cài đặt</strong></li>
            </ol>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="font-semibold text-slate-900 mb-3">Cách hoạt động</h3>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
            <Server className="w-4 h-4 text-blue-500" />
            <span className="font-medium">Máy Server</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="text-xs text-slate-500">cùng mạng LAN</div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
            <Monitor className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">Máy Client</span>
          </div>
        </div>
        <ul className="mt-3 text-xs text-slate-500 space-y-1 list-disc list-inside">
          <li><strong>Máy Server</strong> chứa tất cả dữ liệu (db.json) và chạy API server</li>
          <li><strong>Máy Client</strong> kết nối đến máy Server qua IP nội bộ, đọc/ghi dữ liệu chung</li>
          <li>Dữ liệu đồng bộ <strong>real-time</strong> — thêm/sửa/xóa trên máy nào cũng thấy ngay trên máy kia</li>
          <li>Máy Server phải <strong>bật app</strong> thì máy Client mới dùng được</li>
        </ul>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 shadow-sm transition-all hover:shadow-md"
        >
          <CheckCircle2 className="w-5 h-5" />
          Lưu cài đặt
        </button>
      </div>
    </div>
  );
}
