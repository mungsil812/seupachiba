import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Project, Report, DevelopmentLog, Recipe, ProjectTab, RecipeStep, ImageItem, Category } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { ChevronUp, ChevronDown, Share2, Printer, Trash2, Edit3, Plus, Image as ImageIcon, Crop, Check, Bold, Italic, Underline, Palette } from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onDeleteProject: (id: string) => void;
  onBack: () => void;
}

const PRESET_COLORS = [
    '#000000', '#4B5563', '#9CA3AF', '#FFFFFF', // Grayscale
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', // Red, Orange, Yellows
    '#22C55E', '#10B981', '#06B6D4', '#3B82F6', // Greens, Blues
    '#6366F1', '#8B5CF6', '#D946EF', '#EC4899', // Purples, Pinks
    '#e85a4f', '#eae7dc', '#e98074', '#8e8d8a'  // Theme Colors
];

// --- Helper for Base64 ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- Rich Text Editor Component (Text Only) ---

// Memoized content component
const EditorContent = React.memo(({ 
    html, 
    onInput, 
    onUpdateSelection, 
    editorRef,
    className
}: {
    html: string;
    onInput: (e: React.FormEvent<HTMLDivElement>) => void;
    onUpdateSelection: () => void;
    editorRef: React.RefObject<HTMLDivElement>;
    className?: string;
}) => {
    return (
        <div 
            ref={editorRef}
            contentEditable
            onInput={onInput}
            onMouseUp={onUpdateSelection}
            onKeyUp={onUpdateSelection}
            onBlur={onUpdateSelection}
            className={`flex-1 p-8 outline-none overflow-y-auto min-h-[500px] leading-relaxed bg-white text-gray-800 relative ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ fontFamily: 'Inter, sans-serif' }}
        />
    );
}, (prev, next) => prev.html === next.html); 

const RichTextEditor = ({ 
    value, 
    onChange, 
    placeholder,
    className,
}: { 
    value: string, 
    onChange: (html: string) => void, 
    placeholder?: string,
    className?: string,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastRangeRef = useRef<Range | null>(null);
    const [color, setColor] = useState('#000000');
    const [fontSize, setFontSize] = useState<number>(16);
    const [showColorPalette, setShowColorPalette] = useState(false);

    // Keep latest onChange
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    const updateSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            if (editorRef.current && editorRef.current.contains(selection.anchorNode)) {
                lastRangeRef.current = selection.getRangeAt(0);
            }
        }
    }, []);

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        if (editorRef.current) {
            onChangeRef.current(editorRef.current.innerHTML);
            updateSelection();
        }
    }, [updateSelection]);

    // Font Styling Logic
    const exec = (command: string, val: string | undefined = undefined) => {
        if (lastRangeRef.current) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(lastRangeRef.current);
        }
        document.execCommand(command, false, val);
        editorRef.current?.focus();
        updateSelection();
    };

    const applyFontSize = (size: number) => {
        setFontSize(size);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        if (lastRangeRef.current) {
            selection?.addRange(lastRangeRef.current);
        } else {
            editorRef.current?.focus();
            return;
        }

        if (selection && selection.rangeCount > 0) {
            if (selection.isCollapsed) {
                const span = document.createElement('span');
                span.style.fontSize = `${size}px`;
                span.innerHTML = '&#8203;';
                const range = selection.getRangeAt(0);
                range.insertNode(span);
                const newRange = document.createRange();
                newRange.setStart(span.childNodes[0], 1); 
                newRange.setEnd(span.childNodes[0], 1);
                selection.removeAllRanges();
                selection.addRange(newRange);
            } else {
                document.execCommand('fontSize', false, '7');
                const fonts = editorRef.current?.querySelectorAll('font[size="7"]');
                fonts?.forEach(font => {
                    const span = document.createElement('span');
                    span.style.fontSize = `${size}px`;
                    while (font.firstChild) span.appendChild(font.firstChild);
                    font.parentNode?.replaceChild(span, font);
                });
            }
        }
        editorRef.current?.focus();
        updateSelection();
        if (editorRef.current) onChangeRef.current(editorRef.current.innerHTML);
    };

    return (
        <div className={`flex flex-col border border-gray-300 rounded overflow-hidden ${className} relative`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border-b border-gray-200 text-gray-700 relative z-40">
                <button onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} className="p-1.5 hover:bg-gray-200 rounded"><Bold size={16} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} className="p-1.5 hover:bg-gray-200 rounded"><Italic size={16} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} className="p-1.5 hover:bg-gray-200 rounded"><Underline size={16} /></button>
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">크기</span>
                    <input 
                        type="number" 
                        value={fontSize} 
                        onChange={(e) => setFontSize(parseInt(e.target.value) || 16)} 
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyFontSize(fontSize); } }}
                        onBlur={() => applyFontSize(fontSize)}
                        className="w-14 border border-gray-300 rounded px-1 py-1 text-sm outline-none text-center"
                        min="8" max="100"
                    />
                    <span className="text-xs text-gray-500">px</span>
                </div>
                <select onChange={(e) => exec('fontName', e.target.value)} className="text-sm border border-gray-300 rounded px-1 py-1 outline-none w-24" defaultValue="Inter">
                    <option value="Inter">기본(Sans)</option>
                    <option value="serif">명조(Serif)</option>
                    <option value="Dancing Script">필기체(Cursive)</option>
                </select>
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                
                {/* Color Picker with Palette */}
                <div className="relative">
                    <button 
                        onClick={() => setShowColorPalette(!showColorPalette)}
                        className="flex items-center gap-1 p-1.5 hover:bg-gray-200 rounded"
                        title="글자 색상"
                    >
                        <Palette size={16} style={{ color: color }} />
                        <ChevronDown size={12} className="text-gray-500" />
                    </button>
                    
                    {showColorPalette && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 w-48">
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        className="w-8 h-8 rounded-full border border-gray-100 shadow-sm hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c }}
                                        onClick={() => {
                                            setColor(c);
                                            exec('foreColor', c);
                                            setShowColorPalette(false);
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2 border-t pt-2">
                                <span className="text-xs text-gray-500">커스텀</span>
                                <input 
                                    type="color" 
                                    value={color} 
                                    onChange={(e) => { setColor(e.target.value); exec('foreColor', e.target.value); }} 
                                    className="w-full h-8 cursor-pointer rounded overflow-hidden"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <EditorContent 
                editorRef={editorRef}
                html={value}
                onInput={handleInput}
                onUpdateSelection={updateSelection}
            />
        </div>
    );
};

// --- Item Editor Component ---
const ItemEditor = ({ 
    item, 
    onSave, 
    onCancel, 
    onDelete, 
    typeLabel 
}: { 
    item: Report | DevelopmentLog, 
    onSave: (updates: Partial<Report | DevelopmentLog>) => void, 
    onCancel: () => void,
    onDelete: () => void,
    typeLabel: string
}) => {
    // Independent state for images (absolute positioning)
    const [images, setImages] = useState<ImageItem[]>(item.images || []);
    const titleRef = useRef<HTMLInputElement>(null);
    const [contentHtml, setContentHtml] = useState(item.content);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const url = await fileToBase64(file); // Convert to Base64
                const offset = (images.length % 5) * 40; 
                const newImg: ImageItem = {
                    id: Date.now().toString(),
                    url,
                    x: 100 + offset, 
                    y: 100 + offset,
                    width: 300,
                    height: 200,
                    isCropped: false
                };
                setImages(prev => [...prev, newImg]);
                e.target.value = ''; 
            } catch (err) {
                console.error("Image upload failed", err);
                alert("이미지 로드 중 오류가 발생했습니다.");
            }
        }
    };

    return (
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg mb-6 flex flex-col h-[850px] overflow-hidden relative">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 z-20 relative">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-700">{typeLabel} 편집</h3>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex items-center gap-2 text-sm text-gray-700 bg-white hover:text-primary px-3 py-1.5 rounded border border-gray-300 hover:border-primary transition shadow-sm"
                    >
                        <ImageIcon size={16} />
                        <span className="font-medium">사진 추가</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800 px-4 py-1.5 rounded hover:bg-gray-100 transition">취소</button>
                    <button 
                        onClick={() => onSave({ 
                            title: titleRef.current?.value || item.title, 
                            content: contentHtml,
                            images
                        })}
                        className="text-sm bg-primary text-white px-5 py-1.5 rounded shadow-sm hover:bg-red-600 font-medium transition"
                    >
                        저장 완료
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-white group flex flex-col">
                 <div className="px-8 pt-8 pb-4 bg-white border-b border-gray-50 z-10">
                    <input 
                        ref={titleRef}
                        className="w-full bg-transparent font-bold text-3xl outline-none placeholder-gray-300 text-gray-900" 
                        defaultValue={item.title}
                        placeholder="제목을 입력하세요"
                    />
                 </div>

                 <div className="relative flex-1 overflow-hidden">
                     {/* Text Editor Layer (z-0) */}
                     <div className="absolute inset-0 z-0 overflow-y-auto pb-10">
                         <RichTextEditor 
                             value={contentHtml} 
                             onChange={setContentHtml} 
                             className="border-none w-full min-h-full h-full"
                         />
                     </div>
                     {/* Image Layer (z-10, pointer-events-none container) */}
                     <div className="absolute inset-0 z-10 pointer-events-none">
                        <ImageCanvas images={images} onChange={setImages} />
                     </div>
                 </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end z-20">
                <button onClick={onDelete} className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
                    <Trash2 size={14} /> 게시글 삭제
                </button>
            </div>
        </div>
    );
};

// --- Image Management Components (Floating/Absolute) ---

const ImageCanvas: React.FC<{ images: ImageItem[], onChange: (imgs: ImageItem[]) => void }> = ({ images, onChange }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [croppingId, setCroppingId] = useState<string | null>(null);
    const [deleteModalTargetId, setDeleteModalTargetId] = useState<string | null>(null);

    // Deselect when clicking empty space
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedId(null);
            setCroppingId(null);
        }
    };

    const updateImage = (id: string, updates: Partial<ImageItem>) => {
        const newImages = images.map(img => img.id === id ? { ...img, ...updates } : img);
        onChange(newImages);
    };

    const confirmDelete = () => {
        if (deleteModalTargetId) {
            const newImages = images.filter(img => img.id !== deleteModalTargetId);
            onChange(newImages);
            setSelectedId(null);
            setDeleteModalTargetId(null);
        }
    };

    return (
        <div className="w-full h-full relative" onClick={handleCanvasClick}>
            <DeleteConfirmModal 
                isOpen={!!deleteModalTargetId} 
                onConfirm={confirmDelete} 
                onCancel={() => setDeleteModalTargetId(null)} 
            />
            {images.map(img => (
                <ResizableDraggableImage 
                    key={img.id}
                    image={img}
                    isSelected={selectedId === img.id}
                    isCropping={croppingId === img.id}
                    onSelect={(e) => { e.stopPropagation(); setSelectedId(img.id); }}
                    onUpdate={(u) => updateImage(img.id, u)}
                    onDeleteRequest={() => setDeleteModalTargetId(img.id)}
                    onToggleCrop={() => {
                        if (croppingId === img.id) {
                            setCroppingId(null);
                        } else {
                            setCroppingId(img.id);
                            // Initialize crop state if not already set
                            if (!img.isCropped) {
                                updateImage(img.id, { 
                                    isCropped: true, 
                                    originalWidth: img.width, 
                                    originalHeight: img.height,
                                    cropX: 0, 
                                    cropY: 0 
                                });
                            }
                        }
                    }}
                />
            ))}
        </div>
    );
};

const ResizableDraggableImage: React.FC<{
    image: ImageItem, 
    isSelected: boolean, 
    isCropping: boolean,
    onSelect: (e: React.MouseEvent) => void, 
    onUpdate: (u: Partial<ImageItem>) => void, 
    onDeleteRequest: () => void,
    onToggleCrop: () => void
}> = ({ image, isSelected, isCropping, onSelect, onUpdate, onDeleteRequest, onToggleCrop }) => {
    
    // --- Move Logic ---
    const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        onSelect(e as any);
        if (isCropping) return; // Disable drag move while cropping to avoid confusion or add move handle

        const startX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const startY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const initialX = image.x;
        const initialY = image.y;

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
            const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
            onUpdate({ x: initialX + (clientX - startX), y: initialY + (clientY - startY) });
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleUp);
    };

    // --- Resize / Crop Handle Logic ---
    const startResize = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
        e.stopPropagation();
        const startX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const startY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const startW = image.width;
        const startH = image.height;
        const startImgW = image.originalWidth || image.width;
        const startImgH = image.originalHeight || image.height;
        const startCropX = image.cropX || 0;
        const startCropY = image.cropY || 0;
        const ratio = startW / startH;

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
            const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            let newW = startW;
            let newH = startH;
            let newX = image.x;
            let newY = image.y;
            
            // --- Common Dimension Calculation ---
            if (direction.includes('e')) newW = startW + deltaX;
            if (direction.includes('s')) newH = startH + deltaY;
            if (direction.includes('w')) {
                newW = startW - deltaX;
                newX = image.x + deltaX;
            }
            if (direction.includes('n')) {
                newH = startH - deltaY;
                newY = image.y + deltaY;
            }

            // Aspect Ratio Lock for corners (unless cropping)
            if (!isCropping && (direction.length === 2)) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    newH = newW / ratio;
                } else {
                    newW = newH * ratio;
                }
            }

            // --- Logic Split ---
            if (isCropping) {
                // CROP MODE: 
                // Changing container size reveals/hides image parts.
                // To keep image "stationary" on screen while moving Top/Left boundaries,
                // we must shift the inner image in the opposite direction.
                let newCropX = startCropX;
                let newCropY = startCropY;

                if (direction.includes('w')) newCropX = startCropX - deltaX;
                if (direction.includes('n')) newCropY = startCropY - deltaY;

                onUpdate({ width: Math.max(20, newW), height: Math.max(20, newH), x: newX, y: newY, cropX: newCropX, cropY: newCropY });
            } else {
                // RESIZE MODE:
                // Scale the view. The image zooms in/out.
                // Inner image dimensions must scale proportionally to the container.
                
                // Use Width ratio as driver
                const scaleRatio = newW / startW;
                
                // If height changed drastically different from width (non-aspect resize), we need separate ratios?
                // For simplicity, let's recalculate based on new sizes.
                const newImgW = startImgW * (newW / startW);
                const newImgH = startImgH * (newH / startH);
                
                const newCropX = startCropX * (newW / startW);
                const newCropY = startCropY * (newH / startH);

                onUpdate({ 
                    width: Math.max(20, newW), 
                    height: Math.max(20, newH), 
                    x: newX, 
                    y: newY,
                    originalWidth: newImgW,
                    originalHeight: newImgH,
                    cropX: newCropX,
                    cropY: newCropY
                });
            }
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleUp);
    };

    const imgStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: image.isCropped && image.originalWidth ? `${image.originalWidth}px` : '100%',
        height: image.isCropped && image.originalHeight ? `${image.originalHeight}px` : '100%',
        transform: `translate(${image.cropX || 0}px, ${image.cropY || 0}px)`,
        maxWidth: 'none',
        maxHeight: 'none',
        pointerEvents: 'none', // Allow clicks to pass through image to container
        userSelect: 'none'
    };

    return (
        <div 
            className={`absolute group pointer-events-auto ${isSelected ? 'z-50' : 'z-10 hover:z-20'}`}
            style={{ left: image.x, top: image.y, width: image.width, height: image.height }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            onClick={(e) => { e.stopPropagation(); onSelect(e); }}
        >
            <div className={`relative w-full h-full overflow-hidden cursor-move ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                <img 
                    src={image.url} 
                    alt="" 
                    style={imgStyle}
                />
                
                {isCropping && (
                     <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50 z-20">
                        <div className="border-r border-b border-gray-400 border-dashed"></div>
                        <div className="border-r border-b border-gray-400 border-dashed"></div>
                        <div className="border-b border-gray-400 border-dashed"></div>
                        <div className="border-r border-b border-gray-400 border-dashed"></div>
                        <div className="border-r border-b border-gray-400 border-dashed"></div>
                        <div className="border-b border-gray-400 border-dashed"></div>
                        <div className="border-r border-gray-400 border-dashed"></div>
                        <div className="border-r border-gray-400 border-dashed"></div>
                        <div></div>
                    </div>
                )}

                {isSelected && (
                    <>
                        {/* Toolbar */}
                        <div className="absolute top-2 right-2 flex flex-col gap-2 z-50">
                             <button 
                                onClick={(e) => { e.stopPropagation(); onToggleCrop(); }} 
                                className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all ${isCropping ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:text-primary'}`}
                                title={isCropping ? "자르기 완료" : "자르기"}
                            >
                                {isCropping ? <Check size={16} /> : <Crop size={16} />}
                            </button>

                             <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }} 
                                className="w-8 h-8 rounded-full bg-white text-red-500 shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Resize Handles */}
                        <div className="absolute top-0 right-0 w-3 h-full cursor-e-resize bg-transparent hover:bg-primary/10" onMouseDown={(e) => startResize(e, 'e')} onTouchStart={(e) => startResize(e, 'e')} />
                        <div className="absolute bottom-0 left-0 w-full h-3 cursor-s-resize bg-transparent hover:bg-primary/10" onMouseDown={(e) => startResize(e, 's')} onTouchStart={(e) => startResize(e, 's')} />
                        <div className="absolute top-0 left-0 w-full h-3 cursor-n-resize bg-transparent hover:bg-primary/10" onMouseDown={(e) => startResize(e, 'n')} onTouchStart={(e) => startResize(e, 'n')} />
                        <div className="absolute top-0 left-0 w-3 h-full cursor-w-resize bg-transparent hover:bg-primary/10" onMouseDown={(e) => startResize(e, 'w')} onTouchStart={(e) => startResize(e, 'w')} />
                        <div className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize bg-primary border-2 border-white rounded-full z-50 shadow-sm" onMouseDown={(e) => startResize(e, 'se')} onTouchStart={(e) => startResize(e, 'se')} />
                    </>
                )}
            </div>
        </div>
    );
};

// --- Read-Only Canvas for View Mode ---
const ImageCanvasReadOnly: React.FC<{ images: ImageItem[] }> = ({ images }) => {
    return (
        <div className="relative w-full h-full min-h-[500px]">
            {images.map(img => (
                <div
                    key={img.id}
                    className="absolute z-10 overflow-hidden"
                    style={{ left: img.x, top: img.y, width: img.width, height: img.height }}
                >
                    <img
                        src={img.url}
                        className={`pointer-events-none select-none`}
                        alt=""
                        style={{
                            width: img.isCropped && img.originalWidth ? `${img.originalWidth}px` : '100%',
                            height: img.isCropped && img.originalHeight ? `${img.originalHeight}px` : '100%',
                            transform: `translate(${img.cropX || 0}px, ${img.cropY || 0}px)`,
                            objectFit: img.isCropped ? 'fill' : 'fill',
                            maxWidth: 'none',
                            maxHeight: 'none'
                        }}
                    />
                </div>
            ))}
        </div>
    );
};


const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onUpdateProject, onDeleteProject, onBack }) => {
  const [activeTab, setActiveTab] = useState<ProjectTab>(ProjectTab.REPORT);
  const [reportSort, setReportSort] = useState<'asc' | 'desc'>('desc');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  const [editCategory, setEditCategory] = useState(project.category);

  // Parse deep link params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const itemId = params.get('itemId');

    if (tab && Object.values(ProjectTab).includes(tab as ProjectTab)) {
        setActiveTab(tab as ProjectTab);
    }
    
    if (itemId) {
        const isReport = project.reports.find(r => r.id === itemId);
        const isLog = project.logs.find(l => l.id === itemId);
        if (isReport) {
            setActiveTab(ProjectTab.REPORT);
            setViewingReportId(itemId);
        } else if (isLog) {
            setActiveTab(ProjectTab.LOG);
            setViewingLogId(itemId);
        }
    }
  }, [project]); // Re-check if project changes (though mainly for mount)

  useEffect(() => {
    setEditTitle(project.title);
    setEditCategory(project.category);
  }, [project]);

  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editingRecipeImage, setEditingRecipeImage] = useState<string | undefined>(undefined);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [viewingLogId, setViewingLogId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'PROJECT' | 'REPORT' | 'LOG', id: string } | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteRequest = () => setDeleteTarget({ type: 'PROJECT', id: project.id });

  const confirmDelete = () => {
      if (!deleteTarget) return;
      if (deleteTarget.type === 'PROJECT') {
          onDeleteProject(deleteTarget.id);
          onBack();
      } else if (deleteTarget.type === 'REPORT') {
          const updatedReports = project.reports.map(r => r.id === deleteTarget.id ? { ...r, isDeleted: true } : r);
          onUpdateProject({ ...project, reports: updatedReports });
          setEditingReportId(null);
          setViewingReportId(null);
      } else if (deleteTarget.type === 'LOG') {
          const updatedLogs = project.logs.map(l => l.id === deleteTarget.id ? { ...l, isDeleted: true } : l);
          onUpdateProject({ ...project, logs: updatedLogs });
          setEditingLogId(null);
          setViewingLogId(null);
      }
      setDeleteTarget(null);
  };

  const handleShare = async (itemId?: string) => {
    if (confirm('현재 게시글의 공유 링크를 복사하시겠습니까?')) {
        try {
            // Use current href to preserve syncId from search params
            const url = new URL(window.location.href);
            url.searchParams.set('projectId', project.id);
            url.searchParams.set('tab', activeTab);
            if (itemId) url.searchParams.set('itemId', itemId);
            
            await navigator.clipboard.writeText(url.toString());
            alert('클립보드에 링크가 복사되었습니다: ' + url.toString());
        } catch (e) {
            alert('링크 복사에 실패했습니다.');
        }
    }
  };
  
  const handleSaveHeader = () => {
    if (!editTitle.trim()) return alert('제목을 입력해주세요.');
    onUpdateProject({ ...project, title: editTitle, category: editCategory });
    setIsEditingHeader(false);
  };

  const handleAddReport = () => {
    const newReport: Report = { id: Date.now().toString(), title: '새 리포트', content: '', date: new Date().toISOString().split('T')[0], images: [], isDeleted: false };
    onUpdateProject({ ...project, reports: [newReport, ...project.reports] });
    setEditingReportId(newReport.id);
  };
  const handleDeleteReportRequest = (id: string) => setDeleteTarget({ type: 'REPORT', id });
  const handleSaveReport = (id: string, updates: Partial<Report>) => {
    const updatedReports = project.reports.map(r => r.id === id ? { ...r, ...updates } : r);
    onUpdateProject({ ...project, reports: updatedReports });
    setEditingReportId(null);
  };
  const sortedReports = [...project.reports].filter(r => !r.isDeleted).sort((a, b) => reportSort === 'asc' ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddLog = () => {
     const newLog: DevelopmentLog = { id: Date.now().toString(), title: '새로운 개발일지', content: '', date: new Date().toISOString().split('T')[0], images: [], isDeleted: false };
    onUpdateProject({ ...project, logs: [newLog, ...project.logs] });
    setEditingLogId(newLog.id);
  };
  const handleDeleteLogRequest = (id: string) => setDeleteTarget({ type: 'LOG', id });
  const handleSaveLog = (id: string, updates: Partial<DevelopmentLog>) => {
    const updatedLogs = project.logs.map(l => l.id === id ? { ...l, ...updates } : l);
    onUpdateProject({ ...project, logs: updatedLogs });
    setEditingLogId(null);
  };
  const handleSaveRecipe = (newRecipe: Recipe) => {
    onUpdateProject({ ...project, recipe: newRecipe });
    setIsEditingRecipe(false);
  };

  const renderReportSection = () => {
    if (viewingReportId) {
       const report = project.reports.find(r => r.id === viewingReportId);
       if (!report) return null;
       return (
        <div className="bg-white border border-gray-300 rounded-sm min-h-[500px] shadow-sm printable-area">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-print">
             <div>
               <button onClick={() => setViewingReportId(null)} className="text-sm text-gray-500 mb-2 hover:text-gray-800 flex items-center gap-1"><ChevronDown size={14} className="rotate-90" /> 목록으로</button>
               <h3 className="text-2xl font-bold text-gray-900">{report.title}</h3>
               <p className="text-sm text-gray-500 mt-1">{report.date} · 작성자: 나</p>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={() => handleShare(report.id)} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors" title="이 게시글 공유"><Share2 size={18} /></button>
                <button onClick={handlePrint} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors" title="인쇄 / PDF 저장"><Printer size={18} /></button>
                <div className="w-px h-4 bg-gray-300 mx-2"></div>
                <button onClick={() => { setEditingReportId(report.id); setViewingReportId(null); }} className="text-sm border border-gray-300 px-4 py-2 bg-white rounded hover:bg-gray-50 transition">수정하기</button>
                <button onClick={() => handleDeleteReportRequest(report.id)} className="text-sm border border-gray-300 p-2 bg-white rounded hover:bg-red-50 text-red-500 transition"><Trash2 size={18} /></button>
             </div>
          </div>
          {/* Print Header (Visible only when printing) */}
          <div className="hidden print-only mb-6 border-b pb-4">
              <h1 className="text-3xl font-bold">{report.title}</h1>
              <p className="text-gray-500 mt-2">{report.date} | {project.title}</p>
          </div>

          <div className="p-8 min-h-[500px] text-gray-800 relative">
            <div className="mb-8 text-lg leading-relaxed relative z-0 rich-text-display" dangerouslySetInnerHTML={{ __html: report.content }} />
             {/* Read-Only Image Overlay */}
             {report.images && report.images.length > 0 && (
                <div className="absolute inset-0 z-10 pointer-events-none mt-8 ml-8"> 
                    <ImageCanvasReadOnly images={report.images} />
                </div>
            )}
          </div>
        </div>
       );
    }
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4 no-print">
          <h3 className="text-xl font-bold text-gray-800">시장 분석 리포트</h3>
          <div className="flex gap-2">
             <button onClick={() => setReportSort(reportSort === 'asc' ? 'desc' : 'asc')} className="text-sm border px-3 py-1.5 rounded flex items-center gap-1 hover:bg-gray-100 bg-white">날짜순 {reportSort === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
             <button onClick={handleAddReport} className="bg-primary text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-red-600 transition shadow-sm"><Plus size={16} /> 리포트 작성</button>
          </div>
        </div>
        <div className="border-t-2 border-gray-800 bg-white">
           {!editingReportId && <div className="flex bg-gray-100 p-3 text-sm font-bold text-center border-b border-gray-300 text-gray-600"><div className="w-16">No.</div><div className="flex-1">제목</div><div className="w-32">작성일</div></div>}
           {sortedReports.length === 0 && !editingReportId && <div className="p-12 text-center text-gray-400">작성된 리포트가 없습니다.</div>}
           {sortedReports.map((report, index) => (
              editingReportId === report.id ? (
                <div key={report.id} className="py-4"><ItemEditor item={report} typeLabel="리포트" onSave={(updates) => handleSaveReport(report.id, updates)} onCancel={() => setEditingReportId(null)} onDelete={() => handleDeleteReportRequest(report.id)} /></div>
              ) : (
                !editingReportId && (
                    <div key={report.id} className="flex p-4 text-sm border-b hover:bg-gray-50 cursor-pointer text-center group transition-colors" onClick={() => setViewingReportId(report.id)}>
                        <div className="w-16 text-gray-400 group-hover:text-gray-600">{sortedReports.length - index}</div>
                        <div className="flex-1 text-left px-4 font-medium text-gray-700 truncate group-hover:text-primary transition-colors">{report.title}</div>
                        <div className="w-32 text-gray-400 group-hover:text-gray-600">{report.date}</div>
                    </div>
                )
              )
           ))}
        </div>
      </div>
    );
  };

  const renderLogSection = () => {
    if (viewingLogId) {
      const log = project.logs.find(l => l.id === viewingLogId);
      if (!log) return null;
      return (
        <div className="bg-white border border-gray-300 rounded-sm min-h-[500px] shadow-sm printable-area">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-print">
             <div>
               <button onClick={() => setViewingLogId(null)} className="text-sm text-gray-500 mb-2 hover:text-gray-800 flex items-center gap-1"><ChevronDown size={14} className="rotate-90" /> 목록으로</button>
               <h3 className="text-2xl font-bold text-gray-900">{log.title}</h3>
               <p className="text-sm text-gray-500 mt-1">{log.date} · 작성자: 나</p>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={() => handleShare(log.id)} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors" title="이 일지 공유"><Share2 size={18} /></button>
                <button onClick={handlePrint} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors" title="인쇄 / PDF 저장"><Printer size={18} /></button>
                <div className="w-px h-4 bg-gray-300 mx-2"></div>
                <button onClick={() => { setEditingLogId(log.id); setViewingLogId(null); }} className="text-sm border border-gray-300 px-4 py-2 bg-white rounded hover:bg-gray-50 transition">수정하기</button>
                <button onClick={() => handleDeleteLogRequest(log.id)} className="text-sm border border-gray-300 p-2 bg-white rounded hover:bg-red-50 text-red-500 transition"><Trash2 size={18} /></button>
             </div>
          </div>
          {/* Print Header */}
          <div className="hidden print-only mb-6 border-b pb-4">
              <h1 className="text-3xl font-bold">{log.title}</h1>
              <p className="text-gray-500 mt-2">{log.date} | 개발일지 | {project.title}</p>
          </div>

          <div className="p-8 min-h-[500px] text-gray-800 relative">
            <div className="mb-8 text-lg leading-relaxed relative z-0 rich-text-display" dangerouslySetInnerHTML={{ __html: log.content }} />
            {log.images && log.images.length > 0 && (
                 <div className="absolute inset-0 z-10 pointer-events-none mt-8 ml-8">
                    <ImageCanvasReadOnly images={log.images} />
                </div>
            )}
          </div>
        </div>
      );
    }
    const visibleLogs = project.logs.filter(l => !l.isDeleted);
    return (
       <div className="space-y-6">
         <div className="flex justify-between items-center mb-4 no-print">
          <h3 className="text-xl font-bold text-gray-800">개발 일지</h3>
          <button onClick={handleAddLog} className="bg-primary text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-red-600 transition shadow-sm"><Plus size={16} /> 일지 작성</button>
        </div>
        <div className="border-t-2 border-gray-800 bg-white">
           {!editingLogId && <div className="flex bg-gray-100 p-3 text-sm font-bold text-center border-b border-gray-300 text-gray-600"><div className="w-16">No.</div><div className="flex-1">제목</div><div className="w-32">작성일</div></div>}
           {visibleLogs.length === 0 && !editingLogId && <div className="p-12 text-center text-gray-400">작성된 일지가 없습니다.</div>}
           {visibleLogs.map((log, index) => (
             editingLogId === log.id ? (
                <div key={log.id} className="py-4"><ItemEditor item={log} typeLabel="개발일지" onSave={(updates) => handleSaveLog(log.id, updates)} onCancel={() => setEditingLogId(null)} onDelete={() => handleDeleteLogRequest(log.id)} /></div>
             ) : (
                !editingLogId && (
                    <div key={log.id} className="flex p-4 text-sm border-b hover:bg-gray-50 cursor-pointer text-center group transition-colors" onClick={() => setViewingLogId(log.id)}>
                        <div className="w-16 text-gray-400 group-hover:text-gray-600">{visibleLogs.length - index}</div>
                        <div className="flex-1 text-left px-4 font-medium text-gray-700 truncate group-hover:text-primary transition-colors">{log.title}</div>
                        <div className="w-32 text-gray-400 group-hover:text-gray-600">{log.date}</div>
                    </div>
                )
             )
           ))}
        </div>
       </div>
    );
  };

  const renderRecipeSection = () => {
    if (isEditingRecipe) {
        const tempRecipe = project.recipe || { name: '', yield: '', ingredients: '', steps: [], mainImage: '' };
        return (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-bold text-2xl mb-6 pb-4 border-b text-gray-800">최종 레시피 작성</h3>
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">제품명</label><input id="recipe-name" defaultValue={tempRecipe.name} className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-primary outline-none" placeholder="예: 딸기 생크림 케이크" /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">분량</label><input id="recipe-yield" defaultValue={tempRecipe.yield} className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-primary outline-none" placeholder="예: 1호 1개" /></div>
                </div>
                <div className="mb-8">
                     <label className="block text-sm font-bold text-gray-700 mb-2">대표 사진</label>
                     <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300 text-center hover:border-primary transition-colors">
                        {editingRecipeImage ? (
                            <div className="relative inline-block group">
                                <img src={editingRecipeImage} alt="Main" className="h-64 rounded-lg object-cover shadow-sm" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2"><button onClick={() => setEditingRecipeImage(undefined)} className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow"><Trash2 size={16} /></button></div>
                            </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-primary py-8"><ImageIcon size={48} className="opacity-50" /><span className="font-medium">클릭하여 대표 사진 업로드</span><input type="file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files && e.target.files[0]) setEditingRecipeImage(await fileToBase64(e.target.files[0])); }} /></label>
                        )}
                    </div>
                </div>
                <div className="mb-8">
                    <label className="block text-sm font-bold text-gray-700 mb-2">재료 (Ingredients)</label>
                    <RichTextEditor value={tempRecipe.ingredients} onChange={(val) => {}} className="min-h-[150px]" />
                    <input type="hidden" id="recipe-ing-html" value={tempRecipe.ingredients} />
                </div>
                 <RecipeEditor initialSteps={tempRecipe.steps} onSave={(steps, ingredients) => {
                     const name = (document.getElementById('recipe-name') as HTMLInputElement).value;
                     const yieldVal = (document.getElementById('recipe-yield') as HTMLInputElement).value;
                     handleSaveRecipe({ name, yield: yieldVal, ingredients, steps, mainImage: editingRecipeImage });
                 }} onCancel={() => setIsEditingRecipe(false)} />
            </div>
        );
    }
    if (!project.recipe) return <div className="text-center py-20 bg-gray-50 rounded border border-dashed border-gray-300"><p className="text-gray-500 mb-4">작성된 레시피가 없습니다.</p><button onClick={() => setIsEditingRecipe(true)} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-600 transition shadow">레시피 작성하기</button></div>;
    return (
        <div className="bg-white p-10 shadow-sm max-w-4xl mx-auto border border-gray-100 rounded-lg print:border-none print:shadow-none printable-area">
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                 <div><h1 className="text-4xl font-bold text-gray-900 mb-3">{project.recipe.name}</h1><p className="text-gray-600 font-medium text-lg">분량: {project.recipe.yield}</p></div>
                 <div className="flex items-center gap-2 no-print">
                    <button onClick={() => handleShare()} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="레시피 공유"><Share2 size={20} /></button>
                    <button onClick={handlePrint} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="인쇄 / PDF 저장"><Printer size={20} /></button>
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <button onClick={() => { setEditingRecipeImage(project.recipe?.mainImage); setIsEditingRecipe(true); }} className="text-gray-400 hover:text-primary p-2 border border-gray-200 rounded hover:bg-gray-50 transition"><Edit3 size={20} /></button>
                 </div>
            </div>
            {project.recipe.mainImage && <div className="mb-10 w-full h-[400px] bg-gray-100 rounded-xl overflow-hidden shadow-sm"><img src={project.recipe.mainImage} alt={project.recipe.name} className="w-full h-full object-cover" /></div>}
            <div className="mb-10"><h3 className="text-xl font-bold text-primary mb-4 border-l-4 border-primary pl-3">INGREDIENTS</h3><div className="bg-orange-50/50 p-8 rounded-xl border border-orange-100 leading-relaxed text-gray-800 rich-text-display" dangerouslySetInnerHTML={{ __html: project.recipe.ingredients }} /></div>
            <div>
                <h3 className="text-xl font-bold text-primary mb-6 border-l-4 border-primary pl-3">INSTRUCTIONS</h3>
                <div className="space-y-8">
                    {project.recipe.steps.map((step, idx) => (
                        <div key={step.id} className="flex gap-6 items-start">
                             <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm mt-1">{idx+1}</div>
                             <div className="flex-1"><div className="text-gray-800 text-lg leading-relaxed rich-text-display" dangerouslySetInnerHTML={{ __html: step.description }} />{step.imageUrl && <img src={step.imageUrl} alt="step" className="mt-4 w-64 h-48 object-cover rounded-lg border border-gray-200 shadow-sm" />}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const getDeleteMessage = () => {
      if (!deleteTarget) return '';
      switch(deleteTarget.type) {
          case 'PROJECT': return '이 프로젝트를 휴지통으로 이동하시겠습니까?';
          case 'REPORT': return '이 리포트를 휴지통으로 이동하시겠습니까?';
          case 'LOG': return '이 일지를 휴지통으로 이동하시겠습니까?';
          default: return '';
      }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      <DeleteConfirmModal isOpen={!!deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} message={getDeleteMessage()} />
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white no-print">
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 text-sm text-gray-500"><span>디저트 개발 &gt;</span>{isEditingHeader ? (<select value={editCategory} onChange={(e) => setEditCategory(e.target.value as Category)} className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary outline-none">{Object.keys(CATEGORY_LABELS).map(cat => (<option key={cat} value={cat}>{CATEGORY_LABELS[cat as Category]}</option>))}</select>) : (<span>{CATEGORY_LABELS[project.category]}</span>)}</div>
            <div className="flex items-center gap-3">
                 {isEditingHeader ? (<div className="flex items-center gap-2 w-full max-w-lg"><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-2xl font-bold text-gray-900 border-b border-gray-300 focus:border-primary outline-none flex-1 py-1" autoFocus /><button onClick={handleSaveHeader} className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-red-600 transition whitespace-nowrap">저장</button><button onClick={() => setIsEditingHeader(false)} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-200 transition whitespace-nowrap">취소</button></div>) : (<div className="flex items-center gap-2 group"><h1 className="text-3xl font-bold text-gray-900 tracking-tight">{project.title}</h1><button onClick={() => setIsEditingHeader(true)} className="text-gray-300 hover:text-primary p-1 rounded-full hover:bg-gray-50 transition" title="제목 및 카테고리 수정"><Edit3 size={20} /></button></div>)}
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handleDeleteRequest} className="p-2.5 text-red-500 hover:bg-red-50 rounded-full transition-colors" title="프로젝트 삭제"><Trash2 size={20} /></button>
        </div>
      </div>
      <div className="flex border-b border-gray-200 px-8 no-print bg-white sticky top-0 z-10">{[ProjectTab.REPORT, ProjectTab.LOG, ProjectTab.RECIPE].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{tab}</button>))}</div>
      <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">{activeTab === ProjectTab.REPORT && renderReportSection()}{activeTab === ProjectTab.LOG && renderLogSection()}{activeTab === ProjectTab.RECIPE && renderRecipeSection()}</div>
      </div>
    </div>
  );
};

const DeleteConfirmModal: React.FC<{ isOpen: boolean, onConfirm: () => void, onCancel: () => void, message?: string }> = ({ isOpen, onConfirm, onCancel, message }) => {
  if (!isOpen) return null;
  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"><div className="bg-white p-6 rounded-lg shadow-xl w-80 text-center relative z-[10000]"><p className="font-bold text-lg mb-6 text-gray-800">{message || '사진을 지우시겠습니까?'}</p><div className="flex gap-4 justify-center"><button onClick={onConfirm} className="bg-primary text-white px-6 py-2 rounded hover:bg-red-600 transition">예</button><button onClick={onCancel} className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300 transition">아니오</button></div></div></div>, document.body);
};

const RecipeEditor: React.FC<{ initialSteps: RecipeStep[], onSave: (steps: RecipeStep[], ingredients: string) => void, onCancel: () => void }> = ({ initialSteps, onSave, onCancel }) => {
    const [steps, setSteps] = useState<RecipeStep[]>(initialSteps);
    const [ingredients, setIngredients] = useState<string>((document.getElementById('recipe-ing-html') as HTMLInputElement)?.value || '');
    useEffect(() => { const ingInput = document.getElementById('recipe-ing-html') as HTMLInputElement; if (ingInput) setIngredients(ingInput.value); }, []);
    const addStep = () => setSteps([...steps, { id: Date.now().toString(), description: '', imageUrl: '' }]);
    const updateStep = (id: string, field: keyof RecipeStep, value: string) => setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    const handleImageUpload = async (id: string, file: File) => {
        try {
            const url = await fileToBase64(file);
            updateStep(id, 'imageUrl', url);
        } catch(e) { console.error(e); }
    };
    const deleteStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));
    return (
        <div className="mt-8 border-t pt-8">
             <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-lg"><label className="block text-sm font-bold text-gray-700 mb-2">재료 (편집)</label><RichTextEditor value={ingredients} onChange={setIngredients} className="bg-white" /></div>
            <h4 className="font-bold mb-6 text-gray-800 text-lg">조리 순서 (Step by Step)</h4>
            <div className="space-y-6">{steps.map((step, idx) => (<div key={step.id} className="border border-gray-200 p-6 rounded-lg bg-white flex gap-6 items-start shadow-sm hover:border-gray-300 transition-colors"><span className="font-bold text-xl mt-1 w-8 text-primary flex-shrink-0">{idx + 1}.</span><div className="flex-1 space-y-4"><RichTextEditor value={step.description} onChange={(val) => updateStep(step.id, 'description', val)} className="w-full" /><div className="flex items-center gap-4">{step.imageUrl ? (<div className="relative group"><img src={step.imageUrl} alt="Step" className="h-32 w-48 object-cover rounded border border-gray-200" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center"><button onClick={() => updateStep(step.id, 'imageUrl', '')} className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow"><Trash2 size={14} /></button></div></div>) : (<label className="cursor-pointer text-sm bg-gray-50 border border-dashed border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"><ImageIcon size={18} /><span>참고 사진 추가</span><input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(step.id, e.target.files[0])} /></label>)}</div></div><button onClick={() => deleteStep(step.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={20} /></button></div>))}</div>
            <button onClick={addStep} className="mt-6 w-full py-4 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors font-bold flex items-center justify-center gap-2"><Plus size={20} /> 단계 추가하기</button>
            <div className="flex justify-end gap-3 mt-10 border-t pt-6"><button onClick={onCancel} className="px-8 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition">취소</button><button onClick={() => onSave(steps, ingredients)} className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-red-600 shadow-lg font-bold transition">저장 완료</button></div>
        </div>
    );
};

export default ProjectDetail;