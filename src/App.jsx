import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  // 시스템 관리 모드 상태
  const [currentMode, setCurrentMode] = useState('landing'); 
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // 선생님 모드 상태 구조
  const [teacherMenu, setTeacherMenu] = useState('menu'); 
  const [teacherStep, setTeacherStep] = useState(1);
  const [cardCount, setCardCount] = useState(15);
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState([]);
  const [previewWords, setPreviewWords] = useState([]); 
  const [previewDate, setPreviewDate] = useState(''); 

  // 학생 모드 플레이 상태 구조
  const [dateList, setDateList] = useState([]); 
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 🔒 인증용 교사 암호
  const TEACHER_PASSWORD = "1234";

  useEffect(() => {
    fetchDateList();
  }, []);

  const fetchDateList = async () => {
    const { data } = await supabase
      .from('word_sets')
      .select('date')
      .order('date', { ascending: false });
    if (data) setDateList(data);
  };

  const handleTeacherAccess = () => {
    setShowPasswordModal(true);
  };

  const verifyPassword = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setCurrentMode('teacher');
      setTeacherMenu('menu');
    } else {
      alert("❌ 비밀번호가 일치하지 않습니다.");
    }
  };

  const proceedToStep2 = () => {
    if (cardCount < 1 || cardCount > 50) {
      alert("카드 수량은 1개부터 50개까지만 지정할 수 있습니다.");
      return;
    }
    setInputWords(Array(Number(cardCount)).fill({ kanji: '', meaning: '' }));
    setTeacherStep(2);
  };

  const handleSaveDeck = async () => {
    const filtered = inputWords.filter(w => w.kanji.trim() && w.meaning.trim());
    if(filtered.length < cardCount) {
      alert(`⚡ 설정하신 ${cardCount}개의 카드를 빈칸 없이 모두 입력해야 완성됩니다.`);
      return;
    }

    const { error: setErr } = await supabase.from('word_sets').upsert({ id: teacherDate, date: teacherDate });
    if (setErr) return alert("❌ 카드 세트 저장 실패");

    await supabase.from('words').delete().eq('set_id', teacherDate);

    const wordsToInsert = filtered.map(w => ({ set_id: teacherDate, kanji: w.kanji, meaning: w.meaning }));
    const { error: wordErr } = await supabase.from('words').insert(wordsToInsert);

    if (!wordErr) {
      alert("🔮 일본어 카드 세트가 저장되었습니다!");
      fetchDateList();
      setTeacherMenu('menu');
    }
  };

  const fetchDeckPreview = async (dateId) => {
    const { data } = await supabase.from('words').select('*').eq('set_id', dateId);
    if (data) {
      setPreviewWords(data);
      setPreviewDate(dateId);
    }
  };

  const startLearning = async (dateId) => {
    const { data } = await supabase.from('words').select('*').eq('set_id', dateId);

    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setWords(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasStarted(true);
    } else {
      alert("🫙 해당 날짜에 데이터가 없습니다.");
    }
  };

  const progressPercent = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  const resetToHome = () => {
    setCurrentMode('landing');
    setHasStarted(false);
    setTeacherMenu('menu');
  };

  return (
    <div style={{ width: '100%', maxWidth: '540px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* 글로벌 상단 홈 버튼 */}
      {currentMode !== 'landing' && !showPasswordModal && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button onClick={resetToHome} className="home-icon-btn">🏠</button>
        </div>
      )}

      {/* ==================== 0. 메인 인트로 게이트웨이 화면 ==================== */}
      {currentMode === 'landing' && !showPasswordModal && (
        <div style={{ paddingTop: '20px' }}>
          <h1 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '45px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            🔮 일본어 카드 매칭 시스템
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="role-select-card" onClick={() => setCurrentMode('student')}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>🎒</div>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#00ffcc' }}>학생 모드로 시작하기</h2>
              <p style={{ color: '#718096', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>공유받은 날짜별 플래시 카드를 보며 무작위 학습 피드백을 시작합니다.</p>
            </div>

            <div className="role-select-card" onClick={handleTeacherAccess}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>⚙️</div>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#7c3aed' }}>선생님 모드로 시작하기</h2>
              <p style={{ color: '#718096', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>학습 카드 개수를 가변 제어하고 카드 세트 설계 및 원본 내역을 관리합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 선생님 전용 인증 창 */}
      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center', marginTop: '30px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>🔒 선생님 보안 코드</h3>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>보안 인가 승인을 위해 암호를 기입하십시오.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: '#fff', padding: '16px', borderRadius: '14px', width: '85%', textAlign: 'center', outline: 'none', marginBottom: '24px', fontSize: '17px' }}
          />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={verifyPassword} className="mini-start-btn" style={{ width: '95px' }}>확인</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px' }}>취소</button>
          </div>
        </div>
      )}

      {/* ==================== 1. 👨‍🏫 선생님 전용 관리 섹션 ==================== */}
      {currentMode === 'teacher' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {/* [메뉴 메인 대시보드 로비] */}
          {teacherMenu === 'menu' && (
            <div>
              <h2 style={{ fontSize: '22px', margin: '0 0 24px 0', fontWeight: '800' }}>⚙️ 선생님 관리 메뉴</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('create'); setTeacherStep(1); }}>
                  <span>📝 카드 세트 만들기</span>
                  <span style={{ color: '#7c3aed', fontSize: '20px' }}>➡️</span>
                </button>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('view'); setPreviewWords([]); }}>
                  <span>📂 등록된 카드 세트 목록</span>
                  <span style={{ color: '#00ffcc', fontSize: '20px' }}>➡️</span>
                </button>
              </div>
            </div>
          )}

          {/* [세부 기능 1: 카드 세트 빌더 만들기 창] */}
          {teacherMenu === 'create' && (
            <div>
              <div className="header-row">
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#7c3aed' }}>📝 카드 세트 만들기</span>
                <button onClick={() => setTeacherMenu('menu')} className="home-icon-btn">🔙</button>
              </div>

              {teacherStep === 1 ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ marginBottom: '28px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>학습 적용 일자</label>
                    <input type="date" value={teacherDate} onChange={(e) => setTeacherDate(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '14px', fontSize: '17px', textAlign: 'center', width: '80%', outline: 'none' }} />
                  </div>
                  <div style={{ marginBottom: '35px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>생성할 단어 총량</label>
                    <input type="number" value={cardCount} min="1" max="50" onChange={(e) => setCardCount(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '17px', textAlign: 'center', width: '100px', outline: 'none' }} />
                  </div>
                  <button onClick={proceedToStep2} className="mini-start-btn" style={{ width: '100%', background: '#7c3aed', color: '#fff', padding: '16px 0', borderRadius: '16px', fontSize: '17px' }}>입력 양식 활성화 ➡️</button>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 18px 0', textAlign: 'center', fontSize: '15px', color: '#a0aec0' }}>날짜: {teacherDate} / 수량: {cardCount}개 작성 리스트</h4>
                  <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '25px', paddingRight: '4px' }}>
                    {inputWords.map((word, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#4a5568', width: '20px', fontWeight: 'bold' }}>{idx+1}</span>
                        <input placeholder="일본어" value={word.kanji} onChange={e => { const n = [...inputWords]; n[idx].kanji = e.target.value; setInputWords(n); }} className="input-dark" />
                        <input placeholder="의미 뜻" value={word.meaning} onChange={e => { const n = [...inputWords]; n[idx].meaning = e.target.value; setInputWords(n); }} className="input-dark" />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setTeacherStep(1)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '14px', cursor: 'pointer', fontSize: '15px' }}>이전</button>
                    <button onClick={handleSaveDeck} style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>데이터 세이브 업로드 🚀</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* [선생님 세부 기능 2: 웅장하게 정렬되는 저장소 리스트 필드] */}
          {teacherMenu === 'view' && (
            <div>
              <div className="header-row">
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#00ffcc' }}>📂 등록된 카드 세트 목록</span>
                <button onClick={() => { previewWords.length > 0 ? setPreviewWords([]) : setTeacherMenu('menu'); }} className="home-icon-btn">🔙</button>
              </div>

              {previewWords.length === 0 ? (
                <div className="date-list-vertical">
                  {dateList.map((item) => (
                    <div key={item.date} className="date-card-large">
                      <div className="date-label">{item.date}</div>
                      <button onClick={() => fetchDeckPreview(item.date)} className="mini-start-btn" style={{ background: '#7c3aed', color: '#fff' }}>덱 단어 조회</button>
                    </div>
                  ))}
                  {dateList.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px', textAlign: 'center', padding: '20px' }}>저장된 세트 내역이 비어있습니다.</p>}
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#00ffcc', fontSize: '16px' }}>📑 {previewDate} 카드 구성 상세 정보</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#718096', textAlign: 'left' }}>
                          <th style={{ paddingBottom: '10px', width: '50px' }}>순번</th>
                          <th style={{ paddingBottom: '10px' }}>일본어</th>
                          <th style={{ paddingBottom: '10px' }}>해석 뜻</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewWords.map((w, i) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '10px 0', color: '#4a5568' }}>{i + 1}</td>
                            <td style={{ padding: '10px 0', color: '#fff', fontWeight: '600' }}>{w.kanji}</td>
                            <td style={{ padding: '10px 0', color: '#a0aec0' }}>{w.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ==================== 2. 🎒 학생용 학습 구동 컴포넌트 ==================== */}
      {currentMode === 'student' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {/* [학생: 게임 구동 전 큼직한 가로 확장형 카드 목록] */}
          {!hasStarted ? (
            <div>
              <div className="header-row">
                <h2 style={{ fontSize: '22px', margin: 0, fontWeight: '800', letterSpacing: '-0.3px' }}>
                  📚 오늘의 플래시 단어 카드
                </h2>
              </div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px 0' }}>학습을 시작할 스케줄 날짜 카드의 시작 버튼을 누르세요.</p>
              
              <div className="date-list-vertical">
                {dateList.map((item) => (
                  <div key={item.date} className="date-card-large">
                    <div className="date-label">{item.date}</div>
                    <button onClick={() => startLearning(item.date)} className="mini-start-btn">
                      시작
                    </button>
                  </div>
                ))}
                {dateList.length === 0 && (
                  <p style={{ color: '#4b5563', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>출제된 일본어 단어 세트 카드가 없습니다.</p>
                )}
              </div>
            </div>
          ) : (
            /* [학생: 완벽히 선명해진 초대형 플래시 카드 필드] */
            currentIndex < words.length ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '14px', marginBottom: '12px' }}>
                  <span>학습 진행 상황</span>
                  <span style={{ color: '#00ffcc', fontWeight: '800', fontSize: '16px' }}>{currentIndex + 1} / {words.length}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                {/* 흐림 보정이 들어간 확장형 3D 플립 카드 컴포넌트 */}
                <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                  <div className="card-inner">
                    
                    {/* 카드 앞면 */}
                    <div className="card-front">
                      <span style={{ fontSize: '13px', color: '#6b7280', letterSpacing: '1.5px', position: 'absolute', top: '24px', fontWeight: 'bold' }}>일본어 문제</span>
                      <div style={{ fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: '900', color: '#00ffcc' }}>
                        {words[currentIndex].kanji}
                      </div>
                      <span style={{ fontSize: '13px', color: '#4b5563', position: 'absolute', bottom: '24px' }}>카드를 터치하면 뒤집힙니다 🔮</span>
                    </div>

                    {/* 카드 뒷면 */}
                    <div className="card-back">
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1.5px', position: 'absolute', top: '24px', fontWeight: 'bold' }}>한국어 해석</span>
                      <div style={{ fontSize: 'clamp(28px, 6.5vw, 40px)', fontWeight: '800', color: '#ffffff' }}>
                        {words[currentIndex].meaning}
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', position: 'absolute', bottom: '24px' }}>다시 터치하면 원어로 회전 ↩️</span>
                    </div>

                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (!isFlipped) {
                      setIsFlipped(true);
                    } else {
                      setIsFlipped(false);
                      setTimeout(() => {
                        setCurrentIndex(currentIndex + 1);
                      }, 180); 
                    }
                  }} 
                  className="action-btn-main"
                  style={{
                    background: isFlipped ? '#ffffff' : '#1a1829', 
                    color: isFlipped ? '#0b0c10' : '#ffffff'
                  }}
                >
                  {isFlipped ? "다음 단어 카드로 넘어가기 ➡️" : "정답 매칭 확인하기 👀"}
                </button>
              </div>
            ) : (
              /* 완료 축하 스크린 */
              <div style={{ textAlign: 'center', padding: '45px 0' }}>
                <div style={{ fontSize: '55px', marginBottom: '15px' }}>⚡</div>
                <h3 style={{ fontSize: '24px', margin: '0 0 12px 0', color: '#00ffcc', fontWeight: '800' }}>단어 학습 미션 완료!</h3>
                <p style={{ color: '#9ca3af', fontSize: '15px', marginBottom: '30px', lineHeight: '1.6' }}>오늘 배정된 플래시 무작위 카드를<br />성공적으로 전부 암기하셨습니다.</p>
                <button 
                  onClick={() => setHasStarted(false)} 
                  className="action-btn-main"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', width: 'auto', padding: '14px 40px', borderRadius: '22px', fontSize: '15px' }}
                >
                  학습 목록 페이지로 가기
                </button>
              </div>
            )
          )}
        </div>
      )}

    </div>
  );
}

export default App;