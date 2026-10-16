import { ButtonLink } from '../components/ui';

export function NotFound() {
  return (
    <div className="gutter py-24">
      <div className="mx-auto grid max-w-[640px] justify-items-start gap-4">
        <p className="t-label text-blue">Page not found</p>
        <h1 className="t-h1">This page isn’t in the book.</h1>
        <p className="t-lede">The address may be mistyped, or the page may have moved. Start again from the cover or open the contents.</p>
        <ButtonLink to="/">Back to the cover</ButtonLink>
      </div>
    </div>
  );
}
