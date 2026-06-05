export function SkeletonLine({ width = '100%', height = 14, style }) {
  return (
    <div
      className="skeleton-line"
      style={{ width, height, borderRadius: height / 2, ...style }}
    />
  )
}

export function QuizLoadingSkeleton() {
  return (
    <div className="quiz-page skeleton-quiz">
      <div className="progress-bar-wrap">
        <div className="skeleton-line" style={{ height: 3, width: '30%', borderRadius: 2 }} />
      </div>
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <SkeletonLine width={60} height={22} />
        <SkeletonLine width={40} height={16} />
      </div>
      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%' }}>
          <SkeletonLine height={20} style={{ marginBottom: 12 }} />
          <SkeletonLine height={20} width="80%" style={{ marginBottom: 12 }} />
          <SkeletonLine height={20} width="60%" />
        </div>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1,2,3,4,5].map(i => (
          <SkeletonLine key={i} height={52} style={{ borderRadius: 10 }} />
        ))}
      </div>
    </div>
  )
}

export function ResultsLoadingSkeleton() {
  return (
    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SkeletonLine height={28} width="55%" style={{ margin: '0 auto 8px' }} />
      <SkeletonLine height={14} width="40%" style={{ margin: '0 auto 24px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <SkeletonLine width={120} height={14} />
              <SkeletonLine width={36} height={14} />
            </div>
            <SkeletonLine height={6} style={{ borderRadius: 3 }} />
          </div>
        ))}
      </div>
      <SkeletonLine height={200} style={{ borderRadius: 16, marginTop: 8 }} />
      <SkeletonLine height={52} style={{ borderRadius: 10 }} />
    </div>
  )
}
