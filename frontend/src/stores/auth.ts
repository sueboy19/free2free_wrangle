import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '@/services/api';
import { useToast } from 'vue-toastification';
import router from '@/router';

export interface User {
  id: number;
  social_id: string;
  social_provider: string;
  name: string;
  email: string;
  avatar_url?: string;
  is_admin?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const useAuthStore = defineStore('auth', () => {
  // 初始化時從 localStorage 讀取
  const savedToken = localStorage.getItem('auth_token');
  const savedUser = localStorage.getItem('user');

  // 嘗試解析 user，如果失敗則設為 null
  let parsedUser: User | null = null;
  if (savedUser) {
    try {
      parsedUser = JSON.parse(savedUser);
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
      localStorage.removeItem('user'); // 清除無效數據
    }
  }

  const user = ref<User | null>(parsedUser);
  const token = ref<string | null>(savedToken);
  const toast = useToast();

  // 計算屬性
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.is_admin === true);

  // 初始化時設置 API header
  if (savedToken) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
  }

  // 設置 API 預設標頭
  const setAuthHeader = () => {
    if (token.value) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
    }
  };

  // 設置會話（用於 OAuth callback - 實際上現在由後端 HTML 設置）
  const setSession = (userData: User, accessToken: string) => {
    user.value = userData;
    token.value = accessToken;

    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setAuthHeader();
  };

  // Mock 登入方法（僅開發環境）
  const mockLogin = async (mockData?: { id?: string; name?: string; email?: string }) => {
    try {
      const response = await apiClient.post('/auth/mock', mockData || {});
      const { user: userData, tokens } = response.data;

      user.value = userData;
      token.value = tokens.access;

      localStorage.setItem('auth_token', tokens.access);
      localStorage.setItem('user', JSON.stringify(userData));

      setAuthHeader();

      toast.success(`歡迎，${userData.name}！`);
    } catch (error) {
      console.error('Mock 登入錯誤:', error);
      toast.error('Mock 登入失敗，請重試');
      throw error;
    }
  };

  // 登入方法 - 使用 redirect 方式（支援手機和桌面）
  const login = async (provider: 'facebook' | 'instagram') => {
    try {
      // 構建 OAuth URL（後端會自動處理 redirect）
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(
        /\/+$/,
        ''
      );
      const authUrl = `${baseUrl}/auth/${provider}`;

      // 使用 redirect 而非 popup
      window.location.href = authUrl;
    } catch (error) {
      console.error('登入錯誤:', error);
      toast.error('登入失敗，請重試');
      throw error;
    }
  };

  // 獲取用戶資料
  const fetchUserProfile = async () => {
    try {
      console.log('fetchUserProfile called, token:', !!token.value);
      const response = await apiClient.get('/profile');
      // 統一返回格式：{ data: user }
      const userData = response.data?.data || response.data;
      console.log('fetchUserProfile success:', userData?.name);
      user.value = userData;
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      console.error('獲取用戶資料失敗:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      logout();
    }
  };

  // 登出方法
  const logout = async () => {
    try {
      // 清除本地狀態
      user.value = null;
      token.value = null;

      // 清除 localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      // 清除 API 標頭
      delete apiClient.defaults.headers.common['Authorization'];

      // 調用後端登出（可選）
      try {
        await apiClient.get('/logout');
      } catch (error) {
        // 忽略登出 API 錯誤
        console.warn('後端登出失敗:', error);
      }

      // 導航到登入頁面
      await router.push('/login');

      toast.success('已成功登出');
    } catch (error) {
      console.error('登出錯誤:', error);
    }
  };

  // 恢復會話
  const restoreSession = () => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        token.value = savedToken;
        user.value = JSON.parse(savedUser);
        setAuthHeader();
      } catch (error) {
        console.error('恢復會話失敗:', error);
        logout();
      }
    }
  };

  // 檢查權限
  const hasPermission = (requiredRole?: 'admin' | 'organizer') => {
    if (requiredRole === 'admin') {
      return isAdmin.value;
    }
    return isAuthenticated.value;
  };

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    login,
    mockLogin,
    logout,
    fetchUserProfile,
    restoreSession,
    hasPermission,
    setSession,
  };
});
