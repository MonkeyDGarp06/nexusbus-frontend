export function Button({ children, onClick, type = 'button', variant = 'primary', size = 'md', disabled = false, className = '', fullWidth = false }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2 text-sm gap-2', lg: 'px-5 py-2.5 text-base gap-2' }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {children}
    </button>
  )
}

export function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
      <input id={id}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
        {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${padding ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:  'bg-gray-100 text-gray-600',
    blue:  'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red:   'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

export function Spinner({ size = 'sm' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <svg className={`animate-spin text-blue-600 ${sizes[size]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

const EMPTY_STATES = {
  routes:  { icon: '???', title: 'No routes yet',    sub: 'Routes will appear here once added' },
  stops:   { icon: '??', title: 'No stops yet',     sub: 'Stops will appear here once added' },
  buses:   { icon: '??', title: 'No buses found',   sub: 'Try a different search term' },
  trips:   { icon: '??', title: 'No active trips',  sub: 'Trips appear when drivers start them' },
  search:  { icon: '??', title: 'No results',       sub: 'Try different keywords' },
  default: { icon: '??', title: 'Nothing here yet', sub: 'Check back later' },
}

export function EmptyState({ message = 'No data found', type = 'default' }) {
  const state = EMPTY_STATES[type] || EMPTY_STATES.default
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="text-4xl mb-3">{state.icon}</div>
      <p className="text-sm font-semibold text-gray-600 mb-1">{message || state.title}</p>
      <p className="text-xs text-gray-400">{state.sub}</p>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Toast({ toasts, remove }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-xs w-full">
      {toasts.map((t) => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl cursor-pointer text-sm font-medium
            border backdrop-blur-sm transition-all animate-in
            ${t.type === 'error'
              ? 'bg-red-600 text-white border-red-500'
              : t.type === 'warning'
              ? 'bg-amber-500 text-white border-amber-400'
              : 'bg-gray-900 text-white border-gray-700'}`}
          onClick={() => remove(t.id)}>
          <span className="text-base shrink-0">
            {t.type === 'error' ? '?' : t.type === 'warning' ? '??' : '?'}
          </span>
          <span className="flex-1">{t.message}</span>
          {t.onUndo && (
            <button
              onClick={(e) => { e.stopPropagation(); t.onUndo(); remove(t.id) }}
              className="shrink-0 text-xs font-bold underline opacity-80 hover:opacity-100">
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
