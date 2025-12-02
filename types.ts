
export enum StyleOption {
  Transitional = 'Transitional',
  Japandi = 'Japandi',
  MidCentury = 'Mid-Century Modern',
  OrganicModern = 'Organic Modern',
  Farmhouse = 'Farmhouse',
  InstaTrendy = 'Insta-Trendy (Current Viral)',
  SurpriseMe = 'Surprise Me!',
}

export enum CategoryOption {
  FurnitureFlipping = 'Furniture Flipping',
  RoomRefresh = 'Room Refresh Ideas',
}

export interface ProjectPlan {
  styleSummary: string;
  steps: string[];
  costEstimate: string;
  timeEstimate: string;
  materials: string[];
  tools: string[];
  safety: string[];
  itemDescription: string;
}

export interface GeneratedResult {
  type: 'standard';
  plan: ProjectPlan;
  inspirationImages: string[]; // Base64 strings
}

export interface SurpriseResult {
  type: 'surprise';
  itemDescription: string;
  suggestions: {
    style: string;
    image: string;
  }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AppState = 'upload' | 'analyzing' | 'results' | 'error';
