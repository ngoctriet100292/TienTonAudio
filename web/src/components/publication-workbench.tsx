'use client';

import {Suspense,useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useAuth} from '@/context/auth-context';
import {useAsyncResource} from '@/lib/use-async-resource';
import {usePagedResource} from '@/lib/use-paged-resource';
import {Page,pagePath} from '@/lib/pagination';
import {platform,Publication,PublicationChapter} from '@/lib/platform';
import {Access,card,button,field,Notice,useAction} from './platform-ui';
import {Pagination} from './pagination';
import {DraftEditor} from './draft-editor';

const labels:Record<string,string>={draft:'Bản nháp',pending:'Chờ duyệt',published:'Đã xuất bản',scheduled:'Đã lên lịch'};
export function PublicationWorkbench({admin=false}:{admin?:boolean}){
 return <main className="mx-auto max-w-6xl p-4 py-10"><Suspense fallback={<p>Đang tải Studio…</p>}><Access admin={admin} studio><Workbench admin={admin}/></Access></Suspense></main>;
}
function Workbench({admin}:{admin:boolean}){
 const {user}=useAuth();const params=useSearchParams();const action=useAction();
 const[selected,setSelected]=useState(()=>params.get('story')||'');const[editor,setEditor]=useState<string|null>(()=>params.get('chapter'));
 const[dirty,setDirty]=useState(false);const dirtyRef=useRef(false);
 const[filter,setFilter]=useState({q:'',status:''});const[chapterFilter,setChapterFilter]=useState({q:'',status:''});
 const list=usePagedResource(`publications:${user?.id}:${filter.q}:${filter.status}`,page=>platform<Page<Publication>>(pagePath(`/partner/publications?${new URLSearchParams(filter)}`,page)));
 const detail=useAsyncResource(selected?`publication:${selected}`:null,()=>platform<Publication>(`/partner/stories/${selected}/publication`),null);
 const chapters=usePagedResource(selected?`publication-chapters:${selected}:${chapterFilter.q}:${chapterFilter.status}`:null,page=>platform<Page<PublicationChapter>>(pagePath(`/partner/stories/${selected}/publication-chapters?${new URLSearchParams(chapterFilter)}`,page)));
 const story=detail.data;
 function markDirty(value:boolean){dirtyRef.current=value;setDirty(value);}
 function closeEditor(){if(dirtyRef.current&&!window.confirm('Bản thảo có thay đổi chưa lưu. Bạn muốn đóng và bỏ các thay đổi này?'))return false;markDirty(false);setEditor(null);return true;}
 function openEditor(id:string){if(editor!==id&&!closeEditor())return;setEditor(id);}
 function changed(){detail.reload();chapters.reload();list.reload();}
 async function bulk(form:HTMLFormElement){
  const file=new FormData(form).get('chapters') as File;if(file.size>8*1024*1024)throw new Error('Tệp tối đa 8 MB.');
  const data:unknown=JSON.parse(await file.text());if(!Array.isArray(data))throw new Error('Tệp phải chứa một mảng chương.');
  await platform(`/partner/stories/${selected}/bulk-drafts`,'POST',{chapters:data});form.reset();changed();
 }
 return <div className="space-y-6">
  <header><p className="text-sm text-amber-400">STUDIO · QUY TRÌNH XUẤT BẢN</p><h1 className="text-3xl font-bold mt-2">{admin?'Duyệt nội dung':'Bản nháp & xuất bản'}</h1><div className="flex flex-wrap gap-5 text-amber-300 mt-3"><Link href="/studio">Quản lý truyện & audio</Link><Link href="/studio/analytics">Thống kê tác phẩm</Link></div></header>
  <Notice text={action.notice}/>
  <section className={card}>
   <h2 className="text-xl font-semibold">Tác phẩm</h2>
   <Filters initial={filter} onApply={setFilter} label="truyện"/>
   {list.error?<p role="alert">Không tải được danh sách. <button onClick={list.reload}>Thử lại</button></p>:null}
   <label className="block">Chọn truyện<select className={field} value={selected} onChange={e=>{if(closeEditor()){setSelected(e.target.value);setChapterFilter({q:'',status:''});}}}><option value="">Chọn tác phẩm</option>{story&&!list.data.items.some(s=>s.id===story.id)&&<option value={story.id}>{story.title} · {labels[story.publication_status]}</option>}{list.data.items.map(s=><option key={s.id} value={s.id}>{s.title} · {labels[s.publication_status]}</option>)}</select></label>
   <Pagination data={list.data} onChange={list.goTo} loading={list.loading} label="tác phẩm"/>
  </section>
  {detail.error?<p role="alert">Không tải được tác phẩm. <button onClick={detail.reload}>Thử lại</button></p>:null}
  {detail.loading?<p>Đang tải tác phẩm…</p>:null}
  {story&&<>
   <section className={card}><h2 className="text-xl font-semibold">{story.title}</h2><p className="text-sm text-slate-400">{labels[story.publication_status]} · {story.owner_name}</p>{story.review_reason&&<p className="text-amber-200">Lý do trả bài: {story.review_reason}</p>}<ModerationControls key={`${story.id}:${story.publication_status}`} id={story.id} kind="stories" status={story.publication_status} admin={admin} disabled={dirty} changed={()=>{setEditor(null);changed();}}/></section>
   {editor&&<DraftEditor key={editor} chapterId={editor} storyId={story.id} onClose={()=>{closeEditor();}} onDirty={markDirty} onSaved={()=>{chapters.reload();}} onSubmitted={()=>{markDirty(false);setEditor(null);changed();}}/>}
   <section className={card}>
    <h2 className="text-xl font-semibold">Danh sách chương</h2><Filters key={selected} initial={chapterFilter} onApply={setChapterFilter} label="chương" scheduled/>
    {dirty&&<p className="text-amber-200 text-sm">Hãy lưu xong bản thảo trước khi đổi trạng thái xuất bản.</p>}
    {chapters.error?<p role="alert">Không tải được chương. <button onClick={chapters.reload}>Thử lại</button></p>:chapters.loading?<p>Đang tải…</p>:chapters.data.items.length===0?<p className="text-slate-400">Chưa có chương phù hợp.</p>:chapters.data.items.map(c=><article key={c.id} className="space-y-3 border-t border-white/10 pt-4"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-medium">{c.chapter_number}. {c.title}</h3><span className="text-amber-300 text-sm">{labels[c.publication_status]}{c.scheduled_at&&` · ${new Date(c.scheduled_at).toLocaleString('vi-VN')}`}</span></div>{c.review_reason&&<p className="text-sm text-amber-200">Lý do trả bài: {c.review_reason}</p>}<button className={button} onClick={()=>openEditor(c.id)}>{c.publication_status==='draft'?'Biên tập bản nháp':'Xem bản thảo'}</button><ModerationControls key={`${c.id}:${c.publication_status}`} id={c.id} kind="chapters" status={c.publication_status} admin={admin} disabled={dirty} changed={()=>{setEditor(null);changed();}}/></article>)}
    <Pagination data={chapters.data} onChange={chapters.goTo} loading={chapters.loading} label="chương"/>
   </section>
   <form className={card} onSubmit={e=>{e.preventDefault();const form=e.currentTarget;void action.run(()=>bulk(form));}}>
    <h2 className="text-xl font-semibold">Nhập nhiều chương nháp</h2><p className="text-sm text-slate-400">Tệp JSON tối đa 8 MB, 500 chương/lần. Nếu có chương trùng số, toàn bộ lần nhập được hủy.</p><pre className="overflow-x-auto rounded-xl bg-black/25 p-3 text-xs">{'[{"chapter_number": 1, "title": "Khởi đầu", "content": "Nội dung chương…", "is_premium": false}]'}</pre><label className="block">Tệp chương<input className={field} type="file" name="chapters" accept="application/json,.json" required/></label><button className={button} disabled={action.busy}>Nhập bản nháp</button>
   </form>
  </>}
 </div>;
}
function Filters({initial,onApply,label,scheduled=false}:{initial:{q:string;status:string};onApply:(value:{q:string;status:string})=>void;label:string;scheduled?:boolean}){
 return <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);onApply({q:String(f.get('q')||''),status:String(f.get('status')||'')});}}><label className="block flex-1 min-w-40">Tìm {label}<input className={field} name="q" defaultValue={initial.q} placeholder={`Tên ${label}`}/></label><label className="block">Trạng thái<select className={field} name="status" defaultValue={initial.status}><option value="">Tất cả</option>{Object.entries(labels).filter(([key])=>scheduled||key!=='scheduled').map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className={button}>Lọc</button></form>;
}
function ModerationControls({id,kind,status,admin,disabled,changed}:{id:string;kind:'stories'|'chapters';status:string;admin:boolean;disabled:boolean;changed:()=>void}){
 const action=useAction();const[reason,setReason]=useState('');
 async function change(next:string,scheduled_at?:string){
  if(admin&&next==='draft'&&status!=='draft'&&reason.trim().length<5)throw new Error('Ghi lý do trả bài ít nhất 5 ký tự.');
  await platform(`/partner/${kind}/${id}/publication`,'PUT',{status:next,...(admin&&next==='draft'?{reason}:{}),...(scheduled_at?{scheduled_at}: {})});changed();
 }
 const blocked=disabled||action.busy||(!admin&&['published','scheduled'].includes(status));
 return <div className="space-y-3"><Notice text={action.notice}/>{admin&&status!=='draft'&&<label className="block text-sm">Lý do trả về nháp<textarea className={field} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Nêu rõ phần tác giả cần chỉnh sửa"/></label>}<div className="flex flex-wrap gap-2">{(admin?['draft','published']:['draft','pending']).map(next=><button type="button" key={next} className={button} disabled={blocked||status===next} onClick={()=>{void action.run(()=>change(next));}}>{next==='draft'?(admin?'Trả về nháp':'Rút về nháp'):next==='published'?'Duyệt & xuất bản':'Gửi duyệt'}</button>)}</div>{admin&&kind==='chapters'&&<form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const value=String(new FormData(e.currentTarget).get('schedule'));void action.run(()=>change('scheduled',new Date(value).toISOString()));}}><label className="flex-1 min-w-40">Thời gian xuất bản<input className={field} type="datetime-local" name="schedule" required/></label><button className={button} disabled={blocked}>Lên lịch</button></form>}</div>;
}
