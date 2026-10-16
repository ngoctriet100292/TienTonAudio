"use client";
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { getErrorMessage } from '@/lib/errors';
import { useState } from 'react';
export const field = 'w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400';
export const button = 'inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed';
export const card = 'rounded-2xl border border-white/10 bg-slate-900/70 p-5 space-y-4';
export function Access({children,admin=false,studio=false}:{children:React.ReactNode;admin?:boolean;studio?:boolean}) {
 const {user,isAuthenticated,isLoading} = useAuth();
 if(isLoading) return <p className="p-10">Đang tải tài khoản…</p>;
 if(!isAuthenticated) return <div className={card}><h1 className="text-xl font-bold">Đăng nhập để tiếp tục</h1><Link className={button} href="/login">Đăng nhập</Link></div>;
 if((admin && user?.role!=='admin') || (studio && !['admin','partner','creator','narrator'].includes(user?.role||''))) return <p role="alert">Bạn chưa có quyền truy cập khu vực này.</p>;
 return children;
}
export function useAction() {
 const [busy,setBusy]=useState(false); const [notice,setNotice]=useState('');
 async function run(work:()=>Promise<unknown>,done?:()=>void){setBusy(true);setNotice('');try{await work();setNotice('Đã lưu thành công.');done?.();}catch(e){setNotice(getErrorMessage(e));}finally{setBusy(false);}}
 return {busy,run,notice};
}
export function Notice({text}:{text:string}) {return text ? <p role="status" className="rounded-xl border border-amber-400/25 p-3 text-sm text-amber-200">{text}</p>:null;}
