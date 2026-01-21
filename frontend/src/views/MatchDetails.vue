<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 導航列 -->
    <Navigation />

    <!-- 主要內容 -->
    <main class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <!-- 載入狀態 -->
      <div v-if="isLoading" class="text-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"
        ></div>
        <p class="text-gray-500 mt-4">載入中...</p>
      </div>

      <!-- 配對詳情 -->
      <div v-else-if="match" class="space-y-6">
        <!-- 配對基本資訊 -->
        <div class="card">
          <div class="flex justify-between items-start mb-4">
            <h1 class="text-2xl font-bold text-gray-900">
              {{ match.activity_title || match.activity?.title || '未知活動' }}
            </h1>
            <span
              :class="[
                'inline-flex px-3 py-1 text-sm font-semibold rounded-full',
                match.status === 'open'
                  ? 'bg-green-100 text-green-800'
                  : match.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800',
              ]"
            >
              {{
                match.status === 'open'
                  ? '進行中'
                  : match.status === 'completed'
                    ? '已完成'
                    : '已取消'
              }}
            </span>
          </div>

          <p class="text-gray-600 mb-4">{{ match.activity?.description }}</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center text-gray-500">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p class="font-medium">{{ match.activity?.location?.name }}</p>
                <p class="text-sm">{{ match.activity?.location?.address }}</p>
              </div>
            </div>

            <div class="flex items-center text-gray-500">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p class="font-medium">{{ formatDate(match.match_time) }}</p>
                <p class="text-sm">目標人數: {{ match.activity?.target_count }} 人</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 開局者資訊 -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">開局者資訊</h2>
          <div class="flex items-center space-x-4">
            <img
              :src="match.organizer?.avatar_url || '/default-avatar.svg'"
              @error="handleImageError"
              :alt="match.organizer?.name"
              class="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <p class="font-medium text-gray-900">{{ match.organizer?.name }}</p>
              <p class="text-sm text-gray-500">{{ match.organizer?.email }}</p>
            </div>
          </div>
        </div>

        <!-- 參與者列表 (如果是開局者或參與者) -->
        <div v-if="isOrganizer || hasOrganizerAccess" class="card">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">
            {{ isOrganizer ? '參與者管理' : '已申請的參與者' }}
          </h2>
          <div v-if="participants.length === 0" class="text-center py-8">
            <p class="text-gray-500">還沒有人申請參與</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="participant in participants"
              :key="participant.id"
              class="flex items-center justify-between p-3 border rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <img
                  :src="participant.user?.avatar_url || '/default-avatar.svg'"
                  @error="handleImageError"
                  :alt="participant.user?.name"
                  class="h-8 w-8 rounded-full object-cover"
                />
                <div>
                  <p class="font-medium text-gray-900">{{ participant.user?.name }}</p>
                  <p class="text-sm text-gray-500">{{ participant.user?.email }}</p>
                </div>
              </div>

              <!-- 開局者可以看到狀態和操作按鈕，參與者不能 -->
              <div v-if="isOrganizer" class="flex items-center space-x-2">
                <span
                  :class="[
                    'px-2 py-1 text-xs font-semibold rounded-full',
                    participant.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : participant.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800',
                  ]"
                >
                  {{
                    participant.status === 'pending'
                      ? '待審核'
                      : participant.status === 'approved'
                        ? '已通過'
                        : '已拒絕'
                  }}
                </span>

                <button
                  v-if="participant.status === 'pending'"
                  @click="approveParticipant(participant.id)"
                  :disabled="isProcessing"
                  class="btn-primary text-xs px-3 py-1"
                >
                  通過
                </button>
                <button
                  v-if="participant.status === 'pending'"
                  @click="rejectParticipant(participant.id)"
                  :disabled="isProcessing"
                  class="btn-secondary text-xs px-3 py-1"
                >
                  拒絕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 評分功能 (已完成配對) -->
        <div v-if="match.status === 'completed'" class="card">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">配對評分</h2>
          <div v-if="!isOrganizer && !hasReviewed" class="space-y-4">
            <p class="text-gray-600">請為這次配對體驗評分</p>
            <form @submit.prevent="submitReview">
              <div class="mb-4">
                <label class="label">評分 (1-5星)</label>
                <div class="flex space-x-1">
                  <button
                    v-for="rating in 5"
                    :key="rating"
                    type="button"
                    @click="reviewForm.score = rating"
                    :class="[
                      'p-1',
                      rating <= reviewForm.score ? 'text-yellow-400' : 'text-gray-300',
                    ]"
                  >
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="mb-4">
                <label class="label">評論</label>
                <textarea
                  v-model="reviewForm.comment"
                  class="input"
                  rows="3"
                  placeholder="分享您的配對體驗..."
                ></textarea>
              </div>

              <button type="submit" :disabled="isSubmitting" class="btn-primary">
                {{ isSubmitting ? '提交中...' : '提交評分' }}
              </button>
            </form>
          </div>

          <div v-else class="text-center py-4">
            <p class="text-gray-500">您已經為這次配對評過分了</p>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="flex space-x-4">
          <button
            v-if="!isOrganizer && match.status === 'open' && !hasParticipated"
            @click="joinMatch"
            :disabled="isJoining"
            class="flex-1 btn-primary"
          >
            {{ isJoining ? '加入中...' : '參與配對' }}
          </button>

          <span
            v-if="!isOrganizer && match.status === 'open' && hasParticipated"
            class="flex-1 btn-secondary text-center"
          >
            {{
              participants.find((p: any) => p.user_id === authStore.user?.id)?.status === 'pending'
                ? '待審核'
                : '已申請'
            }}
          </span>

          <router-link to="/matches" class="flex-1 btn-secondary text-center">
            返回配對列表
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ApiService from '@/services/api';
import { useToast } from 'vue-toastification';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import Navigation from '@/components/Navigation.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const match = ref<any>(null);
const participants = ref<any[]>([]);
const isLoading = ref(false);
const isJoining = ref(false);
const isSubmitting = ref(false);
const isProcessing = ref(false);
const hasReviewed = ref(false);
const hasOrganizerAccess = ref(false);

const reviewForm = ref({
  score: 0,
  comment: '',
  reviewee_id: 0,
});

// 計算是否為開局者
const isOrganizer = computed(() => {
  return match.value?.organizer_id === authStore.user?.id;
});

// 檢查當前用戶是否已經參與
const hasParticipated = computed(() => {
  if (!authStore.user?.id || !participants.value) return false;
  return participants.value.some((p: any) => p.user_id === authStore.user?.id);
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

// 載入配對詳情
const loadMatchDetails = async () => {
  try {
    isLoading.value = true;
    const matchId = parseInt(route.params.id as string);

    if (isNaN(matchId)) {
      toast.error('無效的配對 ID');
      router.push('/matches');
      return;
    }

    // 使用 getMatchDetails API
    const response = await ApiService.getMatchDetails(matchId);
    match.value = response.data?.data;

    if (!match.value) {
      toast.error('配對不存在');
      router.push('/matches');
      return;
    }

    // 載入參與者列表
    const participantsResponse = await ApiService.getMatchParticipants(matchId);
    const responseData = participantsResponse.data as any;
    participants.value = Array.isArray(responseData?.data) ? responseData.data : [];

    // 檢查是否有權限看到所有參與者
    hasOrganizerAccess.value = responseData?.is_organizer || false;
  } catch (error) {
    console.error('載入配對詳情失敗:', error);
    toast.error('載入配對詳情失敗');
  } finally {
    isLoading.value = false;
  }
};

// 參與配對
const joinMatch = async () => {
  try {
    const matchId = parseInt(route.params.id as string);

    if (!matchId || isNaN(matchId)) {
      toast.error('無效的配對 ID');
      return;
    }

    isJoining.value = true;
    await ApiService.joinMatch(matchId);
    toast.success('成功參與配對！');
    await loadMatchDetails(); // 重新載入
  } catch (error: any) {
    console.error('參與配對失敗:', error);

    // 如果錯誤訊息包含「已經參與」，不顯示錯誤，直接重新載入
    if (error.response?.data?.error?.includes('已經參與') || error.message?.includes('已經參與')) {
      await loadMatchDetails(); // 重新載入以更新 UI
      return;
    }

    toast.error('參與配對失敗');
  } finally {
    isJoining.value = false;
  }
};

// 審核通過參與者
const approveParticipant = async (participantId: number) => {
  try {
    isProcessing.value = true;
    const matchId = parseInt(route.params.id as string);
    await ApiService.approveParticipant(matchId, participantId);
    toast.success('已通過參與者');
    await loadMatchDetails();
  } catch (error) {
    console.error('審核失敗:', error);
    toast.error('審核失敗');
  } finally {
    isProcessing.value = false;
  }
};

// 審核拒絕參與者
const rejectParticipant = async (participantId: number) => {
  try {
    isProcessing.value = true;
    const matchId = parseInt(route.params.id as string);
    await ApiService.rejectParticipant(matchId, participantId);
    toast.success('已拒絕參與者');
    await loadMatchDetails();
  } catch (error) {
    console.error('審核失敗:', error);
    toast.error('審核失敗');
  } finally {
    isProcessing.value = false;
  }
};

// 提交評分
const submitReview = async () => {
  try {
    isSubmitting.value = true;

    if (reviewForm.value.score === 0) {
      toast.error('請選擇評分');
      return;
    }

    const matchId = parseInt(route.params.id as string);
    const revieweeId = isOrganizer.value
      ? participants.value[0]?.user_id
      : match.value.organizer_id;

    await ApiService.createReview(matchId, {
      reviewee_id: revieweeId,
      score: reviewForm.value.score,
      comment: reviewForm.value.comment,
    });

    toast.success('評分提交成功！');
    hasReviewed.value = true;
  } catch (error) {
    console.error('提交評分失敗:', error);
    toast.error('提交評分失敗');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  loadMatchDetails();
});
</script>
