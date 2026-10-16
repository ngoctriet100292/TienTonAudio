"use client";
import {CultivationProvider} from './cultivation-context';
import {api} from '@/lib/api';
import {User} from '@/types';
import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
type AuthState={user:User|null;isAuthenticated:boolean;isLoading:boolean;login:(user:User)=>void;logout:()=>Promise<void>;refreshProfile:()=>Promise<void>};
const AuthContext=createContext<AuthState|undefined>(undefined);
export function AuthProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null);const [isLoading,setIsLoading]=useState(true);const generation=useRef({value:0});
 const refreshProfile=useCallback(async()=>{
  const epoch=++generation.current.value;
  try{const me=await api.getMe();if(epoch===generation.current.value){setUser(me);if(me)void api.prepareBrowserSession().catch(()=>{});}}
  finally{if(epoch===generation.current.value)setIsLoading(false);}
 },[]);
 const login=(profile:User)=>{++generation.current.value;setUser(profile);setIsLoading(false);};
 const logout=async()=>{try{await api.logout();++generation.current.value;setUser(null);}catch(error){await refreshProfile().catch(()=>{});throw error;}};
 useEffect(()=>{
  localStorage.removeItem('access_token');localStorage.removeItem('refresh_token');localStorage.removeItem('user_profile');
  const epochCounter=generation.current;
  let active=true;
  const sync=()=>{if(active)void refreshProfile().catch(()=>{});};
  const storage=(event:StorageEvent)=>{if(event.key==='tienton_session_revision')sync();};
  sync();window.addEventListener('storage',storage);window.addEventListener('tienton-session-change',sync);
  return()=>{active=false;++epochCounter.value;window.removeEventListener('storage',storage);window.removeEventListener('tienton-session-change',sync);};
 },[refreshProfile]);
 return <AuthContext.Provider value={{user,isAuthenticated:!!user,isLoading,login,logout,refreshProfile}}><CultivationProvider>{children}</CultivationProvider></AuthContext.Provider>;
}
export function useAuth(){const context=useContext(AuthContext);if(!context)throw new Error('useAuth must be used within AuthProvider');return context;}
