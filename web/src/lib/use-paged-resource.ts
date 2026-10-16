'use client';
import {useState} from 'react';
import {emptyPage,Page} from './pagination';
import {useAsyncResource} from './use-async-resource';
export function usePagedResource<T>(key:string|null,load:(page:number)=>Promise<Page<T>>,limit=20){
 const[selection,setSelection]=useState({key,page:1});
 const page=selection.key===key?selection.page:1;
 const resource=useAsyncResource(key?`${key}:page:${page}`:null,()=>load(page),emptyPage<T>(page,limit));
 const goTo=(value:number)=>setSelection({key,page:Math.max(1,value)});
 return{...resource,goTo,page};
}
