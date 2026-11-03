import klPoster from '../assets/photos/campus-kl.webp';
import selangorPoster from '../assets/photos/campus-selangor.webp';
import type { Campus } from '../lib/contact';

/**
 * The two campus films on the Contact & Admissions page.
 *
 * Both films are 1:04 long and share one soundtrack (the music from the IMAS Kuala Lumpur tour,
 * 128 beats a minute), cut on the same beat grid, so they can play side by side in time.
 * The Selangor film uses only campus and facility shots from the school's video.
 *
 * The files are in public/media, each as WebM (smaller; Chrome, Edge, Firefox) and MP4 (Safari).
 * To replace a film, keep the same file names and length.
 */
export interface CampusFilm {
  id: Campus['id'];
  name: string;
  place: string;
  /** One line shown over the film before it plays. */
  tagline: string;
  /** What the film shows, as text (for visitors who can't watch it, and for search engines). */
  inFilm: string[];
  film: { webm: string; mp4: string };
  loop: { webm: string; mp4: string };
  poster: string;
}

/** Length of both films, in seconds. */
export const FILM_SECONDS = 64.09;
/** The shared soundtrack's beat: 128 beats a minute, first beat 0.115 s in. */
export const BEAT = { first: 0.115, length: 60 / 128 };

// Relative to the site's base, so the files also work in the single-file preview.
const media = (name: string) => ({
  webm: `${import.meta.env.BASE_URL}media/${name}.webm`,
  mp4: `${import.meta.env.BASE_URL}media/${name}.mp4`,
});

export const CAMPUS_FILMS: Record<Campus['id'], CampusFilm> = {
  selangor: {
    id: 'selangor',
    name: 'IMAS Selangor',
    place: 'Selangor',
    tagline: 'Palm-lined grounds, a bright atrium, science laboratories, a library and student lounges.',
    inFilm: ['Campus grounds', 'Entrance and atrium', 'Science labs', 'Library', 'Classrooms', 'Student lounges'],
    film: media('campus-selangor'),
    loop: media('campus-selangor-loop'),
    poster: selangorPoster,
  },
  kl: {
    id: 'kl',
    name: 'IMAS Kuala Lumpur',
    place: 'Kuala Lumpur',
    tagline: 'Beside the city skyline: a library, science and computer labs, sports fields, a swimming pool and a media studio.',
    inFilm: [
      'City skyline',
      'Library',
      'Science labs',
      'Computer lab',
      'Art room',
      'Football field and courts',
      'Swimming pool',
      'Hall',
      'Cafeteria',
      'Media studio',
      'Masjid',
      'Boarding rooms',
    ],
    film: media('campus-kl'),
    loop: media('campus-kl-loop'),
    poster: klPoster,
  },
};

/** The films in the order they appear, matching the admissions cards: Selangor, then Kuala Lumpur. */
export const FILM_ORDER: Campus['id'][] = ['selangor', 'kl'];
