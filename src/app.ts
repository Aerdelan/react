// 运行时配置

function loadCDNsSequentially(urls: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const loadScript = (index: number) => {
      if (index >= urls.length) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = urls[index];
      script.async = true;
      script.onload = () => loadScript(index + 1);
      script.onerror = () =>
        reject(new Error(`Failed to load script: ${urls[index]}`));
      document.head.appendChild(script);
    };
    loadScript(0);
  });
}
import './HiRTC/adapter.js';
import './HiRTC/base64.js';
import './HiRTC/crypto-js.js';
import './HiRTC/hirtc-web-20240617.js';
import './HiRTC/saver.js';
import './HiRTC/sign.js';
console.log(window.hirtcwebsdk, 'hirtcwebdk');
// 加载全局脚本
// loadCDNsSequentially([
//   './HiRTC/crypto-js.js',
//   './HiRTC/base64.js',
//   './HiRTC/adapter.js',
//   './HiRTC/sign.js',
//   './HiRTC/saver.js',
//   './HiRTC/hirtc-web-20240617.js',
// ])
//   .then(() => {
//     console.log(window.hirtcwebsdk, 'hirtcwebdk');
//   })
//   .catch((error) => {
//     console.error(error);
//   });

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{ name: string }> {
  return { name: '@umijs/max' };
}

export const layout = () => {
  return {
    logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
    menu: {
      locale: false,
    },
  };
};
