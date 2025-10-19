import React from "react";
import Chat, {
  Bubble,
  Typing,
  useMessages,
  Card,
  CardMedia,
} from "@chatui/core";
import type { MessageProps } from "@chatui/core";
import { marked } from "marked";
import DOMpurify from "dompurify";
import { isMarkdown } from "./utils/isMarkdown";
import { getCurrentWeather } from "./utils/getCurrentWeather";
import { detectWeatherIntent } from "./utils/detectWeatherIntent";
import "./App.css";
import "@chatui/core/dist/index.css";

interface TextMessageContent {
  text: string;
}

interface CardContent {
  title: string;
  description: string;
  picUrl: string;
}

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

  const handleSend = async (type: string, val: string) => {
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

      const needWeather = await detectWeatherIntent(val);
      if (needWeather) {
        const weatherCard = await getCurrentWeather();
        updateMsg(typingId, {
          type: "card",
          position: "left",
          content: weatherCard,
        });
        return;
      }

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
              stream: true,
            }),
          }
        );
        if (!res.ok || !res.body) throw new Error(res.statusText);
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullText = "";
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.replace(/^data:\s*/, "");
            if (payload === "[DONE]") {
              const msgType = isMarkdown(fullText) ? "markdown" : "text";
              updateMsg(typingId, {
                type: msgType,
                content: { text: fullText },
                position: "left",
              });
              return;
            }
            try {
              const data = JSON.parse(payload);
              if (data.choices && data.choices.length > 0) {
                const content = data.choices[0].delta?.content || "";
                fullText += content;
                updateMsg(typingId, {
                  type: "text",
                  content: { text: fullText },
                  position: "left",
                });
              }
            } catch (e) {
              console.error("JSON parse error:", e);
            }
          }
        }
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
      case "markdown": {
        const rawHtml = marked.parse(
          (content as TextMessageContent).text || ""
        );
        const safeHtml =
          typeof rawHtml === "string" ? DOMpurify.sanitize(rawHtml) : "";
        return (
          <Bubble>
            <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
          </Bubble>
        );
      }
      case "typing":
        return <Typing />;
      case "card": {
        const cardContent = content as CardContent;
        return (
          <Card>
            <CardMedia aspectRatio="wide" image={cardContent.picUrl} />
            <div style={{ padding: "12px" }}>
              <strong>{cardContent.title}</strong>
              <p>{cardContent.description}</p>
            </div>
          </Card>
        );
      }
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
