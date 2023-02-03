import { Message } from "wechaty";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import * as PUPPET from 'wechaty-puppet'

export interface IConfig {
  openaiApiKey: string;
  openaiOrganizationID?: string;
  chatgptTriggerKeyword: string;
}

export interface ICustomConfig {
  roomNames?: Array<string>;
  defaultContext: Array<string>;
  globalContext?: boolean;
}

export interface IUserMessage {
  uid: string,
  talker: ContactInterface,
  room?: undefined | RoomInterface,
  rawText: string,
  context?: string,
  cleanText: string,
  isPrivateChat: boolean,
  messageType: PUPPET.types.Message,
  customConfig: ICustomConfig | undefined,
  rawMessage: Message
}