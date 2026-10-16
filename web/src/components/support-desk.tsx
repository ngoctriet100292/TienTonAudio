'use client';

import {useState} from 'react';
import {useAuth} from '@/context/auth-context';
import {usePagedResource} from '@/lib/use-paged-resource';
import {Page,pagePath} from '@/lib/pagination';
import {platform,Ticket,Message} from '@/lib/platform';
import {Access,card,button,field,Notice,useAction} from './platform-ui';
import {Pagination} from './pagination';

const statuses:Record<string,string>={open:'Mới gửi',in_progress:'Đang xử lý',resolved:'Đã giải quyết'};
export function SupportDesk({admin=false}:{admin?:boolean}){
 return <main className="mx-auto max-w-5xl p-4 py-10"><Access admin={admin}><Desk admin={admin}/></Access></main>;
}
function Desk({admin}:{admin:boolean}){
 const {user}=useAuth();const action=useAction();
 const[selected,setSelected]=useState<Ticket|null>(null);
 const[status,setStatus]=useState('');
 const tickets=usePagedResource(`tickets:${user?.id}:${status}`,page=>platform<Page<Ticket>>(pagePath(`/support/tickets?status=${status}`,page)));
 async function create(form:HTMLFormElement){
  const f=new FormData(form);
  await platform('/support/tickets','POST',{subject:f.get('subject'),category:f.get('category'),content:f.get('content'),payment_id:f.get('payment_id')||null});
  form.reset();tickets.goTo(1);tickets.reload();
 }
 const active=selected?tickets.data.items.find(t=>t.id===selected.id)||selected:null;
 return <div className="space-y-6">
  <h1 className="text-3xl font-bold">{admin?'Quản lý yêu cầu hỗ trợ':'Trung tâm hỗ trợ'}</h1>
  <Notice text={action.notice}/>
  {!admin&&<form className={card} onSubmit={e=>{e.preventDefault();const form=e.currentTarget;void action.run(()=>create(form));}}>
   <h2 className="text-xl font-semibold">Gửi yêu cầu mới</h2>
   <label className="block">Tiêu đề<input className={field} name="subject" required minLength={3} maxLength={200}/></label>
   <label className="block">Phân loại<select name="category" className={field}>{[['usage','Sử dụng ứng dụng'],['payment','Thanh toán'],['copyright','Bản quyền'],['bug','Báo lỗi'],['other','Khác']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label className="block">Mã đơn thanh toán (nếu có)<input className={field} name="payment_id" placeholder="Mã đơn trong lịch sử thanh toán"/></label>
   <label className="block">Nội dung<textarea name="content" className={field} rows={4} required minLength={10} maxLength={4000}/></label>
   <button className={button} disabled={action.busy}>Gửi yêu cầu</button>
  </form>}
  <div className="grid gap-5 md:grid-cols-2">
   <section className={card}>
    <h2 className="text-xl font-semibold">Các yêu cầu</h2>
    <label className="block">Trạng thái<select className={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {tickets.error?<p role="alert">Không tải được danh sách. <button onClick={tickets.reload}>Thử lại</button></p>:tickets.loading?<p>Đang tải…</p>:tickets.data.items.length===0?<p className="text-slate-400">Chưa có yêu cầu phù hợp.</p>:tickets.data.items.map(t=><button onClick={()=>setSelected(t)} className={`w-full text-left rounded-xl p-3 border ${selected?.id===t.id?'border-amber-400':'border-white/10'}`} key={t.id}><strong>{t.subject}</strong><p className="text-sm text-slate-400">{t.username} · {statuses[t.status]}</p></button>)}
    <Pagination data={tickets.data} onChange={tickets.goTo} loading={tickets.loading} label="yêu cầu hỗ trợ"/>
   </section>
   {active?<Thread key={active.id} ticket={active} admin={admin} changed={tickets.reload}/>:<section className={card}><h2 className="text-xl font-semibold">Nội dung trao đổi</h2><p className="text-slate-400">Chọn một yêu cầu để đọc và trả lời.</p></section>}
  </div>
 </div>;
}
function Thread({ticket,admin,changed}:{ticket:Ticket;admin:boolean;changed:()=>void}){
 const action=useAction();
 const messages=usePagedResource(`messages:${ticket.id}`,page=>platform<Page<Message>>(pagePath(`/support/tickets/${ticket.id}/messages`,page)));
 async function reply(form:HTMLFormElement){
  const f=new FormData(form);await platform(`/support/tickets/${ticket.id}/messages`,'POST',{content:f.get('content'),...(admin?{status:f.get('status')}: {})});
  form.reset();messages.goTo(1);messages.reload();changed();
 }
 return <section className={card}>
  <h2 className="text-xl font-semibold">{ticket.subject}</h2>
  <p className="text-xs text-slate-400 break-all">Mã yêu cầu: {ticket.id}{ticket.payment_id&&` · Mã đơn: ${ticket.payment_id}`}</p>
  <p className="text-sm text-amber-300">{statuses[ticket.status]}</p><Notice text={action.notice}/>
  {messages.error?<p role="alert">Không tải được trao đổi. <button onClick={messages.reload}>Thử lại</button></p>:messages.loading?<p>Đang tải…</p>:<div className="max-h-96 overflow-y-auto space-y-4">{[...messages.data.items].reverse().map(m=><article className="rounded-xl bg-white/5 p-3" key={m.id}><p className="text-xs text-amber-300">{m.username} · {new Date(m.created_at).toLocaleString('vi-VN')}</p><p className="whitespace-pre-wrap break-words mt-2">{m.content}</p></article>)}</div>}
  <p className="text-xs text-slate-400">Trang 1 hiển thị các tin mới nhất; chọn Sau để đọc tin cũ hơn.</p>
  <Pagination data={messages.data} onChange={messages.goTo} loading={messages.loading} label="tin nhắn hỗ trợ"/>
  {admin||ticket.status!=='resolved'?<form key={`${ticket.id}:${ticket.status}`} onSubmit={e=>{e.preventDefault();const form=e.currentTarget;void action.run(()=>reply(form));}} className="space-y-3">
   <label className="block">Phản hồi<textarea className={field} name="content" required maxLength={4000}/></label>
   {admin&&<label className="block">Trạng thái<select className={field} name="status" defaultValue={ticket.status}>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
   <button disabled={action.busy} className={button}>Gửi phản hồi</button>
  </form>:<p className="text-slate-400">Yêu cầu đã được giải quyết. Bạn có thể gửi yêu cầu mới nếu cần hỗ trợ thêm.</p>}
 </section>;
}
