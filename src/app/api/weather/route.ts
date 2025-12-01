import { NextRequest, NextResponse } from "next/server";

type DataWeather = {
  rain: Record<string, number>;
  snow: Record<string, number>;
  weather: {
    id: number;
    main: string;
    description: string;
  }[];
};

// Функция для преобразования Кельвинов в Цельсии
function kelvinToCelsius(kelvin: number): number {
  return Math.round(kelvin - 273.15);
}

// осадки

function getPrecipitationInfo(yData: DataWeather): string {
  const precipitation: string[] = [];

  // Проверяем дождь
  if (yData.rain) {
    if (yData.rain["1h"]) {
      precipitation.push(`🌧️ Дождь: ${yData.rain["1h"]} мм/час`);
    }
    if (yData.rain["3h"]) {
      precipitation.push(`🌧️ Дождь: ${yData.rain["3h"]} мм/3 часа`);
    }
  }

  // Проверяем снег
  if (yData.snow) {
    if (yData.snow["1h"]) {
      precipitation.push(`❄️ Снег: ${yData.snow["1h"]} мм/час`);
    }
    if (yData.snow["3h"]) {
      precipitation.push(`❄️ Снег: ${yData.snow["3h"]} мм/3 часа`);
    }
  }

  // Проверяем погодные условия
  const weatherCondition = yData.weather[0];
  if (weatherCondition) {
    const isPrecipitation =
      weatherCondition.main.includes("Rain") ||
      weatherCondition.main.includes("Snow") ||
      weatherCondition.main.includes("Drizzle");

    if (isPrecipitation && precipitation.length === 0) {
      precipitation.push(`🌦️ ${weatherCondition.description}`);
    }
  }

  return precipitation.length > 0 ? precipitation.join("\n") : "Без осадков";
}

// Функция для перевода давления из гПа в мм рт.ст.
function hPaToMmHg(hPa: number): number {
  return Math.round(hPa * 0.750062);
}

export async function POST(req: NextRequest) {
  try {
    const { lat, lon } = await req.json();

    if (!lat || !lon)
      return NextResponse.json(
        { error: "Не указаны координаты" },
        { status: 400 }
      );

    const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY!;

    const yUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;

    const yRes = await fetch(yUrl);

    if (!yRes.ok) throw new Error(`OPENWEATHER API ошибка: ${yRes.status}`);
    const yData = await yRes.json();
    console.log(yData);
    const fact = yData.main || {};
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;
    console.log(formattedDate);

    const dateMoscow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const yearMoscow = dateMoscow.getUTCFullYear();
    const monthMoscow = String(dateMoscow.getUTCMonth() + 1).padStart(2, "0");
    const dayMoscow = String(dateMoscow.getUTCDate()).padStart(2, "0");

    const formattedDateMoscow = `${yearMoscow}-${monthMoscow}-${dayMoscow}`;

    const weatherPrompt = `
    Сделай красивый прогноз погоды на основе этих данных:
    Текущая погода: Облачность: ${yData.clouds.all}%
    Осадки: ${getPrecipitationInfo(yData)}
    🌡️ Температура: ${kelvinToCelsius(fact.temp)}°C
    💨 Ветер: ${yData.wind.speed} м/с
    💧 Влажность: ${fact.humidity}%
    📊 Давление: ${hPaToMmHg(fact.pressure)} мм рт.ст.
дата составления прогноза (не должна меняться): ${formattedDateMoscow}
    Оформи красиво, с эмодзи и кратко, чтобы это можно было вывести в компонент как текст.
    Добавь рекомендации для человека по нахождению на открытом воздухе.
    .
    `;
    const FREE_MODELS = [
      "tngtech/tng-r1t-chimera:free",
      "x-ai/grok-4.1-fast:free",
      "kwaipilot/kat-coder-pro:free",
      "nvidia/nemotron-nano-12b-v2-vl:free",
      "alibaba/tongyi-deepresearch-30b-a3b:free",
      "meituan/longcat-flash-chat:free",
    ];
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    async function getMessageAI(model: string) {
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
            model: model,
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

      if (response.status === 429) {
        const indexModel = FREE_MODELS.findIndex((item) => item === model);
        if (indexModel === FREE_MODELS.length - 1) {
          return response;
        } else {
          return getMessageAI(FREE_MODELS[indexModel + 1]);
        }
      }

      return response;
    }
    const response = await getMessageAI(FREE_MODELS[0]);

    const data = await response.json();
    console.log(data, data?.choices?.[0]?.message?.content);
    const text =
      data?.choices?.[0]?.message?.content ||
      "Сервер временно не доступен, попробуйте повторить позднее";
    return NextResponse.json(text);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка на сервере" }, { status: 500 });
  }
}
