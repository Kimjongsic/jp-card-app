import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  // 시스템 관리 상태
  const [currentMode, setCurrentMode] = useState('landing'); // 'landing', 'teacher', 'student'
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // 교사 모드 세부 상태
  const [teacherSubTab, setTeacherSubTab] = useState('create'); // 'create' (만들기) 또는 'view' (확인하기)
  const [teacherStep, setTeacherStep] = useState(1);
  const [cardCount, setCardCount] = useState(15);
  const [teacherDate, setTeacherDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWords, setInputWords] = useState([]);
  const [previewWords, setPreviewWords] = useState([]); // 확인하기 탭에서 선택된 단어들 목록
  const [previewDate, setPreviewDate] = useState(''); // 현재 확인 중인 날짜

  // 학생 모드 세부 상태
  const [dateList, setDateList] = useState([]); 
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 🔒 교사 페이지 진입 암호
  const TEACHER_PASSWORD = "1234";

  // 등록된 모든 카드 세트 날짜 로드
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

  // 교사 인증 진입 프로세스
  const handleTeacherAccess = () => {
    setShowPasswordModal(true);
  };

  const verifyPassword = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setCurrentMode('teacher');
      setTeacherSubTab('create');
      setTeacherStep(1);
      setPreviewWords([]);
    } else {
      alert("❌ 비밀번호가 일치하지 않습니다.");
    }
  };

  // 교사 모드: 1단계 완료 처리
  const proceedToStep2 = () => {
    if (cardCount < 1 || cardCount > 50) {
      alert("카드 개수는 1개부터 50개까지만 설정할 수 있습니다.");
      return;
    }
    setInputWords(Array(Number(cardCount)).fill({ kanji: '', meaning: '' }));
    setTeacherStep(2);
  };

  // 교사 모드: 최종 DB 저장
  const handleSaveDeck = async () => {
    const filtered = inputWords.filter(w => w.kanji.trim() && w.meaning.trim());
    if(filtered.length < cardCount) {
      alert(`⚡ 설정하신 ${cardCount}개의 카드를 빈칸 없이 모두 입력해야 저장할 수 있습니다.`);
      return;
    }

    const { error: setErr } = await supabase.from('word_sets').upsert({ id: teacherDate, date: teacherDate });
    if (setErr) return alert("❌ 카드 덱 저장 실패");

    await supabase.from('words').delete().eq('set_id', teacherDate);

    const wordsToInsert = filtered.map(w => ({ set_id: teacherDate, kanji: w.kanji, meaning: w.meaning }));
    const { error: wordErr } = await supabase.from('words').insert(wordsToInsert);

    if (!wordErr) {
      alert("🔮 오늘의 일본어 카드 덱 생성이 완료되었습니다!");
      fetchDateList();
      setCurrentMode('landing');
    }
  };

  // 교사 모드: [카드덱 확인하기] 특정 날짜 데이터 로드
  const fetchDeckPreview = async (dateId) => {
    const { data } = await supabase.from('words').select('*').eq('set_id', dateId);
    if (data) {
      setPreviewWords(data);
      setPreviewDate(dateId);
    }
  };

  // 학생 모드: 선택 일자 플레이 스타트
  const startLearning = async (dateId) => {
    const { data } = await supabase.from('words').select('*').eq('set_id', dateId);

    if (data && data.length > 0) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setWords(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasStarted(true);
    } else {
      alert("🫙 해당 날짜에 구성된 단어 카드가 없습니다.");
    }
  };

  const progressPercent = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '500px', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
      
      {/* 상단 글로벌 홈 이동 바 */}
      {currentMode !== 'landing' && !showPasswordModal && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button 
            onClick={() => { setCurrentMode('landing'); setHasStarted(false); }}
            style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}
          >
            🏠 처음 화면으로
          </button>
        </div>
      )}

      {/* ==================== 0. 메인 시작 화면 (역할 선택 영역) ==================== */}
      {currentMode === 'landing' && !showPasswordModal && (
        <div>
          <h1 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '40px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            🔮 일본어 랜덤 카드 맞추기
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="role-select-card" onClick={() => setCurrentMode('student')}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎒</div>
              <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#00ffcc' }}>학생 모드로 입장</h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>교사님이 공유해 준 일자별 단어 카드를 무작위 순서로 암기합니다.</p>
            </div>

            <div className="role-select-card" onClick={handleTeacherAccess}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚙️</div>
              <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#7c3aed' }}>선생님 모드로 입장</h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>단어 개수를 직접 정하고 일자별 카드 덱을 커스텀 빌드하거나 관리합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 암호화 보안 인증 스크린 */}
      {showPasswordModal && (
        <div className="dashboard-box" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🔒 선생님 모드 비밀번호 확인</h3>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>교사 인증용 비밀번호를 하단에 입력해 주세요.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호 입력"
            onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
            style={{ background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '12px', borderRadius: '10px', width: '80%', textAlign: 'center', outline: 'none', marginBottom: '20px' }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={verifyPassword} className="mini-start-btn" style={{ width: '80px' }}>확인</button>
            <button onClick={() => setShowPasswordModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {/* ==================== 1. 👨‍🏫 선생님용 관리 센터 (교사용 모드) ==================== */}
      {currentMode === 'teacher' && !showPasswordModal && (
        <div className="dashboard-box">
          
          {/* 상단 탭 스위처 분리 */}
          <div className="sub-tab-container">
            <button 
              className={`sub-tab-btn ${teacherSubTab === 'create' ? 'active' : ''}`}
              onClick={() => { setTeacherSubTab('create'); setTeacherStep(1); }}
            >
              📝 카드 세트 만들기
            </button>
            <button 
              className={`sub-tab-btn ${teacherSubTab === 'view' ? 'active' : ''}`}
              onClick={() => { setTeacherSubTab('view'); setPreviewWords([]); }}
            >
              📂 등록된 카드 확인하기
            </button>
          </div>

          {/* [탭 A] 카드 세트 만들기 폼 */}
          {teacherSubTab === 'create' && (
            <div>
              <div className="step-indicator">
                <div className={`step-dot ${teacherStep === 1 ? 'active' : ''}`}>1단계: 개수 설정</div>
                <div className={`step-dot ${teacherStep === 2 ? 'active' : ''}`}>2단계: 단어 입력</div>
              </div>

              {teacherStep === 1 ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>지정 학습 일자</label>
                    <input 
                      type="date" 
                      value={teacherDate} 
                      onChange={(e) => setTeacherDate(e.target.value)} 
                      style={{ background: '#1a1b23', color: '#fff', border: '1px solid #2e303f', padding: '12px', borderRadius: '12px', fontSize: '16px', outline: 'none', textAlign: 'center' }}
                    />
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>카드 수량 설정</label>
                    <input 
                      type="number" 
                      value={cardCount} 
                      min="1" 
                      max="50"
                      onChange={(e) => setCardCount(e.target.value)} 
                      style={{ background: '#1a1b23', color: '#fff', border: '1px solid #2e303f', padding: '12px', borderRadius: '12px', fontSize: '16px', outline: 'none', textAlign: 'center', width: '100px' }}
                    />
                    <p style={{ color: '#4a5568', fontSize: '12px', marginTop: '6px' }}>오늘 제공할 단어 카드의 전체 수량을 수치로 입력하세요.</p>
                  </div>

                  <button onClick={proceedToStep2} className="mini-start-btn" style={{ background: '#7c3aed', color: '#fff', padding: '14px 0', borderRadius: '12px', fontSize: '15px' }}>
                    다음 단계로 이동 ➡️
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>
                    {teacherDate} 일정의 총 <b style={{ color: '#00ffcc' }}>{cardCount}개</b> 단어 공간이 활성화되었습니다.
                  </p>
                  <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '5px', marginBottom: '20px' }}>
                    {inputWords.map((word, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ color: '#4b5563', fontSize: '14px', width: '20px', fontWeight: 'bold' }}>{idx + 1}</span>
                        <input 
                          placeholder="일본어 단어" 
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
                      이전 단계
                    </button>
                    <button onClick={handleSaveDeck} style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)' }}>
                      최종 덱 업로드 🚀
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* [탭 B] 등록된 카드덱 확인하기 패널 */}
          {teacherSubTab === 'view' && (
            <div>
              {previewWords.length === 0 ? (
                <div>
                  <h3 style={{ fontSize: '16px', color: '#e2e8f0', margin: '0 0 5px 0' }}>📂 일자별 카드 모음</h3>
                  <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 15px 0' }}>현재 데이터베이스에 누적 생성된 세트 개수만큼 정렬됩니다. 일자를 클릭하여 내부 단어를 미리 확인하세요.</p>
                  <div className="date-grid">
                    {dateList.map((item) => (
                      <div key={item.date} className="date-card" onClick={() => fetchDeckPreview(item.date)} style={{ cursor: 'pointer' }}>
                        <div className="date-label" style={{ marginBottom: 0, color: '#fff', fontWeight: 'bold' }}>{item.date}</div>
                        <div style={{ fontSize: '11px', color: '#00ffcc', marginTop: '6px' }}>단어 조회하기</div>
                      </div>
                    ))}
                    {dateList.length === 0 && (
                      <p style={{ color: '#4b5563', fontSize: '13px', textAlign: 'center', gridColumn: '1/-1' }}>생성된 카드 덱 정보가 존재하지 않습니다.</p>
                    )}
                  </div>
                </div>
              ) : (
                /* 특정 일자 덱 단어 리스트 테이블 스크린 */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: '#00ffcc', fontSize: '16px' }}>📑 {previewDate} 전체 단어 리스트</h3>
                    <button onClick={() => setPreviewWords([])} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      목록으로 이동
                    </button>
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#14151f', padding: '15px', borderRadius: '12px', border: '1px solid #232433' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #2e303f', color: '#718096' }}>
                          <th style={{ paddingBottom: '8px', width: '40px' }}>번호</th>
                          <th style={{ paddingBottom: '8px' }}>일본어</th>
                          <th style={{ paddingBottom: '8px' }}>한국어 뜻</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewWords.map((w, index) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 0', color: '#4a5568' }}>{index + 1}</td>
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

      {/* ==================== 2. 🎒 학생용 학습 대시보드 (학생 모드) ==================== */}
      {currentMode === 'student' && !showPasswordModal && (
        <div className="dashboard-box">
          {!hasStarted ? (
            <div>
              <h2 style={{ fontSize: '20px', marginBottom: '5px' }}>📚 오늘의 플래시 단어 카드</h2>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px 0' }}>오늘 매칭 공부를 진행할 날짜 카드를 하단에서 선택하세요.</p>
              
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
                  <p style={{ color: '#4b5563', fontSize: '14px', gridColumn: '1/-1', textAlign: 'center', padding: '20px 0' }}>등록된 카드 세트가 아직 존재하지 않습니다.</p>
                )}
              </div>
            </div>
          ) : (
            /* 인게임 단어 무작위 플레이 모듈 */
            currentIndex < words.length ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                  <span>진행도 파악</span>
                  <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{currentIndex + 1} / {words.length}</span>
                </div>
                
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>

                {/* 3D 플립 카드 컴포넌트 */}
                <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                  <div className="card-inner">
                    <div className="card-front">
                      <span style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '2px', position: 'absolute', top: '20px' }}>일본어 표기</span>
                      <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{words[currentIndex].kanji}</div>
                      <span style={{ fontSize: '11px', color: '#4b5563', position: 'absolute', bottom: '20px' }}>터치해서 정답 보기 🔮</span>
                    </div>
                    <div className="card-back">
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', position: 'absolute', top: '20px' }}>한국어 뜻</span>
                      <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{words[currentIndex].meaning}</div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', position: 'absolute', bottom: '20px' }}>터치해서 단어 기호로 원위치 ↩️</span>
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
                  {isFlipped ? "다음 카드로 이동 ➡️" : "정답 매칭 확인 👀"}
                </button>
              </div>
            ) : (
              /* 학습 최종 스크린 완료 블록 */
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>⚡</div>
                <h3 style={{ fontSize: '22px', margin: '0 0 10px 0', color: '#00ffcc' }}>모든 카드 학습 완료!</h3>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '25px' }}>선택한 오늘자 배정 카드들을 완벽히 정복하셨습니다.</p>
                <button 
                  onClick={() => setHasStarted(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 30px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  목록 선택창으로 이동
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