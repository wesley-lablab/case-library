<script setup lang="ts">
import { ref, watch } from 'vue'
import { Eye, EyeOff, Lock, Unlock, ShieldCheck, AlertCircle, User } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const localUsername = ref('')
const localPassword = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const shakeAnimation = ref(false)

const handleSubmit = async () => {
  if (!localUsername.value.trim()) {
    authStore.errorMessage = '请输入用户名'
    return
  }
  if (!localPassword.value.trim()) {
    authStore.errorMessage = '请输入密码'
    return
  }

  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 500))

  const success = authStore.authenticate(localUsername.value, localPassword.value)
  isSubmitting.value = false

  if (!success) {
    shakeAnimation.value = true
    setTimeout(() => {
      shakeAnimation.value = false
    }, 500)
  }
}

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSubmit()
  }
}

watch(() => authStore.errorMessage, () => {
  if (authStore.errorMessage) {
    shakeAnimation.value = true
    setTimeout(() => {
      shakeAnimation.value = false
    }, 500)
  }
})

const clearInput = () => {
  localUsername.value = ''
  localPassword.value = ''
  authStore.clearError()
}
</script>

<template>
  <div class="auth-wrapper">
    <div class="auth-container" :class="{ 'shake-animation': shakeAnimation }">
      <div class="auth-header">
        <div class="logo-icon">
          <Lock class="lock-icon" :size="48" />
        </div>
        <h1 class="auth-title">中旅会展案例库</h1>
        <p class="auth-subtitle">请输入用户名和密码登录</p>
      </div>

      <div class="auth-form">
        <div class="username-input-wrapper" :class="{ 'has-error': authStore.hasError }">
          <div class="input-icon-wrapper">
            <User :size="20" class="input-icon" />
          </div>
          <input
            v-model="localUsername"
            type="text"
            class="username-input"
            placeholder="请输入用户名"
            @keypress="handleKeyPress"
            @input="authStore.clearError"
          />
        </div>

        <div class="password-input-wrapper" :class="{ 'has-error': authStore.hasError }">
          <div class="input-icon-wrapper">
            <ShieldCheck :size="20" class="input-icon" />
          </div>
          <input
            v-model="localPassword"
            :type="showPassword ? 'text' : 'password'"
            class="password-input"
            placeholder="请输入密码"
            @keypress="handleKeyPress"
            @input="authStore.clearError"
          />
          <button
            type="button"
            class="toggle-visibility-btn"
            @click="showPassword = !showPassword"
            @mousedown.prevent
          >
            <Eye v-if="!showPassword" :size="20" />
            <EyeOff v-else :size="20" />
          </button>
          <button
            v-if="localPassword"
            type="button"
            class="clear-btn"
            @click="clearInput"
          >
            <AlertCircle :size="16" />
          </button>
        </div>

        <div v-if="authStore.hasError" class="error-message">
          <AlertCircle :size="16" class="error-icon" />
          <span>{{ authStore.errorMessage }}</span>
        </div>

        <button
          class="submit-btn"
          :class="{ 'loading': isSubmitting }"
          @click="handleSubmit"
          :disabled="isSubmitting"
        >
          <span v-if="!isSubmitting">登录</span>
          <span v-else>验证中...</span>
          <Unlock v-if="!isSubmitting" :size="18" />
        </button>
      </div>

      <div class="auth-footer">
        <p class="hint-text">默认账户：admin / admin123</p>
        <p class="hint-text">普通用户：user1 / user123</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  @apply min-h-screen w-full bg-gradient-to-br from-primary via-primary-light to-accent/20 flex items-center justify-center p-4;
}

.auth-container {
  @apply bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300;
}

.auth-container.shake-animation {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.auth-header {
  @apply bg-gradient-to-r from-primary to-primary-light py-10 px-8 text-center;
}

.logo-icon {
  @apply inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm;
}

.lock-icon {
  @apply text-white;
}

.auth-title {
  @apply text-3xl font-serif font-bold text-white mb-2 tracking-wide;
}

.auth-subtitle {
  @apply text-white/80 text-sm font-medium;
}

.auth-form {
  @apply p-8 space-y-6;
}

.username-input-wrapper {
  @apply relative flex items-center bg-background border-2 border-muted rounded-xl transition-all duration-300;
}

.username-input-wrapper:focus-within {
  @apply border-accent/50 ring-4 ring-accent/10;
}

.username-input-wrapper.has-error {
  @apply border-rose-400 ring-4 ring-rose-100;
}

.password-input-wrapper {
  @apply relative flex items-center bg-background border-2 border-muted rounded-xl transition-all duration-300;
}

.password-input-wrapper:focus-within {
  @apply border-accent/50 ring-4 ring-accent/10;
}

.password-input-wrapper.has-error {
  @apply border-rose-400 ring-4 ring-rose-100;
}

.password-input-wrapper.has-error:focus-within {
  @apply border-rose-500 ring-4 ring-rose-100;
}

.input-icon-wrapper {
  @apply absolute left-4 text-text-muted;
}

.username-input {
  @apply w-full pl-12 pr-12 py-4 bg-transparent text-text text-lg font-medium outline-none placeholder:text-text-muted;
}

.password-icon-wrapper {
  @apply absolute left-4 text-text-muted;
}

.password-input {
  @apply w-full pl-12 pr-12 py-4 bg-transparent text-text text-lg font-medium outline-none placeholder:text-text-muted;
}

.toggle-visibility-btn,
.clear-btn {
  @apply absolute right-4 text-text-muted hover:text-primary transition-colors duration-200 p-1;
}

.toggle-visibility-btn {
  right: 3.5rem;
}

.error-message {
  @apply flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-lg text-sm font-medium;
}

.error-icon {
  @apply flex-shrink-0;
}

.submit-btn {
  @apply w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-accent/90 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 hover:from-accent/90 hover:to-accent;
}

.submit-btn:hover:not(:disabled) {
  @apply transform -translate-y-1;
  box-shadow: 0 10px 30px rgba(233, 69, 96, 0.4);
}

.submit-btn:disabled {
  @apply opacity-70 cursor-not-allowed;
}

.submit-btn.loading {
  @apply opacity-70 cursor-wait;
}

.auth-footer {
  @apply bg-muted/30 py-4 px-8 text-center;
}

.hint-text {
  @apply text-text-muted text-sm;
}

.hint-code {
  @apply font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded;
}
</style>
