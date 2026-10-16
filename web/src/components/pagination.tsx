'use client';
import {Page} from '@/lib/pagination';
export function Pagination({data,onChange,loading=false,label='danh sách'}:{data:Page<unknown>;onChange:(page:number)=>void;loading?:boolean;label?:string}){
 return <nav aria-label={`Phân trang ${label}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm"><p className="text-slate-400">{data.total.toLocaleString('vi-VN')} mục · Trang {data.page}/{data.total_pages}</p><div className="flex gap-2"><button type="button" disabled={loading||data.page<=1} onClick={()=>onChange(data.page-1)} className="rounded-xl border border-white/15 px-3 py-2 hover:border-amber-400 disabled:opacity-40">Trước</button><button type="button" disabled={loading||data.page>=data.total_pages} onClick={()=>onChange(data.page+1)} className="rounded-xl border border-white/15 px-3 py-2 hover:border-amber-400 disabled:opacity-40">Sau</button></div></nav>;
}
