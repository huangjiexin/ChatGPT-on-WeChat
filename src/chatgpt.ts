import { Config } from "./config.js";
import { Message } from "wechaty";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { Configuration, OpenAIApi } from "openai";
import { Conversation } from "./conversation.js";
import { Caches } from "./caches.js";

// ChatGPT error response configuration
export const chatgptErrorMessage = "🤖️王大锤卡了，请稍后再试～";

// ChatGPT model configuration
// please refer to the OpenAI API doc: https://beta.openai.com/docs/api-reference/introduction
export const ChatGPTModelConfig: any = {
  // this model field is required
  model: "text-davinci-003",
  // add your ChatGPT model parameters below
  temperature: 0.9,
  max_tokens: 2000,
};

// 声明一下缓存池
export const CACHES = new Caches();

// message size for a single reply by the bot
const SINGLE_MESSAGE_MAX_SIZE = 500;

enum MessageType {
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

  // Chatgpt fine-tune for being a chatbot (guided by OpenAI official document)
  applyContext(text: string): string {
    return `You are an artificial intelligence bot from a company called "OpenAI". Your primary tasks are chatting with users and answering their questions.\nIf the user says: ${text}.\nYou will say: `;
  }

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

  // get clean message by removing reply separater and group mention characters
  cleanMessage(rawText: string, isPrivateChat: boolean = false): string {
    let text = rawText;
    const item = rawText.split("- - - - - - - - - - - - - - -");
    if (item.length > 1) {
      text = item[item.length - 1];
    }
    text = text.replace(
      isPrivateChat ? this.chatgptTriggerKeyword : this.chatGroupTriggerKeyword,
      ""
    );
    return text;
  }

  // check whether ChatGPT bot can be triggered
  triggerGPTMessage(text: string, isPrivateChat: boolean = false): boolean {
    const chatgptTriggerKeyword = this.chatgptTriggerKeyword;
    let triggered = false;
    if (isPrivateChat) {
      triggered = chatgptTriggerKeyword
        ? text.includes(chatgptTriggerKeyword)
        : true;
    } else {
      // 微信引用类型
      if (text.includes('- - - - - - - - - - - - - - -')) {
        text = text.split("- - - - - - - - - - - - - - -")[1]
      }
      triggered = text.includes(this.chatGroupTriggerKeyword);
    }
    if (triggered) {
      console.log(`🎯 Chatbot triggered: ${text}`);
    }
    return triggered;
  }

  // filter out the message that does not need to be processed
  isNonsense(
    talker: ContactInterface,
    messageType: MessageType,
    text: string
  ): boolean {
    return (
      // self-chatting can be used for testing
      talker.self() ||
      messageType > MessageType.GroupNote ||
      talker.name() == "微信团队" ||
      // video or voice reminder
      text.includes("收到一条视频/语音聊天消息，请在手机上查看") ||
      // red pocket reminder
      text.includes("收到红包，请在手机上查看") ||
      // location information
      text.includes("/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg")
    );
  }

  // reply with the segmented messages from a single-long message
  async reply(
    talker: RoomInterface | ContactInterface,
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
      await talker.say(msg);
    }
  }

  // reply to private message
  async onPrivateMessage(talker: ContactInterface, text: string) {
    // get reply from ChatGPT
    
    const uid = talker.id // 设置缓存
    const inputMessage = CACHES.setUserCache(uid, `\n${text}\n`)
    const chatgptReplyMessage = await new Conversation().completions(inputMessage)
    console.log("🤖️ Chatbot says: ", chatgptReplyMessage);
    CACHES.setUserCache(uid, `\n${chatgptReplyMessage}\n`);
    // send the ChatGPT reply to chat
    await this.reply(talker, chatgptReplyMessage);
  }

  // reply to group message
  async onGroupMessage(room: RoomInterface, talker: ContactInterface, text: string) {
    // get reply from ChatGPT
    const uid = room.id + talker.id // 设置缓存
    const inputMessage = CACHES.setUserCache(uid, `\n${text}\n`)
    const chatgptReplyMessage = await new Conversation().completions(inputMessage)
    console.log("🤖️ Chatbot says: ", chatgptReplyMessage);
    // the reply consist of: original text and bot reply
    const result = `「${talker.name()}：${text}」\n- - - - - - - - - - - - - - -\n${chatgptReplyMessage}`;
    // 设置缓存
    CACHES.setUserCache(uid, `\n${chatgptReplyMessage}\n`);
    await this.reply(room, result);
  }

  // receive a message (main entry)
  async onMessage(message: Message) {
    const talker = message.talker();
    const rawText = message.text();
    const room = message.room();
    const messageType = message.type();
    const isPrivateChat = !room;
    
    if (
      this.isNonsense(talker, messageType, rawText) ||
      !this.triggerGPTMessage(rawText, isPrivateChat)
    ) {
      console.log("📨 Message isNonsense")
      return;
    }
    console.log("📨 Message Date: " + `${(message.date()).toLocaleDateString()} ${(message.date()).toLocaleTimeString()}`)
    // 缓冲消息，如果请求失败则重试，最多10次
    CACHES.requestCaches.push({ message: message, retryCount: 10 })
    this.dealMessage(message)
  }

  async dealMessage (message: Message) {
    const talker = message.talker();
    const rawText = message.text();
    const room = message.room();
    const isPrivateChat = !room;
    // clean the message for ChatGPT input
    let text = this.cleanMessage(rawText, isPrivateChat);
    // reply to private or group chat
    if (isPrivateChat) {
      return await this.onPrivateMessage(talker, text);
    } else {
      return await this.onGroupMessage(room, talker, text);
    }
  }
}
