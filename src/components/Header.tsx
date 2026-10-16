import { Link, NavLink } from 'react-router-dom';
import mark from '../assets/imas-mark.webp';
import { ContentsMenu } from './ContentsMenu';

const QUICK = [
  { to: '/pathways', label: 'Pathways' },
  { to: '/academic-plan', label: 'Academic Plan' },
  { to: '/assessment', label: 'Assessment' },
  { to: '/universities', label: 'Universities' },
];

export function Header() {
  return (
    <header
      className="sticky z-40 border-b border-rule bg-ground/90 backdrop-blur-md"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="gutter">
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="IMAS International School, Canadian Diploma, home">
            <span className="mark-plate shrink-0 p-0.5">
              <img src={mark} alt="" width={46} height={50} className="h-[50px] w-auto object-contain" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[0.7rem] font-extrabold uppercase tracking-[0.04em] text-blue sm:text-[0.8rem] sm:tracking-[0.06em]">
                IMAS International School
              </span>
              <span className="block font-display text-[1.15rem] font-semibold tracking-tight text-ink sm:text-[1.25rem]">Canadian Diploma</span>
            </span>
          </Link>

          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
            {QUICK.map((q) => (
              <NavLink
                key={q.to}
                to={q.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-[0.95rem] font-semibold transition-colors ${isActive ? 'bg-blue-tint text-blue-deep' : 'text-ink-2 hover:text-blue'}`
                }
              >
                {q.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-2">
            <ContentsMenu />
            <Link
              to="/student-hub"
              className="hidden min-h-10 items-center rounded-full bg-blue px-4 text-[0.95rem] font-semibold text-on-blue hover:bg-blue-deep sm:inline-flex"
            >
              Student Hub
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
