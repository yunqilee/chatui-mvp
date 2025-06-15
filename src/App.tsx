import { useState } from "react";
import Chat, {
  Bubble,
  Typing,
  useMessages,
  MessageProps,
  MessageType,
  TextMessageContent,
} from "@chatui/core";
import { marked } from "marked";
import DOMpurify from "dompurify";
import { isMarkdown } from "./utils/isMarkdown";
import "./App.css";
import "@chatui/core/dist/index.css";

const initialMessages: MessageProps[] = [
  {
    _id: `${Date.now()}`,
    type: "text",
    content: { text: "你好，我是 AI 助手！" },
    user: {
      avatar: "https://cdn-icons-png.flaticon.com/32/4712/4712100.png",
    },
  },
];

function App() {
  const { messages, appendMsg, updateMsg } = useMessages(initialMessages);

  const handleSend = async (type: MessageType, val: string) => {
    if (type === "text" && val.trim()) {
      appendMsg({
        type: "text",
        content: { text: val },
        position: "right",
      });

      const typingId = `typing-${Date.now()}`;
      appendMsg({
        _id: typingId,
        type: "typing",
        position: "left",
      });

      try {
        const res = await fetch(
          "https://api.deepseek.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                { role: "system", content: "你是一个有帮助的中文AI助手。" },
                { role: "user", content: val },
              ],
              temperature: 0.7,
            }),
          }
        );
        const data = await res.json();
        const reply =
          data.choices?.[0]?.message?.content ||
          "抱歉，我现在无法回答这个问题。";
        const msgType = isMarkdown(reply) ? "markdown" : "text";
        updateMsg(typingId, {
          type: msgType,
          content: { text: reply },
          position: "left",
        });
      } catch (error) {
        console.error("Error fetching response:", error);
        updateMsg(typingId, {
          type: "text",
          content: { text: "发生错误，请稍后再试。" },
          position: "left",
        });
      }
    }
  };

  const renderMessageContent = (msg: MessageProps) => {
    const { type, content } = msg;
    switch (type) {
      case "text":
        return <Bubble content={(content as TextMessageContent).text} />;
      case "markdown":
        const rawHtml = marked.parse((content as any).text || "");
        const safeHtml = DOMpurify.sanitize(rawHtml);
        return (
          <Bubble>
            <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
          </Bubble>
        );
      case "typing":
        return <Typing />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <div className="chat-wrapper">
        <Chat
          navbar={{ title: "AI 助手" }}
          locale="zh-CN"
          messages={messages}
          renderMessageContent={renderMessageContent}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}

export default App;
