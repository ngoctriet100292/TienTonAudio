'use client';

import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {platform,ChapterDraft} from '@/lib/platform';
import {useAsyncResource} from '@/lib/use-async-resource';
import {ApiError,getErrorMessage} from '@/lib/errors';
import {button,card,field,Notice} from './platform-ui';

type Props={chapterId:string;storyId:string;onClose:()=>void;onDirty:(dirty:boolean)=>void;onSaved:()=>void;onSubmitted:()=>void};
export function DraftEditor(props:Props){
 const resource=useAsyncResource(`draft:${props.chapterId}`,()=>platform<ChapterDraft>(`/partner/chapters/${props.chapterId}/draft`),null);
 if(resource.loading)return <section className={card}>Đang tải bản thảo…</section>;
 if(resource.error||!resource.data||resource.data.story_id!==props.storyId)return <section className={card}><p role="alert">Không tải được bản thảo. Nội dung chưa được thay đổi.</p><button className={button} onClick={resource.reload}>Thử lại</button></section>;
 return <EditorForm key={`${resource.data.id}:${resource.data.version}`} initial={resource.data} {...props} reload={()=>{
  if(window.confirm('Tải lại sẽ thay bản đang soạn bằng bản trên máy chủ. Bạn có thể tải bản đang soạn về trước.')){props.onDirty(false);resource.reload();}
 }}/>;
}
type Fields=Pick<ChapterDraft,'title'|'content'|'chapter_number'|'is_premium'>;
function EditorForm({initial,reload,...props}:Props&{initial:ChapterDraft;reload:()=>void}){
 const[start]=useState<Fields>({title:initial.title,content:initial.content,chapter_number:initial.chapter_number,is_premium:initial.is_premium});
 const[form,setForm]=useState(start);const[preview,setPreview]=useState(false);const[notice,setNotice]=useState('');
 const[busy,setBusy]=useState(false);const[submitting,setSubmitting]=useState(false);const[conflict,setConflict]=useState(false);const[savedSnapshot,setSavedSnapshot]=useState(JSON.stringify(start));
 const live=useRef(start);const saved=useRef(JSON.stringify(start));const version=useRef(initial.version);const pending=useRef<Promise<boolean>|null>(null);const mounted=useRef(true);
 const editable=initial.publication_status==='draft';
 const dirty=JSON.stringify(form)!==savedSnapshot;
 const valid=form.title.trim().length>0&&Number.isFinite(form.chapter_number)&&form.chapter_number>0;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 function change<K extends keyof Fields>(key:K,value:Fields[K]){
  const next={...live.current,[key]:value};live.current=next;setForm(next);props.onDirty(JSON.stringify(next)!==saved.current);
 }
 async function save():Promise<boolean>{
  if(pending.current)return pending.current;
  if(!editable||conflict)return false;
  const snapshot={...live.current};const encoded=JSON.stringify(snapshot);
  if(encoded===saved.current)return true;
  if(!snapshot.title.trim()||!Number.isFinite(snapshot.chapter_number)||snapshot.chapter_number<=0)return false;
  setBusy(true);setNotice('Đang lưu bản nháp…');
  const work=(async()=>{
   try{
    const result=await platform<{version:number}>(`/partner/chapters/${initial.id}/draft`,'PUT',{...snapshot,version:version.current});
    if(!mounted.current)return false;
    version.current=result.version;saved.current=encoded;
    props.onDirty(JSON.stringify(live.current)!==encoded);setNotice('Đã lưu vào máy chủ.');setSavedSnapshot(encoded);props.onSaved();return true;
   }catch(error){
    if(mounted.current){setNotice(getErrorMessage(error)||'Chưa lưu được. Nội dung đang soạn vẫn được giữ.');if(error instanceof ApiError&&['draft_conflict','draft_not_editable'].includes(error.code||''))setConflict(true);}
    return false;
   }finally{pending.current=null;if(mounted.current)setBusy(false);}
  })();pending.current=work;return work;
 }
 const autosave=useEffectEvent(save);
 useEffect(()=>{
  if(!editable||conflict||!valid||JSON.stringify(form)===saved.current)return;
  const timer=setTimeout(()=>{void autosave();},1200);return()=>clearTimeout(timer);
 },[form,savedSnapshot,editable,conflict,valid]);
 const warnBeforeLeave=useEffectEvent((event:BeforeUnloadEvent)=>{if(JSON.stringify(live.current)!==saved.current){event.preventDefault();event.returnValue='';}});
 useEffect(()=>{const handler=(event:BeforeUnloadEvent)=>warnBeforeLeave(event);window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[]);
 async function submitForReview(){
  setSubmitting(true);
  try{
   if(!await save()||JSON.stringify(live.current)!==saved.current){setNotice('Hãy lưu hết các thay đổi trước khi gửi duyệt.');return;}
   await platform(`/partner/chapters/${initial.id}/publication`,'PUT',{status:'pending'});props.onDirty(false);props.onSubmitted();
  }catch(error){setNotice(getErrorMessage(error));}finally{if(mounted.current)setSubmitting(false);}
 }
 function download(){
  const file=new Blob([`${live.current.title}\n\n${live.current.content}`],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(file);const anchor=document.createElement('a');anchor.href=url;anchor.download=`ban-thao-${initial.id}.txt`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className={`${card} scroll-mt-24`} aria-label="Trình biên tập bản thảo">
  <header className="flex flex-wrap justify-between gap-3"><div><p className="text-xs tracking-wider text-amber-400">STUDIO · BIÊN TẬP CHƯƠNG</p><h2 className="text-xl font-semibold mt-1">{initial.title}</h2></div><button className="text-sm text-slate-400" onClick={props.onClose}>Đóng trình biên tập</button></header>
  {initial.review_reason&&<p className="rounded-xl border border-amber-400/25 p-3 text-amber-200">Lý do trả bài: {initial.review_reason}</p>}
  {!editable&&<p className="text-slate-400">Bản thảo đang được duyệt hoặc đã xuất bản. Chuyển về nháp trước khi chỉnh sửa.</p>}
  <div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={()=>setPreview(false)} aria-pressed={!preview}>Soạn thảo</button><button type="button" className={button} onClick={()=>setPreview(true)} aria-pressed={preview}>Xem trước</button><button type="button" className="text-sm text-amber-300" onClick={download}>Tải bản đang soạn (.txt)</button></div>
  <Notice text={notice}/>{conflict&&<button className={button} onClick={reload}>Tải phiên bản mới từ máy chủ</button>}
  {preview?<article className="rounded-xl border border-white/10 bg-black/15 p-5"><h3 className="text-xl font-semibold mb-5">{form.chapter_number}. {form.title}</h3><p className="whitespace-pre-wrap break-words leading-8 text-slate-200">{form.content||'Chưa có nội dung.'}</p></article>:<fieldset disabled={!editable||submitting||conflict} className="space-y-4 disabled:opacity-70">
   <div className="grid gap-3 sm:grid-cols-3"><label className="block sm:col-span-2">Tiêu đề<input className={field} value={form.title} maxLength={255} required onChange={e=>change('title',e.target.value)}/></label><label className="block">Số chương<input className={field} type="number" min={0.1} max={99999} step={0.1} value={Number.isNaN(form.chapter_number)?'':form.chapter_number} onChange={e=>change('chapter_number',e.target.valueAsNumber)}/></label></div>
   <label className="block">Nội dung chương<textarea className={`${field} min-h-80 leading-7`} rows={16} value={form.content} onChange={e=>change('content',e.target.value)}/></label>
   <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_premium} onChange={e=>change('is_premium',e.target.checked)}/> Chương dành cho hội viên VIP</label>
  </fieldset>}
  <footer className="flex flex-wrap items-center gap-3"><button type="button" className={button} disabled={!editable||busy||submitting||conflict||!valid||!dirty} onClick={()=>{void save();}}>Lưu ngay</button><button type="button" className={button} disabled={!editable||busy||submitting||conflict||!valid} onClick={()=>{void submitForReview();}}>Lưu & gửi duyệt</button><p className="text-xs text-slate-400">{busy?'Đang lưu…':dirty?'Có thay đổi chưa lưu':'Đã đồng bộ'} · Tự lưu sau khi ngừng nhập 1,2 giây</p></footer>
 </section>;
}
