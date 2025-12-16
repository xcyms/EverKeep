<script lang="ts" setup>
definePage({
  name: 'login',
  style: {
    navigationBarTitleText: '登录',
    navigationStyle: 'custom',
  },
})

const router = useRouter()
const { success: showSuccess, error: showError } = useToast()
const loginType = ref<'account' | 'phone'>('account') // 'account' for username/password, 'phone' for phone/code
const textType = ref<'primary' | 'default'>('primary')
const text = ref('获取验证码')
const isCountingDown = ref(false)

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


function handleSubmit() {
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
  showSuccess({
    msg: '登录成功'
  })
  router.pushTab({
    name: 'home'
  })
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
    <view class="h-32 flex justify-center p-4">
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
        <wd-button type="primary" block @click="handleSubmit">登录</wd-button>
      </view>
      <view class="pl-4">
        <wd-checkbox v-model="model.read" shape="square">
          <wd-text text="我已阅读并同意" />
          <wd-text type="primary" text="《用户协议》" />
        </wd-checkbox>
      </view>
    </view>
  </view>
</template>
