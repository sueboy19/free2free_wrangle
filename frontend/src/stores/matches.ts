import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import ApiService from '@/services/api';

export interface Match {
  id: number;
  activity_id: number;
  organizer_id: number;
  match_time: string;
  status: string;
  activity?: {
    id: number;
    title: string;
    target_count: number;
    description?: string;
    location?: {
      id: number;
      name: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    };
    created_by?: number;
  };
  organizer?: {
    id: number;
    name: string;
  };
}

interface MatchCache {
  data: Match[];
  timestamp: number;
}

interface ParticipationStatus {
  status: string;
}

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([]);
  const cache = ref<MatchCache | null>(null);
  const userParticipations = ref<Map<number, ParticipationStatus>>(new Map());
  const isLoading = ref(false);
  const lastFetchTime = ref<number | null>(null);

  // 計算屬性：檢查是否有配對已經過時
  const hasExpiredMatches = computed(() => {
    if (!cache.value || cache.value.data.length === 0) return false;
    const now = new Date();
    return cache.value.data.some((match) => new Date(match.match_time) < now);
  });

  // 計算屬性：快取是否為空
  const isCacheEmpty = computed(() => {
    return !cache.value || cache.value.data.length === 0;
  });

  // 獲取配對列表（帶快取）
  const fetchMatches = async (forceRefresh = false) => {
    // 如果不強制重新獲取，且快取不為空，且沒有過時的配對，直接返回快取資料
    if (!forceRefresh && !isCacheEmpty.value && !hasExpiredMatches.value) {
      console.log('從快取讀取配對資料');
      matches.value = cache.value!.data;
      return matches.value;
    }

    // 獲取新資料
    try {
      isLoading.value = true;
      const response = await ApiService.getMatches();
      const data = Array.isArray(response.data?.data) ? response.data.data : [];

      // 更新快取
      cache.value = {
        data,
        timestamp: Date.now(),
      };
      lastFetchTime.value = Date.now();

      matches.value = data;

      return matches.value;
    } catch (error) {
      console.error('獲取配對失敗:', error);
      // 如果請求失敗但有快取，返回快取資料
      if (cache.value) {
        matches.value = cache.value.data;
        return matches.value;
      }
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  // 獲取精選配對（首頁用，只取前 6 筆）
  const fetchFeaturedMatches = async () => {
    const allMatches = await fetchMatches();
    return allMatches.slice(0, 6);
  };

  // 獲取用戶的參與狀態
  const fetchParticipationStatus = async (matchId: number) => {
    try {
      const response = await ApiService.getMatchParticipationStatus(matchId);
      if (response.data?.has_participated) {
        userParticipations.value.set(matchId, {
          status: response.data.participation_status,
        });
      }
      return response.data;
    } catch (error) {
      console.error('獲取參與狀態失敗:', error);
      return null;
    }
  };

  // 獲取所有配對的參與狀態
  const fetchAllParticipationStatus = async () => {
    if (matches.value.length === 0) return;

    try {
      const allMatchIds = matches.value.map((m) => m.id);
      const participations = await Promise.all(
        allMatchIds.map((id) => ApiService.getMatchParticipationStatus(id))
      );

      participations.forEach((response: any, index) => {
        if (response.data?.has_participated) {
          userParticipations.value.set(allMatchIds[index], {
            status: response.data.participation_status,
          });
        }
      });
    } catch (error) {
      console.error('無法獲取參與狀態:', error);
    }
  };

  // 參與配對
  const joinMatch = async (matchId: number) => {
    await ApiService.joinMatch(matchId);
    // 清除快取，因為參與狀態可能改變
    clearCache();
  };

  // 獲取參與狀態
  const getParticipationStatus = (matchId: number) => {
    return userParticipations.value.get(matchId) || null;
  };

  // 檢查是否已參與
  const hasParticipated = (matchId: number) => {
    return !!getParticipationStatus(matchId);
  };

  // 檢查是否已批准
  const isApproved = (matchId: number) => {
    const status = getParticipationStatus(matchId);
    return status && status.status === 'approved';
  };

  // 檢查是否已拒絕
  const isRejected = (matchId: number) => {
    const status = getParticipationStatus(matchId);
    return status && status.status === 'rejected';
  };

  // 檢查是否待審核
  const isPending = (matchId: number) => {
    const status = getParticipationStatus(matchId);
    return status && status.status === 'pending';
  };

  // 清除快取
  const clearCache = () => {
    cache.value = null;
    lastFetchTime.value = null;
  };

  // 清除參與狀態
  const clearParticipations = () => {
    userParticipations.value.clear();
  };

  return {
    matches,
    isLoading,
    lastFetchTime,
    hasExpiredMatches,
    isCacheEmpty,
    fetchMatches,
    fetchFeaturedMatches,
    fetchParticipationStatus,
    fetchAllParticipationStatus,
    joinMatch,
    getParticipationStatus,
    hasParticipated,
    isApproved,
    isRejected,
    isPending,
    clearCache,
    clearParticipations,
  };
});
