"use client";
import {usePagedResource} from '@/lib/use-paged-resource';
import {Page,pagePath} from '@/lib/pagination';
import {Pagination} from './pagination';
import {useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/context/auth-context';
import {useAsyncResource} from '@/lib/use-async-resource';
import {platform} from '@/lib/platform';
import {card,button,field,Notice,useAction} from './platform-ui';
type Review={id:string;user_id:string;username:string;rating:number;content:string};
export function StoryEngagement({storyId}:{storyId:string}){
 const {user}=useAuth();const action=useAction();const[rating,setRating]=useState('5');const[content,setContent]=useState('');
 const reviews=usePagedResource(`reviews:${storyId}`,page=>platform<Page<Review>>(pagePath(`/stories/${storyId}/reviews`,page)));
 const follow=useAsyncResource(user?`follow:${storyId}:${user.id}`:null,()=>platform<{following:boolean}>(`/stories/${storyId}/follow`),{following:false});
 return <section className={card}><div className="flex flex-wrap justify-between items-center gap-4"><h2 className="text-xl font-bold">Đánh giá & theo dõi</h2>{user?<button className={button} disabled={action.busy||follow.loading||!!follow.error} onClick={()=>action.run(()=>platform(`/stories/${storyId}/follow`,follow.data.following?'DELETE':'PUT'),follow.reload)}>{follow.data.following?'Đang theo dõi · Bỏ theo dõi':'Theo dõi truyện'}</button>:<Link href="/login" className={button}>Đăng nhập để theo dõi</Link>}</div><Notice text={action.notice}/>{reviews.error?<p role="alert">Không tải được đánh giá. <button onClick={reviews.reload}>Thử lại</button></p>:null}
 {user&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();void action.run(()=>platform(`/stories/${storyId}/reviews`,'PUT',{rating:Number(rating),content}),reviews.reload);}}><label>Điểm đánh giá<select className={field} value={rating} onChange={e=>setRating(e.target.value)}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} sao</option>)}</select></label><label>Cảm nhận của bạn<textarea className={field} rows={3} maxLength={4000} value={content} onChange={e=>setContent(e.target.value)}/></label><button className={button} disabled={action.busy}>Lưu đánh giá</button><p className="text-xs text-slate-400">Mỗi tài khoản có một đánh giá; gửi lại để cập nhật.</p></form>}
 {reviews.loading?<p>Đang tải…</p>:reviews.data.items.length===0?<p className="text-slate-400">Hãy là người đầu tiên chia sẻ cảm nhận.</p>:reviews.data.items.map(r=><article className="border-t border-white/10 pt-4" key={r.id}><p><strong>{r.username}</strong><span className="text-amber-400 ml-3">{'★'.repeat(r.rating)}</span></p><p className="whitespace-pre-wrap break-words mt-2 text-slate-300">{r.content}</p>{user?.id===r.user_id&&<button disabled={action.busy} className="text-sm text-slate-400 mt-2" onClick={()=>action.run(()=>platform(`/stories/${storyId}/reviews`,'DELETE'),reviews.reload)}>Xóa đánh giá của tôi</button>}</article>)}<Pagination data={reviews.data} onChange={reviews.goTo} loading={reviews.loading} label="đánh giá"/></section>;
}
