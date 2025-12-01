type FormState = {
  text?: string;
  error?: string;
};

export const weatherAction = async (
  prevState: FormState,
  formData: FormData
): Promise<FormState> => {
  const lat = formData.get("lat") as string;
  const lon = formData.get("lon") as string;

  if (!lat || !lon) return { error: "Введите координаты" };

  try {
    const res = await fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon }),
    });
    const data = await res.json();

    if (data.error) return { error: data.error };
    console.log(data, "_____________________________________________");
    return { text: data as string };
    // return { text: data.text as string };
  } catch (e) {
    console.error(e);
    return { error: "Ошибка при получении прогноза" };
  }
};
