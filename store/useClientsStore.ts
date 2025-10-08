import { create } from "zustand";
import { Client } from "@/lib/types";

interface ClientsState {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],
  setClients: (clients) => set({ clients }),
  addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
  updateClient: (id, updatedClient) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? { ...c, ...updatedClient } : c)),
    })),
  deleteClient: (id) =>
    set((state) => ({
      clients: state.clients.filter((c) => c.id !== id),
    })),
  selectedClientId: null,
  setSelectedClientId: (id) => set({ selectedClientId: id }),
}));

