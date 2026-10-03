const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'betting-journal.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('manifest, icon dimensions, and scripts are valid',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');
 for(const icon of manifest.icons){
  const image=fs.readFileSync(path.join(root,icon.src));const [width,height]=icon.sizes.split('x').map(Number);
  assert.equal(image.readUInt32BE(16),width);assert.equal(image.readUInt32BE(20),height);
 }
 new vm.Script(script);new vm.Script(fs.readFileSync(path.join(root,'sw.js'),'utf8'));
});

function client(){
 const nodes={},events={},calls=[];let responder;
 function node(){return{value:'',hidden:false,disabled:false,textContent:'',innerHTML:'',style:{},scrollTop:0,classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){},querySelector(){return node()}};}
 const $=selector=>nodes[selector]??=node();
 $('#historyScope').value='month';
 const context=vm.createContext({document:{querySelector:$,querySelectorAll:()=>[]},window:{isSecureContext:false,addEventListener:(name,handler)=>events[name]=handler},navigator:{onLine:true},matchMedia:()=>({matches:false,addEventListener(){}}),AbortSignal,Intl,console,clearTimeout,setTimeout,crypto:require('node:crypto').webcrypto,fetch:async(url,options)=>{
  const body=options.body?JSON.parse(options.body):null;calls.push({url,body});
  const data=await responder(url,body);return new Response(JSON.stringify(data),{status:200});
 }});
 responder=async url=>url.endsWith('edgebook_summary')?{totals:{count:101,stake:5050,pnl:-5050,wins:0},days:[]}:{total:101,items:[]};
 vm.runInContext(script,context);
 return{context,nodes,events,calls,setResponder:fn=>responder=fn,run:code=>vm.runInContext(code,context)};
}
function item(id){return{id:String(id),market:'Football',selection:'Bet '+id,stake:50,return:0,result:'loss',bet_date:'2026-10-02T12:00:00Z',notes:'',pnl:-50};}

test('history fetches one page, sends filters, and clamps an empty last page',async()=>{
 const app=client();await app.run('loadCloud()');
 app.setResponder(async(url,params)=>({total:45,items:Array.from({length:Math.max(0,Math.min(params.p_limit,45-params.p_offset))},(_,i)=>item(params.p_offset+i))}));
 app.calls.length=0;app.nodes['#historySearch'].value='team, 100%';app.nodes['#historyResult'].value='loss';
 await app.run('historyPage=1;loadHistory()');
 assert.equal(app.calls.length,1);assert.equal(app.calls[0].body.p_limit,20);assert.equal(app.calls[0].body.p_offset,20);
 assert.equal(app.calls[0].body.p_search,'team, 100%');assert.equal(app.calls[0].body.p_result,'loss');
 assert.equal(app.run('bets.length'),20);assert.equal(app.nodes['#historyRange'].textContent,'21–40 of 45');
 assert.match(app.nodes['#pnl'].innerHTML,/-5,050.00/);
 await app.run('historyPage=9;loadHistory()');
 assert.equal(app.run('historyPage'),2);assert.equal(app.run('bets.length'),5);assert.equal(app.nodes['#historyRange'].textContent,'41–45 of 45');
 assert.equal(app.nodes['#nextPage'].disabled,true);
});

test('older requests cannot overwrite a newer search or month',async()=>{
 const app=client();await app.run('loadCloud()');let releaseHistory,releaseSummary,historyCall=0,summaryCall=0;
 app.setResponder((url)=>url.endsWith('edgebook_history')?++historyCall===1?new Promise(resolve=>releaseHistory=resolve):{total:1,items:[item('new')]}:++summaryCall===1?new Promise(resolve=>releaseSummary=resolve):{totals:{count:2,stake:129,pnl:-50,wins:1},days:[]});
 const oldHistory=app.run('loadHistory()');await app.run('loadHistory()');
 releaseHistory({total:999,items:[item('old')]});await oldHistory;
 assert.equal(app.run('bets[0].id'),'new');assert.equal(app.run('historyTotal'),1);
 const oldSummary=app.run('loadSummary()');await app.run('loadSummary()');
 releaseSummary({totals:{count:999,stake:999,pnl:999,wins:999},days:[]});await oldSummary;
 assert.equal(app.run('totals.count'),2);assert.match(app.nodes['#pnl'].innerHTML,/-50.00/);
});

test('cloud failure shows an error and reconnect reloads without inventing data',async()=>{
 const app=client();await app.run('loadCloud()');
 app.setResponder(async()=>{throw Error('offline')});await app.run('loadHistory()');
 assert.equal(app.run('bets.length'),0);assert.equal(app.nodes['#historyError'].hidden,false);assert.equal(app.run('historyLoading'),false);
 app.run('navigator.onLine=false');app.events.offline();assert.equal(app.run('ready'),false);assert.equal(app.nodes['#connectionStatus'].hidden,false);
});

test('service worker caches only the shell and serves fresh navigation online',async()=>{
 const handlers={},stores=new Map(),deleted=[];let offline=false;
 const cache={addAll:async urls=>urls.forEach(url=>stores.set(url,new Response('shell'))),put:async(url,response)=>stores.set(typeof url==='string'?url:url.url,response),match:async url=>stores.get(typeof url==='string'?url:url.url)?.clone()};
 const scope='https://example.test/edgebook/';
 const context=vm.createContext({URL,Response,self:{registration:{scope},location:{origin:'https://example.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,handler)=>handlers[name]=handler},caches:{open:async()=>cache,keys:async()=>['unrelated-app','edgebook-shell-/edgebook/old'],delete:async key=>deleted.push(key)},fetch:async()=>{if(offline)throw Error('offline');return new Response('fresh')}});
 vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;
 handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['edgebook-shell-/edgebook/old']);
 let response;const fetchEvent=request=>handlers.fetch({request,respondWith:p=>response=p});
 fetchEvent({method:'POST',url:scope+'anything',mode:'cors'});assert.equal(response,undefined);
 fetchEvent({method:'GET',url:'https://project.supabase.co/rest/v1/bets',mode:'cors'});assert.equal(response,undefined);
 fetchEvent({method:'GET',url:scope+'betting-journal.html',mode:'navigate'});assert.equal(await(await response).text(),'fresh');
 stores.set(scope+'betting-journal.html',new Response('actual app'));
 fetchEvent({method:'GET',url:scope+'index.html',mode:'navigate'});await response;
 offline=true;fetchEvent({method:'GET',url:scope+'betting-journal.html',mode:'navigate'});assert.equal(await(await response).text(),'actual app');
});

