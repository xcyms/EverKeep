<script lang="ts" setup>
definePage({
  name: 'message',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '消息',
    navigationStyle: 'custom',
  },
})

const { setTabbarItem } = useTabbar()
onLoad(() => {
  setTabbarItem('message', 5)
})

</script>

<template>
  <div class="flex flex-col items-center p-6">
    <h1 class="my-4">我的消息</h1>
  </div>
</template>
