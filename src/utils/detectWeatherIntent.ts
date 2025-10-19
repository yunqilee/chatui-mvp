export async function detectWeatherIntent(text: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是一个严格的意图识别器。只输出一个合法的JSON，不要输出任何其它字符。" +
              '任务：判断用户是否在询问“今天的天气”。如果是，返回 {"requireWeather": true}，否则返回 {"requireWeather": false}。',
          },
          { role: "user", content: text },
        ],
        temperature: 0,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();

    const content: string =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      "";

    const jsonText = (content.match(/\{[\s\S]*\}/)?.[0] ?? content).trim();
    const parsed = JSON.parse(jsonText) as { requireWeather?: boolean };

    return !!parsed.requireWeather;
  } catch (e) {
    console.warn("意图识别失败，回退为普通聊天流程：", e);
    return false;
  }
}
