
export type Category = 'DESSERT' | 'BEVERAGE' | 'OTHER';

export enum ProjectTab {
  REPORT = 'REPORT',
  LOG = 'LOG',
  RECIPE = 'RECIPE'
}

export interface ImageItem {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isCropped: boolean; 
  cropX?: number; // Offset of image inside container
  cropY?: number;
  originalWidth?: number; // Dimensions of the image inside the crop frame
  originalHeight?: number;
}

export interface Report {
  id: string;
  title: string;
  content: string;
  date: string;
  images: ImageItem[];
  isDeleted: boolean;
}

export interface DevelopmentLog {
  id: string;
  title: string;
  content: string;
  date: string;
  images: ImageItem[];
  isDeleted: boolean;
}

export interface RecipeStep {
  id: string;
  description: string;
  imageUrl?: string;
}

export interface Recipe {
  name: string;
  yield: string;
  ingredients: string;
  steps: RecipeStep[];
  mainImage?: string;
}

export interface Project {
  id: string;
  title: string;
  category: Category;
  coverImage?: string;
  createdAt: string;
  reports: Report[];
  logs: DevelopmentLog[];
  recipe: Recipe | null;
  isDeleted: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  view: string;
}
