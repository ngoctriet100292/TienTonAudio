import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
// Run only against the isolated API in backend/internal/handler/testdata/browser.
const web='http://localhost:3107',api='http://localhost:8091';
const tabs=await(await fetch('http://127.0.0.1:9462/json/list')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let sequence=0;const pending=new Map();const errors=[];
ws.onmessage=event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);else if(m.method==='Page.javascriptDialogOpening')void call('Page.handleJavaScriptDialog',{accept:true});};
function call(method,params={}){return new Promise((resolve,reject)=>{pending.set(++sequence,{resolve,reject});ws.send(JSON.stringify({id:sequence,method,params}))})}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
async function until(expression,label){for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error(`Timeout ${label}: ${await evaluate('document.querySelector("main")?.textContent')}`)}
const ready=text=>until(`document.querySelector('main')?.textContent.includes(${JSON.stringify(text)})`,text);
async function navigate(path){await call('Page.navigate',{url:web+path});}
async function click(text,selector='main button'){await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)?.click()`)}
async function fill(selector,value){await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('missing input');el.focus();el.select();})()`);await call('Input.insertText',{text:value});await new Promise(r=>setTimeout(r,120));}
async function shot(name,width){assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'horizontal overflow '+name);await evaluate('document.fonts.ready.then(()=>true)');const r=await call('Page.captureScreenshot',{format:'png'});writeFileSync(`/tmp/tienton-cookie-${name}-${width}.png`,Buffer.from(r.data,'base64'));}
await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
await fetch(api+'/__qa/reset',{method:'POST'});await navigate('/login');await until(`!!document.querySelector('input[type=email]')`,'login form');await new Promise(r=>setTimeout(r,1000));
await fill('input[type=email]','qa@example.invalid');await fill('input[type=password]','fixture-password');await evaluate(`document.querySelector('main form').requestSubmit()`);
await until(`location.pathname==='/'`,'login completes');await navigate('/account');await ready('Xin chào, Đạo hữu kiểm thử');
const cookies=(await call('Network.getCookies',{urls:[api]})).cookies;
for(const suffix of ['access','refresh','csrf']){const cookie=cookies.find(c=>c.name==='tienton_'+suffix);assert.ok(cookie,`${suffix} cookie exists`);assert.equal(cookie.httpOnly,true);}
assert.equal(await evaluate(`document.cookie.includes('tienton_access')||document.cookie.includes('tienton_refresh')||localStorage.getItem('access_token')!==null||localStorage.getItem('refresh_token')!==null`),false);
const rejected=await evaluate(`fetch('${api}/api/v1/partner/chapters/30000000-0000-0000-0000-000000000001/draft',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status)`);assert.equal(rejected,403);
const before=(await(await fetch(api+'/__qa/stats')).json()).refreshes;
await call('Network.deleteCookies',{name:'tienton_access',url:api+'/'});await navigate('/account');await ready('Xin chào, Đạo hữu kiểm thử');
const after=(await(await fetch(api+'/__qa/stats')).json()).refreshes;assert.ok(after>before,'expired access refreshed using HttpOnly cookie');
await navigate('/studio/publications');await ready('Tiên lộ trường sinh 01');
await evaluate(`[...document.querySelectorAll('main select')].find(s=>[...s.options].some(o=>o.value==='20000000-0000-0000-0000-000000000001')).value='20000000-0000-0000-0000-000000000001';[...document.querySelectorAll('main select')].find(s=>[...s.options].some(o=>o.value==='20000000-0000-0000-0000-000000000001')).dispatchEvent(new Event('change',{bubbles:true}))`);
await ready('Khởi đầu');
await evaluate(`[...document.querySelectorAll('nav[aria-label="Phân trang chương"] button')].find(b=>b.textContent==='Sau').click()`);await ready('Chương 21');
await evaluate(`[...document.querySelectorAll('nav[aria-label="Phân trang chương"] button')].find(b=>b.textContent==='Trước').click()`);await ready('Khởi đầu');
await evaluate(`[...document.querySelectorAll('main article')].find(a=>a.textContent.includes('Khởi đầu')).querySelector('button').click()`);await ready('Soạn thảo');
await fill('section[aria-label="Trình biên tập bản thảo"] textarea','Nội dung đã được tự lưu trong trình duyệt kiểm thử.');await ready('Đã lưu vào máy chủ.');
assert.equal((await(await fetch(api+'/__qa/stats')).json()).content,'Nội dung đã được tự lưu trong trình duyệt kiểm thử.');
await click('Xem trước');await ready('Nội dung đã được tự lưu');await click('Soạn thảo');
await fetch(api+'/__qa/conflict',{method:'POST'});await fill('section[aria-label="Trình biên tập bản thảo"] textarea','Bản đang soạn phải được giữ khi có xung đột.');await ready('Tải phiên bản mới từ máy chủ');
assert.equal(await evaluate(`document.querySelector('section[aria-label="Trình biên tập bản thảo"] textarea').value`),'Bản đang soạn phải được giữ khi có xung đột.');
await click('Tải phiên bản mới từ máy chủ');await until(`document.querySelector('section[aria-label="Trình biên tập bản thảo"] textarea')?.value==='Bản thảo mới từ tab khác.'`,'reload conflict version');
await shot('studio',1440);
await click('Lưu & gửi duyệt');await ready('Chờ duyệt');assert.equal(await evaluate(`!!document.querySelector('section[aria-label="Trình biên tập bản thảo"]')`),false);
const article=`[...document.querySelectorAll('main article')].find(a=>a.textContent.includes('Khởi đầu'))`;
await navigate('/admin/moderation?story=20000000-0000-0000-0000-000000000001');await ready('Khởi đầu');await fill('main article textarea','Cần bổ sung phần mở đầu rõ ràng hơn.');await evaluate(`[...${article}.querySelectorAll('button')].find(b=>b.textContent==='Trả về nháp').click()`);
await ready('Lý do trả bài: Cần bổ sung phần mở đầu rõ ràng hơn.');
await navigate('/support');await ready('Cần hỗ trợ đồng bộ tiến độ nghe');await evaluate(`[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Cần hỗ trợ đồng bộ')).click()`);await ready('Tin nhắn 45');
await evaluate(`[...document.querySelectorAll('nav[aria-label="Phân trang tin nhắn hỗ trợ"] button')].find(b=>b.textContent==='Sau').click()`);await ready('Tin nhắn 25');
await shot('support',1440);
for(const [path,text]of [['/account','Xin chào, Đạo hữu kiểm thử'],['/studio/publications','Tiên lộ trường sinh 01'],['/support','Cần hỗ trợ đồng bộ tiến độ nghe'],['/studio/analytics','Thống kê tác phẩm']]){
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:1050,deviceScaleFactor:1,mobile:true});await navigate(path);await ready(text);await shot(path.replaceAll('/','-').slice(1),390);
}
// Log out through the real frontend navigation control.
await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await navigate('/account');await ready('Xin chào, Đạo hữu kiểm thử');
await evaluate(`[...document.querySelectorAll('header button')].find(b=>b.textContent.trim()==='Đ')?.click()`);
await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Đăng Xuất Tài Khoản'))`,'logout menu');
await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Đăng Xuất Tài Khoản')).click()`);await ready('Đăng nhập để tiếp tục');
const afterLogout=(await call('Network.getCookies',{urls:[api]})).cookies;assert.equal(afterLogout.some(c=>['tienton_access','tienton_refresh'].includes(c.name)),false);
assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS: real HttpOnly cookies, CSRF rejection, refresh, logout, pagination, autosave, conflict preservation, moderation reason, and responsive layouts.');ws.close();
