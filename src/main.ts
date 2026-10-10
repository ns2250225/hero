import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/global.css';
import './styles/pixel.css';
import { runController } from './services/RunController';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');

// 首次用户手势后解锁音频（浏览器策略）
const unlock = () => {
  void import('./game/managers/AudioManager').then((m) => m.audio.unlock());
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock, { once: false });
window.addEventListener('keydown', unlock, { once: false });

void runController.init();
runController.startAutosave();

// PWA：注册 Service Worker（仅生产环境，开发时避免缓存干扰）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
