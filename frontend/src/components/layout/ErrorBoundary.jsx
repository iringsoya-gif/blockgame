import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('BlockQuest Error:', error, info)
    // 프로덕션에서 에러 리포팅 서비스로 전송 가능
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-5xl">⚠</div>
        <div>
          <h1 className="font-display text-3xl text-brand-danger mb-2">오류가 발생했습니다</h1>
          <p className="text-brand-muted font-body text-sm max-w-md">
            예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 처음으로 돌아가세요.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 text-left text-xs text-brand-danger bg-brand-panel p-4 rounded-lg
                            max-w-lg overflow-auto font-mono">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()}
            className="btn-primary px-6 py-2.5">새로고침</button>
          <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
            className="btn-ghost px-6 py-2.5">처음으로</button>
        </div>
      </div>
    )
  }
}
