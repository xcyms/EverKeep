<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import ImageWaterfall from '@/components/ImageWaterfall.vue'

definePage({
  name: 'home',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '首页',
    navigationStyle: 'custom',
  },
})

const router = useRouter()
const user = useAuthStore()
const toast = useToast()
const statusBarHeight = ref(0) // 获取状态栏高度
const menuButtonRight = ref(0) // 胶囊按钮右侧距离
const safeAreaInsetsBottom = ref(0) // 底部安全区域高度
const categoryId = ref(0)
const order = ref<'newest' | 'earliest' | 'utmost' | 'least'>('newest') // 排序方式
const showSortSheet = ref(false) // 是否显示排序选择

const orderOptions = [
  { name: '最新发布', value: 'newest', subname: '按上传时间从新到旧' },
  { name: '最早发布', value: 'earliest', subname: '按上传时间从旧到新' },
  { name: '最大尺寸', value: 'utmost', subname: '按文件大小从大到小' },
  { name: '最小尺寸', value: 'least', subname: '按文件大小从小到大' },
]

const allImages = ref<any[]>([]) // 存储所有图片数据
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 16 // 每次获取的图片数量

const category = ref([
  {
    name: '画廊',
    id: 0,
  },
  {
    name: '个性化',
    id: 1,
  },
  {
    name: '推荐',
    id: 2,
  },
])

function changeCategory (event: { index: number, name: string}) {
  categoryId.value = event.index
}

function getMockImages(catId: number) {
  // 模拟 API 请求延迟
  setTimeout(() => {
    let newImages: any[] = []
    if (catId === 0) { // 第一个 Tab: 始终显示默认 10 张图片
      for (let i = 0; i < pageSize; i++) {
        newImages.push({
          key: `img-${catId}-${page.value}-${i}`,
          links: { url: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/${Math.floor(Math.random() * 100) + 200}` }
        })
      }
      hasMore.value = false // 第一个 Tab 初始加载后不再加载更多
    } else {
      // 其他 Tab
      if (!user.isLoggedIn) {
        newImages = [] // 未登录时不显示图片
        hasMore.value = false
      } else {
        for (let i = 0; i < pageSize; i++) {
          newImages.push({
            key: `img-${catId}-${page.value}-${i}`,
            links: { url: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/${Math.floor(Math.random() * 100) + 200}` }
          })
        }
        hasMore.value = page.value < 3
      }
    }

    allImages.value.push(...newImages)
    page.value++
    loading.value = false
  }, 1000)
}

const { send: getImages } = useRequest((currentPage: number, currentCategoryId: number, currentOrder: 'newest' | 'earliest' | 'utmost' | 'least') => Apis.lsky.getImages({
  params: {
    page: currentPage,
    order: currentOrder,
    permission: currentCategoryId === 0 ? 'public' : 'private',
  },
  headers: {
    'Authorization': `Bearer ${user.token}`,
  },
}), {
  immediate: false,
})

// 获取图片
async function fetchImages(catId: number, reset: boolean = false) {
  if (loading.value && !reset) return
  loading.value = true

  if (reset) {
    allImages.value = []
    page.value = 1
    hasMore.value = true
  }

  if (!user.isLoggedIn) {
    getMockImages(catId)
  } else {
    try {
      const res = await getImages(page.value, categoryId.value, order.value)
      if (res.status) {
        const newData = res.data.data || []
        allImages.value.push(...newData)
        page.value++
        hasMore.value = res.data.current_page < res.data.last_page
      } else {
        toast.error(res.message)
        hasMore.value = false
      }
    } catch (error) {
      console.error('Fetch images error:', error)
      hasMore.value = false
    } finally {
      loading.value = false
    }
  }
}

function handleLogin() {
  router.push({ name: 'login' })
}

// 处理排序选择
function handleSortSelect(item: any) {
  order.value = item.value
  showSortSheet.value = false
}

// 监听排序变化
watch(order, () => {
  fetchImages(categoryId.value, true)
})

// 监听 categoryId 变化以重置并获取图片
watch(categoryId, (newCatId: number) => {
  fetchImages(newCatId, true)
}, { immediate: true }) // 添加 immediate: true，确保在组件挂载时立即执行一次

// 监听登录状态变化，重新加载数据
watch(() => user.isLoggedIn, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    fetchImages(categoryId.value, true)
  }
})

// 加载更多图片 (用于无限滚动)
async function loadMore() {
  if (hasMore.value && !loading.value) {
    if (!user.isLoggedIn && categoryId.value === 0) {
      // 未登录时仅在第一个分类展示模拟数据，不触发加载更多
      return
    }
    await fetchImages(categoryId.value)
  }
}

onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      statusBarHeight.value = res.statusBarHeight || 0
      safeAreaInsetsBottom.value = res.safeAreaInsets?.bottom || 0 // 获取底部安全区域高度
      // #ifdef MP-WEIXIN
      const menuButton = uni.getMenuButtonBoundingClientRect()
      if (menuButton) {
        menuButtonRight.value = res.windowWidth - menuButton.left
      }
      // #endif
    },
  })
})

// 触底加载更多
onReachBottom(() => {
  loadMore()
})
</script>

<template>
  <div class="min-h-screen bg-[#f8f9fa] pb-10">
    <!-- 沉浸式顶部 Tab 栏 - 使用 fixed 固定 -->
    <div
      class="fixed left-0 right-0 top-0 z-50 bg-white/80 px-1 backdrop-blur-xl transition-all"
      :style="{ paddingTop: `${statusBarHeight}px` }"
    >
      <div class="flex items-center justify-between" :style="{ paddingRight: `${menuButtonRight}px` }">
        <div class="flex-1 overflow-hidden">
          <wd-tabs
            v-model="categoryId"
            animated
            inactive-color="#999"
            line-height="2px"
            @change="changeCategory"
            custom-class="!bg-transparent"
            custom-nav-class="!bg-transparent"
          >
            <block v-for="item in category" :key="item.id">
              <wd-tab :title="item.name" custom-class="!bg-transparent" />
            </block>
          </wd-tabs>
        </div>
        <!-- 排序触发按钮 -->
        <div class="h-10 flex flex-shrink-0 items-center justify-center px-3" @tap="showSortSheet = true">
          <wd-icon name="order-descending" size="18px" color="#666" />
        </div>
      </div>
    </div>

    <!-- 顶部占位，防止内容被固定头遮挡 -->
    <div :style="{ height: `${statusBarHeight + 44}px` }"/>

    <!-- 内容区域 - 使用原生页面滚动 -->
    <div class="px-3 pt-3">
      <ImageWaterfall :list="allImages" :loading="loading" />

      <!-- 加载状态 -->
      <wd-loadmore
        custom-class="py-8"
        :state="loading ? 'loading' : (hasMore ? 'finished' : 'finished')"
      />
    </div>

    <!-- 未登录底部模糊提示栏 -->
    <view
      v-if="!user.isLoggedIn"
      :style="{ bottom: `${50 + safeAreaInsetsBottom}px` }"
      class="fixed left-0 right-0 z-[100] h-30 flex flex-col items-center justify-center gap-4 rounded-md bg-white/80 py-4 text-gray-600 backdrop-blur-sm"
    >
      <wd-text text="登录后可查看更多内容" class="mb-4" />
      <wd-button @click="handleLogin" type="primary">立即登录</wd-button>
    </view>
    <!-- 排序操作面板 - 底部弹出美化版 -->
    <wd-popup
      v-model="showSortSheet"
      position="bottom"
      round
      custom-class="rounded-t-[32rpx] overflow-hidden"
      :z-index="10001"
      safe-area-inset-bottom
    >
      <div class="bg-white/95 px-6 pb-2 backdrop-blur-md">
        <!-- 顶部装饰条 -->
        <div class="flex justify-center py-3">
          <div class="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        <!-- 头部 -->
        <div class="flex items-center justify-between pb-4 pt-2">
          <div class="flex flex-col">
            <span class="text-lg text-gray-900 font-bold">排序方式</span>
            <span class="mt-0.5 text-xs text-gray-400">选择您偏好的内容展示顺序</span>
          </div>
          <div
            class="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 transition-colors active:bg-gray-200"
            @tap="showSortSheet = false"
          >
            <wd-icon name="close" size="16px" color="#666" />
          </div>
        </div>

        <!-- 选项列表 -->
        <div class="py-2 space-y-2">
          <div
            v-for="item in orderOptions"
            :key="item.value"
            class="group flex items-center justify-between rounded-2xl p-4 transition-all active:bg-blue-50/50"
            :class="[order === item.value ? 'bg-blue-50/40' : 'bg-gray-50/50']"
            @tap="handleSortSelect(item)"
          >
            <div class="flex items-center gap-3">
              <div
                class="h-10 w-10 flex items-center justify-center rounded-xl transition-colors"
                :class="[order === item.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-400']"
              >
                <wd-icon
                  :name="item.value === 'newest' ? 'time' : item.value === 'earliest' ? 'history' : 'order-descending'"
                  size="20px"
                />
              </div>
              <div class="flex flex-col">
                <span class="text-[15px] transition-colors" :class="[order === item.value ? 'text-blue-700 font-semibold' : 'text-gray-700']">
                  {{ item.name }}
                </span>
                <span class="text-xs transition-colors" :class="[order === item.value ? 'text-blue-500/80' : 'text-gray-400']">
                  {{ item.subname }}
                </span>
              </div>
            </div>
            <div
              v-if="order === item.value"
              class="h-6 w-6 flex items-center justify-center rounded-full bg-blue-600"
            >
              <wd-icon name="check" size="14px" color="#fff" />
            </div>
          </div>
        </div>

        <!-- 底部取消按钮 -->
        <div class="py-6">
          <div
            class="w-full rounded-2xl bg-gray-900 py-4 text-center text-[16px] text-white font-bold shadow-gray-200 shadow-lg transition-all active:scale-[0.98] active:opacity-90"
            @tap="showSortSheet = false"
          >
            完成
          </div>
        </div>
      </div>
    </wd-popup>
  </div>
</template>

<style lang="scss" scoped>
:deep(.tabs),
:deep(.wd-tabs__nav) {
  background-color: transparent !important;
}
</style>
