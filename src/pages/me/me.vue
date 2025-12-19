<script lang="ts" setup>
definePage({
  name: 'me',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '我的',
    navigationStyle: 'custom',
  },
})
const user = useAuthStore()
const router = useRouter()
const toast = useToast()

const { send: logout } = useRequest((config) => Apis.lsky.logout({
  ...config,
  headers: {
    ...config.headers,
    Authorization: `Bearer ${user.token}`,
  },
}), {
  immediate: false,
})

async function doLogout() {
  await logout({}).then(() => {
    toast.success('退出登录成功')
    user.logout();
    const timer = setTimeout(() => {
      clearTimeout(timer)
      router.replaceAll({ name: 'login' })
    }, 1500)
  })
}

</script>

<template>
  <div class="flex flex-col items-center p-6">
    <h1 class="my-4">我的</h1>
    <wd-button type="primary" class="w-full" @click="doLogout" v-if="user.isLoggedIn">退出登录</wd-button>
  </div>
</template>
