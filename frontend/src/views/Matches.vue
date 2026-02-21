<template>
  <div class="min-h-screen">
    <!-- 導航列 -->
    <Navigation />

    <!-- 主要內容 -->
    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 page-enter-up">
      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">配對列表</h1>
        <p class="text-gray-500 text-lg">瀏覽可參與的配對機會</p>
      </div>

      <!-- 搜尋和篩選 -->
      <div class="card-elevated mb-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="label">搜尋</label>
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                class="input pl-10"
                placeholder="搜尋活動標題或描述"
              />
              <svg
                class="w-5 h-5 text-gray-400 absolute left-3 top-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
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
            <button
              @click="clearFilters"
              class="btn-secondary w-full flex items-center justify-center"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              清除篩選
            </button>
          </div>
        </div>
      </div>

      <!-- 載入狀態 -->
      <div v-if="matchesStore.isLoading" class="text-center py-16">
        <div class="spinner h-12 w-12 mx-auto"></div>
        <p class="text-gray-400 mt-4">載入配對中...</p>
      </div>

      <!-- 配對列表 -->
      <div v-else-if="filteredMatches.length === 0" class="text-center py-16">
        <div
          class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <svg
            class="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p class="text-gray-500 text-lg mb-4">暫無可用的配對</p>
        <router-link to="/matches/create" class="btn-primary inline-flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          創建第一個配對
        </router-link>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(match, index) in filteredMatches"
          :key="match.id"
          :class="[
            'card group hover:-translate-y-1',
            isMyMatch(match)
              ? 'ring-2 ring-primary-200 bg-gradient-to-br from-primary-50/50 to-white'
              : '',
          ]"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <!-- 自己的配對標記 -->
          <div v-if="isMyMatch(match)" class="flex items-center justify-between mb-3">
            <span class="badge badge-primary">
              <svg class="mr-1.5 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              你的配對
            </span>
          </div>

          <!-- 活動資訊 -->
          <div class="mb-4">
            <h3
              class="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors"
            >
              {{ match.activity?.title || '未知活動' }}
            </h3>
            <p class="text-gray-500 text-sm mb-4 line-clamp-2">
              {{ match.activity?.description }}
            </p>

            <!-- 資訊列表 -->
            <div class="space-y-2">
              <div class="flex items-center text-sm text-gray-500">
                <div class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center mr-3">
                  <svg
                    class="w-4 h-4 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <span class="truncate">{{ match.activity?.location?.name || '未知地點' }}</span>
              </div>

              <div class="flex items-center text-sm text-gray-500">
                <div
                  class="w-8 h-8 rounded-lg bg-accent-coral/10 flex items-center justify-center mr-3"
                >
                  <svg
                    class="w-4 h-4 text-accent-coral"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span>{{ formatDate(match.match_time) }}</span>
              </div>

              <div class="flex items-center text-sm text-gray-500">
                <div
                  class="w-8 h-8 rounded-lg bg-accent-mint/10 flex items-center justify-center mr-3"
                >
                  <svg
                    class="w-4 h-4 text-accent-mint"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span>開局者: {{ match.organizer?.name || '未知' }}</span>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="flex space-x-3 pt-4 border-t border-gray-100" v-if="match.id">
            <router-link
              :to="`/matches/${match.id}`"
              class="flex-1 py-2.5 text-center text-sm font-semibold rounded-xl transition-colors"
              :class="
                isMyMatch(match)
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              "
            >
              查看詳情
            </router-link>
            <button
              v-if="!isMyMatch(match) && !matchesStore.hasParticipated(match.id)"
              @click="joinMatch(match.id)"
              :disabled="isJoining"
              class="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isJoining ? '加入中...' : '參與配對' }}
            </button>
            <span
              v-if="!isMyMatch(match) && matchesStore.hasParticipated(match.id)"
              class="flex-1 py-2.5 text-center text-sm font-medium rounded-xl"
              :class="{
                'bg-yellow-50 text-yellow-600': getParticipationLabel(match.id) === '待審核',
                'bg-green-50 text-green-600': getParticipationLabel(match.id) === '已通過',
                'bg-red-50 text-red-600': getParticipationLabel(match.id) === '已拒絕',
              }"
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

// 判斷是否為自己的配對
const isMyMatch = (match: Match) => {
  return match.organizer_id === authStore.user?.id;
};

// 篩選後的配對
const filteredMatches = computed(() => {
  let filtered = matchesStore.matches;

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
