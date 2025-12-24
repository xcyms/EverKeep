<script lang="ts" setup>
import { onMounted, ref } from 'vue'

definePage({
  name: 'search',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '搜索',
    navigationStyle: 'custom',
  },
})

const user = useAuthStore()
const toast = useToast()
const statusBarHeight = ref(0) // 获取状态栏高度
const menuButtonRight = ref(0) // 胶囊按钮右侧距离
const searchQuery = ref('') // 搜索关键字
const albumList = ref<any[]>([]) // 相册列表数据
const recommendedContent = ref<any[]>([]) // 推荐内容数据
const loading = ref(false) // 加载状态
const loadingState = ref<'loading' | 'finished' | 'error'>('finished');
const hasMore = ref(true) // 是否有更多数据
const page = ref(1) // 当前页码
const pageSize = ref(6) // 每页数量
const order = ref<'newest' | 'earliest' | 'most' | 'least'>('newest') // 排序方式

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

// 模拟获取推荐内容的 API 请求
async function getRecommendedContent() {
  // 模拟数据
  setTimeout(() => {
    recommendedContent.value = [
      { id: 1, title: '推荐内容一', cover: 'https://picsum.photos/id/100/100/100' },
      { id: 2, title: '推荐内容二', cover: 'https://picsum.photos/id/101/100/100' },
      { id: 3, title: '推荐内容三', cover: 'https://picsum.photos/id/102/100/100' },
    ]
  }, 500)
}

// 辅助函数：获取相册数据
async function fetchAlbums(isLoadMore = false) {
  console.log('fetchAlbums called', { isLoadMore, page: page.value, searchQuery: searchQuery.value, order: order.value });
  loading.value = true;
  loadingState.value = 'loading';

  try {
    const res = await searchAlbums(searchQuery.value, page.value, order.value);
    console.log('searchAlbums response:', res);

    if (res.status) {
      if (isLoadMore) {
        albumList.value.push(...(res.data.data || []).map((item: { cover: string }) => ({
          ...item,
          cover: item.cover || 'https://lsky.navhub.abrdns.com/i/2025/12/24/694b95fc16251.png',
        })));
      } else {
        albumList.value = (res.data.data || []).map((item: { cover: string }) => ({
          ...item,
          cover: item.cover || 'https://lsky.navhub.abrdns.com/i/2025/12/24/694b95fc16251.png',
        }));
      }
      hasMore.value = res.data.last_page > res.data.current_page;
      loadingState.value = 'finished';
      pageSize.value = res.data.per_page || 6; // 赋值每页数量
    } else {
      toast.error(res.message || '加载相册失败');
      loadingState.value = 'error';
    }
  } catch (error) {
    console.error('Error fetching albums:', error);
    toast.error('请求相册数据失败');
    loadingState.value = 'error';
  } finally {
    loading.value = false;
    console.log('Current albumList:', albumList.value);
  }
}

// 搜索事件处理
async function handleSearch() {
  albumList.value = []; // 清空相册列表数据
  page.value = 1; // 重置页码
  await fetchAlbums(); // 调用辅助函数进行搜索
}

// 加载更多相册
async function loadMoreAlbums() {
  if (hasMore.value && !loading.value) {
    page.value++; // 页码增加
    await fetchAlbums(true); // 调用辅助函数加载更多
  }
}

onMounted(async () => {
  uni.getSystemInfo({
    success: (res) => {
      statusBarHeight.value = res.statusBarHeight || 0;
      // 适配小程序胶囊按钮
      // #ifdef MP-WEIXIN
      const menuButton = uni.getMenuButtonBoundingClientRect();
      if (menuButton) {
        // 计算搜索框右侧需要预留的距离
        // 屏幕宽度 - 胶囊按钮右侧距离
        menuButtonRight.value = res.windowWidth - menuButton.left;
      }
      // #endif
    },
  });
  console.log('onMounted: user.isLoggedIn', user.isLoggedIn);
  await fetchAlbums(); // 初始加载数据，不再依赖登录状态
  getRecommendedContent(); // 加载推荐内容
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-100" :style="{ paddingTop: `${statusBarHeight}px` }">
    <!-- 顶部搜索框 -->
    <div class="bg-white shadow-sm" :style="{ paddingRight: `${menuButtonRight + 10}px` }">
      <wd-search v-model="searchQuery" placeholder="搜索相册" @search="handleSearch" @clear="handleSearch" :hide-cancel="true" custom-class="p-1.5!" />
    </div>

    <!-- 相册列表 -->
    <scroll-view
      scroll-y
      class="flex-1 overflow-y-auto"
      @scrolltolower="loadMoreAlbums"
    >
      <div class="grid grid-cols-2 gap-4 p-4">
        <div v-for="album in albumList" :key="album.id" class="rounded-lg bg-white py-2 shadow-md">
          <image :src="album.cover" mode="aspectFill" class="h-32 w-full object-cover" />
          <div class="flex flex-col gap-1 px-2">
            <div class="truncate text-sm font-semibold">{{ album.name }}</div>
            <div class="text-xs text-gray-400">{{ album.image_num }}张</div>
            <div class="truncate text-xs text-gray-500">{{ album.intro }}</div>
          </div>
        </div>
      </div>
      <wd-loadmore custom-class="loadmore" :state="loadingState" />
    </scroll-view>

    <!-- 推荐内容 -->
    <div class="mt-4 bg-white p-4 shadow-sm" v-if="recommendedContent.length > 0">
      <div class="mb-2 text-lg font-bold">推荐内容</div>
      <div class="grid grid-cols-3 gap-2">
        <div v-for="item in recommendedContent" :key="item.id" class="flex flex-col items-center">
          <wd-img :src="item.cover" mode="aspectFill" class="h-16 w-16 rounded-md" />
          <div class="mt-1 text-center text-xs">{{ item.title }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
