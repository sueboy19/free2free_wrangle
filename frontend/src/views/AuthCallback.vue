<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div v-if="isLoading">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"
        ></div>
        <p class="mt-4 text-gray-600">登入中，請稍候...</p>
      </div>
      <div v-else-if="error" class="text-red-600">
        <p>{{ error }}</p>
        <router-link to="/login" class="mt-4 btn-primary inline-block"> 返回登入 </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { apiClient } from '@/services/api';
import type { User } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const isLoading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    // 從 URL hash 中解析 code
    const hash = window.location.hash;
    if (!hash) {
      error.value = '無法獲取登入資訊';
      isLoading.value = false;
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const code = params.get('code');

    if (!code) {
      error.value = '登入資訊不完整';
      isLoading.value = false;
      return;
    }

    // 用 code 換取 token
    const response = await apiClient.post('/auth/exchange-code', { code });
    const {
      access_token,
      refresh_token,
      user: userData,
    } = response.data as {
      access_token: string;
      refresh_token: string;
      user: User;
    };

    // 使用 setSession 方法更新 auth store
    authStore.setSession(userData, access_token);

    // 儲存 refresh token
    localStorage.setItem('refresh_token', refresh_token);

    toast.success(`歡迎，${userData.name}！`);

    // 清除 URL hash 並跳轉到首頁
    window.history.replaceState({}, document.title, window.location.pathname);
    router.push('/');
  } catch (e: any) {
    console.error('OAuth callback 處理錯誤:', e);
    error.value = e.response?.data?.error || '登入失敗，請重試';
    toast.error(error.value);
  } finally {
    isLoading.value = false;
  }
});
</script>
