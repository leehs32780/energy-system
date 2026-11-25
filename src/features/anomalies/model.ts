export type Anomaly = {id:string;siteId:string;title:string;asset:string;severity:'높음'|'주의';energy:string;current:string;baseline:string;impact:string;reason:string;action:string;status:string};
export const anomalies: Anomaly[] = [
 {id:'a1',siteId:'pyeongtaek',title:'야간 공기압축기 베이스로드 과다',asset:'생산동 A · 공기압축기',severity:'높음',energy:'전기',current:'186 kWh/일',baseline:'124 kWh/일',impact:'약 31만원/월',reason:'최근 야간 평균이 기준 대비 50% 높습니다.',action:'누기 및 압축기 대기 운전을 점검하세요.',status:'검토 중'},
 {id:'a2',siteId:'incheon',title:'야간 지속 유량 · 누수 의심',asset:'냉동창고 · 수도 계량기',severity:'높음',energy:'수도',current:'4.8 m³/시간',baseline:'2.1 m³/시간',impact:'약 23만원/월',reason:'야간 최소 유량이 기준보다 지속적으로 높습니다.',action:'배관과 밸브의 누수 여부를 확인하세요.',status:'신규'},
 {id:'a3',siteId:'seoul',title:'주말 사무동 전력 사용량 증가',asset:'사무동 · 전력 계량기',severity:'주의',energy:'전기',current:'1,480 kWh/일',baseline:'1,120 kWh/일',impact:'약 12만원/월',reason:'최근 주말 사용량이 기준 대비 32% 높습니다.',action:'공조 운전 일정과 잔류 부하를 확인하세요.',status:'신규'},
 {id:'a4',siteId:'incheon',title:'계량기 데이터 누락',asset:'냉동창고 · 수도 계량기',severity:'주의',energy:'수도',current:'1일 누락',baseline:'일 1회 수집',impact:'집계 불확실',reason:'예정된 수집 구간에 값이 없습니다.',action:'통신 상태와 수집 이력을 확인하세요.',status:'검토 중'},
];
