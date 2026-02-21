<template>
  <div class="min-h-screen">
    <!-- 導航列 -->
    <Navigation />

    <!-- 主要內容 -->
    <main class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 page-enter-up">
      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">個人資料</h1>
        <p class="text-gray-500 text-lg">管理您的個人資訊</p>
      </div>

      <!-- 用戶資訊卡片 -->
      <div class="card-elevated mb-8">
        <div class="flex items-center space-x-6">
          <!-- 頭像 -->
          <div class="flex-shrink-0">
            <div class="relative">
              <img
                :src="authStore.user?.avatar_url || '/default-avatar.svg'"
                @error="handleImageError"
                :alt="authStore.user?.name"
                class="h-24 w-24 rounded-3xl object-cover ring-4 ring-primary-100"
              />
              <div
                class="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white"
              ></div>
            </div>
          </div>

          <!-- 基本資訊 -->
          <div class="flex-1">
            <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ authStore.user?.name }}</h2>
            <p class="text-gray-500 mb-2">{{ authStore.user?.email }}</p>
            <div class="flex items-center space-x-3">
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600"
              >
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                {{
                  authStore.user?.social_provider === 'facebook'
                    ? 'Facebook'
                    : authStore.user?.social_provider === 'instagram'
                      ? 'Instagram'
                      : authStore.user?.social_provider === 'google'
                        ? 'Google'
                        : authStore.user?.social_provider === 'line'
                          ? 'Line'
                          : authStore.user?.social_provider
                }}
              </span>
              <span
                v-if="authStore.isAdmin"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-accent-purple to-primary-500 text-white"
              >
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                管理員
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 統計資訊 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card-elevated text-center group">
          <div
            class="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform"
          >
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div class="text-3xl font-bold text-gradient mb-1">{{ stats.organizedCount }}</div>
          <div class="text-gray-500 font-medium">開局數量</div>
        </div>
        <div class="card-elevated text-center group">
          <div
            class="w-14 h-14 bg-gradient-to-br from-accent-coral to-accent-pink rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform"
          >
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div class="text-3xl font-bold text-gradient-coral mb-1">
            {{ stats.participatedCount }}
          </div>
          <div class="text-gray-500 font-medium">參與數量</div>
        </div>
        <div class="card-elevated text-center group">
          <div
            class="w-14 h-14 bg-gradient-to-br from-accent-mint to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform"
          >
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div
            class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-mint to-teal-500 mb-1"
          >
            {{ stats.completedCount }}
          </div>
          <div class="text-gray-500 font-medium">完成數量</div>
        </div>
      </div>

      <!-- 最近活動 -->
      <div class="card-elevated">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-xl font-bold text-gray-900">最近活動</h3>
            <p class="text-gray-500 mt-1">您的配對活動記錄</p>
          </div>
          <router-link
            to="/my-matches"
            class="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center transition-colors"
          >
            查看全部
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </router-link>
        </div>

        <div v-if="isLoading" class="text-center py-12">
          <div class="spinner h-10 w-10 mx-auto"></div>
          <p class="text-gray-400 mt-4">載入中...</p>
        </div>

        <div v-else-if="recentActivities.length === 0" class="text-center py-12">
          <div
            class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-8 h-8 text-gray-400"
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
          <p class="text-gray-500">暫無活動記錄</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(activity, index) in recentActivities"
            :key="activity.id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200"
            :style="{ animationDelay: `${index * 50}ms` }"
          >
            <div class="flex items-center space-x-4">
              <div
                :class="[
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  activity.type === 'organize' ? 'bg-primary-100' : 'bg-accent-mint/10',
                ]"
              >
                <svg
                  v-if="activity.type === 'organize'"
                  class="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <svg
                  v-else
                  class="w-6 h-6 text-accent-mint"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-900">
                  {{ activity.type === 'organize' ? '開局' : '參與' }}:
                  {{ activity.activity_title }}
                </p>
                <p class="text-sm text-gray-500">{{ formatDate(activity.match_time) }}</p>
              </div>
            </div>
            <span
              :class="[
                'badge',
                activity.status === 'open'
                  ? 'badge-success'
                  : activity.status === 'completed'
                    ? 'badge-primary'
                    : 'badge-danger',
              ]"
            >
              {{
                activity.status === 'open'
                  ? '進行中'
                  : activity.status === 'completed'
                    ? '已完成'
                    : '已取消'
              }}
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import ApiService from '@/services/api';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import Navigation from '@/components/Navigation.vue';

const authStore = useAuthStore();

const isLoading = ref(false);
const recentActivities = ref<any[]>([]);
const stats = ref({
  organizedCount: 0,
  participatedCount: 0,
  completedCount: 0,
});

// 格式化日期
const formatDate = (date: string | number) => {
  if (!date) return '未設定';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '未設定';
  return format(d, 'MM月dd日 HH:mm', { locale: zhTW });
};

// 處理圖片載入錯誤
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = '/default-avatar.svg';
};

// 載入統計資料
const loadStats = async () => {
  try {
    const matchesResponse = await ApiService.getMatches();
    const allMatches = Array.isArray(matchesResponse.data?.data) ? matchesResponse.data.data : [];

    stats.value.organizedCount = allMatches.filter(
      (match: any) => match.organizer_id === authStore.user?.id
    ).length;

    stats.value.participatedCount = allMatches.filter(
      (match: any) => match.organizer_id !== authStore.user?.id
    ).length;

    stats.value.completedCount = allMatches.filter(
      (match: any) => match.status === 'completed'
    ).length;
  } catch (error) {
    console.error('載入統計資料失敗:', error);
  }
};

// 載入最近活動
const loadRecentActivities = async () => {
  try {
    isLoading.value = true;

    // 載入最近的配對活動
    const response = await ApiService.getMatches();
    const matches = Array.isArray(response.data?.data) ? response.data.data : [];

    // 轉換為活動記錄格式
    recentActivities.value = matches
      .map((match: any) => ({
        id: match.id,
        type: match.organizer_id === authStore.user?.id ? 'organize' : 'participate',
        activity_title: match.activity?.title,
        match_time: match.match_time,
        status: match.status,
      }))
      .slice(0, 5); // 只顯示最近5筆
  } catch (error) {
    console.error('載入最近活動失敗:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadStats();
  loadRecentActivities();
});
</script>
