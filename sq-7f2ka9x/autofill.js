/* 과천 주암 민원 도우미 — 국민신문고 폼 자동채우기
   북마클릿 로더가 이 파일을 매번 새로 받아 실행합니다. 여기만 고치면 자동 반영됩니다. */
(function () {
  var VER = '2';

  function fillForm(d) {
    if (!d || !d.__juam) {
      alert('넘겨받은 민원 내용이 없습니다. (자동채우기 v' + VER + ')\n\n' +
        '도우미 페이지에서 파란 "📋 이 민원 복사 → 국민신문고 열기" 버튼을 먼저 누른 다음,\n' +
        '열린 국민신문고 창에서 이 북마클릿을 눌러주세요.\n' +
        '(국민신문고를 따로 새로 열지 말고, 그 창에서 로그인·이동하세요.)');
      return;
    }
    var vis = function (el) { return el && !el.disabled && !el.readOnly && el.offsetParent !== null; };
    var fire = function (el) { ['input', 'change', 'keydown', 'keyup'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); }); };
    var setV = function (el, v) { el.focus(); try { el.value = v; } catch (e) {} fire(el); };
    var txtIn = function (x) { var t = (x.type || 'text').toLowerCase(); return (t === 'text' || t === 'search' || t === '') && vis(x); };
    var pick = function (kw, avoid) {
      var ins = [].slice.call(document.querySelectorAll('input')).filter(function (x) { return txtIn(x) && x !== avoid; });
      var a = ins.filter(function (x) { return kw.test((x.id || '') + ' ' + (x.name || '') + ' ' + (x.placeholder || '') + ' ' + (x.title || '') + ' ' + (x.getAttribute('aria-label') || '')); });
      if (a[0]) return a[0];
      var labs = [].slice.call(document.querySelectorAll('label[for]'));
      for (var i = 0; i < labs.length; i++) {
        if (kw.test((labs[i].textContent || '').replace(/\s/g, ''))) {
          var t = document.getElementById(labs[i].getAttribute('for'));
          if (t && t.tagName === 'INPUT' && txtIn(t) && t !== avoid) return t;
        }
      }
      var ths = [].slice.call(document.querySelectorAll('th'));
      for (var j = 0; j < ths.length; j++) {
        if (kw.test((ths[j].textContent || '').replace(/\s/g, ''))) {
          var tr = ths[j].closest && ths[j].closest('tr');
          var inp = tr && tr.querySelector('input[type=text],input[type=search],input:not([type])');
          if (inp && txtIn(inp) && inp !== avoid) return inp;
        }
      }
      return null;
    };

    var done = [];
    if (d.body) {
      var tas = [].slice.call(document.querySelectorAll('textarea')).filter(vis)
        .sort(function (a, b) { return b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight; });
      var bt = tas[0];
      if (bt && bt.offsetWidth * bt.offsetHeight > 60000 && (bt.value.trim() === '' || bt.value === d.body)) {
        setV(bt, d.body); done.push('본문');
      }
    }
    var title = pick(/제목|titl|subj/i);
    if (title && d.title) { setV(title, d.title); done.push('제목'); }
    var ag = pick(/처리기관|기관명|소관기관|접수기관/, title);
    if (ag && d.agency) { setV(ag, d.agency); done.push('기관명(입력만 됨 — 목록에서 직접 선택)'); }

    alert('(자동채우기 v' + VER + ') ' +
      (done.length ? done.join(', ') + ' 을(를) 채웠습니다.' : '이 화면에서는 채울 칸을 찾지 못했습니다.') +
      '\n\n※ 처리기관은 검색창에 글자만 입력됩니다. 뜨는 목록에서 직접 선택하세요.' +
      '\n※ 제목·본문 내용을 꼭 확인하고, 공개여부 등 나머지를 정한 뒤 본인이 제출하세요.' +
      '\n※ 칸을 잘못 찾았으면 지우고 수동으로 입력하세요.');
  }

  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) {
        var c = null; try { c = JSON.parse(t); } catch (e) {}
        fillForm(c);
      }).catch(function () {
        alert('클립보드를 읽지 못했습니다. (자동채우기 v' + VER + ')\n\n' +
          '주소창 왼쪽 자물쇠 아이콘 → 사이트 설정에서 [클립보드]를 "허용"으로 바꾼 뒤 다시 눌러보세요.\n' +
          '(Chrome·Edge·웨일에서 동작합니다. Firefox는 지원하지 않습니다.)');
      });
    } else {
      alert('이 브라우저는 클립보드 읽기를 지원하지 않습니다. (자동채우기 v' + VER + ')\n\n' +
        'Chrome·Edge·웨일을 쓰거나, 도우미 페이지의 복사·붙여넣기 방식을 이용하세요.');
    }
  } catch (e) {
    alert('자동채우기 오류: ' + e.message);
  }
})();
