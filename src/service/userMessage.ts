import { Message } from "wechaty";
import { roomsConfig } from "../const.js";
import { IUserMessage } from "../interface";
import { chatGPTBot } from "../main.js";
import { MessageType } from "./chatgpt.js";

export class UserMessage implements IUserMessage {
  
  uid: IUserMessage["uid"];
  talker: IUserMessage["talker"];
  room?:IUserMessage["room"];
  rawText: IUserMessage["rawText"];
  context?: IUserMessage["context"];
  cleanText: IUserMessage["cleanText"];
  isPrivateChat: IUserMessage["isPrivateChat"];
  messageType: IUserMessage["messageType"];
  rawMessage: IUserMessage["rawMessage"];
  customConfig: IUserMessage["customConfig"];

  constructor (message: Message) {
    this.talker = message.talker();
    this.room = message.room();
    this.rawText = message.text();
    this.messageType = message.type();
    this.isPrivateChat = !this.room;
    this.cleanText = this.cleanMessage(this.rawText, this.isPrivateChat);
    this.rawMessage = message
    this.customConfig = this.getCustomConfig()
    this.uid = this.getUid();
  }

  cleanMessage(rawText: string, isPrivateChat: boolean = false): string {
    let text = rawText;
    const item = rawText.split("- - - - - - - - - - - - - - -");
    if (item.length > 1) {
      text = item[item.length - 1];
    }
    text = text.replace(
      isPrivateChat ? chatGPTBot.chatgptTriggerKeyword : chatGPTBot.chatGroupTriggerKeyword,
      ""
    );

	  const punctuation = ",.;!?，。！？、…"
    if (!punctuation.includes(text.slice(-1))) text += '。'
    return text.trim();
  }

  // 过滤掉不需要处理的消息
  isNonsense(): boolean {
    return (
      // self-chatting can be used for testing
      this.talker.self() ||
      this.messageType > MessageType.GroupNote ||
      this.talker.name() == "微信团队" ||
      // video or voice reminder
      this.rawText.includes("收到一条视频/语音聊天消息，请在手机上查看") ||
      // red pocket reminder
      this.rawText.includes("收到红包，请在手机上查看") ||
      // location information
      this.rawText.includes("/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg")
    );
  }

  // 检查是否触发Gpt
  triggerGPTMessage(): boolean {
    if (this.isNonsense()) return false

    const chatgptTriggerKeyword = chatGPTBot.chatgptTriggerKeyword;
    let triggered = false;
    if (this.isPrivateChat) {
      triggered = chatgptTriggerKeyword
        ? this.rawText.includes(chatgptTriggerKeyword)
        : true;
    } else {
      // 微信引用类型
      if (this.rawText.includes('- - - - - - - - - - - - - - -')) {
        this.rawText = this.rawText.split("- - - - - - - - - - - - - - -")[1]
      }
      triggered = this.rawText.includes(chatGPTBot.chatGroupTriggerKeyword);
    }
    if (triggered) {
      console.log(`🎯 Chatbot triggered: ${this.rawText}`);
    }
    return triggered;
  }

  getCustomConfig () {
    const roomId = this.room?.id;
    if (!roomId) {
      return;
    }
    const config = roomsConfig.find(config => config.romeIds.includes(roomId))
    return config?.config
  }

  getUid () {
    if (this.customConfig?.globalContext) {
      return this.room?.id || ''
    } else {
      return this.talker.id + this.room?.id
    }
  }
}