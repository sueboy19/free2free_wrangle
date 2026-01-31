<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 導航列 -->
    <Navigation />

    <!-- 主要內容 -->
    <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <!-- 頁面標題 -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">配對列表</h1>
        <p class="text-gray-600">瀏覽可參與的配對機會</p>
      </div>

      <!-- 搜尋和篩選 -->
      <div class="card mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="label">搜尋</label>
            <input
              v-model="searchQuery"
              type="text"
              class="input"
              placeholder="搜尋活動標題或描述"
            />
          </div>
          <div>
            <label class="label">地點</label>
            <select v-model="selectedLocation" class="input">
              <option value="">所有地點</option>
              <option
                v-for="location in availableLocations"
                :key="location.id"
                :value="location.id"
              >
                {{ location.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">日期</label>
            <input v-model="selectedDate" type="date" class="input" />
          </div>
          <div class="flex items-end">
            <button @click="clearFilters" class="btn-secondary w-full">清除篩選</button>
          </div>
        </div>
      </div>

      <!-- 載入狀態 -->
      <div v-if="matchesStore.isLoading" class="text-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"
        ></div>
        <p class="text-gray-500 mt-4">載入配對中...</p>
      </div>

      <!-- 配對列表 -->
      <div v-else-if="filteredMatches.length === 0" class="text-center py-12">
        <p class="text-gray-500 text-lg">暫無可用的配對</p>
        <router-link to="/matches/create" class="btn-primary mt-4 inline-block">
          創建第一個配對
        </router-link>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="match in filteredMatches"
          :key="match.id"
          class="card hover:shadow-lg transition-shadow duration-200"
        >
          <!-- 活動資訊 -->
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{ match.activity?.title || '未知活動' }}
            </h3>
            <p class="text-gray-600 text-sm mb-3">
              {{ match.activity?.description }}
            </p>

            <!-- 地點資訊 -->
            <div class="flex items-center text-sm text-gray-500 mb-2">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ match.activity?.location?.name || '未知地點' }}
            </div>

            <!-- 時間資訊 -->
            <div class="flex items-center text-sm text-gray-500 mb-2">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ formatDate(match.match_time) }}
            </div>

            <!-- 開局者資訊 -->
            <div class="flex items-center text-sm text-gray-500">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              開局者: {{ match.organizer?.name || '未知' }}
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="flex space-x-2" v-if="match.id">
            <router-link
              :to="`/matches/${match.id}`"
              class="flex-1 btn-secondary text-center text-sm"
            >
              查看詳情
            </router-link>
            <button
              v-if="!matchesStore.hasParticipated(match.id) && !isMatchOrganizer(match.id)"
              @click="joinMatch(match.id)"
              :disabled="isJoining"
              class="flex-1 btn-primary text-sm"
            >
              {{ isJoining ? '加入中...' : '參與配對' }}
            </button>
            <span
              v-if="matchesStore.hasParticipated(match.id)"
              class="flex-1 py-3 text-center text-sm"
            >
              {{ getParticipationLabel(match.id) }}
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useMatchesStore, type Match } from '@/stores/matches';
import { useToast } from 'vue-toastification';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import Navigation from '@/components/Navigation.vue';

const authStore = useAuthStore();
const matchesStore = useMatchesStore();
const toast = useToast();

const isJoining = ref(false);
const searchQuery = ref('');
const selectedLocation = ref('');
const selectedDate = ref('');

// 篩選後的配對
const filteredMatches = computed(() => {
  let filtered = matchesStore.matches;

  // 過濾開局者自己的配對
  filtered = filtered.filter((match) => match.organizer_id !== authStore.user?.id);

  // 搜尋篩選
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (match: Match) =>
        match.activity?.title?.toLowerCase().includes(query) ||
        match.activity?.description?.toLowerCase().includes(query)
    );
  }

  // 地點篩選
  if (selectedLocation.value) {
    filtered = filtered.filter(
      (match: Match) => match.activity?.location?.id === parseInt(selectedLocation.value)
    );
  }

  // 日期篩選
  if (selectedDate.value) {
    const selectedDateTime = new Date(selectedDate.value);
    filtered = filtered.filter((match: Match) => {
      const matchDate = new Date(match.match_time);
      return matchDate.toDateString() === selectedDateTime.toDateString();
    });
  }

  return filtered;
});

// 可用地點（從當前配對中提取）
const availableLocations = computed(() => {
  const locationMap = new Map<number, { id: number; name: string }>();

  matchesStore.matches.forEach((match: Match) => {
    if (match.activity?.location) {
      const location = match.activity.location;
      locationMap.set(location.id, {
        id: location.id,
        name: location.name || '未知地點',
      });
    }
  });

  return Array.from(locationMap.values()).sort((a, b) => a.id - b.id);
});

// 判斷是否為開局者
const isMatchOrganizer = (matchId: number) => {
  const match = matchesStore.matches.find((m: Match) => m.id === matchId);
  return match?.organizer_id === authStore.user?.id;
};

// 獲取參與狀態標籤
const getParticipationLabel = (matchId: number) => {
  const status = matchesStore.getParticipationStatus(matchId);
  switch (status?.status) {
    case 'pending':
      return '待審核';
    case 'approved':
      return '已通過';
    case 'rejected':
      return '已拒絕';
    default:
      return '';
  }
};

// 格式化日期
const formatDate = (date: string | number) => {
  if (!date) return '未設定';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '未設定';
  return format(d, 'MM月dd日 HH:mm', { locale: zhTW });
};

// 載入配對列表
const loadMatches = async () => {
  try {
    await matchesStore.fetchMatches();

    // 如果用戶已登入，獲取參與狀態
    if (authStore.user?.id) {
      await matchesStore.fetchAllParticipationStatus();
    }
  } catch (error) {
    console.error('載入配對失敗:', error);
    toast.error('載入配對失敗');
  }
};

// 參與配對
const joinMatch = async (matchId: number) => {
  try {
    if (!matchId || isNaN(matchId)) {
      toast.error('無效的配對 ID');
      return;
    }

    isJoining.value = true;
    await matchesStore.joinMatch(matchId);
    toast.success('成功參與配對！');

    // 重新載入配對列表和參與狀態
    await loadMatches();
  } catch (error) {
    console.error('參與配對失敗:', error);
    toast.error('參與配對失敗，請重試');
  } finally {
    isJoining.value = false;
  }
};

// 清除篩選
const clearFilters = () => {
  searchQuery.value = '';
  selectedLocation.value = '';
  selectedDate.value = '';
};

onMounted(() => {
  loadMatches();
});
</script>
