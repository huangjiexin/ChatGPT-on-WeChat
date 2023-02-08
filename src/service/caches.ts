import { UserMessage } from "./userMessage";

export interface UserCache {
  uid: string;
  context: Array<string>;
}

export interface RequestCache {
  userMessage: UserMessage;
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

  getUserCacheContext (uid: string) {
    return this.userCaches[uid]?.context || []
  }

  // 设置用户上下文缓存
  setUserCacheContext (userMessage: UserMessage, cacheText?: string) {
    const curCache: string = `${cacheText || userMessage.cleanText}`
    const userCache = this.userCaches[userMessage.uid]
    if (!userCache) {
      this.userCaches[userMessage.uid] = {
        uid: userMessage.uid,
        context: userMessage.customConfig ? [...userMessage.customConfig.defaultContext, curCache] : [curCache]
      }
    } else {
      this.userCaches[userMessage.uid].context.push(curCache)
    }
    console.log('userCashs', this.userCaches)
    console.log('requestCaches', this.requestCaches)
    return this.userCaches[userMessage.uid].context
  }

  // 设置用户缓存
  clearUserCache (uid: string) {
    delete this.userCaches[uid]
  }

  // 清除用户请求时的缓存
  clearUserRequestCache (uid: string) {
    this.userCaches[uid].context.pop()
  }

  getRequestCache () {
    return this.requestCaches[0];
  }

  setRequestCache (userMessage: UserMessage, retryCount: number = 10) {
    this.requestCaches.push({
      userMessage: userMessage,
      retryCount: retryCount
    })
  }

  // 清除第一个重试中的缓存
  shiftRequestCache () {
    this.requestCaches.shift()
  }

  clearRequestCaches () {
    this.requestCaches = []
  }

}