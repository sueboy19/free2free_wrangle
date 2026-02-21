<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">登入買一送一配對</h2>
      <p class="mt-2 text-center text-sm text-gray-600">使用您的社交媒體帳號登入</p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <!-- 登入選項 -->
        <div class="space-y-4">
          <button
            @click="loginWithProvider('facebook')"
            :disabled="isLoading"
            class="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-5 h-5 mr-3" v-if="!isLoading" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
              />
            </svg>

            <svg
              v-else
              class="animate-spin h-5 w-5 text-white mr-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span v-if="isLoading">登入中...</span>
            <span v-else>使用 Facebook 登入</span>
          </button>

          <!-- Google 登入 -->
          <button
            @click="loginWithProvider('google')"
            :disabled="isLoading"
            class="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-5 h-5 mr-3" v-if="!isLoading" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>

            <svg
              v-else
              class="animate-spin h-5 w-5 text-gray-700 mr-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span v-if="isLoading">登入中...</span>
            <span v-else>使用 Google 登入</span>
          </button>

          <!-- Line 登入 -->
          <button
            @click="loginWithProvider('line')"
            :disabled="isLoading"
            class="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00B900] hover:bg-[#00A000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00B900] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-5 h-5 mr-3" v-if="!isLoading" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.686.391.085.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
              />
            </svg>

            <svg
              v-else
              class="animate-spin h-5 w-5 text-white mr-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span v-if="isLoading">登入中...</span>
            <span v-else>使用 Line 登入</span>
          </button>

          <button
            v-if="isDevelopment"
            @click="mockLoginUser1"
            :disabled="isLoading"
            class="w-full flex justify-between items-center px-4 py-3 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div class="flex items-center">
              <span
                class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-3"
                >1</span
              >
              <span>Mock 登入</span>
            </div>
            <div class="text-xs text-blue-600">開局者 (測試用戶 A)</div>
          </button>

          <button
            v-if="isDevelopment"
            @click="mockLoginUser2"
            :disabled="isLoading"
            class="w-full flex justify-between items-center px-4 py-3 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div class="flex items-center">
              <span
                class="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs mr-3"
                >2</span
              >
              <span>Mock 登入</span>
            </div>
            <div class="text-xs text-green-600">參與者 (測試用戶 B)</div>
          </button>
        </div>

        <!-- 說明文字 -->
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">說明</span>
            </div>
          </div>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              登入後即可瀏覽配對機會、創建配對活動，並與其他用戶進行配對。
            </p>
          </div>
        </div>

        <!-- 錯誤訊息 -->
        <div
          v-if="errorMessage"
          class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
        >
          {{ errorMessage }}
        </div>

        <!-- 載入指示器 -->
        <div v-if="isLoading" class="mt-4 text-center text-sm text-gray-600">
          正在跳轉到登入頁面...
        </div>
      </div>

      <!-- 返回首頁 -->
      <div class="mt-6 text-center">
        <router-link to="/" class="text-sm text-primary-600 hover:text-primary-500">
          返回首頁
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const isLoading = ref(false);
const errorMessage = ref('');

const isDevelopment = computed(() => {
  const enabled = import.meta.env.VITE_ENABLE_MOCK_LOGIN === 'true';
  return enabled;
});

// 登入方法 (Instagram 暫時關閉)
const loginWithProvider = async (provider: 'facebook' | 'google' | 'line') => {
  try {
    isLoading.value = true;
    errorMessage.value = '';

    await authStore.login(provider);

    // authStore.login 會執行 window.location.href 重定向，不需要 router.push
    return;
  } catch (error) {
    console.error(`${provider} 登入失敗:`, error);
    errorMessage.value = error instanceof Error ? error.message : '登入失敗，請重試';
    toast.error('登入失敗，請重試');
  }
};

// Mock 登入方法 - 用戶 1 (開局者)
const mockLoginUser1 = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';

    await authStore.mockLogin({
      id: 'test_user_1',
      name: '測試用戶 A (開局者)',
      email: 'test_user_1@example.com',
    });

    const redirectPath = (router.currentRoute.value.query.redirect as string) || '/';
    router.push(redirectPath);
  } catch (error) {
    console.error('Mock 登入失敗:', error);
    errorMessage.value = error instanceof Error ? error.message : '登入失敗，請重試';
    toast.error('登入失敗，請重試');
  }
};

// Mock 登入方法 - 用戶 2 (參與者)
const mockLoginUser2 = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';

    await authStore.mockLogin({
      id: 'test_user_2',
      name: '測試用戶 B (參與者)',
      email: 'test_user_2@example.com',
    });

    const redirectPath = (router.currentRoute.value.query.redirect as string) || '/';
    router.push(redirectPath);
  } catch (error) {
    console.error('Mock 登入失敗:', error);
    errorMessage.value = error instanceof Error ? error.message : '登入失敗，請重試';
    toast.error('登入失敗，請重試');
  }
};
</script>
