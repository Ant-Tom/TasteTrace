import { useAuthStore } from "@/store/authStore";

type HeaderProps = {
  totalCount: number;
  visibleCount: number;
  onLogin: () => void;
  onRegister: () => void;
};

export function Header({ totalCount, visibleCount, onLogin, onRegister }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-4 md:p-5">
      <div className="glass-panel pointer-events-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 md:px-6">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-white md:text-xl">
            Taste<span className="text-accent-cyan">Trace</span>
          </p>
          <p className="text-xs text-slate-400 md:text-sm">Гастрокарта Казани</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500">Заведений</p>
            <p className="font-display text-sm font-semibold text-white">
              <span className="text-accent-cyan">{visibleCount}</span>
              <span className="text-slate-500"> / {totalCount}</span>
            </p>
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-slate-300 sm:inline">{user.displayName}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Выйти
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onLogin}
                className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Вход
              </button>
              <button
                type="button"
                onClick={onRegister}
                className="rounded-lg bg-accent-cyan/20 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/30"
              >
                Регистрация
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
