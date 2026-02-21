<template>
  <nav class="navbar-glass sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link
            to="/"
            class="text-xl font-bold text-gradient hover:opacity-80 transition-opacity"
          >
            買一送一配對
          </router-link>
        </div>

        <!-- 桌面端導航 -->
        <div class="hidden md:flex items-center space-x-2">
          <router-link
            to="/matches"
            :class="[currentPath === '/matches' ? 'nav-link-active' : '', 'nav-link']"
          >
            配對列表
          </router-link>
          <router-link
            to="/my-matches"
            :class="[currentPath === '/my-matches' ? 'nav-link-active' : '', 'nav-link']"
          >
            我的配對
          </router-link>
          <router-link
            to="/profile"
            :class="[currentPath === '/profile' ? 'nav-link-active' : '', 'nav-link']"
          >
            個人資料
          </router-link>
          <router-link
            v-if="authStore.isAdmin"
            to="/admin"
            :class="[currentPath === '/admin' ? 'nav-link-active' : '', 'nav-link']"
          >
            管理後台
          </router-link>
          <button @click="authStore.logout" class="btn-secondary text-sm py-2 px-4 ml-2">
            登出
          </button>
        </div>

        <!-- 移動端漢堡選單 -->
        <div class="md:hidden flex items-center">
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="text-gray-600 hover:text-primary-600 focus:outline-none p-2 rounded-full hover:bg-primary-50 transition-colors"
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
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform -translate-y-2 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-2 opacity-0"
      >
        <div v-if="mobileMenuOpen" class="md:hidden pb-4">
          <div class="space-y-1 bg-white/50 backdrop-blur-lg rounded-2xl p-2 shadow-lg">
            <router-link
              to="/matches"
              @click="mobileMenuOpen = false"
              :class="[
                currentPath === '/matches'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50',
                'block px-4 py-3 rounded-xl text-base font-medium transition-colors',
              ]"
            >
              配對列表
            </router-link>
            <router-link
              to="/my-matches"
              @click="mobileMenuOpen = false"
              :class="[
                currentPath === '/my-matches'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50',
                'block px-4 py-3 rounded-xl text-base font-medium transition-colors',
              ]"
            >
              我的配對
            </router-link>
            <router-link
              to="/profile"
              @click="mobileMenuOpen = false"
              :class="[
                currentPath === '/profile'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50',
                'block px-4 py-3 rounded-xl text-base font-medium transition-colors',
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
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50',
                'block px-4 py-3 rounded-xl text-base font-medium transition-colors',
              ]"
            >
              管理後台
            </router-link>
            <button
              @click="handleLogout"
              class="w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 px-4 py-3 rounded-xl text-base font-medium transition-colors"
            >
              登出
            </button>
          </div>
        </div>
      </transition>
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
