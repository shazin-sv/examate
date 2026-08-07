const API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';

const SYSTEM_PROMPT = `You are OnamStudyAI, a friendly study assistant for a Kerala State Board Plus Two (Class 12) student preparing for Onam Exam 2026.

Subjects: Physics, Chemistry, Maths, Computer Science, English, Hindi.

Key facts:
- Exam starts August 14, 2026
- Use 1-4-7 spaced repetition: study a chapter, revise on day +1, +4, and +7
- Be concise, encouraging, and exam-focused
- Give chapter summaries, key formulas, mnemonics, and study tips
- If asked about a specific chapter, give the most important points to memorize
- Use simple language, avoid overly long responses
- Format responses with bullet points and clear structure`;

export async function chat(messages) {
  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log('API Error:', err);
      return `Sorry, I hit an error (${res.status}). Try again.`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response received.';
  } catch (e) {
    console.log('Chat error:', e);
    return 'Network error. Check your connection and try again.';
  }
}
