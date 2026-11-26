export type Measure = {id:string;siteId:string;title:string;owner:string;status:string;expected:number;verified:number|null;note:string;dataSource?:'simulation'|'demo-seed'|'csv-import'};
export const measures: Measure[] = [
 {id:'m1',siteId:'pyeongtaek',title:'공기압축기 야간 운전 최적화',owner:'김민준',status:'검증 대기',expected:4200000,verified:3180000,note:'동일 요일 기준 사용량 비교 · 추가 관찰 필요'},
 {id:'m2',siteId:'seoul',title:'사무동 공조 스케줄 조정',owner:'이서연',status:'진행 중',expected:2800000,verified:null,note:'관측 기간이 충분하지 않아 효과 미확인'},
 {id:'m3',siteId:'incheon',title:'냉동창고 피크 부하 분산',owner:'박지훈',status:'계획됨',expected:6100000,verified:null,note:'실행 전 예상 절감액'},
];
