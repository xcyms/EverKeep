<script lang="ts" setup>
import { onPageScroll, onReachBottom, onShow } from '@dcloudio/uni-app'
import { computed, onMounted, ref, watch } from 'vue'

definePage({
  name: 'search',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '搜索',
    navigationStyle: 'custom',
    enablePullDownRefresh: false
  },
})

const router = useRouter()
const user = useAuthStore()
const toast = useToast()
const statusBarHeight = ref(0) // 获取状态栏高度
const menuButtonRight = ref(0) // 胶囊按钮右侧距离
const searchQuery = ref('') // 搜索关键字
const albumList = ref<any[]>([]) // 相册列表数据
const isFirstLoad = ref(true) // 是否是首次加载
const showBackTop = ref(false) // 是否显示回到顶部
const loading = ref(false) // 加载状态
const loadingState = ref<'loading' | 'finished' | 'error'>('finished');
const hasMore = ref(true) // 是否有更多数据
const page = ref(1) // 当前页码
const order = ref<'newest' | 'earliest' | 'most' | 'least'>('newest') // 排序方式
const showSortSheet = ref(false) // 是否显示排序面板

// 将列表拆分为左右两列，解决 columns-2 布局在加载时的抖动问题
const leftColList = computed(() => albumList.value.filter((_, i) => i % 2 === 0))
const rightColList = computed(() => albumList.value.filter((_, i) => i % 2 !== 0))

const orderOptions = [
  { name: '最新创建', value: 'newest', subname: '按相册创建时间从新到旧' },
  { name: '最早创建', value: 'earliest', subname: '按相册创建时间从旧到新' },
  { name: '图片最多', value: 'most', subname: '按相册内图片数量从多到少' },
  { name: '图片最少', value: 'least', subname: '按相册内图片数量从少到多' },
]

// 默认模拟数据
const defaultAlbums = [
  { id: 'd1', name: '风景精选', image_num: 12, intro: '大自然最纯净的呼吸，定格山川河流的美丽瞬间。', cover: 'https://picsum.photos/id/10/400/300' },
  { id: 'd2', name: '人像摄影', image_num: 8, intro: '捕捉眼神中的故事，记录每一个真实而动人的面孔。', cover: 'https://picsum.photos/id/20/400/300' },
  { id: 'd3', name: '城市建筑', image_num: 15, intro: '穿梭于钢筋水泥之间，探索城市空间的几何美学。', cover: 'https://picsum.photos/id/30/400/300' },
  { id: 'd4', name: '自然风光', image_num: 20, intro: '从森林到海洋，带你领略地球上最原始的生命力。', cover: 'https://picsum.photos/id/40/400/300' },
]

// 加载相册数据
const { send: searchAlbums } = useRequest((keyword: string, currentPage: number, order: 'newest' | 'earliest' | 'most' | 'least') =>
  Apis.lsky.albums({
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    params: {
      keyword,
      page: currentPage,
      order,
    },
  }), {
  immediate: false,
})

// 处理排序选择
function handleSortSelect(item: any) {
  order.value = item.value
  showSortSheet.value = false
}

// 监听排序变化
watch(order, () => {
  handleSearch()
})

// 监听滚动（用于回到顶部）
onPageScroll((e) => {
  showBackTop.value = e.scrollTop > 400
})

// 回到顶部
function scrollToTop() {
  uni.pageScrollTo({
    scrollTop: 0,
    duration: 300
  })
}

// 监听登录状态，动态更新数据
watch(() => user.isLoggedIn, (newVal, oldVal) => {
  console.log('Login status changed:', { oldVal, newVal })
  if (newVal !== oldVal) {
    handleSearch() // 状态改变时重置并重新加载
  }
})

// 页面显示时强制检查数据状态
onShow(() => {
  console.log('Search page onShow', { isLoggedIn: user.isLoggedIn, currentListSize: albumList.value.length })

  // 识别当前是否为默认模拟数据
  const isShowingDefault = albumList.value.length > 0 &&
    albumList.value.some(item => typeof item.id === 'string' && item.id.startsWith('d'))

  // 场景1：已登录，但列表为空或还在显示默认数据 -> 立即刷新获取真实接口数据
  if (user.isLoggedIn && (albumList.value.length === 0 || isShowingDefault)) {
    console.log('Logged in but showing default or empty, refreshing...')
    handleSearch()
  }
  // 场景2：未登录，但列表显示的是真实数据（可能刚退出） -> 切换回默认数据
  else if (!user.isLoggedIn && albumList.value.length > 0 && !isShowingDefault) {
    console.log('Logged out but showing real data, refreshing to default...')
    handleSearch()
  }
})

// 辅助函数：获取相册数据
async function fetchAlbums(isLoadMore = false) {
  console.log('fetchAlbums called', { isLoggedIn: user.isLoggedIn, isLoadMore, page: page.value });

  if (!user.isLoggedIn) {
    // ... 未登录逻辑保持不变
    if (!isLoadMore) {
      albumList.value = defaultAlbums.map(item => ({ ...item, _error: false }));
      hasMore.value = false;
      loadingState.value = 'finished';
      isFirstLoad.value = false;
    }
    return;
  }

  // 只有在非加载更多且列表为空时才显示骨架屏
  if (!isLoadMore && albumList.value.length === 0) {
    isFirstLoad.value = true;
  }

  loading.value = true;
  loadingState.value = 'loading';

  try {
    const res = await searchAlbums(searchQuery.value, page.value, order.value);

    if (res.status) {
      const newData = (res.data.data || []).map((item: any) => ({
        ...item,
        _error: false,
        cover: item.cover || 'https://lsky.navhub.abrdns.com/i/2025/12/24/694b95fc16251.png',
      }));

      if (isLoadMore) {
        albumList.value.push(...newData);
      } else {
        albumList.value = newData;
        // 【优化】成功获取第一页数据后，存入本地缓存
        if (page.value === 1 && searchQuery.value === '') {
          uni.setStorage({
            key: 'cache_search_albums',
            data: newData
          });
        }
      }
      hasMore.value = res.data.last_page > res.data.current_page;
      loadingState.value = 'finished';
    } else {
      toast.error(res.message || '加载相册失败');
      loadingState.value = 'error';
    }
  } catch (error) {
    // ... 错误处理保持不变
    toast.error(error || '加载相册失败');
    loadingState.value = 'error';
  } finally {
    loading.value = false;
    isFirstLoad.value = false; // 关闭骨架屏
  }
}

// 处理图片加载失败
function handleImageError(album: any) {
  album._error = true;
  album.cover = 'https://lsky.navhub.abrdns.com/i/2025/12/24/694b95fc16251.png';
}

// 搜索事件处理
async function handleSearch() {
  albumList.value = []; // 清空相册列表数据
  page.value = 1; // 重置页码
  await fetchAlbums(); // 调用辅助函数进行搜索
}

// 加载更多相册
async function loadMoreAlbums() {
  if (user.isLoggedIn && hasMore.value && !loading.value) {
    page.value++; // 页码增加
    await fetchAlbums(true); // 调用辅助函数加载更多
  }
}

function goImages(id: string) {
  if (user.isLoggedIn) {
    router.push({ name: 'images', params: {
      id
    }})
  }
}

onMounted(async () => {
  uni.getSystemInfo({
    success: (res) => {
      statusBarHeight.value = res.statusBarHeight || 0;
      // #ifdef MP-WEIXIN
      const menuButton = uni.getMenuButtonBoundingClientRect();
      if (menuButton) {
        menuButtonRight.value = res.windowWidth - menuButton.left;
      }
      // #endif
    },
  });

  // 初始加载：尝试读取缓存
  const cached = uni.getStorageSync('cache_search_albums');
  if (cached && cached.length > 0) {
    albumList.value = cached;
    isFirstLoad.value = false; // 如果有缓存，直接关闭骨架屏显示内容
  }

  // 增加微小延迟，确保 Pinia 状态已从本地缓存完全恢复
  setTimeout(() => {
    fetchAlbums();
  }, 100);
})

// 触底加载更多
onReachBottom(() => {
  loadMoreAlbums()
})

</script>

<template>
  <div class="bg-[#f8f9fa] pb-10">
    <!-- 沉浸式搜索头部 - 使用 fixed 确保不随页面滚动 -->
    <div
      class="fixed left-0 right-0 top-0 z-50 bg-white/80 px-3 pb-2 backdrop-blur-xl"
      :style="{ paddingTop: `${statusBarHeight + 6}px` }"
    >
      <div class="flex items-center" :style="{ paddingRight: `${menuButtonRight}px` }">
        <div class="flex-1">
          <wd-search
            v-model="searchQuery"
            placeholder="搜索相册、摄影师..."
            @search="handleSearch"
            @clear="handleSearch"
            :hide-cancel="true"
            custom-class="!bg-gray-100/80 !rounded-xl !p-0"
          />
        </div>
        <!-- 排序触发按钮 -->
        <div class="ml-1 h-10 flex flex-shrink-0 items-center justify-center px-2" @tap="showSortSheet = true">
          <wd-icon name="order-descending" size="18px" color="#666" />
        </div>
      </div>
    </div>

    <!-- 顶部占位，防止内容被固定头遮挡 -->
    <div :style="{ height: `${statusBarHeight + 54}px` }"/>

    <!-- 内容区域 - 使用原生页面滚动 -->
    <div class="flex flex-col px-4 pt-2">
      <!-- 骨架屏状态 -->
      <div v-if="isFirstLoad && albumList.length === 0" class="flex gap-4 px-1">
        <div v-for="col in 2" :key="col" class="flex flex-1 flex-col">
          <div v-for="i in 3" :key="i" class="mb-4 overflow-hidden rounded-2xl bg-white p-0 shadow-sm">
            <div class="animate-pulse bg-gray-200" :style="{ height: i % 2 === 0 ? '180px' : '220px' }" />
            <div class="p-3 space-y-2">
              <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div class="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>
      </div>

      <!-- 结果统计 -->
      <div v-if="albumList.length > 0" class="mb-4 flex items-center justify-between px-1">
        <span class="text-base text-gray-900 font-bold italic">Discovery</span>
        <span class="text-[11px] text-gray-400 font-medium tracking-wider">{{ albumList.length }} ALBUMS</span>
      </div>

      <!-- 瀑布流布局容器 - 使用 Flex 改写以提升稳定性 -->
      <div v-if="albumList.length > 0" class="flex gap-4 px-1">
        <!-- 左列 -->
        <div class="flex flex-1 flex-col">
          <div
            v-for="album in leftColList"
            :key="album.id"
            class="group relative mb-4 flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] active:opacity-80"
            @tap="goImages(album.id)"
          >
            <div class="relative w-full overflow-hidden bg-gray-100">
              <image
                :src="album.cover"
                mode="widthFix"
                class="block h-auto w-full"
                lazy-load
                @error="handleImageError(album)"
              />
              <div class="absolute right-2.5 top-2.5 z-10 rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-white font-bold backdrop-blur-md">
                {{ album.image_num }}
              </div>
            </div>
            <div class="p-3">
              <div class="text-sm text-gray-800 font-bold leading-snug">{{ album.name }}</div>
              <div v-if="album.intro" class="mt-1.5 text-[11px] text-gray-400 leading-relaxed">
                {{ album.intro }}
              </div>
            </div>
          </div>
        </div>

        <!-- 右列 -->
        <div class="flex flex-1 flex-col">
          <div
            v-for="album in rightColList"
            :key="album.id"
            class="group relative mb-4 flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] active:opacity-80"
            @tap="goImages(album.id)"
          >
            <div class="relative w-full overflow-hidden bg-gray-100">
              <image
                :src="album.cover"
                mode="widthFix"
                class="block h-auto w-full"
                lazy-load
                @error="handleImageError(album)"
              />
              <div class="absolute right-2.5 top-2.5 z-10 rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-white font-bold backdrop-blur-md">
                {{ album.image_num }}
              </div>
            </div>
            <div class="p-3">
              <div class="text-sm text-gray-800 font-bold leading-snug">{{ album.name }}</div>
              <div v-if="album.intro" class="mt-1.5 text-[11px] text-gray-400 leading-relaxed">
                {{ album.intro }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading" class="flex flex-col items-center justify-center pb-20 pt-32">
        <div class="mb-4 h-20 w-20 flex items-center justify-center rounded-full bg-gray-100">
          <wd-icon name="search" size="32px" color="#cbd5e1" />
        </div>
        <span class="text-sm text-gray-400">未发现相关相册</span>
      </div>

      <!-- 底部状态与适配 -->
      <div class="mt-auto">
        <wd-loadmore custom-class="py-8" :state="loadingState" />
      </div>
    </div>

    <!-- 悬浮功能按钮 -->
    <div
      class="fixed bottom-24 right-6 z-50 flex flex-col gap-4 transition-all duration-300"
      :class="[showBackTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0']"
    >
      <div
        class="h-12 w-12 flex items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-md transition-transform active:scale-90"
        @click="scrollToTop"
      >
        <wd-icon name="arrow-up" size="20px" color="#333" />
      </div>
    </div>
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
            <span class="mt-0.5 text-xs text-gray-400">选择相册内容的展示顺序</span>
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
                  :name="item.value.includes('est') ? 'time' : 'chart-bar'"
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

        <!-- 底部完成按钮 -->
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
