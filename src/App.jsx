import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  const [isTeacher, setIsTeacher] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 교사용 입력 상태
  const [inputWords, setInputWords] = useState(
    Array(15).fill({ kanji: '', meaning: '' })
  );

  // 학생용 플레이 상태
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 교사: 15개 단어 저장하기
  const handleSave = async () => {
    const filtered = inputWords.filter(w => w.kanji.trim() && w.meaning.trim());
    if(filtered.length < 15) {
      alert("⚡ 힙하게 가더라도! 15개의 단어는 모두 채워주셔야 합니다.");
      return;
    }

    // 세트 업서트
    const { error: setErr } = await supabase.from('word_sets').upsert({ id: date, date: date });
    if (setErr) return alert("❌ 세트 저장 중 오류 발생");

    // 기존 단어 삭제 후 재등록 (덮어쓰기 방지)
    await supabase.from('words').delete().eq('set_id', date);

    const wordsToInsert = filtered.map(w => ({ set_id: date, kanji: w.kanji, meaning: w.meaning }));
    const { error: wordErr } = await supabase.from('words').insert(wordsToInsert);

    if (!wordErr) alert("🔮 오늘의 트렌디한 단어 15개가 완벽히 세팅되었습니다!");
  };

  // 학생: 단어 패치 및 랜덤 셔플
  const loadWords = async () => {
    const { data, error } = await supabase.from('words').select('*').eq('set_id', date);

    if (data && data.length > 0) {
      // 무작위 셔플
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setWords(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasStarted(true);
    } else {
      alert("🫙 해당 날짜에 준비된 카드가 없습니다. 교사에게 문의하세요!");
      setHasStarted(false);
    }
  };

  // 프로그레스 바 퍼센트 계산
  const progressPercent = words.length > 0 ? ((currentIndex) / words.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '500px', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
      
      {/* 상단 탭 전환 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
        <button 
          onClick={() => { setIsTeacher(!isTeacher); setHasStarted(false); }}
          style={{
            background: 'rgba(255, 255, 255, 0.05)', color: '#a0aec0', border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
        >
          {isTeacher ? "🔮 STUDENT MODE" : "⚙️ TEACHER MODE"}
        </button>
      </div>

      {/* 대시보드 메인 박스 */}
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        
        {/* 공통 날짜 선택 영역 */}
        <div style={{ marginBottom: '25px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', margin: '0 0 8px 0', fontSize: '12px', letterSpacing: '1px', fontWeight: 'bold' }}>SELECT DATE</p>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => { setDate(e.target.value); setHasStarted(false); }} 
            style={{
              background: '#1a1b23', color: '#fff', border: '1px solid #2e303f', padding: '10px 15px',
              borderRadius: '12px', fontSize: '16px', fontFamily: 'inherit', outline: 'none', textAlign: 'center'
            }}
          />
        </div>

        {isTeacher ? (
          /* ==================== 👨‍🏫 TEACHER UI ==================== */
          <div>
            <h2 style={{ textAlign: 'center', fontSize: '20px', marginBottom: '20px', color: '#fff' }}>단어 드롭하기 (15개)</h2>
            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '5px', marginBottom: '20px' }}>
              {inputWords.map((word, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ color: '#4b5563', fontSize: '14px', width: '20px', fontWeight: 'bold' }}>{idx + 1}</span>
                  <input 
                    placeholder="일본어" 
                    value={word.kanji} 
                    onChange={e => {
                      const newWords = [...inputWords];
                      newWords[idx] = { ...newWords[idx], kanji: e.target.value };
                      setInputWords(newWords);
                    }}
                    style={{ flex: 1, background: '#14151f', border: '1px solid #232433', color: '#fff', padding: '10px', borderRadius: '10px', outline: 'none' }}
                  />
                  <input 
                    placeholder="뜻" 
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
            <button 
              onClick={handleSave} 
              style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)' }}
            >
              세트 업로드하기
            </button>
          </div>
        ) : (
          /* ==================== 🎒 STUDENT UI ==================== */
          <div>
            {!hasStarted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '15px' }}>오늘 짜릿하게 외울 15개의 단어가 준비되어 있습니다.</p>
                <button 
                  onClick={loadWords} 
                  style={{ background: 'linear-gradient(90deg, #00ffcc, #7c3aed)', color: '#000', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 20px rgba(0, 255, 204, 0.3)' }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.03)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  START DECK
                </button>
              </div>
            ) : (
              currentIndex < words.length ? (
                <div>
                  {/* 프로그레스 바 상단 인포 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px', fontWeight: '5px00' }}>
                    <span>PROGRESS</span>
                    <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{currentIndex + 1} / {words.length}</span>
                  </div>
                  
                  {/* 프로그레스 바 */}
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                  </div>

                  {/* 3D 플립 카드 슬롯 */}
                  <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                    <div className="card-inner">
                      {/* 앞면 (일본어 한자) */}
                      <div className="card-front">
                        <span style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '2px', position: 'absolute', top: '20px' }}>JAPANESE</span>
                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{words[currentIndex].kanji}</div>
                        <span style={{ fontSize: '11px', color: '#4b5563', position: 'absolute', bottom: '20px' }}>TAP TO FLIP 🔮</span>
                      </div>
                      {/* 뒷면 (한국어 뜻) */}
                      <div className="card-back">
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', position: 'absolute', top: '20px' }}>MEANING</span>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{words[currentIndex].meaning}</div>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', position: 'absolute', bottom: '20px' }}>TAP TO RETURN ↩️</span>
                      </div>
                    </div>
                  </div>

                  {/* 제어 버튼 */}
                  <button 
                    onClick={() => {
                      if (!isFlipped) {
                        setIsFlipped(true); // 플립이 안 되어있다면 정답 먼저 오픈
                      } else {
                        setIsFlipped(false);
                        setTimeout(() => {
                          setCurrentIndex(currentIndex + 1);
                        }, 200); // 부드러운 전환을 위한 딜레이
                      }
                    }} 
                    style={{
                      width: '100%', 
                      background: isFlipped ? '#fff' : '#1e1e2f', 
                      color: isFlipped ? '#000' : '#fff', 
                      border: isFlipped ? 'none' : '1px solid #3a3a52',
                      padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {isFlipped ? "NEXT CARD ➡️" : "CHECK ANSWER 👀"}
                  </button>
                </div>
              ) : (
                /* 학습 완료 스크린 */
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '50px', marginBottom: '15px' }}>⚡</div>
                  <h3 style={{ fontSize: '22px', margin: '0 0 10px 0', color: '#00ffcc' }}>DECK CLEARED!</h3>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5' }}>오늘의 일본어 카드 15개를 모두 마스터했습니다.<br />내일의 덱도 기대해 주세요!</p>
                  <button 
                    onClick={() => setHasStarted(false)} 
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 30px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    메인으로 가기
                  </button>
                </div>
              )
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;