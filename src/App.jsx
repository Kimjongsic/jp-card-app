import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  // 시스템 관리 상태
  const [currentMode, setCurrentMode] = useState('landing'); // 'landing', 'teacher', 'student'
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // 교사 모드 전용 상태
  const [teacherStep, setTeacherStep] = useState(1); // 1단계 또는 2단계
  const [cardCount, setCardCount] = useState(15); // 기본값 15개
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState([]);

  // 학생 모드 전용 상태
  const [dateList, setDateList] = useState([]); 
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 🔒 교사 페이지 비밀번호
  const TEACHER_PASSWORD = "1234";

  // 날짜 리스트 초기 바인딩
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

  // 교사 모드 검증 진입
  const handleTeacherAccess = () => {
    setShowPasswordModal(true);
  };

  const verifyPassword = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setCurrentMode('teacher');
      setTeacherStep(1); // 진입 시 무조건 1단계부터 시작
    } else {
      alert("❌ 비밀번호가 일치하지 않습니다.");
    }
  };

  // 교사 1단계 -> 2단계 이동 (개수 확정 및 입력 폼 생성)
  const proceedToStep2 = () => {
    if (cardCount < 1 || cardCount > 50) {
      alert("카드 개수는 1개부터 50개까지만 설정 가능합니다.");
      return;
    }
    // 설정된 개수만큼 빈 입력 필드 생성
    setInputWords(Array(Number(cardCount)).fill({ kanji: '', meaning: '' }));
    setTeacherStep(2);
  };

  // 교사 데이터베이스 최종 저장
  const handleSaveDeck = async () => {
    const filtered = inputWords.filter(w => w.kanji.trim() && w.meaning.trim());
    if(filtered.length < cardCount) {
      alert(`⚡ 설정하신 ${cardCount}개의 카드를 모두 작성해 주셔야 완료됩니다.`);
      return;
    }

    const { error: setErr } = await supabase.from('word_sets').upsert({ id: teacherDate, date: teacherDate });
    if (setErr) return alert("❌ 세트 저장 중 오류 발생");

    await supabase.from('words').delete().eq('set_id', teacherDate);

    const wordsToInsert = filtered.map(w => ({ set_id: teacherDate, kanji: w.kanji, meaning: w.meaning }));
    const { error: wordErr } = await supabase.from('words').insert(wordsToInsert);

    if (!wordErr) {
      alert("🔮 오늘의 일본어 카드 덱이 생성되었습니다!");
      fetchDateList();
      setCurrentMode('landing'); // 저장 후 홈화면으로 이동
    }
  };

  // 학생 플레이 시작 기동
  const startLearning = async (dateId) => {
    const { data } = await supabase.from('words').select('*').eq('set_id', dateId);

    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setWords(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasStarted(true);
    } else {
      alert("🫙 해당 날짜에 생성된 단어 카드가 없습니다.");
    }
  };

  const progressPercent = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '500px', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
      
      {/* 글로벌 상단 홈 버튼 (진입점 페이지가 아닐 때만 노출) */}
      {currentMode !== 'landing' && !showPasswordModal && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button 
            onClick={() => { setCurrentMode('landing'); setHasStarted(false); }}
            style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}
          >
            🏠 홈으로 가기
          </button>
        </div>
      )}

      {/* ==================== 0. LANDING VIEW (역할 선택 첫 화면) ==================== */}
      {currentMode === 'landing' && !showPasswordModal && (
        <div>
          <h1 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '40px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            🔮 JAPANESE FLASH CARD
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="role-select-card" onClick={() => setCurrentMode('student')}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎒</div>
              <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#00ffcc' }}>STUDENT MODE</h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>선생님이 등록한 날짜별 카드를 랜덤으로 학습합니다.</p>
            </div>

            <div className="role-select-card" onClick={handleTeacherAccess}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚙️</div>
              <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#7c3aed' }}>先生モード</h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>일자별 학습할 카드 개수와 단어 세트를 생성합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 보호 인증 모달 */}
      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🔒 先生モード 인증</h3>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>보안을 위해 교사 전용 암호를 입력해 주세요.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{ background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '12px', borderRadius: '10px', width: '80%', textAlign: 'center', outline: 'none', marginBottom: '20px' }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={verifyPassword} className="mini-start-btn" style={{ width: '80px' }}>확인</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {/* ==================== 1. 👨‍🏫 TEACHER MODE UI (단계별 위저드 구성) ==================== */}
      {currentMode === 'teacher' && !showPasswordModal && (
        <div className="dashboard-box">
          <h2 style={{ textAlign: 'center', fontSize: '20px', margin: '0 0 5px 0' }}>先生モード : 카드 생성</h2>
          
          {/* 스텝 비주얼 인디케이터 */}
          <div className="step-indicator">
            <div className={`step-dot ${teacherStep === 1 ? 'active' : ''}`}>1단계: 개수 설정</div>
            <div className={`step-dot ${teacherStep === 2 ? 'active' : ''}`}>2단계: 단어 입력</div>
          </div>

          {teacherStep === 1 ? (
            /* [선생님 - 1단계] 날짜 및 카드 개수 정의 */
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>TARGET DATE</label>
                <input 
                  type="date" 
                  value={teacherDate} 
                  onChange={(e) => setTeacherDate(e.target.value)} 
                  style={{ background: '#1a1b23', color: '#fff', border: '1px solid #2e303f', padding: '12px', borderRadius: '12px', fontSize: '16px', outline: 'none', textAlign: 'center' }}
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>CARD COUNT (개수 지정)</label>
                <input 
                  type="number" 
                  value={cardCount} 
                  min="1" 
                  max="50"
                  onChange={(e) => setCardCount(e.target.value)} 
                  style={{ background: '#1a1b23', color: '#fff', border: '1px solid #2e303f', padding: '12px', borderRadius: '12px', fontSize: '16px', outline: 'none', textAlign: 'center', width: '100px' }}
                />
                <p style={{ color: '#4a5568', fontSize: '12px', marginTop: '6px' }}>오늘 배울 단어들의 총 수량을 정합니다.</p>
              </div>

              <button onClick={proceedToStep2} className="mini-start-btn" style={{ background: '#7c3aed', color: '#fff', padding: '14px 0', borderRadius: '12px', fontSize: '15px' }}>
                다음 단계로 이동 ➡️
              </button>
            </div>
          ) : (
            /* [선생님 - 2단계] 유동성 단어 리스트 채우기 */
            <div>
              <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>
                {teacherDate} 세트에 들어갈 <b style={{ color: '#00ffcc' }}>{cardCount}개</b>의 단어 쌍을 입력하세요.
              </p>
              
              <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '5px', marginBottom: '20px' }}>
                {inputWords.map((word, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ color: '#4b5563', fontSize: '14px', width: '20px', fontWeight: 'bold' }}>{idx + 1}</span>
                    <input 
                      placeholder="일본어 표기" 
                      value={word.kanji} 
                      onChange={e => {
                        const newWords = [...inputWords];
                        newWords[idx] = { ...newWords[idx], kanji: e.target.value };
                        setInputWords(newWords);
                      }}
                      style={{ flex: 1, background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '10px', borderRadius: '10px', outline: 'none' }}
                    />
                    <input 
                      placeholder="한국어 뜻" 
                      value={word.meaning} 
                      onChange={e => {
                        const newWords = [...inputWords];
                        newWords[idx] = { ...newWords[idx], meaning: e.target.value };
                        setInputWords(newWords);
                      }}
                      style={{ flex: 1, background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '10px', borderRadius: '10px', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setTeacherStep(1)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                  이전으로
                </button>
                <button onClick={handleSaveDeck} style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)' }}>
                  최종 덱 업로드 🚀
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 2. 🎒 STUDENT MODE UI (날짜 카드화 나열 유지) ==================== */}
      {currentMode === 'student' && !showPasswordModal && (
        <div className="dashboard-box">
          {!hasStarted ? (
            <div>
              <h2 style={{ fontSize: '20px', marginBottom: '5px' }}>📚 오늘의 단어 카드</h2>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px 0' }}>학습할 날짜의 카드를 선택해 주세요.</p>
              
              <div className="date-grid">
                {dateList.map((item) => (
                  <div key={item.date} className="date-card">
                    <div className="date-label">{item.date}</div>
                    <button onClick={() => startLearning(item.date)} className="mini-start-btn">
                      開始
                    </button>
                  </div>
                ))}
                {dateList.length === 0 && (
                  <p style={{ color: '#4b5563', fontSize: '14px', gridColumn: '1/-1', textAlign: 'center', padding: '20px 0' }}>등록된 카드 세트가 아직 없습니다.</p>
                )}
              </div>
            </div>
          ) : (
            /* 카드 맞추기 인게임 플레이 화면 */
            currentIndex < words.length ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                  <span>PROGRESS</span>
                  <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{currentIndex + 1} / {words.length}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                  <div className="card-inner">
                    <div className="card-front">
                      <span style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '2px', position: 'absolute', top: '20px' }}>JAPANESE</span>
                      <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{words[currentIndex].kanji}</div>
                      <span style={{ fontSize: '11px', color: '#4b5563', position: 'absolute', bottom: '20px' }}>TAP TO FLIP 🔮</span>
                    </div>
                    <div className="card-back">
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', position: 'absolute', top: '20px' }}>MEANING</span>
                      <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{words[currentIndex].meaning}</div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', position: 'absolute', bottom: '20px' }}>TAP TO RETURN ↩️</span>
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
                      }, 200); 
                    }
                  }} 
                  style={{
                    width: '100%', background: isFlipped ? '#fff' : '#1e1e2f', color: isFlipped ? '#000' : '#fff', 
                    border: isFlipped ? 'none' : '1px solid #3a3a52', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  {isFlipped ? "NEXT CARD ➡️" : "CHECK ANSWER 👀"}
                </button>
              </div>
            ) : (
              /* 카드 클리어 오버레이 */
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>⚡</div>
                <h3 style={{ fontSize: '22px', margin: '0 0 10px 0', color: '#00ffcc' }}>DECK CLEARED!</h3>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '25px' }}>오늘의 카드 단어들을 모두 마스터했습니다.</p>
                <button 
                  onClick={() => setHasStarted(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 30px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  목록으로 돌아가기
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