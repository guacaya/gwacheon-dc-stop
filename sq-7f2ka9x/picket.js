/* ===== 피켓 지킴이 탭 (민원발사기 추가 모듈) =====
 * 민원발사기 index.html 에서 쓰는 것: showToast(), .btn/.bar 스타일, CSS 변수(--acc 등)
 * 이 파일이 만드는 것: #viewPicket 안의 화면, #barPicket 하단 바, window.Picket
 */
(function(){
  /* ---------- 설정 (운영진이 여기만 고치면 됩니다) ---------- */
  // Supabase → Project Settings → API. 둘 다 비우면 예시 데이터(미리보기) 모드.
  var SUPABASE_URL = 'https://gqjfwkjyvqrkvngqdqrm.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_oMV-_pPRpuD8EQRVMftRKg_MSKTOK4a';
  var CONFIG = {
    place: '과천시청 앞', time: '11:30–13:00', minPerDay: 7, giftAt: 3,
    // 담당동: 단톡 인원 비율로 배분, 하루 2–3개 동, 같은 동 연속 없음 (104 = 104+102+105)
    days: [['2026-10-06','108·109'],['2026-10-07','101·103'],['2026-10-08','108·107'],
      ['2026-10-12','101·109·106'],['2026-10-13','108·104'],['2026-10-14','107·103'],['2026-10-15','108·101·109'],['2026-10-16','106·104'],
      ['2026-10-19','108·101·107'],['2026-10-20','109·106·103'],['2026-10-21','108·104'],['2026-10-22','101·107'],['2026-10-23','108·109'],
      ['2026-10-26','101·106·103'],['2026-10-27','108·107·104'],['2026-10-28','전원']],
    holidays: {'2026-10-03':'개천절','2026-10-09':'한글날'},
    dongs: ['101동','102동','103동','104동','105동','106동','107동','108동','109동']
  };
  /* --------------------------------------------------------- */

  var DEMO = !SUPABASE_URL || !SUPABASE_KEY;
  var WD = ['일','월','화','수','목','금','토'];
  var DAYS = CONFIG.days.map(function(x){ return {date:x[0], dong:x[1]}; });
  var GROUPS = ['101','103','104','106','107','108','109'];
  var GOAL_TOTAL = CONFIG.minPerDay * DAYS.length;

  function $(id){ return document.getElementById(id); }
  function st(k, v){ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ymd(dt){ return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); }
  function today(){ return ymd(new Date()); }
  // 신청 가능한 첫 날: 오후 1시(시위 종료)가 지나면 오늘은 마감 처리
  function openFrom(){ var n=new Date(); if(n.getHours()>=13) n.setDate(n.getDate()+1); return ymd(n); }
  function pd(s){ var a=s.split('-').map(Number); return new Date(a[0],a[1]-1,a[2]); }
  function md(s){ var d=pd(s); return {t:(d.getMonth()+1)+'/'+d.getDate(), w:WD[d.getDay()], d:d.getDate()}; }
  function toast(m){ if(typeof showToast==='function') showToast(m); }
  function me(){ var s=st('pk_me')||{}; return {nick:s.nick||'', dong:s.dong||''}; }
  function nums(s){ return s==='전원' ? [] : s.split('·'); }
  function myNum(dong){ var n=(dong||'').replace('동',''); return (n==='102'||n==='105')?'104':n; }
  function grp(){ return st('pk_grp') || myNum(me().dong) || ''; }
  function ours(d, g){ return !!g && (d.dong==='전원' || nums(d.dong).indexOf(g)>=0); }

  /* ---------- 데이터: Supabase RPC (supabase.sql 참고) ---------- */
  function rpc(fn, body){
    return fetch(SUPABASE_URL+'/rest/v1/rpc/'+fn, {method:'POST', headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'}, body:JSON.stringify(body||{})})
      .then(function(r){ return r.json().catch(function(){ return null; }).then(function(j){ if(!r.ok) throw new Error((j&&(j.message||j.hint))||'잠시 후 다시 시도해 주세요'); return j; }); });
  }
  var demoRows = [['2026-10-06','예시1','108동',1],['2026-10-06','예시2','109동',1],['2026-10-06','예시3','101동',0],['2026-10-07','예시4','101동',0],['2026-10-07','예시5','101동',0],['2026-10-07','예시6','103동',0],['2026-10-07','예시7','101동',0],['2026-10-07','예시8','107동',0],['2026-10-08','예시9','108동',0],['2026-10-12','예시10','109동',0],['2026-10-13','예시11','104동',0],['2026-10-13','예시12','108동',0],['2026-10-16','예시13','106동',0]]
    .map(function(r,i){ return {id:'d'+i, date:r[0], nick:r[1], dong:r[2], checked:!!r[3]}; });
  var api = {
    list: function(){ return DEMO ? Promise.resolve(demoRows.slice()) : rpc('picket_list'); },
    signup: function(nick, dong, dates){
      if(!DEMO) return rpc('picket_signup', {p_nick:nick, p_dong:dong, p_dates:dates});
      var out=[]; dates.forEach(function(date){ if(demoRows.some(function(r){ return r.date===date&&r.nick===nick&&r.dong===dong; })) return; var id='x'+Math.random().toString(36).slice(2); demoRows.push({id:id,date:date,nick:nick,dong:dong,checked:false}); out.push({id:id,date:date,token:'t'}); });
      return Promise.resolve(out);
    },
    cancel: function(id, token){ if(!DEMO) return rpc('picket_cancel', {p_id:id, p_token:token}); demoRows=demoRows.filter(function(r){ return r.id!==id; }); return Promise.resolve(true); }
  };

  /* ---------- 상태 ---------- */
  var S=[], loaded=false, focusDay=null, picked={}, mine=st('pk_mine')||{}, lastDone=null, visible=false, built=false, timer=null;
  function pickedList(){ return Object.keys(picked).sort(); }
  function byDate(d){ return S.filter(function(s){ return s.date===d; }); }
  function iJoined(d){ var m=me(); return S.some(function(s){ return s.date===d && s.nick===m.nick && s.dong===m.dong; }); }
  function canPick(d){ return d.date>=openFrom() && !iJoined(d.date); }
  function status(d){
    var c=byDate(d.date).length, t=openFrom();
    if(d.date<t) return ['done','종료 · '+c+'명 참여'];
    if(c>=CONFIG.minPerDay) return ['ok','✅ 최소 인원 달성 · '+c+'명'];
    var diff=(pd(d.date)-pd(t))/864e5;
    return diff<=2 ? ['urgent','🚨 인원 부족 '+c+'/'+CONFIG.minPerDay] : ['warn','모집 중 '+c+'/'+CONFIG.minPerDay];
  }

  /* ---------- 화면 뼈대 ---------- */
  function build(){
    if(built) return; built=true;
    var v=$('viewPicket');
    v.innerHTML =
      (DEMO?'<div class="hint" style="margin:0 0 8px;color:#92400e">미리보기 — 예시 데이터예요. 저장되지 않아요</div>':'')+
      '<div class="pk-status"><div class="pk-status-row"><b>🪧 시청 앞 피켓시위</b><span class="pk-num"><strong id="pkNow">0</strong>/'+GOAL_TOTAL+'명</span></div>'+
      '<div class="pk-track"><div class="pk-fill" id="pkFill" style="width:0"></div></div>'+
      '<div class="pk-meta">'+md(DAYS[0].date).t+'~'+md(DAYS[DAYS.length-1].date).t+' 평일 점심 '+CONFIG.time+' · '+CONFIG.place+'<br><span id="pkToday"></span></div></div>'+
      '<div class="pk-info"><details><summary>🎯 왜 하나요?</summary><ol><li>심의 전, 시민이 지켜보고 있다는 신호를 시청에 직접 전달</li><li>민원·서명만으로 안 보이는 반대 여론을 눈에 보이게</li><li>지나가는 시민과 언론에 알려 참여층 확대</li><li>심의 결과 나올 때까지 압박 유지</li></ol></details>'+
      '<details><summary>🙌 알아두세요</summary><ul><li>피켓·물 현장에 다 있어요. 몸만 오세요</li><li>점심 '+CONFIG.time+' 중 30분만 들러도 OK</li><li>하루 2–3개 동이 함께 담당 — 다른 동도 언제든 신청 OK</li><li>'+CONFIG.giftAt+'회 이상 참여하면 감사 굿즈 🎁</li><li>자발적인 주민 참여가 가장 큰 힘이에요</li></ul></details></div>'+
      '<div class="pk-card pk-dsel"><div class="pk-dsel-h">🏢 우리 동 <small>누르면 담당일이 달력에 표시돼요</small></div><div class="pk-dchips" id="pkChips"></div><div class="pk-ddates" id="pkDates"></div></div>'+
      '<div class="pk-h">📅 10월 · 날짜를 눌러 고르세요 <small>여러 날 OK</small></div>'+
      '<div class="pk-card pk-cal"><div class="pk-cw"><span class="sun">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="sat">토</span></div>'+
      '<div class="pk-cg" id="pkGrid"><div class="pk-loading">불러오는 중…</div></div><div class="pk-quick" id="pkQuick"></div>'+
      '<div class="pk-legend"><span><i class="pk-lg ok"></i>7명 달성</span><span><i class="pk-lg warn"></i>모집 중</span><span><i class="pk-lg urgent"></i>임박·부족</span><span><i class="pk-lg hl"></i>우리 동</span></div></div>'+
      '<div id="pkDone"></div><div id="pkDetail"></div><div id="pkMine"></div>'+
      '<div class="disc">신청 내용(닉네임·동·날짜)은 함께 보는 달력에 공개됩니다. 본인 신청은 이 폰에서만 취소할 수 있어요.</div>';
    var bar=document.createElement('div');
    bar.className='bar'; bar.id='barPicket'; bar.hidden=true;
    bar.innerHTML='<div style="width:100%"><div class="pk-bar-top"><b id="pkCount"></b><div class="pk-bar-days" id="pkBarDays"></div><button class="pk-clr" type="button" data-pk="clear">선택 해제</button></div>'+
      '<div class="pk-bar-form"><input id="pkNick" placeholder="카톡 닉네임" maxlength="20" autocomplete="nickname" aria-label="카톡 닉네임"><select id="pkDong" aria-label="동"><option value="">동</option>'+
      CONFIG.dongs.map(function(d){ return '<option>'+d+'</option>'; }).join('')+'</select><button class="btn btn-acc" type="button" id="pkGo">신청</button></div></div>';
    document.querySelector('.app').appendChild(bar);
    v.addEventListener('click', onClick); bar.addEventListener('click', onClick);
    $('pkGo').addEventListener('click', submit);
  }

  /* ---------- 렌더 ---------- */
  function render(){ if(!built) return; renderTop(); renderChips(); renderCal(); renderDone(); renderDetail(); renderMine(); renderBar(); }
  function renderTop(){
    var n=S.length, t=today(), td=DAYS.filter(function(d){ return d.date===t; })[0];
    $('pkNow').textContent=n; $('pkFill').style.width=Math.min(100,Math.round(n/GOAL_TOTAL*100))+'%';
    if(td) $('pkToday').innerHTML='오늘 <b>'+(td.dong==='전원'?'전원 집결':esc(td.dong)+'동')+'</b> 담당 · <b>'+byDate(t).length+'/'+CONFIG.minPerDay+'명</b>';
    else { var nx=DAYS.filter(function(d){ return d.date>t; })[0]; $('pkToday').innerHTML = nx ? '다음 지킴이 <b>'+md(nx.date).t+'('+md(nx.date).w+')</b> · '+byDate(nx.date).length+'명 신청' : '함께해주셔서 감사합니다 🙏'; }
  }
  function renderChips(){
    var g=grp(), t=openFrom();
    $('pkChips').innerHTML=GROUPS.map(function(n){ return '<button type="button" class="'+(g===n?'on':'')+'" data-grp="'+n+'">'+n+(n==='104'?'<sup>+</sup>':'')+'</button>'; }).join('');
    if(!g){ $('pkDates').innerHTML='동을 누르면 담당 날짜가 여기에 나와요. 담당일이 아니어도 언제든 신청 OK'; return; }
    var ds=DAYS.filter(function(d){ return nums(d.dong).indexOf(g)>=0; });
    $('pkDates').innerHTML='<b>'+g+'동'+(g==='104'?'(+102·105동)':'')+'</b> 담당 '+ds.length+'일 · '+ds.map(function(d){ var f=md(d.date); return '<span class="pk-dt '+(d.date<t?'past':'')+'">'+f.d+'<small>'+f.w+'</small></span>'; }).join('')+'<span class="pk-dt">28<small>수</small> 🔥전원</span>';
  }
  function renderCal(){
    if(!loaded) return;
    var t=today(), m=me(), g=grp(), map={}; DAYS.forEach(function(d){ map[d.date]=d; });
    var start=pd(DAYS[0].date); start.setDate(start.getDate()-start.getDay());
    var end=pd(DAYS[DAYS.length-1].date); end.setDate(end.getDate()+(6-end.getDay()));
    var html='';
    for(var dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
      var wd=dt.getDay(), key=ymd(dt), day=dt.getDate(), d=map[key];
      if(wd===0||wd===6){ html+='<div class="pk-c we '+(wd===0?'sun':'sat')+'"><span class="pk-n">'+day+'</span></div>'; continue; }
      if(!d){ html+='<div class="pk-c off"><span class="pk-top"><span class="pk-n">'+day+'</span></span>'+(CONFIG.holidays[key]?'<span class="pk-hol">'+CONFIG.holidays[key]+'</span>':'')+'</div>'; continue; }
      var ss=byDate(key), cls=status(d)[0], show=ss.length>3?2:3, isPick=!!picked[key];
      var names=ss.slice(0,show).map(function(s){ return '<b class="'+(s.nick===m.nick&&s.dong===m.dong?'mn':'')+'">'+esc(s.nick)+'</b>'; }).join('')+(ss.length>show?'<b class="more">외 '+(ss.length-show)+'명</b>':'');
      var cnt=ss.length>=CONFIG.minPerDay ? ss.length+'명' : ss.length+'/'+CONFIG.minPerDay;
      html+='<button type="button" class="pk-c op '+cls+(key===t?' today':'')+(isPick?' pick':'')+(key===focusDay&&!isPick?' focus':'')+(ours(d,g)?' hl':'')+'" data-day="'+key+'" aria-pressed="'+isPick+'">'+
        '<span class="pk-top"><span class="pk-n">'+day+'</span>'+(isPick?'<span class="pk-ck">✓</span>':(d.dong==='전원'?'<span>🔥</span>':''))+'</span>'+
        '<span class="pk-nm">'+names+'</span><span class="pk-ct">'+cnt+'</span></button>';
    }
    $('pkGrid').innerHTML=html;
    fitNames();
    var o = g ? DAYS.filter(function(d){ return d.dong!=='전원' && ours(d,g) && canPick(d); }) : [];
    $('pkQuick').innerHTML = o.length ? '<button type="button" data-pk="ours">＋ '+g+'동 담당일 모두 고르기 ('+o.length+'일)</button>' : '';
  }
  // 긴 닉네임은 칸에 맞게 글자를 줄이고, 그래도 넘치면 두 줄로
  function fitNames(){
    var els=document.querySelectorAll('#pkGrid .pk-nm b:not(.more)');
    for(var i=0;i<els.length;i++){ var b=els[i], fs=10.5; b.classList.remove('wrap'); b.style.fontSize='';
      while(b.scrollWidth>b.clientWidth+1 && fs>8.5){ fs-=0.5; b.style.fontSize=fs+'px'; }
      if(b.scrollWidth>b.clientWidth+1){ b.style.fontSize='10px'; b.classList.add('wrap'); } }
  }
  function chips(d){
    if(d.dong==='전원') return '<span class="pk-chip all">🔥 전원 집결</span>';
    return nums(d.dong).map(function(n){ return '<span class="pk-chip">'+n+'동'+(n==='104'?' <small>+102·105</small>':'')+'</span>'; }).join('');
  }
  function renderDetail(){
    var d=DAYS.filter(function(x){ return x.date===focusDay; })[0]; if(!d||!loaded){ $('pkDetail').innerHTML=''; return; }
    var t=openFrom(), past=d.date<t, f=md(d.date), ss=byDate(d.date), s=status(d), joined=iJoined(d.date), need=Math.max(0,CONFIG.minPerDay-ss.length);
    var ppl = ss.length ? ss.map(function(p){ var mr=!!mine[p.id]; return '<span class="pk-p '+(mr?'mine':'')+'">'+(p.checked?'✓ ':'')+esc(p.nick)+' <small>'+esc(p.dong.replace('동',''))+'</small>'+(mr&&!past?'<span class="x" data-cancel="'+p.id+'">✕</span>':'')+'</span>'; }).join('') : '<span class="pk-empty">아직 신청자가 없어요. 첫 지킴이가 되어주세요</span>';
    var act = past ? '<button class="btn btn-acc" disabled>종료된 날이에요</button>'
      : joined ? '<button class="btn btn-acc" disabled>✓ 신청한 날이에요 (취소는 내 이름 ✕)</button>'
      : picked[d.date] ? '<button class="btn btn-ghost" data-toggle="'+d.date+'">✓ 선택됨 · 누르면 선택 해제</button>'
      : '<button class="btn btn-acc" data-toggle="'+d.date+'">＋ '+f.t+'('+f.w+') 선택하기</button>';
    $('pkDetail').innerHTML='<div class="pk-card pk-dd"><div class="pk-dh"><span class="d">'+f.t+'</span><span class="w">'+f.w+'요일</span><span class="pk-st '+s[0]+'">'+s[1]+'</span></div>'+
      '<div class="pk-dinfo">'+(d.dong==='전원'?'':'<span>담당</span>')+chips(d)+(d.dong!=='전원'&&ours(d,grp())?'<span class="pk-ours">· 우리 동 차례!</span>':'')+'</div>'+
      '<div class="pk-sec">신청자 '+ss.length+'명'+(!past&&need?' · 최소까지 '+need+'명 더':'')+'</div><div class="pk-ppl">'+ppl+'</div><div class="pk-dact">'+act+'</div></div>';
  }
  function renderDone(){
    if(!lastDone){ $('pkDone').innerHTML=''; return; }
    $('pkDone').innerHTML='<div class="pk-done"><b>🙌 '+lastDone.count+'일 신청 완료!</b> 단톡에 한 줄 남기면 이웃도 따라와요.<div class="msg" id="pkShare">'+esc(lastDone.msg)+'</div><div class="row"><button type="button" data-pk="copy">문구 복사</button><button type="button" class="gh" data-pk="close">닫기</button></div></div>';
  }
  function renderMine(){
    var m=me(); if(!m.nick||!m.dong){ $('pkMine').innerHTML=''; return; }
    var t=openFrom(), my=S.filter(function(s){ return s.nick===m.nick&&s.dong===m.dong; }).sort(function(a,b){ return a.date<b.date?-1:1; }), c=my.length;
    $('pkMine').innerHTML='<div class="pk-card pk-mine"><div class="pk-mine-top"><div><b>'+esc(m.nick)+' ('+esc(m.dong)+')님의 신청</b><div class="hint" style="margin:0">'+(c>=CONFIG.giftAt?'🎁 굿즈 대상이에요! 감사합니다':(CONFIG.giftAt-c)+'회 더 참여하면 감사 굿즈 🎁')+'</div></div><div class="num">'+c+'회</div></div>'+
      '<div class="pk-mine-days">'+my.map(function(s){ var f=md(s.date), can=!!mine[s.id]&&s.date>=t; return '<span class="pk-p mine">'+(s.checked?'✓ ':'')+f.t+'('+f.w+')'+(can?'<span class="x" data-cancel="'+s.id+'">✕</span>':'')+'</span>'; }).join('')+'</div></div>';
  }
  function renderBar(){
    var bar=$('barPicket'); if(!bar) return;
    var ds=pickedList(), has=visible && ds.length>0; bar.hidden=!has; if(!has) return;
    $('pkCount').textContent=ds.length+'일 선택';
    $('pkBarDays').innerHTML=ds.map(function(k){ var f=md(k); return '<span data-unpick="'+k+'">'+f.t+'('+f.w+') ✕</span>'; }).join('');
    var m=me(), ae=document.activeElement;
    if(ae!==$('pkNick') && !$('pkNick').value) $('pkNick').value=m.nick;
    if(ae!==$('pkDong') && !$('pkDong').value) $('pkDong').value=m.dong;
    $('pkGo').textContent=ds.length+'일 신청';
  }

  /* ---------- 동작 ---------- */
  function load(){ return api.list().then(function(rows){ S=rows||[]; loaded=true; render(); }).catch(function(){ if(!loaded) $('pkGrid').innerHTML='<div class="pk-loading">불러오지 못했어요. 새로고침 해주세요.</div>'; }); }
  function toggle(k){ if(picked[k]) delete picked[k]; else picked[k]=1; }
  function onClick(e){
    var el;
    if((el=e.target.closest('.pk-c.op[data-day]'))){ var k=el.dataset.day, d=DAYS.filter(function(x){ return x.date===k; })[0]; focusDay=k; if(canPick(d)) toggle(k); lastDone=null; render(); return; }
    if((el=e.target.closest('[data-toggle]'))){ toggle(el.dataset.toggle); render(); return; }
    if((el=e.target.closest('[data-unpick]'))){ delete picked[el.dataset.unpick]; render(); return; }
    if((el=e.target.closest('[data-grp]'))){ var g=el.dataset.grp; st('pk_grp', grp()===g?'':g); render(); return; }
    if((el=e.target.closest('[data-pk]'))){
      var a=el.dataset.pk;
      if(a==='ours'){ var g2=grp(); DAYS.filter(function(d){ return d.dong!=='전원'&&ours(d,g2)&&canPick(d); }).forEach(function(d){ picked[d.date]=1; }); render(); toast(pickedList().length+'일을 골랐어요. 아래에서 신청하세요'); }
      if(a==='clear'){ picked={}; render(); }
      if(a==='close'){ lastDone=null; render(); }
      if(a==='copy'){ var msg=lastDone?lastDone.msg:''; (navigator.clipboard?navigator.clipboard.writeText(msg):Promise.reject()).then(function(){ toast('복사했어요. 단톡에 붙여넣기!'); }).catch(function(){ var r=document.createRange(); r.selectNodeContents($('pkShare')); var s=getSelection(); s.removeAllRanges(); s.addRange(r); toast('문구를 길게 눌러 복사해 주세요'); }); }
      return;
    }
    if((el=e.target.closest('[data-cancel]'))){
      if(el.dataset.arm!=='1'){ el.dataset.arm='1'; el.textContent=' 취소?'; setTimeout(function(){ if(el.isConnected){ el.dataset.arm=''; el.textContent='✕'; } },3000); return; }
      var id=el.dataset.cancel;
      api.cancel(id, mine[id]).then(function(){ delete mine[id]; st('pk_mine',mine); toast('취소했어요'); return load(); }).catch(function(err){ toast(err.message); });
    }
  }
  function submit(){
    var nick=$('pkNick').value.trim(), dong=$('pkDong').value, dates=pickedList();
    if(!dates.length) return;
    if(!nick){ toast('카톡 닉네임을 적어주세요'); $('pkNick').focus(); return; }
    if(!dong){ toast('동을 골라주세요'); $('pkDong').focus(); return; }
    st('pk_me',{nick:nick,dong:dong}); if(!st('pk_grp')) st('pk_grp', myNum(dong));
    var b=$('pkGo'); b.disabled=true; b.textContent='신청 중…';
    api.signup(nick, dong, dates).then(function(rows){
      rows=rows||[]; rows.forEach(function(r){ mine[r.id]=r.token; }); st('pk_mine',mine);
      var skipped=dates.length-rows.length, list=dates.map(function(k){ var f=md(k); return f.t+'('+f.w+')'; }).join(', ');
      lastDone={count:dates.length, msg:'🙋 '+list+' 점심 시청 앞 피켓 지킴이 신청했어요! 같이 가요 👉 '+location.href.split('#')[0]};
      picked={}; focusDay=dates[0];
      return load().then(function(){ toast(skipped>0?'이미 신청한 '+skipped+'일은 빼고 신청했어요':dates.length+'일 신청 완료!'); var dn=$('pkDone'); if(dn) dn.scrollIntoView({behavior:'smooth',block:'center'}); });
    }).catch(function(err){ toast(err.message); }).then(function(){ b.disabled=false; renderBar(); });
  }

  window.Picket = {
    show: function(){ build(); visible=true; if(!focusDay) focusDay=(DAYS.filter(function(d){ return d.date>=openFrom(); })[0]||DAYS[DAYS.length-1]).date; render(); load(); clearInterval(timer); timer=setInterval(function(){ var ae=document.activeElement; if(!document.hidden && !(ae&&(ae.id==='pkNick'||ae.id==='pkDong'))) load(); },30000); },
    hide: function(){ visible=false; clearInterval(timer); renderBar(); }
  };
  // 첫 화면: 기본 주소(또는 #picket)면 피켓시위, #write/#sms 면 그대로
  var h1=location.hash.replace('#','');
  if(typeof showView==='function' && h1!=='write' && h1!=='sms') showView('picket');
})();
