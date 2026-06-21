'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SimpleLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const callbackUrl = searchParams.get('callbackUrl') || '/library'
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError(data.error || 'Invalid password')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F6F1E8',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#FBF7EF',
        padding: '48px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        maxWidth: '420px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1F2421',
          marginBottom: '8px',
          fontFamily: '"DM Serif Display", serif'
        }}>
          Get It
        </h1>
        <p style={{
          color: '#8A8A80',
          marginBottom: '32px',
          fontSize: '15px'
        }}>
          Enter password to continue
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#1F2421',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E2D9C8',
                borderRadius: '8px',
                fontSize: '15px',
                background: '#FFFFFF',
                color: '#1F2421',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#C8853F'}
              onBlur={(e) => e.target.style.borderColor = '#E2D9C8'}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: '#FEE',
              border: '1px solid #FCC',
              borderRadius: '8px',
              marginBottom: '24px',
              color: '#C00',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#8A8A80' : '#C8853F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#A86B2C'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#C8853F'
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{
          marginTop: '24px',
          fontSize: '13px',
          color: '#8A8A80',
          textAlign: 'center'
        }}>
          Data is stored locally in your browser
        </p>
      </div>
    </div>
  )
}
