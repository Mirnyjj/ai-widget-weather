import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { lat, lon } = await req.json();

    if (!lat || !lon)
      return NextResponse.json(
        { error: "Не указаны координаты" },
        { status: 400 }
      );

    const YANDEX_KEY = process.env.YANDEX_WEATHER_KEY!;
    const yUrl = `https://api.weather.yandex.ru/v2/informers?lat=${lat}&lon=${lon}&lang=ru_RU`;

    const yRes = await fetch(yUrl, {
      headers: { "X-Yandex-Weather-Key": YANDEX_KEY },
    });

    if (!yRes.ok) throw new Error(`Яндекс API ошибка: ${yRes.status}`);
    const yData = await yRes.json();

    const fact = yData.fact || {};

    const weatherPrompt = `
    Сделай красивый прогноз погоды на основе этих данных:
    Текущая погода: Состояние: ${fact.condition}
    🌡️ Температура: ${fact.temp}°C
    💨 Ветер: ${fact.wind_speed} м/с
    💧 Влажность: ${fact.humidity}%
    📊 Давление: ${fact.pressure_mm} мм рт.ст.

    Оформи красиво, с эмодзи и кратко, чтобы это можно было вывести в компонент как текст.
    Добавь рекомендации для человека по нахождению на открытом воздухе.
    .
    `;

    const DEEPSEEK_MODEL = "tngtech/tng-r1t-chimera:free";
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "My Weather App",
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            {
              role: "system",
              content:
                "Ты генератор прогнозов погоды. Твоя задача - преобразовать сухие данные в красивый, атмосферный текст. ПРАВИЛА ФОРМАТИРОВАНИЯ: 2. 🌍 Используй ТОЛЬКО эмодзи, цифры, текст и пробелы 3. 📝 Разделяй текст на абзацы ПУСТОЙ СТРОКОЙ между ними 4. 🎨 Будь креативным, но точен с данными 5. ❌ НИКАКИХ звездочек, дефисов, скобок или других символов кроме текста и цифр",
            },
            {
              role: "user",
              content: weatherPrompt,
            },
          ],
          temperature: 0.7,
          // max_tokens: 500,
          stream: false,
        }),
      }
    );

    const data = await response.json();
    const text =
      data?.choices?.[0]?.message?.content || "Нет ответа от DeepSeek";
    return NextResponse.json(text);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка на сервере" }, { status: 500 });
  }
}
