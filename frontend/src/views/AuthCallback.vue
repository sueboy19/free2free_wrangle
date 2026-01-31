<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div
        v-if="!error"
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"
      ></div>
      <p class="mt-4 text-gray-600">{{ error ? '' : '登入中，請稍候...' }}</p>
      <p v-if="error" class="mt-2 text-red-600 font-medium">{{ error }}</p>
      <p v-if="error" class="mt-2 text-sm text-gray-500">{{ errorHint }}</p>
      <router-link v-if="error" to="/login" class="mt-4 btn-primary inline-block">
        返回登入
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';
import { apiClient } from '@/services/api';
import type { User } from '@/stores/auth';

const authStore = useAuthStore();
const toast = useToast();
const router = useRouter();
const error = ref('');

// 根據錯誤訊息提供額外的提示
const errorHint = computed(() => {
  if (!error.value) return '';

  if (error.value.includes('取消授權') || error.value.includes('已取消')) {
    return '您可以隨時重新嘗試登入';
  } else if (error.value.includes('拒絕') || error.value.includes('權限')) {
    return '本服務需要您的 Facebook 帳號權限才能正常使用';
  } else if (error.value.includes('過期')) {
    return '授權已失效，請重新進行登入';
  } else if (error.value.includes('配置錯誤')) {
    return '請聯繫管理員檢查 Facebook 應用設置';
  }

  return '如果問題持續，請稍後再試';
});

onMounted(async () => {
  try {
    // 從 URL query 參數讀取 code 和 error
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('error');

    // 檢查是否有從後端傳來的錯誤
    if (oauthError) {
      error.value = decodeURIComponent(oauthError);
      toast.error(error.value);
      return;
    }

    if (!code) {
      error.value = '未找到授權碼';
      toast.error(error.value);
      return;
    }

    // 用 code 換取 token
    const response = await apiClient.post('/auth/exchange-code', { code });

    // 檢查 API 回應中的錯誤
    if (response.data.error) {
      error.value = response.data.error;
      toast.error(error.value);
      return;
    }

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
    const errorMsg = e.response?.data?.error || e.message || '登入失敗，請重試';
    error.value = errorMsg;
    toast.error(errorMsg);
  }
});
</script>
