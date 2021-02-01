import axios from 'axios'
import router from '@/router/routers'
import {Notification} from 'element-ui'
import store from '../store'
import {getToken, setToken} from '@/utils/auth'
import Config from '@/settings'
import Cookies from 'js-cookie'
import {decryptByCBC} from '@/utils/aesEncrypt'
import {openSignature, secretSignature} from "@/utils/apiSign"
// 创建axios实例
const service = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.VUE_APP_BASE_API : '/', // api 的 base_url
  timeout: Config.timeout // 请求超时时间
})

// request拦截器
service.interceptors.request.use(
  config => {
    if (getToken()) {
      // config.headers['Authorization'] = getToken()
      // 让每个请求携带自定义token 请根据实际情况自行修改
      config.headers.Authorization = getToken()
    }
    if (Config.signatureModel === 'OPEN') {
      config.params = {
        model: Config.signatureModel,
        ...openSignature()
      }
    } else if (Config.signatureModel === 'SECRET') {
      config.params = {
        model: Config.signatureModel
      }
      config.headers['Content'] = secretSignature()
    }
    config.headers['Content-Type'] = 'application/json;charset=UTF-8'
    return config
  },
  error => {
    // Do something with request error
    console.log(error) // for debug
    Promise.reject(error)
  }
)

// response 拦截器
service.interceptors.response.use(
  response => {
    let decode
    try {
      decode = decryptByCBC(response.data);
    } catch (e) {
    }
    if (decode) {
      response.data = JSON.parse(decode)
    }
    const code = response.status
    // // 待测试
    if (response.headers.Authorization) {
      const token = 'Bearer ' + response.headers.Authorization
      console.log('response' + token)
      setToken(token, true)
    }
    if (code < 200 || code > 300) {
      Notification.error({
        title: response.message
      })
      return Promise.reject('error')
    } else {
      return response.data
    }
  },
  error => {
    let data
    try {
      data = error.response.data
    } catch (e) {
      if (error.toString().indexOf('Error: timeout') !== -1) {
        Notification.error({
          title: '网络请求超时',
          duration: 5000
        })
        return Promise.reject(error)
      }
    }
    if (data) {
      if (data.errCode === 401) {
        if (getToken()) {
          store.dispatch('LogOut').then(() => {
            // 用户登录界面提示
            Cookies.set('point', 401)
            location.reload()
          })
        }
        Notification.error({
          title: data.errMsg,
          duration: 5000
        })
        this.router.go(0)
        this.router.push({ path: this.redirect || '/' })
      } else if (data.errCode === 403) {
        router.push({ path: '/401' })
      } else if (data.errCode === 400) {
        const errorMsg = error.response.data.errMsg
        if (errorMsg !== undefined) {
          Notification.error({
            title: errorMsg,
            duration: 5000
          })
        } else {
          Notification.error({
            title: error.response,
            duration: 5000
          })
        }
      } else if (error.response.status === 500 || error.response.status === 400) {
        const errorMsg = error.response.data.errMsg
        if (errorMsg !== undefined) {
          Notification.error({
            title: errorMsg,
            duration: 5000
          })
        } else {
          Notification.error({
            title: 'API request failed！',
            duration: 5000
          })
        }
      } else if (error.response.status === 403) {
        Notification.error({
          title: '无权操作',
          duration: 5000
        })
      }
    }
    return Promise.reject(error)
  }
)
export default service
