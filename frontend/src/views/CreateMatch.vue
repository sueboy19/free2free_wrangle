<template>
  <div class="min-h-screen">
    <!-- 導航列 -->
    <Navigation />

    <!-- 主要內容 -->
    <main class="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 page-enter-up">
      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">創建配對</h1>
        <p class="text-gray-500 text-lg">發起一個新的配對活動</p>
      </div>

      <!-- 創建表單 -->
      <div class="card-elevated">
        <form @submit.prevent="createMatch">
          <!-- 活動選擇 -->
          <div class="mb-6">
            <label class="label">選擇活動 *</label>
            <div v-if="isLoading" class="text-center py-4">
              <div
                class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"
              ></div>
              <p class="text-gray-500 mt-2">載入活動中...</p>
            </div>
            <div v-else-if="!isLoading && activities.length === 0" class="text-center py-4">
              <p class="text-gray-500">暫無可用的活動</p>
              <router-link to="/" class="text-primary-600 hover:text-primary-500"
                >返回首頁</router-link
              >
            </div>
            <div v-else>
              <select v-model="formData.activity_id" class="input" required name="activity">
                <option value="">請選擇活動</option>
                <option v-for="activity in activities" :key="activity.id" :value="activity.id">
                  {{ activity.title }} - {{ activity.location_name || '未知地點' }}
                </option>
              </select>
              <p class="text-sm text-gray-500 mt-1">如果沒有適合的活動，請先聯繫管理員創建。</p>
            </div>
          </div>

          <!-- 配對時間 -->
          <div class="mb-6">
            <label class="label">配對時間 *</label>
            <input
              v-model="formData.match_time"
              type="datetime-local"
              class="input"
              required
              :min="minDateTime"
            />
            <p class="text-sm text-gray-500 mt-1">請選擇未來的時間點</p>
          </div>

          <!-- 預覽 -->
          <div v-if="selectedActivity" class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 class="font-semibold text-gray-900 mb-2">配對預覽</h3>
            <div class="space-y-2 text-sm">
              <p class="flex items-center">
                <span class="font-medium mr-2">活動：</span>
                <span v-if="selectedActivity.store_brand" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2"
                  :class="selectedActivity.store_brand === '7-11' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
                >
                  {{ selectedActivity.store_brand === 'familymart' ? '全家' : selectedActivity.store_brand }}
                </span>
                {{ selectedActivity.title }}
              </p>
              <p>
                <span class="font-medium">地點：</span
                >{{ selectedActivity.location?.name || '未設定' }}
              </p>
              <p>
                <span class="font-medium">地址：</span
                >{{ selectedActivity.location?.address || '未設定' }}
              </p>
              <p>
                <span class="font-medium">目標人數：</span>{{ selectedActivity.target_count }}人
              </p>
              <p>
                <span class="font-medium">描述：</span>{{ selectedActivity.description || '無' }}
              </p>
            </div>
          </div>

          <!-- 錯誤訊息 -->
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform -translate-y-2 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="transform translate-y-0 opacity-100"
            leave-to-class="transform -translate-y-2 opacity-0"
          >
            <div
              v-if="errorMessage"
              class="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center"
            >
              <svg
                class="w-5 h-5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ errorMessage }}
            </div>
          </transition>

          <!-- 成功訊息 -->
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform -translate-y-2 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="transform translate-y-0 opacity-100"
            leave-to-class="transform -translate-y-2 opacity-0"
          >
            <div
              v-if="successMessage"
              class="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-xl flex items-center"
            >
              <svg
                class="w-5 h-5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ successMessage }}
            </div>
          </transition>

          <!-- 提交按鈕 -->
          <div class="flex space-x-4 pt-4">
            <button type="submit" :disabled="isSubmitting" class="flex-1 btn-accent py-4 text-lg">
              {{ isSubmitting ? '創建中...' : '創建配對' }}
            </button>
            <router-link to="/matches" class="flex-1 btn-secondary text-center py-4 text-lg">
              取消
            </router-link>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ApiService from '@/services/api';
import { useToast } from 'vue-toastification';
import Navigation from '@/components/Navigation.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const activities = ref<any[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const formData = ref({
  activity_id: '',
  match_time: '',
});

// 最小可選擇的時間
const minDateTime = computed(() => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
});

// 選中的活動
const selectedActivity = computed(() => {
  if (!Array.isArray(activities.value)) return null;
  return (
    activities.value.find((activity) => activity.id === parseInt(formData.value.activity_id)) ||
    null
  );
});

// 載入活動列表
const loadActivities = async () => {
  try {
    isLoading.value = true;
    const response = await ApiService.getActivities();
    activities.value = Array.isArray(response.data?.data) ? response.data.data : [];
    // 從 query param 預選活動
    const preselectedId = route.query.activity_id;
    if (preselectedId) {
      formData.value.activity_id = String(preselectedId);
    }
  } catch (error) {
    console.error('載入活動失敗:', error);
    toast.error('載入活動失敗');
    activities.value = [];
  } finally {
    isLoading.value = false;
  }
};

// 創建配對
const createMatch = async () => {
  try {
    isSubmitting.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    // 驗證表單
    if (!formData.value.activity_id || !formData.value.match_time) {
      errorMessage.value = '請填寫所有必填欄位';
      return;
    }

    // 驗證時間
    const matchTime = new Date(formData.value.match_time);
    const now = new Date();
    if (matchTime <= now) {
      errorMessage.value = '配對時間必須是未來時間';
      return;
    }

    const matchData = {
      activity_id: parseInt(formData.value.activity_id),
      match_time: formData.value.match_time,
    };

    await ApiService.createMatch(matchData);

    successMessage.value = '配對創建成功！';
    toast.success('配對創建成功！');

    // 延遲跳轉，讓用戶看到成功訊息
    setTimeout(() => {
      router.push('/matches');
    }, 2000);
  } catch (error) {
    console.error('創建配對失敗:', error);
    errorMessage.value = '創建配對失敗，請重試';
    toast.error('創建配對失敗');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  loadActivities();
});
</script>
