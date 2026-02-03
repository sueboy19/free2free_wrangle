<template>
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link to="/" class="text-xl font-bold text-gray-900">買一送一配對</router-link>
        </div>

        <!-- 桌面端導航 -->
        <div class="hidden md:flex items-center space-x-4">
          <router-link
            to="/matches"
            class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            配對列表
          </router-link>
          <router-link
            to="/my-matches"
            :class="[
              currentPath === '/my-matches'
                ? 'text-primary-600'
                : 'text-gray-700 hover:text-gray-900',
              'px-3 py-2 rounded-md text-sm font-medium',
            ]"
          >
            我的配對
          </router-link>
          <router-link
            to="/profile"
            :class="[
              currentPath === '/profile' ? 'text-primary-600' : 'text-gray-700 hover:text-gray-900',
              'px-3 py-2 rounded-md text-sm font-medium',
            ]"
          >
            個人資料
          </router-link>
          <router-link
            v-if="authStore.isAdmin"
            to="/admin"
            :class="[
              currentPath === '/admin' ? 'text-primary-600' : 'text-gray-700 hover:text-gray-900',
              'px-3 py-2 rounded-md text-sm font-medium',
            ]"
          >
            管理後台
          </router-link>
          <button @click="authStore.logout" class="btn-secondary">登出</button>
        </div>

        <!-- 移動端漢堡選單 -->
        <div class="md:hidden flex items-center">
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="text-gray-700 hover:text-gray-900 focus:outline-none p-2"
            aria-label="選單"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                v-if="!mobileMenuOpen"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 移動端選單 -->
      <div v-if="mobileMenuOpen" class="md:hidden pb-4">
        <div class="space-y-2">
          <router-link
            to="/matches"
            @click="mobileMenuOpen = false"
            class="block text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-base font-medium"
          >
            配對列表
          </router-link>
          <router-link
            to="/my-matches"
            @click="mobileMenuOpen = false"
            :class="[
              currentPath === '/my-matches'
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
              'block px-3 py-2 rounded-md text-base font-medium',
            ]"
          >
            我的配對
          </router-link>
          <router-link
            to="/profile"
            @click="mobileMenuOpen = false"
            :class="[
              currentPath === '/profile'
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
              'block px-3 py-2 rounded-md text-base font-medium',
            ]"
          >
            個人資料
          </router-link>
          <router-link
            v-if="authStore.isAdmin"
            to="/admin"
            @click="mobileMenuOpen = false"
            :class="[
              currentPath === '/admin'
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
              'block px-3 py-2 rounded-md text-base font-medium',
            ]"
          >
            管理後台
          </router-link>
          <button
            @click="handleLogout"
            class="w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-base font-medium"
          >
            登出
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();

const mobileMenuOpen = ref(false);

const currentPath = computed(() => route.path);

const handleLogout = () => {
  authStore.logout();
  mobileMenuOpen.value = false;
};
</script>
