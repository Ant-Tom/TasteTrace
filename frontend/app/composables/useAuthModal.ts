export type AuthMode = "login" | "register";

export function useAuthModal() {
  const state = useState("auth-modal", () => ({ open: false, mode: "login" as AuthMode }));

  function open(mode: AuthMode = "login") {
    state.value = { open: true, mode };
  }

  function close() {
    state.value = { ...state.value, open: false };
  }

  return { state, open, close };
}
