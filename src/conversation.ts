import { CACHES, chatgptErrorMessage, ChatGPTModelConfig } from "./chatgpt.js";
import axios from "axios"
import { Config } from "./config.js";
import { chatGPTBot } from "./main.js";

const BASEURL = "https://api.openai.com/v1/"

export class Conversation {

  // 对话
  completions = async (mesasge: string) => {
    try {
      const requestBody = {
        ...ChatGPTModelConfig,
        prompt: mesasge
      }
      const response = await this.createRequest('completions', requestBody)
      // 请求完成，清除缓存的请求
      CACHES.requestCaches.length > 0 ? CACHES.requestCaches.slice(1) : null
      return response.choices[0]?.text?.trim() || '';
    }
    catch (e: any) {
      const errorResponse = e?.response;
      const errorCode = errorResponse?.status;
      const errorStatus = errorResponse?.statusText;
      const errorMessage = errorResponse?.data?.error?.message;
      console.error(`❌ Code ${errorCode}: ${errorStatus}`);
      console.error(`❌ ${errorMessage}`);
      // 失败重试机制
      const retryRequest = CACHES.getRequestCache()
      if (retryRequest?.retryCount && retryRequest.retryCount > 0) {
        retryRequest.retryCount--
        console.error(`👉重试: 剩余次数${retryRequest.retryCount}`);
        setTimeout(() => {
          chatGPTBot.dealMessage(retryRequest.message)
        }, 1000)
      }
    }
  }


  // // 对话
  // completions = async (openAI: OpenAIApi, mesasge: string) => {
  //   try {
  //     const response = await openAI.createCompletion({
  //       ...ChatGPTModelConfig,
  //       prompt: mesasge,
  //     });
  //     return response?.data?.choices[0]?.text?.trim() || '';
  //   }
  //   catch (e: any) {
  //     const errorResponse = e?.response;
  //     const errorCode = errorResponse?.status;
  //     const errorStatus = errorResponse?.statusText;
  //     const errorMessage = errorResponse?.data?.error?.message;
  //     console.error(`❌ Code ${errorCode}: ${errorStatus}`);
  //     console.error(`❌ ${errorMessage}`);
  //     return chatgptErrorMessage;
  //   }
  // }

  async createRequest (api: string, requestBody: any): Promise<any>{
    // 超时时间
    axios.defaults.timeout = 30000
    let requestH = {
      method: 'post',
      url: BASEURL + api,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Config.openaiApiKey
      },
      data: requestBody
    }
    const res = await axios(requestH)
    if (res.status === 200) {
      console.log(res.data)
      return res.data
    } else {
      console.error(`❌ ${res}`);
      return chatgptErrorMessage;
    }
  }
}