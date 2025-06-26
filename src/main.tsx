import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    PWA_CURRENT_APP_VERSION?: string;
  }
}

// Type definitions
interface Chore {
  id: string;
  name: string;
  icon: string;
  cycleDuration: number;        // Duration in hours
  points: number;              // Points awarded for completion
  lastCompleted?: number;       // Timestamp of last completion
  lastTender?: string | null;   // ID of the last tender
  history?: { tender: string; timestamp: number }[]; // Optional history directly on the chore
  dueDate?: number;            // Calculated due date timestamp
}

interface Tender {
  id: string;
  name: string;
  // Note: icon and points are now part of the leaderboard data, not the base tender object.
  icon?: string;
  points?: number;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  chore: string;
  tender: string;
  notes: string | null;
  points: number;
}

interface ChoreConfig {
  defaultCycleDuration: number;  // Default 24 hours
  defaultPoints: number;         // Default points per chore (10)
  warningThreshold: number;      // When to show yellow (75%)
  dangerThreshold: number;       // When to show red (90%)
  pointCycle?: number; // Optional as it might not be used everywhere
}

interface CountdownState {
  progress: number;              // 0-1 (0 = just done, 1 = overdue)
  status: 'good' | 'warning' | 'urgent' | 'overdue';
  timeRemaining: number;         // Hours remaining
}

interface TenderScore {
  tenderId: string;
  name: string;
  totalPoints: number;
  completionCount: number;
  lastActivity: number;         // Timestamp of last completion
}

interface LeaderboardEntry {
  tender: Tender;
  score: TenderScore;
  rank: number;
  recentCompletions: HistoryEntry[];  // Last 5 completions
}

// --- New Type for Outlet Context ---
interface PwaUpdateContextType {
  updateAvailable: boolean;
  onUpdate: () => void;
  currentClientVersion: string | null;
}
// --- End New Type ---

// --- Sync ID Management ---
const LOCAL_STORAGE_SYNC_ID_KEY = "kinobi_sync_id_valtown";

function sanitizeSyncId(id: string | null): string | null {
  if (!id) return null;
  const parts = id.split('/');
  return parts[parts.length - 1];
}

function generateNewSyncIdInternal() {
  return `sync_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;
}

function getSyncIdFromLocalStorage() {
  if (typeof localStorage !== "undefined") {
    const rawId = localStorage.getItem(LOCAL_STORAGE_SYNC_ID_KEY);
    return sanitizeSyncId(rawId); // Sanitize the data on read
  }
  return null;
}

function setSyncIdInLocalStorage(syncId: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_SYNC_ID_KEY, syncId);
  }
}
// --- End Sync ID Management ---

// --- New Component: RootRedirector ---
// Handles the initial load at the root path "/"
function RootRedirector() {
  const navigate = useNavigate();

  useEffect(() => {
    let syncId = getSyncIdFromLocalStorage();
    if (!syncId) {
      syncId = generateNewSyncIdInternal();
      setSyncIdInLocalStorage(syncId);
    }
    // Redirect to the appropriate syncId-based URL
    navigate(`/${syncId}`, { replace: true });
  }, [navigate]);

  // Render a loading state while redirecting
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 items-center justify-center text-2xl">
      {"Initializing Kinobi..."}
    </div>
  );
}
// --- End New Component ---

// Context for Sync ID
const SyncIdContext = createContext<string | null>(null);

function useSyncId() {
  return useContext(SyncIdContext);
}

// --- New Component: KinobiLayout ---
// This component replaces the old App component's layout responsibilities.
// It handles the main UI shell, context providing, and PWA updates.
function KinobiLayout() {
  const { syncId } = useParams<{ syncId: string }>();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentClientVersion, setCurrentClientVersion] = useState<string | null>(null);
  const refreshingRef = React.useRef(false);

  // Effect for PWA updates and service worker management
  useEffect(() => {
    if (typeof window !== "undefined" && window.PWA_CURRENT_APP_VERSION) {
      setCurrentClientVersion(window.PWA_CURRENT_APP_VERSION);
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        if (registration.waiting) setUpdateAvailable(true);
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && registration.waiting) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      })
      .catch(error => console.error('Service Worker registration failed:', error));

    const controllerChangeHandler = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChangeHandler);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChangeHandler);
    };
  }, []);

  const handleUpdate = () => {
    if (!("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.ready.then(registration => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    });
  };
  
  // Store the syncId from the URL in local storage for future visits
  useEffect(() => {
    if (syncId) {
      setSyncIdInLocalStorage(syncId);
    }
  }, [syncId]);

  // Safeguard against missing syncId
  if (!syncId) {
    return <Navigate to="/" replace />;
  }

  return (
    <SyncIdContext.Provider value={syncId}>
      <div className="flex flex-col h-screen bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100">
        <header className="relative bg-[#FAF9F6] p-4 shadow-md flex-shrink-0 flex items-center justify-between text-[#222]">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/${syncId}`)}> 
            <img src="/kinobi_alpha.gif" alt="Kinobi" className="w-16 h-16 kinobi-logo-float" />
            <span className="text-4xl font-bold tracking-tight select-none">Kinobi</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6 text-lg items-center">
            <Link to="history" className="hover:text-amber-700 transition-colors">History</Link>
            <Link to="leaderboard" className="hover:text-amber-700 transition-colors">Leaderboard</Link>
            <Link to="settings" className="hover:text-amber-700 transition-colors">Settings</Link>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-gray-800 focus:outline-none">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}></path>
              </svg>
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMenuOpen && (
            <nav className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg p-2 md:hidden z-10">
              <Link to="history" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-gray-800 hover:bg-amber-100 rounded">History</Link>
              <Link to="leaderboard" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-gray-800 hover:bg-amber-100 rounded">Leaderboard</Link>
              <Link to="settings" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-gray-800 hover:bg-amber-100 rounded">Settings</Link>
            </nav>
          )}
        </header>

        <main className="flex-grow overflow-auto bg-[#FAF9F6] text-[#222]">
           {/* Nested routes will be rendered here */}
           <Outlet context={{ updateAvailable, onUpdate: handleUpdate, currentClientVersion }} />
        </main>

        <footer className="bg-[#FAF9F6] p-4 text-center text-[#222] flex-shrink-0 border-t border-amber-100">
          <span className="text-lg">made with 🖤 at The Life House</span>
        </footer>
      </div>
    </SyncIdContext.Provider>
  );
}
// --- End New Component ---

// Main App Component (Now removed and replaced by the new structure)
/*
function App() { ... } // The old App component is deleted
*/

// +++ START NEW COMPONENT +++
// Simple status component for debugging deployment
function StatusView() {
  const syncId = useSyncId();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Status</h1>
      <p>Current Sync ID: {syncId}</p>
      <p>This is a placeholder page for system status.</p>
    </div>
  );
}
// +++ END NEW COMPONENT +++

// Simple Error Boundary to catch rendering errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-8 text-center text-red-600 bg-red-50 h-full">
          <h1 className="text-2xl font-bold">Something went wrong.</h1>
          <p className="mt-4">There was a critical error in the application. Please try refreshing the page.</p>
          <pre className="mt-4 text-left bg-white p-4 rounded-md shadow-md text-sm text-gray-700 overflow-auto">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapped App with Router - This is now the main component that defines routes
function RoutedApp() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<RootRedirector />} />
          <Route path="/status" element={<StatusView />} />
          <Route path="/:syncId/*" element={<KinobiLayout />}>
            <Route index element={<KinobiView />} />
            <Route path="history" element={<HistoryView />} />
            <Route path="leaderboard" element={<LeaderboardView />} />
            <Route
              path="settings"
              element={
                <SyncSettingsViewRouter />
              }
            />
          </Route>
          {/* A better catch-all to redirect invalid paths to the root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

// A new helper component to pass context from the Outlet to SyncSettingsView
function SyncSettingsViewRouter() {
    const { updateAvailable, onUpdate, currentClientVersion } = useOutletContext<any>();
    return (
        <SyncSettingsView 
            updateAvailable={updateAvailable}
            onUpdate={onUpdate}
            currentClientVersion={currentClientVersion}
        />
    )
}

function KinobiView() {
  const syncId = useSyncId();
  const [chores, setChores] = useState<Chore[] | null>(null);
  const [config, setConfig] = useState<ChoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChoresAndConfig = useCallback(async () => {
    if (!syncId) {
      // Still waiting for syncId from parent.
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [choresResponse, configResponse] = await Promise.all([
        fetch(`/api/${syncId}/chores`, { cache: 'no-store' }),
        fetch(`/api/${syncId}/config`, { cache: 'no-store' }),
      ]);
      if (!choresResponse.ok) {
        const errorText = await choresResponse.text();
        throw new Error(`Failed to fetch chores: ${choresResponse.statusText} - ${errorText}`);
      }
      if (!configResponse.ok) {
        const errorText = await configResponse.text();
        throw new Error(`Failed to fetch config: ${configResponse.statusText} - ${errorText}`);
      }
      const choresData = await choresResponse.json();
      const configData = await configResponse.json();
      setChores(choresData);
      setConfig(configData);
    } catch (err: any) {
      setError(err.message);
      setChores([]);
    } finally {
      setIsLoading(false);
    }
  }, [syncId]);

  useEffect(() => {
    fetchChoresAndConfig();
  }, [fetchChoresAndConfig]);

  const handleTended = () => {
    fetchChoresAndConfig();
  };

  if (isLoading) {
    return <div className="p-8 text-center text-lg">Loading chores...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  if (!chores || !config) {
    return (
      <div className="p-8 text-center text-lg">
        No chores or configuration data loaded. You can add some in Settings.
      </div>
    );
  }

  if (chores.length === 0) {
    return (
      <div className="p-8 text-center text-lg">
        No chores found. Get started by adding some in Settings.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 p-8">
      {chores.map((chore, index) => (
        <ChoreTile
          key={chore.id}
          chore={chore}
          config={config!}
          onTended={handleTended}
          animationIndex={index}
        />
      ))}
    </div>
  );
}

function ChoreTile({ chore, config, onTended, animationIndex = 0 }: { chore: Chore; config: ChoreConfig; onTended: () => void; animationIndex?: number }) {
  const syncId = useSyncId();
  const [countdownState, setCountdownState] = useState<CountdownState | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // This effect recalculates the countdown state whenever the chore's completion date changes
    // or the configuration is updated. It also sets up a timer for live updates.
    if (!config) return;

    const updateCountdown = () => {
      setCountdownState(CountdownService.calculateCountdownState(chore, config));
    };

    updateCountdown(); // Initial calculation

    // Set up a timer to update the countdown every minute
    const interval = setInterval(updateCountdown, 60000);

    // Cleanup on unmount or when dependencies change
    return () => clearInterval(interval);
  }, [chore, config]);

  const handleTendingClick = () => {
    setShowModal(true);
  };

  if (!countdownState) {
    // Render a placeholder or a simple loading state until the countdown is calculated
    return (
      <div
        className="bg-white rounded-2xl shadow-lg p-4 flex flex-col items-center justify-center aspect-square transition-all duration-300"
        style={{ animationDelay: `${animationIndex * 50}ms` }}
      >
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const { status } = countdownState;
  const textColorClass = getTextColorClass();
  const animationClass = getAnimationClass();

  function getTimeSinceLastTending() {
    if (chore.lastCompleted === null || typeof chore.lastCompleted === "undefined") return "no tending logged";

    const now = Date.now();
    const diff = now - Number(chore.lastCompleted); // Ensure lastCompleted is a number
    if (isNaN(diff)) return "Loading..."; // Or handle error

    if (diff < 0) return "Just now (check clock?)"; // Future date

    // Calculate hours and days
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Show hours if less than 24 hours ago
    if (hours < 24) {
      if (hours === 0) return "less than an hour ago";
      if (hours === 1) return "1 hour ago";
      return `${hours} hours ago`;
    }

    // Show days for 1+ days
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function getTextColorClass() {
    if (chore.lastCompleted === null || typeof chore.lastCompleted === "undefined") return "text-amber-600";
    const days = Math.floor((Date.now() - Number(chore.lastCompleted)) / (1000 * 60 * 60 * 24));

    // Calculate opacity percentage based on days (30% to 100% over 4 days)
    const opacityPercent = Math.min(30 + (70 * days / 4), 100);

    // Convert opacity percentage to Tailwind opacity class (30, 40, 50, 60, 70, 80, 90, 100)
    const opacityClass = `opacity-${Math.ceil(opacityPercent / 10) * 10}`;

    return `text-amber-800 ${opacityClass}`;
  }

  function getAnimationClass() {
    // Cycle through the available animation classes - using more subtle chore animations
    const animationClasses = ['chore-float-1', 'chore-float-2', 'chore-float-3', 'chore-float-4', 'chore-float-5', 'chore-float-6'];
    return animationClasses[animationIndex % animationClasses.length];
  }

  return (
    <div className="text-center flex flex-col items-center w-56">
      {/* Progress Ring with Chore Icon */}
      <div className="mb-4 relative">
        {countdownState ? (
          <ProgressRing
            progress={Math.min(countdownState.progress, 1)} // Cap at 1 for visual consistency
            status={countdownState.status}
            size={140}
            strokeWidth={6}
          >
            <div
              className={`text-7xl cursor-pointer ${animationClass} flex items-center justify-center transition-transform duration-200 hover:scale-105`}
              onClick={handleTendingClick}
            >
              {chore.icon}
            </div>
          </ProgressRing>
        ) : (
          <div
            className={`text-7xl cursor-pointer ${animationClass} transition-transform duration-200 hover:scale-105 flex items-center justify-center`}
            onClick={handleTendingClick}
            style={{ width: 140, height: 140 }}
          >
            {chore.icon}
          </div>
        )}
      </div>

      {/* Chore Name */}
      <h3 className="text-2xl font-semibold text-amber-800 mb-3 h-16 flex items-center justify-center leading-tight">
        {chore.name}
      </h3>

      {/* Countdown Status and Time Display */}
      {countdownState && (
        <div className="mb-2">
          <TimeDisplay countdownState={countdownState} format="full" />
        </div>
      )}

      {/* Last Tended Info */}
      <div className={`text-sm ${textColorClass} leading-tight opacity-75`}>
        {chore.lastCompleted === null || typeof chore.lastCompleted === "undefined" 
          ? "no tending logged"
          : `Last: ${getTimeSinceLastTending()}${chore.lastTender ? ` by ${chore.lastTender}` : ""}`
        }
      </div>

      {/* Points indicator */}
      <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
        <span>⭐</span>
        <span>{chore.points} points</span>
        <span>•</span>
        <span>🔄 {chore.cycleDuration}h cycle</span>
      </div>
      {showModal && (
        <TenderSelectionModal
          chore={chore}
          onClose={() => {
            setShowModal(false);
          }}
          onTended={() => {
             if (onTended) onTended();
             setShowModal(false); // Close modal after tending
          }}
        />
      )}
    </div>
  );
}

function TenderSelectionModal({ chore, onClose, onTended }: { chore: Chore; onClose: () => void; onTended: () => void }) {
  const syncId = useSyncId();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [recentTenders, setRecentTenders] = useState<string[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [sortedTenders, setSortedTenders] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [newTenderName, setNewTenderName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  // Handle click outside modal to close
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  async function fetchTendersInternal() {
    if (!syncId) return;
    try {
      const response = await fetch(`/api/${syncId}/tenders`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTenders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tenders:", error);
      setTenders([]);
    }
  }

  async function fetchRecentTendersInternal() {
    if (!syncId) return;
    try {
      const response = await fetch(`/api/${syncId}/history`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      // Extract unique tender names from recent history
      const uniqueNames = Array.isArray(data)
        ? [...new Set(data.slice(0, 10).map((entry: any) => entry.person))]
        : [];

      setRecentTenders(uniqueNames);
    } catch (error) {
      console.error("Error fetching recent tenders:", error);
      setRecentTenders([]);
    }
  }

  // Create a sorted tender list with recent tenders first
  useEffect(() => {
    if (tenders.length === 0) return;

    // Create a map of recently used tenders for faster lookups
    const recentMap = new Map();
    recentTenders.forEach((name, index) => {
      recentMap.set(name, index);
    });

    // Sort tenders: recent ones first (in order of recency), then others alphabetically
    const sorted = [...tenders].sort((a: any, b: any) => {
      const aIsRecent = recentMap.has(a.name);
      const bIsRecent = recentMap.has(b.name);

      if (aIsRecent && bIsRecent) {
        // Both are recent, sort by recency (lower index = more recent)
        return recentMap.get(a.name) - recentMap.get(b.name);
      } else if (aIsRecent) {
        // Only a is recent, it comes first
        return -1;
      } else if (bIsRecent) {
        // Only b is recent, it comes first
        return 1;
      } else {
        // Neither is recent, sort alphabetically
        return a.name.localeCompare(b.name);
      }
    });

    setSortedTenders(sorted);
  }, [tenders, recentTenders]);

  useEffect(() => {
    fetchTendersInternal();
    fetchRecentTendersInternal();
  }, [syncId]);

  async function handleTending() {
    if (!syncId) {
      console.error("Missing syncId");
      return;
    }
    
    // Determine the tender ID, creating a new tender if necessary
    let tenderIdToLog: string | null = selectedTenderId;

    if (!tenderIdToLog && newTenderName.trim()) {
        const newTender = {
            id: `tender_${Date.now()}`,
            name: newTenderName.trim(),
            icon: '👤', // Default icon
            points: 0,
        };
        try {
            const createResponse = await fetch(`/api/${syncId}/tenders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTender),
            });
            if (!createResponse.ok) throw new Error('Failed to create new tender');
            const createdTender = await createResponse.json();
            tenderIdToLog = createdTender.id;
             // Optimistically add to local state to avoid re-fetch
            setTenders(prev => [...prev, createdTender]);
        } catch (error) {
            console.error('Error creating new tender:', error);
            return; // Stop if tender creation fails
        }
    }

    if (!tenderIdToLog) {
        console.error("No tender selected or provided.");
        return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`/api/${syncId}/tend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choreId: chore.id,
          tenderId: tenderIdToLog,
          notes: notes,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to record tending');
      }

      // Call the onTended callback to trigger a refresh
      if (onTended) {
        onTended();
      }
      onClose(); // Close the modal on success
    } catch (error) {
      console.error('Error tending chore:', error);
      // Optionally, show an error message to the user
    } finally {
        setIsAdding(false);
    }
}

  function selectTender(tenderId: string) {
    setSelectedTenderId(tenderId);
    setNewTenderName(""); // Clear the input field when selecting a tender
  }

  return (
    <div 
      className="fixed bg-black bg-opacity-50 z-50 overflow-y-auto"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-6 border-2 border-amber-200 shadow-xl"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90vw',
          maxWidth: '400px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-600 hover:text-amber-800 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors"
          disabled={isAdding}
          title="Close (Esc)"
        >
          ×
        </button>
        
        <h2 className="text-2xl mb-4 text-amber-800 font-bold pr-8">Who's logging {chore.name}?</h2>


        {/* Unified tenders list */}
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {sortedTenders.map((tender: any) => (
            <button
              key={tender.id}
              className={`w-full py-2 px-3 rounded text-left ${
                selectedTenderId === tender.id
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 hover:bg-amber-200 text-amber-800"
              } ${recentTenders.includes(tender.name) ? "border-l-4 border-amber-400" : ""}`}
              onClick={() => selectTender(tender.id)}
            >
              {tender.name}
              {recentTenders.includes(tender.name)
                && <span className="text-xs ml-2 opacity-70"></span>}
            </button>
          ))}

          {/* New tender input styled like an option */}
          <div
            className={`w-full py-2 px-3 rounded ${
              !selectedTenderId && newTenderName
                ? "bg-amber-500 text-white"
                : "bg-yellow-50 border border-dashed border-amber-300"
            }`}
          >
            <input
              type="text"
              value={newTenderName}
              onChange={(e) => {
                setNewTenderName(e.target.value);
                setSelectedTenderId(null); // Clear selection when typing
              }}
              placeholder="+ Add new tender"
              className={`w-full bg-transparent focus:outline-none ${
                !selectedTenderId && newTenderName
                  ? "text-white placeholder-amber-100"
                  : "text-amber-800 placeholder-amber-400"
              }`}
              disabled={isAdding}
            />
          </div>
        </div>

        {/* Notes section */}
        <div className="mb-4">
          <label htmlFor="tending-notes" className="block text-sm font-medium text-amber-700 mb-1">
            Any notes about the tending?
          </label>
          <textarea
            id="tending-notes"
            name="tending-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 min-h-[80px] bg-yellow-50"
            placeholder="What did you clean? Any issues found? How shitty was it? Everything is welcome."
          />
        </div>

        {/* Action buttons */}
        <button
          onClick={handleTending}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded mb-2 disabled:opacity-50 font-semibold"
          disabled={isAdding || (!selectedTenderId && !newTenderName.trim())}
        >
          Log Tending {chore.icon}
        </button>

        <button
          onClick={onClose}
          className="w-full bg-amber-200 hover:bg-amber-300 text-amber-800 py-2 rounded"
          disabled={isAdding}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function HistoryView() {
  const syncId = useSyncId();
  if (!syncId) return <div>Loading sync information...</div>;
  return (
    <div className="w-full max-w-2xl mx-auto">
      <ShitHistoryComponent />
    </div>
  );
}

function LeaderboardView() {
  const syncId = useSyncId();
  if (!syncId) return <div>Loading sync information...</div>;
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <LeaderboardComponent />
    </div>
  );
}

function LeaderboardComponent() {
  const syncId = useSyncId();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [processedData, setProcessedData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d'>('all');
  const [sortBy, setSortBy] = useState<'points' | 'completions' | 'average'>('points');
  const [error, setError] = useState<string | null>(null);
  const leaderboardRef = React.useRef<HTMLDivElement>(null);

  const fetchLeaderboardData = useCallback(async () => {
    if (!syncId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/${syncId}/leaderboard`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard data: ${response.statusText}`);
      }
      const data: LeaderboardEntry[] = await response.json();
      
      // Assign ranks on the client side after fetching
      const sortedByPoints = [...data].sort((a, b) => (b.score?.totalPoints || 0) - (a.score?.totalPoints || 0));
      const rankedData = sortedByPoints.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
      
      setLeaderboardData(rankedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [syncId]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Process data when filters or base data change
  useEffect(() => {
    if (!leaderboardData || leaderboardData.length === 0) {
      setProcessedData([]);
      return;
    }

    // Create a deep copy to ensure the original state is never mutated.
    const dataCopy = JSON.parse(JSON.stringify(leaderboardData));

    // 1. Filter the data based on the time period
    const filteredData = dataCopy.map((entry: LeaderboardEntry) => {
      if (filterPeriod === 'all') {
        return entry; // Use original entry data for "All Time"
      }

      // For filtered views, recalculate the score based on the filtered completions
      const score = entry.score;
      const recentCompletions = entry.recentCompletions || [];
      const cutoffTime = Date.now() - (filterPeriod === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
      
      const filteredCompletions = recentCompletions.filter((c: HistoryEntry) => c.timestamp > cutoffTime);
      
      const newScore = filteredCompletions.reduce((acc, completion) => {
        acc.totalPoints += completion.points || 0;
        if (completion.timestamp > acc.lastActivity) {
          acc.lastActivity = completion.timestamp;
        }
        return acc;
      }, { totalPoints: 0, lastActivity: 0 });

      // Return a new entry object with the recalculated score
      return {
        ...entry,
        score: {
          ...score,
          totalPoints: newScore.totalPoints,
          completionCount: filteredCompletions.length,
          lastActivity: newScore.lastActivity
        },
        recentCompletions: filteredCompletions
      };
    });

    // 2. Sort the filtered data using a non-mutating approach
    const sortedData = [...filteredData].sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      const scoreA = a.score || { totalPoints: 0, completionCount: 0 };
      const scoreB = b.score || { totalPoints: 0, completionCount: 0 };
      switch (sortBy) {
        case 'completions':
          return scoreB.completionCount - scoreA.completionCount;
        case 'average':
          const avgA = scoreA.completionCount > 0 ? scoreA.totalPoints / scoreA.completionCount : 0;
          const avgB = scoreB.completionCount > 0 ? scoreB.totalPoints / scoreB.completionCount : 0;
          return avgB - avgA;
        case 'points':
        default:
          return scoreB.totalPoints - scoreA.totalPoints;
      }
    });

    setProcessedData(sortedData);
  }, [leaderboardData, filterPeriod, sortBy]);

  // Scroll to top when data changes
  useEffect(() => {
    if (leaderboardRef.current) {
      leaderboardRef.current.scrollTop = 0;
    }
  }, [processedData]);

  if (isLoading) {
    return (
      <div className="text-2xl text-amber-700 text-center">
        Loading leaderboard...
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center">
        Error: {error}
      </div>
    );
  }

  return (
    <div ref={leaderboardRef} className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
      <h2 className="text-3xl font-bold text-amber-800 mb-6 text-center">🏆 Leaderboard</h2>
      
      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <div className="flex items-center gap-2">
          <label htmlFor="leaderboard-period" className="text-sm font-medium text-amber-700">Period:</label>
          <select 
            id="leaderboard-period"
            name="leaderboard-period"
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value as 'all' | '7d' | '30d')}
            className="border border-amber-300 rounded px-2 py-1 text-sm bg-yellow-50 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label htmlFor="leaderboard-sort" className="text-sm font-medium text-amber-700">Sort by:</label>
          <select 
            id="leaderboard-sort"
            name="leaderboard-sort"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'points' | 'completions' | 'average')}
            className="border border-amber-300 rounded px-2 py-1 text-sm bg-yellow-50 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="points">Total Points</option>
            <option value="completions">Completions</option>
            <option value="average">Points per Completion</option>
          </select>
        </div>
      </div>
      
      {processedData.length === 0 ? (
        <p className="text-amber-600 text-center">No scoring data available for the selected period. Complete some chores to get started!</p>
      ) : (
        <div className="space-y-4">
          {processedData.map((entry: LeaderboardEntry, index: number) => {
            const score = entry.score || { totalPoints: 0, completionCount: 0, lastActivity: 0 };
            const tender = entry.tender || { id: `unknown-${index}`, name: 'Unknown' };
            const recentCompletions = entry.recentCompletions || [];
            
            const pointsPerCompletion = score.completionCount > 0 ? 
              (score.totalPoints / score.completionCount).toFixed(1) : '0.0';
            
            return (
              <div 
                key={tender.id} 
                className={`bg-white rounded-lg p-4 shadow-md border-2 transition-all duration-200 hover:shadow-lg ${
                  index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50' :
                  index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100' :
                  index === 2 ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50' :
                  'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold flex items-center gap-2 ${
                      index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-gray-600' :
                      index === 2 ? 'text-orange-600' :
                      'text-amber-600'
                    }`}>
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-amber-800 flex items-center gap-2">
                        {tender.name}
                        {index < 3 && (
                          <span className="text-xs bg-amber-200 px-2 py-1 rounded-full">
                            Top Performer
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-amber-600">
                        <span>{score.completionCount} completions</span>
                        <span>•</span>
                        <span>{pointsPerCompletion} pts/completion</span>
                        {score.lastActivity > 0 &&
                          <>
                            <span>•</span>
                            <span>Last active {new Date(score.lastActivity).toLocaleDateString()}</span>
                          </>
                        }
                      </div>
                      
                      {/* Recent completions preview */}
                      {recentCompletions.length > 0 && (
                        <div className="mt-2 text-xs text-amber-500">
                          Recent: {recentCompletions.slice(0, 3).map((completion: HistoryEntry, i: number) => (
                            <span key={completion.id}>
                              {i > 0 && ', '}
                              {new Date(completion.timestamp).toLocaleDateString()}
                            </span>
                          ))}
                          {recentCompletions.length > 3 && ` +${recentCompletions.length - 3} more`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-700">{score.totalPoints}</div>
                    <div className="text-sm text-amber-600">points</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-6 text-center text-sm text-amber-600">
        <p>Points are awarded for completing chores. Keep up the great work! 🌟</p>
        <p className="mt-1 text-xs opacity-75">
          Use the filters above to view performance over different time periods
        </p>
      </div>
    </div>
  );
}

function ShitHistoryComponent() {
  const syncId = useSyncId();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExactTimes, setShowExactTimes] = useState<{ [key: string]: boolean }>({});

  const formatRelativeTime = (timestamp: number) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const toggleExactTime = (entryId: string) => {
    setShowExactTimes(prev => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const fetchDataInternal = useCallback(async () => {
    if (!syncId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/${syncId}/history`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }
      const data = await response.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [syncId]);

  useEffect(() => {
    fetchDataInternal();
  }, [fetchDataInternal]);

  async function handleDeleteHistoryEntry(entryId: string) {
    if (!syncId) return;
    // Optimistic deletion
    const originalHistory = history;
    setHistory(history.filter(entry => entry.id !== entryId));

    try {
      const response = await fetch(`/api/${syncId}/history/${entryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        // Revert on failure
        setHistory(originalHistory);
        throw new Error('Failed to delete history entry');
      }
    } catch (err: any) {
      setError(err.message);
      setHistory(originalHistory); // Revert on error
    }
  }

  if (isLoading) return <div className="text-center p-8 text-amber-700">Loading history...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (history.length === 0) return <div className="text-center p-8 text-amber-600">No history recorded yet.</div>;

  return (
    <div className="bg-white/50 rounded-lg shadow-lg p-6 border border-amber-200">
      <h2 className="text-2xl font-bold text-amber-800 mb-4">Tending History</h2>
      <ul className="space-y-4">
        {history.map(entry => (
          <li key={entry.id} className="border-b border-amber-200 py-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg">
                  <span className="font-semibold text-amber-800">{entry.tender}</span>
                  <span> tended </span>
                  <span className="font-semibold text-amber-800">{entry.chore}</span>
                </p>
                <p 
                  className="text-sm text-amber-600 cursor-pointer"
                  onClick={() => toggleExactTime(entry.id)}
                >
                  {showExactTimes[entry.id]
                    ? new Date(entry.timestamp).toLocaleString()
                    : formatRelativeTime(entry.timestamp)
                  }
                  <span className="ml-2 text-yellow-500">⭐ {entry.points}</span>
                </p>
                {entry.notes && (
                  <p className="text-sm text-gray-600 mt-1 italic">"{entry.notes}"</p>
                )}
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this history entry? This cannot be undone.')) {
                    handleDeleteHistoryEntry(entry.id);
                  }
                }}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- SYNC SETTINGS COMPONENTS ---

function SyncSettingsView({ updateAvailable, onUpdate, currentClientVersion }: {
  updateAvailable: boolean;
  onUpdate: () => void;
  currentClientVersion: string | null;
}) {
  const syncId = useSyncId();

  if (!syncId) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <SyncSettingsComponent currentSyncId={syncId} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <UpdatesComponent 
            updateAvailable={updateAvailable} 
            onUpdate={onUpdate} 
            currentClientVersion={currentClientVersion} 
          />
        </div>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <ManageChoresComponent />
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <ManageTendersComponent />
      </div>
    </div>
  );
}

function UpdatesComponent({ updateAvailable, onUpdate, currentClientVersion }: {
  updateAvailable: boolean;
  onUpdate: () => void;
  currentClientVersion: string | null;
}) {
  const [latestServerVersion, setLatestServerVersion] = useState<string | null>(null);
  const [isLoadingLatestVersion, setIsLoadingLatestVersion] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setIsLoadingLatestVersion(true);
      fetch("/api/app-version") // Assuming syncId is not needed for this global app version
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch latest version");
          return res.json();
        })
        .then(data => {
          setLatestServerVersion(data.version);
        })
        .catch(error => {
          console.error("Error fetching latest app version:", error);
          setLatestServerVersion(null); // Clear or set error state
        })
        .finally(() => {
          setIsLoadingLatestVersion(false);
        });
    }
  }, [updateAvailable]);

  return (
    <section className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-xl mb-3 font-semibold text-amber-700">App Updates</h3>

      {updateAvailable
        ? (
          <div className="bg-amber-100 p-4 rounded-md border border-amber-300">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="text-amber-800 flex-grow">
                  <p className="font-medium">A new version is available!</p>
                  {currentClientVersion && <p className="text-sm mt-1">Current version: {currentClientVersion}</p>}
                  {isLoadingLatestVersion && <p className="text-sm mt-1">Checking for latest version...</p>}
                  {latestServerVersion && !isLoadingLatestVersion && (
                    <p className="text-sm mt-1">New version: {latestServerVersion}</p>
                  )}
                </div>
                <button
                  onClick={onUpdate}
                  className="bg-amber-600 text-white px-4 py-2 rounded-md text-sm hover:bg-amber-700 transition-colors duration-150 ml-4"
                >
                  Update Now
                </button>
              </div>
              {latestServerVersion && currentClientVersion && latestServerVersion === currentClientVersion
                && !isLoadingLatestVersion && (
                <p className="text-xs text-amber-600 mt-1">
                  You appear to have the latest code, but a service worker update is pending. Clicking update will
                  refresh.
                </p>
              )}
            </div>
          </div>
        )
        : (
          <div className="bg-green-50 p-4 rounded-md border border-green-200">
            <div className="flex items-center">
              <div className="text-green-800">
                <p className="font-medium">You're using the latest version</p>
                {currentClientVersion && <p className="text-sm mt-1">Version: {currentClientVersion}</p>}
                {!currentClientVersion && <p className="text-sm mt-1">Shitty is up to date!</p>}
              </div>
              <svg
                className="h-5 w-5 text-green-600 ml-auto"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}
    </section>
  );
}

function ManageChoresComponent() {
  const syncId = useSyncId();
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newChoreName, setNewChoreName] = useState("");
  const [newChoreIcon, setNewChoreIcon] = useState("");
  const [newCycleDuration, setNewCycleDuration] = useState<number>(24);
  const [newPoints, setNewPoints] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  const fetchChoresInternal = useCallback(async () => {
    if (!syncId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/${syncId}/chores`);
      if (!response.ok) {
        throw new Error('Failed to fetch chores');
      }
      setChores(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [syncId]);

  useEffect(() => {
    fetchChoresInternal();
  }, [fetchChoresInternal]);

  async function handleAddChore() {
    if (!syncId || !newChoreName.trim() || !newChoreIcon.trim()) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/${syncId}/chores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newChoreName.trim(), 
          icon: newChoreIcon.trim(),
          cycleDuration: newCycleDuration,
          points: newPoints
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setNewChoreName("");
      setNewChoreIcon("");
      setNewCycleDuration(24);
      setNewPoints(10);
      fetchChoresInternal(); // Refresh chores
    } catch (error) {
      console.error("Error adding chore:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRenameChore(choreId: string, currentName: string, currentIcon: string) {
    if (!syncId || !choreId) return;
    const newName = prompt("Enter new name for " + currentName + ":", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      setIsProcessing(true);
      try {
        await fetch(`/api/${syncId}/chores/${choreId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), icon: currentIcon }),
        });
        fetchChoresInternal(); // Refresh
      } catch (error) {
        console.error("Error renaming chore:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  async function handleChangeIcon(choreId: string, currentName: string, currentIcon: string) {
    if (!syncId || !choreId) return;
    const newIcon = prompt("Enter new icon for " + currentName + ":", currentIcon);
    if (newIcon && newIcon.trim() && newIcon.trim() !== currentIcon) {
      setIsProcessing(true);
      try {
        await fetch(`/api/${syncId}/chores/${choreId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: currentName, icon: newIcon.trim() }),
        });
        fetchChoresInternal(); // Refresh
      } catch (error) {
        console.error("Error changing chore icon:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  async function handleEditCycle(choreId: string, currentCycleDuration: number) {
    if (!syncId || !choreId) return;
    const newCycleStr = prompt(`Enter new cycle duration in hours for this chore:`, currentCycleDuration.toString());
    if (newCycleStr) {
      const newCycle = parseInt(newCycleStr);
      if (!isNaN(newCycle) && newCycle > 0 && newCycle !== currentCycleDuration) {
        setIsProcessing(true);
        try {
          await fetch(`/api/${syncId}/chores/${choreId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cycleDuration: newCycle }),
          });
          fetchChoresInternal(); // Refresh
        } catch (error) {
          console.error("Error updating cycle duration:", error);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  }

  async function handleEditPoints(choreId: string, currentPoints: number) {
    if (!syncId || !choreId) return;
    const newPointsStr = prompt(`Enter new points value for this chore:`, currentPoints.toString());
    if (newPointsStr) {
      const newPoints = parseInt(newPointsStr);
      if (!isNaN(newPoints) && newPoints > 0 && newPoints !== currentPoints) {
        setIsProcessing(true);
        try {
          await fetch(`/api/${syncId}/chores/${choreId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ points: newPoints }),
          });
          fetchChoresInternal(); // Refresh
        } catch (error) {
          console.error("Error updating points:", error);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  }

  async function handleDeleteChore(choreId: string, choreName: string) {
    if (!syncId || !choreId) return;
    if (!confirm(`Are you sure you want to delete the chore "${choreName}"? This will also delete all tending history for this chore.`)) return;
    setIsProcessing(true);
    try {
      await fetch(`/api/${syncId}/chores/${choreId}`, { method: "DELETE" });
      fetchChoresInternal(); // Refresh
    } catch (error) {
      console.error("Error deleting chore:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create a new array with reordered chores
      const newChores = [...chores];
      const draggedChore = newChores[draggedIndex];
      
      // Remove the dragged item
      newChores.splice(draggedIndex, 1);
      
      // Insert it at the new position
      newChores.splice(dropIndex, 0, draggedChore);
      
      // Update the local state immediately for responsive UI
      setChores(newChores);
      
      // Send all chores in new order to the server
      await fetch(`/api/${syncId}/chores/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chores: newChores }),
      });
      
    } catch (error) {
      console.error("Error reordering chores:", error);
      // Revert on error
      fetchChoresInternal();
    } finally {
      setIsProcessing(false);
      setDraggedIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (isLoading) {
    return (
      <div className="text-2xl mt-6 text-amber-700">
        Loading chores...
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center">
        Error: {error}
      </div>
    );
  }

  return (
    <div className={`mt-6 ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
      <section className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg border-2 border-amber-200">
        <h3 className="text-xl mb-3 font-semibold text-amber-700">🎯 Manage Chores</h3>
        {chores.length === 0 && !isLoading
          ? <p className="text-amber-600">No chores added yet.</p>
          : null}
        <div className="mb-4 text-sm text-amber-600 bg-amber-50 p-2 rounded border">
          💡 <strong>Tip:</strong> Drag and drop chores to reorder them. The order here determines how they appear on the main page.
        </div>
        <ul className="space-y-2">
          {chores.map((chore: any, index: number) => (
            <li
              key={chore.id}
              draggable={!isProcessing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200 transition-all duration-200 ${
                draggedIndex === index 
                  ? "opacity-50 scale-95 border-amber-400 shadow-lg" 
                  : "hover:shadow-md hover:border-amber-300 cursor-move"
              } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center text-amber-400">
                  <span className="text-xs leading-none">⋮⋮</span>
                  <span className="text-xs leading-none">⋮⋮</span>
                </div>
                <span className="text-2xl">{chore.icon}</span>
                <div className="flex flex-col">
                  <span className="text-amber-800 font-medium">{chore.name}</span>
                  <div className="flex gap-4 text-xs text-amber-600">
                    <span>🔄 {chore.cycleDuration || 24}h cycle</span>
                    <span>⭐ {chore.points || 10} points</span>
                  </div>
                </div>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleEditCycle(chore.id, chore.cycleDuration || 24)}
                  className="text-sm text-green-500 hover:text-green-700"
                  disabled={isProcessing}
                >
                  🕐 Cycle
                </button>
                <button
                  onClick={() => handleEditPoints(chore.id, chore.points || 10)}
                  className="text-sm text-purple-500 hover:text-purple-700"
                  disabled={isProcessing}
                >
                  ⭐ Points
                </button>
                <button
                  onClick={() => handleChangeIcon(chore.id, chore.name, chore.icon)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                  disabled={isProcessing}
                >
                  🎨 Icon
                </button>
                <button
                  onClick={() => handleRenameChore(chore.id, chore.name, chore.icon)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                  disabled={isProcessing}
                >
                  ✏️ Rename
                </button>
                <button
                  onClick={() => handleDeleteChore(chore.id, chore.name)}
                  className="text-sm text-red-500 hover:text-red-700"
                  disabled={isProcessing}
                >
                  ❌ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              id="new-chore-icon"
              name="new-chore-icon"
              type="text"
              value={newChoreIcon}
              onChange={(e) => setNewChoreIcon(e.target.value)}
              placeholder="Icon"
              className="w-20 border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50 text-center text-2xl"
              disabled={isProcessing}
              maxLength={2}
            />
            <input
              id="new-chore-name"
              name="new-chore-name"
              type="text"
              value={newChoreName}
              onChange={(e) => setNewChoreName(e.target.value)}
              placeholder="New chore name"
              className="flex-grow border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50"
              disabled={isProcessing}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="new-chore-cycle" className="block text-xs text-amber-700 mb-1">Cycle Duration (hours)</label>
              <input
                id="new-chore-cycle"
                name="new-chore-cycle"
                type="number"
                value={newCycleDuration}
                onChange={(e) => setNewCycleDuration(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="24"
                min="1"
                max="8760"
                className="w-full border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50"
                disabled={isProcessing}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="new-chore-points" className="block text-xs text-amber-700 mb-1">Points</label>
              <input
                id="new-chore-points"
                name="new-chore-points"
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="10"
                min="1"
                max="1000"
                className="w-full border border-amber-300 rounded px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50"
                disabled={isProcessing}
              />
            </div>
            <div className="flex-1 flex items-end">
              <button
                onClick={handleAddChore}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-1 rounded disabled:opacity-50 font-semibold"
                disabled={isProcessing || !newChoreName.trim() || !newChoreIcon.trim()}
              >
                {isProcessing ? "Adding..." : "Add Chore"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ManageTendersComponent() {
  const syncId = useSyncId();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTenderName, setNewTenderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTendersInternal = useCallback(async () => {
    if (!syncId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/${syncId}/tenders`);
      if (!response.ok) {
        throw new Error('Failed to fetch tenders');
      }
      setTenders(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [syncId]);

  useEffect(() => {
    fetchTendersInternal();
  }, [fetchTendersInternal]);

  async function handleAddTender() {
    if (!syncId || !newTenderName.trim()) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/${syncId}/tenders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTenderName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setNewTenderName("");
      fetchTendersInternal(); // Refresh tenders
    } catch (error) {
      console.error("Error adding tender:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRenameTender(tenderId: string, currentName: string) {
    if (!syncId || !tenderId) return;
    const newName = prompt("Enter new name for " + currentName + ":", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      setIsProcessing(true);
      try {
        await fetch(`/api/${syncId}/tenders/${tenderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
        fetchTendersInternal(); // Refresh
      } catch (error) {
        console.error("Error renaming tender:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  async function handleDeleteTender(tenderId: string, tenderName: string) {
    if (!syncId || !tenderId) return;
    if (!confirm(`Are you sure you want to delete tender "${tenderName}"? This cannot be undone.`)) return;
    setIsProcessing(true);
    try {
      await fetch(`/api/${syncId}/tenders/${tenderId}`, { method: "DELETE" });
      fetchTendersInternal(); // Refresh
    } catch (error) {
      console.error("Error deleting tender:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-2xl mt-6 text-amber-700">
        Loading tenders...
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center">
        Error: {error}
      </div>
    );
  }

  return (
    <div className={`mt-6 ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
      <section className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg border-2 border-amber-200">
        <h3 className="text-xl mb-3 font-semibold text-amber-700">👥 Manage Tenders</h3>
        {tenders.length === 0 && !isLoading
          ? <p className="text-amber-600">No tenders added yet.</p>
          : null}
        <ul className="space-y-2">
          {tenders.map((tender: any) => (
            <li
              key={tender.id}
              className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200"
            >
              <span className="text-amber-800">{tender.name}</span>
              <div className="space-x-2">
                <button
                  onClick={() => handleRenameTender(tender.id, tender.name)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                  disabled={isProcessing}
                >
                  ✏️ Rename
                </button>
                <button
                  onClick={() => handleDeleteTender(tender.id, tender.name)}
                  className="text-sm text-red-500 hover:text-red-700"
                  disabled={isProcessing}
                >
                  ❌ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex mt-4">
          <input
            id="new-tender-name"
            name="new-tender-name"
            type="text"
            value={newTenderName}
            onChange={(e) => setNewTenderName(e.target.value)}
            placeholder="New tender name"
            className="flex-grow border border-amber-300 rounded-l px-2 py-1 focus:ring-amber-500 focus:border-amber-500 bg-yellow-50"
            disabled={isProcessing}
          />
          <button
            onClick={handleAddTender}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1 rounded-r disabled:opacity-50 font-semibold"
            disabled={isProcessing || !newTenderName.trim()}
          >
            {isProcessing ? "Adding..." : "Add Tender"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SyncSettingsComponent({ currentSyncId }: { currentSyncId: string }) {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);
  const [newSyncId, setNewSyncId] = useState(currentSyncId);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApplyNewCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSyncId && newSyncId.trim() !== "") {
      const sanitizedId = newSyncId.trim();
      setSyncIdInLocalStorage(sanitizedId);
      navigate(`/${sanitizedId}`); // Navigate to the new sync ID route
    }
  };

  const handleGenerateNew = () => {
    const newlyGeneratedId = generateNewSyncIdInternal();
    setNewSyncId(newlyGeneratedId); // Update input field
    setSyncIdInLocalStorage(newlyGeneratedId); // Save to local storage
    navigate(`/${newlyGeneratedId}`); // Navigate to the new sync ID route
  };

  useEffect(() => {
    // If the syncId from the URL changes, update the input field
    setNewSyncId(currentSyncId);
  }, [currentSyncId]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Sync Settings</h2>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600 mb-4">
          Use this URL to sync across devices. Anyone with the URL can view and update the chores.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <input
            id="sync-url"
            name="sync-url"
            type="text"
            readOnly
            value={window.location.href}
            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            {isCopied ? "Copied!" : "Copy"}
          </button>
        </div>

        <hr className="my-6" />

        <h3 className="text-xl font-bold mb-2">Change Sync Code</h3>
        <p className="text-gray-600 mb-4">
          Enter a new sync code below. This will change the URL for this Kinobi instance.
        </p>
        <form onSubmit={handleApplyNewCode} className="flex items-center gap-2">
          <label htmlFor="sync-code-input" className="sr-only">Sync Code</label>
          <input
            id="sync-code-input"
            name="sync-code-input"
            type="text"
            value={newSyncId}
            onChange={(e) => setNewSyncId(e.target.value)}
            placeholder="Enter new or existing sync code"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            type="submit"
            disabled={!newSyncId || newSyncId.trim() === "" || newSyncId.trim() === currentSyncId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </form>

        <hr className="my-6" />

        <h3 className="text-xl font-bold mb-2">Create New Instance</h3>
        <p className="text-gray-600 mb-4">
          Generate a new, unique URL for a separate set of chores.
        </p>
        <button
          onClick={handleGenerateNew}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Generate New Sync URL
        </button>
      </div>
    </div>
  );
}

// --- END SYNC SETTINGS COMPONENTS ---

function client() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<RoutedApp />);
  } else {
    console.error('Root element not found!');
  }
}

if (typeof document !== "undefined") { 
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', client);
  } else {
    client();
  }
}

// --- Countdown Calculation Service ---
class CountdownService {
  static calculateCountdownState(chore: Chore, config: ChoreConfig): CountdownState {
    if (!chore.lastCompleted) {
      return { progress: 0, status: 'good', timeRemaining: chore.cycleDuration };
    }

    const now = Date.now();
    const totalCycleMillis = chore.cycleDuration * 60 * 60 * 1000;
    const elapsedMillis = now - chore.lastCompleted;

    let progress = Math.min(Math.max(elapsedMillis / totalCycleMillis, 0), 1.1); // Cap progress slightly above 1 for overdue state

    const warningTime = totalCycleMillis * (config.warningThreshold / 100);
    const urgentTime = totalCycleMillis * (config.dangerThreshold / 100);

    let status: CountdownState['status'] = 'good';
    if (elapsedMillis >= totalCycleMillis) {
      status = 'overdue';
    } else if (elapsedMillis >= urgentTime) {
      status = 'urgent';
    } else if (elapsedMillis >= warningTime) {
      status = 'warning';
    }
    
    // If overdue, progress should be considered 1 for display, but calculations might differ
    if (status === 'overdue') {
        progress = 1;
    }

    const timeRemaining = (totalCycleMillis - elapsedMillis) / (1000 * 60 * 60); // In hours

    return { progress, status, timeRemaining };
  }

  static formatTimeRemaining(hours: number): string {
    if (hours < 0) {
      const overdue = Math.abs(hours);
      if (overdue < 1) return 'overdue';
      if (overdue < 24) return `${Math.round(overdue)}h overdue`;
      const days = Math.floor(overdue / 24);
      const remainingHours = Math.round(overdue % 24);
      if (remainingHours === 0) return `${days}d overdue`;
      return `${days}d ${remainingHours}h overdue`;
    }
    
    if (hours < 1) return 'due soon';
    if (hours < 24) return `${Math.round(hours)}h left`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) return `${days}d left`;
    return `${days}d ${remainingHours}h left`;
  }
  
  static getStatusColor(status: CountdownState['status']): string {
    switch (status) {
      case 'good': return '#22c55e'; // green-500
      case 'warning': return '#eab308'; // yellow-500
      case 'urgent': return '#f97316'; // orange-500
      case 'overdue': return '#ef4444'; // red-500
      default: return '#22c55e';
    }
  }
  
  static interpolateColor(fromColor: string, toColor: string, factor: number): string {
    // Simple RGB interpolation
    const fromRgb = fromColor.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    const toRgb = toColor.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    
    const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * factor);
    const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * factor);
    const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// --- Progress Ring Component ---
interface ProgressRingProps {
  progress: number; // 0-1
  status: CountdownState['status'];
  size: number; // Diameter in pixels
  strokeWidth?: number;
  children?: React.ReactNode;
}

function ProgressRing({ progress, status, size, strokeWidth = 4, children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress * circumference);
  
  const statusColor = CountdownService.getStatusColor(status);
  
  // Filled circle background based on status
  const fillColor = status === 'good' ? '#dcfce7' : 
                    status === 'warning' ? '#fef3c7' :
                    status === 'urgent' ? '#fed7aa' : '#fecaca';
  
  // Light gray background for the progress ring
  const ringBgColor = '#e5e7eb';
  
  // Inner circle radius (slightly smaller to leave room for the ring)
  const innerRadius = radius - strokeWidth - 2;
  
  // Add pulse animation for urgent and overdue states
  const ringClasses = `transform -rotate-90 ${
    status === 'overdue' ? 'animate-pulse' : 
    status === 'urgent' ? 'animate-pulse' : ''
  }`;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        className={ringClasses}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Filled status circle in the center */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill={fillColor}
          stroke={statusColor}
          strokeWidth={2}
          style={{ 
            transition: 'fill 0.3s ease-in-out, stroke 0.3s ease-in-out'
          }}
        />
        
        {/* Background ring for progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringBgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={statusColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ 
            transition: 'stroke-dashoffset 0.5s ease-in-out, stroke 0.3s ease-in-out'
          }}
        />
        
        {/* Additional glow effect for overdue items */}
        {status === 'overdue' && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 2}
            stroke={statusColor}
            strokeWidth={1}
            fill="none"
            opacity="0.3"
            className="animate-ping"
          />
        )}
      </svg>
      {/* Content in center */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ 
          width: size - strokeWidth * 4, 
          height: size - strokeWidth * 4,
          margin: strokeWidth * 2
        }}
      >
        {children}
      </div>
    </div>
  );
}

// --- Time Display Component ---
interface TimeDisplayProps {
  countdownState: CountdownState;
  format?: 'compact' | 'full';
}

function TimeDisplay({ countdownState, format = 'compact' }: TimeDisplayProps) {
  const timeText = CountdownService.formatTimeRemaining(countdownState.timeRemaining);
  const color = CountdownService.getStatusColor(countdownState.status);
  
  if (format === 'compact') {
    return (
      <div 
        className="text-xs font-medium text-center leading-tight"
        style={{ color }}
      >
        {timeText}
      </div>
    );
  }
  
  return (
    <div className="text-center">
      <div 
        className="text-sm font-semibold"
        style={{ color }}
      >
        {timeText}
      </div>
      <div className="text-xs text-amber-600 capitalize">
        {countdownState.status}
      </div>
    </div>
  );
}

// DEPLOYMENT MARKER - if you see this comment in browser dev tools, the latest code deployed
console.log('🚀 Kinobi Vercel - Deployed at:', new Date().toISOString());