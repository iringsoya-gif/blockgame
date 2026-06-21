import { useState, useCallback, useRef, useEffect } from 'react'
import { gameStorage } from '../lib/gameStorage'

const INITIAL_STATS = { hp: 100, gold: 0, xp: 0, level: 1 }
const XP_TABLE = [0, 100, 250, 450, 700, 1000]

export function calcLevel(xp) {
  let lv = 1
  for (let i = 1; i < XP_TABLE.length; i++) {
    if (xp >= XP_TABLE[i]) lv = i + 1
    else break
  }
  return Math.min(lv, XP_TABLE.length)
}

export function xpProgress(xp, level) {
  const start = XP_TABLE[level - 1] ?? 0
  const end   = XP_TABLE[level]     ?? 9999
  return Math.min(1, (xp - start) / (end - start))
}

export function useGame(playerClass) {
  const saved = gameStorage.getGameState()
  const [gameState,        setGameStateRaw]  = useState(saved ?? INITIAL_STATS)
  const [messages,         setMessagesRaw]   = useState(() => gameStorage.getMessages())
  const [unlockedUpgrades, setUnlockedRaw]   = useState(() => gameStorage.getUnlockedUpgrades())
  const saveTimersRef = useRef({})

  // unmount 시 대기 중인 저장 타이머 정리 (메모리 누수 방지)
  useEffect(() => {
    const timers = saveTimersRef.current
    return () => {
      Object.values(timers).forEach(t => clearTimeout(t))
    }
  }, [])

  // 디바운스 저장 — 키별 독립 타이머 (서로 덮어쓰지 않음)
  const scheduleSave = useCallback((key, value) => {
    clearTimeout(saveTimersRef.current[key])
    saveTimersRef.current[key] = setTimeout(() => {
      if (key === 'state')    gameStorage.setGameState(value)
      if (key === 'messages') gameStorage.setMessages(value)
      if (key === 'upgrades') gameStorage.setUnlockedUpgrades(value)
    }, 600)
  }, [])

  const setGameState = useCallback((updater) => {
    setGameStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      scheduleSave('state', next)
      return next
    })
  }, [scheduleSave])

  const setMessages = useCallback((updater) => {
    setMessagesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      scheduleSave('messages', next)
      return next
    })
  }, [scheduleSave])

  const addMessage = useCallback((role, text) => {
    setMessagesRaw(prev => {
      const next = [...prev, { role, text, ts: Date.now() }]
      gameStorage.setMessages(next.slice(-50))  // 최대 50개 즉시 저장
      return next
    })
  }, [])

  const setUnlockedUpgrades = useCallback((updater) => {
    setUnlockedRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      gameStorage.setUnlockedUpgrades(next)  // 업그레이드는 즉시 저장
      return next
    })
  }, [])

  const resetGame = useCallback(() => {
    gameStorage.clearAll()
    gameStorage.setPlayerClass(playerClass)
    setGameStateRaw(INITIAL_STATS)
    setMessagesRaw([])
    setUnlockedRaw([])
  }, [playerClass])

  return {
    gameState, setGameState,
    messages, setMessages, addMessage,
    unlockedUpgrades, setUnlockedUpgrades,
    resetGame,
  }
}
