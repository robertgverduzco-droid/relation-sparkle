import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("multipart/form-data")) {
          return new Response("Expected multipart/form-data", { status: 400 });
        }

        const inbound = await request.formData();
        const file = inbound.get("file");
        if (!(file instanceof Blob) || file.size < 512) {
          return new Response("Empty or missing audio", { status: 400 });
        }

        const upstream = new FormData();
        // Name the upload for its real container. Browsers record webm (Chrome/FF)
        // or mp4 (Safari); guess from the blob mime.
        const mime = file.type.split(";")[0];
        const ext =
          mime === "audio/mp4" || mime === "audio/x-m4a"
            ? "m4a"
            : mime === "audio/mpeg"
              ? "mp3"
              : mime === "audio/wav" || mime === "audio/x-wav"
                ? "wav"
                : mime === "audio/ogg"
                  ? "ogg"
                  : "webm";
        upstream.append("file", file, `recording.${ext}`);
        upstream.append("model", "openai/gpt-4o-transcribe");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Lovable-API-Key": key },
          body: upstream,
        });

        if (!res.ok) {
          const err = await res.text().catch(() => "");
          return new Response(err || "Transcription failed", { status: res.status });
        }
        const body = await res.json().catch(() => ({}));
        return Response.json({ text: (body as { text?: string }).text ?? "" });
      },
    },
  },
});
