import WeatherWidget from "./WeatherWidget";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center  font-sans">
      <main className="flex min-h-screen w-full flex-col items-center justify-between py-32  sm:items-start">
        <WeatherWidget />
      </main>
    </div>
  );
}
