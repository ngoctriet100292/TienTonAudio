export type Page<T> = {items:T[];total:number;page:number;limit:number;total_pages:number};
export function emptyPage<T>(page=1,limit=20):Page<T>{return{items:[],total:0,page,limit,total_pages:1};}
export function pagePath(path:string,page:number,limit=20):string{return `${path}${path.includes('?')?'&':'?'}page=${page}&limit=${limit}`;}
