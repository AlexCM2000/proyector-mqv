import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Editor from './views/Editor.vue'
import Projector from './views/Projector.vue'
import './styles.css'

const routes = [
  { path: '/', component: Editor },
  { path: '/projector/:id?', component: Projector, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

createApp(App).use(router).mount('#app')
