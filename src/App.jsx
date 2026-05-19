import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  // 라우팅 스테이트
  const [currentMode, setCurrentMode] = useState('landing'); 
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // 교사용 스테이트
  const [teacherMenu, setTeacherMenu] = useState('menu'); 
  const [teacherStep, setTeacherStep] = useState(1);
  const [cardCount, setCardCount] = useState(15);
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState([]);
  const [previewWords, setPreviewWords] = useState([]); 
  const [previewDate, setPreviewDate] = useState(''); 

  // 학생용 스테이트
  const [dateList, setDateList] = useState([]); 
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

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
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  const proceedToStep2 = () => {
    if (cardCount < 1 || cardCount > 50) {
      alert("카드 수량은 1개부터 50개까지만 지정 가능합니다.");
      return;
    }
    setInputWords(Array(Number(cardCount)).fill({ kanji: '', meaning: '' }));
    setTeacherStep(2);
  };

  const handleSaveDeck = async () => {
    const filtered = inputWords.filter(w => w.kanji.trim() && w.meaning.trim());
    if(filtered.length < cardCount) {
      alert(`설정하신 ${cardCount}개의 카드를 빈칸 없이 모두 작성해야 저장됩니다.`);
      return;
    }

    const { error: setErr } = await supabase.from('word_sets').upsert({ id: teacherDate, date: teacherDate });
    if (setErr) return alert("카드 세트 보관에 실패했습니다.");

    await supabase.from('words').delete().eq('set_id', teacherDate);

    const wordsToInsert = filtered.map(w => ({ set_id: teacherDate, kanji: w.kanji, meaning: w.meaning }));
    const { error: wordErr } = await supabase.from('words').insert(wordsToInsert);

    if (!wordErr) {
      alert("오늘의 단어 세트 저장이 완료되었습니다.");
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
      alert("해당 날짜에 출제된 단어가 없습니다.");
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
      
      {/* 글로벌 탑 홈 네비게이션 버튼 (대문 화면 아닐 때만 미니멀 텍스트 조합으로 오픈) */}
      {currentMode !== 'landing' && !showPasswordModal && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
          <button onClick={resetToHome} className="text-back-btn">처음 화면으로</button>
        </div>
      )}

      {/* ==================== 0. 역할 분기 메인 선택 스크린 ==================== */}
      {currentMode === 'landing' && !showPasswordModal && (
        <div style={{ paddingTop: '20px' }}>
          <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '40px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            일본어 랜덤 카드 맞추기
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="role-select-card" onClick={() => setCurrentMode('student')}>
              <h2 style={{ fontSize: '19px', margin: '0 0 8px 0', color: '#00ffcc', fontWeight: '800' }}>학생 모드로 시작하기</h2>
              <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>일자별 플래시 카드를 터치하여 무작위 학습을 시작합니다.</p>
            </div>

            <div className="role-select-card" onClick={handleTeacherAccess}>
              <h2 style={{ fontSize: '19px', margin: '0 0 8px 0', color: '#7c3aed', fontWeight: '800' }}>선생님 모드로 시작하기</h2>
              <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>학습할 카드 개수 지정 및 데이터 세트를 생성하고 확인합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 🛠️ 1번 개선: 가독성 좋고 동일 가치로 보완된 균형 잡힌 보안 확인 창 버튼 */}
      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center', marginTop: '30px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800' }}>선생님 보안 코드</h3>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>인증을 위해 관리자 암호를 입력하십시오.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: '#fff', padding: '16px', borderRadius: '14px', width: '90%', textAlign: 'center', outline: 'none', marginBottom: '24px', fontSize: '16px', boxSizing: 'box-shadow' }}
          />
          <div style={{ display: 'flex', gap: '12px', width: '90%', margin: '0 auto' }}>
            {/* 시각적 밸런스가 균등하도록 각각 50% 유동 너비를 배정하고 액션 연출을 최적화 */}
            <button onClick={verifyPassword} className="mini-start-btn" style={{ flex: 1, padding: '15px 0' }}>확인</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>취소</button>
          </div>
        </div>
      )}

      {/* ==================== 1. 교사용 모드 패널 ==================== */}
      {currentMode === 'teacher' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {/* 🛠️ 2번 개선: 이모지 무더기를 모두 청소하여 심플하고 세련되게 마감한 인덱스 */}
          {teacherMenu === 'menu' && (
            <div>
              <h2 style={{ fontSize: '20px', margin: '0 0 24px 0', fontWeight: '800', textAlign: 'center' }}>선생님 관리 메뉴</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('create'); setTeacherStep(1); }}>
                  <span>카드 세트 만들기</span>
                  <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>→</span>
                </button>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('view'); setPreviewWords([]); }}>
                  <span>등록된 카드 세트 목록</span>
                  <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>→</span>
                </button>
              </div>
            </div>
          )}

          {/* 카드 세트 만들기 서브 레이어 */}
          {teacherMenu === 'create' && (
            <div>
              <div className="header-row">
                <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#7c3aed' }}>카드 세트 만들기</span>
                <button onClick={() => setTeacherMenu('menu')} className="text-back-btn">돌아가기</button>
              </div>

              {teacherStep === 1 ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>학습 적용 일자</label>
                    <input type="date" value={teacherDate} onChange={(e) => setTeacherDate(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '14px', fontSize: '16px', textAlign: 'center', width: '85%', outline: 'none' }} />
                  </div>
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>생성할 단어 총량</label>
                    <input type="number" value={cardCount} min="1" max="50" onChange={(e) => setCardCount(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: 'none', padding: '14px', borderRadius: '14px', fontSize: '17px', textAlign: 'center', width: '100px', outline: 'none' }} />
                  </div>
                  <button onClick={proceedToStep2} className="mini-start-btn" style={{ width: '100%', background: '#7c3aed', color: '#fff', padding: '16px 0', borderRadius: '16px' }}>입력 양식 생성하기</button>
                </div>
              ) : (
                /* 🛠️ 4번 개선: 미디어 가로 찢어짐을 원천 제거하기 위한 유동형 로우 인풋 팩 개편 */
                <div>
                  <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', fontSize: '14px', color: '#a0aec0' }}>{teacherDate} / 총 {cardCount}개 작성 목록</h4>
                  <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '25px', paddingRight: '4px' }}>
                    {inputWords.map((word, idx) => (
                      <div key={idx} className="input-row-container">
                        <span style={{ fontSize: '13px', color: '#4a5568', width: '20px', fontWeight: 'bold', textAlign: 'center' }}>{idx+1}</span>
                        <input placeholder="일본어" value={word.kanji} onChange={e => { const n = [...inputWords]; n[idx].kanji = e.target.value; setInputWords(n); }} className="input-dark" />
                        <input placeholder="뜻" value={word.meaning} onChange={e => { const n = [...inputWords]; n[idx].meaning = e.target.value; setInputWords(n); }} className="input-dark" />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setTeacherStep(1)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '14px', cursor: 'pointer', fontSize: '15px' }}>이전</button>
                    <button onClick={handleSaveDeck} style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>서버 업로드 및 완료</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 등록된 카드 세트 목록 패널 */}
          {teacherMenu === 'view' && (
            <div>
              <div className="header-row">
                <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#00ffcc' }}>등록된 카드 세트 목록</span>
                <button onClick={() => { previewWords.length > 0 ? setPreviewWords([]) : setTeacherMenu('menu'); }} className="text-back-btn">돌아가기</button>
              </div>

              {previewWords.length === 0 ? (
                /* 🛠️ 3번 개선: 세로 대형 리스트 카드 간의 좌우 밸런스 및 gap 요소 튜닝 적용 */
                <div className="date-list-vertical">
                  {dateList.map((item) => (
                    <div key={item.date} className="date-card-large">
                      <div className="date-label">{item.date}</div>
                      <button onClick={() => fetchDeckPreview(item.date)} className="mini-start-btn" style={{ background: '#7c3aed', color: '#fff' }}>단어 조회</button>
                    </div>
                  ))}
                  {dateList.length === 0 && <p style={{ color: '#4b5563', fontSize: '14px', textAlign: 'center' }}>데이터 보관함이 비어있습니다.</p>}
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#00ffcc', fontSize: '15px' }}>{previewDate} 구성 리스트</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#718096', textAlign: 'left' }}>
                          <th style={{ paddingBottom: '10px', width: '50px' }}>번호</th>
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

      {/* ==================== 2. 🎒 학생용 학습 구동 유닛 ==================== */}
      {currentMode === 'student' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {!hasStarted ? (
            <div>
              <div className="header-row">
                <h2 style={{ fontSize: '21px', margin: 0, fontWeight: '800', letterSpacing: '-0.3px' }}>
                  오늘의 플래시 단어 카드
                </h2>
              </div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px 0' }}>학습할 날짜의 카드를 터치해 시작해 주세요.</p>
              
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
                  <p style={{ color: '#4b5563', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>등록된 카드 세트가 아직 존재하지 않습니다.</p>
                )}
              </div>
            </div>
          ) : (
            currentIndex < words.length ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '14px', marginBottom: '12px' }}>
                  <span>진행 상황</span>
                  <span style={{ color: '#00ffcc', fontWeight: '800', fontSize: '16px' }}>{currentIndex + 1} / {words.length}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                {/* 🛠️ 5번 개선: 화면을 꽉 채우며 가독성을 최고치로 높인 와이드 매칭 카드 */}
                <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                  <div className="card-inner">
                    
                    <div className="card-front">
                      <span style={{ fontSize: '13px', color: '#6b7280', letterSpacing: '1.5px', position: 'absolute', top: '24px', fontWeight: 'bold' }}>일본어 문제</span>
                      <div style={{ fontSize: 'clamp(34px, 7.5vw, 52px)', fontWeight: '900', color: '#00ffcc', textAlign: 'center', width: '100%', wordBreak: 'break-all' }}>
                        {words[currentIndex].kanji}
                      </div>
                      <span style={{ fontSize: '13px', color: '#4b5563', position: 'absolute', bottom: '24px' }}>카드를 터치하면 정답이 보입니다</span>
                    </div>

                    <div className="card-back">
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1.5px', position: 'absolute', top: '24px', fontWeight: 'bold' }}>한국어 해석</span>
                      <div style={{ fontSize: 'clamp(28px, 6.5vw, 42px)', fontWeight: '800', color: '#ffffff', textAlign: 'center', width: '100%', wordBreak: 'break-all' }}>
                        {words[currentIndex].meaning}
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', position: 'absolute', bottom: '24px' }}>다시 터치하면 원래대로 돌아갑니다</span>
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
                  {isFlipped ? "다음 단어 카드로 이동하기" : "정답 확인하기"}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '45px 0' }}>
                <h3 style={{ fontSize: '24px', margin: '0 0 12px 0', color: '#00ffcc', fontWeight: '800' }}>단어 학습 완료!</h3>
                <p style={{ color: '#9ca3af', fontSize: '15px', marginBottom: '30px' }}>오늘 분량의 플래시 카드를 모두 암기하셨습니다.</p>
                <button 
                  onClick={() => setHasStarted(false)} 
                  className="action-btn-main"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', width: 'auto', padding: '14px 40px', borderRadius: '22px', fontSize: '15px' }}
                >
                  목록 페이지로 가기
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