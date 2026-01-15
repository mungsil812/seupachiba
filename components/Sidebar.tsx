import React, { useState } from 'react';
import { Home, FolderOpen, PlusCircle, Trash2, ChevronDown, ChevronRight, X, FileText, Cloud, CheckCircle, Loader2, AlertCircle, Link as LinkIcon, RefreshCw, Share2, WifiOff } from 'lucide-react';
import { Category, Project } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, category?: Category) => void;
  onSelectProject: (projectId: string) => void;
  projects: Project[];
  isOpen: boolean;
  toggleSidebar: () => void;
  syncStatus?: 'saved' | 'saving' | 'error';
  onRefresh: () => void;
  hasUpdates?: boolean;
  isOffline?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onSelectProject, projects, isOpen, toggleSidebar, syncStatus = 'saved', onRefresh, hasUpdates = false, isOffline = false }) => {
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(true);
  const [isCategoryOpen, setIsCategoryOpen] = useState<Record<Category, boolean>>({
    DESSERT: true,
    BEVERAGE: true,
    OTHER: true
  });

  const handleNavClick = (view: string, category?: Category) => {
    onNavigate(view, category);
  };

  const toggleCategory = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setIsCategoryOpen(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleShareLink = async () => {
    if (isOffline) {
        alert("오프라인 모드에서는 공유 기능을 사용할 수 없습니다.\n인터넷 연결을 확인하거나 나중에 다시 시도해주세요.");
        return;
    }

    const url = window.location.href;
    const shareData = {
        title: 'Seupachiba 공동 작업',
        text: '이 링크로 접속하면 함께 디저트 개발 리포트를 작성할 수 있습니다.',
        url: url
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share canceled or failed', err);
        }
    } else {
        // Fallback for PC / Browsers without share API
        navigator.clipboard.writeText(url).then(() => {
            alert("공동 작업 링크가 복사되었습니다.\n\n동료에게 이 링크를 전달하면 즉시 함께 작업할 수 있습니다.");
        });
    }
  };

  const navClass = (isActive: boolean) =>
    `flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors whitespace-nowrap overflow-hidden ${
      isActive ? 'bg-primary text-white' : 'hover:bg-gray-200 text-gray-700'
    }`;

  if (!isOpen) return null; // Completely hidden

  return (
    <div className={`h-screen bg-gray-100 border-r border-gray-300 flex flex-col transition-all duration-300 no-print w-64 flex-shrink-0 fixed md:relative z-50 shadow-2xl md:shadow-none`}>
      {/* Header / Toggle */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h1 
            className="font-bold text-2xl text-primary truncate font-cursive cursor-pointer hover:opacity-80"
            onClick={() => onNavigate('HOME')}
        >
            Seupachiba
        </h1>
        <button onClick={toggleSidebar} className="p-1 hover:bg-gray-200 rounded text-gray-500">
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Home */}
        <div
          className={navClass(currentView === 'HOME')}
          onClick={() => handleNavClick('HOME')}
        >
          <Home size={20} />
          <span>홈</span>
        </div>

        {/* Dessert Development (Projects) */}
        <div className="flex flex-col">
          <div
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-200 text-gray-700`}
            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
          >
            <div className="flex items-center gap-3">
              <FolderOpen size={20} />
              <span>디저트 개발</span>
            </div>
            <span className="text-gray-400">
              {isProjectMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </div>

          {/* Sub-menu: Categories */}
          {isProjectMenuOpen && (
            <div className="pl-4 space-y-1 mt-1">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                <div key={cat}>
                  <div 
                    className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer hover:bg-gray-200 ${
                        currentView === 'PROJECT_LIST' && window.location.hash.includes(cat)
                        ? 'text-primary font-medium' : 'text-gray-600'
                    }`}
                    onClick={() => handleNavClick('PROJECT_LIST', cat)}
                  >
                     <span className="font-medium">- {CATEGORY_LABELS[cat]}</span>
                     <button onClick={(e) => toggleCategory(e, cat)} className="p-1 hover:bg-gray-300 rounded">
                         {isCategoryOpen[cat] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                     </button>
                  </div>
                  {/* Actual list of projects under category */}
                  {isCategoryOpen[cat] && (
                     <div className="pl-4 text-sm text-gray-500 space-y-1 py-1 border-l-2 border-gray-200 ml-2">
                        {projects.filter(p => p.category === cat && !p.isDeleted).length === 0 && (
                            <div className="pl-2 text-xs text-gray-400 py-1">프로젝트 없음</div>
                        )}
                        {projects.filter(p => p.category === cat && !p.isDeleted).map(project => (
                             <div 
                                key={project.id} 
                                className="pl-2 py-1 cursor-pointer hover:text-primary hover:bg-gray-100 rounded truncate flex items-center gap-2"
                                onClick={() => onSelectProject(project.id)}
                             >
                                <FileText size={12} />
                                {project.title}
                             </div>
                        ))}
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Product Planning */}
        <div
          className={navClass(currentView === 'NEW_PRODUCT')}
          onClick={() => handleNavClick('NEW_PRODUCT')}
        >
          <PlusCircle size={20} />
          <span>새 상품 기획</span>
        </div>
      </div>

      {/* Footer / Sync & Trash */}
      <div className="p-2 border-t border-gray-200 space-y-1">
         {/* Sync Status Display */}
         <div className="px-3 py-3 rounded-lg bg-gray-50 border border-gray-200 text-xs flex flex-col gap-3 mb-2">
            <div className="flex items-center justify-between">
                <span className="font-bold text-gray-600 flex items-center gap-1.5">
                    {isOffline ? <WifiOff size={14} className="text-gray-400" /> : <Cloud size={14} />}
                    {isOffline ? '오프라인 모드' : '공동 작업'}
                </span>
                <span className="flex items-center gap-1">
                    {isOffline ? (
                        <span className="text-gray-400">서버 연결 없음</span>
                    ) : (
                        <>
                            {syncStatus === 'saving' && <><Loader2 size={12} className="animate-spin text-blue-500" /><span className="text-blue-500">저장 중..</span></>}
                            {syncStatus === 'saved' && <><CheckCircle size={12} className="text-green-500" /><span className="text-green-500">동기화됨</span></>}
                            {syncStatus === 'error' && <><AlertCircle size={12} className="text-red-500" /><span className="text-red-500">오류</span></>}
                        </>
                    )}
                </span>
            </div>
            
            <button 
                onClick={handleShareLink}
                className={`w-full flex items-center justify-center gap-2 rounded py-2 transition-colors shadow-sm ${isOffline ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
            >
                <Share2 size={14} />
                <span className="font-bold">공유 / 초대하기</span>
            </button>

            {!isOffline && (
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded p-1.5">
                    <span className="text-gray-400 px-1">최신 데이터 확인</span>
                    <button 
                        onClick={onRefresh}
                        className={`relative p-1.5 rounded transition-colors flex items-center justify-center ${hasUpdates ? 'bg-primary/10 text-primary animate-pulse' : 'text-gray-500 hover:bg-gray-100'}`}
                        title="새로고침"
                    >
                        <RefreshCw size={14} className={syncStatus === 'saving' ? 'animate-spin' : ''} />
                        {hasUpdates && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </button>
                </div>
            )}
            
            <div className="text-[10px] text-gray-400 text-center leading-tight">
               {isOffline ? '* 데이터가 로컬에만 저장됩니다.' : '* 이 링크를 가진 사람은 누구나\n접속 및 수정이 가능합니다.'}
            </div>
         </div>

        <div
          className={navClass(currentView === 'TRASH')}
          onClick={() => handleNavClick('TRASH')}
        >
          <Trash2 size={20} />
          <span>휴지통</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;