import { FormEvent, useState } from "react";
import { login, register } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
};

export function AuthModal({ open, onClose, initialMode = "login" }: AuthModalProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response =
        mode === "login"
          ? await login({ email, password })
          : await register({ email, password, displayName, website });
      setAuth(response.accessToken, response.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            {mode === "login" ? "Вход" : "Регистрация"}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          {mode === "register" && (
            <input
              className="w-full rounded-xl border border-border-subtle bg-surface-raised/80 px-3 py-2 text-sm text-white outline-none focus:border-accent-cyan/50"
              placeholder="Имя"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
            />
          )}
          <input
            type="email"
            className="w-full rounded-xl border border-border-subtle bg-surface-raised/80 px-3 py-2 text-sm text-white outline-none focus:border-accent-cyan/50"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-xl border border-border-subtle bg-surface-raised/80 px-3 py-2 text-sm text-white outline-none focus:border-accent-cyan/50"
            placeholder="Пароль (мин. 8 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            aria-hidden
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full rounded-xl py-2.5 text-sm font-semibold transition",
              "bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 disabled:opacity-50"
            )}
          >
            {loading ? "..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          {mode === "login" ? (
            <>
              Нет аккаунта?{" "}
              <button type="button" className="text-accent-cyan" onClick={() => setMode("register")}>
                Регистрация
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?{" "}
              <button type="button" className="text-accent-cyan" onClick={() => setMode("login")}>
                Войти
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
