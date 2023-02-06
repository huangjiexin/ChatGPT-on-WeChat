import { CACHES, chatgptErrorMessage, ChatGPTModelConfig } from "./chatgpt.js";
import axios from "axios"
import { Config } from "../config.js";
import { chatGPTBot, logger } from "../main.js";
import { OpenAIApi } from "openai";

// const BASEURL = "https://api.openai.com/v1/"

export class Conversation {

  // // 对话
  // completions = async (mesasge: string) => {
  //   try {
  //     const requestBody = {
  //       ...ChatGPTModelConfig,
  //       prompt: mesasge
  //     }
  //     const response = await this.createRequest('completions', requestBody)
  //     // 请求完成，清除缓存的请求
  //     CACHES.requestCaches.length > 0 ? CACHES.shiftRequestCache() : null
  //     return response.choices[0]?.text?.trim() || '';
  //   }
  //   catch (e: any) {
  //     const errorResponse = e?.response;
  //     const errorCode = errorResponse?.status;
  //     const errorStatus = errorResponse?.statusText;
  //     const errorMessage = errorResponse?.data?.error?.message;
  //     console.error(`❌ Code ${errorCode}: ${errorStatus}`);
  //     console.error(`❌ ${errorMessage}`);
  //     logger.error(`❌ ${e}`)
  //     this.retryRequest()
  //   }
  // }

  // 失败重试机制
  retryRequest () {
    const retryRequest = CACHES.getRequestCache()
    if (retryRequest?.retryCount && retryRequest.retryCount-- > 0) {
      console.error(`👉重试: 剩余次数${retryRequest.retryCount}`);
      setTimeout(() => {
        chatGPTBot.dealMessage(retryRequest.userMessage)
      }, 15000)
    } else {
      if (CACHES.requestCaches.length > 0)
        CACHES.shiftRequestCache()
        CACHES.clearUserCache(retryRequest.userMessage.uid)
        throw new Error(`${chatgptErrorMessage}`);
    }
  }
  // 对话
  completions = async (openAI: OpenAIApi, mesasge: string) => {
    console.log('context\n', mesasge)
    try {
      const response = await openAI.createCompletion({
        ...ChatGPTModelConfig,
        prompt: mesasge,
      });
      return response?.data?.choices[0]?.text?.trim() || '';
    }
    catch (e: any) {
      const errorResponse = e?.response;
      const errorCode = errorResponse?.status;
      const errorStatus = errorResponse?.statusText;
      const errorMessage = errorResponse?.data?.error?.message;
      console.error(`❌ Code ${errorCode}: ${errorStatus}`);
      console.error(`❌ ${errorMessage}`);
      logger.error(`❌ ${e}`)
      this.retryRequest()
    }
  }

  // 获取图片
  images = async (openAI: OpenAIApi, query: string) => {
    console.log('image query\n', query)
    try {
      const response = await openAI.createImage({
        prompt: query,
        response_format: 'url',
        size: "512x512",
        n: 1  // 每次生成图片的数量
      });
      return response?.data?.data[0]?.url
    } catch (e: any) {
      const errorResponse = e?.response;
      const errorCode = errorResponse?.status;
      const errorStatus = errorResponse?.statusText;
      const errorMessage = errorResponse?.data?.error?.message;
      console.error(`❌ Code ${errorCode}: ${errorStatus}`);
      console.error(`❌ ${errorMessage}`);
      logger.error(`❌ ${e}`)
      this.retryRequest()
    }
  }

  // async createRequest (api: string, requestBody: any): Promise<any>{
  //   // 超时时间
  //   axios.defaults.timeout = 60000
  //   let requestH = {
  //     method: 'post',
  //     url: BASEURL + api,
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': 'Bearer ' + Config.openaiApiKey
  //     },
  //     data: requestBody
  //   }
  //   const res = await axios(requestH)
  //   if (res.status === 200) {
  //     return res.data
  //   } else {
  //     throw new Error(`❌ ${res}`);
  //   }
  // }

  
}