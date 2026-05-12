import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import './styles/main.css'

async function bootstrap() {
  // if (import.meta.env.DEV) {
  //   await import('./mock')
  // }

  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.use(ElementPlus)
  app.mount('#app')
}

bootstrap()
