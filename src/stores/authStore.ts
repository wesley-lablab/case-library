import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  username: string
  password: string
  role: 'admin' | 'user'
  lastLogin?: string
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const currentUser = ref<User | null>(null)
  const usernameInput = ref('')
  const passwordInput = ref('')
  const errorMessage = ref('')

  // 默认用户列表
  const defaultUsers: User[] = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'user1', password: 'user123', role: 'user' },
    { username: 'user2', password: 'user456', role: 'user' },
  ]

  // 从localStorage加载用户
  const loadUsers = (): User[] => {
    try {
      const stored = localStorage.getItem('case_library_users')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('加载用户失败:', e)
    }
    return [...defaultUsers]
  }

  // 保存用户到localStorage
  const saveUsers = (users: User[]) => {
    try {
      localStorage.setItem('case_library_users', JSON.stringify(users))
    } catch (e) {
      console.error('保存用户失败:', e)
    }
  }

  const hasError = computed(() => !!errorMessage.value)

  const users = ref<User[]>(loadUsers())

  function authenticate(username: string, password: string) {
    const user = users.value.find(u => u.username === username && u.password === password)

    if (user) {
      isAuthenticated.value = true
      currentUser.value = { ...user, lastLogin: new Date().toISOString() }
      errorMessage.value = ''

      // 更新最后登录时间
      const userIndex = users.value.findIndex(u => u.username === username)
      if (userIndex !== -1) {
        users.value[userIndex].lastLogin = currentUser.value.lastLogin
        saveUsers(users.value)
      }

      // 保存当前用户到session
      localStorage.setItem('case_library_current_user', JSON.stringify({
        username: user.username,
        role: user.role
      }))

      return true
    } else {
      isAuthenticated.value = false
      currentUser.value = null
      errorMessage.value = '用户名或密码错误'
      return false
    }
  }

  function logout() {
    isAuthenticated.value = false
    currentUser.value = null
    usernameInput.value = ''
    passwordInput.value = ''
    errorMessage.value = ''
    localStorage.removeItem('case_library_current_user')
  }

  function clearError() {
    errorMessage.value = ''
  }

  // 检查是否已登录
  function checkAuth() {
    try {
      const stored = localStorage.getItem('case_library_current_user')
      if (stored) {
        const userData = JSON.parse(stored)
        const user = users.value.find(u => u.username === userData.username)
        if (user) {
          isAuthenticated.value = true
          currentUser.value = user
          return true
        }
      }
    } catch (e) {
      console.error('检查登录状态失败:', e)
    }
    return false
  }

  // 添加用户（仅管理员）
  function addUser(username: string, password: string, role: 'admin' | 'user' = 'user') {
    if (users.value.some(u => u.username === username)) {
      errorMessage.value = '用户名已存在'
      return false
    }
    users.value.push({ username, password, role })
    saveUsers(users.value)
    return true
  }

  // 删除用户（仅管理员）
  function deleteUser(username: string) {
    if (username === 'admin') {
      errorMessage.value = '不能删除管理员账户'
      return false
    }
    const index = users.value.findIndex(u => u.username === username)
    if (index !== -1) {
      users.value.splice(index, 1)
      saveUsers(users.value)
      return true
    }
    return false
  }

  // 修改密码
  function changePassword(username: string, oldPassword: string, newPassword: string) {
    const user = users.value.find(u => u.username === username && u.password === oldPassword)
    if (user) {
      user.password = newPassword
      saveUsers(users.value)
      return true
    }
    return false
  }

  return {
    isAuthenticated,
    currentUser,
    usernameInput,
    passwordInput,
    errorMessage,
    hasError,
    users,
    authenticate,
    logout,
    clearError,
    checkAuth,
    addUser,
    deleteUser,
    changePassword
  }
})
