<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">登入中，請稍候...</p>
      <p v-if="error" class="mt-2 text-red-600">{{ error }}</p>
      <router-link v-if="error" to="/login" class="mt-4 btn-primary inline-block">
        返回登入
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';
import { apiClient } from '@/services/api';
import type { User } from '@/stores/auth';

const authStore = useAuthStore();
const toast = useToast();
const router = useRouter();
const error = ref('');

onMounted(async () => {
  try {
    // 從 URL query 參數讀取 code
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      error.value = '未找到授權碼';
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

    // 設置 session
    authStore.setSession(userData, access_token);
    localStorage.setItem('refresh_token', refresh_token);

    toast.success(`歡迎，${userData.name}！`);

    // 跳轉首頁
    setTimeout(() => {
      router.push('/');
    }, 500);
  } catch (e: any) {
    console.error('OAuth callback 處理錯誤:', e);
    error.value = e.response?.data?.error || '登入失敗，請重試';
    toast.error(error.value);
  }
});
</script>
