export const number = (value:number, digits=0) => new Intl.NumberFormat('ko-KR',{maximumFractionDigits:digits}).format(value);
export const won = (value:number) => `${number(value)}원`;
