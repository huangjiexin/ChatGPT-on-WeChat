import { Config } from "../config.js";
import { Message } from "wechaty";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { Configuration, OpenAIApi } from "openai";
import { Conversation } from "./conversation.js";
import { Caches } from "./caches.js";
import { UserMessage } from "./userMessage.js";

// ChatGPT error response configuration
export const chatgptErrorMessage = "🤖️王大锤卡了，请稍后再试～";

// ChatGPT model configuration
// please refer to the OpenAI API doc: https://beta.openai.com/docs/api-reference/introduction
export const ChatGPTModelConfig: any = {
  // this model field is required
  model: "text-davinci-003",
  // add your ChatGPT model parameters below
  temperature: 0.9,
  max_tokens: 1700,
};

// 声明一下缓存池
export const CACHES = new Caches();

// message size for a single reply by the bot
const SINGLE_MESSAGE_MAX_SIZE = 500;

export enum MessageType {
  Unknown = 0,
  Attachment = 1, // Attach(6),
  Audio = 2, // Audio(1), Voice(34)
  Contact = 3, // ShareCard(42)
  ChatHistory = 4, // ChatHistory(19)
  Emoticon = 5, // Sticker: Emoticon(15), Emoticon(47)
  Image = 6, // Img(2), Image(3)
  Text = 7, // Text(1)
  Location = 8, // Location(48)
  MiniProgram = 9, // MiniProgram(33)
  GroupNote = 10, // GroupNote(53)
  Transfer = 11, // Transfers(2000)
  RedEnvelope = 12, // RedEnvelopes(2001)
  Recalled = 13, // Recalled(10002)
  Url = 14, // Url(5)
  Video = 15, // Video(4), Video(43)
  Post = 16, // Moment, Channel, Tweet, etc
}
export class ChatGPTBot {
  botName: string = "";
  chatgptTriggerKeyword = Config.chatgptTriggerKeyword;
  OpenAIConfig: any; // OpenAI API key
  OpenAI: any; // OpenAI API instance

  setBotName(botName: string) {
    this.botName = botName;
  }

  // get trigger keyword in group chat: (@Name <keyword>)
  get chatGroupTriggerKeyword(): string {
    return `@${this.botName}`;
  }

  // configure API with model API keys and run an initial test
  async startGPTBot() {
    try {
      // OpenAI Account configuration
      this.OpenAIConfig = new Configuration({
        organization: Config.openaiOrganizationID,
        apiKey: Config.openaiApiKey,
      });
      // OpenAI API instance
      this.OpenAI = new OpenAIApi(this.OpenAIConfig);
      // Hint user the trigger keyword in private chat and group chat
      console.log(`🤖️ Chatbot name is: ${this.botName}`);
      console.log(`🎯 Trigger keyword in private chat is: ${this.chatgptTriggerKeyword}`);
      console.log(`🎯 Trigger keyword in group chat is: ${this.chatGroupTriggerKeyword}`);
      // Run an initial test to confirm API works fine
      // await this.onChatGPT("Say Hello World");
      console.log(`✅ Chatbot starts success, ready to handle message!`);
    } catch (e) {
      console.error(`❌ ${e}`);
    }
  }

  // reply with the segmented messages from a single-long message
  async reply(
    talker: RoomInterface | ContactInterface | undefined,
    mesasge: string
  ): Promise<void> {
    const messages: Array<string> = [];
    let message = mesasge;

    while (message.length > SINGLE_MESSAGE_MAX_SIZE) {
      messages.push(message.slice(0, SINGLE_MESSAGE_MAX_SIZE));
      message = message.slice(SINGLE_MESSAGE_MAX_SIZE);
    }
    messages.push(message);
    for (const msg of messages) {
      await talker?.say(msg);
    }
  }

  // reply to private message
  async onPrivateMessage(userMessage: UserMessage) {
    // 获取缓存并转成包含上下文的信息
    const chatgptMessage = this.toChatgptString(CACHES.getUserCacheContext(userMessage.uid))
    try {
      const chatgptReplyMessage = await new Conversation().completions(this.OpenAI, chatgptMessage)
      if (chatgptReplyMessage) {
        console.log("🤖️ Chatbot says: ", chatgptReplyMessage);
        CACHES.setUserCacheContext(userMessage, chatgptReplyMessage);
        // send the ChatGPT reply to chat
        await this.reply(userMessage.talker, chatgptReplyMessage);
      }
    } catch (e: any) {
      await this.reply(userMessage.talker, e.message);
    }
  }

  // reply to group message
  async onGroupMessage(userMessage: UserMessage) {
    // 获取缓存并转成包含上下文的信息
    const chatgptMessage = this.toChatgptString(CACHES.getUserCacheContext(userMessage.uid))
    try {
      const chatgptReplyMessage = await new Conversation().completions(this.OpenAI, chatgptMessage)
      if (chatgptReplyMessage) {
        console.log("🤖️ Chatbot says: ", chatgptReplyMessage);
        // the reply consist of: original text and bot reply
        const result = `「${userMessage.talker.name()}：${userMessage.cleanText}」\n- - - - - - - - - - - - - - -\n${chatgptReplyMessage}`;
        // 设置缓存
        CACHES.setUserCacheContext(userMessage, chatgptReplyMessage);
        await this.reply(userMessage.room, result);
      }
    } catch (e: any) {
      await this.reply(userMessage.room, e.message);
    }
  }

  // receive a message (main entry)
  async onMessage(message: Message) {
    const userMessage = new UserMessage(message)
    if (userMessage.cleanText.includes('/reset')) {
      console.log("📨 Context is clean")
      return this.resetContext(userMessage)
    }
    
    if (!userMessage.triggerGPTMessage()) {
      console.log("📨 Message isNonsense")
      return;
    }
    console.log("📨 Message Date: " + `${(message.date()).toLocaleDateString()} ${(message.date()).toLocaleTimeString()}`)
    // 缓冲消息，如果请求失败则重试，最多10次
    CACHES.setRequestCache(userMessage)
    // 设置缓存
    CACHES.setUserCacheContext(userMessage)
    this.dealMessage(userMessage)
  }

  async dealMessage (userMessage: UserMessage) {
    // reply to private or group chat
    if (userMessage.isPrivateChat) {
      return await this.onPrivateMessage(userMessage);
    } else {
      return await this.onGroupMessage(userMessage);
    }
  }

  // 把上下文的对话转成字符串，超过配置里的长度则舍弃最早的对话
  toChatgptString (context: Array<string>) : string {
    const tmpContext = JSON.parse(JSON.stringify(context))
    let chatgptString = ''
    while (chatgptString.length < ChatGPTModelConfig.max_tokens && tmpContext.length > 0) {
      chatgptString = `${tmpContext.pop()}\n${chatgptString}`
    }
    return chatgptString.length > ChatGPTModelConfig.max_tokens 
      ? chatgptString.substring(chatgptString.length, ChatGPTModelConfig.max_tokens)
      : chatgptString
  }

  // 清空上下文
  async resetContext (userMessage: UserMessage) {
    CACHES.clearUserCache(userMessage.uid)
    if (userMessage.isPrivateChat) {
      return await this.reply(userMessage.talker, '会话已清空～');
    } else {
      return await this.reply(userMessage.room, '会话已清空～');
    }
  }
}
