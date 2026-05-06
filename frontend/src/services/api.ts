import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useToast } from 'vue-toastification';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
// 移除結尾的斜線以避免雙斜線問題
const cleanBaseURL = baseURL.replace(/\/+$/, '');

// 創建 API 客戶端實例
const apiClient: AxiosInstance = axios.create({
  baseURL: cleanBaseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    // 從 localStorage 獲取 token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 回應攔截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 檢查是否有業務邏輯錯誤（HTTP 200 但 body 包含 error 欄位）
    if (response.status === 200 && response.data?.error) {
      const toast = useToast();
      const errorMessage = response.data.error || '操作失敗，請重試';

      // 特殊處理：無效 token - 清除會話並重定向
      if (
        errorMessage === 'Invalid token' ||
        errorMessage === 'Invalid token or no token provided'
      ) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('refresh_token');
        toast.error('登入已過期，請重新登入');
        window.location.href = '/login';
        return Promise.reject({
          response: {
            status: 200,
            data: response.data,
          },
          message: errorMessage,
        });
      }

      // 特定錯誤訊息映射
      const specificMessages: Record<string, string> = {
        您已經參與過此配對: errorMessage,
        配對已滿員: errorMessage,
        '配對未開放，無法參與': errorMessage,
        開局者不能參與自己的配對: errorMessage,
        配對不存在: errorMessage,
        '配對已關閉或已完成，無法審核': errorMessage,
        '配對已滿員，無法批准更多參與者': errorMessage,
        參與者不存在: errorMessage,
        '您未參與此配對，無法評分': errorMessage,
        被評分者未參與此配對: errorMessage,
        不能評分自己: errorMessage,
        只能評分已完成的配對: errorMessage,
        您已經評分過此用戶: errorMessage,
      };

      const friendlyMessage = specificMessages[errorMessage] || errorMessage;
      toast.error(friendlyMessage);

      // 返回一個被拒絕的 Promise
      return Promise.reject({
        response: {
          status: 200,
          data: response.data,
        },
        message: errorMessage,
      });
    }

    return response;
  },
  (error) => {
    const toast = useToast();

    // 如果錯誤對象已經有 response 且 status 為 200（業務邏輯錯誤）
    if (error.response?.status === 200) {
      // 這種錯誤已經在上面處理過了，直接拒絕
      return Promise.reject(error);
    }

    if (error.response) {
      // 伺服器回應錯誤（非 200 狀態碼）
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // 未授權，清除 token 並重定向到登入頁
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('refresh_token');
          toast.error('登入已過期，請重新登入');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('權限不足，無法執行此操作');
          break;
        case 404:
          toast.error('請求的資源不存在');
          break;
        case 500:
          toast.error('伺服器內部錯誤，請稍後再試');
          break;
        default:
          toast.error(data?.message || '操作失敗，請重試');
      }
    } else if (error.request) {
      // 網路錯誤
      toast.error('網路連線失敗，請檢查網路設定');
    } else {
      // 其他錯誤
      toast.error('發生未知錯誤，請重試');
    }

    return Promise.reject(error);
  }
);

// API 服務類別
export class ApiService {
  // 用戶認證相關
  static async loginWithFacebook() {
    return apiClient.get('/auth/facebook');
  }

  static async loginWithInstagram() {
    return apiClient.get('/auth/instagram');
  }

  static async getProfile() {
    return apiClient.get('/profile');
  }

  static async logout() {
    return apiClient.get('/logout');
  }

  // 配對活動管理
  static async getActivities() {
    return apiClient.get('/activities');
  }

  static async getActivity(id: number) {
    return apiClient.get(`/activities/${id}`);
  }

  static async createActivity(activityData: any) {
    return apiClient.post('/admin/activities', activityData);
  }

  static async updateActivity(id: number, activityData: any) {
    return apiClient.put(`/admin/activities/${id}`, activityData);
  }

  static async deleteActivity(id: number) {
    return apiClient.delete(`/admin/activities/${id}`);
  }

  static async batchDeleteActivities(ids: number[]) {
    return apiClient.post('/admin/activities/batch-delete', { ids });
  }

  // 地點管理
  static async getLocations() {
    return apiClient.get('/locations');
  }

  static async getLocation(id: number) {
    return apiClient.get(`/locations/${id}`);
  }

  static async createLocation(locationData: any) {
    return apiClient.post('/admin/locations', locationData);
  }

  static async updateLocation(id: number, locationData: any) {
    return apiClient.put(`/admin/locations/${id}`, locationData);
  }

  static async deleteLocation(id: number) {
    return apiClient.delete(`/admin/locations/${id}`);
  }

  // 配對相關
  static async getMatches(limit?: number) {
    const params = limit ? { limit } : {};
    return apiClient.get('/matches', { params });
  }

  static async createMatch(matchData: any) {
    return apiClient.post('/matches', matchData);
  }

  static async joinMatch(id: number) {
    return apiClient.post(`/matches/${id}/join`);
  }

  static async getPastMatches() {
    return apiClient.get('/user/matches?status=completed');
  }

  static async getMatchDetails(id: number) {
    return apiClient.get(`/matches/${id}`);
  }

  static async getMatchParticipants(id: number) {
    return apiClient.get(`/matches/${id}/participants`);
  }

  static async getMatchParticipationStatus(id: number) {
    return apiClient.get(`/matches/${id}/participation-status`);
  }

  // 開局者功能
  static async approveParticipant(matchId: number, participantId: number) {
    return apiClient.put(`/matches/${matchId}/participants/${participantId}`, {
      status: 'approved',
    });
  }

  static async rejectParticipant(matchId: number, participantId: number) {
    return apiClient.put(`/matches/${matchId}/participants/${participantId}`, {
      status: 'rejected',
    });
  }

  // 評分功能
  static async createReview(matchId: number, reviewData: any) {
    return apiClient.post('/reviews', { ...reviewData, match_id: matchId });
  }

  static async likeReview(reviewId: number) {
    return apiClient.post(`/reviews/${reviewId}/like`, { is_like: true });
  }

  static async dislikeReview(reviewId: number) {
    return apiClient.post(`/reviews/${reviewId}/like`, { is_like: false });
  }

  // 咖啡促銷相關
  static async getCoffeePromotions() {
    return apiClient.get('/promotions');
  }

  static async importCoffeePromotions() {
    return apiClient.post('/admin/import-coffee-promotions');
  }
}

export { apiClient };
export default ApiService;
