import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  // 모드 네비게이션 상태
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

  // 🔒 선생님 진입 마스터 비밀번호
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
      alert(`⚡ 설정하신 ${cardCount}개의 카드를 빈칸 없이 완성해 주셔야 합니다.`);
      return;
    }

    const { error: setErr } = await supabase.from('word_sets').upsert({ id: teacherDate, date: teacherDate });
    if (setErr) return alert("❌ 카드 세트 저장 과정에서 실패했습니다.");

    await supabase.from('words').delete().eq('set_id', teacherDate);

    const wordsToInsert = filtered.map(w => ({ set_id: teacherDate, kanji: w.kanji, meaning: w.meaning }));
    const { error: wordErr } = await supabase.from('words').insert(wordsToInsert);

    if (!wordErr) {
      alert("🔮 일본어 단어 덱 저장이 완료되었습니다!");
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
      alert("🫙 해당 날짜에 구성된 단어 정보가 존재하지 않습니다.");
    }
  };

  const progressPercent = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  const resetToHome = () => {
    setCurrentMode('landing');
    setHasStarted(false);
    setTeacherMenu('menu');
  };

  return (
    <div style={{ width: '100%', maxWidth: '540px', margin: '0 auto', paddingBottom: '30px' }}>
      
      {/* 글로벌 상단 홈 대피 버튼 (메인 로비 아닐 때만 렌더) */}
      {currentMode !== 'landing' && !showPasswordModal && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
          <button onClick={resetToHome} className="home-icon-btn">🏠</button>
        </div>
      )}

      {/* ==================== 0. 초기 웰컴 관문 스크린 ==================== */}
      {currentMode === 'landing' && !showPasswordModal && (
        <div style={{ paddingTop: '30px' }}>
          <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '40px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            🔮 일본어 카드 매칭 시스템
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="role-select-card" onClick={() => setCurrentMode('student')}>
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>🎒</div>
              <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#00ffcc' }}>학생 모드로 시작하기</h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>공유받은 날짜별 플래시 카드를 보며 무작위 학습 피드백을 시작합니다.</p>
            </div>

            <div className="role-select-card" onClick={handleTeacherAccess}>
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>⚙️</div>
              <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#7c3aed' }}>선생님 모드로 시작하기</h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>학습 카드 개수를 가변 제어하고 카드 세트 설계 및 원본 내역을 관리합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 선생님 전용 계정 잠금 패널 모달 */}
      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center', marginTop: '30px' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🔒 선생님 보안 코드</h3>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>보안 인가 승인을 위해 암호를 기입하십시오.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: '#fff', padding: '14px', borderRadius: '12px', width: '80%', textAlign: 'center', outline: 'none', marginBottom: '20px', fontSize: '16px' }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={verifyPassword} className="mini-start-btn" style={{ width: '85px' }}>확인</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}>취소</button>
          </div>
        </div>
      )}

      {/* ==================== 1. 👨‍🏫 교사용 백오피스 대시보드 ==================== */}
      {currentMode === 'teacher' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {/* [1단계: 독립형 대형 분기 메뉴 구조] */}
          {teacherMenu === 'menu' && (
            <div>
              <h2 style={{ fontSize: '19px', margin: '0 0 20px 0', fontWeight: '800' }}>⚙️ 선생님 관리 메뉴</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('create'); setTeacherStep(1); }}>
                  <span>📝 카드 세트 만들기</span>
                  <span style={{ color: '#7c3aed' }}>➡️</span>
                </button>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('view'); setPreviewWords([]); }}>
                  <span>📂 등록된 카드 세트 목록</span>
                  <span style={{ color: '#00ffcc' }}>➡️</span>
                </button>
              </div>
            </div>
          )}

          {/* [2단계 세부 빌더: 카드 세트 만들기] */}
          {teacherMenu === 'create' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#7c3aed' }}>📝 카드 세트 만들기</span>
                <button onClick={() => setTeacherMenu('menu')} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px' }}>돌아가기 🔙</button>
              </div>

              {teacherStep === 1 ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>학습 적용 일자</label>
                    <input type="date" value={teacherDate} onChange={(e) => setTeacherDate(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontSize: '16px', textAlign: 'center', width: '80%', outline: 'none' }} />
                  </div>
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>생성할 단어 총량</label>
                    <input type="number" value={cardCount} min="1" max="50" onChange={(e) => setCardCount(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '16px', textAlign: 'center', width: '90px', outline: 'none' }} />
                  </div>
                  <button onClick={proceedToStep2} className="mini-start-btn" style={{ width: '100%', background: '#7c3aed', color: '#fff', padding: '14px 0' }}>입력 양식 활성화 ➡️</button>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', fontSize: '14px', color: '#a0aec0' }}>날짜: {teacherDate} / {cardCount}개 작성 목록</h4>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
                    {inputWords.map((word, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#4a5568', width: '18px', fontWeight: 'bold' }}>{idx+1}</span>
                        <input placeholder="일본어" value={word.kanji} onChange={e => { const n = [...inputWords]; n[idx].kanji = e.target.value; setInputWords(n); }} className="input-dark" />
                        <input placeholder="의미 뜻" value={word.meaning} onChange={e => { const n = [...inputWords]; n[idx].meaning = e.target.value; setInputWords(n); }} className="input-dark" />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setTeacherStep(1)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer' }}>이전</button>
                    <button onClick={handleSaveDeck} style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>데이터 세브 업로드 🚀</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* [3단계 세부 빌더: 대형 한줄 매칭형 확인하기 목록 창] */}
          {teacherMenu === 'view' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ffcc' }}>📂 등록된 카드 세트 목록</span>
                <button onClick={() => { previewWords.length > 0 ? setPreviewWords([]) : setTeacherMenu('menu'); }} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px' }}>돌아가기 🔙</button>
              </div>

              {previewWords.length === 0 ? (
                /* 📱 선생님 확인 화면도 요청대로 시원시원한 대형 한 줄 배치 개편 */
                <div className="date-list-vertical">
                  {dateList.map((item) => (
                    <div key={item.date} className="date-card-large">
                      <div className="date-label">{item.date}</div>
                      <button onClick={() => fetchDeckPreview(item.date)} className="mini-start-btn" style={{ background: '#7c3aed', color: '#fff' }}>덱 단어 조회</button>
                    </div>
                  ))}
                  {dateList.length === 0 && <p style={{ color: '#4b5563', fontSize: '13px', textAlign: 'center' }}>데이터베이스가 비어있습니다.</p>}
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#00ffcc' }}>📑 {previewDate} 카드 상세 구성 리스트</h4>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#718096', textAlign: 'left' }}>
                          <th style={{ paddingBottom: '8px' }}>순번</th>
                          <th style={{ paddingBottom: '8px' }}>일본어 원어</th>
                          <th style={{ paddingBottom: '8px' }}>해석 뜻</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewWords.map((w, i) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '9px 0', color: '#4a5568' }}>{i + 1}</td>
                            <td style={{ padding: '9px 0', color: '#fff', fontWeight: '600' }}>{w.kanji}</td>
                            <td style={{ padding: '9px 0', color: '#a0aec0' }}>{w.meaning}</td>
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

      {/* ==================== 2. 🎒 학생용 전용 인게임 레이어 ==================== */}
      {currentMode === 'student' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {/* [학생 관문: 시원시원하고 완벽하게 커진 대형 한 줄 날짜 카드 목록] */}
          {!hasStarted ? (
            <div>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0', fontWeight: '800', letterSpacing: '-0.3px' }}>
                📚 오늘의 플래시 단어 카드
              </h2>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px 0' }}>학습을 시작할 스케줄 날짜 카드의 시작 버튼을 누르세요.</p>
              
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
                  <p style={{ color: '#4b5563', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>출제된 일본어 단어 덱 세트 카드가 부재합니다.</p>
                )}
              </div>
            </div>
          ) : (
            /* [학생 본 게임: 가변형 초대형 무작위 플래시 카드 구동 모듈] */
            currentIndex < words.length ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px', marginBottom: '10px' }}>
                  <span>오늘의 학습량 진행 상황</span>
                  <span style={{ color: '#00ffcc', fontWeight: '800', fontSize: '14px' }}>{currentIndex + 1} / {words.length}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                {/* 🔍 글자 해상도와 흐림 필터를 원천 박멸하고 크기를 가변 확장한 핵심 암기 판넬 */}
                <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                  <div className="card-inner">
                    
                    {/* 카드 앞면 (매우 선명한 일본어 제시어) */}
                    <div className="card-front">
                      <span style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '1.5px', position: 'absolute', top: '22px', fontWeight: 'bold' }}>일본어 문제</span>
                      <div style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: '900', color: '#00ffcc' }}>
                        {words[currentIndex].kanji}
                      </div>
                      <span style={{ fontSize: '12px', color: '#4b5563', position: 'absolute', bottom: '22px' }}>카드를 클릭하면 뒤집힙니다 🔮</span>
                    </div>

                    {/* 카드 뒷면 (매우 선명한 정답 해석 뜻) */}
                    <div className="card-back">
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1.5px', position: 'absolute', top: '22px', fontWeight: 'bold' }}>한국어 해석</span>
                      <div style={{ fontSize: 'clamp(24px, 5.5vw, 36px)', fontWeight: '800', color: '#ffffff' }}>
                        {words[currentIndex].meaning}
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', position: 'absolute', bottom: '22px' }}>다시 터치하면 원어로 회전 ↩️</span>
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
                  {isFlipped ? "다음 단어 카드로 넘어가기 ➡️" : "매칭 정답 직접 확인하기 👀"}
                </button>
              </div>
            ) : (
              /* 인게임 카드 컴플리트 결과 스크린 */
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '50px', marginBottom: '12px' }}>⚡</div>
                <h3 style={{ fontSize: '22px', margin: '0 0 10px 0', color: '#00ffcc', fontWeight: '800' }}>단어 학습 미션 완료!</h3>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5' }}>오늘 할당된 분량의 플래시 무작위 카드를<br />성공적으로 전부 암기해 마스터했습니다.</p>
                <button 
                  onClick={() => setHasStarted(false)} 
                  className="action-btn-main"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', width: 'auto', padding: '12px 35px', borderRadius: '20px', fontSize: '14px' }}
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