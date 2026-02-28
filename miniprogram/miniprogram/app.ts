// app.ts

// 环境配置 — 生产部署时修改此处的 baseUrl 即可
const ENV = {
  dev: 'http://localhost:8000',
  prod: 'http://localhost:8000', // 生产环境请替换为真实域名，如 'https://api.example.com'
}

App({
  onLaunch() {
    console.log('App launched')
  },
  globalData: {
    userInfo: null as any,
    // request.ts 通过 getApp().globalData.baseUrl 读取此配置
    baseUrl: ENV.dev, // 切换生产环境时改为 ENV.prod
  },
})