import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EstablishmentList } from "@/components/EstablishmentList";
import { EstablishmentPanel } from "@/components/EstablishmentPanel";
import { Header } from "@/components/Header";
import { MapView } from "@/components/MapView";
import { AuthModal } from "@/features/auth/AuthModal";
import { fetchEstablishments } from "@/lib/api";
import { useEstablishmentFilters } from "@/hooks/useEstablishmentFilters";

function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["establishments"],
    queryFn: fetchEstablishments
  });

  const {
    query,
    setQuery,
    cuisine,
    setCuisine,
    selectedId,
    setSelectedId,
    cuisines,
    filtered
  } = useEstablishmentFilters(data);

  const selectedEstablishment = useMemo(
    () => data.find((item) => item.id === selectedId) ?? null,
    [data, selectedId]
  );

  function openAuth(mode: "login" | "register") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface md:flex-row">
      <div className="relative order-1 h-[50vh] min-h-[280px] min-w-0 flex-1 md:order-2 md:h-full">
        <MapView items={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        <Header
          totalCount={data.length}
          visibleCount={filtered.length}
          onLogin={() => openAuth("login")}
          onRegister={() => openAuth("register")}
        />
        <EstablishmentPanel
          establishment={selectedEstablishment}
          onClose={() => setSelectedId(null)}
          onNeedAuth={() => openAuth("login")}
        />
      </div>

      <div className="relative z-10 order-2 h-[50vh] min-h-0 w-full shrink-0 md:order-1 md:h-full md:w-[min(420px,38vw)] md:max-w-md">
        <div className="absolute -top-3 left-0 right-0 z-10 flex justify-center md:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-600" aria-hidden />
        </div>
        <EstablishmentList
          items={filtered}
          allItems={data}
          query={query}
          onQueryChange={setQuery}
          cuisine={cuisine}
          onCuisineChange={setCuisine}
          cuisines={cuisines}
          selectedId={selectedId}
          onSelect={setSelectedId}
          isLoading={isLoading}
          isError={isError}
        />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  );
}

export default App;
