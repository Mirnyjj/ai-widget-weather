"use client";

import {
  useActionState,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { weatherAction } from "./weatherAction";

const initialState = {
  text: "",
  error: "",
};

type Item = {
  name: string;
  country: string;
  admin1: string;
};

export default function WeatherWidget() {
  const [state, formAction, isPending] = useActionState(
    weatherAction,
    initialState
  );

  const [city, setCity] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    lat: string;
    lon: string;
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textRef = useRef("");

  // Получение подсказок городов
  const fetchCitySuggestions = async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      // Используем Open-Meteo API для подсказок
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          input
        )}&count=5&language=ru`
      );

      const data = await response.json();
      if (data.results) {
        const cities = data.results.map(
          (item: Item) =>
            `${item.name}${item.admin1 ? `, ${item.admin1}` : ""}${
              item.country ? `, ${item.country}` : ""
            }`
        );
        setSuggestions(cities);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Ошибка получения подсказок:", error);
    }
  };

  // Получение координат для выбранного города
  const fetchCoordinatesForCity = async (selectedCity: string) => {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          selectedCity
        )}&count=1&language=ru`
      );

      const data = await response.json();
      if (data.results?.[0]) {
        setCoordinates({
          lat: data.results[0].latitude.toString(),
          lon: data.results[0].longitude.toString(),
        });
        setCity(selectedCity);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Ошибка получения координат:", error);
    }
  };

  // Обработчик изменения города
  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCity(value);
    fetchCitySuggestions(value);
  };

  // Выбор города из подсказок
  const handleSuggestionClick = (suggestion: string) => {
    fetchCoordinatesForCity(suggestion.split(",")[0]); // Берем только название города
  };

  const typeText = useCallback((text: string) => {
    setDisplayedText(" ");
    setIsTyping(true);

    let index = 0;
    const intervalId = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(intervalId);
        setIsTyping(false);
      }
    }, 20);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (state.text && state.text !== textRef.current) {
      textRef.current = state.text;
      const cleanup = typeText(" " + state.text);
      return cleanup;
    }
  }, [state.text, typeText]);

  // Закрытие подсказок при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="mx-auto mt-8 p-6 bg-emerald-100 rounded-xl shadow-md font-sans max-w-md"
      ref={wrapperRef}
    >
      <h2 className="text-center text-2xl font-semibold mb-4">🌤️ AI Weather</h2>

      <div className="relative mb-3">
        <input
          type="text"
          value={city}
          onChange={handleCityChange}
          placeholder="Введите название города..."
          className="w-full p-3 rounded-md border bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <span className="text-gray-700">{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {coordinates && (
        <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-gray-600">
          📍 Выбрано: {city} ({coordinates.lat}, {coordinates.lon})
        </div>
      )}

      <form className="flex flex-col gap-3" action={formAction}>
        {/* Скрытые поля для координат */}
        <input type="hidden" name="lat" value={coordinates?.lat || ""} />
        <input type="hidden" name="lon" value={coordinates?.lon || ""} />

        <button
          type="submit"
          disabled={isPending || !coordinates}
          className="bg-blue-500 text-white font-medium py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
        >
          {isPending ? "⌛ Генерирую..." : "Получить прогноз"}
        </button>
      </form>

      {state.error && (
        <p className="text-red-500 mt-3 text-center">{state.error}</p>
      )}

      {state.text && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md relative">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            Прогноз погоды:
            {isTyping && (
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse"></span>
            )}
          </h3>
          <pre className="whitespace-pre-wrap text-gray-800 text-sm">
            {displayedText}
          </pre>
        </div>
      )}
    </div>
  );
}
