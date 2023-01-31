import { Message } from "wechaty";

export interface UserCache {
  uid: string;
  cacheString: string;
}

export interface RequestCache {
  message: Message;
  retryCount: number;
}

export class Caches {
  userCaches: {
    [key: string]: UserCache;
  };
  requestCaches: Array<RequestCache>;

  constructor () {
    this.userCaches = {};
    this.requestCaches = []
  }

  getUserCache (uid: string) {
    return this.userCaches[uid]?.cacheString || ''
  }

  setUserCache (uid: string, cacheString: string) {
    // 获取上次会话信息，如果没有直接返回空字符串
    const oldCache = this.getUserCache(uid)
    const newCache = oldCache + cacheString
    // 保留最后4000长度
    this.userCaches[uid] = {
      uid: uid,
      cacheString: newCache.slice(newCache.length - 4000)
    }
    console.log('cache', JSON.stringify(this.userCaches))
    return this.userCaches[uid].cacheString
  }

  clearUserCache (uid: string) {
    delete this.userCaches[uid]
  }

  getRequestCache () {
    return this.requestCaches.shift();
  }

  setRequestCache (requestCache: RequestCache) {
    this.requestCaches.push(requestCache)
  }

  clearRequestCaches () {
    this.requestCaches = []
  }

}