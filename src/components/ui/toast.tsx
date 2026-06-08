type ToastProps = {
  id?: string | number | null;
  message?: string | null;
  tone?: "success" | "error";
};

export function Toast({ id, message, tone = "success" }: ToastProps) {
  if (!id || !message) return null;

  return (
    <div
      key={id}
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-auto fixed bottom-5 left-1/2 z-50 w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg",
        "animate-[toast-life_3.5s_ease_forwards] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]",
        tone === "success"
          ? "border-green-200 bg-green-50 text-green-900"
          : "border-[#ffb4b4] bg-[#ffefef] text-[#7b2f2f]",
      ].join(" ")}
    >
      {message}
    </div>
  );
}
