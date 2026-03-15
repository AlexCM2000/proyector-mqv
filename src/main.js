import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Editor from './views/Editor.vue'
import Projector from './views/Projector.vue'
import './styles.css'

const routes = [
  { path: '/', component: Editor },
  { path: '/projector/:id?', component: Projector, props: true }
]

const router = createRouter({
  // WebHashHistory funciona con file:// (Electron) y con servidor HTTP
  history: createWebHashHistory(),
  routes
})

createApp(App).use(router).mount('#app')
