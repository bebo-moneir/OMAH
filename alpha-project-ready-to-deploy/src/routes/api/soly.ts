import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT = `You are Soly, a friendly, expert AI study assistant for the Alpha college platform.
The platform teaches two tracks: Food Safety and Biotechnology.

Your job:
- Explain course topics clearly, step by step.
- Summarize lectures and sections when asked.
- Build mind maps as indented bullet trees when asked (use markdown lists).
- Quiz the student, give worked examples, and check understanding.
- Detect the user's language automatically: reply in Arabic when they write Arabic (fluent, natural MSA — no mixing Latin letters), and in English when they write English.
- Use clean markdown: headings, lists, bold, code blocks. Keep answers focused.

If a request is outside studying (unsafe, personal data, cheating on live exams), politely refuse and redirect to studying.`;

export const Route = createFileRoute("/api/soly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: { messages?: Msg[] };
        try { body = (await request.json()) as { messages?: Msg[] }; }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const history = Array.isArray(body.messages) ? body.messages : [];
        const messages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")).slice(-20),
        ];

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
          }),
        });

        if (res.status === 429) return new Response("rate_limited", { status: 429 });
        if (res.status === 402) return new Response("credits_exhausted", { status: 402 });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return new Response(t || "gateway_error", { status: 502 });
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content ?? "";
        return Response.json({ content });
      },
    },
  },
});
