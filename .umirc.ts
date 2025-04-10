/*
 * @Author: wangyecheng 1874863790@qq.com
 * @Date: 2025-04-10 11:20:32
 * @LastEditors: wangyecheng 1874863790@qq.com
 * @LastEditTime: 2025-04-10 16:08:21
 * @FilePath: \react\.umirc.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '@umijs/max',
  },
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      name: '首页',
      path: '/home',
      component: './Home',
    },
    {
      name: '权限演示',
      path: '/access',
      component: './Access',
    },
    {
      name: ' CRUD 示例',
      path: '/table',
      component: './Table',
    },
    {
      name: ' 音视频通话 示例',
      path: '/media',
      component: './Media',
    },
  ],
  npmClient: 'npm',
});
