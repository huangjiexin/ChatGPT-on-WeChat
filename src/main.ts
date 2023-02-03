import QRCode from "qrcode";
import { WechatyBuilder } from "wechaty";
import { ChatGPTBot } from "./service/chatgpt.js";
import log4js from "log4js"
import log4jsConfig from "../log4js.config.js";

// 配置
log4js.configure(log4jsConfig);
export const logger = log4js.getLogger();

// Wechaty instance
const weChatBot = WechatyBuilder.build({
  name: "my-wechat-bot",
});
// ChatGPTBot instance
export const chatGPTBot = new ChatGPTBot();

async function main() {
  weChatBot
    // scan QR code for login
    .on("scan", async (qrcode, status) => {
      const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
      console.log(`💡 Scan QR Code to login: ${status}\n${url}`);
      console.log(
        await QRCode.toString(qrcode, { type: "terminal", small: true })
      );
    })
    // login to WeChat desktop account
    .on("login", async (user: any) => {
      console.log(`✅ User ${user} has logged in`);
      chatGPTBot.setBotName(user.name());
      await chatGPTBot.startGPTBot();
    })
    // message handler
    .on("message", async (message: any) => {
      try {
        // add your own task handlers over here to expand the bot ability!
        // e.g. if a message starts with "Hello", the bot sends "World!"
        if (message.text().startsWith("Hello")) {
          await message.say("World!");
          return;
        }
        // 超过1分钟不需要回复
        if (message.age() > 60 && (new Date().valueOf() - message.date().valueOf()) / 1000 > 60) {
          return;
        }
        console.log(`📨 ${message}`);
        // handle message for chatGPT bot
        await chatGPTBot.onMessage(message);
      } catch (e) {
        console.error(`❌ ${e}`);
      }
    });

  try {
    await weChatBot.start();
  } catch (e) {
    console.error(`❌ Your Bot failed to start: ${e}`);
    console.log(
      "🤔 Can you login WeChat in browser? The bot works on the desktop WeChat"
    );
  }
}
main();
