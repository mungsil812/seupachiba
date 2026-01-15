import React, { useState } from 'react';
import { Category, Project } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface NewProductProps {
  onCreate: (project: Project) => void;
  onCancel: () => void;
}

const NewProduct: React.FC<NewProductProps> = ({ onCreate, onCancel }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('DESSERT');
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('상품명을 입력해주세요.');
      return;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      title,
      category,
      coverImage,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      reports: [],
      logs: [],
      recipe: null
    };

    onCreate(newProject);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 bg-white shadow-lg rounded-lg mt-4 md:mt-10 mb-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">새 상품 기획</h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-lg font-bold text-gray-700 mb-2">상품명</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg p-4 text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
            placeholder="예: 얼그레이 파운드 케이크"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-lg font-bold text-gray-700 mb-2">카테고리</label>
              <div className="flex flex-col gap-3">
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                  <label key={cat} className={`
                    flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition select-none hover:shadow-sm
                    ${category === cat ? 'bg-primary/5 border-primary text-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}
                  `}>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${category === cat ? 'border-primary' : 'border-gray-300'}`}>
                        {category === cat && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={category === cat}
                      onChange={() => setCategory(cat)}
                      className="hidden"
                    />
                    <span className="font-medium text-lg">{CATEGORY_LABELS[cat]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-lg font-bold text-gray-700 mb-2">대표 사진 (선택)</label>
              <div className="mt-1 flex flex-col justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary transition cursor-pointer relative bg-gray-50 h-[300px]">
                 <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleImageChange} accept="image/*" />
                 <div className="text-center">
                    {coverImage ? (
                        <div className="relative h-full w-full flex items-center justify-center">
                             <img src={coverImage} alt="Preview" className="h-64 object-contain rounded shadow-sm" />
                             <p className="absolute bottom-2 bg-black/50 text-white px-2 py-1 rounded text-xs">클릭하여 변경</p>
                        </div>
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center justify-center h-full">
                            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p className="text-sm font-medium">클릭하여 이미지를 업로드하세요</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                        </div>
                    )}
                 </div>
              </div>
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-8">
          <button type="button" onClick={onCancel} className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition">
            취소
          </button>
          <button type="submit" className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-red-600 shadow-md font-bold transition">
            프로젝트 생성
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewProduct;