/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { router } from '#/router';
import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function formatToken(token: null | string) {
  return token ? `Bearer ${token}` : null;
}

function createRequestClient(
  baseURL: string,
  options?: RequestClientOptions,
  applyResponseInterceptors = true,
) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  if (applyResponseInterceptors) {
    // 处理返回的响应数据格式
    client.addResponseInterceptor(
      defaultResponseInterceptor({
        codeField: 'code',
        dataField: 'data',
        successCode: 0,
      }),
    );

    // token过期的处理
    client.addResponseInterceptor(
      authenticateResponseInterceptor({
        client,
        doReAuthenticate,
        doRefreshToken,
        enableRefreshToken: preferences.app.enableRefreshToken,
        formatToken,
      }),
    );

    // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
    client.addResponseInterceptor(
      errorMessageResponseInterceptor((msg: string, error) => {
        console.log('msg:', msg);
        let code = error?.response?.data?.code || 200;
        if (error?.response?.status === 403 || code == 403) {
          router.push({ name: 'FallbackForbidden' });
          return;
        }
        if (error?.response?.status === 404 || code == 404) {
          router.push({ name: 'FallbackNotFound' });
          return;
        }
        // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
        // 当前mock接口返回的错误字段是 error 或者 message
        const responseData = error?.response?.data ?? {};
        const errorMessage = responseData?.error ?? responseData?.message ?? '';
        // 如果没有错误信息，则会根据状态码进行提示
        message.error(errorMessage || msg);
      }),
    );
  }

  return client;
}

export const requestClient = createRequestClient(
  apiURL,
  {
    responseReturn: 'data',
  },
  true,
);

export const baseRequestClient = createRequestClient(apiURL, {}, false);

/**
 * 通用下载方法：保留响应头，从 Content-Disposition 解析文件名并触发下载
 */
export async function download(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: Record<string, any>;
    data?: any;
    headers?: Record<string, string>;
    filename?: string; // 可选：显式指定文件名
  } = {},
) {
  const { method = 'GET', params, data, headers = {}, filename } = options;

  const response: any = await baseRequestClient.request(url, {
    method,
    params,
    data,
    headers,
    responseType: 'blob',
    responseReturn: 'response',
  });

  // 解析 Content-Disposition 获取文件名
  const disposition =
    response?.headers?.['content-disposition'] ||
    response?.headers?.get?.('content-disposition') ||
    '';
  let inferred = filename || 'download';
  const m =
    /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(disposition) ||
    /filename="?([^"]+)"?/i.exec(disposition);
  if (m && m[1]) {
    try {
      inferred = decodeURIComponent(m[1]);
    } catch {
      inferred = m[1];
    }
  }

  // 处理数据为 Blob
  const raw = response?.data ?? response?.body ?? response;
  const blob = raw instanceof Blob ? raw : new Blob([raw]);

  // 触发浏览器下载
  const urlObject = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = urlObject;
  a.download = inferred;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(urlObject);

  return true;
}

// 兼容保持：将下载方法挂到 requestClient.download
// 这样现有代码中调用 requestClient.download 也能生效
(requestClient as any).download = download;
