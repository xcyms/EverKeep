<script lang="ts" setup>
definePage({
  name: 'me',
  layout: 'tabbar',
  style: {
    navigationBarTitleText: '我的',
    navigationStyle: 'custom',
  },
})
</script>

<template>
  <div class="flex flex-col items-center p-6">
    <h1 class="my-4">我的</h1>
  </div>
</template>
