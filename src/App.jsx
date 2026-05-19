import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  // 시스템 관리 모드 상태
  const [currentMode, setCurrentMode] = useState('landing'); // 'landing', 'teacher', 'student'
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // 선생님 모드 전용 상태
  const [teacherMenu, setTeacherMenu] = useState('menu'); // 'menu', 'create', 'view'
  const [teacherStep, setTeacherStep] = useState(1);
  const [cardCount, setCardCount] = useState(15);
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState([]);
  const [previewWords, setPreviewWords] = useState([]); 
  const [previewDate, setPreviewDate] = useState(''); 

  // 학생 모드 전용 상태
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
      setTeacherMenu('menu'); // 초기 진입점 메뉴판 설정
    } else {
      alert("❌ 비밀번호가 일치하지 않습니다.");
    }
  };

  const proceedToStep2 = () => {
    if (cardCount < 1 || cardCount > 50) {
      alert("카드 개수는 1개부터 50개까지만 유효합니다.");
      return;
    }
    setInputWords(Array(Number(cardCount)).fill({ kanji: '', meaning: '' }));
    setTeacherStep(2);
  };

  const handleSaveDeck = async () => {
    const filtered = inputWords.filter(w => w.kanji.trim() && w.meaning.trim());
    if(filtered.length < cardCount) {
      alert(`⚡ 설정하신 ${cardCount}개의 카드를 모두 채워주셔야 완성됩니다.`);
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

  // 전체 초기화 홈 이동 함수
  const resetToHome = () => {
    setCurrentMode('landing');
    setHasStarted(false);
    setTeacherMenu('menu');
  };

  return (
    <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      
      {/* ==================== 0. 대문 게이트웨이 화면 ==================== */}
      {currentMode === 'landing' && !showPasswordModal && (
        <div style={{ paddingTop: '20px' }}>
          <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '35px', fontWeight: '800' }}>
            🔮 일본어 카드 마스터
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="role-select-card" onClick={() => setCurrentMode('student')}>
              <div style={{ fontSize: '36px', marginBottom: '5px' }}>🎒</div>
              <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#00ffcc' }}>학생 모드 진입</h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>공유된 플래시 카드를 보며 무작위로 암기 트레이닝을 시작합니다.</p>
            </div>

            <div className="role-select-card" onClick={handleTeacherAccess}>
              <div style={{ fontSize: '36px', marginBottom: '5px' }}>⚙️</div>
              <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#7c3aed' }}>선생님 모드 진입</h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>날짜별 단어의 총량 조절 및 데이터 세트 생성과 확인을 제어합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 보호 입력 모달 */}
      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center', marginTop: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🔒 선생님 보안 코드</h3>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>교사 전용 비밀번호를 작성하세요.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{ background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '12px', borderRadius: '10px', width: '80%', textAlign: 'center', outline: 'none', marginBottom: '20px', fontSize: '16px' }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={verifyPassword} className="mini-start-btn" style={{ width: '80px' }}>확인</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {/* ==================== 1. 👨‍🏫 선생님 전용 레이어 ==================== */}
      {currentMode === 'teacher' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {/* [선생님 메인 메뉴판 로비] */}
          {teacherMenu === 'menu' && (
            <div>
              <div className="header-row">
                <h2 style={{ fontSize: '19px', margin: 0 }}>⚙️ 선생님 모드 센터</h2>
                <button onClick={resetToHome} className="home-icon-btn">🏠</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('create'); setTeacherStep(1); }}>
                  <span>📝 카드 세트 만들기</span>
                  <span style={{ color: '#7c3aed' }}>➡️</span>
                </button>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('view'); setPreviewWords([]); }}>
                  <span>📂 등록된 카드 세트 확인</span>
                  <span style={{ color: '#00ffcc' }}>➡️</span>
                </button>
              </div>
            </div>
          )}

          {/* [선생님 서브 기능 1: 카드 세트 만들기] */}
          {teacherMenu === 'create' && (
            <div>
              <div className="header-row">
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#7c3aed' }}>📝 세트 만들기</span>
                <button onClick={() => setTeacherMenu('menu')} className="home-icon-btn" style={{ fontSize: '14px' }}>🔙</button>
              </div>

              {teacherStep === 1 ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>목표 학습 일자</label>
                    <input type="date" value={teacherDate} onChange={(e) => setTeacherDate(e.target.value)} style={{ background: '#1a1b23', color: '#fff', border: '1px solid #2e303f', padding: '12px', borderRadius: '12px', fontSize: '16px', textAlign: 'center', width: '80%', outline: 'none' }} />
                  </div>
                  <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>카드 개수 지정</label>
                    <input type="number" value={cardCount} min="1" max="50" onChange={(e) => setCardCount(e.target.value)} style={{ background: '#1a1b23', color: '#fff', border: '1px solid #2e303f', padding: '12px', borderRadius: '12px', fontSize: '16px', textAlign: 'center', width: '100px', outline: 'none' }} />
                  </div>
                  <button onClick={proceedToStep2} className="mini-start-btn" style={{ width: '100%', background: '#7c3aed', color: '#fff', padding: '14px 0' }}>입력 필드 활성화 ➡️</button>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', fontSize: '14px', color: '#a0aec0' }}>{teacherDate} / 지정 개수: {cardCount}개</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                    {inputWords.map((word, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#4a5568', width: '18px' }}>{idx+1}</span>
                        <input placeholder="일본어" value={word.kanji} onChange={e => { const n = [...inputWords]; n[idx].kanji = e.target.value; setInputWords(n); }} style={{ flex: 1, background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                        <input placeholder="뜻" value={word.meaning} onChange={e => { const n = [...inputWords]; n[idx].meaning = e.target.value; setInputWords(n); }} style={{ flex: 1, background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setTeacherStep(1)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '10px', cursor: 'pointer' }}>이전</button>
                    <button onClick={handleSaveDeck} style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>데이터 업로드 🚀</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* [선생님 서브 기능 2: 등록된 카드 세트 확인] */}
          {teacherMenu === 'view' && (
            <div>
              <div className="header-row">
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#00ffcc' }}>📂 등록된 카드 세트 목록</span>
                <button onClick={() => { previewWords.length > 0 ? setPreviewWords([]) : setTeacherMenu('menu'); }} className="home-icon-btn" style={{ fontSize: '14px' }}>🔙</button>
              </div>

              {previewWords.length === 0 ? (
                <div className="date-list-vertical">
                  {dateList.map((item) => (
                    <div key={item.date} className="date-card-large">
                      <div className="date-label">{item.date}</div>
                      <button onClick={() => fetchDeckPreview(item.date)} className="mini-start-btn" style={{ background: '#7c3aed', color: '#fff' }}>목록 조회</button>
                    </div>
                  ))}
                  {dateList.length === 0 && <p style={{ color: '#4b5563', fontSize: '13px', textAlign: 'center' }}>저장된 세트 내역이 비어있습니다.</p>}
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#00ffcc' }}>📑 {previewDate} 전체 단어 정보</h4>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', background: '#14151f', padding: '12px', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #2e303f', color: '#718096', textAlign: 'left' }}>
                          <th style={{ paddingBottom: '6px' }}>번호</th>
                          <th style={{ paddingBottom: '6px' }}>일본어</th>
                          <th style={{ paddingBottom: '6px' }}>정답 뜻</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewWords.map((w, i) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 0', color: '#4a5568' }}>{i + 1}</td>
                            <td style={{ padding: '8px 0', color: '#fff', fontWeight: '500' }}>{w.kanji}</td>
                            <td style={{ padding: '8px 0', color: '#a0aec0' }}>{w.meaning}</td>
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

      {/* ==================== 2. 🎒 학생용 플레이 레이어 ==================== */}
      {currentMode === 'student' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {/* [학생: 게임 구동 전 날짜 리스트 나열 스크린] */}
          {!hasStarted ? (
            <div>
              <div className="header-row">
                <h2 style={{ fontSize: '18px', margin: 0, fontWeight: '800' }}>📚 오늘의 플래시 단어 카드</h2>
                <button onClick={resetToHome} className="home-icon-btn">🏠</button>
              </div>
              <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 15px 0' }}>학습을 수행하고자 하는 스케줄 카드를 터치하세요.</p>
              
              <div className="date-list-vertical">
                {dateList.map((item) => (
                  <div key={item.date} className="date-card-large">
                    <div className="date-label">{item.date}</div>
                    <button onClick={() => startLearning(item.date)} className="mini-start-btn">
                      開始
                    </button>
                  </div>
                ))}
                {dateList.length === 0 && (
                  <p style={{ color: '#4b5563', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>교사님이 생성 보관한 카드 덱이 아직 없습니다.</p>
                )}
              </div>
            </div>
          ) : (
            /* [학생: 플래시 카드 인게임 플레이 필드] */
            currentIndex < words.length ? (
              <div>
                <div className="header-row">
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>진행도 파악</span>
                  <span style={{ color: '#00ffcc', fontWeight: 'bold', fontSize: '14px' }}>{currentIndex + 1} / {words.length}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                {/* 흐림 현상이 영구 방지된 고해상도 3D 플립 기하 구조 박스 */}
                <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                  <div className="card-inner">
                    <div className="card-front">
                      <span style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '1px', position: 'absolute', top: '15px' }}>일본어 제시어</span>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>{words[currentIndex].kanji}</div>
                      <span style={{ fontSize: '11px', color: '#4b5563', position: 'absolute', bottom: '15px' }}>카드를 탭하면 뒤집힙니다 🔮</span>
                    </div>
                    <div className="card-back">
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', position: 'absolute', top: '15px' }}>한국어 정답</span>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>{words[currentIndex].meaning}</div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', position: 'absolute', bottom: '15px' }}>다시 누르면 원위치로 ↩️</span>
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
                  style={{
                    width: '100%', background: isFlipped ? '#fff' : '#1e1e2f', color: isFlipped ? '#000' : '#fff', 
                    border: isFlipped ? 'none' : '1px solid #3a3a52', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', outline: 'none'
                  }}
                >
                  {isFlipped ? "다음 카드로 이동 ➡️" : "정답 매칭 확인 👀"}
                </button>
              </div>
            ) : (
              /* 모든 매칭 루프 해제 시 완성 알림 패널 */
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '45px', marginBottom: '10px' }}>⚡</div>
                <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#00ffcc' }}>모든 카드 학습 완료!</h3>
                <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>오늘 할당량 카드를 전부 암기하셨습니다.</p>
                <button 
                  onClick={() => setHasStarted(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 25px', borderRadius: '16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  목록으로 가기
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