import {getInfo, login, logout} from '@/api/login'
import {getPoint, setPoint, getToken, removeToken, setRememberMe, setToken} from '@/utils/auth'
import Config from '@/settings'

const user = {
  state: {
    token: getToken(),
    user: {},
    roles: [],
    // 第一次加载菜单时用到
    loadMenus: false
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_USER: (state, user) => {
      state.user = user
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles
    },
    SET_LOAD_MENUS: (state, loadMenus) => {
      state.loadMenus = loadMenus
    }
  },

  actions: {
    // 登录
    Login({ commit }, userInfo) {
      const rememberMe = userInfo.rememberMe
      return new Promise((resolve, reject) => {
        login(userInfo.username, userInfo.password,userInfo.grant_type, userInfo.code, userInfo.uuid, Config.applyId, Config.applySecret)
          .then(res => {
            const token = 'Bearer ' + res.data.access_token
            setToken(token, rememberMe)
            // 保存->是否记住
            setRememberMe(rememberMe)
            commit('SET_TOKEN', token)
            setUserInfo(res.data.user_details, commit)
            // 第一次加载菜单时用到， 具体见 src 目录下的 permission.js
            commit('SET_LOAD_MENUS', true)
            resolve()
          }).catch(error => {
            reject(error)
          })
      })
    },

    // 获取用户信息
    GetInfo({ commit }) {
      return new Promise((resolve, reject) => {
        getInfo().then(res => {
          setUserInfo(res.data, commit)
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },
    // 登出
    LogOut({ commit }) {
      return new Promise((resolve, reject) => {
        if (getPoint('point') === '401') {
          logOut(commit)
          resolve()
        } else {
          logout().then(res => {
            logOut(commit)
            resolve()
          }).catch(error => {
            logOut(commit)
            reject()
          })
        }
      })
    },

    updateLoadMenus({ commit }) {
      return new Promise((resolve, reject) => {
        commit('SET_LOAD_MENUS', false)
      })
    }
  }
}

export const logOut = (commit) => {
  commit('SET_TOKEN', '')
  commit('SET_ROLES', [])
  removeToken()
}

export const setUserInfo = (user, commit) => {
  // 如果没有任何权限，则赋予一个默认的权限，避免请求死循环
  if (user.permission.length === 0) {
    commit('SET_ROLES', ['ROLE_SYSTEM_DEFAULT'])
  } else {
    // console.log(res.permission)
    commit('SET_ROLES', user.permission)
  }
  // console.log(res.userInfo)
  commit('SET_USER', user.userInfo)
}

export default user
