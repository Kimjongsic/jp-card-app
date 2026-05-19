import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  const [currentMode, setCurrentMode] = useState('landing'); 
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [teacherMenu, setTeacherMenu] = useState('menu'); 
  const [teacherStep, setTeacherStep] = useState(1);
  const [cardCount, setCardCount] = useState(15);
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState([]);
  const [previewWords, setPreviewWords] = useState([]); 
  const [previewDate, setPreviewDate] = useState(''); 

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
      
      {currentMode !== 'landing' && teacherMenu === 'menu' && !hasStarted && !showPasswordModal && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '15px' }}>
          <button onClick={resetToHome} className="text-back-btn">← 처음 화면으로</button>
        </div>
      )}

      {/* ==================== 0. 메인 인트로 화면 ==================== */}
      {currentMode === 'landing' && !showPasswordModal && (
        <div style={{ paddingTop: '10px' }}>
          <h1 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '40px', fontWeight: '800', color: '#2C363F', letterSpacing: '-0.5px' }}>
            🌸 일본어 단어장
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="role-select-card" onClick={() => setCurrentMode('student')}>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#2C363F', fontWeight: '800' }}>학생 모드</h2>
              <p style={{ color: '#7A8288', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>일자별 플래시 카드를 터치하여 단어 암기를 시작합니다.</p>
            </div>

            <div className="role-select-card" onClick={handleTeacherAccess}>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#C84B31', fontWeight: '800' }}>선생님 모드</h2>
              <p style={{ color: '#7A8288', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>학습할 카드 개수 지정 및 데이터 세트를 구성합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 선생님 암호 입력 모달 */}
      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center', marginTop: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: '#2C363F' }}>보안 코드 확인</h3>
          <p style={{ color: '#7A8288', fontSize: '14px', marginBottom: '24px' }}>접근 권한 확인을 위해 암호를 입력해주세요.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{ background: '#F9F8F6', border: '1px solid #E8E5DF', color: '#2C363F', padding: '16px', borderRadius: '14px', width: '90%', textAlign: 'center', outline: 'none', marginBottom: '24px', fontSize: '16px' }}
          />
          <div style={{ display: 'flex', gap: '12px', width: '90%', margin: '0 auto' }}>
            <button onClick={verifyPassword} className="mini-start-btn" style={{ flex: 1, padding: '15px 0' }}>입장</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, background: '#E8E5DF', color: '#2C363F', border: 'none', borderRadius: '14px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>취소</button>
          </div>
        </div>
      )}

      {/* ==================== 1. 교사용 모드 패널 ==================== */}
      {currentMode === 'teacher' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {teacherMenu === 'menu' && (
            <div>
              <h2 style={{ fontSize: '22px', margin: '0 0 24px 0', fontWeight: '800', textAlign: 'center', color: '#2C363F' }}>관리자 메뉴</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('create'); setTeacherStep(1); }}>
                  <span>카드 세트 만들기</span>
                  <span style={{ color: '#C84B31', fontWeight: 'bold' }}>→</span>
                </button>
                <button className="teacher-main-btn" onClick={() => { setTeacherMenu('view'); setPreviewWords([]); }}>
                  <span>등록된 카드 세트 목록</span>
                  <span style={{ color: '#2A475E', fontWeight: 'bold' }}>→</span>
                </button>
              </div>
            </div>
          )}

          {teacherMenu === 'create' && (
            <div>
              <div className="header-row">
                <button onClick={resetToHome} className="text-back-btn">← 처음 화면으로</button>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#C84B31' }}>세트 만들기</span>
                <button onClick={() => setTeacherMenu('menu')} className="text-back-btn">돌아가기</button>
              </div>

              {teacherStep === 1 ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', color: '#7A8288', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>학습 적용 일자</label>
                    <input type="date" value={teacherDate} onChange={(e) => setTeacherDate(e.target.value)} style={{ background: '#F9F8F6', border: '1px solid #E8E5DF', color: '#2C363F', padding: '14px 24px', borderRadius: '14px', fontSize: '16px', textAlign: 'center', width: '85%', outline: 'none' }} />
                  </div>
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', color: '#7A8288', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>생성할 단어 총량</label>
                    <input type="number" value={cardCount} min="1" max="50" onChange={(e) => setCardCount(e.target.value)} style={{ background: '#F9F8F6', border: '1px solid #E8E5DF', color: '#2C363F', padding: '14px', borderRadius: '14px', fontSize: '17px', textAlign: 'center', width: '100px', outline: 'none' }} />
                  </div>
                  <button onClick={proceedToStep2} className="mini-start-btn" style={{ width: '100%', background: '#C84B31', padding: '16px 0', borderRadius: '16px' }}>단어 입력 시작하기</button>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', fontSize: '15px', color: '#7A8288' }}>{teacherDate} / 총 {cardCount}개 단어</h4>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '25px', paddingRight: '4px' }}>
                    {inputWords.map((word, idx) => (
                      <div key={idx} className="input-row-container">
                        <span style={{ fontSize: '14px', color: '#7A8288', width: '22px', fontWeight: 'bold', textAlign: 'center' }}>{idx+1}</span>
                        <input placeholder="일본어" value={word.kanji} onChange={e => { const n = [...inputWords]; n[idx].kanji = e.target.value; setInputWords(n); }} className="input-light" />
                        <input placeholder="한국어 뜻" value={word.meaning} onChange={e => { const n = [...inputWords]; n[idx].meaning = e.target.value; setInputWords(n); }} className="input-light" />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setTeacherStep(1)} style={{ background: '#E8E5DF', color: '#2C363F', border: 'none', padding: '14px 24px', borderRadius: '14px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>이전</button>
                    <button onClick={handleSaveDeck} style={{ flex: 1, background: '#2C363F', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>저장 완료</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 등록된 카드 세트 목록 */}
          {teacherMenu === 'view' && (
            <div>
              <div className="header-row">
                <button onClick={resetToHome} className="text-back-btn">← 처음 화면으로</button>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2A475E' }}>등록된 세트 목록</span>
                <button onClick={() => { previewWords.length > 0 ? setPreviewWords([]) : setTeacherMenu('menu'); }} className="text-back-btn">돌아가기</button>
              </div>

              {previewWords.length === 0 ? (
                <div className="date-list-vertical">
                  {dateList.map((item) => (
                    <div key={item.date} className="date-card-large">
                      <div className="date-label">{item.date}</div>
                      <button onClick={() => fetchDeckPreview(item.date)} className="mini-start-btn" style={{ background: '#2A475E' }}>단어 확인</button>
                    </div>
                  ))}
                  {dateList.length === 0 && <p style={{ color: '#7A8288', fontSize: '14px', textAlign: 'center', padding: '20px' }}>등록된 세트가 없습니다.</p>}
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#2C363F', fontSize: '16px' }}>{previewDate} 세트 단어</h4>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', background: '#F9F8F6', padding: '16px', borderRadius: '20px', border: '1px solid #E8E5DF' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E8E5DF', color: '#7A8288', textAlign: 'left' }}>
                          <th style={{ paddingBottom: '10px', width: '50px' }}>번호</th>
                          <th style={{ paddingBottom: '10px' }}>일본어</th>
                          <th style={{ paddingBottom: '10px' }}>한국어 뜻</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewWords.map((w, i) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid #E8E5DF' }}>
                            <td style={{ padding: '12px 0', color: '#7A8288' }}>{i + 1}</td>
                            <td style={{ padding: '12px 0', color: '#2C363F', fontWeight: '700' }}>{w.kanji}</td>
                            <td style={{ padding: '12px 0', color: '#C84B31' }}>{w.meaning}</td>
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

      {/* ==================== 2. 🎒 학생용 학습 모드 ==================== */}
      {currentMode === 'student' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {!hasStarted ? (
            <div>
              <div className="header-row">
                <h2 style={{ fontSize: '22px', margin: 0, fontWeight: '800', color: '#2C363F' }}>
                  오늘의 플래시 카드
                </h2>
                <button onClick={resetToHome} className="text-back-btn" style={{ padding: '8px', background: '#F5F3ED', borderRadius: '8px' }}>← 나가기</button>
              </div>
              
              <div className="date-list-vertical">
                {dateList.map((item) => (
                  <div key={item.date} className="date-card-large">
                    <div className="date-label">{item.date}</div>
                    <button onClick={() => startLearning(item.date)} className="mini-start-btn" style={{ background: '#C84B31' }}>
                      시작
                    </button>
                  </div>
                ))}
                {dateList.length === 0 && (
                  <p style={{ color: '#7A8288', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>등록된 카드 세트가 없습니다.</p>
                )}
              </div>
            </div>
          ) : (
            currentIndex < words.length ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7A8288', fontSize: '15px', marginBottom: '12px', fontWeight: 'bold' }}>
                  <span>진행 상황</span>
                  <span style={{ color: '#C84B31', fontSize: '16px' }}>{currentIndex + 1} / {words.length}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                {/* 🎯 개선: 극강의 해상도와 크기를 자랑하는 플래시 카드 컨테이너 */}
                <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                  <div className="card-inner">
                    
                    <div className="card-front">
                      <span style={{ fontSize: '14px', color: '#7A8288', letterSpacing: '1.5px', position: 'absolute', top: '28px', fontWeight: 'bold' }}>문제</span>
                      {/* 일본어 글자 크기를 화면 너비(vw)에 연동하여 어떤 스마트폰에서도 가장 크게 보이도록 설정 */}
                      <div style={{ fontSize: 'clamp(46px, 11vw, 80px)', fontWeight: '800', color: '#2C363F', textAlign: 'center', width: '100%', wordBreak: 'keep-all' }}>
                        {words[currentIndex].kanji}
                      </div>
                      <span style={{ fontSize: '13px', color: '#A0A7AB', position: 'absolute', bottom: '28px' }}>터치하여 정답 확인</span>
                    </div>

                    <div className="card-back">
                      <span style={{ fontSize: '14px', color: 'rgba(200, 75, 49, 0.6)', letterSpacing: '1.5px', position: 'absolute', top: '28px', fontWeight: 'bold' }}>정답</span>
                      <div style={{ fontSize: 'clamp(36px, 9vw, 64px)', fontWeight: '800', color: '#C84B31', textAlign: 'center', width: '100%', wordBreak: 'keep-all' }}>
                        {words[currentIndex].meaning}
                      </div>
                      <span style={{ fontSize: '13px', color: 'rgba(200, 75, 49, 0.4)', position: 'absolute', bottom: '28px' }}>다시 터치하면 돌아갑니다</span>
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
                    background: isFlipped ? '#2C363F' : '#F5F3ED', 
                    color: isFlipped ? '#FFFFFF' : '#2C363F',
                    border: isFlipped ? 'none' : '1px solid #E8E5DF'
                  }}
                >
                  {isFlipped ? "다음 단어로 넘어가기" : "정답 확인하기"}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <h3 style={{ fontSize: '26px', margin: '0 0 16px 0', color: '#C84B31', fontWeight: '800' }}>💮 단어 학습 완료!</h3>
                <p style={{ color: '#7A8288', fontSize: '16px', marginBottom: '32px' }}>오늘 분량의 플래시 카드를 모두 암기하셨습니다.</p>
                <button 
                  onClick={() => setHasStarted(false)} 
                  className="action-btn-main"
                  style={{ background: '#2C363F', color: '#fff', width: 'auto', padding: '16px 40px', borderRadius: '16px', fontSize: '16px' }}
                >
                  목록 페이지로 돌아가기
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