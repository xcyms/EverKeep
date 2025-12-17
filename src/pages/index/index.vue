<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'

const statusBarHeight = ref(0)
const categoryId = ref(0)
const leftColumnImages = ref<any[]>([]) // 存储左列图片数据
const rightColumnImages = ref<any[]>([]) // 存储右列图片数据
const loading = ref(false)
const hasMore = ref(true) // 假设初始有更多内容
const page = ref(1)
const pageSize = 10 // 每次获取的图片数量
const isLoggedIn = ref(false) // 模拟登录状态

onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      statusBarHeight.value = res.statusBarHeight || 0
    },
  })
  fetchImages(categoryId.value, true) // 初始加载第一个 Tab 的图片
})

definePage({
  name: 'home',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '首页',
    navigationStyle: 'custom',
  },
})

const category = ref([
  {
    name: '画廊',
    id: 0,
  },
  {
    name: '推荐',
    id: 1,
  },
  {
    name: '科技',
    id: 2,
  },
  {
    name: '二次元',
    id: 3,
  },
])

function changeCategory (event: { index: number, name: string}) {
  categoryId.value = event.index
  console.log(event)
  fetchImages(categoryId.value, true) // 切换 Tab 时重新获取图片
}

// 模拟获取图片
function fetchImages(catId: number, reset: boolean = false) {
  if (loading.value && !reset) return // 防止重复加载
  loading.value = true

  if (reset) {
    leftColumnImages.value = []
    rightColumnImages.value = []
    page.value = 1
    hasMore.value = true
  }

  // 模拟 API 请求延迟
  setTimeout(() => {
    let newImages: any[] = []
    if (catId === 0) { // 第一个 Tab: 始终显示默认 10 张图片
      for (let i = 0; i < pageSize; i++) {
        newImages.push({ id: `img-${catId}-${page.value}-${i}`, url: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/${Math.floor(Math.random() * 100) + 200}` }) // 随机高度模拟瀑布流
      }
      hasMore.value = false // 第一个 Tab 初始加载后不再加载更多
    } else { // 其他 Tab
      if (!isLoggedIn.value) {
        newImages = [] // 未登录时不显示图片
        hasMore.value = false
      } else {
        // 已登录时模拟获取更多图片
        for (let i = 0; i < pageSize; i++) {
          newImages.push({ id: `img-${catId}-${page.value}-${i}`, url: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/${Math.floor(Math.random() * 100) + 200}` }) // 随机高度模拟瀑布流
        }
        hasMore.value = page.value < 3 // 模拟有更多页
      }
    }

    // 将图片分配到两列
    newImages.forEach((img, index) => {
      if (index % 2 === 0) {
        leftColumnImages.value.push(img)
      } else {
        rightColumnImages.value.push(img)
      }
    })

    page.value++
    loading.value = false
  }, 500)
}

function handleLogin() {
  isLoggedIn.value = !isLoggedIn.value // 切换登录状态
  uni.showToast({
    title: isLoggedIn.value ? '登录成功' : '已登出',
    icon: 'none'
  })
  fetchImages(categoryId.value, true) // 登录/登出后重新获取当前 Tab 的图片
}

// 监听 categoryId 变化以重置并获取图片
watch(categoryId, (newCatId) => {
  fetchImages(newCatId, true)
})

// 加载更多图片 (用于无限滚动)
function loadMore() {
  if (hasMore.value && !loading.value && categoryId.value !== 0 && isLoggedIn.value) {
    fetchImages(categoryId.value)
  }
}
</script>

<template>
  <div class="flex flex-col">
    <view class="flex flex-1 flex-col" :style="{ paddingTop: `${statusBarHeight}px` }">
      <wd-tabs
        v-model="categoryId"
        animated
        inactive-color="#999"
        line-height="0"
        @change="changeCategory"
        class="flex-1"
        :sticky="true"
        :offset-top="statusBarHeight"
      >
        <block v-for="item in category" :key="item.id">
          <wd-tab :title="item.name">
            <scroll-view
              scroll-y
              class="h-full"
              @scrolltolower="loadMore"
              v-if="(item.id === 0) || (item.id !== 0 && isLoggedIn)"
            >
              <view class="flex gap-2 p-2">
                <view class="flex flex-1 flex-col gap-2">
                  <view v-for="img in leftColumnImages" :key="img.id">
                    <wd-img :src="img.url" mode="widthFix" :enable-preview="true" :show-menu-by-longpress="true" radius="10" class="w-full">
                      <template #error>
                        <wd-img src="/static/image_error.png" mode="widthFix" class="w-full" />
                      </template>
                    </wd-img>
                  </view>
                </view>
                <view class="flex flex-1 flex-col gap-2">
                  <view v-for="img in rightColumnImages" :key="img.id">
                    <wd-img :src="img.url" mode="widthFix" :enable-preview="true" :show-menu-by-longpress="true" radius="10" class="w-full">
                      <template #error>
                        <wd-img src="/static/image_error.png" mode="widthFix" class="w-full" />
                      </template>
                    </wd-img>
                  </view>
                </view>
              </view>
              <view v-if="loading" class="py-10 text-center"><wd-loading size="50px" /></view>
            </scroll-view>
            <template v-else>
              <view class="h-60 flex flex-col items-center justify-center text-gray-600">
                <text class="mb-4">登录后可查看更多内容</text>
                <wd-button @click="handleLogin" type="primary">立即登录</wd-button>
              </view>
            </template>
          </wd-tab>
        </block>
      </wd-tabs>
    </view>
  </div>
</template>
