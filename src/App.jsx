import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  const [currentMode, setCurrentMode] = useState('landing');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [teacherStep, setTeacherStep] = useState(1);
  const [cardCount, setCardCount] = useState(15);
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState([]);

  const [dateList, setDateList] = useState([]); 
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const TEACHER_PASSWORD = import.meta.env.VITE_TEACHER_PASSWORD || "1234";

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
      setTeacherStep(1);
    } else {
      alert("❌ 비밀번호가 일치하지 않습니다.");
    }
  };

  const proceedToStep2 = () => {
    if (cardCount < 1 || cardCount > 50) {
      alert("카드 개수는 1개부터 50개까지만 설정 가능합니다.");
      return;
    }
    setInputWords(Array(Number(cardCount)).fill({ kanji: '', meaning: '' }));
    setTeacherStep(2);
  };

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
      alert("⛩️ 오늘의 일본어 카드 덱이 생성되었습니다!");
      fetchDateList();
      setCurrentMode('landing');
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
      alert("🫙 해당 날짜에 생성된 단어 카드가 없습니다.");
    }
  };

  const progressPercent = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '500px', width: '92vw', margin: '0 auto', padding: '20px 0', boxSizing: 'border-box' }}>
      
      {currentMode !== 'landing' && !showPasswordModal && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button 
            onClick={() => { setCurrentMode('landing'); setHasStarted(false); }}
            style={{ background: '#ffffff', color: '#a73838', border: '1px solid #e6dec9', padding: '10px 18px', borderRadius: '24px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
          >
            ⛩️ 홈으로 가기
          </button>
        </div>
      )}

      {currentMode === 'landing' && !showPasswordModal && (
        <div style={{ width: '100%' }}>
          <h1 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '32px', fontWeight: '800', letterSpacing: '-0.5px', color: '#2b2b2b' }}>
            🌸 일본어 플래시 카드
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className="role-select-card" onClick={() => setCurrentMode('student')}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#a73838' }}>학생 입장</h2>
              <p style={{ color: '#555555', fontSize: '14px', margin: 0, lineBreak: 'anywhere' }}>선생님이 등록한 날짜별 서책 카드를 무작위로 학습합니다.</p>
            </div>

            <div className="role-select-card" onClick={handleTeacherAccess}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚙️</div>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#2b2b2b' }}>설정</h2>
              <p style={{ color: '#555555', fontSize: '14px', margin: 0, lineBreak: 'anywhere' }}>일자별 학습할 카드 개수와 단어 세트를 정갈하게 생성합니다.</p>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#2b2b2b', fontSize: '20px' }}>🔑 설정 인증</h3>
          <p style={{ color: '#555555', fontSize: '14px', marginBottom: '24px' }}>보안을 위해 관리자 전용 암호를 입력해 주세요.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호 입력"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{ background: '#ffffff', border: '2px solid #e6dec9', color: '#2b2b2b', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '260px', textAlign: 'center', outline: 'none', marginBottom: '24px', boxSizing: 'border-box', fontSize: '16px' }}
          />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
            <button onClick={verifyPassword} className="mini-start-btn" style={{ width: '120px', fontSize: '15px', padding: '14px 0' }}>확인</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ background: '#ebe6dc', color: '#2b2b2b', border: 'none', padding: '14px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>취소</button>
          </div>
        </div>
      )}

      {currentMode === 'teacher' && !showPasswordModal && (
        <div className="dashboard-box">
          <h2 style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '20px', margin: '0 0 12px 0', color: '#2b2b2b', fontWeight: '700' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>⚙️ 설정</span>
            <span style={{ color: '#d4ccb6', display: 'inline-flex', alignItems: 'center', transform: 'translateY(-1px)', padding: '0 4px' }}>:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>카드 생성</span>
          </h2>
          
          <div className="step-indicator">
            <div className={`step-dot ${teacherStep === 1 ? 'active' : ''}`}>1단계: 개수 설정</div>
            <div style={{ color: '#d4ccb6', fontSize: '12px', userSelect: 'none', display: 'inline-flex', alignItems: 'center', transform: 'translateY(-0.5px)' }}>▶</div>
            <div className={`step-dot ${teacherStep === 2 ? 'active' : ''}`}>2단계: 단어 입력</div>
          </div>

          {teacherStep === 1 ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#555555', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>TARGET DATE</label>
                <input 
                  type="date" 
                  value={teacherDate} 
                  onChange={(e) => setTeacherDate(e.target.value)} 
                  style={{ background: '#ffffff', color: '#2b2b2b', border: '2px solid #e6dec9', padding: '16px', borderRadius: '12px', fontSize: '16px', outline: 'none', textAlign: 'center', width: '100%', maxWidth: '240px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '36px' }}>
                <label style={{ display: 'block', color: '#555555', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>CARD COUNT (개수 지정)</label>
                <input 
                  type="number" 
                  value={cardCount} 
                  min="1" 
                  max="50"
                  onChange={(e) => setCardCount(e.target.value)} 
                  style={{ background: '#ffffff', color: '#2b2b2b', border: '2px solid #e6dec9', padding: '16px', borderRadius: '12px', fontSize: '18px', outline: 'none', textAlign: 'center', width: '100%', maxWidth: '140px', boxSizing: 'border-box' }}
                />
                <p style={{ color: '#555555', fontSize: '13px', marginTop: '12px', marginBreak: 'anywhere' }}>오늘 배울 단어들의 총 수량을 정합니다.</p>
              </div>

              <button onClick={proceedToStep2} className="mini-start-btn" style={{ padding: '16px 0', borderRadius: '12px', fontSize: '16px' }}>
                다음 단계로 이동 ➡️
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#2b2b2b', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
                {teacherDate} 세트에 들어갈 <b style={{ color: '#a73838' }}>{cardCount}개</b>의 단어 쌍을 입력하세요.
              </p>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px', marginBottom: '24px' }}>
                {inputWords.map((word, idx) => (
                  <div key={idx} className="word-input-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: '#555555', fontSize: '14px', width: '22px', fontWeight: 'bold', flexShrink: 0 }}>{idx + 1}</span>
                    <input 
                      placeholder="일본어 표기" 
                      value={word.kanji} 
                      onChange={e => {
                        const newWords = [...inputWords];
                        newWords[idx] = { ...newWords[idx], kanji: e.target.value };
                        setInputWords(newWords);
                      }}
                      style={{ flex: 1, minWidth: '0', background: '#ffffff', border: '1px solid #cbd5e1', color: '#2b2b2b', padding: '14px', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <input 
                      placeholder="한국어 뜻" 
                      value={word.meaning} 
                      onChange={e => {
                        const newWords = [...inputWords];
                        newWords[idx] = { ...newWords[idx], meaning: e.target.value };
                        setInputWords(newWords);
                      }}
                      style={{ flex: 1, minWidth: '0', background: '#ffffff', border: '1px solid #cbd5e1', color: '#2b2b2b', padding: '14px', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button onClick={() => setTeacherStep(1)} style={{ background: '#ebe6dc', color: '#2b2b2b', border: '1px solid #d4ccb6', padding: '16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '15px' }}>
                  이전으로
                </button>
                <button onClick={handleSaveDeck} style={{ flex: 1, background: '#a73838', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(167, 58, 237, 0.15)' }}>
                  최종 덱 업로드 🚀
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {currentMode === 'student' && !showPasswordModal && (
        <div className="dashboard-box">
          {!hasStarted ? (
            <div style={{ width: '100%' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#2b2b2b' }}>📜 플래시 카드 선택</h2>
              <p style={{ color: '#555555', fontSize: '14px', margin: '0 0 24px 0' }}>학습할 일자의 카드 세트를 선택해 주세요.</p>
              
              <div className="date-grid">
                {dateList.map((item) => (
                  <div key={item.date} className="date-card">
                    <div className="date-label">{item.date}</div>
                    <button onClick={() => startLearning(item.date)} className="mini-start-btn" style={{ padding: '12px 0', fontSize: '15px' }}>
                      시작
                    </button>
                  </div>
                ))}
                {dateList.length === 0 && (
                  <p style={{ color: '#555555', fontSize: '15px', gridColumn: '1/-1', textAlign: 'center', padding: '30px 0' }}>등록된 카드 세트가 아직 없습니다.</p>
                )}
              </div>
            </div>
          ) : (
            currentIndex < words.length ? (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555555', fontSize: '15px', marginBottom: '12px', fontWeight: '600' }}>
                  <span>학습 진행률</span>
                  <span style={{ color: '#a73838', fontWeight: '800' }}>{currentIndex + 1} / {words.length}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                  <div className="card-inner">
                    <div className="card-front">
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#888', letterSpacing: '2px', position: 'absolute', top: '20px' }}>JAPANESE</span>
                      <div className="word-text">{words[currentIndex].kanji}</div>
                      <span style={{ fontSize: '14px', color: '#94a3b8', position: 'absolute', bottom: '20px', fontWeight: '500' }}>터치해서 뒤집기 🌸</span>
                    </div>
                    <div className="card-back">
                      <span style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', position: 'absolute', top: '20px' }}>MEANING</span>
                      <div className="word-text">{words[currentIndex].meaning}</div>
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', position: 'absolute', bottom: '20px', fontWeight: '500' }}>터치해서 돌아가기 ↩️</span>
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
                    width: '100%', background: isFlipped ? '#a73838' : '#1b2a4a', color: '#ffffff', 
                    border: 'none', padding: '20px', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.08)', marginTop: '20px'
                  }}
                >
                  {isFlipped ? "다음 단어로 ➡️" : "정답 확인하기 👀"}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <div style={{ fontSize: '56px', marginBottom: '20px' }}>🌸</div>
                <h3 style={{ fontSize: '24px', margin: '0 0 12px 0', color: '#a73838', letterSpacing: '-0.5px' }}>학습 완료!</h3>
                <p style={{ color: '#555555', fontSize: '15px', marginBottom: '32px' }}>오늘의 서책 단어들을 모두 완벽히 마스터했습니다.</p>
                <button 
                  onClick={() => setHasStarted(false)} 
                  style={{ background: '#ebe6dc', color: '#2b2b2b', border: '1px solid #d4ccb6', padding: '16px 36px', borderRadius: '28px', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}
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