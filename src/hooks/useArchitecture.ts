'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createElement } from 'react';
import type {
  Architecture,
  Organisation,
  System,
  OrgFunction,
  Service,
  DataCategory,
  Integration,
  Owner,
  MappingPath,
} from '@/lib/types';
import type { LoadReport, StorageAdapter } from '@/lib/storage/adapter';
import { LocalStorageAdapter } from '@/lib/storage/local';
import {
  StorageStatusProvider,
  type SaveState,
  type StorageStatus,
} from '@/hooks/useStorageStatus';
import { SCHEMA_VERSION, STACKMAP_VERSION } from '@/lib/version';
import { v4 as uuidv4 } from 'uuid';

/** How long to wait after the last change before writing to storage. */
const SAVE_DEBOUNCE_MS = 500;

function describeSaveError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);

  if (name === 'QuotaExceededError' || /quota/i.test(message)) {
    return 'There is no room left in this browser’s storage, so your map could not be saved.';
  }
  return 'Your map could not be saved in this browser.';
}

// ─── Context value shape ───

export interface ArchitectureContextValue {
  architecture: Architecture | null;
  isLoading: boolean;

  // Organisation
  updateOrganisation: (org: Partial<Organisation>) => void;

  // Functions
  addFunction: (fn: Omit<OrgFunction, 'id'>) => string;
  updateFunction: (id: string, updates: Partial<Omit<OrgFunction, 'id'>>) => void;
  removeFunction: (id: string) => void;

  // Services
  addService: (svc: Omit<Service, 'id'>) => string;
  updateService: (id: string, updates: Partial<Omit<Service, 'id'>>) => void;
  removeService: (id: string) => void;

  // Systems
  addSystem: (system: Omit<System, 'id'>) => string;
  updateSystem: (id: string, updates: Partial<Omit<System, 'id'>>) => void;
  removeSystem: (id: string) => void;

  // Data categories
  addDataCategory: (dc: Omit<DataCategory, 'id'>) => string;
  removeDataCategory: (id: string) => void;

  // Integrations
  addIntegration: (intg: Omit<Integration, 'id'>) => string;
  removeIntegration: (id: string) => void;

  // Owners
  addOwner: (owner: Omit<Owner, 'id'>) => string;
  removeOwner: (id: string) => void;

  // Bulk replace
  replaceArchitecture: (arch: Architecture) => void;

  // Metadata
  setTechFreedomEnabled: (enabled: boolean) => void;

  // Persistence
  save: () => Promise<void>;
  clear: () => Promise<void>;
  getArchitecture: () => Architecture | null;
}

const ArchitectureContext = createContext<ArchitectureContextValue | null>(null);

// ─── Helper: create a blank Architecture ───

function createBlankArchitecture(mappingPath: MappingPath = 'function_first'): Architecture {
  const now = new Date().toISOString();
  return {
    organisation: {
      id: uuidv4(),
      name: '',
      type: 'charity',
      createdAt: now,
      updatedAt: now,
    },
    functions: [],
    services: [],
    systems: [],
    dataCategories: [],
    integrations: [],
    owners: [],
    metadata: {
      version: SCHEMA_VERSION,
      exportedAt: now,
      stackmapVersion: STACKMAP_VERSION,
      mappingPath,
      techFreedomEnabled: false,
    },
  };
}

// ─── Provider props ───

export interface ArchitectureProviderProps {
  children: ReactNode;
  adapter?: StorageAdapter;
  mappingPath?: MappingPath;
}

// ─── Provider component ───

export function ArchitectureProvider({
  children,
  adapter,
  mappingPath = 'function_first',
}: ArchitectureProviderProps) {
  // The adapter owns a storage handle, so it must survive re-renders.
  const [storageAdapter] = useState<StorageAdapter>(
    () => adapter ?? new LocalStorageAdapter(),
  );
  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadReport, setLoadReport] = useState<LoadReport | null>(null);

  // Load from storage on mount
  useEffect(() => {
    let cancelled = false;
    storageAdapter.load().then((loaded) => {
      if (cancelled) return;
      setArchitecture(loaded ?? createBlankArchitecture(mappingPath));
      const report = storageAdapter.getLastLoadReport?.() ?? null;
      // Only worth reporting when something was actually lost
      if (report && (report.backedUp || report.droppedCount > 0)) {
        setLoadReport(report);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save to storage whenever architecture changes.
  //
  // Debounced because edits arrive keystroke-by-keystroke and each write
  // serialises the whole document. Failures are surfaced rather than swallowed:
  // a full quota means the user is one tab-close away from losing their work
  // and needs to be told to export.
  const persist = useCallback(
    async (arch: Architecture) => {
      try {
        await storageAdapter.save(arch);
        setSaveState('saved');
        setSaveError(null);
      } catch (error) {
        setSaveState('error');
        setSaveError(describeSaveError(error));
      }
    },
    [storageAdapter],
  );

  const pendingSaveRef = useRef<Architecture | null>(null);

  useEffect(() => {
    if (isLoading || !architecture) return;

    pendingSaveRef.current = architecture;
    const timer = setTimeout(() => {
      pendingSaveRef.current = null;
      void persist(architecture);
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [architecture, isLoading, persist]);

  const flushPendingSave = useCallback(() => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    void storageAdapter.save(pending).catch(() => {
      // Nothing can be shown at this point — the page or tree is going away.
    });
  }, [storageAdapter]);

  // Never leave a debounced change unwritten when the provider goes away.
  useEffect(() => flushPendingSave, [flushPendingSave]);

  // A reload or a closed tab does not unmount the tree, so the debounce has to
  // be flushed against the page going away as well. pagehide and a hidden
  // document are the two signals that fire reliably, including on mobile.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushPendingSave();
    }

    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushPendingSave]);

  // Generic updater that bumps organisation.updatedAt
  const updateArch = useCallback(
    (updater: (prev: Architecture) => Architecture) => {
      setArchitecture((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        return {
          ...next,
          organisation: {
            ...next.organisation,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },
    [],
  );

  // ─── Organisation ───

  const updateOrganisation = useCallback(
    (org: Partial<Organisation>) => {
      updateArch((prev) => ({
        ...prev,
        organisation: { ...prev.organisation, ...org },
      }));
    },
    [updateArch],
  );

  // ─── Functions ───

  const addFunction = useCallback(
    (fn: Omit<OrgFunction, 'id'>): string => {
      const id = uuidv4();
      updateArch((prev) => ({
        ...prev,
        functions: [...prev.functions, { ...fn, id }],
      }));
      return id;
    },
    [updateArch],
  );

  const updateFunction = useCallback(
    (id: string, updates: Partial<Omit<OrgFunction, 'id'>>) => {
      updateArch((prev) => ({
        ...prev,
        functions: prev.functions.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      }));
    },
    [updateArch],
  );

  const removeFunction = useCallback(
    (id: string) => {
      updateArch((prev) => ({
        ...prev,
        functions: prev.functions.filter((f) => f.id !== id),
      }));
    },
    [updateArch],
  );

  // ─── Services ───

  const addService = useCallback(
    (svc: Omit<Service, 'id'>): string => {
      const id = uuidv4();
      updateArch((prev) => ({
        ...prev,
        services: [...prev.services, { ...svc, id }],
      }));
      return id;
    },
    [updateArch],
  );

  const updateService = useCallback(
    (id: string, updates: Partial<Omit<Service, 'id'>>) => {
      updateArch((prev) => ({
        ...prev,
        services: prev.services.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
    },
    [updateArch],
  );

  const removeService = useCallback(
    (id: string) => {
      updateArch((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s.id !== id),
      }));
    },
    [updateArch],
  );

  // ─── Systems ───

  const addSystem = useCallback(
    (system: Omit<System, 'id'>): string => {
      const id = uuidv4();
      updateArch((prev) => ({
        ...prev,
        systems: [...prev.systems, { ...system, id }],
      }));
      return id;
    },
    [updateArch],
  );

  const updateSystem = useCallback(
    (id: string, updates: Partial<Omit<System, 'id'>>) => {
      updateArch((prev) => ({
        ...prev,
        systems: prev.systems.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
    },
    [updateArch],
  );

  const removeSystem = useCallback(
    (id: string) => {
      updateArch((prev) => ({
        ...prev,
        systems: prev.systems.filter((s) => s.id !== id),
      }));
    },
    [updateArch],
  );

  // ─── Data Categories ───

  const addDataCategory = useCallback(
    (dc: Omit<DataCategory, 'id'>): string => {
      const id = uuidv4();
      updateArch((prev) => ({
        ...prev,
        dataCategories: [...prev.dataCategories, { ...dc, id }],
      }));
      return id;
    },
    [updateArch],
  );

  const removeDataCategory = useCallback(
    (id: string) => {
      updateArch((prev) => ({
        ...prev,
        dataCategories: prev.dataCategories.filter((dc) => dc.id !== id),
      }));
    },
    [updateArch],
  );

  // ─── Integrations ───

  const addIntegration = useCallback(
    (intg: Omit<Integration, 'id'>): string => {
      const id = uuidv4();
      updateArch((prev) => ({
        ...prev,
        integrations: [...prev.integrations, { ...intg, id }],
      }));
      return id;
    },
    [updateArch],
  );

  const removeIntegration = useCallback(
    (id: string) => {
      updateArch((prev) => ({
        ...prev,
        integrations: prev.integrations.filter((i) => i.id !== id),
      }));
    },
    [updateArch],
  );

  // ─── Owners ───

  const addOwner = useCallback(
    (owner: Omit<Owner, 'id'>): string => {
      const id = uuidv4();
      updateArch((prev) => ({
        ...prev,
        owners: [...prev.owners, { ...owner, id }],
      }));
      return id;
    },
    [updateArch],
  );

  const removeOwner = useCallback(
    (id: string) => {
      updateArch((prev) => ({
        ...prev,
        owners: prev.owners.filter((o) => o.id !== id),
      }));
    },
    [updateArch],
  );

  // ─── Bulk replace ───

  const replaceArchitecture = useCallback((arch: Architecture) => {
    setArchitecture(arch);
  }, []);

  // ─── Metadata ───

  const setTechFreedomEnabled = useCallback(
    (enabled: boolean) => {
      updateArch((prev) => ({
        ...prev,
        metadata: { ...prev.metadata, techFreedomEnabled: enabled },
      }));
    },
    [updateArch],
  );

  // ─── Persistence ───

  const save = useCallback(async () => {
    if (architecture) {
      pendingSaveRef.current = null;
      await persist(architecture);
    }
  }, [architecture, persist]);

  const clear = useCallback(async () => {
    pendingSaveRef.current = null;
    await storageAdapter.clear();
    setArchitecture(createBlankArchitecture(mappingPath));
    setLoadReport(null);
    setSaveState('idle');
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageAdapter]);

  const getArchitecture = useCallback(() => architecture, [architecture]);

  const value: ArchitectureContextValue = {
    architecture,
    isLoading,
    updateOrganisation,
    addFunction,
    updateFunction,
    removeFunction,
    addService,
    updateService,
    removeService,
    addSystem,
    updateSystem,
    removeSystem,
    addDataCategory,
    removeDataCategory,
    addIntegration,
    removeIntegration,
    addOwner,
    removeOwner,
    replaceArchitecture,
    setTechFreedomEnabled,
    save,
    clear,
    getArchitecture,
  };

  const storageStatus: StorageStatus = useMemo(
    () => ({ saveState, saveError, loadReport }),
    [saveState, saveError, loadReport],
  );

  return createElement(
    ArchitectureContext.Provider,
    { value },
    createElement(StorageStatusProvider, { value: storageStatus }, children),
  );
}

// ─── Hook ───

export function useArchitecture(): ArchitectureContextValue {
  const context = useContext(ArchitectureContext);
  if (!context) {
    throw new Error('useArchitecture must be used within an ArchitectureProvider');
  }
  return context;
}
