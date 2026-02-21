<template>
  <div class="min-h-screen">
    <!-- 導航列 -->
    <Navigation />

    <!-- 主要內容 -->
    <main class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 page-enter-up">
      <!-- 載入狀態 -->
      <div v-if="isLoading" class="text-center py-16">
        <div class="spinner h-12 w-12 mx-auto"></div>
        <p class="text-gray-400 mt-4">載入中...</p>
      </div>

      <!-- 配對詳情 -->
      <div v-else-if="match" class="space-y-6">
        <!-- 配對基本資訊 -->
        <div class="card-elevated">
          <div class="flex justify-between items-start mb-6">
            <h1 class="text-3xl font-bold text-gray-900">
              {{ match.activity_title || match.activity?.title || '未知活動' }}
            </h1>
            <span
              :class="[
                'badge',
                match.status === 'open'
                  ? 'badge-success'
                  : match.status === 'completed'
                    ? 'badge-primary'
                    : 'badge-danger',
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

          <p class="text-gray-500 mb-6 text-lg leading-relaxed">
            {{ match.activity?.description }}
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="flex items-start">
              <div
                class="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mr-4 flex-shrink-0"
              >
                <svg
                  class="w-6 h-6 text-primary-500"
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
              </div>
              <div>
                <p class="font-semibold text-gray-900">{{ match.activity?.location?.name }}</p>
                <p class="text-gray-500">{{ match.activity?.location?.address }}</p>
              </div>
            </div>

            <div class="flex items-start">
              <div
                class="w-12 h-12 rounded-xl bg-accent-coral/10 flex items-center justify-center mr-4 flex-shrink-0"
              >
                <svg
                  class="w-6 h-6 text-accent-coral"
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
              <div>
                <p class="font-semibold text-gray-900">{{ formatDate(match.match_time) }}</p>
                <p class="text-gray-500">目標人數: {{ match.activity?.target_count }} 人</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 開局者資訊 -->
        <div class="card">
          <h2 class="text-xl font-bold text-gray-900 mb-4">開局者資訊</h2>
          <div class="flex items-center space-x-4">
            <div class="relative">
              <img
                :src="match.organizer?.avatar_url || '/default-avatar.svg'"
                @error="handleImageError"
                :alt="match.organizer?.name"
                class="h-16 w-16 rounded-2xl object-cover ring-4 ring-primary-50"
              />
              <div
                class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"
              ></div>
            </div>
            <div>
              <p class="font-bold text-lg text-gray-900">{{ match.organizer?.name }}</p>
              <p class="text-gray-500">{{ match.organizer?.email }}</p>
            </div>
          </div>
        </div>

        <!-- 參與者列表 (如果是開局者或參與者) -->
        <div v-if="isOrganizer || hasOrganizerAccess" class="card">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            {{ isOrganizer ? '參與者管理' : '已申請的參與者' }}
          </h2>
          <div v-if="participants.length === 0" class="text-center py-12">
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <p class="text-gray-500">還沒有人申請參與</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="participant in participants"
              :key="participant.id"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <div class="flex items-center space-x-4">
                <img
                  :src="participant.user?.avatar_url || '/default-avatar.svg'"
                  @error="handleImageError"
                  :alt="participant.user?.name"
                  class="h-12 w-12 rounded-xl object-cover"
                />
                <div>
                  <p class="font-semibold text-gray-900">{{ participant.user?.name }}</p>
                  <p class="text-sm text-gray-500">{{ participant.user?.email }}</p>
                </div>
              </div>

              <!-- 開局者可以看到狀態和操作按鈕，參與者不能 -->
              <div v-if="isOrganizer" class="flex items-center space-x-2">
                <span
                  :class="[
                    'badge',
                    participant.status === 'pending'
                      ? 'badge-warning'
                      : participant.status === 'approved'
                        ? 'badge-success'
                        : 'badge-danger',
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
                  class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  通過
                </button>
                <button
                  v-if="participant.status === 'pending'"
                  @click="rejectParticipant(participant.id)"
                  :disabled="isProcessing"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  拒絕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 評分功能 (已完成配對) -->
        <div v-if="match.status === 'completed'" class="card">
          <h2 class="text-xl font-bold text-gray-900 mb-4">配對評分</h2>
          <div v-if="!isOrganizer && !hasReviewed" class="space-y-4">
            <p class="text-gray-500 mb-4">請為這次配對體驗評分</p>
            <form @submit.prevent="submitReview">
              <div class="mb-6">
                <label class="label">評分 (1-5星)</label>
                <div class="flex space-x-2">
                  <button
                    v-for="rating in 5"
                    :key="rating"
                    type="button"
                    @click="reviewForm.score = rating"
                    class="p-2 rounded-xl transition-all duration-200 hover:scale-110"
                    :class="[
                      rating <= reviewForm.score
                        ? 'text-yellow-400'
                        : 'text-gray-200 hover:text-gray-300',
                    ]"
                  >
                    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="mb-6">
                <label class="label">評論</label>
                <textarea
                  v-model="reviewForm.comment"
                  class="input"
                  rows="4"
                  placeholder="分享您的配對體驗..."
                ></textarea>
              </div>

              <button type="submit" :disabled="isSubmitting" class="btn-primary">
                {{ isSubmitting ? '提交中...' : '提交評分' }}
              </button>
            </form>
          </div>

          <div v-else class="text-center py-8">
            <div
              class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p class="text-gray-500">您已經為這次配對評過分了</p>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="flex space-x-4">
          <button
            v-if="!isOrganizer && match.status === 'open' && !hasParticipated"
            @click="joinMatch"
            :disabled="isJoining"
            class="flex-1 btn-accent py-4 text-lg"
          >
            {{ isJoining ? '加入中...' : '參與配對' }}
          </button>

          <span
            v-if="!isOrganizer && match.status === 'open' && hasParticipated"
            class="flex-1 py-4 text-center text-lg font-semibold rounded-full"
            :class="{
              'bg-yellow-50 text-yellow-600':
                participants.find((p: any) => p.user_id === authStore.user?.id)?.status ===
                'pending',
              'bg-green-50 text-green-600':
                participants.find((p: any) => p.user_id === authStore.user?.id)?.status ===
                'approved',
            }"
          >
            {{
              participants.find((p: any) => p.user_id === authStore.user?.id)?.status === 'pending'
                ? '待審核'
                : '已申請'
            }}
          </span>

          <router-link to="/matches" class="flex-1 btn-secondary text-center py-4 text-lg">
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
