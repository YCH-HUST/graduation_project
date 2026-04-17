// app.ts

export const ENV = {
  dev: 'http://localhost:8000',
  prod: 'https://xn--uisx67a1pe.com',//https://杨城浩.com
}

App({
  onLaunch() {
    console.log('App launched')
  },
  globalData: {
    userInfo: null as any,
    baseUrl: ENV.prod,
  },
})