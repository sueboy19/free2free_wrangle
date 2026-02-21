<template>
  <div class="min-h-screen">
    <!-- 導航列 -->
    <nav class="navbar-glass sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gradient">買一送一配對</h1>
          </div>

          <!-- 桌面版導航 -->
          <div class="hidden md:flex items-center space-x-2" v-if="authStore.isAuthenticated">
            <router-link to="/matches" class="nav-link">配對列表</router-link>
            <router-link to="/my-matches" class="nav-link">我的配對</router-link>
            <router-link to="/profile" class="nav-link">個人資料</router-link>
            <router-link v-if="authStore.isAdmin" to="/admin" class="nav-link"
              >管理後台</router-link
            >
            <button @click="authStore.logout" class="btn-secondary text-sm py-2 px-4 ml-2">
              登出
            </button>
          </div>

          <!-- 登入按鈕 -->
          <div class="flex items-center" v-else>
            <router-link to="/login" class="btn-primary">登入</router-link>
          </div>
        </div>
      </div>

      <!-- 手機版導航 -->
      <div class="md:hidden border-t border-gray-100" v-if="authStore.isAuthenticated">
        <div class="px-4 py-3 space-y-1 bg-white/50 backdrop-blur-lg">
          <router-link
            to="/matches"
            class="block px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
          >
            配對列表
          </router-link>
          <router-link
            to="/my-matches"
            class="block px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
          >
            我的配對
          </router-link>
          <router-link
            to="/profile"
            class="block px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
          >
            個人資料
          </router-link>
          <router-link
            v-if="authStore.isAdmin"
            to="/admin"
            class="block px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
          >
            管理後台
          </router-link>
          <button
            @click="authStore.logout"
            class="block w-full text-left px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            登出
          </button>
        </div>
      </div>
    </nav>

    <!-- 主要內容 -->
    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 page-enter-up">
      <!-- 未登入狀態 -->
      <div v-if="!authStore.isAuthenticated" class="text-center py-16">
        <div class="max-w-2xl mx-auto">
          <div class="mb-8">
            <div
              class="w-24 h-24 bg-gradient-to-br from-primary-400 to-accent-purple rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-glow animate-float"
            >
              <svg
                class="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 class="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              歡迎來到買一送一配對
            </h2>
            <p class="text-xl text-gray-500 mb-8 leading-relaxed">
              找尋夥伴一起享受買一送一的優惠！<br
                class="hidden sm:block"
              />登入後即可開始瀏覽和創建配對。
            </p>
          </div>
          <router-link to="/login" class="btn-accent text-lg px-10 py-4 inline-flex items-center">
            <span>立即登入</span>
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </router-link>
        </div>
      </div>

      <!-- 已登入狀態 -->
      <div v-else>
        <!-- 歡迎訊息 -->
        <div class="mb-10">
          <h2 class="text-3xl font-bold text-gray-900 mb-2">
            歡迎回來，<span class="text-gradient">{{ authStore.user?.name }}</span
            >！
          </h2>
          <p class="text-gray-500 text-lg">
            今日已有
            <span class="font-semibold text-primary-600">{{ todayMatchesCount }}</span>
            個新的配對機會
          </p>
        </div>

        <!-- 快速操作 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div class="card-elevated group">
            <div
              class="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform"
            >
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">瀏覽配對</h3>
            <p class="text-gray-500 mb-6">查看可參與的配對機會，找到志同道合的夥伴</p>
            <router-link to="/matches" class="btn-primary w-full text-center block">
              立即瀏覽
            </router-link>
          </div>

          <div class="card-elevated group">
            <div
              class="w-14 h-14 bg-gradient-to-br from-accent-coral to-accent-pink rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform"
            >
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">創建配對</h3>
            <p class="text-gray-500 mb-6">發起一個新的配對活動，邀請他人一起參與</p>
            <router-link to="/matches/create" class="btn-accent w-full text-center block">
              創建配對
            </router-link>
          </div>

          <div class="card-elevated group">
            <div
              class="w-14 h-14 bg-gradient-to-br from-accent-mint to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform"
            >
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">我的配對</h3>
            <p class="text-gray-500 mb-6">查看我參與的配對，管理我的活動記錄</p>
            <router-link to="/my-matches" class="btn-primary w-full text-center block">
              查看配對
            </router-link>
          </div>
        </div>

        <!-- 今日配對預覽 -->
        <div class="card-elevated">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-2xl font-bold text-gray-900">今日推薦配對</h3>
              <p class="text-gray-500 mt-1">精選適合您的配對活動</p>
            </div>
            <router-link
              to="/matches"
              class="text-primary-600 hover:text-primary-700 font-medium flex items-center transition-colors"
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

          <div v-if="matchesStore.isLoading" class="text-center py-12">
            <div class="spinner h-10 w-10 mx-auto"></div>
            <p class="text-gray-400 mt-4">載入中...</p>
          </div>

          <div v-else-if="featuredMatches.length === 0" class="text-center py-12">
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
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p class="text-gray-500 text-lg">暫無可用的配對</p>
            <router-link to="/matches/create" class="btn-primary mt-4 inline-block">
              創建第一個配對
            </router-link>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="(match, index) in featuredMatches"
              :key="match.id"
              class="group bg-gray-50 rounded-2xl p-5 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-gray-100"
              :style="{ animationDelay: `${index * 100}ms` }"
            >
              <div class="flex items-start justify-between mb-3">
                <h4
                  class="font-bold text-gray-900 text-lg group-hover:text-primary-600 transition-colors"
                >
                  {{ match.activity?.title }}
                </h4>
                <span class="badge badge-primary">{{
                  match.status === 'open' ? '進行中' : '已結束'
                }}</span>
              </div>
              <p class="text-gray-500 text-sm mb-4 line-clamp-2">
                {{ match.activity?.description }}
              </p>
              <div class="space-y-2 text-sm text-gray-400 mb-4">
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 mr-2 text-primary-400"
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
                  {{ formatDate(match.match_time) }}
                </div>
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 mr-2 text-primary-400"
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
                  {{ match.activity?.location?.name }}
                </div>
              </div>
              <router-link
                :to="`/matches/${match.id}`"
                class="block w-full py-2.5 text-center text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
              >
                查看詳情
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useMatchesStore, type Match } from '@/stores/matches';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const authStore = useAuthStore();
const matchesStore = useMatchesStore();

// 今日配對數量（從推薦配對中計算）
const todayMatchesCount = computed(() => {
  const today = new Date().toDateString();
  return matchesStore.matches.filter(
    (match: Match) => new Date(match.match_time).toDateString() === today
  ).length;
});

// 格式化日期
const formatDate = (date: string | number) => {
  if (!date) return '未設定';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '未設定';
  return format(d, 'MM月dd日 HH:mm', { locale: zhTW });
};

// 精選配對（只取前 6 筆）
const featuredMatches = computed(() => {
  return matchesStore.matches.slice(0, 6);
});

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await matchesStore.fetchFeaturedMatches();
  }
});
</script>
