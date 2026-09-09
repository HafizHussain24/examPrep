export const extractJsonFromText = (text: string): string => {
  // Sometimes Gemini wraps JSON in ```json ... ``` or just ``` ... ```
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  
  return cleanText.trim();
};

export const callGeminiAPI = async (prompt: string, imageBase64?: string, isJson: boolean = true) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key is not set. Please check your .env file.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: prompt }];

  if (imageBase64) {
    // Expecting imageBase64 to be in format "data:image/jpeg;base64,..."
    const [header, base64Data] = imageBase64.split(',');
    const mimeType = header.split(':')[1].split(';')[0];
    
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    });
  }

  const payload = {
    contents: [
      {
        parts: parts
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textResponse = candidate?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Invalid response format from Gemini API.");
    }

    if (isJson) {
      const jsonText = extractJsonFromText(textResponse);
      return JSON.parse(jsonText);
    }

    return textResponse;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
