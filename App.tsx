import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import NewProduct from './components/NewProduct';
import ProjectDetail from './components/ProjectDetail';
import { Project, Category } from './types';
import { INITIAL_PROJECTS, CATEGORY_LABELS } from './constants';
import { Trash2, RefreshCw, XCircle, Menu } from 'lucide-react';

const BLOB_API_URL = "https://jsonblob.com/api/jsonBlob";

// Helper to prevent hanging requests
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const ConfirmModal: React.FC<{ isOpen: boolean, onConfirm: () => void, onCancel: () => void, message: string }> = ({ isOpen, onConfirm, onCancel, message }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-80 text-center relative z-[10000]">
        <p className="font-bold text-lg mb-6 text-gray-800 break-keep">{message}</p>
        <div className="flex gap-4 justify-center">
          <button onClick={onConfirm} className="bg-primary text-white px-6 py-2 rounded hover:bg-red-600 transition">예</button>
          <button onClick={onCancel} className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300 transition">아니오</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const App: React.FC = () => {
  // --- State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [hasServerUpdates, setHasServerUpdates] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [view, setView] = useState<string>('HOME'); 
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);

  // --- Persistence & Sync Logic ---
  useEffect(() => {
    let mounted = true;

    const initStorage = async () => {
       try {
           const params = new URLSearchParams(window.location.search);
           let currentId = params.get('syncId');
           let data = INITIAL_PROJECTS;
           
           // 1. Validate ID from URL or LocalStorage
           if (!currentId || currentId === "null" || currentId === "undefined") {
              currentId = localStorage.getItem('seupachiba_sync_id');
           }
           if (currentId === "null" || currentId === "undefined") {
              currentId = null;
           }

           // 2. If ID exists, try to fetch data with timeout
           if (currentId) {
              try {
                 const res = await fetchWithTimeout(`${BLOB_API_URL}/${currentId}`);
                 if (res.ok) {
                    const fetchedData = await res.json();
                    if (Array.isArray(fetchedData)) {
                        data = fetchedData;
                        if (mounted) setSyncId(currentId);
                    } else {
                        // Data corrupted or invalid format
                        console.warn("Fetched data is not an array, using initial data.");
                        currentId = null; // Treat as invalid
                    }
                 } else {
                    console.warn("Invalid Sync ID or expired (404/500), creating new...");
                    currentId = null; 
                 }
              } catch (e) {
                 console.error("Fetch failed (Network/Timeout)", e);
                 currentId = null;
              }
           }

           // 3. Create new if no ID or fetch failed
           if (!currentId) {
              try {
                 const res = await fetchWithTimeout(BLOB_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(INITIAL_PROJECTS)
                 });
                 
                 if (res.ok) {
                     const location = res.headers.get('Location');
                     // Location is full URL usually: https://jsonblob.com/api/jsonBlob/<id>
                     if (location) {
                         const parts = location.split('/');
                         const newId = parts[parts.length - 1];
                         if (newId) {
                             currentId = newId;
                             if (mounted) setSyncId(newId);
                             data = INITIAL_PROJECTS;
                         }
                     }
                 } else {
                     console.warn("Failed to create new blob, status:", res.status);
                     if (mounted) setIsOffline(true);
                 }
              } catch(e) {
                  console.error("Create failed (Network/CORS/Timeout)", e);
                  // Network error implies offline mode
                  if (mounted) setIsOffline(true);
              }
           }

           // 4. Update State & URL
           if (mounted) {
               setProjects(data);
               
               if (currentId) {
                   localStorage.setItem('seupachiba_sync_id', currentId);
                   const newUrl = new URL(window.location.href);
                   newUrl.searchParams.set('syncId', currentId);
                   window.history.replaceState({}, '', newUrl.toString());
               }
           }
       } catch (err) {
           console.error("Critical initialization error:", err);
           // Fallback to defaults if everything blows up
           if (mounted) {
               setProjects(INITIAL_PROJECTS);
               setIsOffline(true);
           }
       } finally {
           if (mounted) setIsInitializing(false);
       }
    };

    initStorage();
    
    return () => { mounted = false; };
  }, []);

  // Save Logic (Debounced)
  useEffect(() => {
     if (isInitializing || !syncId || isOffline) return;
     
     setSyncStatus('saving');
     const timer = setTimeout(async () => {
         try {
             await fetch(`${BLOB_API_URL}/${syncId}`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(projects)
             });
             setSyncStatus('saved');
             setHasServerUpdates(false); 
         } catch(e) {
             console.error("Save failed", e);
             setSyncStatus('error');
         }
     }, 1000); // 1 second debounce

     return () => clearTimeout(timer);
  }, [projects, syncId, isInitializing, isOffline]);

  // Polling for updates (Collaborative feature)
  useEffect(() => {
    if (!syncId || isInitializing || isOffline) return;

    const pollInterval = setInterval(async () => {
        try {
            const res = await fetch(`${BLOB_API_URL}/${syncId}`);
            if (res.ok) {
                const serverData = await res.json();
                if (Array.isArray(serverData)) {
                    const currentStr = JSON.stringify(projects);
                    const serverStr = JSON.stringify(serverData);
                    
                    if (currentStr !== serverStr && syncStatus !== 'saving') {
                        setHasServerUpdates(true);
                    }
                }
            }
        } catch(e) {
            // ignore polling errors
        }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(pollInterval);
  }, [syncId, projects, isInitializing, syncStatus, isOffline]);

  const handleRefresh = async () => {
    if (!syncId || isOffline) {
        if (isOffline) alert("오프라인 모드에서는 서버 데이터를 불러올 수 없습니다.");
        return;
    }
    setSyncStatus('saving'); 
    try {
      const res = await fetchWithTimeout(`${BLOB_API_URL}/${syncId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
            setProjects(data);
            setSyncStatus('saved');
            setHasServerUpdates(false);
            alert('최신 데이터를 불러왔습니다.');
        } else {
            throw new Error("Invalid data format");
        }
      } else {
        throw new Error('Fetch failed');
      }
    } catch (e) {
      console.error("Refresh failed", e);
      setSyncStatus('error');
      alert('데이터 불러오기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };


  // --- Deep Linking & Routing ---
  useEffect(() => {
    if (isInitializing) return;

    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    if (pId) {
        const project = projects.find(p => p.id === pId);
        if (project && !project.isDeleted) {
            setSelectedProjectId(pId);
            setSelectedCategory(project.category);
            setView('PROJECT_DETAIL');
        }
    }
    
    if (window.innerWidth < 768) {
        setIsSidebarVisible(false);
    }
  }, [isInitializing]); 

  // --- Actions ---

  const handleNavigate = (newView: string, category?: Category) => {
    setView(newView);
    setSelectedCategory(category);
    setSelectedProjectId(null); 
    if (category) window.location.hash = category;
    
    if (window.innerWidth < 768) setIsSidebarVisible(false);
  };

  const handleSelectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        setSelectedProjectId(projectId);
        setSelectedCategory(project.category);
        setView('PROJECT_DETAIL');
        if (window.innerWidth < 768) setIsSidebarVisible(false);
    }
  };

  const handleCreateProject = (newProject: Project) => {
    setProjects(prev => [...prev, newProject]);
    setSelectedCategory(newProject.category);
    setSelectedProjectId(newProject.id);
    setView('PROJECT_DETAIL');
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, isDeleted: true } : p));
  };

  // --- TRASH LOGIC ---

  const handleRestoreProject = (id: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, isDeleted: false } : p));
  };

  const handleRestoreSubItem = (projectId: string, type: 'report' | 'log', itemId: string) => {
      setProjects(prev => prev.map(p => {
          if (p.id !== projectId) return p;
          if (type === 'report') {
              return { ...p, reports: p.reports.map(r => r.id === itemId ? { ...r, isDeleted: false } : r) };
          } else {
              return { ...p, logs: p.logs.map(l => l.id === itemId ? { ...l, isDeleted: false } : l) };
          }
      }));
  };

  const handlePermanentDeleteProject = (id: string) => {
    setConfirmModal({
        isOpen: true,
        message: '정말로 삭제하시겠습니까? 복구할 수 없습니다.',
        onConfirm: () => {
            setProjects(prev => prev.filter(p => p.id !== id));
            setConfirmModal(null);
        }
    });
  };

  const handlePermanentDeleteSubItem = (projectId: string, type: 'report' | 'log', itemId: string) => {
      setConfirmModal({
          isOpen: true,
          message: '정말로 영구 삭제하시겠습니까?',
          onConfirm: () => {
              setProjects(prev => prev.map(p => {
                  if (p.id !== projectId) return p;
                  if (type === 'report') {
                      return { ...p, reports: p.reports.filter(r => r.id !== itemId) };
                  } else {
                      return { ...p, logs: p.logs.filter(l => l.id !== itemId) };
                  }
              }));
              setConfirmModal(null);
          }
      });
  };


  // --- Selectors ---

  const activeProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
  [projects, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    if (view === 'PROJECT_LIST' && selectedCategory) {
      return projects.filter(p => p.category === selectedCategory && !p.isDeleted);
    }
    return [];
  }, [projects, view, selectedCategory]);

  const deletedItems = useMemo(() => {
    const deletedProjects = projects.filter(p => p.isDeleted).map(p => ({ type: 'project', data: p, parent: null }));
    const deletedReports: any[] = [];
    const deletedLogs: any[] = [];

    projects.forEach(p => {
        if (!p.isDeleted) {
            p.reports.filter(r => r.isDeleted).forEach(r => deletedReports.push({ type: 'report', data: r, parent: p }));
            p.logs.filter(l => l.isDeleted).forEach(l => deletedLogs.push({ type: 'log', data: l, parent: p }));
        }
    });

    return [...deletedProjects, ...deletedReports, ...deletedLogs];
  }, [projects]);


  // --- Renderers ---

  if (isInitializing) {
     return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 flex-col gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-gray-600 font-medium">서버와 연결 중입니다...</p>
        </div>
     );
  }

  const renderContent = () => {
    if (view === 'HOME') {
      return (
        <div className="h-full overflow-y-auto bg-white">
            <Home />
        </div>
      );
    }

    if (view === 'NEW_PRODUCT') {
      return (
        <div className="h-full overflow-y-auto bg-gray-50">
            <NewProduct onCreate={handleCreateProject} onCancel={() => handleNavigate('HOME')} />
        </div>
      );
    }

    if (view === 'PROJECT_DETAIL' && activeProject) {
        return (
            <ProjectDetail 
                project={activeProject} 
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
                onBack={() => handleNavigate('PROJECT_LIST', activeProject.category)}
            />
        );
    }

    if (view === 'PROJECT_LIST' && selectedCategory) {
        return (
            <div className="p-8 h-full overflow-y-auto bg-gray-50">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">{CATEGORY_LABELS[selectedCategory]} 목록</h2>
                {filteredProjects.length === 0 ? (
                    <div className="text-center text-gray-400 py-20">
                        <p>아직 등록된 프로젝트가 없습니다.</p>
                        <button onClick={() => handleNavigate('NEW_PRODUCT')} className="mt-4 text-primary hover:underline">
                            + 새 상품 기획하기
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => {
                                    setSelectedProjectId(p.id);
                                    setView('PROJECT_DETAIL');
                                }}
                                className="bg-white rounded-lg shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden group border border-gray-100"
                            >
                                <div className="h-48 bg-gray-200 overflow-hidden">
                                    {p.coverImage ? (
                                        <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg text-gray-800 truncate">{p.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{p.createdAt.split('T')[0]}</p>
                                    <div className="mt-3 flex gap-2 text-xs text-gray-400">
                                        <span className="bg-gray-100 px-2 py-1 rounded">리포트 {p.reports.filter(r=>!r.isDeleted).length}</span>
                                        <span className="bg-gray-100 px-2 py-1 rounded">일지 {p.logs.filter(l=>!l.isDeleted).length}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (view === 'TRASH') {
        return (
            <div className="p-8 h-full overflow-y-auto bg-gray-50">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <Trash2 className="text-gray-500" /> 휴지통
                </h2>
                {deletedItems.length === 0 ? (
                     <p className="text-gray-500">휴지통이 비었습니다.</p>
                ) : (
                    <div className="space-y-4">
                        {deletedItems.map((item, idx) => {
                            const isProject = item.type === 'project';
                            const title = isProject ? item.data.title : item.data.title;
                            const subText = isProject 
                                ? `프로젝트 | ${CATEGORY_LABELS[item.data.category as Category]}` 
                                : `${item.type === 'report' ? '리포트' : '개발일지'} | 프로젝트: ${item.parent.title}`;

                            return (
                                <div key={idx} className="bg-white p-4 rounded shadow-sm flex items-center justify-between border">
                                    <div>
                                        <h4 className="font-bold text-gray-700">{title}</h4>
                                        <p className="text-xs text-gray-400">{subText}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => isProject 
                                                ? handleRestoreProject(item.data.id) 
                                                : handleRestoreSubItem(item.parent.id, item.type, item.data.id)
                                            }
                                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 flex items-center gap-1"
                                        >
                                            <RefreshCw size={14} /> 복구
                                        </button>
                                        <button 
                                            onClick={() => isProject 
                                                ? handlePermanentDeleteProject(item.data.id) 
                                                : handlePermanentDeleteSubItem(item.parent.id, item.type, item.data.id)
                                            }
                                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                                        >
                                            <XCircle size={14} /> 영구 삭제
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }
    return null;
  };

  return (
    <div className="flex w-full h-screen overflow-hidden text-gray-800 font-sans">
      {/* Mobile Overlay to close sidebar when clicking outside */}
      {isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/25 z-40 md:hidden backdrop-blur-[1px]" 
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      <Sidebar 
        currentView={view} 
        onNavigate={handleNavigate} 
        onSelectProject={handleSelectProject}
        projects={projects}
        isOpen={isSidebarVisible} 
        toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        syncStatus={syncStatus} 
        onRefresh={handleRefresh}
        hasUpdates={hasServerUpdates}
        isOffline={isOffline}
      />
      
      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        {!isSidebarVisible && (
            <div className="w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 p-3 flex items-center gap-4 z-50 shadow-sm flex-shrink-0 no-print">
                <button onClick={() => setIsSidebarVisible(true)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 transition-colors border border-gray-200">
                    <Menu size={20} />
                </button>
                {view === 'HOME' && (
                    <h1 className="text-xl font-cursive font-bold text-gray-800">Seupachiba</h1>
                )}
            </div>
        )}
        <div className="flex-1 overflow-hidden relative flex flex-col">
            {renderContent()}
        </div>
      </main>
      
      {confirmModal && (
        <ConfirmModal 
          isOpen={confirmModal.isOpen} 
          message={confirmModal.message} 
          onConfirm={confirmModal.onConfirm} 
          onCancel={() => setConfirmModal(null)} 
        />
      )}
    </div>
  );
};

export default App;