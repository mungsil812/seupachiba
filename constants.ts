import { Category, Project } from './types';

export const PLACEHOLDER_HOME_IMAGES = [
  'https://i.postimg.cc/gJQnWgz3/canva-gourmet-chocolate-dessert-assortment-MAGhz-Wyr-ZKE.jpg',
  'https://i.postimg.cc/vBkcs0Yx/Delicious-dessert-cake-strawberry-cherry-berries-1920x1200.jpg',
  'https://i.postimg.cc/B6kX0mS5/jeobsie-aiseukeulimgwa-gas-guun-mas-issneun-hobag-chokollis-beula-uniui-geunjeob-chwal-yeong.jpg',
  'https://i.postimg.cc/MTNvS96d/mille-feuille.jpg',
  'https://i.postimg.cc/1t2fQvm7/photo-1551024506-0bccd828d307.jpg',
  'https://i.postimg.cc/4dqmgWf6/teibeul-e-dijeoteu.jpg',
  'https://i.postimg.cc/0QFbsVkD/ttalgiwa-hamkke-sang-wi-byu-mas-issneun-dijeoteu.jpg',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  DESSERT: '디저트',
  BEVERAGE: '음료',
  OTHER: '기타',
};

// Initial Mock Data
export const INITIAL_PROJECTS: Project[] = [
  {
    id: '1',
    title: '딸기 듬뿍 생크림 케이크',
    category: 'DESSERT',
    createdAt: new Date().toISOString(),
    isDeleted: false,
    coverImage: 'https://picsum.photos/400/300?random=10',
    reports: [
      { id: 'r1', title: '1차 시장 분석', date: '2023-10-01', content: '아이디어스 내 딸기 케이크 판매량 분석 결과...', images: [], isDeleted: false },
      { id: 'r2', title: '2차 타겟층 분석', date: '2023-10-05', content: '20-30대 여성 타겟 마케팅 전략 수립 필요.', images: [], isDeleted: false }
    ],
    logs: [
      { id: 'l1', title: '첫 번째 시트 테스트', date: '2023-10-10', content: '제누와즈 공립법으로 시도했으나 기포 정리가 덜 되어 거친 식감이 나왔다.', images: [], isDeleted: false }
    ],
    recipe: {
      name: '딸기 생크림 케이크',
      yield: '1호 1개',
      ingredients: '달걀 150g, 설탕 110g, 박력분 100g, 버터 30g, 우유 45g',
      steps: [
        { id: 's1', description: '볼에 달걀을 풀고 설탕을 넣어 중탕으로 온도를 높인다.', imageUrl: 'https://picsum.photos/200/200?random=11' },
        { id: 's2', description: '핸드믹서 고속으로 아이보리색이 날 때까지 휘핑한다.', imageUrl: '' }
      ]
    }
  },
  {
    id: '2',
    title: '제주 말차 라떼 베이스',
    category: 'BEVERAGE',
    createdAt: new Date().toISOString(),
    isDeleted: false,
    reports: [],
    logs: [],
    recipe: null
  }
];