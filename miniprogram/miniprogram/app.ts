// app.ts

App({
  onLaunch() {
    // 如果未登录，会在各页面的 onLoad/onShow 中重定向到登录页
    console.log('App launched')
  },
  globalData: {
    userInfo: null as any,
  },
})