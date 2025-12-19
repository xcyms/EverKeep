<script lang="ts" setup>
definePage({
  name: 'login',
  style: {
    navigationBarTitleText: '登录',
    navigationStyle: 'custom',
  },
})

const router = useRouter()
const user = useAuthStore()
const { success: showSuccess, error: showError } = useToast()
const loginType = ref<'account' | 'phone'>('account') // 'account' for username/password, 'phone' for phone/code
const textType = ref<'primary' | 'default'>('primary')
const text = ref('获取验证码')
const isCountingDown = ref(false)
const statusBarHeight = ref(0) // 获取状态栏高度
const protocolShow = ref(false) // 协议弹窗显示状态

const model = reactive<{
  username: string
  password: string
  code: string
  read: boolean
}>({
  username: '',
  password: '',
  code: '',
  read: false
})

onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      statusBarHeight.value = res.statusBarHeight || 0
    },
  })
})

function handleProtocolClick() {
  protocolShow.value = true
}

function handleClose() {
  protocolShow.value = false
}

const { loading: loginLoading, send: login } = useRequest(
  (email: string, password: string) => Apis.lsky.login({
    data: {
      email,
      password,
    },
  }),
  {
    immediate: false,
  },
)

async function handleSubmit() {
  if (!model.username) {
    showError({
      msg: loginType.value === 'account' ? '请输入用户名' : '请输入手机号'
    })
    return
  }
  if (loginType.value === 'account' && !model.password) {
    showError({
      msg: '请输入密码'
    })
    return
  }
  if (loginType.value === 'phone' && !model.code) {
    showError({
      msg: '请输入验证码'
    })
    return
  }
  if (!model.read) {
    showError({
      msg: '请先勾选协议'
    })
    return
  }
  if (loginType.value === 'phone') {
    showError({
      msg: '手机号登录暂未开放'
    })
    return
  }
  const res = await login(model.username, model.password)
  if (res.status) {
    showSuccess({
      msg: '登录成功'
    })
    user.login({
      email: model.username,
    }, res.data.token)
    router.pushTab({
      name: 'home'
    })
  } else {
    showError({
      msg: res.message || '登录失败'
    })
  }
}

function toggleLoginType() {
  loginType.value = loginType.value === 'account' ? 'phone' : 'account'
}
function getCode() {
  if (!model.username) {
    showError({
      msg: '请输入手机号'
    })
    return
  }
  textType.value = 'default'
  showSuccess({
    msg: '验证码已发送'
  })
  isCountingDown.value = true
  let countDown = 60;
    text.value = `${countDown}秒后重新获取`;
    const timer = setInterval(() => {
      if (countDown > 1) {
        countDown--;
        text.value = `${countDown}秒后重新获取`;
      } else {
        clearInterval(timer);
        textType.value = 'primary'
        text.value = '获取验证码';
        isCountingDown.value = false
      }
    }, 1000);
}
</script>

<template>
  <view class="flex flex-col bg-[#f7f7fa] p-4">
    <view class="h-32 flex justify-center" :style="{ paddingTop: `${statusBarHeight}px` }">
      <h1>登录</h1>
    </view>
    <view class="box-border flex flex-col gap-4 rounded-4 from-blue-50 to-blue-100 bg-gradient-to-br p-6 shadow-[0_0_12rpx_rgba(0,0,0,0.1)]">
      <view class="relative h-8 flex rounded-full bg-gray-200" @click="toggleLoginType">
        <view class="z-10 flex flex-1 items-center justify-center" :class="{ 'text-white': loginType === 'account' }">{{ loginType === 'phone' ? '账号密码登录' : '账号密码登录' }}</view>
        <view class="z-10 flex flex-1 items-center justify-center" :class="{ 'text-white': loginType === 'phone' }">{{ loginType === 'account' ? '手机号登录' : '手机号登录' }}</view>
        <view class="absolute left-0 top-0 h-full w-1/2 rounded-full bg-[#0083ff] transition-transform duration-300" :class="{ 'transform translate-x-full': loginType === 'phone' }"/>
      </view>
      <view class="text-[14px] text-[#333] font-semibold">
        {{ loginType === 'account' ? '用户名' : '手机号' }}
      </view>
      <view>
        <wd-input
          custom-class="py-2 px-4 rounded-3"
          type="text"
          prop="username"
          clearable
          :no-border="true"
          :focus-when-clear="false"
          v-model="model.username"
          :placeholder="loginType === 'account' ? '请输入用户名' : '请输入手机号'"
        >
          <template #prefix>
            <wd-icon :name="loginType === 'account' ? 'user-circle' : 'phone'" custom-class="flex items-center" color="#0083ff" />
          </template>
        </wd-input>
      </view>
      <view v-if="loginType === 'account'" class="flex flex-col gap-4">
        <view class="text-[14px] text-[#333] font-semibold">
          密码
        </view>
        <wd-input
          custom-class="py-2 px-4 rounded-3"
          :show-password="true"
          prop="password"
          :no-border="true"
          :focus-when-clear="false"
          v-model="model.password"
          placeholder="请输入密码"
        >
          <template #prefix>
            <wd-icon name="lock-on" custom-class="flex items-center" color="#0083ff" />
          </template>
        </wd-input>
      </view>
      <view v-if="loginType === 'phone'" class="flex flex-col gap-4">
        <view class="text-[14px] text-[#333] font-semibold">
          验证码
        </view>
        <view>
          <wd-input
            custom-class="py-2 px-4 rounded-3"
            type="text"
            prop="code"
            :no-border="true"
            :focus-when-clear="false"
            v-model="model.code"
            placeholder="请输入验证码"
          >
            <template #prefix>
              <wd-icon name="code" custom-class="flex items-center" color="#0083ff" />
            </template>
            <template #suffix>
              <wd-text :text="text" :type="textType" decoration="underline" custom-class="text-[14px] flex items-center" @click="!isCountingDown && getCode()" />
            </template>
          </wd-input>
        </view>
      </view>
      <view>
        <wd-button type="primary" block @click="handleSubmit" :loading="loginLoading">登录</wd-button>
      </view>
      <view class="pl-4">
        <wd-checkbox v-model="model.read" shape="square">
          <wd-text text="我已阅读并同意" />
          <wd-text type="primary" text="《用户协议》" @click.stop="handleProtocolClick"/>
        </wd-checkbox>
      </view>
    </view>
    <wd-popup v-model="protocolShow" position="bottom" custom-style="height: 10%;" @close="handleClose" >
      <view class="p-4">
        <wd-text type="primary" text="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;使用本小程序功能请遵守相关法律法规, 如您不同意, 请立即" />
        <wd-text type="error" text="关闭" />
        <wd-text type="primary" text="小程序" />
      </view>
    </wd-popup>
  </view>
</template>
