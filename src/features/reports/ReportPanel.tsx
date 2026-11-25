'use client';
import {useState} from 'react';
export function ReportPanel({site,days}:{site:string;days:number}){
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function download(){setBusy(true);setMessage('');try{const response=await fetch(`/api/v1/reports/energy?site=${encodeURIComponent(site)}&days=${days}`);if(!response.ok)throw new Error('보고서를 생성하지 못했습니다.');const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='energy-report.csv';document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);setMessage('현재 범위의 CSV 보고서를 저장했습니다.');}catch(error){setMessage(error instanceof Error?error.message:'보고서를 생성하지 못했습니다.');}finally{setBusy(false);}}
 return <section className="card import-panel"><h2>에너지 사용 현황 보고서</h2><p className="note">상단 사업장·기간 필터를 적용한 에너지원별 사용량과 데이터 품질 건수를 CSV로 저장합니다. 금액은 데모 단가로 계산한 추정치입니다.</p><button className="primary" disabled={busy} onClick={()=>void download()}>{busy?'생성 중…':'CSV 보고서 다운로드'}</button><p role="status" className="note">{message}</p></section>;
}
